import { NextResponse } from 'next/server';
import { generateImagenPng } from '@/lib/imagen';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/debug/test-imagen
 * Imagen API 직접 테스트용 — 짧은 프롬프트로 이미지 생성 시도
 */
export async function GET() {
    try {
        const buf = await generateImagenPng({
            prompt: 'A simple purple abstract background with neon grid lines, vertical 9:16 format, no text.',
        });
        return new Response(new Uint8Array(buf), {
            status: 200,
            headers: { 'Content-Type': 'image/png' },
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
