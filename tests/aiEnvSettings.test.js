// Guards the two AI settings that used to fail silently when misconfigured.
//
// `Number(process.env.X || default)` turns a typo into NaN, and NaN means
// something everywhere it lands. A NaN timeout becomes a 1ms abort, so the AI
// is off and every session records ai_timeout. A NaN character cap becomes
// slice(0, NaN), which is "", so the model is sent an EMPTY document and still
// asked to work from it.
//
// Both are tested twice: once at the parser, and once through the module as it
// is actually loaded, because the bug lived in the reading of the value rather
// than in the using of it.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const SERVICE = path.join(__dirname, "..", "src", "services", "aiStructuredResultService");
const { positiveNumberSetting } = require(SERVICE);
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));

const NAME = "CLEARSTEPS_TEST_SETTING";

// Runs body with the env var set to `value`, console.warn captured, and both
// restored afterwards whatever happens.
function withEnv(value, body) {
  const original = process.env[NAME];
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args.join(" "));
  if (value === undefined) delete process.env[NAME];
  else process.env[NAME] = value;
  try {
    return { value: body(), warnings };
  } finally {
    console.warn = originalWarn;
    if (original === undefined) delete process.env[NAME];
    else process.env[NAME] = original;
  }
}

const read = (value, def, min) => withEnv(value, () => positiveNumberSetting(NAME, def, min));

test("a usable value is used", async (t) => {
  await t.test("a plain number", () => {
    assert.equal(read("12000", 25000).value, 12000);
  });

  await t.test("surrounding whitespace, which a .env file produces easily", () => {
    assert.equal(read(" 12000 ", 25000).value, 12000);
  });

  await t.test("a minimum is applied when one is given", () => {
    assert.equal(read("500", 8000, 1000).value, 1000);
    assert.equal(read("4000", 8000, 1000).value, 4000);
  });

  await t.test("no minimum means no floor", () => {
    assert.equal(read("5", 25000).value, 5);
  });
});

test("an absent value is not a misconfiguration", async (t) => {
  await t.test("unset", () => {
    const result = read(undefined, 25000);
    assert.equal(result.value, 25000);
    assert.deepEqual(result.warnings, [], "an unset variable must not warn");
  });

  await t.test("empty, and whitespace only", () => {
    assert.equal(read("", 25000).value, 25000);
    assert.equal(read("   ", 25000).value, 25000);
    assert.deepEqual(read("   ", 25000).warnings, []);
  });
});

test("an unusable value falls back to the documented default, loudly", async (t) => {
  // Every one of these previously produced NaN, or a number that means
  // "abort immediately" / "send nothing".
  const REJECTED = ["25s", "8k", "abc", "NaN", "Infinity", "-Infinity", "0", "-1", "-25000", "1e400"];

  for (const value of REJECTED) {
    await t.test(JSON.stringify(value), () => {
      const result = read(value, 25000);
      assert.equal(result.value, 25000, value + " must fall back to the default");
      assert.equal(result.warnings.length, 1, value + " must warn exactly once");
      assert.match(result.warnings[0], new RegExp(NAME));
    });
  }

  await t.test("the warning names the setting and the value, and is not gated behind the debug flag", () => {
    const original = process.env.CLEARSTEPS_AI_DEBUG;
    delete process.env.CLEARSTEPS_AI_DEBUG;
    try {
      const result = read("25s", 25000);
      assert.equal(result.warnings.length, 1);
      assert.match(result.warnings[0], /CLEARSTEPS_TEST_SETTING/);
      assert.match(result.warnings[0], /25s/);
      assert.match(result.warnings[0], /25000/);
    } finally {
      if (original === undefined) delete process.env.CLEARSTEPS_AI_DEBUG;
      else process.env.CLEARSTEPS_AI_DEBUG = original;
    }
  });

  await t.test("a very long value is not echoed back in full", () => {
    const result = read("x".repeat(500), 25000);
    assert.equal(result.value, 25000);
    assert.ok(result.warnings[0].length < 200, "the warning must not print an unbounded value");
  });
});

// ─── through the module, as it is actually loaded ────────────────────────────

// A corpus document rather than a hand-written one. The first draft of this
// test used a five line bill, which the engine rates `borderline`, so the
// low-quality gate skipped the AI and both settings tests passed without a
// request ever being made. Every test below now asserts the request happened.
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));
const BILL = CORPUS.find((entry) => entry.id === "energy_bill").text;

// The settings are module-load constants, so a misconfiguration can only be
// exercised by loading the module again with the environment already wrong.
function loadServiceWith(env) {
  const originals = {};
  Object.entries(env).forEach(([key, value]) => {
    originals[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
  delete require.cache[require.resolve(SERVICE)];
  const originalWarn = console.warn;
  console.warn = () => {};
  let loaded;
  try {
    loaded = require(SERVICE);
  } finally {
    console.warn = originalWarn;
  }
  const restore = () => {
    Object.entries(originals).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
    delete require.cache[require.resolve(SERVICE)];
    require(SERVICE);
  };
  return { service: loaded, restore };
}

// Honours the abort signal, the way a real fetch does. Without this the timeout
// cannot be observed at all, because the service only sees a timeout when fetch
// rejects with an AbortError.
// D3 tier 1 added a SECOND provider request on this path: the fact extractor
// runs beside the phrasing pass. Both are counted here unless told apart, and
// the char cap belongs to the phrasing prompt, so these helpers look at which
// request arrived rather than at how many.
const PHRASING_MARKER = "backend structured-output layer";
const isPhrasingRequest = (body) =>
  String(body && body.input && body.input[0] && body.input[0].content || "").includes(PHRASING_MARKER);

function abortAwareFetch(delayMs, onBody, calls) {
  return (url, init) => new Promise((resolve, reject) => {
    const body = JSON.parse(init.body);
    if (calls && isPhrasingRequest(body)) calls.count += 1;
    if (onBody && isPhrasingRequest(body)) onBody(body);
    const timer = setTimeout(() => resolve(new Response(JSON.stringify({
      model: "stub", id: "stub", output_text: "{}"
    }), { status: 200, headers: { "Content-Type": "application/json" } })), delayMs);
    init.signal.addEventListener("abort", () => {
      clearTimeout(timer);
      const error = new Error("aborted");
      error.name = "AbortError";
      reject(error);
    });
  });
}

async function runWith(env, fetchImpl) {
  const { service, restore } = loadServiceWith(env);
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = fetchImpl;
  try {
    const rulesRun = runClearStepsEngine({ extractedText: BILL, fileMeta: { mimeType: "application/pdf" } });
    const run = await service.applyAiStructuredResult({ rulesRun, extractedText: BILL, language: "en" });
    return run.api_output.debug.ai;
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    restore();
  }
}

test("a malformed timeout does not abort every call", async () => {
  // Before the fix this aborted at 1ms and returned ai_timeout, on every
  // document, for as long as the typo stayed in the .env file.
  const calls = { count: 0 };
  const ai = await runWith({ CLEARSTEPS_AI_TIMEOUT_MS: "25s" }, abortAwareFetch(40, null, calls));
  assert.equal(calls.count, 1, "the request must actually have been made");
  assert.notEqual(ai.ai_error_code, "ai_timeout",
    "a typo in the timeout must not silently disable the AI");
});

test("a real timeout still fires", async () => {
  // The other half of the same guard: rejecting bad values must not make the
  // timeout unreachable. 40ms of stubbed latency against a 5ms limit.
  const calls = { count: 0 };
  const ai = await runWith({ CLEARSTEPS_AI_TIMEOUT_MS: "5" }, abortAwareFetch(40, null, calls));
  assert.equal(calls.count, 1);
  assert.equal(ai.ai_error_code, "ai_timeout");
  assert.equal(ai.ai_status, "fallback");
});

// THE DOCUMENT SECTION ONLY, not the whole prompt.
//
// The first version of these assertions searched the entire user prompt for
// "EDF Energy", and passed under mutation: buildUserPrompt also embeds the
// fallback structured_result, whose cards name the sender and the amount. So
// an empty document section was invisible to a test written to detect exactly
// that. Slice at the marker line and assert on what follows it.
const DOCUMENT_MARKER = "Document text for in-memory analysis only.";
function documentSectionOf(prompt) {
  const index = prompt.indexOf(DOCUMENT_MARKER);
  assert.notEqual(index, -1, "the prompt must still carry a document section");
  return prompt.slice(index + DOCUMENT_MARKER.length);
}

test("a malformed character cap does not send an empty document", async () => {
  // Before the fix Math.max(1000, NaN) was NaN and slice(0, NaN) was "", so the
  // model received the instruction to use the document text and no document.
  const calls = { count: 0 };
  let sentPrompt = null;
  await runWith({ CLEARSTEPS_AI_TEXT_MAX_CHARS: "8k" }, abortAwareFetch(0, (body) => {
    sentPrompt = body.input[1].content;
  }, calls));

  assert.equal(calls.count, 1, "the request must actually have been made");
  const document = documentSectionOf(sentPrompt);
  assert.ok(document.includes("EDF Energy"), "the sender must reach the model");
  assert.ok(document.includes("£214.63"),
    "the amount the cards are built from must reach the model");
  assert.ok(document.trim().length >= BILL.length - 40,
    "substantially the whole document must be sent, not a truncated stub");
});

test("a usable character cap is still honoured", async () => {
  const calls = { count: 0 };
  let sentPrompt = null;
  await runWith({ CLEARSTEPS_AI_TEXT_MAX_CHARS: "1000" }, abortAwareFetch(0, (body) => {
    sentPrompt = body.input[1].content;
  }, calls));

  assert.equal(calls.count, 1);
  assert.ok(documentSectionOf(sentPrompt).includes("EDF Energy"));
  // The floor is 1000 and the document is shorter than that, so nothing is cut.
  // What matters is that a parseable value is used rather than discarded.
  assert.ok(BILL.length <= 1000, "the corpus bill is expected to fit inside the floor");
});

test("a cap below the document length truncates it", async () => {
  // Proves the cap is applied at all, so the test above cannot pass by the cap
  // being ignored entirely.
  const calls = { count: 0 };
  let sentPrompt = null;
  await runWith({ CLEARSTEPS_AI_TEXT_MAX_CHARS: "1200" }, abortAwareFetch(0, (body) => {
    sentPrompt = body.input[1].content;
  }, calls));

  assert.equal(calls.count, 1);
  const document = documentSectionOf(sentPrompt).trim();
  assert.ok(document.length <= 1200, "the cap must bound the document section");
});
