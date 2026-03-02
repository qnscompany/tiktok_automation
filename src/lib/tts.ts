import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gemini 클라이언트를 TTS 전용 설정으로 생성합니다.
 * gemini-2.5-flash-preview-tts 모델을 사용합니다.
 */
function getGeminiTtsModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('Missing GEMINI_API_KEY environment variable');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // 2.5 Flash TTS 모델을 사용하여 고품질 음성을 생성합니다.
    return genAI.getGenerativeModel({
        model: "gemini-2.5-flash-preview-tts",
    }, { apiVersion: 'v1beta' });
}

interface GenerateTtsArgs {
    text: string;
    voice?: string; // 2.5 TTS 모델의 경우 voiceConfig 지원 여부를 추후 확인
}

/**
 * Gemini 2.5 Flash Preview TTS 모델을 호출하여 텍스트를 오디오 Buffer로 변환합니다.
 */
export async function generateTtsAudio({ text }: GenerateTtsArgs): Promise<Buffer> {
    const model = getGeminiTtsModel();

    try {
        console.log(`Generating Gemini 2.5 TTS for: "${text.substring(0, 30)}..."`);

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: {
                // @ts-ignore
                responseModalities: ["AUDIO"],
            }
        });

        const response = await result.response;
        const candidates = response.candidates;

        if (!candidates || candidates.length === 0) {
            throw new Error('No candidates received from Gemini TTS API');
        }

        const audioPart = candidates[0].content?.parts?.find(p => p.inlineData);

        if (!audioPart || !audioPart.inlineData) {
            console.error('Gemini TTS: No audio data in response content', JSON.stringify(candidates[0].content));
            throw new Error('No audio data (inlineData) received from Gemini');
        }

        return Buffer.from(audioPart.inlineData.data, 'base64');
    } catch (error: any) {
        console.error('Gemini 2.5 TTS Error:', error);
        throw new Error(`Gemini 2.5 TTS generation failed: ${error.message}`);
    }
}
