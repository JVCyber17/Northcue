# Privacy TODO (parked items)

These were identified during privacy hardening and intentionally deferred.
They are NOT done. Leave this file until each is completed, then remove the
corresponding entry.

## 1. Strip identifier fields from the outbound fallbackStructuredResult (item 4, Part B)
The OpenAI request currently sends `JSON.stringify(fallbackStructuredResult)`
alongside the (now redacted) document text
(`src/services/aiStructuredResultService.js`, `buildUserPrompt`). The free-text
document body is redacted by `redactForAi()`, but the fallback JSON is sent as-is
and may carry document-derived identifiers (e.g. reference/account-number-style
fields). Future small follow-up: do a careful field-by-field pass against the
structured-result schema and strip identifier-type fields from the outbound copy
only, keeping structure, dates, and category so cue-card quality is unaffected.

## 2. Supabase purge job for expired metadata rows
`document_sessions.expires_at` is written, but nothing deletes rows once they
pass it, so metadata retention is currently unbounded. Add a scheduled purge
(a free Supabase scheduled function / cron can do this) that deletes
`document_sessions` (and cascades) where `expires_at < now()`, so metadata
retention is actually time-bounded. No raw content is stored, but bounding the
metadata makes the retention story cleaner.

## 3. Revisit dropping stored free-text feedback (item 6)
The optional feedback `note` free-text is currently kept (hardened: dash-free
warning + tightened `sanitiseNote` redaction + length caps). Before launch /
public-sector (gov.uk) engagement, revisit whether to drop the stored text and
keep only `has_comment` / `comment_length`, so we can make the cleaner
"we do not store anything you type" claim. Trade-off: loses qualitative feedback.

## 4. Reminder (not a code task): rotate exposed secrets before deployment
The OpenAI API key and Supabase service-role key were exposed in local
chat/terminal sessions during development. Both must be rotated in their
dashboards and `.env` updated before any public deployment. This remains the
pre-deployment blocker.
