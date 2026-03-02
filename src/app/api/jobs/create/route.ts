import { NextResponse } from 'next/server';
import { supabaseAdmin, checkSupabaseConfig } from '@/lib/supabaseAdmin';
import { logJob } from '@/lib/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/jobs/create
 * Supabase DB에 job 레코드 생성
 */
export async function POST(request: Request) {
    const requestId = `req_${Date.now()}`;

    // Supabase 설정 체크
    const config = checkSupabaseConfig();
    if (!config.valid) {
        return NextResponse.json({
            error: 'Database configuration error',
            details: config.error,
            requestId
        }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { topic, tone, audience, durationSec = 15 } = body;

        if (!topic) {
            return NextResponse.json({ error: 'Topic is required', requestId }, { status: 400 });
        }

        // Supabase에 Insert
        const { data, error } = await supabaseAdmin!
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
