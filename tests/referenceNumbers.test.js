// Guards the reference a letter tells the reader to quote.
//
// The old pattern required four characters in a class that excluded the slash,
// so "Our ref: HG/DR/22981" stopped at "HG" and was missed. Slashed references
// are the convention on solicitor and council letters, which are the documents
// most likely to carry one, so the field failed hardest where it mattered most.
//
// It also captured the label into the value ("Reference: EN-77120934") and,
// with no digit requirement, returned "reference above" and "reference
// agencies" as if they were references.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

function references(text) {
  return runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "reference-test" }
  }).structured_output.extractor_internal.reference_numbers;
}

function byId(id) {
  return CORPUS.find((entry) => entry.id === id).text;
}

// Long enough to stay out of the short-input paths, so the extractor runs.
function letter(line) {
  return [
    "Hounslow Borough Council", "Council tax department", line,
    "We are writing about the account held in your name at the address above.",
    "Amount to pay: £120.00", "Please pay by 1 April 2026.",
    "If you have any questions please contact the council tax team."
  ].join("\n");
}

test("real UK reference formats are found", async (t) => {
  const SHAPES = [
    ["solicitor, slashes", "Our ref: HG/DR/22981", "HG/DR/22981"],
    ["school, slashes", "Reference: SW/TRIP/2026", "SW/TRIP/2026"],
    ["council, hyphen", "Reference: CT-88213", "CT-88213"],
    ["enforcement, hyphen", "Reference: EN-77120934", "EN-77120934"],
    ["spaces within", "Our ref HG 22981", "HG 22981"],
    ["plain digits", "Reference: 8842001", "8842001"],
    ["mixed alphanumeric", "Ref: 1AB23456", "1AB23456"],
    ["lowercase label", "our ref: cf/8830012", "cf/8830012"],
    ["dotted", "Ref. AV.77120934", "AV.77120934"]
  ];

  for (const [why, line, expected] of SHAPES) {
    await t.test(why + ": " + line, () => {
      assert.ok(references(letter(line)).includes(expected),
        "got " + JSON.stringify(references(letter(line))));
    });
  }

  await t.test("the label is not part of the value", () => {
    // It used to be, which would have read "Keep this reference ready:
    // Reference: EN-77120934."
    references(letter("Reference: EN-77120934")).forEach((value) => {
      assert.doesNotMatch(value, /ref/i, value + " still carries its label");
    });
  });
});

test("a word that follows the label is not a reference", async (t) => {
  const NOISE = [
    ["quoting the reference above", "Payment can be made online quoting the reference above."],
    ["credit reference agencies", "Arrears may be reported to credit reference agencies."],
    ["a bare instruction", "Please quote your reference when you call."],
    ["a label with nothing after it", "Reference"]
  ];

  for (const [why, line] of NOISE) {
    await t.test(why, () => {
      assert.deepEqual(references(letter(line)), [], "got " + JSON.stringify(references(letter(line))));
    });
  }

  await t.test("a reference is not joined to the words after it", () => {
    const found = references(letter("Reference: EN-77120934 and case number CT-88213 apply."));
    assert.deepEqual(found, ["EN-77120934"],
      "a space must not glue the following words onto the value");
  });
});

test("the corpus gains the missed reference and loses only noise", async (t) => {
  await t.test("legal_solicitor gains the one it always had", () => {
    // The document this fix exists for: "Our ref: HG/DR/22981".
    assert.deepEqual(references(byId("legal_solicitor")), ["HG/DR/22981"]);
  });

  await t.test("bank_loan_letter loses its fake one", () => {
    // It held ["reference agencies"], from "credit reference agencies", and
    // nothing else. The letter carries no reference.
    assert.deepEqual(references(byId("bank_loan_letter")), []);
  });

  await t.test("bailiff_enforcement keeps the real one and drops the noise", () => {
    assert.deepEqual(references(byId("bailiff_enforcement")), ["EN-77120934"]);
  });

  await t.test("no document loses a genuine reference", () => {
    // Every reference the corpus documents actually print must still be found.
    const EXPECTED = {
      energy_bill: "EB-4471028", appointment_nhs: "WM-8842001",
      bailiff_enforcement: "EN-77120934", eviction_possession: "POS-2291",
      court_fine: "CF-8830012", legal_solicitor: "HG/DR/22981",
      scam_phishing: "SEC-99120", ocr_energy_bill: "EB-4471028",
      ocr_enforcement: "EN-77120934"
    };
    Object.entries(EXPECTED).forEach(([id, value]) => {
      assert.ok(references(byId(id)).includes(value),
        id + " lost " + value + ", got " + JSON.stringify(references(byId(id))));
    });
  });

  await t.test("every value found anywhere in the corpus contains a digit", () => {
    CORPUS.forEach((entry) => {
      references(entry.text).forEach((value) => {
        assert.match(value, /\d/, entry.id + ": " + JSON.stringify(value) + " has no digit");
      });
    });
  });
});

test("a reference is never shown where quoting it would harm the reader", async (t) => {
  // Card 6 already told the reader to keep the reference number ready. It now
  // shows it, behind three gates.
  const shownOn = (id) => {
    const run = runClearStepsEngine({
      extractedText: byId(id),
      fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "reference-gate" }
    });
    return {
      trust: run.structured_output.trust_internal,
      held: run.structured_output.extractor_internal.reference_numbers || [],
      points: run.api_output.structured_result.cards[5].key_points || []
    };
  };
  const isShown = (points) => points.some((p) => /Keep this reference ready/.test(p));

  await t.test("not on a garbled document, however clean the reference looks", () => {
    // "Reference: EN-77l2O934" is something a reader will quote, get nowhere
    // with, and believe they have done the right thing.
    ["ocr_energy_bill", "ocr_enforcement"].forEach((id) => {
      const run = shownOn(id);
      assert.equal(run.trust.garbled_by_ocr, true, id + ": premise");
      assert.ok(run.held.length, id + ": premise, a reference was extracted");
      assert.equal(isShown(run.points), false, id + ": a damaged reference must not be offered");
    });
  });

  await t.test("not on a suspected scam", () => {
    const run = shownOn("scam_phishing");
    assert.equal(run.trust.processing_mode, "verification_only", "premise");
    assert.deepEqual(run.held, ["SEC-99120"], "premise, the scam's own reference is held");
    assert.equal(isShown(run.points), false,
      "Northcue must never help a reader quote a scam's reference back to it");
  });

  await t.test("across the corpus, no gated document shows one", () => {
    const offenders = [];
    CORPUS.forEach((entry) => {
      const run = shownOn(entry.id);
      const gated = run.trust.garbled_by_ocr || run.trust.processing_mode === "verification_only";
      if (gated && isShown(run.points)) offenders.push(entry.id);
    });
    assert.deepEqual(offenders, []);
  });

  await t.test("it IS shown on an ordinary letter that carries one", () => {
    // The gates must not swallow the feature.
    ["energy_bill", "bailiff_enforcement", "court_fine", "legal_solicitor"].forEach((id) => {
      const run = shownOn(id);
      assert.ok(isShown(run.points), id + ": key points were " + JSON.stringify(run.points));
    });
    assert.ok(shownOn("legal_solicitor").points.some((p) => p.includes("HG/DR/22981")),
      "the reference U-3 recovered is the one now shown");
  });

  await t.test("only the first reference, never a list", () => {
    CORPUS.forEach((entry) => {
      const run = shownOn(entry.id);
      const lines = run.points.filter((p) => /Keep this reference ready/.test(p));
      assert.ok(lines.length <= 1, entry.id + " offered " + lines.length + " references");
    });
  });
});
