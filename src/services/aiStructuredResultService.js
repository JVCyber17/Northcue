const {
  validateStructuredResult,
  sanitizeStructuredResultWithVerdict
} = require("../utils/validateStructuredResult");

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
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

async function applyAiStructuredResult({ rulesRun, extractedText, language }) {
  const output = rulesRun.api_output;

  // Backstop: run the proven pay/credential stripper over the rules-engine cards
  // so safety filtering applies on EVERY path, not only when the AI runs. On the
  // AI-success path these cards are replaced by the (separately stripped) AI
  // output further down; on skip and fallback they are what the user sees.
  sanitiseRulesStructuredResult(output, rulesRun);

  const fallbackStructuredResult = output.structured_result;
  const startedAt = Date.now();
  const model = DEFAULT_MODEL;

  // Every gate is now one call. The five inline blocks this replaces read the
  // same fields in the same order and produced the same codes; the difference
  // is that the fact extractor asks the same question, so the two cannot drift.
  const skipReason = providerSkipReason({ rulesRun, language });
  if (skipReason) {
    attachAiMetadata(output, {
      ai_used: false,
      ai_status: "skipped",
      ai_provider: "openai",
      ai_model: model,
      ai_duration_ms: 0,
      ai_error_code: skipReason
    });
    return rulesRun;
  }

  // The fact extractor no longer runs here. In tier 2 it runs BEFORE the engine
  // composes, because the engine now reads its output, and that ordering lives
  // in the route where the engine is called. Both still ask providerSkipReason,
  // so the "sends nothing the phrasing pass does not" property is unchanged.
  const inputQuality = output.trust?.input_quality || "unknown";
  const garbledByOcr = Boolean(rulesRun.structured_output?.trust_internal?.garbled_by_ocr);

  try {
    const candidate = await requestStructuredResultFromOpenAi({
      extractedText,
      fallbackStructuredResult,
      model,
      inputQuality,
      garbledByOcr
    });

    // The verdict, not just the object. When the sanitiser rejects the
    // candidate it hands back the engine's own result, and that result then
    // passes every check below, which is how a discarded model answer used to
    // be recorded as a completed one.
    //
    // NOTHING BELOW THIS LINE CHANGES WHAT IS SERVED. The assignments to
    // structured_result, display_text and tts_script stay exactly where they
    // were and stay unconditional, so the reader receives the same bytes on
    // both paths as before. Only the metadata branches, at the end.
    const sanitizeVerdict = sanitizeStructuredResultWithVerdict(candidate, fallbackStructuredResult, extractedText);
    const sanitized = sanitizeVerdict.result;
    // The exemption is built from the FALLBACK, which is the rules output for
    // this document. A model sentence that is byte-identical to one of those is
    // that sentence; anything else carrying a number is stripped.
    const stripped = stripAiViolations(sanitized, rulesSentenceSet(fallbackStructuredResult));
    const validation = validateStructuredResult(stripped, fallbackStructuredResult, extractedText);
    if (!validation.valid) {
      const validationSummary = summarizeValidationErrors(validation.errors);
      attachAiMetadata(output, {
        ai_used: false,
        ai_status: "fallback",
        ai_provider: "openai",
        ai_model: model,
        ai_duration_ms: Date.now() - startedAt,
        ai_error_code: "invalid_structured_result",
        validation_errors: validationSummary
      });
      logAiDebug("validation_failed", {
        ai_status: "fallback",
        ai_error_code: "invalid_structured_result",
        ai_model: model,
        ai_duration_ms: Date.now() - startedAt,
        validation_errors: validationSummary
      });
      return rulesRun;
    }

    output.structured_result = stripped;
    output.display_text = stripped.cards.map((card) => `${card.title} ${card.simple_explanation}`).join("\n");
    output.tts_script = stripped.cards.map((card) => card.read_aloud_text).join("\n");
    rulesRun.structured_output.structured_result = stripped;
    rulesRun.structured_output.display_text = output.display_text;
    rulesRun.structured_output.tts_script = output.tts_script;

    // Reported here rather than at the sanitiser call, so the served
    // assignments above run identically on both paths and this stays a
    // metadata-only branch.
    //
    // Its own error code, distinct from invalid_structured_result. The two mean
    // different things and the difference is the useful part: this one says the
    // MODEL's own output failed a guard, while invalid_structured_result says
    // the output failed after the stripper had already rewritten it.
    if (sanitizeVerdict.rejected) {
      const sanitizerErrors = summarizeValidationErrors(sanitizeVerdict.errors);
      attachAiMetadata(output, {
        ai_used: false,
        ai_status: "fallback",
        ai_provider: "openai",
        ai_model: model,
        ai_duration_ms: Date.now() - startedAt,
        ai_error_code: "sanitizer_rejected",
        validation_errors: sanitizerErrors
      });
      logAiDebug("sanitizer_rejected", {
        ai_status: "fallback",
        ai_error_code: "sanitizer_rejected",
        ai_model: model,
        ai_duration_ms: output.debug.ai.ai_duration_ms,
        validation_errors: sanitizerErrors
      });
      return rulesRun;
    }

    attachAiMetadata(output, {
      ai_used: true,
      ai_status: "completed",
      ai_provider: "openai",
      ai_model: model,
      ai_duration_ms: Date.now() - startedAt,
      ai_error_code: null
    });
    logAiDebug("completed", {
      ai_status: "completed",
      ai_model: model,
      ai_duration_ms: output.debug.ai.ai_duration_ms
    });
    return rulesRun;
  } catch (error) {
    const aiErrorCode = normalizeAiErrorCode(error);
    attachAiMetadata(output, {
      ai_used: false,
      ai_status: "fallback",
      ai_provider: "openai",
      ai_model: model,
      ai_duration_ms: Date.now() - startedAt,
      ai_error_code: aiErrorCode
    });
    logAiDebug("fallback", {
      ai_status: "fallback",
      ai_error_code: aiErrorCode,
      ai_model: model,
      ai_duration_ms: output.debug.ai.ai_duration_ms,
      http_status: error.httpStatus || null
    });
    return rulesRun;
  }
}

async function requestStructuredResultFromOpenAi({ extractedText, fallbackStructuredResult, model, inputQuality, garbledByOcr }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: buildSystemPrompt()
          },
          {
            role: "user",
            content: buildUserPrompt({ extractedText, fallbackStructuredResult, inputQuality, garbledByOcr })
          }
        ],
        // Determinism: temperature 0 removes run-to-run sampling variance so the
        // same document text yields stable card phrasing. The Responses API does
        // not support a seed parameter, so temperature is the determinism lever.
        temperature: 0,
        max_output_tokens: 2600,
        // Privacy: do not let OpenAI retain this request/response as stored
        // application state. Document text is sent for in-memory processing only.
        store: false
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const error = new Error(`openai_http_${response.status}`);
      error.code = response.status === 401 ? "invalid_api_key" : `openai_http_${response.status}`;
      error.httpStatus = response.status;
      throw error;
    }

    const data = await response.json();
    // Drift monitor: the Responses API returns no system_fingerprint, so log the
    // resolved model snapshot + response id. If OpenAI silently rolls the model
    // build, data.model changes here even though our requested model string is fixed.
    console.log(`[northcue-ai] responses model=${data.model || "unknown"} id=${data.id || "unknown"}`);
    const text = extractResponseText(data);
    if (!text) {
      const error = new Error("empty_ai_response");
      error.code = "empty_ai_response";
      throw error;
    }

    return parseJsonObject(text);
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("ai_timeout");
      timeoutError.code = "ai_timeout";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildSystemPrompt() {
  return [
    "You are the backend structured-output layer for Northcue.",
    "Return strict JSON only. No Markdown. No commentary.",
    "Use UK English, plain language, calm wording, and short lines.",
    "Do not give legal, medical, financial, or authenticity advice.",
    "Do not tell the user to pay, click links, call document numbers, or reply to a sender.",
    "Do not guess missing facts. If unclear, say Not clearly stated.",
    "If the user message shows input_quality as borderline or poor, or garbled_by_ocr as true: do not state specific amounts, dates, reference numbers, or other precise figures with confidence. The document text may contain OCR errors where characters were misread (for example a digit read as a letter, or a letter read as a digit). Do not attempt to correct these errors or present a corrected figure — that would be guessing. Instead match the same uncertainty level the fallback structured_result already expresses: say the figure could not be reliably read rather than restating or reinterpreting it.",
    "Keep the same JSON shape as the provided fallback structured_result.",
    "Return exactly six cards in the same order and with the same card_id values.",
    // Headlines: short and punchy for overwhelmed/ADHD readers. Detail relocates
    // into key_points (every card has them) rather than being lost.
    "Write each card's simple_explanation (the headline) short and punchy: a single sentence, ideally one line and about twelve words or fewer, carrying only the core point. Move every supporting detail — extra amounts, dates, schedules, reference numbers, and specifics — into that card's key_points so nothing is lost.",
    "Lead each headline with its card's core: card one (what_is_this) = what the document is, who it is from, and the key amount if it is a bill; card two (what_matters_most) = the single most important point about the reader's situation (describe it, e.g. 'Your £320.00 payment is overdue.', never an instruction to pay); card three (what_do_i_need_to_do) = the one core action, phrased as a SAFE step such as checking a detail or contacting the sender with trusted details (e.g. 'Check the amount and the due date.'); card four (when_does_it_matter) = just the date or deadline in one short sentence, with no second sentence or extra clause (for example 'Your appointment is on 1 July 2026.' or 'Payment is due by 24 June 2026.').",
    "Even when shortening, NEVER turn a headline or key_point into an instruction to pay ('Pay £320', 'Pay the amount owed', 'Pay by ...'), click a link, or call a number — describe the situation or give a safe check/contact step instead. This applies even when the document is a bill or arrears letter about money.",
    // Added after a live capture found the model writing "You must pay £726.00
    // by 30 September 2026" on a court fine, and "You must contact X by ..." on
    // an enforcement notice. The validator now rejects these outright; this
    // line is here so a compliant model does not have to be rejected first.
    "Never address an obligation to the reader in your own voice: no 'You must pay', 'You must contact', 'You must clear', 'You need to call', or any similar command. When the DOCUMENT places an obligation on the reader, attribute it: 'The document says the balance must be cleared by 12 September 2026.' Northcue reports what a letter demands; it never demands anything itself.",
    // The engine hedges deliberately. "appears to be" and "looks like" are not
    // padding: they are what stops a wrong classification reading as a fact.
    "Keep the fallback's hedging. Where the fallback says 'appears to be', 'looks like', 'may' or 'could', keep that uncertainty; do not rewrite it into a flat assertion. 'This appears to be from X' must not become 'This is X'.",
    "Never restate a fact more or less certainly than the document does. If the document says fees WILL be added, do not write that they COULD be; if it says something MAY happen, do not write that it WILL.",
    "Never include a postal address, a postcode, or the reader's property address in any field.",
    "Never state a date the document does not state. If the document gives a period such as 'within 14 days', report the period; do NOT calculate a calendar date from it.",
    "Never drop a bill's money amount. If you shorten card one, keep the amount in its headline or in a key_point.",
    "Every card's headline must be distinct and specific to that card's purpose. Never repeat the same generic line (such as 'Check the original document for the payment amount and due date') on two different cards.",
    // Card 5 (card_id 'what_could_happen') is adaptive. Use the fallback card's
    // title as the signal — never change which mode it is in:
    "Card five has card_id 'what_could_happen'. Use the fallback structured_result's title for this card as the signal and keep that exact title.",
    "If that title is 'What could happen if I ignore it?', the document states a real consequence of ignoring it. Write simple_explanation as a calm, hedged, attributed report of that consequence: begin with 'The document says' or 'According to the document', keep the words 'may' or 'could', and never assert the threat as certain or in your own voice. Frame it around what the document says could happen if it is ignored — do NOT phrase it as an instruction to pay. key_points may note the consequence and the relevant date to be aware of.",
    "If that title is 'What should I check?', the document states no such consequence. Keep check-style content and do NOT invent, imply, or escalate any consequence, penalty, or threat the document does not state.",
    "Set all privacy flags to false."
  ].join("\n");
}

function buildUserPrompt({ extractedText, fallbackStructuredResult, inputQuality, garbledByOcr }) {
  return [
    "Improve this Northcue structured_result using only the document text below.",
    "Keep session_id and anonymous_session_id exactly the same as the fallback.",
    "Keep all field names exactly the same.",
    "",
    "Document quality (from the rules engine):",
    `input_quality: ${inputQuality}`,
    `garbled_by_ocr: ${garbledByOcr}`,
    "",
    "Fallback structured_result:",
    JSON.stringify(fallbackStructuredResult),
    "",
    "Document text for in-memory analysis only. Do not store it or repeat unnecessary personal details:",
    redactForAi(extractedText).slice(0, AI_OUTBOUND_TEXT_MAX_CHARS)
  ].join("\n");
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

function cleanAiErrorCode(value) {
  return String(value || "ai_failed")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 80) || "ai_failed";
}

function normalizeAiErrorCode(error) {
  if (!error) return "ai_failed";
  if (error.name === "AbortError" || error.code === 20 || error.code === "20") {
    return "ai_timeout";
  }
  return cleanAiErrorCode(error.code || error.message || "ai_failed");
}

function summarizeValidationErrors(errors) {
  if (!Array.isArray(errors)) return [];
  return errors
    .map((error) => String(error || "validation_error").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function logAiDebug(event, metadata) {
  if (process.env.CLEARSTEPS_AI_DEBUG !== "true") return;
  console.warn("[clearsteps-ai]", JSON.stringify({
    event,
    ...metadata
  }));
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
  applyAiStructuredResult,
  requestStructuredResultFromOpenAi,
  extractResponseText,
  normalizeAiErrorCode,
  summarizeValidationErrors,
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
