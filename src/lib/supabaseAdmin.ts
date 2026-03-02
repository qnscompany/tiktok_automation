import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    return {
        valid: !!(supabaseUrl && supabaseServiceKey),
        error: !(supabaseUrl && supabaseServiceKey) ? 'Missing environment variables' : null
    };
}
