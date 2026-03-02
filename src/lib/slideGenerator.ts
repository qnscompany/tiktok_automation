import type { SupabaseClient } from '@supabase/supabase-js';
import type { TikTokScript } from './schema';
import { renderSlide } from './slideRenderer';
import { uploadSlide } from './storage';
import { logJob, logError } from './log';

/**
 * 슬라이드 이미지 5장을 생성 → Supabase Storage 업로드 → assets 테이블 기록까지
 * 한번에 수행하는 오케스트레이터 함수입니다.
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

    for (const scene of script.scenes) {
        const index = scene.index;

        try {
            // 1. 이미지 렌더링
            const pngBuffer = await renderSlide(scene, topic, index);
            logJob(jobId, 'RUNNING', `Slide ${index} rendered`, { sizeBytes: pngBuffer.length });

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
                        scene: {
                            onScreenText: scene.onScreenText,
                            narrationText: scene.narrationText
                        }
                    }
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
