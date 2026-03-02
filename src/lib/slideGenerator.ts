import type { SupabaseClient } from '@supabase/supabase-js';
import type { TikTokScript } from './schema';
import { renderSlide } from './slideRenderer';
import { uploadSlide } from './storage';
import { generateBackgrounds } from './backgroundGenerator';
import { logJob, logError } from './log';

/**
 * 슬라이드 이미지 5장을 생성 → Supabase Storage 업로드 → assets 테이블 기록까지
 * 한번에 수행하는 오케스트레이터 함수입니다.
 *
 * Phase 5 업데이트:
 * - Scene 1/4에 대해 Imagen 배경을 병렬 생성
 * - 배경 생성 실패 시 자동 폴백 (그라데이션 배경 사용)
 *
 * @param supabase - Supabase Admin 클라이언트
 * @param jobId - 작업 ID
 * @param script - 파싱된 TikTokScript 데이터
 * @param topic - 원본 주제 (슬라이드 상단 라벨에 사용)
 */
export async function generateSlides(
    supabase: SupabaseClient,
    jobId: string,
    script: TikTokScript,
    topic: string
): Promise<void> {
    logJob(jobId, 'RUNNING', 'Slide generation started', { slideCount: script.scenes.length });

    // ── Phase 5: Scene 1/4 배경 이미지 병렬 생성 ──────────────────
    // 실패해도 잡이 중단되지 않음 (bgMap에서 해당 sceneIndex 없음 → 폴백)
    logJob(jobId, 'RUNNING', 'Generating background images for scenes 1 and 4...');
    const bgMap = await generateBackgrounds(supabase, jobId, script.scenes, topic);
    logJob(jobId, 'RUNNING', `Background generation done`, {
        succeeded: bgMap.size,
        sceneIndices: Array.from(bgMap.keys()),
    });

    // ── 5장 슬라이드 순차 생성 ─────────────────────────────────────
    for (const scene of script.scenes) {
        const index = scene.index;

        try {
            // 배경 이미지 버퍼 (있으면 합성, 없으면 그라데이션 폴백)
            const bgResult = bgMap.get(index);
            let bgBuffer: Buffer | undefined;

            if (bgResult) {
                // Storage에서 배경 이미지 다운로드 (로컬 버퍼로 변환)
                const { data: bgBytes, error: dlError } = await supabase.storage
                    .from('tiktok-assets')
                    .download(bgResult.storagePath);

                if (dlError || !bgBytes) {
                    logError(`Failed to download background for scene ${index} (non-fatal)`, dlError);
                } else {
                    bgBuffer = Buffer.from(await bgBytes.arrayBuffer());
                }
            }

            // 1. 이미지 렌더링 (배경 적용 or 폴백)
            const pngBuffer = await renderSlide(scene, topic, index, bgBuffer);
            logJob(jobId, 'RUNNING', `Slide ${index} rendered`, {
                sizeBytes: pngBuffer.length,
                hasCustomBg: !!bgBuffer,
            });

            // 2. Supabase Storage 업로드
            const { storagePath, publicUrl } = await uploadSlide(supabase, jobId, index, pngBuffer);
            logJob(jobId, 'RUNNING', `Slide ${index} uploaded`, { storagePath });

            // 3. assets 테이블에 기록
            const { error: insertError } = await supabase
                .from('assets')
                .insert([{
                    job_id: jobId,
                    type: 'slide_image',
                    content_json: {
                        index,
                        storagePath,
                        publicUrl,
                        hasCustomBg: !!bgBuffer,
                        bgStoragePath: bgResult?.storagePath ?? null,
                        scene: {
                            onScreenText: scene.onScreenText,
                            narrationText: scene.narrationText,
                        },
                    },
                }]);

            if (insertError) {
                throw new Error(`Failed to insert slide ${index} asset: ${insertError.message}`);
            }

            logJob(jobId, 'RUNNING', `Slide ${index} asset recorded`, { publicUrl });

        } catch (error: any) {
            logError(`Slide ${index} generation failed for job ${jobId}`, error);
            throw new Error(`Slide ${index} failed: ${error.message}`);
        }
    }

    logJob(jobId, 'RUNNING', 'All 5 slides generated and uploaded successfully');
}
