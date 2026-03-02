import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/debug/env
 * 환경 변수 설정 상태를 안전하게 확인합니다 (존재 여부만).
 * 이 엔드포인트는 어떠한 경우에도 200 OK를 반환해야 합니다 (throw 금지).
 */
export async function GET() {
    try {
        const envStatus = {
            hasCRON_SECRET: !!process.env.CRON_SECRET,
            hasSUPABASE_URL: !!process.env.SUPABASE_URL,
            hasSUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            hasGEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
            hasGEMINI_MODEL: !!process.env.GEMINI_MODEL,
            NODE_ENV: process.env.NODE_ENV,
            VERCEL_ENV: process.env.VERCEL_ENV || 'local'
        };

        return NextResponse.json({
            ok: true,
            status: 'Diagnostic info retrieved',
            env: envStatus,
            timestamp: new Date().toISOString()
        });
    } catch (e: any) {
        // 절대 throw 하지 않음
        return NextResponse.json({
            ok: false,
            error: 'Failed to retrieve env status',
            details: e.message
        }, { status: 200 }); // 에러 상황에서도 200으로 응답하여 라우팅 가능 여부 확인
    }
}
