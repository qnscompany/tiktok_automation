import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { generateBackground } from '@/lib/backgroundGenerator';
import { logJob, logError } from '@/lib/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/jobs/gen-bg
 * 특정 씬의 배경 이미지를 Imagen으로 생성하고 Storage에 업로드합니다.
 * jobs/run에서 개별 씬마다 순차적으로 호출합니다.
 *
 * Body: { jobId, scene: { index, onScreenText, narrationText, duration_sec }, topic }
 */
export async function POST(request: Request) {
    let jobId = 'unknown';
    try {
        const body = await request.json();
        const { scene, topic } = body;
        jobId = body.jobId;

        if (!jobId || !scene || !topic) {
            return NextResponse.json({ error: 'jobId, scene, topic are required' }, { status: 400 });
        }

        const { client: supabase, error: configError } = getSupabaseAdmin();
        if (configError || !supabase) {
            return NextResponse.json({ error: 'Supabase config error', details: configError }, { status: 500 });
        }

        logJob(jobId, 'RUNNING', `gen-bg called for scene ${scene.index}`);
        const result = await generateBackground(supabase, jobId, scene, topic);

        if (!result) {
            // 대상 인덱스가 아니거나 생성 실패 (폴백)
            return NextResponse.json({ ok: true, result: null });
        }

        return NextResponse.json({ ok: true, result });
    } catch (err: any) {
        logError(`gen-bg failed for job ${jobId}`, err);
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}
