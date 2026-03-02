import { NextResponse } from 'next/server';
import { generateTikTokScript, getGeminiClient } from '@/lib/gemini';
import { logApi, logError } from '@/lib/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/generate/script
 * 주제를 입력받아 바로 스크립트를 생성해 반환합니다 (DB 저장 없음).
 */
export async function POST(request: Request) {
    const requestId = `gen_${Date.now()}`;

    // 1. 초기화 및 환경 변수 체크 (핸들러 내부 수행)
    const { error: geminiError } = getGeminiClient();
    if (geminiError) {
        return NextResponse.json({
            error: 'Configuration Error',
            details: geminiError,
            requestId
        }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { topic, tone, audience } = body;

        if (!topic) {
            return NextResponse.json({ error: 'Topic is required', requestId }, { status: 400 });
        }

        logApi(requestId, '/api/generate/script', 'INFO', 'Script generation started', { topic });

        try {
            const script = await generateTikTokScript(topic, tone, audience);
            logApi(requestId, '/api/generate/script', 'SUCCESS', 'Script generated successfully');
            return NextResponse.json({ ...script, requestId });
        } catch (error: any) {
            logError('Gemini execution failed', error, { requestId, topic });
            return NextResponse.json({
                error: 'Generation failed',
                details: error.message,
                requestId
            }, { status: 500 });
        }

    } catch (e: any) {
        return NextResponse.json({ error: 'Invalid JSON body or request format', details: e.message, requestId }, { status: 400 });
    }
}
