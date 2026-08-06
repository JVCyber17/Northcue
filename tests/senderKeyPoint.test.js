// The composed, protected sender line on card 1, pinned at every gate.
//
// Founder's order, 6 August 2026, resolving item B: the sender appeared on
// translated card 1 in 0 of 30 measured runs because it depended on the
// model's key-point lottery. It now rides the same provenance mechanism as
// the contact number: composed by the engine from the fact candidate,
// protected through the sanitiser, deduped against the model naming it in
// its own words, and yielding its seat to an advice boundary so no card
// grows past the viewport.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const factCandidates = require(path.join(ROOT, "src", "utils", "factCandidates"));
const { runClearStepsEngine } = require(path.join(ROOT, "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(ROOT, "scripts", "engine-baseline", "corpus"));
const FACTS = require(path.join(ROOT, "tests", "fixtures", "corpus-facts.json"));

const META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "sender-pin" };
const PREFIX = factCandidates.SENDER_KEY_POINT_PREFIX;

function factRun(id) {
  const entry = CORPUS.find((e) => e.id === id);
  return runClearStepsEngine({ extractedText: entry.text, fileMeta: META, facts: FACTS[id] || null });
}

test("the candidate's gates", async (t) => {
  await t.test("a clean sender passes verbatim", () => {
    const source = "A letter.\nSevern Vale Energy Limited, registered in England.";
    assert.equal(factCandidates.senderCandidate({
      facts: { sender: "Severn Vale Energy Limited" }, sourceText: source
    }), "Severn Vale Energy Limited");
  });

  await t.test("a field label is refused: guessSender's recorded defect", () => {
    ["Supply address:", "Property Reference No.", "Customer reference:"].forEach((label) => {
      assert.equal(factCandidates.senderCandidate({
        facts: { sender: label }, sourceText: "x " + label + " y"
      }), null, label);
    });
  });

  await t.test("an address-bearing sender is refused whole: outgoing_letter's shape", () => {
    const value = "Priya Sharma, 14 Sutton Court Road, Hounslow, TW3 8SG";
    assert.equal(factCandidates.senderCandidate({
      facts: { sender: value }, sourceText: "From " + value + "."
    }), null);
  });

  await t.test("a sender the source never states is refused", () => {
    assert.equal(factCandidates.senderCandidate({
      facts: { sender: "Invented Energy plc" }, sourceText: "A bill from someone else."
    }), null);
  });
});

test("the composed line on the engine floor", async (t) => {
  await t.test("the twin composes and protects it, last on card 1", () => {
    const card = factRun("energy_quarterly_footer_sender").api_output.structured_result.cards[0];
    const line = PREFIX + "Severn Vale Energy Limited.";
    assert.equal(card.key_points[card.key_points.length - 1], line);
    assert.ok(card.protected_key_points.includes(line), "the line must be protected");
  });

  await t.test("it yields its seat to the advice boundary", () => {
    // The five caveat-bearing documents measured 732 to 886px with the line;
    // the caution stays and the line does not appear.
    ["eviction_possession", "court_fine"].forEach((id) => {
      const card = factRun(id).api_output.structured_result.cards[0];
      assert.ok(card.key_points.some((p) => p.includes("not fully trained")),
        id + ": premise, the caveat is on the card");
      assert.ok(!card.key_points.some((p) => p.startsWith(PREFIX)),
        id + ": the sender line must yield to the boundary");
      assert.ok(!card.protected_key_points.some((p) => p.startsWith(PREFIX)),
        id + ": protection must match the yield");
    });
  });

  await t.test("without facts there is no line, and the floor is unchanged", () => {
    const entry = CORPUS.find((e) => e.id === "energy_quarterly_footer_sender");
    const card = runClearStepsEngine({ extractedText: entry.text, fileMeta: META })
      .api_output.structured_result.cards[0];
    assert.ok(!card.key_points.some((p) => p.startsWith(PREFIX)));
  });
});

test("the model-side dedupe through the sanitiser", () => {
  const { sanitizeStructuredResultWithVerdict } =
    require(path.join(ROOT, "src", "utils", "validateStructuredResult"));
  const fallback = factRun("energy_quarterly_footer_sender").api_output.structured_result;
  const candidate = JSON.parse(JSON.stringify(fallback));
  // The model names the sender in its own words among its key points.
  candidate.cards[0].key_points = [
    "The bill comes from Severn Vale Energy Limited this quarter.",
    "The total now due is £129.16."
  ];
  const sanitized = sanitizeStructuredResultWithVerdict(candidate, fallback,
    CORPUS.find((e) => e.id === "energy_quarterly_footer_sender").text).result;
  const points = sanitized.cards[0].key_points;
  assert.ok(points.some((p) => p.startsWith(PREFIX)),
    "the protected line must be present");
  assert.ok(!points.some((p) => p.includes("comes from Severn Vale")),
    "the model's own-words sender point must give up its seat");
  assert.ok(points.some((p) => p.includes("£129.16")),
    "an unrelated model point must survive");
});
