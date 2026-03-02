import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { generateTikTokScript, getGeminiClient } from '@/lib/gemini';
import { logJob, logError } from '@/lib/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/jobs/run
 * Vercel Cron이 호출하는 엔드포인트
 */
export async function GET(request: Request) {
    const requestId = `run_${Date.now()}`;

    // 1. 초기화 및 환경 변수 체크 (핸들러 내부에서 수행)
    const { client: supabase, error: dbError } = getSupabaseAdmin();
    const { error: geminiError } = getGeminiClient(); // 존재 여부만 체크
    const cronSecret = process.env.CRON_SECRET;

    if (dbError || !supabase || geminiError || !cronSecret) {
        const details = [dbError, geminiError, !cronSecret ? 'Missing CRON_SECRET' : null].filter(Boolean).join(', ');
        return NextResponse.json({
            error: 'Configuration Error',
            details,
            requestId
        }, { status: 500 });
    }

    // 2. 인증 체크
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized', requestId }, { status: 401 });
    }

    try {
        // 3. 대기 중인 작업 조회 (1개만)
        const { data: job, error: fetchError } = await supabase
            .from('jobs')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (fetchError) {
            logError('Job fetch failed', fetchError);
            return NextResponse.json({ error: 'Failed to fetch job', details: fetchError.message, requestId }, { status: 500 });
        }

        if (!job) {
            return NextResponse.json({ message: 'No pending jobs', requestId });
        }

        const jobId = job.id;
        logJob(jobId, 'RUNNING', 'Job started', { topic: job.topic });

        // 4. 작업 상태 업데이트 (running)
        const { error: updateError } = await supabase
            .from('jobs')
            .update({ status: 'running' })
            .eq('id', jobId);

        if (updateError) {
            logError('Job status update failed', updateError);
            return NextResponse.json({ error: 'Failed to update job status', details: updateError.message, requestId }, { status: 500 });
        }

        // 5. 스크립트 생성 (Gemini)
        try {
            const script = await generateTikTokScript(job.topic, job.tone, job.audience);

            // 6. 결과 저장 (assets 테이블)
            const { error: assetError } = await supabase
                .from('assets')
                .insert([{
                    job_id: jobId,
                    type: 'script_json',
                    content_json: script
                }]);

            if (assetError) throw assetError;

            // 7. 작업 완료 처리
            await supabase
                .from('jobs')
                .update({ status: 'done' })
                .eq('id', jobId);

            logJob(jobId, 'DONE', 'Job completed');
            return NextResponse.json({ ok: true, jobId, requestId });

        } catch (error: any) {
            // 실패 처리
            logError(`Job ${jobId} failed execution`, error);
            await supabase
                .from('jobs')
                .update({ status: 'failed', error: error.message })
                .eq('id', jobId);

            return NextResponse.json({ error: 'Job execution failed', details: error.message, requestId }, { status: 500 });
        }

    } catch (error: any) {
        logError('Unexpected error in /api/jobs/run', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message, requestId }, { status: 500 });
    }
}
