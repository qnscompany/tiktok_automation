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

    const tempPrefix = path.join(os.tmpdir(), `job-${jobId}`);

    const slidePaths: string[] = [];
    const audioInfos: AudioInfo[] = [];

    try {
        // 2. 파일 다운로드 및 메타데이터 추출
        for (let i = 0; i < slides.length; i++) {
            const slidePath = `${tempPrefix}-slide-${i}.png`;
            const audioPath = `${tempPrefix}-audio-${i}.wav`;

            await downloadFile(slides[i].content_json.publicUrl, slidePath);
            await downloadFile(audios[i].content_json.publicUrl, audioPath);

            const duration = await getAudioDuration(audioPath);
            console.log(`Scene ${i} audio duration: ${duration}s`);

            slidePaths.push(slidePath);
            audioInfos.push({ path: audioPath, duration });
        }

        const outputPath = `${tempPrefix}-output.mp4`;

        // 3. FFmpeg 합성
        await synthesizeVideo(slidePaths, audioInfos, outputPath);

        // 4. 결과 읽기
        const videoBuffer = fs.readFileSync(outputPath);

        // 5. 정리
        slidePaths.forEach(p => safeUnlink(p));
        audioInfos.forEach(a => safeUnlink(a.path));
        safeUnlink(outputPath);

        return videoBuffer;
    } catch (err) {
        // 에러 시에도 청소 시도
        slidePaths.forEach(p => safeUnlink(p));
        audioInfos.forEach(a => safeUnlink(a.path));
        throw err;
    }
}

function safeUnlink(p: string) {
    try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (e) {
        console.warn(`Failed to delete temp file ${p}:`, e);
    }
}

async function downloadFile(url: string, dest: string) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download ${url}: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
}

interface AudioInfo {
    path: string;
    duration: number;
}

async function getAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);
            const duration = metadata.format.duration;
            resolve(duration || 0);
        });
    });
}

function synthesizeVideo(slidePaths: string[], audioInfos: AudioInfo[], outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const command = ffmpeg();

        // 1. 모든 슬라이드와 오디오를 번갈아가며 입력 추가
        for (let i = 0; i < slidePaths.length; i++) {
            // 이미지를 루프시키되, 오디오 길이만큼만 지속하도록 설정
            command.input(slidePaths[i])
                .inputOptions([`-loop 1`, `-t ${audioInfos[i].duration}`]);
            command.input(audioInfos[i].path);
        }

        // 2. 복합 필터 구성
        let filterComplex = "";
        let concatStreams = "";

        for (let i = 0; i < slidePaths.length; i++) {
            const vIdx = i * 2;     // slide index in inputs
            const aIdx = i * 2 + 1; // audio index in inputs

            // 이미지 스케일링 및 패딩 (9:16 맞춤)
            filterComplex += `[${vIdx}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}];`;
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
                '-fps_mode cfr', // 고정 프레임레이트(CFR) 강제하여 충돌 방지 및 싱크 보호
                '-y'
            ])
            .on('start', (cmd) => {
                console.log('FFmpeg command:', cmd);
                (command as any)._fullCommand = cmd;
            })
            .on('error', (err, stdout, stderr) => {
                console.error('FFmpeg failed:', err.message);
                console.error('FFmpeg stderr:', stderr);
                const errorWithDetails = new Error(err.message);
                (errorWithDetails as any).ffmpegError = stderr;
                (errorWithDetails as any).command = (command as any)._fullCommand;
                reject(errorWithDetails);
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
