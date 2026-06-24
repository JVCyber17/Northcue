// Northcue engine test runner.
// node .claude/skills/northcue-engine-test/scripts/run_engine_tests.js
//
// Runs all curated UK document test cases through clearStepsEngine.js and prints
// the six-card output for each, followed by a pass/fail summary against known-correct
// values. See references/test-documents.md and references/known-gotchas.md for
// context on expected results and pre-existing known failures.

const path = require("node:path");

const ENGINE_PATH = path.resolve(__dirname, "../../../..", "src", "services", "clearStepsEngine");
const { runClearStepsEngine } = require(ENGINE_PATH);

// ── Test documents ────────────────────────────────────────────────────────────
// Verbatim text from the sessions in which they were originally created.
// Do not edit these — they are the canonical document set for this project.

const DOC_1_BRITISH_GAS = `
British Gas
PO Box 4805
Dunfermline KY99 4BY

Your account number: 851234567

Mr J Vaidya
14 Maple Close
Sheffield
S3 8LT

Date: 03 June 2026

YOUR ENERGY BILL

This bill covers the period 1 March 2026 to 31 May 2026

Account summary
Balance brought forward         £0.00
Charges this period             £187.42
Payments received               £0.00
Total amount due                £187.42

Please pay by 24 June 2026

Gas usage this period:  342 kWh
Electricity usage:      198 kWh

Standing charge gas:     £28.40
Unit charge gas:         £94.50
Standing charge elec:    £19.20
Unit charge elec:        £45.32

VAT at 5%               £9.37 (included above)

How to pay
You can pay online at britishgas.co.uk or call us on 0333 202 9802

If you do not pay by the due date, your account may be referred for further action.

For help with your bill visit britishgas.co.uk/help

Reference: BG-2026-0603-851234567
`.trim();

const DOC_2_COUNCIL_TAX = `
Sheffield City Council
Town Hall
Pinstone Street
Sheffield S1 2HH

Council Tax

Mr Vaidya
14 Maple Close
Sheffield
S3 8LT

Reference: CT2026/0081234

Annual Council Tax Notice 2026/27

Your council tax for 2026-2027

Property band: C
Total council tax charge:   £2,104.00
Any discounts:              -£0.00
Net amount payable:         £2,104.00

You have chosen to pay by direct debit in 10 monthly instalments.

Instalment amounts:
April 2026 to January 2027   £210.40 per month
First payment due:           01/04/2026

If you have any changes to report, such as a change of address or a
change in the people living at the property, you must tell us within 21 days.

Council tax pays for local services including refuse collection, libraries,
road maintenance and social care.

If you believe your property is in the wrong band you may be able to
appeal to the Valuation Office Agency.

For queries contact: council.tax@sheffield.gov.uk
or telephone 0114 273 4567

This is not a demand for payment. This is your annual notice.
`.trim();

const DOC_3_ENFORCEMENT = `
Ref: SCC/ENV/2026/04471

Sheffield City Council
Environmental Services Department

14 Maple Close
Sheffield S3 8LT

12 May 2026

Dear Resident

Further to our recent inspection of the above address, we write to advise
you of the following matters which require your attention.

During our visit on 3 May 2026 officers noted the presence of waste
material stored in the front garden area which may be in contravention
of section 45A of the Environmental Protection Act 1990.

You are required to ensure the waste is removed and the area is cleared
by 26 May 2026.

Failure to comply with this notice may result in the council taking
further action under the Environmental Protection Act 1990 which may
include fixed penalty notices or prosecution.

If you have already taken steps to address this matter please disregard
this letter.

If you would like to discuss this matter please contact our office.
Environmental Services
Tel: 0114 273 4000

Sheffield City Council
Serving Sheffield
`.trim();

const DOC_4_CT_ARREARS = `
Sheffield City Council
Legal Services Department
Town Hall
Sheffield S1 2HH

Reference: SCC/LEG/2026/0991

14 Maple Close
Sheffield S3 8LT

29 May 2026

Final Reminder — Council Tax Arrears

We write further to our previous notices dated 15 April 2026 and 1 May 2026
regarding outstanding council tax for the period 2025/26.

You owe £450.00 in council tax arrears for the above property.

Payment was due by 01/05/2026. This amount remains outstanding.

Failure to pay by 16 June 2026 will result in prosecution for non-payment of
council tax under the Local Government Finance Act 1992, and court costs will
be added to the amount owed.

To avoid this, please call our recovery team on 0114 273 4001 or email
recovery@sheffield.gov.uk immediately.

Sheffield City Council
`.trim();

const DOC_5_BT_FINAL_NOTICE = `
British Telecom
PO Box 786
Bristol BS99 1AB

Mr J Vaidya
14 Maple Close
Sheffield S3 8LT

Account: 847263910
Date: 02 June 2026

FINAL NOTICE - OUTSTANDING BALANCE

Your account shows an outstanding balance of £124.99.

Previous payment requests dated 15 April and 12 May have not been met.

Your account has been suspended due to non-payment.

You must pay immediately.

To make a payment call 0800 800 150 or visit bt.com/pay

Reference: BT-FN-2026-847263910
`.trim();

const DOC_6_HOUSING_BENEFIT_REVIEW = `
Sheffield City Council
Housing Benefits Service
PO Box 99
Sheffield S1 2HH

Mr J Vaidya
14 Maple Close
Sheffield S3 8LT

Reference: HB/2026/45871
Date: 04 June 2026

HOUSING BENEFIT REVIEW NOTICE

We are writing to review your current housing benefit claim for the
above address.

To continue receiving housing benefit, you must update your address
details with us in writing within 14 days of this letter.

Additionally, you must confirm your household size and the names
of all current residents by 30 June 2026. Failure to confirm this
may result in your benefit payments being suspended.

Please complete the enclosed form and return it to the address above.

For queries call 0114 273 4567 or email housing.benefit@sheffield.gov.uk
`.trim();

const DOC_7_BARCLAYS_ARREARS = `
Barclays Bank PLC
Personal Lending Division
PO Box 2000
Leicester LE87 2BB

Mr J Vaidya
14 Maple Close
Sheffield S3 8LT

Account reference: PL-2026-748291
Date: 10 June 2026

NOTICE OF ARREARS

Your personal loan account is currently in arrears by £320.00.

Payment was due on 01 June 2026 and remains outstanding.

Failure to pay the outstanding amount by 24 June 2026 will result
in action being taken against you, which may include referral to a
debt collection agency and a record on your credit reference file.

To discuss your account please call 0800 161 5141 or visit barclays.co.uk

Barclays Bank PLC is authorised by the Prudential Regulation Authority.
`.trim();

const DOC_8_HMRC_PHISHING = `
HM Revenue & Customs
Government Gateway Refund Service
UK Tax Office

IMPORTANT: TAX REFUND NOTIFICATION

Dear Customer

Our records show you are owed a tax refund of £847.23 for the tax year
2024-25. This refund has been authorised for release.

To receive your refund you must confirm your account details within
48 hours. You will need your National Insurance number and bank
account details.

Act now to avoid losing your refund. Unclaimed refunds are cancelled
after 48 hours and cannot be recovered.

Submit your details at: hmrc-refund-portal.net/claim

HM Revenue & Customs
Tax Refunds Division
`.trim();

const DOC_9_SEVERN_TRENT = `
Customer Accounts Team
Severn Trent Water
Coventry CV1 2PP

Mr J Vaidya
14 Maple Close
Sheffield S3 8LT

Account: 849271634
Date: 08 June 2026

WATER BILL - PAYMENT REMINDER

Your water bill of £94.50 is now due for the period January to March 2026.

Payment due date: 20 June 2026.

Please pay online at stwater.co.uk or by phone on 0800 783 4444.

If payment is not received by the due date, your account may be
referred to our collections team.

Severn Trent Water Limited. Registered in England No. 2366620.
`.trim();

const DOC_10_NHS_APPOINTMENT = `
NHS
Hallamshire Hospital Outpatients
Sheffield Teaching Hospitals NHS Foundation Trust
Glossop Road
Sheffield S10 2JF

Tel: 0114 271 1900

Mr J Vaidya
14 Maple Close
Sheffield S3 8LT

Date: 05 June 2026

Dear Mr Vaidya

OUTPATIENT APPOINTMENT

An outpatient appointment has been arranged for you as follows:

Department: Cardiology
Date:       Tuesday 01 July 2026
Time:       10:30 AM
Consultant: Dr A Singh
Location:   Level B, Royal Hallamshire Hospital

Please bring this letter and a list of your current medications.

If you are unable to attend please contact us as soon as possible
on 0114 271 1900 so we can offer the appointment to another patient.

Please give at least 48 hours notice if you need to cancel.

This appointment is free of charge on the NHS.
`.trim();

const DOC_11_GARBLED_ENERGY = `
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

const DOC_12_MERGED_LETTERS = `
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

const DOC_13_CUT_OFF = `
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

const DOC_14_UNREADABLE = `
C0u nc1I T@x N0t|c3
W3stf13ld B0r0u9h C0unc1I

D3@r M5 N9u y3n

Y0ur c0unc1I t@x @cc0unt f0r th3
pr0p3rty @t 14 E|m Cl053 W3stf13|d WF4 2BN

Pr3v10u5 b@nd: B@nd C
N3w b@nd: B@nd D
`.trim();

const DOC_15_MULTI_OBLIGATION = `
Department for Work and Pensions
Housing Benefit Award Notice
Reference: HB/2026/00882

Dear Ms Okafor,

We have assessed your Housing Benefit claim and confirmed your award.
Your benefit has been calculated based on the information you provided.

You must tell us about any changes to your income or savings immediately.
If your income changes and you do not tell us, you may be overpaid.

You must also tell us if you move to a different address.
Failure to do so may result in your benefit being stopped.

If you have any questions, please call 0800 123 4567.
`.trim();

// ── Test case definitions ─────────────────────────────────────────────────────

const TESTS = [
  {
    id: "DOC_1",
    label: "British Gas energy bill",
    group: "A — Original three",
    text: DOC_1_BRITISH_GAS,
    category: "auto",
    assertions: [
      { field: "trust.document_category", expect: "bill_or_payment" },
      { field: "trust.severity_level",    expect: "low",    note: "routine bill, not overdue — low is correct" },
      { field: "trust.processing_mode",   expect: "normal" },
      { field: "deadline_card_date",      expect: "24 June 2026",  note: "may also appear as 24 June" },
      { field: "amounts_include",         expect: "£187.42" },
      { field: "card5_title",             expect: "What could happen if I ignore it?", note: "low severity but states a real consequence ('referred for further action')" },
      { field: "card5_contains",          expect: "further action" }
    ]
  },
  {
    id: "DOC_2",
    label: "Sheffield Council Tax — annual notice",
    group: "A — Original three",
    text: DOC_2_COUNCIL_TAX,
    category: "auto",
    assertions: [
      { field: "trust.document_category", expect: "government",    note: "Sheffield City Council routes to government, not bill_or_payment" },
      { field: "trust.severity_level",    expect: "low" },
      { field: "trust.processing_mode",   expect: "normal" },
      { field: "amounts_include",         expect: "£2,104.00" },
      { field: "card5_title",             expect: "What should I check?", note: "informational annual notice, no real threat — must NOT show a consequence card" }
    ]
  },
  {
    id: "DOC_3",
    label: "Sheffield Environmental Services — enforcement notice",
    group: "A — Original three",
    text: DOC_3_ENFORCEMENT,
    category: "auto",
    assertions: [
      { field: "trust.document_category", expect: "government" },
      { field: "trust.severity_level",    expect: "high" },
      { field: "deadline_card_contains",  expect: "26 May 2026" },
      { field: "card5_title",             expect: "What could happen if I ignore it?" },
      { field: "card5_contains",          expect: "prosecution" }
    ]
  },
  {
    id: "DOC_4",
    label: "Sheffield Council Legal — council tax arrears enforcement",
    group: "B — Stress-test documents",
    text: DOC_4_CT_ARREARS,
    category: "auto",
    assertions: [
      { field: "trust.severity_level",   expect: "high" },
      { field: "amounts_include",        expect: "£450.00" },
      { field: "deadline_card_contains", expect: "16 June 2026" },
      { field: "card5_title",            expect: "What could happen if I ignore it?" },
      { field: "card5_contains",         expect: "prosecution" }
    ]
  },
  {
    id: "DOC_5",
    label: "British Telecom — final notice, outstanding balance",
    group: "B — Stress-test documents",
    text: DOC_5_BT_FINAL_NOTICE,
    category: "auto",
    assertions: [
      { field: "trust.document_category", expect: "bill_or_payment" },
      { field: "trust.severity_level",    expect: "urgent" },
      { field: "amounts_include",         expect: "£124.99" },
      { field: "trust.processing_mode",   expect: "normal" }
    ]
  },
  {
    id: "DOC_6",
    label: "Sheffield Housing Benefits — review notice (two obligations)",
    group: "B — Stress-test documents",
    text: DOC_6_HOUSING_BENEFIT_REVIEW,
    category: "auto",
    assertions: [
      { field: "action_steps_count_gte", expect: 2, note: "multi-obligation fix" }
    ]
  },
  {
    id: "DOC_7",
    label: "Barclays Personal Lending — notice of arrears",
    group: "B — Stress-test documents",
    text: DOC_7_BARCLAYS_ARREARS,
    category: "auto",
    assertions: [
      { field: "trust.document_category", expect: "bill_or_payment" },
      { field: "trust.severity_level",    expect: "high" },
      { field: "amounts_include",         expect: "£320.00" },
      { field: "deadline_card_contains",  expect: "24 June 2026",     note: "extractDeadline picks the action deadline via 'to pay' context, not the letter date or overdue date" },
      { field: "card5_title",             expect: "What could happen if I ignore it?" },
      { field: "card5_contains",          expect: ["debt collection", "credit reference"], note: "consequence surfaced with attribution + 'may include' hedge" }
    ]
  },
  {
    id: "DOC_8",
    label: "HMRC phishing letter (scam)",
    group: "B — Stress-test documents",
    text: DOC_8_HMRC_PHISHING,
    category: "auto",
    assertions: [
      { field: "trust.processing_mode",   expect: "verification_only",  note: "SAFETY CRITICAL" },
      { field: "trust.trust_assessment",  expect: "low" },
      { field: "action_card_no_pay",      expect: true,                 note: "no payment instructions in verification_only mode" }
    ]
  },
  {
    id: "DOC_9",
    label: "Severn Trent Water — payment reminder (department name first)",
    group: "B — Stress-test documents",
    text: DOC_9_SEVERN_TRENT,
    category: "auto",
    assertions: [
      { field: "trust.document_category", expect: "bill_or_payment" },
      { field: "amounts_include",         expect: "£94.50" },
      { field: "deadline_card_contains",  expect: "20 June 2026" }
    ],
    knownIssues: [
      "Sender may be detected as 'Customer Accounts Team' rather than 'Severn Trent Water' because department name appears first in the letter"
    ]
  },
  {
    id: "DOC_10",
    label: "NHS Hallamshire — outpatient appointment",
    group: "B — Stress-test documents",
    text: DOC_10_NHS_APPOINTMENT,
    category: "auto",
    assertions: [
      { field: "trust.document_category", expect: "appointment" },
      { field: "trust.severity_level",    expect: "medium" },
      { field: "deadline_card_contains",  expect: "July" },
      { field: "card5_title",             expect: "What should I check?", note: "medium severity but no document consequence — must NOT manufacture a threat" }
    ]
  },
  {
    id: "DOC_11",
    label: "OCR-garbled energy bill (PowerGrid)",
    group: "C — OCR quality documents",
    text: DOC_11_GARBLED_ENERGY,
    category: "auto",
    assertions: [
      { field: "trust.processing_mode",       expect: "caution",                        note: "SAFETY CRITICAL — garble detection" },
      { field: "trust.input_quality",         expect: "borderline" },
      { field: "deadline_card_no_specific_date", expect: true,                          note: "SAFETY CRITICAL — date suppression when garbled" },
      { field: "what_is_this_has_quality_warning", expect: true,                        note: "quality warning in card" }
    ]
  },
  {
    id: "DOC_12",
    label: "Two letters merged without separator",
    group: "C — OCR quality documents",
    text: DOC_12_MERGED_LETTERS,
    category: "auto",
    assertions: [
      { field: "no_throw",       expect: true },
      { field: "cards_count",    expect: 6 }
    ]
  },
  {
    id: "DOC_13",
    label: "Council tax notice cut off mid-sentence",
    group: "C — OCR quality documents",
    text: DOC_13_CUT_OFF,
    category: "auto",
    assertions: [
      { field: "no_throw",                     expect: true },
      { field: "deadline_card_no_invented_date", expect: true, note: "document ends before deadline section" }
    ]
  },
  {
    id: "DOC_14",
    label: "Heavily garbled — near-unreadable",
    group: "C — OCR quality documents",
    text: DOC_14_UNREADABLE,
    category: "auto",
    assertions: [
      { field: "trust.input_quality",   expect: "poor" },
      { field: "trust.processing_mode", expect: "unsupported" }
    ]
  },
  {
    id: "DOC_15",
    label: "DWP Housing Benefit award — two distinct obligations",
    group: "D — Multi-obligation",
    text: DOC_15_MULTI_OBLIGATION,
    category: "auto",
    assertions: [
      { field: "action_steps_count_gte", expect: 2, note: "multi-obligation fix regression test" }
    ]
  }
];

// ── Assertion engine ──────────────────────────────────────────────────────────

function getValue(output, field) {
  const parts = field.split(".");
  let val = output;
  for (const p of parts) {
    if (val == null) return undefined;
    val = val[p];
  }
  return val;
}

function getActionCard(output) {
  return (output.cards || []).find((c) => c.id === "what_do_i_need_to_do");
}

function getDeadlineCard(output) {
  return (output.cards || []).find((c) => c.id === "when_is_it_due");
}

function getWhatIsThisCard(output) {
  return (output.cards || []).find((c) => c.id === "what_is_this");
}

function runAssertions(test, output) {
  const results = [];

  for (const assertion of test.assertions) {
    let actual, pass, note = assertion.note || "";

    if (assertion.field === "no_throw") {
      pass = true;
      actual = "no crash";
    } else if (assertion.field === "cards_count") {
      actual = (output.cards || []).length;
      pass = actual === assertion.expect;
    } else if (assertion.field === "amounts_include") {
      const cardText = (output.cards || []).map((c) => `${c.short_answer} ${(c.steps || []).join(" ")}`).join(" ");
      actual = cardText.includes(assertion.expect) ? assertion.expect : `not found in cards`;
      pass = actual === assertion.expect;
    } else if (assertion.field === "deadline_card_date") {
      const card = getDeadlineCard(output);
      actual = card ? card.date : null;
      const expects = Array.isArray(assertion.expect) ? assertion.expect : [assertion.expect];
      pass = expects.some((e) => actual && actual.includes(e));
    } else if (assertion.field === "deadline_card_contains") {
      const card = getDeadlineCard(output);
      actual = card ? card.short_answer : null;
      const expects = Array.isArray(assertion.expect) ? assertion.expect : [assertion.expect];
      pass = expects.some((e) => actual && actual.includes(e));
    } else if (assertion.field === "deadline_card_no_specific_date") {
      const card = getDeadlineCard(output);
      actual = card ? card.short_answer : null;
      const hasDate = card && card.date;
      const hasSpecificDate = /\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/i.test(actual || "");
      pass = !hasDate && !hasSpecificDate;
      actual = hasDate ? `date present: ${card.date}` : (hasSpecificDate ? `date in text: ${actual}` : "no specific date (correct)");
    } else if (assertion.field === "deadline_card_no_invented_date") {
      const card = getDeadlineCard(output);
      actual = card ? card.short_answer : null;
      const noDate = !card || !card.date;
      pass = noDate;
      actual = card && card.date ? `invented date: ${card.date}` : "no date (correct)";
    } else if (assertion.field === "action_steps_count_gte") {
      const card = getActionCard(output);
      const obligationSteps = (card ? (card.steps || []) : []).filter((s) => /\b(must|are required to|need to)\b/i.test(s));
      actual = obligationSteps.length;
      pass = actual >= assertion.expect;
      if (!pass) actual = `${actual} obligation steps (expected >= ${assertion.expect})`;
    } else if (assertion.field === "action_card_no_pay") {
      const card = getActionCard(output);
      const cardText = card ? [card.short_answer, ...(card.steps || [])].join(" ").toLowerCase() : "";
      const hasDangerous = /\bpay\b|\bclick\b|\breply\b/.test(cardText);
      pass = !hasDangerous;
      actual = hasDangerous ? `DANGEROUS: ${cardText.slice(0, 80)}` : "safe (no pay/click/reply)";
    } else if (assertion.field === "what_is_this_has_quality_warning") {
      const card = getWhatIsThisCard(output);
      actual = card ? card.short_answer : null;
      pass = /text quality|too low|check the original/i.test(actual || "");
      actual = pass ? "quality warning present (correct)" : (actual || "card not found");
    } else if (assertion.field === "card5_title") {
      // Adaptive Card 5: structured_result card index 4 (the live-rendered layer).
      const c5 = (output.structured_result?.cards || [])[4];
      actual = c5 ? c5.title : null;
      pass = actual === assertion.expect;
    } else if (assertion.field === "card5_contains") {
      const c5 = (output.structured_result?.cards || [])[4];
      const text = c5 ? `${c5.simple_explanation} ${(c5.key_points || []).join(" ")}` : "";
      const expects = Array.isArray(assertion.expect) ? assertion.expect : [assertion.expect];
      pass = expects.some((e) => text.includes(e));
      actual = pass ? expects.find((e) => text.includes(e)) : "not found in card 5";
    } else {
      actual = getValue(output, assertion.field);
      const expects = Array.isArray(assertion.expect) ? assertion.expect : [assertion.expect];
      pass = expects.includes(actual);
    }

    results.push({ field: assertion.field, expect: assertion.expect, actual, pass, note });
  }

  return results;
}

// ── Card printer ──────────────────────────────────────────────────────────────

function printCards(output) {
  const trust = output.trust || {};
  console.log(`  category=${trust.document_category}  severity=${trust.severity_level}  mode=${trust.processing_mode}  quality=${trust.input_quality}`);

  for (const card of output.cards || []) {
    console.log(`\n  [${card.id}] ${card.title}`);
    console.log(`  "${card.short_answer}"`);
    if (card.steps && card.steps.length > 0 && !(card.steps.length === 1 && card.steps[0] === card.short_answer)) {
      for (const s of card.steps) console.log(`    • ${s}`);
    }
    if (card.date) console.log(`    date: ${card.date}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const allResults = [];
  let currentGroup = null;

  for (const test of TESTS) {
    if (test.group !== currentGroup) {
      currentGroup = test.group;
      console.log("\n" + "█".repeat(72));
      console.log(`  GROUP ${currentGroup}`);
      console.log("█".repeat(72));
    }

    console.log("\n" + "═".repeat(72));
    console.log(`▶ ${test.id}: ${test.label}`);
    console.log("═".repeat(72));

    let output;
    let threw = false;
    try {
      const run = runClearStepsEngine({
        extractedText: test.text,
        fileMeta: { mimeType: "application/pdf", selectedCategory: test.category }
      });
      output = run.api_output;
    } catch (err) {
      threw = true;
      console.log(`  ✗ ENGINE THREW: ${err.message}`);
      allResults.push({ id: test.id, label: test.label, threw: true, assertions: [] });
      continue;
    }

    printCards(output);

    if (test.knownIssues && test.knownIssues.length > 0) {
      console.log("\n  KNOWN ISSUES:");
      for (const ki of test.knownIssues) console.log(`    ⚠  ${ki}`);
    }

    const assertionResults = runAssertions(test, output);

    console.log("\n  ── ASSERTIONS ──");
    for (const r of assertionResults) {
      const icon = r.pass ? "✓" : "✗";
      const noteStr = r.note ? `  [${r.note}]` : "";
      if (r.pass) {
        console.log(`  ${icon} ${r.field} = ${JSON.stringify(r.actual)}${noteStr}`);
      } else {
        console.log(`  ${icon} ${r.field}`);
        console.log(`    expected: ${JSON.stringify(r.expect)}`);
        console.log(`    actual:   ${JSON.stringify(r.actual)}${noteStr}`);
      }
    }

    allResults.push({ id: test.id, label: test.label, threw, assertions: assertionResults });
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log("\n" + "═".repeat(72));
  console.log("SUMMARY");
  console.log("═".repeat(72));

  let totalPass = 0, totalFail = 0, totalThrow = 0;
  const safetyFails = [];

  for (const result of allResults) {
    if (result.threw) {
      totalThrow++;
      console.log(`  ✗ CRASH  ${result.id}: ${result.label}`);
      continue;
    }
    const fails = result.assertions.filter((a) => !a.pass);
    const passes = result.assertions.filter((a) => a.pass);
    totalPass += passes.length;
    totalFail += fails.length;

    if (fails.length === 0) {
      console.log(`  ✓ PASS   ${result.id}: ${result.label}`);
    } else {
      console.log(`  ✗ FAIL   ${result.id}: ${result.label}`);
      for (const f of fails) {
        const noteStr = f.note ? ` [${f.note}]` : "";
        console.log(`           ${f.field}: got ${JSON.stringify(f.actual)}, expected ${JSON.stringify(f.expect)}${noteStr}`);
        if (f.note && f.note.toUpperCase().includes("SAFETY")) {
          safetyFails.push(`${result.id} — ${f.field}: ${f.note}`);
        }
      }
    }
  }

  console.log(`\n  Assertions: ${totalPass} passed, ${totalFail} failed, ${totalThrow} crashed`);

  if (safetyFails.length > 0) {
    console.log("\n  ⚠ SAFETY-CRITICAL FAILURES:");
    for (const sf of safetyFails) console.log(`    ✗ ${sf}`);
  }

  console.log("\n  Check references/known-gotchas.md before treating any FAIL as a new regression.");
  console.log("═".repeat(72) + "\n");
}

main();
