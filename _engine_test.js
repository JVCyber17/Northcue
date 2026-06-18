// Stress-test: 6 edge-case documents. Assessment only — no code changes this session.
// node _engine_test.js

const { runClearStepsEngine } = require("./src/services/clearStepsEngine");

// DOC 5: Single unconditional obligation — no conditional clause attached.
// Tests whether extractSentenceAround grabs the preceding sentence by mistake.
const DOC_5_SINGLE_OBLIGATION = `
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
`;

// DOC 6: Two separate obligations in different paragraphs.
// Tests whether the engine surfaces only the first or both.
const DOC_6_TWO_OBLIGATIONS = `
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
`;

// DOC 7: Mixed hedged/assertive language in the same sentence.
// Tests that normalizeRiskSentence frames it correctly and preserves the inner hedge.
const DOC_7_MIXED_HEDGE = `
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
`;

// DOC 8: Phishing / scam letter mimicking HMRC with classic red flags.
// Must hit at least one scamSignal keyword ("confirm your account", "act now", etc.)
// to route to verification_only path.
const DOC_8_PHISHING = `
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
`;

// DOC 9: Department name on first meaningful line instead of org name.
// Tests whether extractSummaryFirstLineSender produces a wrong sender guess.
const DOC_9_DEPT_FIRST = `
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
`;

// DOC 10: New document type — NHS outpatient appointment letter.
// Tests the appointment category on a document type not previously run.
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
`;

const docs = [
  { label: "DOC 5: Single unconditional obligation (BT notice)",         text: DOC_5_SINGLE_OBLIGATION },
  { label: "DOC 6: Two separate obligations (housing benefit review)",   text: DOC_6_TWO_OBLIGATIONS   },
  { label: "DOC 7: Mixed hedged/assertive risk language (Barclays)",     text: DOC_7_MIXED_HEDGE       },
  { label: "DOC 8: Phishing letter mimicking HMRC",                      text: DOC_8_PHISHING           },
  { label: "DOC 9: Department name on first line (Severn Trent Water)",  text: DOC_9_DEPT_FIRST        },
  { label: "DOC 10: NHS outpatient appointment letter",                  text: DOC_10_NHS_APPOINTMENT   }
];

for (const doc of docs) {
  console.log("\n" + "═".repeat(72));
  console.log(`▶ ${doc.label}`);
  console.log("═".repeat(72));

  const result = runClearStepsEngine({
    extractedText: doc.text,
    fileMeta: { jobId: "test-001", mimeType: "text/plain", selectedCategory: "auto" }
  });

  const out   = result.api_output;
  const trust = result.structured_output.trust_internal;
  const ext   = result.structured_output.extractor_internal;

  // Print key diagnostic fields
  console.log(`\n  category: ${trust.document_category}  |  severity: ${trust.severity_level}  |  mode: ${trust.processing_mode}  |  trust: ${trust.trust_assessment}`);
  console.log(`  sender_guess: ${trust.sender_guess || "null"}  |  amounts: ${JSON.stringify(ext.money_amounts)}  |  deadline: ${ext.deadline || "null"}`);
  if (trust.scam_signals && trust.scam_signals.length > 0)   console.log(`  scam_signals: ${JSON.stringify(trust.scam_signals)}`);
  if (trust.distrust_signals && trust.distrust_signals.length > 0) console.log(`  distrust_signals: ${JSON.stringify(trust.distrust_signals)}`);

  console.log("\n  ── CUE CARDS ──");
  for (const card of out.cards) {
    console.log(`\n  [${card.id}]  ${card.title}`);
    console.log(`  "${card.short_answer}"`);
    if (card.steps && card.steps.length > 0 && !(card.steps.length === 1 && card.steps[0] === card.short_answer)) {
      for (const s of card.steps) console.log(`    • ${s}`);
    }
    if (card.date) console.log(`  date: ${card.date}`);
  }

  if (out.debug.validation_errors) {
    console.log(`\n  ⚠ VALIDATION ERRORS: ${JSON.stringify(out.debug.validation_errors)}`);
  } else {
    console.log(`\n  ✓ No validation errors`);
  }
}

console.log("\n" + "═".repeat(72));
console.log("Done.");
