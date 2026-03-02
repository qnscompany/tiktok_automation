import { NextResponse } from 'next/server';
import { supabaseAdmin, checkSupabaseConfig } from '@/lib/supabaseAdmin';
import { generateTikTokScript } from '@/lib/gemini';
import { logJob, logError } from '@/lib/log';

// Vercel Cron을 위한 dynamic 설정 (정적 생성 방지)
export const dynamic = 'force-dynamic';

/**
 * GET /api/jobs/run
 * 대기 중인 작업을 하나 가져와서 처리합니다.
 */
export async function GET(request: Request) {
    const requestId = `run_${Date.now()}`;
    const authHeader = request.headers.get('Authorization');

    // 1. CRON_SECRET 보안 검사
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized', requestId }, { status: 401 });
    }

    // 2. Supabase 설정 체크
    const config = checkSupabaseConfig();
    if (!config.valid) {
        return NextResponse.json({ error: 'Database configuration error', details: config.error, requestId }, { status: 500 });
    }

    try {
        // 3. pending 상태인 작업을 하나 찾아서 running으로 업데이트 (동시성 보장)
        // RPC를 사용하지 않고 단순 쿼리로 구현할 경우 최신 1개를 가져옵니다.
        const { data: job, error: fetchError } = await supabaseAdmin!
            .from('jobs')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

        if (fetchError || !job) {
            return NextResponse.json({ ok: true, message: 'No pending jobs found', requestId });
        }

        // 4. 즉시 running으로 상태 변경
        const { error: updateError } = await supabaseAdmin!
            .from('jobs')
            .update({ status: 'running' })
            .eq('id', job.id);

        if (updateError) throw updateError;

        logJob(job.id, 'RUNNING', 'Starting script generation');

        try {
            // 5. Gemini 스크립트 생성
            const script = await generateTikTokScript(job.topic, job.tone, job.audience);

            // 6. assets 테이블에 결과 저장
            const { data: asset, error: assetError } = await supabaseAdmin!
                .from('assets')
                .insert([
                    {
                        job_id: job.id,
                        type: 'script_json',
                        content_json: script
                    }
                ])
                .select()
                .single();

            if (assetError) throw assetError;

            // 7. 작업 완료 처리
            await supabaseAdmin!
                .from('jobs')
                .update({ status: 'done' })
                .eq('id', job.id);

            logJob(job.id, 'DONE', 'Job completed successfully');

            return NextResponse.json({
                ok: true,
                jobId: job.id,
                assetId: asset.id,
                requestId
            });

        } catch (genError: any) {
            logError(`Job failed during execution: ${job.id}`, genError);

            // 실패 시 상태 업데이트
            await supabaseAdmin!
                .from('jobs')
                .update({
                    status: 'failed',
                    error: genError.message
                })
                .eq('id', job.id);

            return NextResponse.json({
                error: 'Job failed during execution',
                details: genError.message,
                jobId: job.id,
                requestId
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('!! JOBRUN_ERROR !!', error);
        return NextResponse.json({
            error: 'Critical error in job runner',
            details: error.message,
            requestId
        }, { status: 500 });
    }
}
