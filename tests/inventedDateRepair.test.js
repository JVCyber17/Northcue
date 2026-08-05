// AN INVENTED DATE REACHES NO READER, AND COSTS NO READER THE OTHER FIVE CARDS.
//
// WRITTEN FAILING FIRST, on 5 August 2026, before the repair path existed. The
// old behaviour rejected the WHOLE result over one invented date, so the
// invented date never reached a reader but every clean sentence the model
// wrote was discarded with it. Production measured that cost on one 702KB
// bill: two uploads in five lost all six cards over a single date the
// canonicaliser could not yet match.
//
// The repair path keeps the protection and drops the collateral: an invented
// date field takes the engine's value, an offending sentence is removed with
// the engine's answer standing in where it was the answer, and a repair that
// cannot complete safely falls back to the ENGINE'S WHOLE CARD, never a guess.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { sanitizeStructuredResultWithVerdict } =
  require(path.join(__dirname, "..", "src", "utils", "validateStructuredResult"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

const SOURCE = CORPUS.find((e) => e.id === "communal_bill_debt_help_block").text;
const fallback = runClearStepsEngine({
  extractedText: SOURCE,
  fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "repair-test" }
}).api_output.structured_result;

const clone = (v) => JSON.parse(JSON.stringify(v));

// 14 June 2026 appears nowhere in the source in any notation, so no
// canonicalisation can legitimise it. It is the calculated-date case.
const INVENTED = "14 June 2026";
const INVENTED_SLASH = "14/06/26";
const CLEAN_MODEL_SENTENCE = "This is a communal heating bill from Switchpoint Energy Services.";

function everyServedString(result) {
  const out = [];
  const walk = (v) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(result);
  return out;
}

test("an invented date reaches no reader, in any field or sentence", async (t) => {
  const candidate = clone(fallback);
  candidate.cards[0].simple_explanation = CLEAN_MODEL_SENTENCE;
  candidate.cards[1].simple_explanation = "Payment is due by " + INVENTED + ".";
  candidate.cards[2].key_points = ["Check the amount carefully.",
    "Respond by " + INVENTED_SLASH + " to keep your account open."];
  candidate.cards[3].possible_deadline = INVENTED;

  const verdict = sanitizeStructuredResultWithVerdict(candidate, fallback, SOURCE);
  const served = everyServedString(verdict.result);

  await t.test("no served string carries the invented date in any notation", () => {
    served.forEach((s) => {
      assert.ok(!s.includes(INVENTED), "served: " + s);
      assert.ok(!s.includes(INVENTED_SLASH), "served: " + s);
      assert.ok(!s.includes("14 june"), "served: " + s);
    });
  });

  await t.test("the result is NOT rejected for a date", () => {
    // THE ASSERTION THAT FAILED BEFORE THE REPAIR PATH. Rejection threw away
    // the clean sentence below along with the invented one.
    assert.equal(verdict.rejected, false,
      "a date rejection still discards the whole result: " + JSON.stringify(verdict.errors));
  });

  await t.test("the model's clean content survives the repair", () => {
    assert.equal(verdict.result.cards[0].simple_explanation, CLEAN_MODEL_SENTENCE,
      "the clean rewrite was lost, so this is rejection wearing a new name");
  });

  await t.test("the answer that carried the date is the ENGINE'S answer now", () => {
    assert.equal(verdict.result.cards[1].simple_explanation,
      fallback.cards[1].simple_explanation);
  });

  await t.test("the clean key point survives, the offending one is gone", () => {
    const points = verdict.result.cards[2].key_points;
    assert.ok(points.includes("Check the amount carefully."), JSON.stringify(points));
    assert.ok(!points.some((p) => p.includes(INVENTED_SLASH)), JSON.stringify(points));
  });

  await t.test("the date FIELD took the engine's value", () => {
    assert.equal(verdict.result.cards[3].possible_deadline,
      fallback.cards[3].possible_deadline);
  });
});

test("a legitimate date is untouched by the repair", async (t) => {
  // The document prints "30 June 2026" (as a due date). A model sentence
  // carrying it must survive whole, or the repair is a shredder.
  const candidate = clone(fallback);
  candidate.cards[1].simple_explanation = "Please note the payment deadline of 30 June 2026.";
  const verdict = sanitizeStructuredResultWithVerdict(candidate, fallback, SOURCE);

  await t.test("served, not rejected, not repaired", () => {
    assert.equal(verdict.rejected, false);
    assert.equal(verdict.result.cards[1].simple_explanation,
      "Please note the payment deadline of 30 June 2026.");
  });
});

test("the repair is visible to logging, so the shape can be learned", async (t) => {
  const candidate = clone(fallback);
  candidate.cards[1].simple_explanation = "Payment is due by " + INVENTED + ".";
  const verdict = sanitizeStructuredResultWithVerdict(candidate, fallback, SOURCE);

  await t.test("the verdict names what it repaired", () => {
    assert.ok(Array.isArray(verdict.repairs) && verdict.repairs.length > 0,
      "repairs are invisible, so the canonicalise gap can never name itself");
    assert.ok(verdict.repairs.some((r) => /date/i.test(String(r))), JSON.stringify(verdict.repairs));
  });
});
