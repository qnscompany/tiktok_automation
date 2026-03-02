import { NextResponse } from 'next/server';
import { generateTikTokScript } from '@/lib/gemini';
import { GenerateScriptRequest } from '@/lib/schema';
import { logApi, logError } from '@/lib/log';

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

    logApi(requestId, '/api/generate/script', 'SUCCESS', 'Request received', { topic });

    try {
        let script;
        try {
            // 1차 시도
            script = await generateTikTokScript(topic, tone, audience);
        } catch (error) {
            logApi(requestId, '/api/generate/script', 'RETRY', 'First attempt failed, retrying...', { error });
            // 2차 시도 (재시도)
            script = await generateTikTokScript(topic, tone, audience);
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
