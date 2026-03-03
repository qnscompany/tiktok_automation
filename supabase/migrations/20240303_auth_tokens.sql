-- TikTok 인증 토큰 테이블 생성
CREATE TABLE IF NOT EXISTS auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL, -- 단순화를 위해 'default_user' 등으로 관리 가능
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ NOT NULL,
    open_id TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 비활성화 (관리용이성)
ALTER TABLE auth_tokens DISABLE ROW LEVEL SECURITY;
