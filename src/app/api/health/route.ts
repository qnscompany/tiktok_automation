// Redeploy trigger: 2026-03-02 15:52
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/health
 * 라우팅 인식 테스트용 엔드포인트
 */
export async function GET() {
    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
}
