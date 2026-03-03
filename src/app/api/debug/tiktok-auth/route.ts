import { NextResponse } from 'next/server';
import { getTikTokAuthUrl } from '@/lib/tiktok';

export const dynamic = 'force-dynamic';

export async function GET() {
    const authUrl = getTikTokAuthUrl();
    const envRedirectUri = process.env.TIKTOK_REDIRECT_URI;

    return NextResponse.json({
        generatedAuthUrl: authUrl,
        envRedirectUri: envRedirectUri,
        clientKey: process.env.TIKTOK_CLIENT_KEY ? 'Present' : 'Missing',
        clientSecret: process.env.TIKTOK_CLIENT_SECRET ? 'Present' : 'Missing'
    });
}
