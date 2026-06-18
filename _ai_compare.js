// Side-by-side comparison: rules-only vs AI-pass output.
// node _ai_compare.js
//
// If OPENAI_API_KEY is set: runs both passes for each document and shows diffs.
// If not set: shows the rules-only structured_result (the exact input the AI pass
// would receive) so quality can be judged without a live API call.

const { loadEnvFile } = require("./src/utils/loadEnv");
loadEnvFile(__dirname);

const { runClearStepsEngine } = require("./src/services/clearStepsEngine");
const { applyAiStructuredResult } = require("./src/services/aiStructuredResultService");

// ── Test documents ────────────────────────────────────────────────────────────

const DOCS = [
  {
    label: "DOC 1 — Clean energy bill",
    category: "bill",
    text: [
      "Electricity Bill Statement",
      "Reference: ref-elec-1034",
      "PowerGrid Energy Services",
      "Account: 9274610",
      "Date: 10 June 2026",
      "",
      "Your electricity bill for the period 1 March 2026 to 31 May 2026.",
      "Amount due: £89.20",
      "Payment due by 25 June 2026.",
      "",
      "Please pay online at powergrid.co.uk or call 0800 999 1234.",
      "If payment is not received by the due date your supply may be disconnected."
    ].join("\n")
  },
  {
    label: "DOC 2 — Council tax notice",
    category: "other",
    text: [
      "Council Tax Notice",
      "Westfield Council",
      "Reference: CT-2026-448821",
      "Amount due: £1,420.00",
      "This is your annual council tax bill for the period 1 April 2026 to 31 March 2027.",
      "Payment is due in full by 30 April 2026, or you may pay in 10 monthly instalments.",
      "If you do not pay, we may take legal action to recover the debt."
    ].join("\n")
  },
  {
    label: "DOC 3 — Moderately garbled OCR bill",
    category: "auto",
    text: [
      "P0werGrid Ener9y Serv1ces",
      "Custorner Acc0unts",
      "PO B0x 847 Leeds LS99 3AB",
      "",
      "Acc0unt: 9274610",
      "Date: lO June 2026",
      "",
      "ELECTR1CITY B|LL",
      "",
      "Y0ur electricity bill f0r the peri0d 1 March 2026 to 31 May2026.",
      "",
      "Am0untdue: £89.2O",
      "",
      "Payrnent due by 25June 2026.",
      "",
      "Pleose pay onIine at powergr1d.co.uk or call O8OO 999 1234.",
      "",
      "lf payrnent is not rece1ved by the due date your supply may bedisconnected",
      "and a recon nection fee will apply.",
      "",
      "Reference: PG-2026-9274610"
    ].join("\n")
  },
  {
    label: "DOC 4 — Barclays-style rent arrears (cautious path)",
    category: "auto",
    text: [
      "Barclays Mortgage Services",
      "Customer Arrears Team",
      "PO Box 1234",
      "Manchester M1 1AA",
      "",
      "Account number: 40-22-99 / 12345678",
      "",
      "Dear Mr Okafor,",
      "",
      "RE: Mortgage Arrears — Urgent",
      "",
      "We are writing to let you know that your mortgage account is in arrears.",
      "The total amount currently overdue is £1,247.50.",
      "",
      "We must receive the arrears balance by 15 July 2026.",
      "If this is not received by the date above, we may need to escalate this matter,",
      "which could affect your credit record and, in serious cases, your home.",
      "",
      "Please contact our arrears team on 0800 800 900 to discuss a repayment plan.",
      "You may also be entitled to independent money advice through StepChange at stepchange.org.",
      "",
      "Yours sincerely,",
      "Barclays Mortgage Services"
    ].join("\n")
  }
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function printCard(card) {
  const label = card.card_id || card.legacyId || card.id || "?";
  console.log(`  [${label}]`);
  console.log(`    title:       ${card.title}`);
  console.log(`    explanation: ${card.simple_explanation}`);
  if (Array.isArray(card.key_points) && card.key_points.length > 0) {
    for (const kp of card.key_points) console.log(`      • ${kp}`);
  }
  if (card.possible_deadline) console.log(`    deadline:    ${card.possible_deadline}`);
  if (card.possible_payment) console.log(`    payment:     ${card.possible_payment}`);
  console.log(`    confidence:  ${card.confidence_level}  |  action_needed: ${card.action_needed || "null"}`);
  if (card.read_aloud_text) console.log(`    tts:         ${card.read_aloud_text}`);
}

function printTrustLine(output) {
  const t = output.api_output.trust;
  console.log(`  category=${t.document_category}  severity=${t.severity_level}  mode=${t.processing_mode}  quality=${t.input_quality}  garbled=${t.garbled_by_ocr || false}`);
}

function printAiMeta(output) {
  const ai = output.api_output.debug?.ai;
  if (!ai) { console.log("  [no ai metadata]"); return; }
  const used = ai.ai_used ? "YES" : `NO (${ai.ai_status} / ${ai.ai_error_code})`;
  console.log(`  ai_used=${used}  duration=${ai.ai_duration_ms}ms`);
}

function diffStructuredResults(rules, ai) {
  const rulesCards = rules.cards || [];
  const aiCards = ai.cards || [];
  let anyDiff = false;
  for (let i = 0; i < Math.max(rulesCards.length, aiCards.length); i++) {
    const r = rulesCards[i] || {};
    const a = aiCards[i] || {};
    const changed = [];
    for (const key of ["title", "simple_explanation", "key_points", "action_needed", "possible_deadline", "possible_payment", "read_aloud_text", "confidence_level"]) {
      const rv = JSON.stringify(r[key] ?? null);
      const av = JSON.stringify(a[key] ?? null);
      if (rv !== av) changed.push({ key, rules: rv, ai: av });
    }
    if (changed.length > 0) {
      anyDiff = true;
      const id = r.card_id || a.card_id || `card_${i+1}`;
      console.log(`  ── CHANGED: ${id} ──`);
      for (const { key, rules: rv, ai: av } of changed) {
        console.log(`    ${key}`);
        console.log(`      RULES: ${rv}`);
        console.log(`      AI:    ${av}`);
      }
    }
  }
  if (!anyDiff) console.log("  [no changes — AI returned the same structured_result]");
  return anyDiff;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const hasKey = !!process.env.OPENAI_API_KEY;
  console.log(`\nOPENAI_API_KEY: ${hasKey ? "SET ✓" : "NOT SET — showing rules-only structured_result (AI diff not available)"}`);

  for (const doc of DOCS) {
    console.log("\n" + "═".repeat(72));
    console.log(`▶ ${doc.label}`);
    console.log("═".repeat(72));

    // Rules-only run
    const rulesRun = runClearStepsEngine({
      extractedText: doc.text,
      fileMeta: { mimeType: "application/pdf", selectedCategory: doc.category }
    });

    printTrustLine(rulesRun);

    // Six cue cards (main UI — AI pass does NOT modify these)
    console.log("\n  ── RULES cue cards (api_output.cards — not modified by AI pass) ──");
    for (const card of rulesRun.api_output.cards) {
      console.log(`  [${card.id}] ${card.title}: "${card.short_answer}"`);
      if (card.steps && card.steps.length > 0 && !(card.steps.length === 1 && card.steps[0] === card.short_answer)) {
        for (const s of card.steps) console.log(`    • ${s}`);
      }
      if (card.date) console.log(`    date: ${card.date}`);
    }

    // Structured result (what the AI pass receives and may improve)
    const rulesStructured = rulesRun.api_output.structured_result;
    console.log("\n  ── RULES structured_result (input to AI pass / accessibility layer) ──");
    if (rulesStructured && Array.isArray(rulesStructured.cards)) {
      for (const card of rulesStructured.cards) printCard(card);
    } else {
      console.log("  [no structured_result]");
    }

    if (!hasKey) {
      console.log("\n  [AI diff skipped — no OPENAI_API_KEY]");
      continue;
    }

    // AI pass
    console.log("\n  ── Running AI pass... ──");
    const startMs = Date.now();
    const aiRun = await applyAiStructuredResult({ rulesRun, extractedText: doc.text });
    const elapsed = Date.now() - startMs;
    console.log(`  AI pass wall time: ${elapsed}ms`);
    printAiMeta(aiRun);

    const aiStructured = aiRun.api_output.structured_result;
    console.log("\n  ── DIFF: structured_result fields changed by AI pass ──");
    diffStructuredResults(rulesStructured, aiStructured);

    if (aiRun.api_output.debug?.ai?.ai_used) {
      console.log("\n  ── AI structured_result cards (full) ──");
      for (const card of aiStructured.cards) printCard(card);
    }
  }

  console.log("\n" + "═".repeat(72));
  console.log("Done.");
  console.log("═".repeat(72) + "\n");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
