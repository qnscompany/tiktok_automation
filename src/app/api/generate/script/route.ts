import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TikTokScriptSchema, GenerateScriptRequest } from '@/lib/schema';
import { logApi, logError } from '@/lib/log';

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-flash-latest';

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

async function generateWithGemini(topic: string, tone?: string, audience?: string) {
    if (!genAI) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: {
            responseMimeType: "application/json",
        }
    });

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

export async function POST(request: Request) {
    const requestId = `req_${Date.now()}`;
    let body: GenerateScriptRequest;

    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON body', requestId }, { status: 400 });
    }

    const { topic, tone, audience } = body;

    if (!topic) {
        return NextResponse.json({ error: 'Topic is required', requestId }, { status: 400 });
    }

    logApi(requestId, '/api/generate/script', 'SUCCESS', 'Request received', { topic, model: MODEL_NAME });

    try {
        let script;
        try {
            // 1차 시도
            script = await generateWithGemini(topic, tone, audience);
        } catch (error) {
            logApi(requestId, '/api/generate/script', 'RETRY', 'First attempt failed, retrying...', { error });
            // 2차 시도 (재시도)
            script = await generateWithGemini(topic, tone, audience);
        }

        logApi(requestId, '/api/generate/script', 'SUCCESS', 'Script generated successfully');
        return NextResponse.json({ ...script, requestId });

    } catch (error: any) {
        logError('Failed to generate script after retries', error, { requestId, topic });

        let errorMessage = 'Failed to generate script';
        if (error.message.includes('GEMINI_API_KEY')) {
            errorMessage = 'Gemini API Key is missing. Please check .env.local';
        } else if (error instanceof SyntaxError) {
            errorMessage = 'AI returned invalid JSON format';
        } else if (error.name === 'ZodError') {
            errorMessage = 'AI returned JSON that does not match the required schema';
        }

        return NextResponse.json({
            error: errorMessage,
            details: error.message,
            requestId
        }, { status: 500 });
    }
}
