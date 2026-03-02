import type { SupabaseClient } from '@supabase/supabase-js';
import type { Scene } from './schema';
import { generateImagenPng } from './imagen';
import { buildCyberpunkBgPrompt } from './backgroundPrompt';
import { uploadBackground } from './storage';
import { logJob, logError } from './log';

// 배경을 생성할 scene index 목록 (비용 통제: 2장만)
const BG_SCENE_INDICES = [1, 4];

export interface BackgroundResult {
    sceneIndex: number;
    storagePath: string;
    publicUrl: string;
}

/**
 * 특정 씬의 배경 이미지를 Imagen으로 생성하고 Storage에 업로드합니다.
 *
 * - sceneIndex가 BG_SCENE_INDICES에 없으면 즉시 null 반환 (생성 안 함)
 * - Imagen 생성 실패 시 경고 로그 후 null 반환 (잡 실패로 이어지지 않음)
 */
export async function generateBackground(
    supabase: SupabaseClient,
    jobId: string,
    scene: Scene,
    topic: string
): Promise<BackgroundResult | null> {
    const { index } = scene;

    // 비용 통제: scene 1, 4만 처리
    if (!BG_SCENE_INDICES.includes(index)) {
        return null;
    }

    logJob(jobId, 'RUNNING', `Background generation started for scene ${index}`);

    try {
        // 1. 프롬프트 빌드
        const prompt = buildCyberpunkBgPrompt({
            topic,
            sceneText: scene.onScreenText,
        });

        // 2. Imagen 이미지 생성
        const pngBuffer = await generateImagenPng({ prompt });
        logJob(jobId, 'RUNNING', `Scene ${index} background image generated`, { sizeBytes: pngBuffer.length });

        // 3. Storage 업로드
        const { storagePath, publicUrl } = await uploadBackground(supabase, jobId, index, pngBuffer);
        logJob(jobId, 'RUNNING', `Scene ${index} background uploaded`, { storagePath });

        // 4. assets 테이블 기록
        const { error: insertError } = await supabase
            .from('assets')
            .insert([{
                job_id: jobId,
                type: 'bg_image',
                content_json: {
                    sceneIndex: index,
                    styleId: 'cyberpunk_ui',
                    storagePath,
                    url: publicUrl,
                },
            }]);

        if (insertError) {
            // DB 기록 실패는 경고 처리 (이미지 자체는 업로드 완료)
            logError(`Scene ${index} bg_image asset insert failed (non-fatal)`, insertError);
        }

        return { sceneIndex: index, storagePath, publicUrl };

    } catch (err: any) {
        // 생성 실패 → 폴백 (기존 그라데이션 배경 사용)
        logError(`Scene ${index} background generation failed — falling back to gradient`, err);
        return null;
    }
}

/**
 * 배경 생성 대상인 모든 씬(1, 4)의 배경을 병렬로 생성합니다.
 * 결과는 Map<sceneIndex, BackgroundResult>로 반환합니다.
 * 실패한 씬은 Map에 포함되지 않습니다(폴백 처리).
 */
export async function generateBackgrounds(
    supabase: SupabaseClient,
    jobId: string,
    scenes: Scene[],
    topic: string
): Promise<Map<number, BackgroundResult>> {
    const targetScenes = scenes.filter(s => BG_SCENE_INDICES.includes(s.index));

    const results = await Promise.all(
        targetScenes.map(scene => generateBackground(supabase, jobId, scene, topic))
    );

    const bgMap = new Map<number, BackgroundResult>();
    results.forEach((result, i) => {
        if (result !== null) {
            bgMap.set(targetScenes[i].index, result);
        }
    });

    logJob(jobId, 'RUNNING', `Background generation complete`, {
        attempted: targetScenes.length,
        succeeded: bgMap.size,
    });

    return bgMap;
}
