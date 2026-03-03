import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    const { client: supabase } = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: 'Supabase init failed' }, { status: 500 });

    const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    return NextResponse.json({ jobs, error });
}
