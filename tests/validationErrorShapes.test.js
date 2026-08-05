// THE COLUMN NAMES THE SHAPE AND NEVER THE VALUE.
//
// ai_validation_errors used to redact every date to "{date}", which told us a
// date failed and nothing else: on 5 August 2026 a production rejection could
// not say whether the failing notation was DD/MM/YY, ISO, or something new,
// and diagnosis needed a local reproduction that took a day to build. The
// shape classification is diagnostic and value-free: "DD/MM/YY" names the
// notation the canonicaliser missed without naming the reader's date.
//
// The invariant that must hold under EVERY path, asserted here over every
// message shape the validator and the repair path can produce: no digit
// reaches the column. A shape that leaks a digit is a privacy defect, not a
// logging nicety.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

// The cleaner is module-private, so it is lifted from the source the same way
// the earlier redaction tests did it. If the function is renamed this fails
// loudly rather than testing nothing.
const fs = require("node:fs");
const source = fs.readFileSync(
  path.join(__dirname, "..", "src", "services", "documentSessionService.js"), "utf8");
const match = source.match(/function cleanValidationErrors[\s\S]*?\n}/);
assert.ok(match, "cleanValidationErrors not found in documentSessionService.js");
const cleanValidationErrors = new Function("cleanText",
  match[0] + "; return cleanValidationErrors;")((v, max) => String(v).slice(0, max));

test("every date notation becomes its shape, digit-free", async (t) => {
  const CASES = [
    ["date 01/05/26 appears in neither the document nor the engine output", "DD/MM/YY"],
    ["date 31/05/26 appears in neither the document nor the engine output", "DD/MM/YY"],
    ["date 02/06/2026 appears in neither the document nor the engine output", "DD/MM/YYYY"],
    ["date 2026-09-03 appears in neither the document nor the engine output", "YYYY-MM-DD"],
    ["date 14 June 2026 removed from cards[1].simple_explanation", "D Month YYYY"],
    ["date 22 Apr 2026 removed a key point on cards[2]", "D Mon YYYY"],
    ["date 28 May 26 appears in neither the document nor the engine output", "D Month YY"],
    ["date June 14, 2026 appears in neither the document nor the engine output", "Month D YYYY"]
  ];
  for (const [message, shape] of CASES) {
    await t.test(shape + "  <-  " + message.slice(5, 20), () => {
      const stored = cleanValidationErrors([message]);
      assert.ok(stored.includes(shape), "expected " + shape + " in: " + stored);
      assert.ok(!/\d/.test(stored.replace(/\{n\}/g, "")),
        "A DIGIT SURVIVED INTO THE COLUMN: " + stored);
    });
  }
});

test("no digit survives under any path, including the ones shapes miss", async (t) => {
  const HOSTILE = [
    "date 1/2/3 appears in neither",                       // malformed, no shape
    "main_amount must match the engine value £486.20",
    "reference SC-4471028 appears in neither",
    "amount 17,454 litres on cards[4]",
    "date repair failed on cards[3], engine card restored", // the fail-closed path
    "date 5th of the month, every month",
    "£1,247.00 and 22 Apr 2026 and 01/05/26 all in one message"
  ];
  for (const message of HOSTILE) {
    await t.test(message.slice(0, 40), () => {
      const stored = cleanValidationErrors([message]);
      if (stored === undefined || stored === null) return;   // dropped entirely is fine
      const residue = stored.replace(/\{n\}|\{amount\}|\{ref\}|\{date\}/g, "");
      assert.ok(!/\d/.test(residue), "A DIGIT SURVIVED: " + stored);
    });
  }
});

test("the repair messages the new path produces are storable and shaped", async (t) => {
  await t.test("a real repair message round-trips to a shape", () => {
    const stored = cleanValidationErrors([
      "date 14 June 2026 removed from cards[1].simple_explanation",
      "date 14/06/26 removed a key point on cards[2]"
    ]);
    assert.ok(stored.includes("D Month YYYY"));
    assert.ok(stored.includes("DD/MM/YY"));
    assert.ok(!/\d/.test(stored.replace(/\{n\}/g, "")), stored);
  });
});
