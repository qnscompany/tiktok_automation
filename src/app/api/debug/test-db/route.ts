import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    const { client: supabase } = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: 'Supabase null' }, { status: 500 });

    try {
        // 더미 데이터 삽입 시도 (타입 체크 확인용)
        const { error } = await supabase
            .from('assets')
            .insert([{
                job_id: '00000000-0000-0000-0000-000000000000', // 더미 ID
                type: 'audio_narration',
                content_json: { test: true }
            }]);

        if (error) {
            return NextResponse.json({
                error: error.message,
                code: error.code,
                hint: error.hint
            }, { status: 400 });
        }

        return NextResponse.json({ ok: true, message: 'Insert successful' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
