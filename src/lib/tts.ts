import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gemini 클라이언트를 TTS 전용 설정으로 생성합니다.
 */
function getGeminiTtsModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('Missing GEMINI_API_KEY environment variable');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // v1beta가 실험적 기능을 가장 안전하게 지원합니다.
    return genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
    }, { apiVersion: 'v1beta' });
}

interface GenerateTtsArgs {
    text: string;
    voice?: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede';
}

/**
 * Gemini 2.0 Flash의 생성형 오디오 기능을 호출하여 텍스트를 오디오(AAC/MP3) Buffer로 변환합니다.
 */
export async function generateTtsAudio({ text, voice = 'Aoede' }: GenerateTtsArgs): Promise<Buffer> {
    const model = getGeminiTtsModel();

    try {
        console.log(`Generating TTS for: "${text.substring(0, 30)}..." with voice: ${voice}`);

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: {
                // @ts-ignore
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: voice
                        }
                    }
                }
            }
        });

        const response = await result.response;

        // Debug: Log response structure
        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            console.error('Gemini TTS: No candidates in response', JSON.stringify(response));
            throw new Error('No candidates received from Gemini API');
        }

        const audioPart = candidates[0].content?.parts?.find(p => p.inlineData);

        if (!audioPart || !audioPart.inlineData) {
            console.error('Gemini TTS: No inlineData in parts', JSON.stringify(candidates[0].content));
            throw new Error('No audio data (inlineData) received from Gemini');
        }

        console.log('Gemini TTS: Audio generated successfully');
        return Buffer.from(audioPart.inlineData.data, 'base64');
    } catch (error: any) {
        console.error('Gemini TTS Error Details:', error);
        throw new Error(`Gemini TTS generation failed: ${error.message}`);
    }
}
