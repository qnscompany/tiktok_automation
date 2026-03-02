import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/debug/job-assets?jobId=xxx
 * 특정 Job의 모든 assets 목록을 JSON으로 반환합니다 (슬라이드 URL 확인용).
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
        return NextResponse.json({ error: 'jobId query parameter is required' }, { status: 400 });
    }

    // 초기화 (핸들러 내부에서 수행)
    const { client: supabase, error: configError } = getSupabaseAdmin();
    if (configError || !supabase) {
        return NextResponse.json({
            error: 'Configuration Error',
            details: configError
        }, { status: 500 });
    }

    try {
        // Job 정보 조회
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select('id, status, topic, created_at')
            .eq('id', jobId)
            .maybeSingle();

        if (jobError || !job) {
            return NextResponse.json({ error: 'Job not found', jobId }, { status: 404 });
        }

        // Assets 조회
        const { data: assets, error: assetsError } = await supabase
            .from('assets')
            .select('*')
            .eq('job_id', jobId)
            .order('created_at', { ascending: true });

        if (assetsError) {
            return NextResponse.json({ error: 'Failed to fetch assets', details: assetsError.message }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            job,
            assets: assets || [],
            summary: {
                totalAssets: assets?.length || 0,
                scriptJson: assets?.filter(a => a.type === 'script_json').length || 0,
                slideImages: assets?.filter(a => a.type === 'slide_image').length || 0
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
