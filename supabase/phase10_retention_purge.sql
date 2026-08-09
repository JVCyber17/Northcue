-- PHASE 10. RETENTION: expiry columns, a purge function, and a schedule.
--
-- Until now nothing was ever deleted from any of the three tables. expires_at
-- existed on document_sessions, was written as created_at + 15 minutes because
-- it had been wired to OCR_SESSION_TTL_MS (the in-memory extracted-text TTL,
-- an unrelated thing), and nothing read it. feedback_events and analytics_events
-- had no expiry at all.
--
-- THE PERIODS, and they are deliberately different:
--   document_sessions   30 days
--   analytics_events    30 days
--   feedback_events    180 days   (read by a person, not operational)
-- Mirrored in src/config/retentionPolicy.js. Change one, change both.
--
-- WHY THE PURGE MEASURES created_at AND NOT expires_at. Two reasons, and the
-- second is the one that matters:
--   1. created_at is NOT NULL and indexed on all three tables. expires_at is
--      nullable and indexed on none, so a purge on it would sequential scan.
--   2. Every document_sessions row written before this migration carries
--      created_at + 15 minutes. Every one of them is already "expired". A purge
--      keyed on expires_at would delete the entire history on its first run.
-- expires_at is still written going forward, so a row states its own intended
-- life, which is what a reader asking "how long do you keep this" is owed.
--
-- THE TABLES ARE PURGED INDEPENDENTLY, NOT BY CASCADE. document_session_id is
-- declared on both child tables and has never been written, so there is nothing
-- to cascade from. Even if it were populated, a cascade would be WRONG here:
-- it would take six-month feedback out with its thirty-day parent.
--
-- RUN THE STEPS IN ORDER. Steps 1 to 3 change nothing that deletes. Step 4 is a
-- DRY RUN that only counts. Step 5 is the schedule and is the only step that
-- causes anything to be deleted, ever. Read step 4's numbers before running it.

-- ---------------------------------------------------------------------------
-- STEP 1. The expiry columns on the two tables that lacked them.
-- Nullable on purpose: existing rows keep NULL, and nothing depends on the
-- value, because the purge measures created_at.
-- ---------------------------------------------------------------------------

alter table public.analytics_events
  add column if not exists expires_at timestamptz;

alter table public.feedback_events
  add column if not exists expires_at timestamptz;

comment on column public.analytics_events.expires_at is
  'Intended deletion time, created_at + 30 days. Documentation of the row''s life. The purge measures created_at.';

comment on column public.feedback_events.expires_at is
  'Intended deletion time, created_at + 180 days. Documentation of the row''s life. The purge measures created_at.';

comment on column public.document_sessions.expires_at is
  'Intended deletion time, created_at + 30 days. Rows written before 9 August 2026 carry created_at + 15 minutes from a wiring bug and must not be read as authoritative. The purge measures created_at.';

-- ---------------------------------------------------------------------------
-- STEP 2. Backfill expires_at so the column is truthful for existing rows.
-- This DELETES NOTHING. It only makes each row state the life it actually has
-- under the periods above. Safe to re-run: it is derived from created_at.
-- ---------------------------------------------------------------------------

update public.document_sessions
   set expires_at = created_at + interval '30 days'
 where expires_at is distinct from created_at + interval '30 days';

update public.analytics_events
   set expires_at = created_at + interval '30 days'
 where expires_at is distinct from created_at + interval '30 days';

update public.feedback_events
   set expires_at = created_at + interval '180 days'
 where expires_at is distinct from created_at + interval '180 days';

-- ---------------------------------------------------------------------------
-- STEP 3. The purge function.
--
-- SAFETY PROPERTIES, each one structural rather than a promise:
--   never deletes a row inside its window : the WHERE clause is the only
--     predicate, and it is strictly older-than
--   idempotent                            : a second run matches nothing new
--   cannot take the service down          : it runs in Postgres, not in the web
--     service, and each delete is wrapped so one failing table cannot stop the
--     other two
--   counts only, never content            : it returns and raises row COUNTS.
--     No column value is read, logged or returned.
-- ---------------------------------------------------------------------------

create or replace function public.purge_expired_rows()
returns table (table_name text, deleted_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  removed bigint;
begin
  begin
    delete from public.document_sessions
     where created_at < now() - interval '30 days';
    get diagnostics removed = row_count;
    table_name := 'document_sessions'; deleted_count := removed; return next;
  exception when others then
    -- One table failing must not stop the others, and must not raise out of a
    -- scheduled job. SQLERRM carries no row content.
    raise warning 'purge_expired_rows: document_sessions failed: %', sqlerrm;
    table_name := 'document_sessions'; deleted_count := -1; return next;
  end;

  begin
    delete from public.analytics_events
     where created_at < now() - interval '30 days';
    get diagnostics removed = row_count;
    table_name := 'analytics_events'; deleted_count := removed; return next;
  exception when others then
    raise warning 'purge_expired_rows: analytics_events failed: %', sqlerrm;
    table_name := 'analytics_events'; deleted_count := -1; return next;
  end;

  begin
    delete from public.feedback_events
     where created_at < now() - interval '180 days';
    get diagnostics removed = row_count;
    table_name := 'feedback_events'; deleted_count := removed; return next;
  exception when others then
    raise warning 'purge_expired_rows: feedback_events failed: %', sqlerrm;
    table_name := 'feedback_events'; deleted_count := -1; return next;
  end;

  return;
end;
$$;

comment on function public.purge_expired_rows() is
  'Deletes rows past their retention period, measured on created_at. Returns per-table counts only, never row content.';

-- The function is service-role work only. RLS is enabled with no policies on all
-- three tables, so nothing else could reach them anyway, but revoke explicitly.
revoke all on function public.purge_expired_rows() from public;
revoke all on function public.purge_expired_rows() from anon;
revoke all on function public.purge_expired_rows() from authenticated;

-- ---------------------------------------------------------------------------
-- STEP 4. DRY RUN. Counts only. DELETES NOTHING. Run this and read it BEFORE
-- step 5. These are exactly the rows the first scheduled run will remove.
-- ---------------------------------------------------------------------------

select 'document_sessions' as table_name,
       count(*) filter (where created_at <  now() - interval '30 days')  as would_delete,
       count(*) filter (where created_at >= now() - interval '30 days')  as would_keep,
       count(*)                                                          as total
  from public.document_sessions
union all
select 'analytics_events',
       count(*) filter (where created_at <  now() - interval '30 days'),
       count(*) filter (where created_at >= now() - interval '30 days'),
       count(*)
  from public.analytics_events
union all
select 'feedback_events',
       count(*) filter (where created_at <  now() - interval '180 days'),
       count(*) filter (where created_at >= now() - interval '180 days'),
       count(*)
  from public.feedback_events;

-- ---------------------------------------------------------------------------
-- STEP 5. THE SCHEDULE. This is the only step that causes deletion.
-- Do not run it until step 4's numbers have been read and accepted.
--
-- 03:20 UTC daily, off the hour so it does not land with everything else.
-- pg_cron is reported available at 1.6.4 with installed_version NULL, so the
-- extension is created here.
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;

-- Unschedule first so re-running this file does not create a duplicate job.
select cron.unschedule(jobid)
  from cron.job
 where jobname = 'northcue-purge-expired-rows';

select cron.schedule(
  'northcue-purge-expired-rows',
  '20 3 * * *',
  $cron$ select public.purge_expired_rows(); $cron$
);

-- ---------------------------------------------------------------------------
-- AFTERWARDS. Confirm the job exists, and read past runs. run_details holds a
-- status and a duration, never row content.
--
--   select jobid, jobname, schedule, active from cron.job
--    where jobname = 'northcue-purge-expired-rows';
--
--   select status, return_message, start_time, end_time
--     from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname = 'northcue-purge-expired-rows')
--    order by start_time desc limit 10;
--
-- To stop it:
--   select cron.unschedule('northcue-purge-expired-rows');
-- ---------------------------------------------------------------------------
