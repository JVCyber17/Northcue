// D3 tier 1. The fact extractor runs beside the phrasing pass and serves
// nothing, so the tests are in two halves: what the validator catches, and the
// proof that none of it can reach a reader.
//
// The validator half matters most. Under D3 the AI stops writing sentences and
// starts returning values, and a value can be checked against the page in a way
// a sentence never could: it either appears in the document or it does not.
// That single rule subsumes most of what UNSAFE_ADVICE_PATTERNS exists for,
// because a model that can only return what is printed cannot write a command,
// a postcode, a street or a computed date.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const {
  FACT_SCHEMA_VERSION,
  AMOUNT_ROLES, DATE_ROLES, OBLIGATION_KINDS, CONSEQUENCE_KINDS,
  buildFactSystemPrompt, validateFacts, extractFacts
} = require(path.join(__dirname, "..", "src", "services", "aiFactExtractionService"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { providerSkipReason } = require(path.join(__dirname, "..", "src", "services", "aiStructuredResultService"));
// The ORDER is the thing under test in this section, so it runs through the
// route's orchestration rather than through either service alone.
const { analyseDocumentText } = require(path.join(__dirname, "..", "src", "routes", "simplifyRoute"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

const byId = (id) => CORPUS.find((entry) => entry.id === id).text;
const BAILIFF = byId("bailiff_enforcement");
const SOLICITOR = byId("legal_solicitor");

// A fact object that is true of bailiff_enforcement, used as the clean case and
// then broken one field at a time.
const cleanFacts = () => ({
  document_language: "en",
  sender: "Marston Holdings Enforcement Agents",
  reference: "EN-77120934",
  amounts: [
    { value: "£1,247.00", role: "total_due" },
    { value: "£235.00", role: "fee" }
  ],
  dates: [
    { value: "20 August 2026", role: "letter_date" },
    { value: "3 September 2026", role: "deadline" }
  ],
  obligation: { kind: "contact", sentence: "You must contact us on 0333 320 122 by 3 September 2026." },
  consequence: {
    kind: "remove_goods",
    conditional: true,
    sentence: "If payment is not received by this date, an enforcement agent may attend your property and remove goods belonging to you."
  },
  account_in_credit: false
});

// ─── the verbatim rule ───────────────────────────────────────────────────────

test("every value must appear in the document", async (t) => {
  await t.test("a fact set copied from the page is accepted", () => {
    const result = validateFacts(cleanFacts(), BAILIFF);
    assert.deepEqual(result.errors, []);
    assert.equal(result.valid, true);
    assert.equal(result.metrics.verbatim_failed, 0);
    assert.ok(result.metrics.verbatim_checked >= 8, "expected several values to be checked");
  });

  const BREAKS = [
    ["sender", (f) => { f.sender = "Marston Holdings Debt Recovery Limited"; }],
    ["reference", (f) => { f.reference = "EN-77120935"; }],
    ["amounts[0].value", (f) => { f.amounts[0].value = "£1,274.00"; }],
    ["dates[1].value", (f) => { f.dates[1].value = "13 September 2026"; }],
    ["obligation.sentence", (f) => { f.obligation.sentence = "You must contact us today or an agent will attend."; }],
    ["consequence.sentence", (f) => { f.consequence.sentence = "Your goods will be seized without further notice."; }]
  ];

  for (const [field, mutate] of BREAKS) {
    await t.test(field + " invented", () => {
      const facts = cleanFacts();
      mutate(facts);
      const result = validateFacts(facts, BAILIFF);
      assert.equal(result.valid, false, field + " should not have been accepted");
      assert.match(result.errors.join("\n"), new RegExp(field.replace(/[[\]]/g, "\\$&") + " does not appear"));
      assert.equal(result.metrics.verbatim_failed, 1);
    });
  }

  await t.test("a sentence that spans a line break in the source still counts", () => {
    // eviction_possession's consequence runs across two lines. Arriving as one
    // line is a formatting difference, not an invention.
    const source = "If the arrears are not cleared we will apply to the county court.\nThis could lead to eviction.";
    const facts = {
      amounts: [], dates: [],
      consequence: {
        kind: "eviction", conditional: true,
        sentence: "If the arrears are not cleared we will apply to the county court. This could lead to eviction."
      }
    };
    assert.deepEqual(validateFacts(facts, source).errors, []);
  });

  await t.test("a letterhead in capitals is the same sender", () => {
    assert.deepEqual(validateFacts({ sender: "thames water", amounts: [], dates: [] }, "THAMES WATER\nFinal notice").errors, []);
  });
});

// ─── the enums ───────────────────────────────────────────────────────────────

test("a value outside its vocabulary is rejected", async (t) => {
  const cases = [
    ["amounts[0].role", (f) => { f.amounts[0].role = "late_fee"; }],
    ["dates[0].role", (f) => { f.dates[0].role = "due"; }],
    ["obligation.kind", (f) => { f.obligation.kind = "call_them"; }],
    ["consequence.kind", (f) => { f.consequence.kind = "bailiff"; }]
  ];
  for (const [field, mutate] of cases) {
    await t.test(field, () => {
      const facts = cleanFacts();
      mutate(facts);
      const result = validateFacts(facts, BAILIFF);
      assert.equal(result.valid, false);
      assert.match(result.errors.join("\n"), new RegExp(field.replace(/[[\]]/g, "\\$&") + " is not one of"));
    });
  }

  await t.test("consequence.conditional must be a boolean", () => {
    const facts = cleanFacts();
    facts.consequence.conditional = "true";
    assert.match(validateFacts(facts, BAILIFF).errors.join("\n"), /conditional must be a boolean/);
  });

  await t.test("the prompt names every vocabulary the validator enforces", () => {
    // Prompt and validator drifting apart would mean rejecting a model that did
    // as it was told, which is the failure mode Phase D was full of.
    const prompt = buildFactSystemPrompt();
    [...AMOUNT_ROLES, ...DATE_ROLES, ...OBLIGATION_KINDS, ...CONSEQUENCE_KINDS].forEach((value) => {
      assert.ok(prompt.includes(value), "the prompt never mentions " + value);
    });
  });
});

// ─── the anchor invention, caught at the field ───────────────────────────────

test("a period labelled as a deadline is caught", async (t) => {
  // THE ONE THAT PROSE COULD NOT CATCH. legal_solicitor says "within 14 days"
  // and prints 11 July 2026, and the model has twice tried to make a deadline
  // out of the pair: once by calculating 25 July, once by asserting "within 14
  // days of 11 July 2026" in a sentence. Both halves are on the page, so a
  // substring rule alone still passes them. Here the relation IS the field.
  await t.test("\"14 days\" is on the page and is still not a deadline", () => {
    const facts = { amounts: [], dates: [{ value: "14 days", role: "deadline" }] };
    const result = validateFacts(facts, SOLICITOR);
    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), /labelled a deadline but is not a date/);
    assert.equal(result.metrics.relative_deadline, true);
  });

  await t.test("the same period under an honest role is fine", () => {
    const facts = { amounts: [], dates: [{ value: "14 days", role: "other" }] };
    assert.deepEqual(validateFacts(facts, SOLICITOR).errors, []);
  });

  await t.test("a real date passes, in every language the bank supports", () => {
    // THE FIRST VERSION OF THIS RULE FAILED HERE, on Spanish. It required the
    // month name to sit directly beside the day, which is true of English and
    // Polish and false of "15 de junio de 2026". Run over the corpus it
    // rejected a correct Spanish deadline: an English shaped rule quietly
    // discarding a correct non English fact, committed inside the guard that
    // exists to end exactly that.
    [
      "3 September 2026", "03/09/2026", "2026-09-03", "September 3, 2026", "28 May 26",
      "4 września 2026", "4 septembrie 2026", "15 de junio de 2026", "15 de junho de 2026",
      "mardi 7 juillet 2026", "15 जून 2026", "১৫ জুন ২০২৬"
    ].forEach((value) => {
      const source = "Payment is due by " + value + ".";
      const result = validateFacts({ amounts: [], dates: [{ value, role: "deadline" }] }, source);
      assert.deepEqual(result.errors, [], value + " should be accepted as a date");
    });
  });

  await t.test("a period is still refused, in every language", () => {
    ["14 days", "within 24 hours", "within 14 days", "7 working days", "2 weeks",
      "30 dni", "dans 14 jours", "as soon as possible", "immediately"].forEach((value) => {
      const source = "You must respond " + value + ".";
      const result = validateFacts({ amounts: [], dates: [{ value, role: "deadline" }] }, source);
      assert.match(result.errors.join("\n"), /labelled a deadline but is not a date/,
        JSON.stringify(value) + " should not be accepted as a date");
    });
  });
});

// ─── the measurement entry point cannot hurt anyone ──────────────────────────

const withStubbedFetch = async (impl, body) => {
  const original = global.fetch;
  global.fetch = impl;
  try { return await body(); } finally { global.fetch = original; }
};

test("extractFacts never throws", async (t) => {
  // Tier 2 returns { facts, debug }. `facts` is null on every failure, which IS
  // the failure path: the engine keeps its own reading.
  const call = async () => (await extractFacts({
    documentText: BAILIFF, model: "gpt-4.1-mini", apiKey: "test-key", timeoutMs: 500
  })).debug;

  await t.test("a network failure", async () => {
    const out = await withStubbedFetch(async () => { throw new Error("network down"); }, call);
    assert.equal(out.facts_status, "failed");
    assert.equal(out.facts_error_code, "network_down");
  });

  await t.test("an HTTP error", async () => {
    const out = await withStubbedFetch(async () => new Response("nope", { status: 500 }), call);
    assert.equal(out.facts_status, "failed");
    assert.equal(out.facts_error_code, "openai_http_500");
  });

  await t.test("a response with no JSON in it", async () => {
    const out = await withStubbedFetch(async () => new Response(JSON.stringify({ output_text: "I cannot help with that." }), { status: 200 }), call);
    assert.equal(out.facts_status, "failed");
    assert.equal(out.facts_error_code, "facts_json_not_found");
  });

  await t.test("an empty response", async () => {
    const out = await withStubbedFetch(async () => new Response(JSON.stringify({}), { status: 200 }), call);
    assert.equal(out.facts_status, "failed");
    assert.equal(out.facts_error_code, "empty_fact_response");
  });

  await t.test("a timeout", async () => {
    const out = await withStubbedFetch((url, init) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(new Response("{}", { status: 200 })), 5000);
      init.signal.addEventListener("abort", () => { clearTimeout(timer); const e = new Error("x"); e.name = "AbortError"; reject(e); });
    }), call);
    assert.equal(out.facts_status, "failed");
    assert.equal(out.facts_error_code, "facts_timeout");
  });

  await t.test("no API key, with no request attempted", async () => {
    let called = false;
    const out = await withStubbedFetch(async () => { called = true; return new Response("{}"); }, () =>
      extractFacts({ documentText: BAILIFF, model: "m", apiKey: "", timeoutMs: 500 }).then((r) => r.debug));
    assert.equal(called, false);
    assert.equal(out.facts_status, "skipped");
    assert.equal(out.facts_error_code, "missing_api_key");
  });
});

test("the measurement carries no document content", async () => {
  // debug travels to the browser in the API response. Counts, roles and kinds
  // are safe to put there; a sender, an amount, a date or a quoted sentence is
  // not, and the corpus harness reads those in process instead.
  const out = await withStubbedFetch(
    async () => new Response(JSON.stringify({ output_text: JSON.stringify(cleanFacts()) }), { status: 200 }),
    () => extractFacts({ documentText: BAILIFF, model: "m", apiKey: "k", timeoutMs: 2000 }).then((r) => r.debug));

  assert.equal(out.facts_status, "completed");
  const serialised = JSON.stringify(out);
  [
    "Marston Holdings", "EN-77120934", "£1,247.00", "£235.00",
    "3 September 2026", "20 August 2026", "0333 320 122",
    "remove goods belonging to you", "You must contact us"
  ].forEach((value) => {
    assert.ok(!serialised.includes(value), "the debug payload leaked " + JSON.stringify(value));
  });

  // What it does carry is the shape.
  assert.equal(out.facts_metrics.consequence_kind, "remove_goods");
  assert.equal(out.facts_metrics.amount_count, 2);
  assert.deepEqual(out.facts_metrics.date_roles, { letter_date: 1, deadline: 1 });
  assert.equal(out.facts_schema, FACT_SCHEMA_VERSION);
});

// ─── the wiring: same gates, no reader impact ────────────────────────────────

const engineFor = (text) => runClearStepsEngine({
  extractedText: text,
  fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "facts-wiring" }
});

// Classifies the two requests this path now makes, so the tests can talk about
// them separately.
function stubBoth({ factImpl, phrasingImpl }) {
  return async (url, init) => {
    const body = JSON.parse(init.body);
    const system = String(body.input[0].content || "");
    return system.includes("extraction layer") ? factImpl(init) : phrasingImpl(init);
  };
}

const okPhrasing = (fallback) => async () => new Response(JSON.stringify({
  output_text: JSON.stringify(fallback)
}), { status: 200 });

// The model is shown the REDACTED text, so a sentence it copies from a line
// carrying a phone number comes back carrying [phone]. That is the honest
// answer and the validator is right to demand it, since the redacted text is
// the only document the model ever saw. Recorded here because it is a
// constraint on tier 2: the composer will have to put the real number back,
// which the engine already holds from extractContactNumber.
const cleanFactsAsSeenThroughRedaction = () => {
  const facts = cleanFacts();
  facts.obligation.sentence = "You must contact us on [phone] by 3 September 2026.";
  return facts;
};

async function runPath(text, { language = "en", factImpl } = {}) {
  const fallback = JSON.parse(JSON.stringify(engineFor(text).api_output.structured_result));
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  try {
    return await withStubbedFetch(
      stubBoth({
        factImpl: factImpl || (async () => new Response(JSON.stringify({ output_text: JSON.stringify(cleanFactsAsSeenThroughRedaction()) }), { status: 200 })),
        phrasingImpl: okPhrasing(fallback)
      }),
      () => analyseDocumentText(text, { mimeType: "application/pdf", selectedCategory: "auto", jobId: "fact-test", interfaceLanguage: language })
    );
  } finally {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
}

test("the extractor runs behind the same gates and changes nothing served", async (t) => {
  await t.test("it records a measurement on the run path", async () => {
    const run = await runPath(BAILIFF);
    assert.equal(run.api_output.debug.ai_facts.facts_status, "completed");
    assert.equal(run.api_output.debug.ai_facts.facts_schema, FACT_SCHEMA_VERSION);
  });

  await t.test("a gated document reaches neither the phrasing pass nor the extractor", async () => {
    // One case per gate that fires on a corpus document.
    const GATED = [
      ["scam_phishing", "verification_only_state"],
      ["non_document_recipe", "unsupported_or_non_document"],
      ["ocr_heavy_damage", "low_quality_input"]
    ];
    for (const [id, code] of GATED) {
      let requests = 0;
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = "test-key";
      try {
        const run = await withStubbedFetch(async () => { requests += 1; return new Response("{}", { status: 200 }); },
          () => analyseDocumentText(byId(id), { mimeType: "application/pdf", selectedCategory: "auto", jobId: "gate", interfaceLanguage: "en" }));
        assert.equal(requests, 0, id + " sent a request");
        assert.equal(run.api_output.debug.ai.ai_error_code, code, id);
        assert.equal(run.api_output.debug.ai_facts.facts_status, "skipped", id);
        assert.equal(run.api_output.debug.ai_facts.facts_error_code, code, id);
      } finally {
        if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
        else process.env.OPENAI_API_KEY = originalKey;
      }
    }
  });

  await t.test("the language gate still stops both", async () => {
    let requests = 0;
    const originalKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-key";
    try {
      const run = await withStubbedFetch(async () => { requests += 1; return new Response("{}", { status: 200 }); },
        () => analyseDocumentText(BAILIFF, { mimeType: "application/pdf", selectedCategory: "auto", jobId: "lang", interfaceLanguage: "pl" }));
      assert.equal(requests, 0, "a non English interface must send nothing");
      assert.equal(run.api_output.debug.ai_facts.facts_error_code, "non_english_language");
    } finally {
      if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = originalKey;
    }
  });

  await t.test("the outbound document text is the redacted, capped text", async () => {
    let sent = null;
    await runPath(BAILIFF, {
      factImpl: async (init) => {
        sent = JSON.parse(init.body).input[1].content;
        return new Response(JSON.stringify({ output_text: "{}" }), { status: 200 });
      }
    });
    assert.ok(sent.includes("Marston Holdings"), "the document must reach the extractor");
    assert.ok(!sent.includes("0333 320 122"), "the phone number must be redacted, exactly as on the phrasing pass");
    assert.ok(sent.includes("[phone]"));
  });

  await t.test("a failing extractor serves the fact-less floor, nothing else", async () => {
    // REWRITTEN 6 August 2026 with the composed sender line. Facts now
    // change what is served BY DESIGN: the fact-fed floor carries card 1's
    // protected sender line and the fact-less floor does not. So the
    // failure path's comparison target is the fact-less run, and the
    // difference between fact-fed and fact-less is pinned to be exactly
    // that one line, so any second divergence still fails here.
    const good = await runPath(BAILIFF);
    const bad = await runPath(BAILIFF, { factImpl: async () => { throw new Error("network down"); } });
    const factless = await runPath(BAILIFF, {
      factImpl: async () => new Response(JSON.stringify({ output_text: "{}" }), { status: 200 })
    });

    assert.equal(bad.api_output.debug.ai_facts.facts_status, "failed");
    ["structured_result", "display_text", "tts_script", "cards", "banner", "trust"].forEach((field) => {
      assert.deepEqual(bad.api_output[field], factless.api_output[field],
        field + " moved between the failed and the fact-less run");
    });

    const SENDER_PREFIX = "The document names this sender: ";
    const goodPoints = good.api_output.structured_result.cards[0].key_points;
    const badPoints = bad.api_output.structured_result.cards[0].key_points;
    assert.ok(goodPoints.some((point) => point.startsWith(SENDER_PREFIX)),
      "premise: the fact-fed floor composes the sender line");
    assert.deepEqual(badPoints, goodPoints.filter((point) => !point.startsWith(SENDER_PREFIX)),
      "the fact-fed and fact-less floors must differ by the sender line alone");
  });

  await t.test("a sentence quoting a redacted value must come back redacted", async () => {
    // A TIER 2 CONSTRAINT, found here. The model is shown the redacted text, so
    // the only truthful copy of bailiff_enforcement's obligation sentence
    // carries [phone] where the number was. The unredacted sentence fails the
    // verbatim rule, correctly: the model could only have produced it by
    // knowing something it was never shown.
    const withPlaceholder = await runPath(BAILIFF);
    assert.equal(withPlaceholder.api_output.debug.ai_facts.facts_status, "completed");

    const withRealNumber = await runPath(BAILIFF, {
      factImpl: async () => new Response(JSON.stringify({ output_text: JSON.stringify(cleanFacts()) }), { status: 200 })
    });
    // Tier 2 validates FIELD BY FIELD, so the object is still "completed" and
    // the one bad field is named. Under tier 1's all-or-nothing rule this
    // discarded the sender, the amounts, the dates and the consequence too.
    assert.equal(withRealNumber.api_output.debug.ai_facts.facts_status, "completed");
    assert.match(withRealNumber.api_output.debug.ai_facts.facts_field_errors.join("\n"),
      /obligation\.sentence does not appear/);
  });

  // The budget assertion that used to live here required it to sit below the
  // fastest phrasing call, because its only job was to finish before that pass.
  // The pass is gone and the budget was re-measured against its own evidence.
  // See factExtractionBudget.test.js, which carries the distribution.
});
