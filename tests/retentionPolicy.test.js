// Guards the retention wiring and the purge predicate.
//
// WHAT WENT WRONG BEFORE. document_sessions.expires_at was written as
// now + OCR_SESSION_TTL_MS, fifteen minutes, because it had been wired to the
// in-memory extracted-text TTL, an unrelated thing. Nothing read it, no purge
// existed, and the other two tables had no expiry at all. So every row ever
// written was kept forever while claiming to expire in a quarter of an hour.
//
// WHAT THESE TESTS CAN AND CANNOT PROVE. There is no Postgres in this suite, so
// they do not execute the purge. They prove the three things that can drift
// silently and would not be noticed until a reader's data outlived its promise:
//   the periods themselves,
//   that the app and the SQL agree on those periods, and
//   that the purge measures created_at rather than expires_at.
// The boundary behaviour is exercised against synthetic rows using the same
// predicate the SQL uses. Executing the SQL is a manual step, recorded in
// supabase/phase10_retention_purge.sql step 4.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const policy = require("../src/config/retentionPolicy");
const MIGRATION = fs.readFileSync(
  path.join(__dirname, "..", "supabase", "phase10_retention_purge.sql"), "utf8"
);

const DAY_MS = 24 * 60 * 60 * 1000;

// The same predicate the SQL uses: strictly older than the window, measured on
// created_at. Anything this keeps, the delete must keep.
function wouldPurge(createdAtMs, retentionMs, nowMs) {
  return createdAtMs < nowMs - retentionMs;
}

test("retention policy", async (t) => {
  await t.test("the three periods are the agreed ones and are independent", () => {
    assert.equal(policy.DOCUMENT_SESSION_RETENTION_DAYS, 30);
    assert.equal(policy.ANALYTICS_EVENT_RETENTION_DAYS, 30);
    assert.equal(policy.FEEDBACK_EVENT_RETENTION_DAYS, 180);
    // Feedback is deliberately longer. If these ever collapse to one value it
    // is a mistake, not a simplification.
    assert.notEqual(
      policy.FEEDBACK_EVENT_RETENTION_DAYS,
      policy.DOCUMENT_SESSION_RETENTION_DAYS,
      "feedback is kept longer than a document session, on purpose"
    );
    assert.equal(policy.DOCUMENT_SESSION_RETENTION_MS, 30 * DAY_MS);
    assert.equal(policy.ANALYTICS_EVENT_RETENTION_MS, 30 * DAY_MS);
    assert.equal(policy.FEEDBACK_EVENT_RETENTION_MS, 180 * DAY_MS);
  });

  await t.test("expiryFromNow stamps the row with its own window", () => {
    const now = Date.UTC(2026, 7, 9, 12, 0, 0);
    assert.equal(
      policy.expiryFromNow(policy.DOCUMENT_SESSION_RETENTION_MS, now),
      new Date(now + 30 * DAY_MS).toISOString()
    );
    assert.equal(
      policy.expiryFromNow(policy.FEEDBACK_EVENT_RETENTION_MS, now),
      new Date(now + 180 * DAY_MS).toISOString()
    );
  });

  await t.test("the migration and the app agree on every period", () => {
    // Drift here is the failure that would keep data past its promise, so it is
    // pinned per table rather than by a single count of occurrences.
    assert.match(
      MIGRATION,
      /delete from public\.document_sessions\s+where created_at < now\(\) - interval '30 days'/,
      "document_sessions must purge at 30 days"
    );
    assert.match(
      MIGRATION,
      /delete from public\.analytics_events\s+where created_at < now\(\) - interval '30 days'/,
      "analytics_events must purge at 30 days"
    );
    assert.match(
      MIGRATION,
      /delete from public\.feedback_events\s+where created_at < now\(\) - interval '180 days'/,
      "feedback_events must purge at 180 days"
    );
  });

  await t.test("the purge measures created_at, never expires_at", () => {
    // THIS IS THE ONE THAT MATTERS. Every document_sessions row written before
    // 9 August 2026 carries created_at + 15 minutes, so it is already past its
    // stated expiry. A purge keyed on expires_at would delete the whole history
    // on its first run.
    const deletes = MIGRATION.match(/delete from public\.\w+[\s\S]*?;/g) || [];
    assert.equal(deletes.length, 3, "exactly three tables are purged");
    for (const statement of deletes) {
      assert.match(statement, /where created_at </, "each delete must key on created_at");
      assert.doesNotMatch(statement, /expires_at/, "no delete may key on expires_at");
    }
  });

  await t.test("expired rows go and unexpired rows stay, at each table's own period", () => {
    const now = Date.UTC(2026, 7, 9, 12, 0, 0);
    const at = (daysAgo) => now - daysAgo * DAY_MS;

    const cases = [
      { table: "document_sessions", retention: policy.DOCUMENT_SESSION_RETENTION_MS,
        purged: [31, 45, 365], kept: [0, 1, 29] },
      { table: "analytics_events", retention: policy.ANALYTICS_EVENT_RETENTION_MS,
        purged: [31, 90], kept: [0, 29] },
      // The period that differs. A 90 day old feedback row must survive, where a
      // 90 day old analytics row must not.
      { table: "feedback_events", retention: policy.FEEDBACK_EVENT_RETENTION_MS,
        purged: [181, 400], kept: [0, 90, 179] }
    ];

    for (const { table, retention, purged, kept } of cases) {
      for (const daysAgo of purged) {
        assert.equal(wouldPurge(at(daysAgo), retention, now), true,
          `${table}: a row ${daysAgo} days old must be purged`);
      }
      for (const daysAgo of kept) {
        assert.equal(wouldPurge(at(daysAgo), retention, now), false,
          `${table}: a row ${daysAgo} days old must be kept`);
      }
    }

    // The boundary itself: exactly at the period is NOT past it.
    assert.equal(wouldPurge(at(30), policy.DOCUMENT_SESSION_RETENTION_MS, now), false,
      "a row exactly at the boundary is not yet expired");
    // A 90 day old row is purged as analytics and kept as feedback. That single
    // pair is the whole point of three independent constants.
    assert.equal(wouldPurge(at(90), policy.ANALYTICS_EVENT_RETENTION_MS, now), true);
    assert.equal(wouldPurge(at(90), policy.FEEDBACK_EVENT_RETENTION_MS, now), false);
  });

  await t.test("the purge reports counts and never row content", () => {
    assert.match(MIGRATION, /returns table \(table_name text, deleted_count bigint\)/,
      "the function returns counts only");
    assert.match(MIGRATION, /get diagnostics removed = row_count/,
      "counts come from row_count, not from reading rows");
    // A raise that interpolated a column value would put reader data in the logs.
    const raises = MIGRATION.match(/raise (warning|notice)[^;]*;/g) || [];
    for (const line of raises) {
      assert.doesNotMatch(line, /select|from public\./i,
        "a log line must never read a row");
    }
  });

  await t.test("one failing table cannot stop the others or the job", () => {
    const handlers = MIGRATION.match(/exception when others then/g) || [];
    assert.equal(handlers.length, 3, "each table's delete is individually guarded");
  });

  await t.test("the schedule is created once, not duplicated on re-run", () => {
    assert.match(MIGRATION, /create extension if not exists pg_cron/,
      "pg_cron reports installed_version NULL, so the migration must enable it");
    assert.match(MIGRATION, /cron\.unschedule\(jobid\)[\s\S]*?where jobname = 'northcue-purge-expired-rows'/,
      "re-running the file must not leave two jobs deleting the same rows");
    assert.match(MIGRATION, /cron\.schedule\(\s*'northcue-purge-expired-rows'/);
  });

  await t.test("the app writes each row's own stated expiry", () => {
    const read = (rel) => fs.readFileSync(path.join(__dirname, "..", rel), "utf8");

    const route = read("src/routes/simplifyRoute.js");
    assert.match(route, /expiresAt: expiryFromNow\(DOCUMENT_SESSION_RETENTION_MS\)/);
    assert.doesNotMatch(route, /expiresAt: new Date\(Date\.now\(\) \+ OCR_SESSION_TTL_MS\)/,
      "the row expiry must never be tied to the in-memory text TTL again");

    assert.match(read("src/services/feedbackService.js"),
      /expires_at: expiryFromNow\(FEEDBACK_EVENT_RETENTION_MS\)/);
    assert.match(read("src/services/analyticsService.js"),
      /expires_at: expiryFromNow\(ANALYTICS_EVENT_RETENTION_MS\)/);
  });

  await t.test("the in-memory OCR TTL is untouched and still fifteen minutes", () => {
    // It governs how long extracted text lives between the upload step and the
    // analyse step. Conflating it with row retention is what caused this.
    const store = fs.readFileSync(
      path.join(__dirname, "..", "src", "services", "ocrSessionStore.js"), "utf8"
    );
    assert.match(store, /OCR_SESSION_TTL_MS\s*=\s*Math\.max\(60000, Number\(process\.env\.OCR_SESSION_TTL_MS \|\| 15 \* 60 \* 1000\)\)/);
  });

  await t.test("a late migration cannot cost a write", () => {
    // expires_at is new on both child tables. If code reaches a database that
    // has not applied phase10, naming the column fails the whole insert.
    assert.match(read("src/services/feedbackService.js"),
      /OPTIONAL_FEEDBACK_COLUMNS = \["confidence_after", "contact_email", "expires_at"\]/);
    assert.match(read("src/services/analyticsService.js"),
      /retrying without it/);

    function read(rel) {
      return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
    }
  });
});
