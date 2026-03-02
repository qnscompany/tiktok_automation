import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { generateBackground } from '@/lib/backgroundGenerator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const TEST_JOB_ID = 'debug-test-000';
const TEST_SCENE = {
    index: 1,
    onScreenText: 'Opening Scene',
    narrationText: 'This is a test narration.',
    duration_sec: 3,
};

/**
 * GET /api/debug/test-full-bg
 * generateBackground() 전체 파이프라인 테스트
 * (Imagen + Supabase Storage 업로드 + assets 기록 포함)
 */
export async function GET() {
    const steps: string[] = [];

    const { client: supabase, error: configError } = getSupabaseAdmin();
    if (configError || !supabase) {
        return NextResponse.json({ error: 'Supabase config error', details: configError }, { status: 500 });
    }

    steps.push('1. Supabase client initialized');

    try {
        steps.push('2. Calling generateBackground() for scene 1...');
        const result = await generateBackground(supabase, TEST_JOB_ID, TEST_SCENE as any, 'Test Topic');
        steps.push(`3. Result: ${JSON.stringify(result)}`);

        return NextResponse.json({ ok: true, steps, result });
    } catch (err: any) {
        steps.push(`ERROR: ${err.message}`);
        return NextResponse.json({ ok: false, steps, error: err.message }, { status: 200 });
    }
}
