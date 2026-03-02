import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// FFmpeg 바이너리 경로 설정
if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
}

export default ffmpeg;
