// Guards the honesty of the AI metadata, and the promise that making it honest
// changed nothing a reader receives.
//
// THE DEFECT. sanitizeStructuredResult rebuilds the candidate and validates its
// OWN output, returning the fallback when that fails. It returned it silently.
// applyAiStructuredResult then validated that, which is the engine's own result
// and therefore always valid, and recorded ai_status "completed", ai_used true,
// ai_error_code null. A run where nothing the model wrote reached the reader was
// indistinguishable, in document_sessions and in analytics, from one where it
// all did.
//
// Measured live on 1 August 2026 across the 28 eligible corpus documents: three
// were discarded here while reporting success, and every one of them was high
// stakes. bailiff_enforcement and eviction_possession on the command family,
// legal_solicitor on a date it had calculated rather than read.
//
// THE SHAPE OF THE FIX. Metadata only. The assignments to structured_result,
// display_text and tts_script stay unconditional, so both paths serve what they
// served before. That mattered more than it looks: the engine's own
// display_text is built from cards[].short_answer while the AI path derives it
// from structured_result.cards, and those two differ on 29 of the 36 corpus
// documents. Returning early on rejection would have quietly changed the served
// bytes on all 29.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { applyAiStructuredResult } = require(path.join(__dirname, "..", "src", "services", "aiStructuredResultService"));
const {
  sanitizeStructuredResult,
  sanitizeStructuredResultWithVerdict
} = require(path.join(__dirname, "..", "src", "utils", "validateStructuredResult"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

const engineFor = (text, id) => runClearStepsEngine({
  extractedText: text,
  fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "verdict-" + id }
});

const clone = (value) => JSON.parse(JSON.stringify(value));

// An obligation addressed to the reader, carrying no date, so exactly one guard
// fires and the reported reason stays legible.
const COMMAND = "You must contact the sender.";
const CLEAN = "A calm rewrite of this card, with nothing a guard could object to.";

// Runs the real path with a stubbed provider response, so the candidate is
// controlled and the test needs no network.
async function runWithCandidate(text, id, mutate) {
  const fallback = clone(engineFor(text, id).api_output.structured_result);
  const candidate = clone(fallback);
  mutate(candidate);

  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = async () => new Response(JSON.stringify({
    model: "stub", id: "stub", output_text: JSON.stringify(candidate)
  }), { status: 200, headers: { "Content-Type": "application/json" } });

  try {
    const run = await applyAiStructuredResult({ rulesRun: engineFor(text, id), extractedText: text, language: "en" });
    return { run, fallback };
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
}

const rejectedCandidate = (candidate) => {
  candidate.cards[0].simple_explanation = CLEAN;
  candidate.cards[2].key_points = [COMMAND];
};
const acceptedCandidate = (candidate) => {
  candidate.cards[0].simple_explanation = CLEAN;
};

const BILL = CORPUS.find((entry) => entry.id === "energy_bill").text;

// ─── the verdict itself ──────────────────────────────────────────────────────

test("the sanitiser reports whether it rejected the candidate", async (t) => {
  const fallback = engineFor(BILL, "energy_bill").api_output.structured_result;

  await t.test("a clean candidate is accepted", () => {
    const candidate = clone(fallback);
    acceptedCandidate(candidate);
    const verdict = sanitizeStructuredResultWithVerdict(candidate, fallback, BILL);
    assert.equal(verdict.rejected, false);
    assert.deepEqual(verdict.errors, []);
    assert.equal(verdict.result.cards[0].simple_explanation, CLEAN);
  });

  await t.test("a candidate carrying a command is rejected, with the reason", () => {
    const candidate = clone(fallback);
    rejectedCandidate(candidate);
    const verdict = sanitizeStructuredResultWithVerdict(candidate, fallback, BILL);
    assert.equal(verdict.rejected, true);
    assert.ok(verdict.errors.length > 0, "a rejection must carry its reason");
    assert.match(verdict.errors.join("\n"), /unsafe advice/i);
  });

  await t.test("a rejected verdict hands back the fallback BY REFERENCE", () => {
    // Callers compare this by identity. Returning a copy would pass a deep
    // equality check and break them.
    const candidate = clone(fallback);
    rejectedCandidate(candidate);
    assert.equal(sanitizeStructuredResultWithVerdict(candidate, fallback, BILL).result, fallback);
  });
});

test("the original sanitizeStructuredResult contract is unchanged", async (t) => {
  const fallback = engineFor(BILL, "energy_bill").api_output.structured_result;

  await t.test("it still returns the object, not the verdict", () => {
    const candidate = clone(fallback);
    acceptedCandidate(candidate);
    assert.equal(sanitizeStructuredResult(candidate, fallback, BILL).cards[0].simple_explanation, CLEAN);
  });

  await t.test("it still returns the fallback itself on rejection", () => {
    const candidate = clone(fallback);
    rejectedCandidate(candidate);
    assert.equal(sanitizeStructuredResult(candidate, fallback, BILL), fallback);
  });
});

// ─── the metadata, through the real path ─────────────────────────────────────

test("a discarded model answer is recorded as a fallback, not a completion", async (t) => {
  const { run } = await runWithCandidate(BILL, "energy_bill", rejectedCandidate);
  const ai = run.api_output.debug.ai;

  await t.test("it does not claim success", () => {
    assert.equal(ai.ai_status, "fallback");
    assert.equal(ai.ai_used, false);
  });

  await t.test("it names where the rejection happened", () => {
    // Distinct from invalid_structured_result on purpose. That one means the
    // output failed AFTER the stripper rewrote it; this one means the model's
    // own output failed a guard.
    assert.equal(ai.ai_error_code, "sanitizer_rejected");
  });

  await t.test("it carries the reason", () => {
    assert.ok(Array.isArray(ai.validation_errors));
    assert.ok(ai.validation_errors.length > 0);
    assert.match(ai.validation_errors.join("\n"), /unsafe advice/i);
  });
});

test("an accepted model answer is still recorded as a completion", async () => {
  const { run } = await runWithCandidate(BILL, "energy_bill", acceptedCandidate);
  const ai = run.api_output.debug.ai;
  assert.equal(ai.ai_status, "completed");
  assert.equal(ai.ai_used, true);
  assert.equal(ai.ai_error_code, null);
  assert.equal(run.api_output.structured_result.cards[0].simple_explanation, CLEAN);
});

// ─── the served bytes, for every corpus document ─────────────────────────────

test("telling the truth changed nothing the reader receives", async (t) => {
  // The invariant, stated in a form that does not need a golden file: on a
  // sanitiser rejection the reader gets the ENGINE's cards, and the derived
  // text fields are derived from those cards rather than from the engine's own
  // display_text. Both halves matter. Without the second, an implementation
  // that returned early on rejection would pass while changing the served
  // display_text on 29 of these 36 documents.
  let eligible = 0;
  let discriminating = 0;

  for (const entry of CORPUS) {
    const { run, fallback } = await runWithCandidate(entry.text, entry.id, rejectedCandidate);
    const out = run.api_output;
    if (out.debug.ai.ai_status === "skipped") continue;
    eligible += 1;

    await t.test(entry.id, () => {
      assert.equal(out.debug.ai.ai_error_code, "sanitizer_rejected", entry.id);
      assert.deepEqual(out.structured_result, fallback,
        entry.id + ": the reader must get the engine's cards");

      const derivedDisplay = out.structured_result.cards
        .map((card) => `${card.title} ${card.simple_explanation}`).join("\n");
      const derivedTts = out.structured_result.cards.map((card) => card.read_aloud_text).join("\n");
      assert.equal(out.display_text, derivedDisplay, entry.id + ": display_text");
      assert.equal(out.tts_script, derivedTts, entry.id + ": tts_script");

      assert.deepEqual(run.structured_output.structured_result, out.structured_result, entry.id);
      assert.equal(run.structured_output.display_text, out.display_text, entry.id);
      assert.equal(run.structured_output.tts_script, out.tts_script, entry.id);
    });

    // Is the display_text assertion above actually discriminating for this
    // document, or would any implementation satisfy it?
    const engineDisplay = engineFor(entry.text, entry.id).api_output.display_text;
    if (engineDisplay !== out.display_text) discriminating += 1;
  }

  await t.test("the corpus is big enough for this to mean something", () => {
    assert.ok(eligible >= 25, "expected most of the corpus to reach the AI path, got " + eligible);
  });

  await t.test("the display_text assertion is not vacuous", () => {
    // If these two derivations ever coincide everywhere, the assertion above
    // stops catching an early return and this says so out loud.
    assert.ok(discriminating >= 20,
      "expected the two display_text derivations to differ on most documents, got " + discriminating);
  });
});
