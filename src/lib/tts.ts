import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

/**
 * OpenAI 클라이언트를 초기화하고 반환합니다.
 * 환경 변수가 없으면 에러를 던집니다.
 */
export function getOpenAIClient() {
    if (openaiClient) return openaiClient;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('Missing OPENAI_API_KEY environment variable');
    }

    openaiClient = new OpenAI({
        apiKey: apiKey,
    });

    return openaiClient;
}

interface GenerateTtsArgs {
    text: string;
    voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
}

/**
 * OpenAI TTS API를 호출하여 텍스트를 오디오(MP3) Buffer로 변환합니다.
 */
export async function generateTtsAudio({ text, voice = 'onyx' }: GenerateTtsArgs): Promise<Buffer> {
    const openai = getOpenAIClient();

    try {
        const mp3 = await openai.audio.speech.create({
            model: 'tts-1',
            voice: voice,
            input: text,
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        return buffer;
    } catch (error: any) {
        console.error('OpenAI TTS Error:', error);
        throw new Error(`TTS generation failed: ${error.message}`);
    }
}
