import { generateTtsAudio } from '../src/lib/tts';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

async function verifyWav() {
    console.log('Verifying WAV conversion...');
    try {
        const buffer = await generateTtsAudio({ text: "Checking if the WAV header is correctly applied." });
        console.log('Success! Buffer size:', buffer.length);

        // RIFF 헤더 확인 (52 49 46 46)
        const header = buffer.slice(0, 4).toString();
        const type = buffer.slice(8, 12).toString();
        console.log('RIFF Header:', header); // Should be "RIFF"
        console.log('WAVE Type:', type);     // Should be "WAVE"

        fs.writeFileSync('tmp/final_test.wav', buffer);
        console.log('Saved to tmp/final_test.wav');
    } catch (e: any) {
        console.error('Failed:', e.message);
    }
}

verifyWav();
