// How long each stored table is kept. One responsibility: name the three
// retention periods once, so the app and the purge cannot drift apart.
//
// WHY THREE CONSTANTS AND NOT ONE. The periods are a product decision and they
// genuinely differ: session and analytics rows are operational and go at thirty
// days, feedback is read by a person and is worth six months. Keeping them
// separate means changing one can never silently move the others.
//
// WHAT expires_at IS FOR, AND WHAT IT IS NOT. These values are written onto each
// row so the row states its own intended life, which is what a reader asking
// "how long do you keep this" is owed. The PURGE deliberately does NOT key on
// expires_at. It keys on created_at, for two reasons:
//
//   1. created_at is not null and indexed on all three tables. expires_at is
//      nullable and indexed on none, so a purge on it would seq scan.
//   2. Every document_sessions row written before 9 August 2026 carries
//      created_at + 15 minutes, because expires_at was mistakenly tied to
//      OCR_SESSION_TTL_MS, the in-memory text TTL. Those rows are all already
//      "expired". A purge keyed on expires_at would delete the entire history
//      on its first run.
//
// The periods below are mirrored in supabase/phase10_retention_purge.sql. If one
// changes, change both, and say so in the commit.

const DOCUMENT_SESSION_RETENTION_DAYS = 30;
const ANALYTICS_EVENT_RETENTION_DAYS = 30;
const FEEDBACK_EVENT_RETENTION_DAYS = 180;

const DAY_MS = 24 * 60 * 60 * 1000;

const DOCUMENT_SESSION_RETENTION_MS = DOCUMENT_SESSION_RETENTION_DAYS * DAY_MS;
const ANALYTICS_EVENT_RETENTION_MS = ANALYTICS_EVENT_RETENTION_DAYS * DAY_MS;
const FEEDBACK_EVENT_RETENTION_MS = FEEDBACK_EVENT_RETENTION_DAYS * DAY_MS;

// Rows are stamped from the moment they are created, so a row's stated expiry
// and the created_at the purge actually measures describe the same window.
function expiryFromNow(retentionMs, now = Date.now()) {
  return new Date(now + retentionMs).toISOString();
}

module.exports = {
  DOCUMENT_SESSION_RETENTION_DAYS,
  ANALYTICS_EVENT_RETENTION_DAYS,
  FEEDBACK_EVENT_RETENTION_DAYS,
  DOCUMENT_SESSION_RETENTION_MS,
  ANALYTICS_EVENT_RETENTION_MS,
  FEEDBACK_EVENT_RETENTION_MS,
  expiryFromNow
};
