-- Phase 7: per-language completion monitoring for the language launch.
--
-- One nullable text column, the ai_validation_errors precedent: written
-- where ai_status already is, value-free by construction because the
-- service only stores a code the i18n config lists (cleanLanguageCode in
-- documentSessionService.js). This is what lets the daily production check
-- watch completion per language from launch minute one.
--
-- Apply BEFORE the launch deploy. The service tolerates the column being
-- absent (it retries the write without the field and warns), so ordering
-- cannot cost a session either way, but monitoring only starts when this
-- is live.

alter table document_sessions
  add column if not exists language text;

comment on column document_sessions.language is
  'Interface language code of the session, from the i18n config list only. Safe metadata; never document content.';
