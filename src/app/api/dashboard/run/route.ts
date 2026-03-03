import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/dashboard/run
 * 대시보드에서 수동으로 파이프라인을 실행하는 프록시 엔드포인트
 * 서버 사이드에서 CRON_SECRET을 자동으로 주입합니다.
 */
export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }

    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    const res = await fetch(`${baseUrl}/api/jobs/run`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${cronSecret}`,
        },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
