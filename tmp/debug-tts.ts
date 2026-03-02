import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// .env.local 로드
dotenv.config({ path: '.env.local' });

async function testTts() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('Missing GEMINI_API_KEY');
        process.exit(1);
    }

    // 테스트할 모델 리스트
    const models = ["gemini-2.0-flash", "gemini-1.5-flash"];

    for (const modelName of models) {
        console.log(`\n--- Testing Model: ${modelName} (v1beta) ---`);
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: modelName,
        }, { apiVersion: 'v1beta' });

        try {
            const text = "Searching for the lighthouse in the storm. This is a voice test.";
            console.log(`Sending request with text: "${text}"`);

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text }] }],
                generationConfig: {
                    // @ts-ignore
                    responseModalities: ["audio"],
                },
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            });

            const response = await result.response;
            console.log('Response Finish Reason:', response.candidates?.[0]?.finishReason);

            const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

            if (audioPart && audioPart.inlineData) {
                const buffer = Buffer.from(audioPart.inlineData.data, 'base64');
                const outputPath = `tmp/test_audio_${modelName}.mp3`;
                fs.writeFileSync(outputPath, buffer);
                console.log(`Success! Audio saved to ${outputPath} (${buffer.length} bytes)`);
                break; // 하나라도 성공하면 종료
            } else {
                console.log('No audio data found in response.');
                console.log('Full response structure:', JSON.stringify(response, null, 2));
            }
        } catch (error: any) {
            console.error(`Error with model ${modelName}:`, error.message);
            if (error.response) {
                try {
                    const body = await error.response.json();
                    console.error('Error Response Body:', JSON.stringify(body, null, 2));
                } catch (e) {
                    // ignore
                }
            }
        }
    }
}

testTts();
