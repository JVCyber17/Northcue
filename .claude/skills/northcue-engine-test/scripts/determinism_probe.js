// ─────────────────────────────────────────────────────────────────────────────
// Rules-engine determinism probe (standalone, on-demand)
//
// WHAT IT PROVES
//   Runs three golden fixture documents (low / high / urgent severity) through
//   the rules engine (runClearStepsEngine) five times each and diffs the outputs.
//   It demonstrates that the engine's CONTENT is fully deterministic: document
//   category, severity, processing mode, input quality, all six card titles and
//   short answers, and every extracted amount and date are IDENTICAL on every
//   run. The only fields that change between runs are job_id (a random UUID) and
//   created_at (a timestamp) — non-content metadata, reported separately so the
//   evidence is honest and complete.
//
//   This is the reproducible evidence behind the claim "the same document always
//   produces the same facts." Re-run it after any engine change, or to regenerate
//   the evidence for grant applications.
//
// SCOPE
//   This probe exercises the RULES ENGINE only (runClearStepsEngine). It does NOT
//   call the OpenAI phrasing layer (applyAiStructuredResult). That layer rewrites
//   only card WORDING and is pinned to temperature 0 for near-determinism; the
//   facts shown here never depend on it.
//
// HOW TO RUN (from the repo root)
//   node .claude/skills/northcue-engine-test/scripts/determinism_probe.js
//
// EXIT / READING THE OUTPUT
//   Every CONTENT row should read IDENTICAL. The final line prints the verdict:
//   "every CONTENT field was IDENTICAL across all runs" = determinism confirmed.
//   If any content row reads VARIED, the engine has become non-deterministic and
//   the differing values are printed for investigation.
//
//   Fixtures are copied verbatim from run_engine_tests.js (DOC_2 / DOC_3 / DOC_5)
//   and embedded here so the probe is fully self-contained. This does NOT modify
//   the engine or the test harness.
// ─────────────────────────────────────────────────────────────────────────────

const path = require("node:path");
const ENGINE = path.resolve(__dirname, "../../../..", "src", "services", "clearStepsEngine.js");
const { runClearStepsEngine } = require(ENGINE);

// --- three fixtures copied verbatim from run_engine_tests.js ---
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

const FIXTURES = [
  { id: "DOC_2 (low)", text: DOC_2_COUNCIL_TAX },
  { id: "DOC_3 (high)", text: DOC_3_ENFORCEMENT },
  { id: "DOC_5 (urgent)", text: DOC_5_BT_FINAL_NOTICE },
];

const RUNS = 5;
const AMOUNT_RE = /£\s?\d[\d,]*(?:\.\d{2})?/g;
const DATE_RE =
  /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b|\b\d{2}\/\d{2}\/\d{4}\b/gi;

function surfacedText(out) {
  const rules = (out.cards || [])
    .map((c) => `${c.short_answer || ""} ${(c.steps || []).join(" ")}`)
    .join(" ");
  const sr = (out.structured_result?.cards || [])
    .map((c) => `${c.title || ""} ${c.simple_explanation || ""} ${(c.key_points || []).join(" ")}`)
    .join(" ");
  return `${rules} ${sr}`;
}

function fingerprint(out) {
  return {
    category: out.trust?.document_category ?? null,
    severity: out.trust?.severity_level ?? null,
    mode: out.trust?.processing_mode ?? null,
    quality: out.trust?.input_quality ?? null,
    cardTitles: (out.structured_result?.cards || []).map((c) => c.title),
    cardShortAnswers: (out.cards || []).map((c) => c.short_answer),
    amounts: surfacedText(out).match(AMOUNT_RE) || [],
    dates: surfacedText(out).match(DATE_RE) || [],
    // metadata (expected to vary by design):
    _jobId: out.job_id ?? null,
    _createdAt: out.debug?.created_at ?? null,
  };
}

function distinct(values) {
  const seen = new Map();
  for (const v of values) seen.set(JSON.stringify(v), v);
  return [...seen.values()];
}

const CONTENT_FIELDS = ["category", "severity", "mode", "quality", "cardTitles", "cardShortAnswers", "amounts", "dates"];

function short(v) {
  const s = Array.isArray(v) ? JSON.stringify(v) : String(v);
  return s.length > 92 ? s.slice(0, 89) + "…" : s;
}

let anyContentVaried = false;

for (const fx of FIXTURES) {
  const prints = [];
  for (let i = 0; i < RUNS; i++) {
    const run = runClearStepsEngine({
      extractedText: fx.text,
      fileMeta: { mimeType: "application/pdf", selectedCategory: "auto" },
    });
    prints.push(fingerprint(run.api_output));
  }

  console.log("\n" + "=".repeat(78));
  console.log(`FIXTURE: ${fx.id}   —   ${RUNS} runs`);
  console.log("=".repeat(78));
  console.log(`${"field".padEnd(18)}${"result".padEnd(12)}value(s)`);
  console.log("-".repeat(78));

  for (const field of CONTENT_FIELDS) {
    const values = prints.map((p) => p[field]);
    const uniq = distinct(values);
    const identical = uniq.length === 1;
    if (!identical) anyContentVaried = true;
    const label = identical ? "IDENTICAL" : `VARIED(${uniq.length})`;
    if (identical) {
      console.log(`${field.padEnd(18)}${label.padEnd(12)}${short(uniq[0])}`);
    } else {
      console.log(`${field.padEnd(18)}${label.padEnd(12)}`);
      uniq.forEach((u, idx) => console.log(`${" ".repeat(30)}[${idx + 1}] ${short(u)}`));
    }
  }

  // metadata fields, reported separately
  const jobIds = distinct(prints.map((p) => p._jobId));
  const createdAts = distinct(prints.map((p) => p._createdAt));
  console.log("-".repeat(78));
  console.log(`${"job_id (meta)".padEnd(18)}${(jobIds.length === 1 ? "IDENTICAL" : `VARIED(${jobIds.length})`).padEnd(12)}${jobIds.length === 1 ? short(jobIds[0]) : "random per run"}`);
  console.log(`${"created_at (meta)".padEnd(18)}${(createdAts.length === 1 ? "IDENTICAL" : `VARIED(${createdAts.length})`).padEnd(12)}${createdAts.length === 1 ? short(createdAts[0]) : "timestamp per run"}`);
}

console.log("\n" + "#".repeat(78));
console.log(anyContentVaried
  ? "VERDICT: at least one CONTENT field varied across runs (see VARIED rows above)."
  : "VERDICT: every CONTENT field was IDENTICAL across all runs for all 3 fixtures.");
console.log("Note: this probe runs the RULES ENGINE only (runClearStepsEngine); the");
console.log("OpenAI phrasing layer (applyAiStructuredResult) is NOT invoked here.");
console.log("#".repeat(78));
