// Stress tests: how does the engine behave on messy, realistic input?
// node _stress_test.js
//
// Four scenarios — not unit tests, diagnostic probes.

const { runClearStepsEngine } = require("./src/services/clearStepsEngine");

function run(label, text, selectedCategory = "auto") {
  const result = runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory }
  });
  const out   = result.api_output;
  const trust = out.trust;
  const cards = out.cards;

  console.log("\n" + "═".repeat(72));
  console.log(`▶ ${label}`);
  console.log("═".repeat(72));
  console.log(`  category: ${trust.document_category}  |  severity: ${trust.severity_level}  |  mode: ${trust.processing_mode}`);
  console.log(`  input_quality: ${trust.input_quality}  |  trust: ${trust.trust_assessment}`);

  for (const card of cards) {
    console.log(`\n  [${card.id}]  ${card.title}`);
    console.log(`  "${card.short_answer}"`);
    if (card.steps && card.steps.length > 0 && !(card.steps.length === 1 && card.steps[0] === card.short_answer)) {
      for (const s of card.steps) console.log(`    • ${s}`);
    }
    if (card.date) console.log(`  date: ${card.date}`);
  }

  if (out.debug && out.debug.validation_errors) {
    console.log(`\n  ⚠ validation_errors: ${JSON.stringify(out.debug.validation_errors)}`);
  }
}

// ── TEST 1: OCR-garbled energy bill ─────────────────────────────────────────
// Clean version would be: PowerGrid Energy Services, £89.20, due 25 June 2026.
// Noise: O/0 confusion, merged words, character drops, mid-line breaks.
const GARBLED_BILL = `
P0werGrid Ener9y Serv1ces
Custorner Acc0unts
PO B0x 847 Leeds LS99 3AB

Acc0unt: 9274610
Date: lO June 2026

ELECTR1CITY B|LL

Y0ur electricity bill f0r the peri0d 1 March 2026
to 31 May2026.

Am0untdue: £89.2O

Payrnent due by 25June 2026.

Pleose pay onIine at powergr1d.co.uk
or call O8OO 999 1234.

lf payrnent is not rece1ved by the
due date your supply may bedisconnected
and a recon nection fee will apply.

Reference: PG-2026-9274610
`.trim();

// ── TEST 2: Two letters merged with no separator ──────────────────────────
// First: a council tax demand. Second: a GP appointment letter.
const MERGED_LETTERS = `
Westfield Council
Council Tax Demand Notice
Reference: CT-2026-448821

Amount due: £1,420.00
This is your annual council tax bill for the period 1 April 2026 to 31 March 2027.
Payment is due in full by 30 April 2026, or you may pay in 10 monthly instalments.
If you do not pay, we may take legal action to recover the debt.

Dear Mr Thompson
Appointment Confirmation
Oakfield Medical Centre
15 High Street, Westfield

You have an appointment with Dr S. Patel on 14 July 2026 at 09:30am.
Please arrive 10 minutes early and bring your repeat prescription slip.
If you cannot attend, please call 01234 567890 to rearrange.
`.trim();

// ── TEST 3: Document cut off partway through ──────────────────────────────
// A council tax notice where the scan stopped before the deadline/payment section.
const CUT_OFF = `
Westfield Borough Council
Council Tax Notice 2026/27

Dear Ms Nguyen,

We are writing to let you know about your council tax account for the
property at 14 Elm Close, Westfield WF4 2BN.

Your council tax band has been reassessed this year. The changes to
your bill are set out below.

Previous band: Band C
New band: Band D

The adjustment means your annual council tax charge will increase.
We have calculated the difference for the current year and the amount
`.trim();

// ── TEST 4: Heavily garbled — well below "poor" threshold ─────────────────
// Simulates a badly lit, skewed photo where OCR produced near-random output.
const UNREADABLE = `
C0u nc1I T@x N0t|c3
W3stf13ld B0r0u9h C0unc1I

D3@r M5 N9u y3n

Y0ur c0unc1I t@x @cc0unt f0r th3
pr0p3rty @t 14 E|m Cl053 W3stf13|d WF4 2BN

Pr3v10u5 b@nd: B@nd C
N3w b@nd: B@nd D
`.trim();

run("TEST 1 — OCR-garbled energy bill", GARBLED_BILL);
run("TEST 2 — Two letters merged with no separator", MERGED_LETTERS);
run("TEST 3 — Document cut off mid-page", CUT_OFF);
run("TEST 4 — Heavily garbled, well below 'poor' threshold", UNREADABLE);

console.log("\n" + "═".repeat(72));
console.log("Done.");
console.log("═".repeat(72) + "\n");
