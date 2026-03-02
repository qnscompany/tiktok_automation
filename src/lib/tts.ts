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
    // 2.0 Flash 모델이 오디오 생성을 지원합니다.
    return genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
    });
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
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: {
                // @ts-ignore - SDK 버전에 따라 타입이 없을 수 있으므로 무시
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
        // 오디오 데이터는 response.audioContents가 아닌 inlineData 형태나 특정 필드로 올 수 있음
        // 최신 SDK 기준으로는 response.data.fileData 또는 response.parts[0].inlineData 사용
        const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

        if (!audioPart || !audioPart.inlineData) {
            throw new Error('No audio data received from Gemini');
        }

        return Buffer.from(audioPart.inlineData.data, 'base64');
    } catch (error: any) {
        console.error('Gemini TTS Error:', error);
        throw new Error(`Gemini TTS generation failed: ${error.message}`);
    }
}
