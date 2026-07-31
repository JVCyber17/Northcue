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

