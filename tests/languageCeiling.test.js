// The two prose ceilings under the translate-after-English architecture,
// pinned with the announcement schedule that carries them.
//
// HISTORY, because this file replaced a stopgap pin: on 6 August 2026 a 90
// second generate-in-language ceiling shipped as a recorded temporary
// measure and was removed the same day when the founder approved the
// translate-after-English architecture. Under that architecture generation
// is ENGLISH for every reader and keeps the one 40 second ceiling; the
// translation step has its own ceiling, set from measurement on the
// production-scale twin: completed translations ran 18 to 33.7 seconds,
// four of ten Gujarati runs lost the translation to a 40 second ceiling,
// and 60 seconds covers the slowest completed observation with headroom.
// The launched reader's honest worst wait is therefore 100 seconds, which
// the client's schedule announces: the up-to-two-minutes line at 18
// seconds, the pre-ceiling warning at 90, warn-before-the-end exactly as
// English's 32 warns before 40.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const service = require(path.join(__dirname, "..", "src", "services", "aiStructuredResultService"));
const I18N_CONFIG = require(path.join(__dirname, "..", "public", "i18n", "config.js"));

test("the ceiling pair: 40s English generation for everyone, 60s translation", () => {
  assert.equal(service.AI_TIMEOUT_MS, 40000);
  assert.equal(service.AI_TRANSLATION_TIMEOUT_MS, 60000);
});

test("the stopgap is gone: no per-language generation ceiling survives", () => {
  assert.equal(service.AI_LANGUAGE_TIMEOUT_MS, undefined);
  assert.equal(service.aiCeilingMs, undefined);
});

test("the client's schedule carries the chain honestly in every dictionary", () => {
  const fs = require("node:fs");
  const app = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
  assert.match(app, /status\.stillWorkingLanguage/);
  // 90 warns before the 100 second worst chain, as 32 warns before 40.
  assert.match(app, /90000/);
  assert.ok(!app.includes("75000"), "the stopgap's 75 second warning is gone");
  I18N_CONFIG.languages.map((entry) => entry.code).forEach((code) => {
    const dictionary = fs.readFileSync(
      path.join(__dirname, "..", "public", "i18n", code + ".js"), "utf8");
    assert.ok(dictionary.includes("status.stillWorkingLanguage"), code);
  });
});
