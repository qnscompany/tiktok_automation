import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { logJob } from '@/lib/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/jobs/create
 * Supabase DB에 job 레코드 생성
 */
export async function POST(request: Request) {
    const requestId = `create_${Date.now()}`;

    // 1. 초기화 및 환경 변수 체크 (핸들러 내부에서 수행)
    const { client: supabase, error: configError } = getSupabaseAdmin();
    if (configError || !supabase) {
        return NextResponse.json({
            error: 'Configuration Error',
            details: configError,
            requestId
        }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { topic, tone, audience, durationSec = 15 } = body;

        if (!topic) {
            return NextResponse.json({ error: 'Topic is required', requestId }, { status: 400 });
        }

        // 2. 데이터베이스 저장
        const { data, error } = await supabase
            .from('jobs')
            .insert([
                {
                    topic,
                    tone,
                    audience,
                    duration_sec: durationSec,
                    status: 'pending'
                }
            ])
            .select()
            .single();

        if (error) {
            throw error;
        }

        logJob(data.id, 'START', 'Job created in Supabase', { topic });

        return NextResponse.json({ ...data, requestId });
    } catch (error: any) {
        console.error('!! JOBCREATE_ERROR !!', error);
        return NextResponse.json({
            error: 'Failed to create job',
            details: error.message,
            requestId
        }, { status: 500 });
    }
}
