const {
  validateStructuredResult,
  sanitizeStructuredResult
} = require("../utils/validateStructuredResult");

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1-mini";
const AI_TIMEOUT_MS = Number(process.env.CLEARSTEPS_AI_TIMEOUT_MS || 25000);

async function applyAiStructuredResult({ rulesRun, extractedText }) {
  const output = rulesRun.api_output;
  const fallbackStructuredResult = output.structured_result;
  const startedAt = Date.now();
  const model = DEFAULT_MODEL;

  const inputQuality = output.trust?.input_quality || "unknown";
  const garbledByOcr = Boolean(rulesRun.structured_output?.trust_internal?.garbled_by_ocr);

  // Hard gate: skip the AI pass entirely on low-quality input. Prompt-based
  // suppression was tested and confirmed unreliable with gpt-4.1-mini — the
  // model still restated suppressed values and upgraded its own confidence.
  // The rules engine already expresses the right uncertainty in these cases.
  if (inputQuality === "borderline" || inputQuality === "poor" || garbledByOcr) {
    attachAiMetadata(output, {
      ai_used: false,
      ai_status: "skipped",
      ai_provider: "openai",
      ai_model: model,
      ai_duration_ms: 0,
      ai_error_code: "low_quality_input"
    });
    return rulesRun;
  }

  if (!process.env.OPENAI_API_KEY) {
    attachAiMetadata(output, {
      ai_used: false,
      ai_status: "skipped",
      ai_provider: "openai",
      ai_model: model,
      ai_duration_ms: 0,
      ai_error_code: "missing_api_key"
    });
    return rulesRun;
  }

  try {
    const candidate = await requestStructuredResultFromOpenAi({
      extractedText,
      fallbackStructuredResult,
      model,
      inputQuality,
      garbledByOcr
    });

    const sanitized = sanitizeStructuredResult(candidate, fallbackStructuredResult);
    const stripped = stripAiViolations(sanitized);
    const validation = validateStructuredResult(stripped, fallbackStructuredResult);
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
        temperature: 0.2,
        max_output_tokens: 2600
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
    String(extractedText || "").slice(0, 12000)
  ].join("\n");
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
  /^(?:please\s+)?pay\s+(?:[£$€]\S+|\d+|the\s+(?:amount|balance|outstanding|overdue)|immediately|now|by\s)/i,
  /\byou\s+(?:must|should|need\s+to|have\s+to|are\s+required\s+to)\s+pay\b/i,
  /^(?:please\s+)?make\s+(?:a\s+)?payment\s+(?:of|to|by|now|immediately)/i,
  /\b(?:then|and)\s+pay\s+(?:by\b|[£$€]|\d)/i,
  /\bmust\s+pay\b/i
];

function stripAiViolations(result) {
  if (!result || !Array.isArray(result.cards)) return result;
  const out = JSON.parse(JSON.stringify(result));
  for (const card of out.cards) {
    for (const field of ["simple_explanation", "action_needed", "read_aloud_text"]) {
      if (typeof card[field] === "string") card[field] = sanitizeAiTextField(card[field]);
    }
    if (Array.isArray(card.key_points)) {
      card.key_points = card.key_points.map(s => typeof s === "string" ? sanitizeAiTextField(s) : s);
    }
  }
  return out;
}

function sanitizeAiTextField(text) {
  if (typeof text !== "string") return text;
  return text
    .split(/(?<=[.!?])\s+/)
    .map(sentence => {
      const trimmed = sentence.trim();
      if (!trimmed) return trimmed;
      if (_AI_PAY_PATTERNS.some(re => re.test(trimmed))) {
        return "Check the original document for the payment amount and due date.";
      }
      if (_AI_PHONE_RE.test(trimmed) && _AI_CALL_CONTEXT_RE.test(trimmed)) {
        return "Use contact details from the original document.";
      }
      return trimmed
        .replace(_AI_DEBT_ORG_RE, "a trusted advice service")
        .replace(_AI_PHONE_G_RE, "the number in the original document");
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
  sanitizeAiTextField
};
