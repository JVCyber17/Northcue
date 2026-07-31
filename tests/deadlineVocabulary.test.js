// Guards the deadline label vocabulary: which phrases the engine accepts as
// "this date is the deadline", and, just as importantly, which text they must
// not match.
//
// The vocabulary is the one place where adding a phrase is cheap and adding a
// wrong phrase is expensive. A missing entry costs a null deadline, which the
// cards already have honest wording for. A loose entry promotes a background
// date to a headline obligation, which is the failure shape D-1 records: the
// bare "before" in extractDeadline turns "Your tenancy began before 1 April
// 2024" into a deadline. So every entry here is tested twice, once for what it
// recovers and once for what it must leave alone.

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

function deadline(text) {
  const found = co.selectDeadline(text, isPlausibleNumericDate);
  return found ? found.value : null;
}

function byId(id) {
  return CORPUS.find((entry) => entry.id === id).text;
}

// Long enough that the engine takes a real path rather than a short-input one.
function notice(body) {
  return [
    "Hounslow Borough Council", "Environmental Health team", "Reference: EH-4471028",
    "", "Dear Occupier", ""
  ].concat(body).concat([
    "", "If you have any questions please contact the team named above."
  ]).join("\n");
}

// --------------------------------------------------------------- tier 2

test("statutory notices state a date with no verb at all", async (t) => {
  // A compliance date is a field, not a sentence. Nothing in the vocabulary
  // before this could reach one, because every other entry needs a verb.
  const SHAPES = [
    ["colon", "Compliance date: 3 September 2026", "3 September 2026"],
    ["tabular padding", "Compliance date          3 September 2026", "3 September 2026"],
    ["dotted leader", "Compliance date .......... 3 September 2026", "3 September 2026"],
    ["reversed wording", "Date for compliance: 12 September 2026", "12 September 2026"],
    ["consultation", "Response date: 5 June 2026", "5 June 2026"],
    ["obligation verb", "You must act by 3 September 2026.", "3 September 2026"],
    ["obligation verb, short form", "Please act by 30 September 2026.", "30 September 2026"],
    ["label on the line above", "Compliance date\n3 September 2026", "3 September 2026"]
  ];

  for (const [why, line, expected] of SHAPES) {
    await t.test(why + ": " + JSON.stringify(line), () => {
      assert.equal(deadline(notice([line])), expected);
    });
  }
});

test("a tier 2 entry never matches inside a longer word", async (t) => {
  // locateLabels compiles a phrase as a bare substring, so these are real
  // matches, not hypothetical ones. Every line below states no obligation and
  // must yield no deadline.
  const HAZARDS = [
    ["act by inside contact by", "You may contact by telephone on 3 September 2026."],
    ["act by inside exact by", "The exact by-law applies from 3 September 2026."],
    ["act by inside impact by", "This will impact by a small amount from 3 September 2026."],
    ["response date inside response dated", "The response dated 3 July 2026 was received."],
    ["compliance date inside compliance dates", "Non compliance dates back to 3 July 2026."]
  ];

  for (const [why, line] of HAZARDS) {
    await t.test(why, () => {
      assert.equal(deadline(notice([line])), null,
        "matched inside a longer word: " + JSON.stringify(line));
    });
  }

  await t.test("the boundary does not cost the recovery it protects", () => {
    // The same five entries still match when they stand alone, which is what
    // makes the boundary a fix rather than a removal.
    assert.equal(deadline(notice(["Compliance date: 3 September 2026"])), "3 September 2026");
    assert.equal(deadline(notice(["Response date: 5 June 2026"])), "5 June 2026");
    assert.equal(deadline(notice(["You must act by 3 September 2026."])), "3 September 2026");
  });
});

test("tier 2 keeps every rule the vocabulary already had", async (t) => {
  await t.test("forward only: a label after its date does not bind", () => {
    // Tier 1a. "act by" at the end of a line must not reach back.
    assert.equal(deadline(notice([
      "An order was granted on 3 July 2026 and you must act by 3 September 2026."
    ])), "3 September 2026", "the date after the label, not the one before it");
  });

  await t.test("adjacency: words between the label and the date reject the bind", () => {
    // Tier 1b. Nothing but punctuation and whitespace may sit between them.
    assert.equal(deadline(notice(["You must act by contacting us on 3 September 2026."])), null);
  });

  await t.test("a competing label between the two still wins", () => {
    assert.equal(deadline(notice(["Compliance date for the year ending 5 April 2026"])), null);
  });

  await t.test("same block: a label cannot reach across a blank line", () => {
    assert.equal(deadline(notice(["Compliance date", "", "3 September 2026"])), null);
  });
});

test("tier 2 moves nothing that was already correct", async (t) => {
  await t.test("no new entry fires anywhere in the corpus", () => {
    const NEW = ["compliance date", "date for compliance", "response date", "act by", "you must act by"];
    const fired = [];
    CORPUS.forEach((entry) => {
      co.locateLabels(entry.text, NEW).forEach((hit) => {
        fired.push(entry.id + ": " + hit.phrase);
      });
    });
    assert.deepEqual(fired, [],
      "tier 2 was added for shapes the corpus does not contain; a hit here means the baseline moved");
  });

  await t.test("the documents that already had a deadline still have the same one", () => {
    const EXPECTED = {
      council_tax: "1 April 2026", energy_bill: "28 May 2026", water_bill: "30 June 2026",
      appointment_nhs: "1 July 2026", eviction_possession: "12 September 2026",
      court_fine: "30 September 2026", multi_document_split: "28 May 2026"
    };
    Object.entries(EXPECTED).forEach(([id, value]) => {
      const run = runClearStepsEngine({
        extractedText: byId(id),
        fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "vocab" }
      });
      assert.equal(run.structured_output.extractor_internal.deadline, value, id);
    });
  });
});
