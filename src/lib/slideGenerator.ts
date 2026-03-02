import type { SupabaseClient } from '@supabase/supabase-js';
import type { TikTokScript, Scene } from './schema';
import { renderSlide } from './slideRenderer';
import { uploadSlide } from './storage';
import { generateBackgrounds, BackgroundResult } from './backgroundGenerator';
import { logJob, logError } from './log';

/**
 * 슬라이드 이미지 5장을 생성 → Supabase Storage 업로드 → assets 테이블 기록까지
 * 한번에 수행하는 오케스트레이터 함수입니다.
 *
 * Phase 5:
 * - Scene 1/4에 대해 Imagen 배경 생성 (generateBackgrounds)
 * - 배경 생성 실패 시 그라데이션 폴백 (잡 실패 방지)
 * - Vercel 60s 제한 내에서 최대한 처리, 초과 시 폴백
 */
export async function generateSlides(
    supabase: SupabaseClient,
    jobId: string,
    script: TikTokScript,
    topic: string
): Promise<void> {
    logJob(jobId, 'RUNNING', 'Slide generation started', { slideCount: script.scenes.length });

    // ── Phase 5: Scene 1/4 배경 이미지 생성 ──────────────────
    // Promise.race를 통해 50초 안에 완료되지 않으면 빈 Map으로 폴백
    let bgMap = new Map<number, BackgroundResult>();
    try {
        const timeoutPromise = new Promise<Map<number, BackgroundResult>>((resolve) => {
            setTimeout(() => {
                logError('Background generation timed out after 50s, falling back to gradient', null);
                resolve(new Map());
            }, 50_000);
        });

        const bgPromise = generateBackgrounds(supabase, jobId, script.scenes, topic);
        bgMap = await Promise.race([bgPromise, timeoutPromise]);
        logJob(jobId, 'RUNNING', `Backgrounds done: ${bgMap.size}/2`);
    } catch (err: any) {
        logError('generateBackgrounds failed, falling back to gradient for all scenes', err);
    }

    // ── 5장 슬라이드 순차 생성 ─────────────────────────────────────
    for (const scene of script.scenes) {
        const index = scene.index;

        try {
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
