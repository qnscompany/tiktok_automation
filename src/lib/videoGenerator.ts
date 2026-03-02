import { SupabaseClient } from '@supabase/supabase-js';
import ffmpeg from './ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { pipeline } from 'stream';

const streamPipeline = promisify(pipeline);

interface Asset {
    type: string;
    content_json: any;
}

/**
 * 작업을 완료하기 위해 슬라이드와 오디오를 합성하여 최종 비디오를 생성합니다.
 */
export async function generateFinalVideo(
    supabase: SupabaseClient,
    jobId: string
): Promise<Buffer> {
    console.log(`Starting video generation for job: ${jobId}`);

    // 1. 자산 목록 가져오기
    const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('type, content_json')
        .eq('job_id', jobId);

    if (assetsError || !assets) {
        throw new Error(`Failed to fetch assets for job ${jobId}: ${assetsError?.message}`);
    }

    const slides = assets
        .filter(a => a.type === 'slide_image')
        .sort((a, b) => a.content_json.index - b.content_json.index);

    const audios = assets
        .filter(a => a.type === 'audio_narration')
        .sort((a, b) => a.content_json.index - b.content_json.index);

    if (slides.length === 0 || audios.length === 0) {
        throw new Error('Incomplete assets for video generation');
    }

    const tempDir = path.join(os.tmpdir(), `job-${jobId}`);
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const slidePaths: string[] = [];
    const audioPaths: string[] = [];

    try {
        // 2. 파일 다운로드
        for (let i = 0; i < slides.length; i++) {
            const slidePath = path.join(tempDir, `slide-${i}.png`);
            const audioPath = path.join(tempDir, `audio-${i}.wav`);

            await downloadFile(slides[i].content_json.publicUrl, slidePath);
            await downloadFile(audios[i].content_json.publicUrl, audioPath);

            slidePaths.push(slidePath);
            audioPaths.push(audioPath);
        }

        const outputPath = path.join(tempDir, 'output.mp4');

        // 3. FFmpeg 합성
        // 각 씬(이미지+오디오)을 개별적으로 처리한 후 합치는 방식이 안정적입니다.
        await synthesizeVideo(slidePaths, audioPaths, outputPath);

        // 4. 결과 읽기
        const videoBuffer = fs.readFileSync(outputPath);

        // 5. 정리
        cleanup(tempDir);

        return videoBuffer;
    } catch (err) {
        cleanup(tempDir);
        throw err;
    }
}

async function downloadFile(url: string, dest: string) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download ${url}: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
}

function synthesizeVideo(slidePaths: string[], audioPaths: string[], outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const command = ffmpeg();

        // 1. 모든 슬라이드와 오디오를 번갈아가며 입력 추가
        // [slide0, audio0, slide1, audio1, ...]
        for (let i = 0; i < slidePaths.length; i++) {
            command.input(slidePaths[i]).loop(1);
            command.input(audioPaths[i]);
        }

        // 2. 복합 필터 구성
        let filterComplex = "";
        let concatStreams = "";

        for (let i = 0; i < slidePaths.length; i++) {
            const vIdx = i * 2;     // slide index in inputs
            const aIdx = i * 2 + 1; // audio index in inputs

            // 이미지 스케일링 및 패딩 (9:16 맞춤)
            filterComplex += `[${vIdx}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}];`;
            // 각 씬의 비디오를 해당 오디오 길이에 맞춤 (이게 핵심)
            // shortest=1을 쓰기 위해 개별 씬을 서브 스트림으로 정의
            concatStreams += `[v${i}][${aIdx}:a]`;
        }

        // 모든 씬 병합
        filterComplex += `${concatStreams}concat=n=${slidePaths.length}:v=1:a=1[outv][outa]`;

        command
            .complexFilter(filterComplex)
            .map('[outv]')
            .map('[outa]')
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions([
                '-pix_fmt yuv420p',
                '-r 30',
                '-shortest' // 각 인풋의 짧은 쪽에 맞춤 (오디오 길이에 맞게 영상이 끊김)
            ])
            .on('start', (cmd) => console.log('FFmpeg command:', cmd))
            .on('error', (err) => {
                console.error('FFmpeg failed:', err);
                reject(err);
            })
            .on('end', () => {
                console.log('Video synthesis complete');
                resolve();
            })
            .save(outputPath);
    });
}

function cleanup(dir: string) {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {
        console.warn('Cleanup failed:', e);
    }
}
