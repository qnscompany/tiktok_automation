import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    const { client: supabase } = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: 'Supabase init failed' }, { status: 500 });

    try {
        // Delete in order of foreign key dependencies
        const { error: logErr } = await supabase.from('logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        const { error: assetErr } = await supabase.from('assets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        const { error: jobErr } = await supabase.from('jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        if (logErr || assetErr || jobErr) {
            return NextResponse.json({
                ok: false,
                errors: { logErr, assetErr, jobErr }
            }, { status: 500 });
        }

        return NextResponse.json({ ok: true, message: 'All jobs, assets, and logs have been cleared.' });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
