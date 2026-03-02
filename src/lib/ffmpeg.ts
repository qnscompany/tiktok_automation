import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import fs from 'fs';
import path from 'path';

// FFmpeg 및 FFprobe 바이너리 경로 설정
function setupFfmpeg() {
    // 1. FFmpeg 설정
    if (ffmpegStatic) {
        const possibleFfmpegPaths = [
            ffmpegStatic,
            path.join(process.cwd(), 'node_modules/ffmpeg-static/ffmpeg'),
            '/var/task/node_modules/ffmpeg-static/ffmpeg',
            'ffmpeg'
        ];
        for (const p of possibleFfmpegPaths) {
            if (p === 'ffmpeg' || fs.existsSync(p)) {
                ffmpeg.setFfmpegPath(p);
                console.log(`FFmpeg path set to: ${p}`);
                break;
            }
        }
    }

    // 2. FFprobe 설정
    if (ffprobeStatic) {
        const possibleFfprobePaths = [
            ffprobeStatic.path,
            // Vercel에서 includeFiles로 포함시킨 경로
            path.join(process.cwd(), 'node_modules/ffprobe-static/bin/linux/x64/ffprobe'),
            path.join(process.cwd(), 'node_modules/ffprobe-static/ffprobe'),
            '/var/task/node_modules/ffprobe-static/bin/linux/x64/ffprobe',
            'ffprobe'
        ];
        console.log('Searching for FFprobe...');
        for (const p of possibleFfprobePaths) {
            console.log(`Checking FFprobe at: ${p}`);
            if (p === 'ffprobe' || fs.existsSync(p)) {
                ffmpeg.setFfprobePath(p);
                console.log(`SUCCESS: FFprobe path set to: ${p}`);
                return;
            }
        }
    }
}

setupFfmpeg();

export default ffmpeg;
