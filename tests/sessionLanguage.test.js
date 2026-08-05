// PER-LANGUAGE COMPLETION MONITORING, the write half and the read half.
// The session row carries the interface language so the daily production
// check can watch completion per language from launch minute one, and a
// language-specific regression is an alert, not a discovery.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const { buildSafeSessionRow } = require(path.join(ROOT, "src", "services", "documentSessionService"));
const config = require(path.join(ROOT, "public", "i18n", "config.js"));

test("the language column is safe metadata by construction", async (t) => {
  await t.test("every configured code is stored, normalised", () => {
    config.languages.forEach((entry) => {
      const row = buildSafeSessionRow({ clientJobId: "job-1", language: entry.code.toUpperCase() });
      assert.equal(row.language, entry.code, entry.code);
    });
  });

  await t.test("anything the config does not list is dropped, never stored", () => {
    ["xx", "polish", "en-GB", "<script>", "£1,234.56", "12 June 2026", "", null].forEach((junk) => {
      const row = buildSafeSessionRow({ clientJobId: "job-1", language: junk });
      assert.equal("language" in row, false, JSON.stringify(junk) + " must not reach the column");
    });
  });
});

test("the daily check reads and alerts per language", async (t) => {
  const source = fs.readFileSync(path.join(ROOT, "scripts", "production", "daily-check.js"), "utf8");

  await t.test("the query selects the language column", () => {
    assert.ok(source.includes("cards_count,language"), "language missing from the select");
  });

  await t.test("there is a per-language alert with a two-session floor", () => {
    assert.ok(source.includes("l.good >= 2 && l.completed === 0"),
      "the per-language alert condition changed or vanished");
  });

  await t.test("pre-column history can never alert", () => {
    assert.ok(source.includes('lang !== "unknown"'),
      "unknown-language rows must be history, not a community");
  });
});

test("the pre-migration write cannot cost a session", async (t) => {
  await t.test("the retry-without-language path exists", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "src", "services", "documentSessionService.js"), "utf8");
    assert.ok(source.includes("retrying without it"),
      "the language-column tolerance was removed; a deploy before the " +
      "phase7 migration would silently lose every session");
  });
});
