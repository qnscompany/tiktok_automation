import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkAudioMime() {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelId = "models/gemini-2.5-flash-preview-tts";
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelId}:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: "This is a test to check the audio format." }] }],
        generationConfig: {
            responseModalities: ["AUDIO"]
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json() as any;

        if (response.ok) {
            const audioPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
            if (audioPart && audioPart.inlineData) {
                console.log('MIME Type:', audioPart.inlineData.mimeType);
                console.log('Data Length:', audioPart.inlineData.data.length);
                // 처음 20바이트 출력 (헤더 확인)
                const hex = Buffer.from(audioPart.inlineData.data.substring(0, 40), 'base64').toString('hex');
                console.log('Hex Header:', hex);
            } else {
                console.log('No audio part found.');
            }
        } else {
            console.error('Error:', data.error?.message);
        }
    } catch (e: any) {
        console.error('Fetch failed:', e.message);
    }
}

checkAudioMime();
