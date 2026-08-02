const DEFAULT_MODEL = "gpt-4.1-mini";

// A MISCONFIGURED NUMBER MUST NOT DISABLE THE AI IN SILENCE.
//
// Both settings below used to be read as `Number(process.env.X || default)`,
// which turns any value Number() cannot parse into NaN and carries it into a
// place where NaN means something, quietly:
//
//   CLEARSTEPS_AI_TIMEOUT_MS=25s   -> NaN -> setTimeout coerces NaN to 1ms, so
//     every call aborts before the request is even sent. Every reader gets the
//     rules cards, every session records ai_timeout, and nothing anywhere says
//     the timeout was never a number. Confirmed by execution, including the
//     TimeoutNaNWarning Node emits and nobody reads.
//
//   CLEARSTEPS_AI_TEXT_MAX_CHARS=8k -> Math.max(1000, NaN) is NaN, and
//     "text".slice(0, NaN) is "". The model is sent an EMPTY document and still
//     told to improve the cards using only the document text below. That is the
//     worse of the two, because it fails towards a model working from nothing.
//
// Zero and negative are rejected alongside NaN and Infinity because they are
// the same failure, not a different one: a zero or negative timeout aborts
// instantly, and a zero-length cap sends no document. One behaviour change
// comes with that, and it is the intended one: CLEARSTEPS_AI_TIMEOUT_MS=0
// previously aborted every call and now uses 25000.
//
// Loud, and unconditionally so. This does not go through logAiDebug, because
// that is gated behind CLEARSTEPS_AI_DEBUG and a misconfiguration nobody sees
// is the whole problem being fixed.
function positiveNumberSetting(name, defaultValue, minimum) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || String(raw).trim() === "") return defaultValue;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(`[northcue-ai] ${name}=${JSON.stringify(String(raw).slice(0, 40))} is not a positive number. Using ${defaultValue}.`);
    return defaultValue;
  }

  return typeof minimum === "number" ? Math.max(minimum, parsed) : parsed;
}

const AI_TIMEOUT_MS = positiveNumberSetting("CLEARSTEPS_AI_TIMEOUT_MS", 25000);
// Max characters of document text sent to OpenAI. Lowered from 12000 to 8000 for
// privacy; env-configurable so it can be raised if a genuinely long document is
// ever cut off mid-content.
const AI_OUTBOUND_TEXT_MAX_CHARS = positiveNumberSetting("CLEARSTEPS_AI_TEXT_MAX_CHARS", 8000, 1000);

// THE ONE PLACE THAT DECIDES WHETHER A DOCUMENT MAY REACH THE PROVIDER.
//
// The phrasing pass and the fact extractor must run behind identical gates, or
// "the extractor sends nothing the phrasing pass does not already send" is a
// comment rather than a property. It was a comment in tier 1. This makes it
// structural: both callers ask this function, so a gate added here reaches both
// for free and neither can drift.
//
// Returns null when the provider may be called, or the skip code otherwise.
// Every branch reads a decision the ENGINE has already made. Nothing here
// classifies, scores or judges anything itself.
function providerSkipReason({ rulesRun, language }) {
  const trust = rulesRun.api_output.trust || {};

  // AI phrasing is English only in the multilingual MVP. Non-English interface
  // languages serve the deterministic rules cards, which the frontend
  // translates through the reviewed template bank.
  if (language && language !== "en") return "non_english_language";

  // Low-quality input. Prompt-based suppression was tested and confirmed
  // unreliable with gpt-4.1-mini: the model restated suppressed values and
  // upgraded its own confidence. The engine already expresses the right
  // uncertainty in these cases.
  const inputQuality = trust.input_quality || "unknown";
  const garbledByOcr = Boolean(rulesRun.structured_output?.trust_internal?.garbled_by_ocr);
  if (inputQuality === "borderline" || inputQuality === "poor" || garbledByOcr) return "low_quality_input";

  // Suspected scam. Letting the model rewrite one has been shown to
  // re-introduce the scam's own ask.
  const scamSignals = Array.isArray(trust.scam_signals) ? trust.scam_signals : [];
  if (trust.processing_mode === "verification_only" || scamSignals.length > 0) return "verification_only_state";

  // Unsupported or probable non-document. The engine already emits a calm,
  // honest "this is not an official letter" message.
  if (trust.processing_mode === "unsupported" || trust.is_probable_non_document) return "unsupported_or_non_document";

  if (!process.env.OPENAI_API_KEY) return "missing_api_key";

  return null;
}

async function applySafetyPassAndRecordAiStatus({ rulesRun, extractedText, language }) {
  const output = rulesRun.api_output;

  // Backstop: run the proven pay/credential stripper over the rules-engine cards
  // so safety filtering applies on EVERY path, not only when the AI runs. On the
  // AI-success path these cards are replaced by the (separately stripped) AI
  // output further down; on skip and fallback they are what the user sees.
  sanitiseRulesStructuredResult(output, rulesRun);
  // THE PHRASING PASS IS GONE.
  //
  // The AI no longer writes any sentence a reader sees. It returns facts, the
  // engine composes from them, and the template bank translates what the engine
  // wrote. That is D3, and this is where the old half of it was removed.
  //
  // WHAT THIS FUNCTION STILL DOES, and why it still exists:
  //
  //   1. sanitiseRulesStructuredResult above, which runs stripAiViolations over
  //      the engine's own cards. UNCHANGED, and it must stay. The engine quotes
  //      document sentences, and a quoted sentence that commands is still a
  //      command: "You must pay immediately." lifted off a letter reaches a
  //      card whether a model was involved or not. That is why the stripper was
  //      extended to every path on 30 June 2026, and nothing about D3 changes
  //      it.
  //
  //   2. The gate, and the metadata. providerSkipReason still decides whether a
  //      document may reach the provider, and the FACT extractor asks it in the
  //      route. Recording the answer keeps document_sessions.ai_status
  //      meaningful across the change rather than going blank.
  //
  // RENAMED 2 August 2026, from applyAiStructuredResult. That name described
  // what this used to do and had described it wrongly since the phrasing pass
  // went: it applies no AI structured result, because nothing asks a model for
  // one. The two things it does are in the name now. Zero behaviour change; the
  // baseline is byte-identical across all 60 documents.
  attachAiMetadata(output, {
    ai_used: false,
    ai_status: "skipped",
    ai_provider: "openai",
    ai_model: DEFAULT_MODEL,
    ai_duration_ms: 0,
    // phrasing_removed where the gate would otherwise have allowed a call, so a
    // dashboard reading this field sees the change rather than silence.
    ai_error_code: providerSkipReason({ rulesRun, language }) || "phrasing_removed"
  });
  return rulesRun;
}


// Conservative outbound redaction applied to the document text BEFORE it is sent
// to OpenAI. It masks only clearly-sensitive identifiers: email addresses, phone
// numbers, long account/card numbers (>=11 digits, and 13-19 digits with spaces
// or hyphens), and UK National Insurance numbers. Dates and money amounts are
// deliberately left intact because the "When is it due" and "What matters most"
// cards depend on them; the response side already strips phone numbers the model
// emits, so masking them here costs nothing in cue-card quality.
// PARKED FOLLOW-UP: also strip identifier-type fields from the outbound
// fallbackStructuredResult copy (keep structure, dates, category). Needs a
// careful field-by-field pass against the structured-result schema. See
// docs/privacy-todo.md.
function redactForAi(text) {
  return String(text || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/gi, "[number]")
    .replace(/\b(?:\d[ -]){12,18}\d\b/g, "[number]")
    .replace(/\b\d{11,}\b/g, "[number]")
    .replace(/\b(?:\+?\d[\d\s().-]{9,}\d)\b/g, "[phone]");
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  if (!Array.isArray(data.output)) return "";

  const parts = [];
  for (const item of data.output) {
    if (!Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (typeof content.text === "string") parts.push(content.text);
      if (typeof content.output_text === "string") parts.push(content.output_text);
    }
  }
  return parts.join("\n").trim();
}

function parseJsonObject(text) {
  const trimmed = String(text || "").trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    const error = new Error("ai_json_not_found");
    error.code = "ai_json_not_found";
    throw error;
  }

  try {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  } catch (error) {
    error.code = "ai_json_parse_failed";
    throw error;
  }
}

function attachAiMetadata(output, metadata) {
  output.debug.ai = metadata;
}

// ─── AI output hard-rule violation stripper ───────────────────────────────────
// gpt-4.1-mini does not reliably honour prompt-level "do not" instructions
// (confirmed by live testing on clean documents). These patterns apply
// code-level enforcement after every AI response, regardless of quality.

// Non-global for .test() — global regex .test() is stateful via lastIndex.
const _AI_PHONE_RE = /\b0\d{3,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/;
const _AI_PHONE_G_RE = /\b0\d{3,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g;
// Debt org names with optional domain suffix — e.g. "stepchange.org" must be consumed whole,
// otherwise the replacement leaves a dangling ".org" artifact.
const _AI_DEBT_ORG_RE = /\b(?:stepchange(?:\.org)?|step\s+change|citizens\s+advice(?:\.org(?:\.uk)?)?|national\s+debtline(?:\.org(?:\.uk)?)?|national\s+debt\s+line|money\s*helper(?:\.gov\.uk)?|moneyhelper(?:\.gov\.uk)?|payplan(?:\.co\.uk)?|christians\s+against\s+poverty|debt\s+advice\s+foundation(?:\.org(?:\.uk)?)?)\b/gi;
const _AI_CALL_CONTEXT_RE = /\b(?:call|phone|ring|contact|telephone|speak\s+to|reach)\b/i;
const _AI_PAY_PATTERNS = [
  // Optional "the" before the amount/keyword — catches "Pay the £320.00 owed by..."
  // (an imperative the short-headline rewrite can produce), not just "Pay £320".
  /^(?:please\s+)?pay\s+(?:the\s+)?(?:[£$€]\S+|\d+|amount|balance|outstanding|overdue|immediately|now|by\s)/i,
  /\byou\s+(?:must|should|need\s+to|have\s+to|are\s+required\s+to)\s+pay\b/i,
  /^(?:please\s+)?make\s+(?:a\s+)?payment\s+(?:of|to|by|now|immediately)/i,
  /\b(?:then|and)\s+pay\s+(?:by\b|[£$€]|\d)/i,
  /\bmust\s+pay\b/i
];

// Credential / detail-sharing instruction stripper (defence in depth). Scoped to
// instruction-shaped sentences only, exactly like _AI_PAY_PATTERNS: it fires when a
// sentence is an INSTRUCTION to confirm / enter / provide / share (etc.) account,
// bank, card, National Insurance, password or PIN details — not when a sentence
// merely mentions those terms (e.g. "check your account number is correct").
const _AI_SENSITIVE_TERM = "(?:account\\s+details?|account\\s+information|bank\\s+(?:account|details?)|banking\\s+details?|card\\s+(?:details?|number)|national\\s+insurance(?:\\s+number)?|\\bni\\s+number\\b|sort\\s+code|pass(?:word|code)|\\bpin\\b|security\\s+(?:details?|code)|personal\\s+details?|your\\s+details?)";
const _AI_DETAIL_PATTERNS = [
  // Imperative instruction at the start of the sentence + a sensitive term anywhere in it.
  new RegExp("^(?:please\\s+)?(?:confirm|enter|provide|share|give|send|submit|supply|update|re-?enter|input)\\b[^.!?]*\\b" + _AI_SENSITIVE_TERM, "i"),
  // "you (will/may/would/must) need your ... <sensitive term>".
  new RegExp("\\byou\\s+(?:will\\s+|may\\s+|would\\s+|must\\s+)?need\\s+your\\b[^.!?]*\\b" + _AI_SENSITIVE_TERM, "i"),
  // Bare "confirm your account / identity / card / bank / payment" phishing imperative.
  /^(?:please\s+)?confirm\s+your\s+(?:account|identity|card|bank|payment)\b/i
];

// Applies the AI-output stripper to the rules-engine structured_result in place,
// and keeps display_text / tts_script consistent. Used on every non-AI path so
// the rules cards get the same safety pass the AI cards do.
function sanitiseRulesStructuredResult(output, rulesRun) {
  const sr = output && output.structured_result;
  if (!sr || !Array.isArray(sr.cards)) return;
  // Every sentence here was written by the rules engine, so the phone rules are
  // exempt throughout and rules 1, 2 and 4 still run. That is the whole change:
  // this pass exists to catch payment commands the engine lifted verbatim from
  // a document, and it keeps doing exactly that.
  const stripped = stripAiViolations(sr, rulesSentenceSet(sr));
  // No-op when the rules cards are already clean: keep the original object so
  // callers that rely on the untouched rules output are not disturbed. Only
  // replace when the stripper actually neutralised a command.
  if (JSON.stringify(stripped) === JSON.stringify(sr)) return;
  output.structured_result = stripped;
  output.display_text = stripped.cards.map((card) => `${card.title} ${card.simple_explanation}`).join("\n");
  output.tts_script = stripped.cards.map((card) => card.read_aloud_text).join("\n");
  if (rulesRun && rulesRun.structured_output) {
    rulesRun.structured_output.structured_result = stripped;
    rulesRun.structured_output.display_text = output.display_text;
    rulesRun.structured_output.tts_script = output.tts_script;
  }
}

// exemptSentences is optional and defaults to exempting nothing, so a caller
// that omits it gets the strictest behaviour rather than the loosest.
function stripAiViolations(result, exemptSentences) {
  if (!result || !Array.isArray(result.cards)) return result;
  const out = JSON.parse(JSON.stringify(result));
  for (const card of out.cards) {
    for (const field of ["simple_explanation", "action_needed", "read_aloud_text"]) {
      if (typeof card[field] === "string") card[field] = sanitizeAiTextField(card[field], exemptSentences);
    }
    if (Array.isArray(card.key_points)) {
      card.key_points = card.key_points.map(s => typeof s === "string" ? sanitizeAiTextField(s, exemptSentences) : s);
    }
  }
  return out;
}

// The splitter the stripper works in. Shared with rulesSentenceSet so the
// exemption is built in exactly the units it will be compared in.
const _AI_SENTENCE_SPLIT = /(?<=[.!?])\s+/;

// Nothing is exempt unless a caller says so. A caller that forgets the argument
// gets the old behaviour, which strips everything, and that is the safe way
// round for a default.
const _AI_EXEMPT_NOTHING = new Set();

// Every sentence the RULES ENGINE wrote for this document, tokenised the same
// way the stripper tokenises.
//
// Tokenising rather than collecting whole fields is what handles read_aloud_text,
// which is a concatenation of a title, an explanation and the key points and so
// matches no single rules sentence as a whole. Split it and each piece is a
// sentence that IS in the set:
//
//   "What do I need to do?. Contact the sender... . Contact the sender...
//    You must contact us on 0333 320 122 by 3 September 2026."
//                            ^ this token is byte-identical to the key point
//
// It also covers the doubled full stop that buildReadAloudText produces when an
// explanation already ends in one, because that token is taken from the
// read_aloud_text field itself rather than reconstructed.
function rulesSentenceSet(result) {
  const out = new Set();
  if (!result || !Array.isArray(result.cards)) return out;
  const add = (value) => {
    if (typeof value !== "string") return;
    value.split(_AI_SENTENCE_SPLIT).forEach((piece) => {
      const trimmed = piece.trim();
      if (trimmed) out.add(trimmed);
    });
  };
  result.cards.forEach((card) => {
    add(card.simple_explanation);
    add(card.action_needed);
    add(card.read_aloud_text);
    if (Array.isArray(card.key_points)) card.key_points.forEach(add);
  });
  return out;
}

// THE EXEMPTION IS FOR PHONE NUMBERS ONLY, and only for sentences the rules
// engine itself composed.
//
// Why it exists. The phone rules were written on 18 June 2026 for AI output,
// because gpt-4.1-mini does not reliably honour prompt-level "do not"
// instructions. They began applying to rules output on 30 June, when the
// stripper was extended to every path to catch a payment command the rules
// engine had lifted verbatim from a document. That extension was about pay and
// credential commands; the phone rules came with it because stripAiViolations
// applies all five and offered no way to take a subset. Nobody decided that a
// number the engine read off the page should be withheld.
//
// Why it is by SENTENCE and not by number. The model is shown the rules output
// in its own prompt, so it can see the genuine number. An allowlist of numbers
// would pass "Call 020 8583 4242 immediately or bailiffs will attend", where
// every word except the number is invented. Comparing whole sentences means any
// edit to the wording, any change of number, and any appended sentence all fail
// the check, because sentences are compared after the same split.
//
// Rules 1, 2 and 4 are NOT exempted, on either path. The pay and credential
// rules are the reason the stripper runs on rules output at all, and the debt
// charity substitution is about naming a service rather than about a value read
// off the page.
function sanitizeAiTextField(text, exemptSentences) {
  if (typeof text !== "string") return text;
  const exempt = exemptSentences instanceof Set ? exemptSentences : _AI_EXEMPT_NOTHING;
  return text
    .split(_AI_SENTENCE_SPLIT)
    .map(sentence => {
      const trimmed = sentence.trim();
      if (!trimmed) return trimmed;
      if (_AI_PAY_PATTERNS.some(re => re.test(trimmed))) {
        return "Check the original document for the payment amount and due date.";
      }
      if (_AI_DETAIL_PATTERNS.some(re => re.test(trimmed))) {
        return "Check the original document. Do not share personal or banking details.";
      }
      // Short-circuits rule 3 below AND the in-place rule 5 in the fallthrough,
      // which is why it is read once here rather than tested twice.
      const keepNumbers = exempt.has(trimmed);
      if (!keepNumbers && _AI_PHONE_RE.test(trimmed) && _AI_CALL_CONTEXT_RE.test(trimmed)) {
        return "Use contact details from the original document.";
      }
      const withoutOrgNames = trimmed.replace(_AI_DEBT_ORG_RE, "a trusted advice service");
      return keepNumbers
        ? withoutOrgNames
        : withoutOrgNames.replace(_AI_PHONE_G_RE, "the number in the original document");
    })
    .join(" ");
}

module.exports = {
  applySafetyPassAndRecordAiStatus,
  stripAiViolations,
  sanitizeAiTextField,
  rulesSentenceSet,
  redactForAi,
  positiveNumberSetting,
  providerSkipReason,
  AI_TIMEOUT_MS,
  AI_OUTBOUND_TEXT_MAX_CHARS,
  DEFAULT_MODEL
};
