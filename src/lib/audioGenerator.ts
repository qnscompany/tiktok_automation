import type { SupabaseClient } from '@supabase/supabase-js';
import type { Scene } from './schema';
import { generateTtsAudio } from './tts';
import { uploadAudio } from './storage';
import { logJob, logError } from './log';

/**
 * 모든 씬에 대해 나레이션 오디오(TTS)를 생성하고 Supabase Storage에 업로드합니다.
 * 이후 assets 테이블에 기록합니다.
 */
export async function generateAudioAssets(
    supabase: SupabaseClient,
    jobId: string,
    scenes: Scene[]
): Promise<void> {
    logJob(jobId, 'RUNNING', 'Audio(TTS) generation started', { sceneCount: scenes.length });

    // 씬별로 순차적으로 처리 (동시성 제한을 위해 순차 처리하거나 Promise.all 사용)
    // 여기서는 Promise.all로 병렬 처리합니다.
    const audioPromises = scenes.map(async (scene) => {
        const index = scene.index;
        const text = scene.narrationText;

        try {
            // 1. TTS 생성
            const audioBuffer = await generateTtsAudio({ text });
            logJob(jobId, 'RUNNING', `Audio ${index} generated`, { sizeBytes: audioBuffer.length });

            // 2. Storage 업로드
            const { storagePath, publicUrl } = await uploadAudio(supabase, jobId, index, audioBuffer);
            logJob(jobId, 'RUNNING', `Audio ${index} uploaded`, { storagePath });

            // 3. assets 테이블 기록
            const { error: insertError } = await supabase
                .from('assets')
                .insert([{
                    job_id: jobId,
                    type: 'audio_narration',
                    content_json: {
                        index,
                        storagePath,
                        publicUrl,
                        text: text
                    }
                }]);

            if (insertError) {
                throw new Error(`Failed to insert audio ${index} asset: ${insertError.message}`);
            }

            logJob(jobId, 'RUNNING', `Audio ${index} asset recorded`);

        } catch (error: any) {
            logError(`Audio ${index} generation failed for job ${jobId}`, error);
            throw error; // 하나라도 실패하면 잡 실패로 간주 (또는 개별 처리)
        }
    });

    await Promise.all(audioPromises);
    logJob(jobId, 'RUNNING', 'All audio assets generated and recorded successfully');
}
