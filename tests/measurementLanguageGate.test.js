// THE MEASUREMENT-ONLY LANGUAGE OVERRIDE MUST NOT BE REACHABLE BY A READER.
//
// The override exists because there was no way to obtain a single sentence of
// model output in any language but English, which made it impossible to measure
// what a translated reader would receive or to test a guard against real output.
// It asks the model to write in a language whose safety guards DO NOT EXIST, so
// its output is by definition unguarded, and it must never reach a reader.
//
// This file is the assertion that it cannot. It tests all four locks, and it
// tests the one that is not a runtime check at all: that the request path does
// not pass the option, which is held by reading simplifyRoute.js rather than by
// running it, because a route that never passes it cannot be caught failing.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const { providerSkipReason } = require(path.join(ROOT, "src", "services", "aiStructuredResultService"));
const { runClearStepsEngine } = require(path.join(ROOT, "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(ROOT, "scripts", "engine-baseline", "corpus"));

const ROUTE_SOURCE = fs.readFileSync(path.join(ROOT, "src", "routes", "simplifyRoute.js"), "utf8");
const SERVER_SOURCE = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");

const rulesRun = () => runClearStepsEngine({
  extractedText: CORPUS.find((e) => e.id === "council_tax").text,
  fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "measure-gate" }
});

// Restores whatever the environment held, so this file cannot leak state into
// the rest of the suite.
function withEnv(values, run) {
  const saved = {};
  Object.keys(values).forEach((key) => {
    saved[key] = process.env[key];
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  });
  try { return run(); } finally {
    Object.keys(saved).forEach((key) => {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    });
  }
}

const skip = (opts) => providerSkipReason(Object.assign({ rulesRun: rulesRun() }, opts));

test("every lock alone is enough to keep the gate shut", async (t) => {
  const run = rulesRun();

  await t.test("no override passed: the gate is shut, flag or no flag", () => {
    [undefined, "1"].forEach((flag) => {
      withEnv({ NODE_ENV: "development", CLEARSTEPS_MEASUREMENT_LANGUAGE: flag }, () => {
        assert.equal(providerSkipReason({ rulesRun: run, language: "hi" }), "non_english_language",
          "flag=" + flag);
      });
    });
  });

  await t.test("override passed but the flag is not set: shut", () => {
    withEnv({ NODE_ENV: "development", CLEARSTEPS_MEASUREMENT_LANGUAGE: undefined }, () => {
      assert.equal(skip({ language: "hi", measurementLanguage: "hi" }), "non_english_language");
    });
  });

  await t.test("override passed and flag set, but NODE_ENV is production: shut", () => {
    // THE ONE THAT MATTERS MOST. A deploy that somehow carries the flag still
    // refuses at the point of use, not only at boot.
    withEnv({ NODE_ENV: "production", CLEARSTEPS_MEASUREMENT_LANGUAGE: "1" }, () => {
      assert.equal(skip({ language: "hi", measurementLanguage: "hi" }), "non_english_language");
    });
  });

  await t.test("the flag must be exactly \"1\", not merely present", () => {
    ["true", "yes", "0", "", "hi"].forEach((flag) => {
      withEnv({ NODE_ENV: "development", CLEARSTEPS_MEASUREMENT_LANGUAGE: flag }, () => {
        assert.equal(skip({ language: "hi", measurementLanguage: "hi" }), "non_english_language",
          JSON.stringify(flag));
      });
    });
  });

  await t.test("all four open: the language branch no longer skips", () => {
    withEnv({ NODE_ENV: "development", CLEARSTEPS_MEASUREMENT_LANGUAGE: "1" }, () => {
      const reason = skip({ language: "hi", measurementLanguage: "hi" });
      assert.notEqual(reason, "non_english_language",
        "the override did not open the language branch");
    });
  });
});

test("the gates that are not about language still apply under the override", async (t) => {
  // The override skips ONE branch. A low-quality document, a suspected scam and
  // a lure shape must still be refused, or the override would be a way to reach
  // the provider with a document the engine refused.
  await t.test("low-quality input is still refused", () => {
    const run = runClearStepsEngine({
      extractedText: CORPUS.find((e) => e.id === "photo_snippet_short").text,
      fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "m2" }
    });
    withEnv({ NODE_ENV: "development", CLEARSTEPS_MEASUREMENT_LANGUAGE: "1" }, () => {
      assert.equal(providerSkipReason({ rulesRun: run, language: "hi", measurementLanguage: "hi" }),
        "low_quality_input");
    });
  });

  await t.test("a suspected scam is still refused", () => {
    const run = runClearStepsEngine({
      extractedText: CORPUS.find((e) => e.id === "scam_phishing").text,
      fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "m3" }
    });
    withEnv({ NODE_ENV: "development", CLEARSTEPS_MEASUREMENT_LANGUAGE: "1" }, () => {
      const reason = providerSkipReason({ rulesRun: run, language: "hi", measurementLanguage: "hi" });
      assert.ok(reason && reason !== "non_english_language", "got " + JSON.stringify(reason));
    });
  });
});

test("the request path cannot reach it", async (t) => {
  await t.test("simplifyRoute never passes measurementLanguage", () => {
    // Held by reading the source, because a route that never passes the option
    // cannot be observed failing to pass it. If someone adds it, this fails and
    // they have to come and read the reason above.
    assert.ok(!/measurementLanguage/.test(ROUTE_SOURCE),
      "simplifyRoute.js now mentions measurementLanguage; the override is one " +
      "request field away from a reader and must not be");
  });

  await t.test("and it passes exactly the three options it always did", () => {
    const call = ROUTE_SOURCE.slice(ROUTE_SOURCE.indexOf("applySafetyPassAndRecordAiStatus({"));
    const args = call.slice(0, call.indexOf("})"));
    assert.match(args, /rulesRun:/);
    assert.match(args, /extractedText,?/);
    assert.match(args, /language,?/);
    assert.ok(!/measurement/i.test(args), args);
  });

  await t.test("no request field is named anything like it", () => {
    // The override is reachable only from in-process code. Nothing parsed off a
    // request may map to it.
    assert.ok(!/body\.[a-zA-Z]*measurement|fields\.[a-zA-Z]*measurement/i.test(ROUTE_SOURCE));
  });
});

test("the server refuses to start with the flag in production", async (t) => {
  await t.test("the assertion exists and is called at startup", () => {
    assert.match(SERVER_SOURCE, /function assertSafeMeasurementLanguageConfig\(\)/);
    assert.match(SERVER_SOURCE, /^assertSafeMeasurementLanguageConfig\(\);$/m,
      "the assertion is defined but never called");
  });

  await t.test("it throws on exactly the production plus flag combination", () => {
    // Executed rather than read, by lifting the function out of the source. The
    // server module itself cannot simply be required here: it runs its startup
    // assertions at import time, which is the behaviour under test.
    const body = SERVER_SOURCE.slice(
      SERVER_SOURCE.indexOf("function assertSafeMeasurementLanguageConfig()"));
    const fn = new Function("process", body + "\nreturn assertSafeMeasurementLanguageConfig;")(
      { env: { NODE_ENV: "production", CLEARSTEPS_MEASUREMENT_LANGUAGE: "1" } });
    assert.throws(fn, /must not be set in production/);

    const safe = [
      { NODE_ENV: "production" },
      { NODE_ENV: "development", CLEARSTEPS_MEASUREMENT_LANGUAGE: "1" },
      {}
    ];
    safe.forEach((env) => {
      const ok = new Function("process", body + "\nreturn assertSafeMeasurementLanguageConfig;")({ env });
      assert.doesNotThrow(ok, JSON.stringify(env));
    });
  });
});

test("nothing on this path persists", async (t) => {
  await t.test("the service writes no session, and never did", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "src", "services", "aiStructuredResultService.js"), "utf8");
    // The route owns persistence. If the service ever gains a writer, the
    // override stops being measurement-only and this says so.
    assert.ok(!/supabase|document_sessions|saveDocumentSession/i.test(source),
      "the AI service now persists something; the override is no longer in-memory only");
  });
});
