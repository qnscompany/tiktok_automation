import { NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/tiktok';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');

    if (error) {
        return NextResponse.json({ error, description: error_description }, { status: 400 });
    }

    if (!code) {
        return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
    }

    try {
        // 1. 코드를 토큰으로 교환
        const tokens = await exchangeCodeForToken(code);

        // 2. Supabase에 저장
        const { client: supabase } = getSupabaseAdmin();
        if (!supabase) throw new Error('Supabase client initialization failed');

        const { error: dbError } = await supabase
            .from('auth_tokens')
            .upsert({
                user_id: 'default_user', // MVP에서는 단일 유저로 가정
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                open_id: tokens.open_id,
                expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                refresh_expires_at: new Date(Date.now() + tokens.refresh_expires_in * 1000).toISOString(),
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

        if (dbError) throw dbError;

        return NextResponse.json({
            message: 'TikTok Authorization Successful!',
            open_id: tokens.open_id
        });

    } catch (err: any) {
        console.error('TikTok Auth Callback Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
