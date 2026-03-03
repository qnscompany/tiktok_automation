import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    const { client: supabase } = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: 'Supabase init failed' }, { status: 500 });

    try {
        let query = supabase.from('logs').select('*').order('created_at', { ascending: false }).limit(50);
        if (jobId) {
            query = query.eq('job_id', jobId);
        }

        const { data: logs, error } = await query;
        if (error) throw error;

        return NextResponse.json({ ok: true, logs: logs || [] });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
