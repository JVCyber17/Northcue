-- Northcue Phase 3.5 anonymous session linking
-- Privacy rule: this stores only a backend-generated anonymous journey id.
-- Do not store raw documents, OCR text, full document text, names, addresses,
-- account numbers, reference numbers, payment details, or uploaded files.

alter table public.document_sessions
  add column if not exists anonymous_session_id text;

alter table public.analytics_events
  add column if not exists anonymous_session_id text;

-- feedback_events already received this field in Phase 2, but keep this
-- idempotent line so new environments can run this migration safely.
alter table public.feedback_events
  add column if not exists anonymous_session_id text;

create index if not exists idx_document_sessions_anonymous_session_id
  on public.document_sessions(anonymous_session_id);

create index if not exists idx_feedback_events_anonymous_session_id
  on public.feedback_events(anonymous_session_id);

create index if not exists idx_analytics_events_anonymous_session_id
  on public.analytics_events(anonymous_session_id);
