const test = require("node:test");
const assert = require("node:assert/strict");

const { runClearStepsEngine } = require("../src/services/clearStepsEngine");
const {
  applyAiStructuredResult,
  normalizeAiErrorCode,
  summarizeValidationErrors,
  stripAiViolations,
  sanitizeAiTextField
} = require("../src/services/aiStructuredResultService");
const {
  sanitizeStructuredResult,
  validateStructuredResult
} = require("../src/utils/validateStructuredResult");

function buildRulesRun() {
  return runClearStepsEngine({
    extractedText: [
      "NHS Hallamshire Hospital",
      "Outpatient Appointment Department",
      "Sheffield Teaching Hospitals NHS Foundation Trust",
      "",
      "Mr J Vaidya",
      "14 Maple Close",
      "Sheffield S3 8LT",
      "",
      "Dear Mr Vaidya,",
      "",
      "Outpatient Appointment",
      "",
      "We are pleased to confirm your outpatient appointment at the Hallamshire Hospital.",
      "",
      "Date:        Tuesday 1 July 2026",
      "Time:        10:30am",
      "Location:    Clinic 4, Ground Floor, Hallamshire Hospital",
      "Consultant:  Dr A Patel",
      "",
      "Please arrive 15 minutes early to allow time for registration.",
      "Bring this letter, your medication list, and photo ID.",
      "",
      "If you are unable to attend please telephone 0114 271 1900 as soon as possible.",
      "Missed appointments without notice waste NHS resources and may result in discharge.",
      "",
      "Patient advice line: 0114 271 1900",
      "Reference: OPD/2026/449213"
    ].join("\n"),
    fileMeta: {
      jobId: "test-job-id",
      anonymousSessionId: "anon-test-id",
      mimeType: "application/pdf",
      selectedCategory: "medical"
    }
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("AI layer keeps rules output when OPENAI_API_KEY is missing", async () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const rulesRun = buildRulesRun();
    const fallbackStructuredResult = rulesRun.api_output.structured_result;

    const result = await applyAiStructuredResult({
      rulesRun,
      extractedText: "NHS appointment letter with a clear appointment date."
    });

    assert.equal(result.api_output.structured_result, fallbackStructuredResult);
    assert.equal(result.api_output.cards.length, 6);
    assert.equal(result.api_output.debug.ai.ai_used, false);
    assert.equal(result.api_output.debug.ai.ai_status, "skipped");
    assert.equal(result.api_output.debug.ai.ai_error_code, "missing_api_key");
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  }
});

test("structured result validation rejects unsafe action advice", () => {
  const fallback = buildRulesRun().api_output.structured_result;
  const unsafeCandidate = clone(fallback);

  unsafeCandidate.cards[2].simple_explanation = "You should pay now.";

  const validation = validateStructuredResult(unsafeCandidate, fallback);

  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /unsafe advice/i);
});

test("structured result sanitiser preserves anonymous session and privacy flags", () => {
  const fallback = buildRulesRun().api_output.structured_result;
  const candidate = clone(fallback);

  candidate.session_id = "changed-session-id";
  candidate.anonymous_session_id = "changed-anonymous-id";
  candidate.privacy.original_file_stored = true;
  candidate.privacy.ocr_text_stored = true;
  candidate.privacy.document_text_stored = true;
  candidate.privacy.personal_details_stored = true;

  const sanitized = sanitizeStructuredResult(candidate, fallback);
  const validation = validateStructuredResult(sanitized, fallback);

  assert.equal(validation.valid, true);
  assert.equal(sanitized.session_id, fallback.session_id);
  assert.equal(sanitized.anonymous_session_id, fallback.anonymous_session_id);
  assert.deepEqual(sanitized.privacy, {
    original_file_stored: false,
    ocr_text_stored: false,
    document_text_stored: false,
    personal_details_stored: false
  });
});

test("structured result sanitiser falls back when AI output is unsafe", () => {
  const fallback = buildRulesRun().api_output.structured_result;
  const unsafeCandidate = clone(fallback);

  unsafeCandidate.cards[2].simple_explanation = "Click this link and make a payment.";

  const sanitized = sanitizeStructuredResult(unsafeCandidate, fallback);

  assert.equal(sanitized, fallback);
});

test("AI error normalizer maps DOM abort code 20 to timeout", () => {
  assert.equal(normalizeAiErrorCode({ name: "AbortError", code: 20 }), "ai_timeout");
  assert.equal(normalizeAiErrorCode({ code: "20" }), "ai_timeout");
});

test("AI validation summary is safe and compact", () => {
  const summary = summarizeValidationErrors([
    "missing field: structured_result.cards",
    "card what_do_i_need_to_do contains unsafe advice"
  ]);

  assert.deepEqual(summary, [
    "missing field: structured_result.cards",
    "card what_do_i_need_to_do contains unsafe advice"
  ]);
});

// ─── sanitizeAiTextField ─────────────────────────────────────────────────────

test("sanitizer replaces sentence-initial imperative pay instruction with cautious framing", () => {
  const result = sanitizeAiTextField("Pay £89.20 by 25 June 2026 to avoid disconnection.");
  assert.match(result, /check the original document/i);
  assert.doesNotMatch(result, /£89\.20/);
});

test("sanitizer replaces 'you must pay' directive with cautious framing", () => {
  const result = sanitizeAiTextField("You must pay the outstanding balance immediately.");
  assert.match(result, /check the original document/i);
});

test("sanitizer replaces 'then pay by' tail-clause directive", () => {
  const result = sanitizeAiTextField("Check the payment amount and due date, then pay by 25 June 2026.");
  assert.match(result, /check the original document/i);
  assert.doesNotMatch(result, /then pay/i);
});

test("sanitizer replaces 'and pay by' tail-clause directive", () => {
  const result = sanitizeAiTextField("Check the payment amount and pay by the due date to avoid disconnection.");
  assert.match(result, /check the original document/i);
  assert.doesNotMatch(result, /and pay/i);
});

test("sanitizer consumes domain suffix when replacing debt org name", () => {
  const result = sanitizeAiTextField("Advice available from StepChange at stepchange.org.");
  assert.doesNotMatch(result, /stepchange/i);
  assert.doesNotMatch(result, /\.org/);
});

test("sanitizer replaces 'must pay it by' in mid-sentence", () => {
  const result = sanitizeAiTextField("You owe £1,247.50 on your mortgage and must pay it by 15 July 2026 to avoid escalation.");
  assert.match(result, /check the original document/i);
  assert.doesNotMatch(result, /must pay/i);
});

test("sanitizer leaves descriptive payment sentence unchanged", () => {
  const result = sanitizeAiTextField("A payment of £89.20 is due by 25 June 2026.");
  assert.equal(result, "A payment of £89.20 is due by 25 June 2026.");
});

test("sanitizer replaces sentence directing user to call a specific phone number", () => {
  const result = sanitizeAiTextField("Call 0800 800 900 to speak to a mortgage arrears adviser.");
  assert.match(result, /use contact details from the original document/i);
  assert.doesNotMatch(result, /0800/);
});

test("sanitizer replaces named debt advice organisation", () => {
  const result = sanitizeAiTextField("For debt advice, contact StepChange.");
  assert.match(result, /trusted advice service/i);
  assert.doesNotMatch(result, /stepchange/i);
});

test("sanitizer replaces named org and phone in the same sentence", () => {
  const result = sanitizeAiTextField("Contact Citizens Advice on 0800 144 8848 for free help.");
  assert.doesNotMatch(result, /citizens advice/i);
  assert.doesNotMatch(result, /0800/);
});

test("sanitizer redacts a standalone phone number that is not a call instruction", () => {
  const result = sanitizeAiTextField("Our reference number is shown as 0333 202 9802 in the header.");
  assert.doesNotMatch(result, /0333/);
  assert.match(result, /the number in the original document/i);
});

test("sanitizer leaves ordinary text without violations unchanged", () => {
  const text = "This document appears to be from Sheffield City Council. Keep the reference number safe.";
  assert.equal(sanitizeAiTextField(text), text);
});

test("sanitizer handles multi-sentence text with one violation", () => {
  const result = sanitizeAiTextField(
    "This is an arrears notice from Barclays. Pay £320.00 by 24 June 2026. Keep a copy of this letter."
  );
  assert.match(result, /arrears notice from Barclays/);
  assert.match(result, /check the original document/i);
  assert.match(result, /keep a copy/i);
  assert.doesNotMatch(result, /£320/);
});

// ─── stripAiViolations ───────────────────────────────────────────────────────

test("stripAiViolations cleans violations across all text fields in all cards", () => {
  const fallback = buildRulesRun().api_output.structured_result;
  const candidate = clone(fallback);

  candidate.cards[2].simple_explanation = "Pay £89.20 by 25 June 2026 to avoid disconnection.";
  candidate.cards[2].read_aloud_text = "Call 0800 800 900 for help.";
  candidate.cards[4].simple_explanation = "Contact StepChange for free debt advice.";

  const stripped = stripAiViolations(candidate);

  assert.doesNotMatch(stripped.cards[2].simple_explanation, /£89\.20/);
  assert.doesNotMatch(stripped.cards[2].read_aloud_text, /0800/);
  assert.doesNotMatch(stripped.cards[4].simple_explanation, /stepchange/i);
  assert.equal(stripped.cards.length, 6);
});

test("stripAiViolations cleans violations in key_points array", () => {
  const fallback = buildRulesRun().api_output.structured_result;
  const candidate = clone(fallback);

  candidate.cards[2].key_points = [
    "Pay £1,247.50 by 15 July 2026.",
    "Contact Barclays on 0800 800 900 to discuss a repayment plan.",
    "Consider money advice from StepChange if needed."
  ];

  const stripped = stripAiViolations(candidate);
  const points = stripped.cards[2].key_points.join(" ");

  assert.doesNotMatch(points, /£1,247\.50/);
  assert.doesNotMatch(points, /0800/);
  assert.doesNotMatch(points, /stepchange/i);
});

test("stripAiViolations cleans violations in action_needed field", () => {
  const fallback = buildRulesRun().api_output.structured_result;
  const candidate = clone(fallback);

  candidate.cards[2].action_needed = "Pay the overdue amount by 15 July 2026 or contact the lender.";

  const stripped = stripAiViolations(candidate);

  assert.doesNotMatch(stripped.cards[2].action_needed || "", /pay the overdue/i);
});

test("stripAiViolations does not mutate the input object", () => {
  const fallback = buildRulesRun().api_output.structured_result;
  const candidate = clone(fallback);
  candidate.cards[0].simple_explanation = "Pay £50.00 now.";

  const original = candidate.cards[0].simple_explanation;
  stripAiViolations(candidate);
  assert.equal(candidate.cards[0].simple_explanation, original);
});

test("stripAiViolations passes through clean output unchanged", () => {
  const fallback = buildRulesRun().api_output.structured_result;
  const stripped = stripAiViolations(clone(fallback));
  assert.equal(JSON.stringify(stripped.cards), JSON.stringify(fallback.cards));
});
