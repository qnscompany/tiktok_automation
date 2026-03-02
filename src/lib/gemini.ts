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
Generate a high-impact 15-second TikTok video script.
Topic: ${topic}
${tone ? `Tone: ${tone}` : ''}
${audience ? `Target Audience: ${audience}` : ''}

You must strictly follow the JSON schema below. Output ONLY the JSON without any comments or explanations.

Schema:
{
  "durationSec": 15,
  "scenes": [
    {
      "index": 1,
      "seconds": 3,
      "onScreenText": "Short text to display on screen",
      "narrationText": "Voiceover narration",
      "imagePrompt": "English prompt for AI image/video generation matching this scene"
    }
    // ... Exactly 5 scenes indexed 1 to 5
  ],
  "caption": "Video caption",
  "hashtags": ["Exactly 5 to 10 relevant hashtags"]
}

Constraints:
1. All text (onScreenText, narrationText, caption) must be in English.
2. Do not include exaggeration, false information, medical or financial advice.
3. There must be exactly 5 scenes, each with a duration of 3 seconds.
4. Output must be valid JSON format.
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  // JSON 파싱 및 검증
  const json = JSON.parse(text);
  return TikTokScriptSchema.parse(json);
}
