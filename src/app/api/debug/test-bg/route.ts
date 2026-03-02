import { NextResponse } from 'next/server';
import { generateImagenPng } from '@/lib/imagen';
import { buildCyberpunkBgPrompt } from '@/lib/backgroundPrompt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/debug/test-bg
 * backgroundGenerator의 로직만 테스트 (Supabase 없이)
 * 에러 메시지를 JSON으로 반환하여 문제 진단
 */
export async function GET() {
    const steps: string[] = [];

    try {
        steps.push('1. Build prompt');
        const prompt = buildCyberpunkBgPrompt({
            topic: 'Test Topic',
            sceneText: 'Opening Scene',
        });
        steps.push(`2. Prompt built: ${prompt.slice(0, 80)}...`);

        steps.push('3. Calling generateImagenPng...');
        const buf = await generateImagenPng({ prompt });
        steps.push(`4. Success! Buffer size: ${buf.length} bytes`);

        return NextResponse.json({
            ok: true,
            steps,
            bufferSize: buf.length,
        });
    } catch (err: any) {
        steps.push(`ERROR: ${err.message}`);
        return NextResponse.json({
            ok: false,
            steps,
            error: err.message,
        }, { status: 200 }); // 200으로 반환하여 에러 내용 확인
    }
}
