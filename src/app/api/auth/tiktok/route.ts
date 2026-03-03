import { NextResponse } from 'next/server';
import { getTikTokAuthUrl } from '@/lib/tiktok';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const authUrl = getTikTokAuthUrl();
        return NextResponse.redirect(authUrl);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
