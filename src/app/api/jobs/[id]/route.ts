import { NextResponse } from 'next/server';
import { supabaseAdmin, checkSupabaseConfig } from '@/lib/supabaseAdmin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/jobs/[id]
 * 특정 작업의 상태와 생성된 결과를 조회합니다.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const requestId = `status_${Date.now()}`;

    const config = checkSupabaseConfig();
    if (!config.valid) {
        return NextResponse.json({ error: 'Config error', details: config.error, requestId }, { status: 500 });
    }

    try {
        // 작업 정보와 연관된 자산(assets)을 함께 가져옴
        const { data: job, error: jobError } = await supabaseAdmin!
            .from('jobs')
            .select('*, assets(*)')
            .eq('id', id)
            .single();

        if (jobError || !job) {
            return NextResponse.json({ error: 'Job not found', requestId }, { status: 404 });
        }

        return NextResponse.json({ ...job, requestId });
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal server error', details: error.message, requestId }, { status: 500 });
    }
}
