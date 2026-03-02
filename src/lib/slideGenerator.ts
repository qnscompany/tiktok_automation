import type { SupabaseClient } from '@supabase/supabase-js';
import type { TikTokScript } from './schema';
import { renderSlide } from './slideRenderer';
import { uploadSlide } from './storage';
import { logJob, logError } from './log';

// 배경을 생성할 scene index 목록
const BG_SCENE_INDICES = [1, 4];

interface BackgroundResult {
    sceneIndex: number;
    storagePath: string;
    publicUrl: string;
}

/**
 * /api/jobs/gen-bg 엔드포인트를 호출하여 단일 씬의 배경을 생성합니다.
 * 각 호출은 독립적인 Vercel 함수로 실행되어 60s 제한을 우회합니다.
 * 실패 시 null 반환 (폴백 처리).
 */
async function fetchBackground(
    jobId: string,
    scene: { index: number; onScreenText: string; narrationText: string; duration_sec: number },
    topic: string
): Promise<BackgroundResult | null> {
    try {
        // 배포 환경에서는 VERCEL_URL, 로컬에서는 localhost
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';

        const res = await fetch(`${baseUrl}/api/jobs/gen-bg`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId, scene, topic }),
            signal: AbortSignal.timeout(90_000), // 90초 타임아웃
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`gen-bg HTTP ${res.status}: ${errText}`);
        }

        const data = await res.json();
        if (data.result) {
            return data.result as BackgroundResult;
        }
        return null;
    } catch (err: any) {
        logError(`fetchBackground failed for scene ${scene.index}`, err);
        return null;
    }
}

/**
 * 슬라이드 이미지 5장을 생성 → Supabase Storage 업로드 → assets 테이블 기록까지
 * 한번에 수행하는 오케스트레이터 함수입니다.
 *
 * Phase 5:
 * - Scene 1/4에 대해 /api/jobs/gen-bg를 순차 호출 (각각 독립 함수 실행)
 * - 배경 생성 실패 시 기존 그라데이션 폴백 (잡 실패 방지)
 */
export async function generateSlides(
    supabase: SupabaseClient,
    jobId: string,
    script: TikTokScript,
    topic: string
): Promise<void> {
    logJob(jobId, 'RUNNING', 'Slide generation started', { slideCount: script.scenes.length });

    // ── Phase 5: Scene 1/4 배경 이미지 순차 생성 ──────────────────
    const bgMap = new Map<number, BackgroundResult>();
    for (const scene of script.scenes) {
        if (!BG_SCENE_INDICES.includes(scene.index)) continue;

        logJob(jobId, 'RUNNING', `Requesting background for scene ${scene.index}...`);
        const result = await fetchBackground(jobId, scene, topic);
        if (result) {
            bgMap.set(scene.index, result);
            logJob(jobId, 'RUNNING', `Background ready for scene ${scene.index}`, { storagePath: result.storagePath });
        } else {
            logJob(jobId, 'RUNNING', `Scene ${scene.index} background fallback (gradient)`);
        }
    }

    logJob(jobId, 'RUNNING', `Backgrounds done: ${bgMap.size}/2`);

    // ── 5장 슬라이드 순차 생성 ─────────────────────────────────────
    for (const scene of script.scenes) {
        const index = scene.index;

        try {
            // 배경 이미지 버퍼 (있으면 합성, 없으면 그라데이션)
            const bgResult = bgMap.get(index);
            let bgBuffer: Buffer | undefined;

            if (bgResult) {
                const { data: bgBytes, error: dlError } = await supabase.storage
                    .from('tiktok-assets')
                    .download(bgResult.storagePath);

                if (dlError || !bgBytes) {
                    logError(`Failed to download bg for scene ${index} (non-fatal)`, dlError);
                } else {
                    bgBuffer = Buffer.from(await bgBytes.arrayBuffer());
                }
            }

            // 1. 슬라이드 렌더링
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
