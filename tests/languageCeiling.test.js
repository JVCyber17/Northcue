// The temporary language ceiling, pinned while it exists.
//
// STOPGAP, recorded 6 August 2026: the founder's live review found a
// production-scale bill timing out on the Gujarati path, because writing
// prose in a reader's language runs past the 40 second English ceiling on
// long documents. Until the translate-after-English architecture decision
// (D-FIX-2) lands, a prose call that is asked to WRITE IN a language gets 90
// seconds; English keeps 40. This file pins the pair and the branch so the
// stopgap cannot silently widen or vanish, and it is deleted with the branch
// when the decision lands.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const service = require(path.join(__dirname, "..", "src", "services", "aiStructuredResultService"));
const I18N_CONFIG = require(path.join(__dirname, "..", "public", "i18n", "config.js"));

test("the ceiling pair: 90s to write in a reader's language, 40s for English", () => {
  assert.equal(service.AI_TIMEOUT_MS, 40000);
  assert.equal(service.AI_LANGUAGE_TIMEOUT_MS, 90000);
  assert.equal(service.aiCeilingMs(null), service.AI_TIMEOUT_MS);
  assert.equal(service.aiCeilingMs(undefined), service.AI_TIMEOUT_MS);
});

test("every launched language gets the language ceiling, derived from config", () => {
  const open = (I18N_CONFIG.launch && I18N_CONFIG.launch.open) || [];
  assert.ok(open.length > 0, "premise: wave one is live");
  open.forEach((code) => {
    assert.equal(service.aiCeilingMs(code), service.AI_LANGUAGE_TIMEOUT_MS, code);
  });
});

test("the client's long-wait announcement exists in every dictionary and warns before the ceiling", () => {
  const fs = require("node:fs");
  const app = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
  // The pre-ceiling warning for the language path fires at 75 seconds,
  // before the 90 second ceiling, exactly as 32 warns before 40.
  assert.match(app, /status\.stillWorkingLanguage/);
  assert.match(app, /75000/);
  I18N_CONFIG.languages.map((entry) => entry.code).forEach((code) => {
    const dictionary = fs.readFileSync(
      path.join(__dirname, "..", "public", "i18n", code + ".js"), "utf8");
    assert.ok(dictionary.includes("status.stillWorkingLanguage"), code);
  });
});
