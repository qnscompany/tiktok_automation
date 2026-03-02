import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Supabase Admin 클라이언트
 * 
 * IMPORTANT: 반드시 서버 사이드(API Route, Server Actions)에서만 사용해야 합니다.
 * 서비스 롤 키(SERVICE_ROLE_KEY)는 브라우저에 노출되면 보안상 매우 위험합니다.
 */
export const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

/**
 * Supabase 설정 여부를 체크하고 에러 메시지를 반환하는 헬퍼
 */
export function checkSupabaseConfig() {
    if (!supabaseUrl || !supabaseServiceKey) {
        return {
            valid: false,
            error: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in environment variables.'
        };
    }
    if (!supabaseAdmin) {
        return {
            valid: false,
            error: 'Failed to initialize Supabase Admin client.'
        };
    }
    return { valid: true };
}
