// Guards the JSON field parse on the /api/simplify path.
//
// The frontend's analyse request is a JSON body; server.js turns it into the
// fields object the simplify route reads. A field this mapping drops fails
// SILENTLY: the route sees undefined, applies its default, and everything
// still works except the behaviour that field controlled. That is exactly how
// the interface language fell out of the AI language gate (the route
// defaulted to English and non English users' documents reached the AI
// provider), so this file guards the class, not the instance: every field
// name the route reads must survive the JSON parse, and any new field read
// added to the route without a matching entry in jsonBodyToFields fails here.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const { jsonBodyToFields } = require(path.join(ROOT, "src", "utils", "requestParsing"));

test("json field parity on the simplify path", async (t) => {
  await t.test("the exact analyse payload app.js sends survives the parse", () => {
    // Mirrors public/app.js: the analyse call body, field for field.
    const fields = jsonBodyToFields({
      action: "analyse",
      job_id: "job-123",
      documentCategory: "bill",
      language: "pl"
    });
    assert.equal(fields.action, "analyse");
    assert.equal(fields.jobId, "job-123");
    assert.equal(fields.documentCategory, "bill");
    assert.equal(fields.language, "pl");
  });

  await t.test("the language field is retained for every configured language", () => {
    const config = require(path.join(ROOT, "public", "i18n", "config.js"));
    config.languages.forEach((entry) => {
      const fields = jsonBodyToFields({ action: "analyse", language: entry.code });
      assert.equal(fields.language, entry.code,
        entry.code + " must survive the JSON parse so the AI language gate can see it");
    });
  });

  await t.test("non string and absent language values fall back safely", () => {
    // The route's normaliser maps anything unknown to English; the parse must
    // hand it a string, never undefined, so absence stays an explicit value.
    assert.equal(jsonBodyToFields({}).language, "");
    assert.equal(jsonBodyToFields({ language: 42 }).language, "");
    assert.equal(jsonBodyToFields({ language: null }).language, "");
  });

  await t.test("every field the route reads survives the parse (the class guard)", () => {
    // Scan the route source for fields.<name> reads. Names that are aliases
    // of a retained key (text for pastedText, job_id for jobId) or that the
    // server itself attaches after parsing (anonymousSessionId) are the only
    // permitted absences. A new fields.<name> read in the route without a
    // matching key in jsonBodyToFields fails this test, which is the failure
    // that would otherwise be silent in production.
    const routeSource = fs.readFileSync(path.join(ROOT, "src", "routes", "simplifyRoute.js"), "utf8");
    const readNames = new Set();
    for (const match of routeSource.matchAll(/fields\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
      readNames.add(match[1]);
    }
    assert.ok(readNames.size >= 5, "expected the route to read several fields; the scan may be broken");

    const parsedKeys = new Set(Object.keys(jsonBodyToFields({})));
    const permittedAbsences = new Set(["text", "job_id", "anonymousSessionId"]);
    readNames.forEach((name) => {
      if (permittedAbsences.has(name)) return;
      assert.ok(parsedKeys.has(name),
        "the route reads fields." + name + " but jsonBodyToFields does not retain it; " +
        "a JSON analyse request would silently lose it");
    });
  });

  await t.test("server.js uses the shared mapping for JSON bodies", () => {
    // Source level tripwire in the style of languageOffSwitch.test.js: the
    // JSON branch must build fields through jsonBodyToFields, not through a
    // fresh inline object that could drift from the route again.
    const serverSource = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
    assert.match(serverSource, /fields = jsonBodyToFields\(/,
      "handleSimplify's JSON branch must build fields with jsonBodyToFields");
  });
});
