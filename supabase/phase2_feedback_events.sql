-- Northcue Phase 2 feedback fields
-- Privacy rule: do not store raw documents, OCR text, full document text,
-- uploaded files, names, addresses, account numbers, reference numbers,
-- or payment details.

alter table public.feedback_events
  add column if not exists note text,
  add column if not exists page text,
  add column if not exists section text,
  add column if not exists anonymous_session_id text;

create index if not exists idx_feedback_events_anonymous_session_id
  on public.feedback_events(anonymous_session_id);
