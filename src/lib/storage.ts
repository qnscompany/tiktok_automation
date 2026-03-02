import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'tiktok-assets';

/**
 * 슬라이드 PNG 이미지를 Supabase Storage에 업로드합니다.
 * 경로 규칙: jobs/{jobId}/slides/{index}.png
 * 
 * @returns { storagePath, publicUrl }
 */
export async function uploadSlide(
    supabase: SupabaseClient,
    jobId: string,
    index: number,
    pngBuffer: Buffer
): Promise<{ storagePath: string; publicUrl: string }> {
    const storagePath = `jobs/${jobId}/slides/${index}.png`;

    // 업로드 (동일 경로가 있으면 덮어쓰기)
    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, pngBuffer, {
            contentType: 'image/png',
            upsert: true  // 중복 시 덮어쓰기
        });

    if (uploadError) {
        throw new Error(`Storage upload failed for slide ${index}: ${uploadError.message}`);
    }

    // Public URL 가져오기
    const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

    return {
        storagePath,
        publicUrl: urlData.publicUrl
    };
}

/**
 * 배경 이미지를 Supabase Storage에 업로드합니다.
 * 경로 규칙: jobs/{jobId}/bg/{sceneIndex}.png
 *
 * @returns { storagePath, publicUrl }
 */
export async function uploadBackground(
    supabase: SupabaseClient,
    jobId: string,
    sceneIndex: number,
    pngBuffer: Buffer
): Promise<{ storagePath: string; publicUrl: string }> {
    const storagePath = `jobs/${jobId}/bg/${sceneIndex}.png`;

    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, pngBuffer, {
            contentType: 'image/png',
            upsert: true,
        });

    if (uploadError) {
        throw new Error(`Storage upload failed for background scene ${sceneIndex}: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

    return {
        storagePath,
        publicUrl: urlData.publicUrl,
    };
}

/**
 * 나레이션 오디오 파일을 Supabase Storage에 업로드합니다.
 * 경로 규칙: jobs/{jobId}/audio/{sceneIndex}.mp3
 *
 * @returns { storagePath, publicUrl }
 */
export async function uploadAudio(
    supabase: SupabaseClient,
    jobId: string,
    sceneIndex: number,
    audioBuffer: Buffer
): Promise<{ storagePath: string; publicUrl: string }> {
    const storagePath = `jobs/${jobId}/audio/${sceneIndex}.wav`;

    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, audioBuffer, {
            contentType: 'audio/wav',
            upsert: true,
        });

    if (uploadError) {
        throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

    return { storagePath, publicUrl };
}

/**
 * 최종 합성된 비디오 파일을 Supabase Storage에 업로드합니다.
 */
export async function uploadVideo(
    supabase: SupabaseClient,
    jobId: string,
    videoBuffer: Buffer
): Promise<{ storagePath: string; publicUrl: string }> {
    const storagePath = `jobs/${jobId}/final_video.mp4`;

    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, videoBuffer, {
            contentType: 'video/mp4',
            upsert: true,
        });

    if (uploadError) {
        throw new Error(`Failed to upload video: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

    return { storagePath, publicUrl };
}
