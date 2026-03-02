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
 * Raw PCM 데이터에 WAV 헤더를 추가합니다.
 * Gemini 2.5 Flash Preview TTS는 기본적으로 24kHz, 16-bit mono PCM을 반환합니다.
 */
function addWavHeader(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
    const dataSize = pcmBuffer.length;
    const header = Buffer.alloc(44);

    header.write('RIFF', 0);
    header.writeUInt32LE(dataSize + 36, 4); // ChunkSize
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);            // Subchunk1Size (16 for PCM)
    header.writeUInt16LE(1, 20);             // AudioFormat (1 for PCM)
    header.writeUInt16LE(1, 22);             // NumChannels (1 for Mono)
    header.writeUInt32LE(sampleRate, 24);    // SampleRate
    header.writeUInt32LE(sampleRate * 2, 28);// ByteRate (SampleRate * NumChannels * BitsPerSample/8)
    header.writeUInt16LE(2, 32);             // BlockAlign (NumChannels * BitsPerSample/8)
    header.writeUInt16LE(16, 34);            // BitsPerSample
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);      // Subchunk2Size

    return Buffer.concat([header, pcmBuffer]);
}

/**
 * Gemini 2.5 Flash Preview TTS 모델을 호출하여 텍스트를 오디오 Buffer로 변환합니다.
 * 반환된 PCM 데이터에 WAV 헤더를 입혀 표준 오디오 파일로 만듭니다.
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
        const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

        if (!audioPart || !audioPart.inlineData) {
            throw new Error('No audio data received from Gemini');
        }

        const pcmBuffer = Buffer.from(audioPart.inlineData.data, 'base64');

        // 0-second 문제를 해결하기 위해 WAV 헤더 추가
        return addWavHeader(pcmBuffer, 24000);
    } catch (error: any) {
        console.error('Gemini 2.5 TTS Error:', error);
        throw new Error(`Gemini 2.5 TTS generation failed: ${error.message}`);
    }
}
