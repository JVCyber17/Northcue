// THE FAILURE PATH, proved the way tier 1's "serves nothing" was proved.
//
// Tier 2 lets the engine read fact candidates. The promise attached to that is
// that an extractor which errors, times out, returns nothing or returns
// unusable facts leaves the reader with exactly the reading the engine would
// have produced on its own, byte for byte, with no difference beyond content
// quality.
//
// That promise is structural rather than defended by a branch: the engine
// computes its own reading FIRST and in full, and every fact is applied on top
// only where it survives adjudication. So the proof is a comparison, over every
// corpus document, of the four ways the extractor can fail against the path
// where it was never invited at all.
//
// The comparison covers every field the API returns to the browser except the
// AI metadata, which is where the difference is supposed to show.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { analyseDocumentText } = require(path.join(__dirname, "..", "src", "routes", "simplifyRoute"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

const SERVED = ["structured_result", "display_text", "tts_script", "cards", "banner", "trust"];

const META = (id) => ({
  mimeType: "application/pdf", selectedCategory: "auto",
  jobId: "failure-path", interfaceLanguage: "en"
});

// The phrasing pass is stubbed to fail on every run, identically, so the only
// variable between the runs below is the extractor. A phrasing pass that
// succeeded would introduce model text and hide the thing being measured.
function stubFetch(factImpl) {
  return async (url, init) => {
    const body = init && init.body ? JSON.parse(init.body) : {};
    const system = String(body.input && body.input[0] && body.input[0].content || "");
    if (system.includes("extraction layer")) return factImpl(init);
    throw new Error("phrasing disabled for this test");
  };
}

async function analyse(text, factImpl) {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = stubFetch(factImpl);
  try {
    return await analyseDocumentText(text, META());
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
}

// The baseline: the extractor is never invited, because the interface language
// is not English. This is the reading the engine produces on its own.
async function analyseWithoutFacts(text) {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = async () => { throw new Error("nothing may be sent on this path"); };
  try {
    return await analyseDocumentText(text, Object.assign(META(), { interfaceLanguage: "pl" }));
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
}

const FAILURES = [
  ["the extractor errors", async () => { throw new Error("network down"); }],
  ["the extractor times out", () => new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(new Response("{}", { status: 200 })), 30000);
    // The abort arrives from the service's own controller.
    setTimeout(() => { clearTimeout(timer); const e = new Error("x"); e.name = "AbortError"; reject(e); }, 5);
  })],
  ["the extractor returns nothing usable", async () =>
    new Response(JSON.stringify({ output_text: "I cannot help with that." }), { status: 200 })],
  ["the extractor returns facts that fail every field rule", async () =>
    new Response(JSON.stringify({
      output_text: JSON.stringify({
        document_language: "en",
        // None of this is on any corpus document, so every field fails the
        // verbatim rule, and the deadline is a period as well.
        sender: "Ministry of Invented Letters",
        reference: "ZZ-00000000",
        amounts: [{ value: "£99,999.99", role: "total_due" }],
        dates: [{ value: "within 14 days", role: "deadline" }],
        obligation: { kind: "pay", sentence: "You must pay the invented amount at once." },
        consequence: { kind: "eviction", conditional: true, sentence: "An invented consequence will follow." },
        account_in_credit: false
      })
    }), { status: 200 })]
];

test("a failing extractor leaves the reader exactly where the engine left them", async (t) => {
  for (const entry of CORPUS) {
    const baseline = await analyseWithoutFacts(entry.text);

    for (const [label, factImpl] of FAILURES) {
      await t.test(entry.id + " / " + label, async () => {
        const run = await analyse(entry.text, factImpl);
        SERVED.forEach((field) => {
          assert.deepEqual(run.api_output[field], baseline.api_output[field],
            entry.id + " / " + label + ": " + field + " moved");
        });
        assert.deepEqual(run.structured_output.structured_result,
          baseline.structured_output.structured_result, entry.id + " / " + label + ": mirror moved");
      });
    }
  }
});

test("the failure is reported rather than hidden", async (t) => {
  const bailiff = CORPUS.find((e) => e.id === "bailiff_enforcement").text;

  await t.test("an error is named", async () => {
    const run = await analyse(bailiff, async () => { throw new Error("network down"); });
    assert.equal(run.api_output.debug.ai_facts.facts_status, "failed");
    assert.equal(run.api_output.debug.ai_facts.facts_error_code, "network_down");
  });

  await t.test("unusable output is named", async () => {
    const run = await analyse(bailiff, async () =>
      new Response(JSON.stringify({ output_text: "no" }), { status: 200 }));
    assert.equal(run.api_output.debug.ai_facts.facts_status, "failed");
    assert.equal(run.api_output.debug.ai_facts.facts_error_code, "facts_json_not_found");
  });

  await t.test("facts that arrived but were rejected field by field are named", async () => {
    const run = await analyse(bailiff, FAILURES[3][1]);
    assert.equal(run.api_output.debug.ai_facts.facts_status, "completed");
    const errors = run.api_output.debug.ai_facts.facts_field_errors.join("\n");
    assert.match(errors, /sender does not appear/);
    assert.match(errors, /is labelled a deadline but is not a date/);
  });
});
