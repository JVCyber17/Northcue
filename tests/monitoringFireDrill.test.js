// THE MONITORING FIRE DRILL. An alert that has never fired is a hope, so
// every alarm the launch depends on fires here, against synthetic rows in a
// stubbed fetch, never the real table. The daily check runs as the real
// script in a child process, exactly as a scheduler runs it.

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const SCRIPT = path.join(ROOT, "scripts", "production", "daily-check.js");
const STUB = path.join(__dirname, "helpers", "fireDrillFetchStub.js");

function runDailyCheck(rows) {
  let stdout = "";
  let code = 0;
  try {
    stdout = execFileSync(process.execPath, ["--require", STUB, SCRIPT, "1"], {
      env: {
        ...process.env,
        SUPABASE_URL: "https://drill.invalid",
        SUPABASE_SERVICE_ROLE_KEY: "drill-key",
        DRILL_ROWS: JSON.stringify(rows)
      },
      encoding: "utf8"
    });
  } catch (error) {
    stdout = String(error.stdout || "");
    code = typeof error.status === "number" ? error.status : 1;
  }
  return { stdout, code };
}

// Distinct seconds so the batch filter keeps every row; good quality and
// cards so the bot filter keeps them too.
function row(minute, overrides) {
  return {
    created_at: "2026-08-06T09:" + String(minute).padStart(2, "0") + ":00.000Z",
    ai_status: "completed", ai_error_code: null, ai_validation_errors: null,
    input_quality: "good", error_code: null, cards_count: 6, language: "en",
    ...overrides
  };
}

test("the per-language zero-completion alert fires", async (t) => {
  await t.test("three good Gujarati sessions, zero completed, pages with exit 1", () => {
    const rows = [
      row(1), row(2), row(3),
      row(11, { language: "gu", ai_status: "fallback", ai_error_code: "ai_timeout" }),
      row(12, { language: "gu", ai_status: "fallback", ai_error_code: "ai_timeout" }),
      row(13, { language: "gu", ai_status: "error", ai_error_code: "sanitizer_rejected" })
    ];
    const { stdout, code } = runDailyCheck(rows);
    assert.equal(code, 1, "the drill day must page");
    assert.match(stdout, /lang gu.*ALERT: this language completes NOTHING/);
    assert.doesNotMatch(stdout, /lang en.*ALERT/);
  });

  await t.test("one bad session is a watch line, not a page", () => {
    const rows = [row(1), row(2),
      row(21, { language: "pl", ai_status: "fallback", ai_error_code: "ai_timeout" })];
    const { stdout, code } = runDailyCheck(rows);
    assert.equal(code, 0, "one unlucky reader must not page");
    assert.match(stdout, /lang pl.*watch: one good session, zero completed/);
  });

  await t.test("pre-column history under unknown can never page", () => {
    const rows = [
      row(1), row(2),
      row(31, { language: null, ai_status: "fallback", ai_error_code: "ai_timeout" }),
      row(32, { language: null, ai_status: "fallback", ai_error_code: "ai_timeout" })
    ];
    const { stdout, code } = runDailyCheck(rows);
    assert.equal(code, 0);
    assert.doesNotMatch(stdout, /lang unknown.*ALERT/);
  });
});

test("the global zero-completion alert still fires with languages present", async (t) => {
  await t.test("a completed-zero day pages regardless of language", () => {
    const rows = [
      row(1, { ai_status: "fallback", ai_error_code: "ai_timeout" }),
      row(2, { ai_status: "fallback", ai_error_code: "ai_timeout" }),
      row(3, { language: "gu", ai_status: "fallback", ai_error_code: "ai_timeout" })
    ];
    const { stdout, code } = runDailyCheck(rows);
    assert.equal(code, 1);
    assert.match(stdout, /ALERT: good sessions, ZERO completed/);
  });
});

test("a digit can never reach the errors column, drilled through the real writer", async (t) => {
  await t.test("a value-bearing repair message is shape-only in the row", () => {
    const { buildSafeSessionRow } = require(path.join(ROOT, "src", "services", "documentSessionService"));
    const nasty = [
      "date 12 June 2026 removed from cards[3].simple_explanation",
      "amount £1,381.50 outside allowed set; ref WA-2231 on 03/06/2026 at 09:30",
      "the 5th of період 2026.19.44 x99999"
    ];
    const rowOut = buildSafeSessionRow({ clientJobId: "drill", aiValidationErrors: nasty });
    assert.ok(rowOut.ai_validation_errors, "the column value exists");
    assert.doesNotMatch(rowOut.ai_validation_errors, /\d/,
      "A DIGIT REACHED THE ERRORS COLUMN: " + rowOut.ai_validation_errors);
  });
});
