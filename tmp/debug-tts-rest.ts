import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

async function testTts2_5() {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelId = "models/gemini-2.5-flash-preview-tts";
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelId}:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: "Hello! This is a test from the specialized Gemini 2.5 TTS model." }] }],
        generationConfig: {
            responseModalities: ["AUDIO"]
        }
    };

    console.log(`Testing specialized model: ${modelId}`);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json() as any;

        if (response.ok) {
            console.log('SUCCESS!');
            const audioPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
            if (audioPart) {
                console.log(`Audio Part Found! Base64 length: ${audioPart.inlineData.data.length}`);
                fs.writeFileSync(`tmp/success_2.5_tts.mp3`, Buffer.from(audioPart.inlineData.data, 'base64'));
            } else {
                console.log('No audio part in response.');
                console.log(JSON.stringify(data, null, 2));
            }
        } else {
            console.error(`Error: ${data.error?.message}`);
            console.error(JSON.stringify(data, null, 2));
        }
    } catch (e: any) {
        console.error(`Fetch failed: ${e.message}`);
    }
}

testTts2_5();
