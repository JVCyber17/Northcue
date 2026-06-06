-- Northcue Phase 1 Supabase foundation
-- Privacy rule: do not store raw files, OCR text, full document text,
-- names, addresses, account numbers, or reference numbers in these tables.

create extension if not exists pgcrypto;

create table if not exists public.document_sessions (
  id uuid primary key default gen_random_uuid(),
  client_job_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz,
  expires_at timestamptz,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'analysed', 'failed', 'expired')),
  input_quality text
    check (input_quality in ('good', 'borderline', 'poor')),
  document_category text,
  document_type text,
  trust_assessment text
    check (trust_assessment in ('high', 'medium', 'low', 'unknown')),
  severity_level text
    check (severity_level in ('low', 'medium', 'high', 'urgent')),
  processing_mode text
    check (processing_mode in ('normal', 'caution', 'verification_only', 'unsupported')),
  confidence text
    check (confidence in ('high', 'medium', 'low')),
  needs_human_review boolean not null default false,
  banner_type text
    check (banner_type in ('safe', 'caution', 'warning', 'urgent')),
  cards_count integer not null default 0 check (cards_count between 0 and 6),
  source_mime_type text,
  source_size_bytes integer check (source_size_bytes is null or source_size_bytes >= 0),
  error_code text
);

create table if not exists public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  document_session_id uuid references public.document_sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  rating text not null check (rating in ('yes', 'little', 'no')),
  reasons text[] not null default '{}',
  has_comment boolean not null default false,
  comment_length integer not null default 0 check (comment_length >= 0),
  contact_requested boolean not null default false,
  document_category text,
  trust_assessment text
    check (trust_assessment in ('high', 'medium', 'low', 'unknown')),
  severity_level text
    check (severity_level in ('low', 'medium', 'high', 'urgent'))
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  document_session_id uuid references public.document_sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  event_name text not null,
  page text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_document_sessions_created_at
  on public.document_sessions(created_at desc);

create index if not exists idx_document_sessions_client_job_id
  on public.document_sessions(client_job_id);

create index if not exists idx_feedback_events_created_at
  on public.feedback_events(created_at desc);

create index if not exists idx_analytics_events_created_at
  on public.analytics_events(created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_document_sessions_updated_at on public.document_sessions;
create trigger set_document_sessions_updated_at
before update on public.document_sessions
for each row
execute function public.set_updated_at();

alter table public.document_sessions enable row level security;
alter table public.feedback_events enable row level security;
alter table public.analytics_events enable row level security;

-- No anon/auth policies are created in Phase 1.
-- These tables are intended for backend-only writes with the service-role key.
