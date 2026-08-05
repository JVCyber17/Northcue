-- Phase 9: record WHICH guard rejected an AI result, not merely that one did.
--
-- WHY. ai_error_code stores "sanitizer_rejected" and nothing more, so a
-- production failure can never be traced to the guard that caused it. On
-- 4 August 2026 the same 702KB communal bill was rejected twice, at 24.4s and
-- 22.2s, and the guard could not be named from this table. Every route to
-- naming it was blocked: the synthetic corpus does not reproduce it, and the
-- document itself carries personal data.
--
-- WHAT IS STORED. Guard names only. cleanValidationErrors in
-- src/services/documentSessionService.js replaces every amount, date, number
-- run and reference with a placeholder before the value reaches this column,
-- and caps the result at 500 characters. A validator message can quote a value
-- out of the reader's document, and this table holds safe metadata only.
--
-- Nullable, with no default, so every existing row stays untouched and any
-- deploy ordering works: the column may exist before the code writes it, or
-- the code may run before the column exists, and neither breaks a session.
alter table public.document_sessions
  add column if not exists ai_validation_errors text;

comment on column public.document_sessions.ai_validation_errors is
  'Guard names from a rejected AI result, values redacted. Diagnostic only.';
