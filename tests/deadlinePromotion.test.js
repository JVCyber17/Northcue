// Guards which date on a letter is promoted to the deadline, in the keyword
// fallback inside extractDeadline.
//
// WHY THE TESTS CARRY EVERYTHING HERE. The keyword fallback supplies the
// shipped deadline for no corpus document at all: co-location, the appointment
// rule and the reading-aid path between them account for every one. Four rounds
// of co-location work absorbed what the fallback used to carry. So a change to
// this function moves nothing in the baseline, and nothing but a test can tell
// a fix from a no-op.
//
// That is also why each rule below has a whole corpus document behind it, added
// in the same commit as the rule. A shape with no document is a shape the
// rendered baseline cannot see.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const co = require(path.join(__dirname, "..", "src", "utils", "coLocation"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

function isPlausibleNumericDate(dateStr) {
  const parts = dateStr.split(/[-\/]/);
  if (parts.length !== 3) return false;
  const a = parseInt(parts[0], 10);
  const b = parseInt(parts[1], 10);
  return (a >= 1 && a <= 31 && b >= 1 && b <= 12) ||
         (a >= 1 && a <= 12 && b >= 1 && b <= 31);
}

function byId(id) {
  return CORPUS.find((entry) => entry.id === id).text;
}

// Long enough to keep the engine off the short-input paths, and headed so it
// takes the fully supported path where extractDeadline is actually called.
// The reading-aid path never calls it.
function letter(body) {
  return [
    "Hounslow Borough Council", "Council Tax Recovery", "Reference: CT-90114",
    "", "Dear Occupier", "", "Amount to pay: £486.20"
  ].concat(body).concat([
    "", "If you cannot pay in full, contact the recovery team on 020 8583 4242."
  ]).join("\n");
}

function deadline(body) {
  return runClearStepsEngine({
    extractedText: letter(body),
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "promotion" }
  }).structured_output.extractor_internal.deadline;
}

// --------------------------------------------------------------------- A

test("a 'before' that states no obligation is not a deadline", async (t) => {
  // D-1. The bare token was already word bounded, so this was never a boundary
  // problem: "before X" marks a boundary in either direction and carries no
  // obligation, so the pattern matched correctly and meant the wrong thing.
  // All eight of these were promoted to deadline before the verb anchor.
  const MENTIONS = [
    ["payments excluded from a balance", "Any payments made before 3 July 2026 are not included in this balance."],
    ["when a tenancy began", "Your tenancy began before 1 April 2024."],
    ["arriving early for an appointment", "Please arrive fifteen minutes before your appointment on 1 July 2026."],
    ["when a notice was served", "This notice was served before 3 July 2026 under section 8."],
    ["when prices were correct", "Prices shown were correct before 1 April 2026."],
    ["a discount qualifying date", "If you moved in before 1 April 2024 a discount may apply."],
    ["when a reading was estimated", "Meter readings taken before 3 July 2026 are estimated."],
    ["an appeal already considered", "Any appeal lodged before 3 July 2026 has already been considered."]
  ];

  for (const [why, line] of MENTIONS) {
    await t.test(why + ": " + JSON.stringify(line.slice(0, 44) + "..."), () => {
      assert.equal(deadline([line]), null,
        "a sentence stating no obligation was promoted to the deadline");
    });
  }
});

test("a 'before' that states an obligation still is one", async (t) => {
  // The other half, and the reason the token was anchored rather than deleted.
  // Deleting it was simulated and rejected: co-location binds none of these, so
  // all five would have been lost.
  const OBLIGATIONS = [
    ["pay the balance", "You must pay the balance before 3 September 2026.", "3 September 2026"],
    ["respond", "Please respond before 3 September 2026.", "3 September 2026"],
    ["clear the account", "The account must be cleared before 3 September 2026.", "3 September 2026"],
    ["contact us", "Contact us before 3 September 2026 to arrange payment.", "3 September 2026"],
    ["tell us otherwise", "Please tell us otherwise before 1 August 2026.", "1 August 2026"]
  ];

  for (const [why, line, expected] of OBLIGATIONS) {
    await t.test(why + ": " + JSON.stringify(line.slice(0, 44) + "..."), () => {
      assert.equal(deadline([line]), expected);
    });
  }

  await t.test("the verb must belong to the same clause as the before", () => {
    // The gap is bounded, so a verb in an unrelated earlier clause cannot
    // anchor a later "before".
    assert.equal(deadline([
      "You can pay online at any time using the reference above, and your tenancy began before 1 April 2024."
    ]), null);
  });
});

test("arrears_before_clause: both readings in one real letter", async (t) => {
  // The corpus document this rule exists for. It carries a mention on one line
  // and an obligation on the next, which is how an arrears letter is actually
  // written, and before the verb anchor it reported the mention.
  const run = runClearStepsEngine({
    extractedText: byId("arrears_before_clause"),
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "corpus-a" }
  });
  const result = run.api_output.structured_result;

  await t.test("the obligation is the deadline, not the mention", () => {
    assert.equal(run.structured_output.extractor_internal.deadline, "3 September 2026");
    assert.equal(result.summary.main_date, "3 September 2026");
    assert.equal(result.cards[3].simple_explanation, "Due by 3 September 2026.");
  });

  await t.test("the mention is still listed as a visible date, just not as the deadline", () => {
    // Suppressing it entirely would hide something the letter says. It is
    // reported without being related to an obligation, which is the whole
    // distinction this rule draws.
    assert.ok(run.structured_output.extractor_internal.visible_dates.includes("3 July 2026"),
      "got " + JSON.stringify(run.structured_output.extractor_internal.visible_dates));
  });

  await t.test("it reaches the fully supported path, where extractDeadline runs", () => {
    // If a future change routes it to the reading aid, this rule stops being
    // exercised by it and the test above would pass for the wrong reason.
    assert.equal(run.structured_output.extractor_internal.readable_unsupported_signals, undefined);
  });
});

test("the anchor does not disturb the rest of the context vocabulary", async (t) => {
  await t.test("cleared before keeps its own literal", () => {
    assert.equal(deadline(["The balance must be cleared before 24 June 2026."]), "24 June 2026");
  });

  await t.test("every other alternative still promotes", () => {
    const OTHERS = [
      ["Failure to pay the outstanding amount by 24 June 2026 may result in action.", "24 June 2026"],
      ["Payment must reach us no later than 24 June 2026.", "24 June 2026"],
      ["The deadline for this account is 24 June 2026.", "24 June 2026"],
      ["Payment must be received by 24 June 2026.", "24 June 2026"],
      ["You must comply by 24 June 2026.", "24 June 2026"]
    ];
    OTHERS.forEach(([line, expected]) => {
      assert.equal(deadline([line]), expected, line);
    });
  });

  await t.test("arrears_before_clause is the only corpus deadline the fallback supplies", () => {
    // The reason this file's rules are invisible to the baseline, stated as an
    // assertion rather than a comment. Co-location, the appointment rule and
    // the reading-aid path account for every other corpus deadline, so before
    // this document was added a change here could not move the rendered output
    // at all. If a second document ever starts depending on the fallback, that
    // is worth knowing, and this is where it shows up.
    const fallbackOnly = [];
    CORPUS.forEach((entry) => {
      const run = runClearStepsEngine({
        extractedText: entry.text,
        fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "layer" }
      });
      const x = run.structured_output.extractor_internal;
      if (!x.deadline || x.readable_unsupported_signals) return;
      if (run.structured_output.trust_internal.document_category === "appointment") return;
      if (co.selectDeadline(entry.text, isPlausibleNumericDate)) return;
      fallbackOnly.push(entry.id);
    });
    assert.deepEqual(fallbackOnly, ["arrears_before_clause"]);
  });
});
