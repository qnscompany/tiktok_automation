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
            path.join(process.cwd(), 'node_modules/ffprobe-static/ffprobe'),
            '/var/task/node_modules/ffprobe-static/ffprobe',
            'ffprobe'
        ];
        for (const p of possibleFfprobePaths) {
            if (p === 'ffprobe' || fs.existsSync(p)) {
                ffmpeg.setFfprobePath(p);
                console.log(`FFprobe path set to: ${p}`);
                break;
            }
        }
    }
}

setupFfmpeg();

export default ffmpeg;
