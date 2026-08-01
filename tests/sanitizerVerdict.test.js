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

// The three sections that ran through applyAiStructuredResult are gone with
// the phrasing pass: there is no candidate to sanitise because nothing asks a
// model for one. What survives above is the unit level guard on the verdict
// itself, which stays meaningful for as long as validateStructuredResult.js
// stays in the tree.
//
// The served-bytes assertions those sections carried are not lost. The stronger
// version now lives in factFailurePath.test.js, which compares every served
// field across all forty documents under four failure modes.
