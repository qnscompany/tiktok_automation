import { SupabaseClient } from '@supabase/supabase-js';

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;

export interface TikTokTokenResponse {
    access_token: string;
    expires_in: number;
    open_id: string;
    refresh_expires_in: number;
    refresh_token: string;
    scope: string;
    token_type: string;
}

/**
 * 틱톡 OAuth2 인증 URL 생성
 */
export function getTikTokAuthUrl(state: string = 'static_state') {
    const scopes = [
        'video.upload',
        'video.publish',
        'user.info.basic',
    ].join(',');

    const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
    url.searchParams.append('client_key', CLIENT_KEY!);
    url.searchParams.append('scope', scopes);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('redirect_uri', REDIRECT_URI!);
    url.searchParams.append('state', state);

    return url.toString();
}

/**
 * 인증 코드를 토큰으로 교환
 */
export async function exchangeCodeForToken(code: string): Promise<TikTokTokenResponse> {
    const params = new URLSearchParams();
    params.append('client_key', CLIENT_KEY!);
    params.append('client_secret', CLIENT_SECRET!);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', REDIRECT_URI!);

    const response = await fetch(`${TIKTOK_API_BASE}/auth/token/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`TikTok Token Exchange Failed: ${JSON.stringify(data)}`);
    }

    return data as TikTokTokenResponse;
}

/**
 * 리프레시 토큰으로 토큰 갱신
 */
export async function refreshTikTokToken(refreshToken: string): Promise<TikTokTokenResponse> {
    const params = new URLSearchParams();
    params.append('client_key', CLIENT_KEY!);
    params.append('client_secret', CLIENT_SECRET!);
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    const response = await fetch(`${TIKTOK_API_BASE}/auth/token/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`TikTok Token Refresh Failed: ${JSON.stringify(data)}`);
    }

    return data as TikTokTokenResponse;
}

/**
 * 유효한 토큰 가져오기 (만료 시 자동 갱신)
 */
export async function getValidTikTokToken(supabase: SupabaseClient, userId: string = 'default_user') {
    const { data: tokenData, error } = await supabase
        .from('auth_tokens')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !tokenData) {
        throw new Error('No TikTok tokens found. Please authorize first.');
    }

    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    // 만료 5분 전이면 갱신
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
        console.log('Refreshing TikTok token...');
        const newTokens = await refreshTikTokToken(tokenData.refresh_token);

        const updatedData = {
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token,
            expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
            refresh_expires_at: new Date(Date.now() + newTokens.refresh_expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString(),
        };

        await supabase
            .from('auth_tokens')
            .update(updatedData)
            .eq('user_id', userId);

        return newTokens.access_token;
    }

    return tokenData.access_token;
}

/**
 * 틱톡에 영상 게시 (Content Posting API)
 * https://developers.tiktok.com/doc/content-posting-api-reference-publish-video
 */
export async function publishVideoToTikTok(
    accessToken: string,
    videoUrl: string,
    title: string,
    description: string
) {
    console.log(`Publishing video to TikTok: ${title}`);

    // 1. Initialize Upload
    const initResponse = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            post_info: {
                title: title,
                description: description,
                privacy_level: 'PUBLIC_TO_EVERYONE',
            },
            source_info: {
                source: 'PULL_FROM_URL',
                video_url: videoUrl,
            },
        }),
    });

    const initData = await initResponse.json();
    if (!initResponse.ok) {
        throw new Error(`TikTok Video Init Failed: ${JSON.stringify(initData)}`);
    }

    console.log('TikTok Video Publication initialized:', initData.data.publish_id);
    return initData.data.publish_id;
}
