-- 1. UUID 생성을 위한 pgcrypto 확장 활성화
create extension if not exists pgcrypto;

-- 2. jobs 테이블 생성
create table if not exists public.jobs (
    id uuid primary key default gen_random_uuid(),
    status text not null check (status in ('pending', 'running', 'done', 'failed')) default 'pending',
    topic text not null,
    tone text,
    audience text,
    duration_sec int not null default 15,
    prompt_version text not null default 'v1',
    error text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. assets 테이블 생성
create table if not exists public.assets (
    id uuid primary key default gen_random_uuid(),
    job_id uuid not null references public.jobs(id) on delete cascade,
    type text not null check (type in ('script_json')),
    content_json jsonb not null,
    created_at timestamptz not null default now()
);

-- 4. 업데이트 시간 자동화 트리거 (옵션)
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger set_updated_at
before update on public.jobs
for each row
execute function public.handle_updated_at();

-- RLS (Row Level Security) 설정 - 초기 단계이므로 비활성화하거나 전체 허용 (필요에 따라 설정)
alter table public.jobs enable row level security;
alter table public.assets enable row level security;

-- Admin 전용 접근 권한 설정 (여기서는 단순화를 위해 익명 접근은 제한)
create policy "Allow all for authenticated users" on public.jobs for all to authenticated using (true);
create policy "Allow all for authenticated users" on public.assets for all to authenticated using (true);
