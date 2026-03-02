import { GoogleGenAI } from '@google/genai';

// ── 상수 ──────────────────────────────────────────────────
// Gemini 이미지 생성 모델. Gemini API에서 이미지 생성을 지원하는 모델.
// gemini-3.1-flash-image-preview (공식 문서 기준)
export const IMAGEN_MODEL = 'gemini-3.1-flash-image-preview';

// ── 타입 ──────────────────────────────────────────────────
interface GenerateImagenPngParams {
    prompt: string;
}

/**
 * Gemini API를 통해 이미지를 생성하고 PNG Buffer를 반환합니다.
 *
 * @param prompt - 이미지 생성 프롬프트
 * @returns PNG 이미지 Buffer
 * @throws 이미지 생성 실패 시 명확한 에러 메시지와 함께 throw합니다.
 *         호출자에서 catch하여 폴백 처리할 수 있습니다.
 *
 * @note 모듈 스코프에서 환경 변수 체크나 throw를 하지 않습니다.
 *       API 키 누락은 실제 호출 시점에 감지됩니다.
 */
export async function generateImagenPng({ prompt }: GenerateImagenPngParams): Promise<Buffer> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('[IMAGEN] GEMINI_API_KEY is not set. Cannot generate image.');
    }

    const ai = new GoogleGenAI({ apiKey });

    let response: Awaited<ReturnType<typeof ai.models.generateContent>>;
    try {
        response = await ai.models.generateContent({
            model: IMAGEN_MODEL,
            contents: prompt,
            config: {
                responseModalities: ['TEXT', 'IMAGE'],
            },
        });
    } catch (err: any) {
        throw new Error(`[IMAGEN] API call failed: ${err.message}`);
    }

    // 응답 파트에서 이미지 데이터 추출
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
        if (part.inlineData?.data) {
            const buffer = Buffer.from(part.inlineData.data, 'base64');
            return buffer;
        }
    }

    throw new Error('[IMAGEN] No image data in response. The model may have refused the prompt or returned text only.');
}
