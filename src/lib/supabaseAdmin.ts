import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Supabase Admin 클라이언트를 안전하게 생성하여 반환합니다.
 * 모듈 스코프에서 즉시 실행되지 않도록 함수로 래핑합니다.
 */
export function getSupabaseAdmin() {
    if (!supabaseUrl || !supabaseServiceKey) {
        return {
            client: null,
            error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
        };
    }

    try {
        const client = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        return { client, error: null };
    } catch (e: any) {
        return { client: null, error: `Failed to initialize Supabase Admin: ${e.message}` };
    }
}

/**
 * 환경 변수 체크 유틸리티
 */
export function checkSupabaseConfig() {
    return {
        valid: !!(supabaseUrl && supabaseServiceKey),
        error: !(supabaseUrl && supabaseServiceKey) ? 'Missing environment variables' : null
    };
}
