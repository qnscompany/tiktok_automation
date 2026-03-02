import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';

// FFmpeg 바이너리 경로 설정
if (ffmpegStatic) {
    console.log(`Setting FFmpeg path to: ${ffmpegStatic}`);
    if (fs.existsSync(ffmpegStatic)) {
        console.log('FFmpeg binary found at path.');
        ffmpeg.setFfmpegPath(ffmpegStatic);
    } else {
        console.error('FFmpeg binary NOT found at ffmpegStatic path!');
        // fallback: common vercel paths or just 'ffmpeg'
        ffmpeg.setFfmpegPath('ffmpeg');
    }
}

export default ffmpeg;
