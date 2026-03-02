import { GoogleGenerativeAI } from '@google/generative-ai';
import { TikTokScriptSchema } from './schema';

/**
 * Gemini 클라이언트를 안전하게 생성하여 반환합니다.
 * 핸들러 외부(모듈 스코프)에서 throw가 발생하지 않도록 보호합니다.
 */
export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { client: null, error: 'Missing GEMINI_API_KEY' };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
    return { client: model, error: null };
  } catch (e: any) {
    return { client: null, error: `Failed to initialize Gemini: ${e.message}` };
  }
}

/**
 * Gemini를 사용하여 틱톡 스크립트를 생성합니다.
 */
export async function generateTikTokScript(topic: string, tone?: string, audience?: string) {
  const { client: model, error } = getGeminiClient();
  if (error || !model) {
    throw new Error(error || 'Gemini client is not configured');
  }

  const prompt = `
틱톡용 15초 분량의 짧고 강렬한 영상 스크립트를 생성해줘.
주제: ${topic}
${tone ? `톤: ${tone}` : ''}
${audience ? `대상: ${audience}` : ''}

반드시 아래의 JSON 스키마를 엄격히 따라야 해. 주석이나 설명 없이 오직 JSON만 출력해.

스키마:
{
  "durationSec": 15,
  "scenes": [
    {
      "index": 1,
      "seconds": 3,
      "onScreenText": "화면에 보일 짧은 텍스트",
      "narrationText": "나레이션 대사",
      "imagePrompt": "이 장면에 어울리는 이미지/영상 생성을 위한 영문 프롬프트"
    }
    // ... 총 5개의 scene을 index 1부터 5까지 작성
  ],
  "caption": "영상 캡션",
  "hashtags": ["정확히 5~10개 사이의 해시태그"]
}

제약 사항:
1. 모든 텍스트(onScreenText, narrationText, caption)는 한국어로 작성해.
2. 과장, 허위 정보, 의학적/투자 조언은 절대 포함하지 마.
3. scenes는 정확히 5개여야 하며, 각 scene의 seconds는 3이야.
4. 출력은 반드시 유효한 JSON 형식이어야 해.
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  // JSON 파싱 및 검증
  const json = JSON.parse(text);
  return TikTokScriptSchema.parse(json);
}
