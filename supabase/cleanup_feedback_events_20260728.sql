-- Northcue feedback_events cleanup, 28 July 2026
--
-- One off cleanup, not a schema migration. Run it once in the Supabase SQL
-- editor and then leave it in the repo as a record of what was changed.
--
-- Run the two pending migrations FIRST, or step 3 will have nothing to check:
--   supabase/phase7_feedback_contact_email.sql
--   supabase/phase8_feedback_confidence.sql
--
-- Every step has a SELECT above it showing exactly which rows it will touch.
-- Run the SELECT, read the rows, then run the statement under it. Nothing here
-- is written to run unattended.

-- ---------------------------------------------------------------------------
-- STEP 1. Look at everything first.
-- ---------------------------------------------------------------------------
select created_at::date as day, page, section, rating,
       document_category, trust_assessment, severity_level,
       left(coalesce(note, ''), 40) as note_start
from public.feedback_events
order by created_at;

-- ---------------------------------------------------------------------------
-- STEP 2. Remove the test rows.
--
-- Five rows, none of them from a real reader:
--   pre_deploy / smoke_test          06 June, deployment smoke test
--   predeploy_check / feedback_smoke 06 June, deployment smoke test
--   deployment_smoke / feedback      06 June, deployment smoke test
--   feedback_audit / audit_email_path 27 July, my test of the reply address path
--   feedback_audit / audit_confidence 28 July, my test of the confidence column
--
-- Correction to my earlier report: I said five of the pre existing rows were
-- smoke tests. Three were. The other two test rows are ones I created while
-- verifying the email path and the confidence path, so the total is five.
--
-- Preview:
select id, created_at::date as day, page, section
from public.feedback_events
where page in ('pre_deploy', 'predeploy_check', 'deployment_smoke', 'feedback_audit')
   or section in ('smoke_test', 'feedback_smoke', 'audit_email_path', 'audit_confidence');

-- Expect exactly 5 rows above. If you see more or fewer, stop and look again.
delete from public.feedback_events
where page in ('pre_deploy', 'predeploy_check', 'deployment_smoke', 'feedback_audit')
   or section in ('smoke_test', 'feedback_smoke', 'audit_email_path', 'audit_confidence');

-- ---------------------------------------------------------------------------
-- STEP 3. Clear the fabricated document metadata, keep the feedback.
--
-- Until the fix on 28 July, feedback given before any upload was stamped with
-- the built in demo result: document_category 'bill_or_payment',
-- trust_assessment 'medium', severity_level 'medium'. The rating, the reasons
-- and the note are real and stay untouched. Only the three invented fields are
-- cleared, so the row reads as what it is: feedback about Northcue, not about
-- a document.
--
-- A second correction. I told you four real rows carried fabricated metadata.
-- Looking at the actual values, three do. They match the demo fingerprint
-- exactly and came from a page where no document is read.
--
-- The fourth, a home page row from 04 June, holds 'outgoing' / 'medium' /
-- 'low'. That is NOT the demo fingerprint, so it was almost certainly carried
-- over from a document the reader really had analysed before walking back to
-- the home page. Clearing it would destroy real signal, so it is left alone.
-- Option B below is there if you would rather be strict about it.
--
-- Preview, option A, recommended:
select id, created_at::date as day, page, rating,
       document_category, trust_assessment, severity_level
from public.feedback_events
where page not in ('journey', 'cue_cards')
  and document_category = 'bill_or_payment'
  and trust_assessment = 'medium'
  and severity_level = 'medium';

-- Expect exactly 3 rows above: help 03 June, help 05 June, home 20 June.
update public.feedback_events
set document_category = null,
    trust_assessment = null,
    severity_level = null
where page not in ('journey', 'cue_cards')
  and document_category = 'bill_or_payment'
  and trust_assessment = 'medium'
  and severity_level = 'medium';

-- Option B, stricter. Only run this INSTEAD of option A if you would rather
-- treat every non journey row as untrustworthy, including the 04 June row
-- whose values do not match the demo. This clears 4 rows rather than 3.
--
-- update public.feedback_events
-- set document_category = null,
--     trust_assessment = null,
--     severity_level = null
-- where page not in ('journey', 'cue_cards')
--   and (document_category is not null
--        or trust_assessment is not null
--        or severity_level is not null);

-- ---------------------------------------------------------------------------
-- STEP 4. Confirm the result.
-- ---------------------------------------------------------------------------
select created_at::date as day, page, rating, confidence_after,
       document_category, trust_assessment, severity_level
from public.feedback_events
order by created_at;

-- You should be left with 7 rows, all from real readers. Document metadata
-- should now appear only on rows from 'journey' and 'cue_cards', plus the
-- 04 June home row if you chose option A.
