-- Northcue Phase 7 optional feedback reply address
-- Privacy rule: do not store raw documents, OCR text, full document text,
-- uploaded files, names, addresses, account numbers, reference numbers,
-- or payment details.
--
-- contact_email holds a reply address the reader typed themselves, only when
-- they ticked the optional contact box. It is the one field in this table
-- stored intact rather than redacted, because a redacted address cannot be
-- replied to. It is never taken from a document, and free text notes are
-- still redacted by sanitiseNote() in src/services/feedbackService.js.
--
-- This column already exists in the live database. It was added by hand while
-- the optional contact field was built and never written down as a migration,
-- so rebuilding the schema from these files alone produced a table without it.
-- Every feedback submission that carried an email would then fail its insert
-- and be lost, including the note and rating attached to it. This file closes
-- that gap and is safe to run against the live database as a no op.

alter table public.feedback_events
  add column if not exists contact_email text;

-- Finding a reader who asked for a reply should not mean scanning the table.
create index if not exists idx_feedback_events_contact_email
  on public.feedback_events(contact_email)
  where contact_email is not null;
