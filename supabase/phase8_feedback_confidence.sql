-- Northcue Phase 8 confidence after reading
-- Privacy rule: do not store raw documents, OCR text, full document text,
-- uploaded files, names, addresses, account numbers, reference numbers,
-- or payment details.
--
-- confidence_after records how the reader felt about their letter after
-- reading the cue cards. It is one optional tap in the feedback flow and is
-- null whenever the reader skipped it, which is expected and normal, so read
-- it as a rate over the rows that answered rather than over all feedback.
--
-- This is the only per respondent measure of confidence Northcue collects.
-- The helpfulness rating covers clarity, and the reason chips cover
-- overwhelm, but neither can stand in for whether someone felt more able to
-- deal with the letter in front of them.

alter table public.feedback_events
  add column if not exists confidence_after text
    check (confidence_after in ('more_able', 'about_same', 'still_unsure'));

-- Reporting reads this grouped and ignores the rows that skipped it.
create index if not exists idx_feedback_events_confidence_after
  on public.feedback_events(confidence_after)
  where confidence_after is not null;
