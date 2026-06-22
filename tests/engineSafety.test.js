const test = require("node:test");
const assert = require("node:assert/strict");

const { runClearStepsEngine } = require("../src/services/clearStepsEngine");
const { applyAiStructuredResult } = require("../src/services/aiStructuredResultService");

function run(text) {
  return runClearStepsEngine({
    extractedText: text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto" }
  }).api_output;
}

function allCardText(out) {
  return (out.cards || [])
    .map((c) => `${c.title} ${c.short_answer} ${(c.steps || []).join(" ")}`)
    .join("  ");
}

// ── Fix B: credential-phishing scam detection ────────────────────────────────

const SCAM_BANK = [
  "Barcllays Security Team",
  "URGENT: Your account is at risk",
  "We have detected unusual activity on your account.",
  "You must verify your identity within 24 hours or your account will be frozen.",
  "Confirm your card number, PIN and full password at: barclays-secure-verify.com"
].join("\n");

test("credential-phishing message is routed to verification_only", () => {
  const out = run(SCAM_BANK);
  assert.equal(out.trust.processing_mode, "verification_only");
  assert.equal(out.trust.trust_assessment, "low");
});

test("verification_only action card has no pay/click/reply instruction", () => {
  const out = run(SCAM_BANK);
  const action = out.cards.find((c) => c.id === "what_do_i_need_to_do");
  const text = [action.short_answer, ...(action.steps || [])].join(" ").toLowerCase();
  assert.ok(!/\bpay\b|\bclick\b|\breply\b/.test(text), `unsafe action text: ${text}`);
});

test("a legitimate suspended-account bill is NOT flagged as a scam (precision)", () => {
  const legit = [
    "British Telecom",
    "FINAL NOTICE - OUTSTANDING BALANCE",
    "Your account shows an outstanding balance of £124.99.",
    "Your account has been suspended due to non-payment.",
    "You must pay immediately. To make a payment call 0800 800 150."
  ].join("\n");
  const out = run(legit);
  assert.notEqual(out.trust.processing_mode, "verification_only");
});

// ── Fix C: risk card must never dump a raw header ─────────────────────────────

test("a penalty charge notice does not dump raw header text into the risk card", () => {
  const pcn = [
    "Penalty Charge Notice",
    "Westminster City Council",
    "PCN number: WM77120034",
    "Date: 03 June 2026",
    "Vehicle: AB12 CDE",
    "A penalty charge of £130.00 has been issued for parking in a restricted area on 28 May 2026.",
    "If paid within 14 days the charge is reduced to £65.00."
  ].join("\n");
  const out = run(pcn);
  const risk = out.cards.find((c) => c.id === "what_could_happen");
  assert.ok(!/PCN number:/i.test(risk.short_answer), `risk leaked header: ${risk.short_answer}`);
  // no multi-field "Label: value ... Label: value" dump
  const labels = risk.short_answer.match(/\b[A-Za-z][A-Za-z ]{1,20}:\s/g) || [];
  assert.ok(labels.length < 2, `risk looks like a header dump: ${risk.short_answer}`);
});

// ── Fix A: no em/en dashes in any user-facing card text ───────────────────────

test("card output is dash-free (no em or en dashes)", () => {
  const docs = [
    // action-required document (previously contained an em-dash line)
    [
      "Leeds City Council",
      "Single Person Discount Review",
      "You must confirm you still live alone by completing the enclosed form by 30 June 2026.",
      "If the discount no longer applies and you do not tell us, you may have to repay it."
    ].join("\n"),
    // garbled energy bill (exercises the garbled-summary path)
    [
      "P0werGrid Ener9y Serv1ces",
      "ELECTR1CITY B|LL",
      "Am0untdue: £89.2O",
      "Payrnent due by 25June 2026.",
      "lf payrnent is not rece1ved your supply may bedisconnected."
    ].join("\n")
  ];
  for (const d of docs) {
    const out = run(d);
    assert.ok(!/[–—]/.test(allCardText(out)), `dash found in: ${allCardText(out)}`);
  }
});

// ── AI layer: gating + fail-open (architecture must not invert) ───────────────

const GOOD_BILL = [
  "British Gas",
  "YOUR ENERGY BILL",
  "This bill covers the period 1 March 2026 to 31 May 2026.",
  "Total amount due £187.42.",
  "Please pay by 24 June 2026. If you do not pay your account may be referred for further action."
].join("\n");

async function runAiPass(text, { withKey, fetchImpl }) {
  const rulesRun = runClearStepsEngine({ extractedText: text, fileMeta: { mimeType: "application/pdf" } });
  const rulesCards = JSON.parse(JSON.stringify(rulesRun.api_output.cards));
  const origKey = process.env.OPENAI_API_KEY;
  const origFetch = global.fetch;
  let fetchCalls = 0;
  if (withKey) process.env.OPENAI_API_KEY = "test-key";
  else delete process.env.OPENAI_API_KEY;
  global.fetch = async (...args) => { fetchCalls++; return fetchImpl(...args); };
  try {
    const run2 = await applyAiStructuredResult({ rulesRun, extractedText: text });
    const ai = run2.api_output.debug.ai;
    return { fetchCalls, ai, cards: run2.api_output.cards, rulesCards };
  } finally {
    global.fetch = origFetch;
    if (origKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = origKey;
  }
}

test("AI pass is skipped when no API key is set (no egress)", async () => {
  const r = await runAiPass(GOOD_BILL, { withKey: false, fetchImpl: async () => ({ ok: true, json: async () => ({}) }) });
  assert.equal(r.fetchCalls, 0);
  assert.equal(r.ai.ai_used, false);
  assert.equal(r.ai.ai_status, "skipped");
});

test("AI pass is skipped on borderline/low-quality input (no egress)", async () => {
  const shortText = "Council tax letter. Please pay soon."; // < 160 chars -> borderline
  const r = await runAiPass(shortText, { withKey: true, fetchImpl: async () => ({ ok: true, json: async () => ({}) }) });
  assert.equal(r.fetchCalls, 0);
  assert.equal(r.ai.ai_status, "skipped");
});

test("AI pass fails open to the rules cards when the API errors", async () => {
  const r = await runAiPass(GOOD_BILL, {
    withKey: true,
    fetchImpl: async () => { throw new Error("network down"); }
  });
  assert.equal(r.fetchCalls, 1, "good-quality input with a key should attempt the AI call");
  assert.equal(r.ai.ai_used, false);
  assert.equal(r.ai.ai_status, "fallback");
  // user-visible cards are unchanged (rules output preserved)
  assert.deepEqual(r.cards, r.rulesCards);
});
