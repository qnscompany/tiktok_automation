import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';

// FFmpeg 바이너리 경로 설정
function setupFfmpeg() {
    if (!ffmpegStatic) {
        console.error('ffmpeg-static path is null');
        return;
    }

    console.log(`Initial ffmpegStatic path: ${ffmpegStatic}`);

    // Vercel 환경에서 상대 경로와 절대 경로 모두 시도
    const possiblePaths = [
        ffmpegStatic,
        path.join(process.cwd(), 'node_modules/ffmpeg-static/ffmpeg'),
        path.join(process.cwd(), '.next/server/vendor-chunks/node_modules/ffmpeg-static/ffmpeg'),
        '/var/task/node_modules/ffmpeg-static/ffmpeg',
        'ffmpeg' // System path fallback
    ];

    for (const p of possiblePaths) {
        console.log(`Checking FFmpeg at: ${p}`);
        if (p !== 'ffmpeg' && fs.existsSync(p)) {
            console.log(`SUCCESS: FFmpeg found at ${p}`);
            ffmpeg.setFfmpegPath(p);
            return;
        }
    }

    console.warn('FFmpeg binary not found in known paths, falling back to system "ffmpeg"');
    ffmpeg.setFfmpegPath('ffmpeg');
}

setupFfmpeg();

export default ffmpeg;
