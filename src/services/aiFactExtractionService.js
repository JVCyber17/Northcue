// D3 tier 1. A fact extractor that runs beside the phrasing pass and serves
// nothing.
//
// WHAT IT IS FOR. Under D3 the AI stops writing sentences: it returns facts,
// the engine composes every sentence from them, and the template bank
// translates what the engine wrote. Tier 1 builds only the first of those and
// wires it to nowhere, so the schema, the latency and the guard can be measured
// on real documents before a single reader sees a card built this way.
//
// WHAT IT MAY NOT DO. It may not change what is served, it may not add wall
// time, and it may not send one byte more than the phrasing pass already sends.
// The first two are why it is started before the phrasing request and awaited
// after it: at a measured mean of 3.3s against 15.1s it finishes first and
// costs nothing. The third is why the caller runs it behind the SAME gates, so
// no document reaches the provider that does not already, and why the outbound
// text goes through the same redactForAi.
//
// WHY THE SCHEMA LOOKS LIKE THIS. Every field is derived from a composer that
// already consumes it, not from what a model might offer:
//   amounts[].role      bestMoneyAmount currently guesses by picking the
//                       largest, and unlabelled_amount exists because it knows
//                       it is guessing
//   dates[].role        extractDeadline, extractAppointmentDate,
//                       extractHeaderDate and extractVisibleDates are four
//                       functions doing one job with four sets of English cues
//   consequence.kind    the 25 swept RISK_PHRASES, collapsed into the 11 things
//                       they name
//   obligation.kind     the fixed action lines extractActions already picks
//
// AND WHAT IS DELIBERATELY ABSENT. No category, no severity, no trust, no scam
// signal, no processing mode. Those stay engine decisions. consequence.kind is
// a signal the engine may interpret, never a verdict the model issues.
//
// contact_number was in the D3 proposal and is NOT here. redactForAi masks
// phone numbers before the text leaves, so the model cannot see one, and asking
// for it would either produce nothing or produce an invention. The engine's own
// extractContactNumber reads it from the unredacted text, and its pattern is
// digits rather than English, so it already works in any language.

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const FACT_SCHEMA_VERSION = "facts_v1";

// A MEASUREMENT MAY NEVER COST THE READER TIME, so this is not the phrasing
// pass's 25s. The caller awaits both, so the wait becomes the slower of the
// two, and "it finishes first" must be true by construction rather than by
// luck. Measured fact calls took 2,240 to 4,156ms; the fastest phrasing call in
// 84 measurements was 10,592ms. At 8,000ms this can only extend a request that
// the phrasing pass would have finished in under eight seconds, which has never
// once happened. If it ever does, the reader loses nothing and the metadata
// records facts_timeout.
const FACT_MEASUREMENT_BUDGET_MS = 8000;

const AMOUNT_ROLES = ["total_due", "arrears", "fee", "instalment", "credit", "balance", "other"];
const DATE_ROLES = ["deadline", "appointment", "letter_date", "period_start", "period_end", "other"];
const OBLIGATION_KINDS = ["pay", "contact", "attend", "send_documents", "respond", "none"];
const CONSEQUENCE_KINDS = [
  "enforcement_agent", "remove_goods", "court_action", "possession", "eviction",
  "disconnection", "debt_collection", "credit_record", "penalty", "prosecution",
  "account_suspension", "other"
];

function buildFactSystemPrompt() {
  return [
    "You are an extraction layer. Return strict JSON only. No prose, no commentary, no Markdown.",
    "You do not write sentences for a reader. Another system composes every sentence from these facts.",
    "Read the document in whatever language it is written. Copy values EXACTLY as the document prints them, in the document's own language and format. Do not translate, reformat, convert or calculate anything.",
    "If a fact is not stated, use null or an empty array. Never guess. Never infer a date from a period.",
    "Some values in the document text have been masked before it reached you, and appear as [phone], [email] or [number]. Never return a masked placeholder as a fact.",
    "",
    "Schema:",
    "{",
    '  "document_language": ISO 639-1 code of the document text,',
    '  "sender": the organisation that sent it, copied from the letterhead, or null,',
    '  "reference": the reference or account number as printed, or null,',
    '  "amounts": [{"value": as printed, "role": one of ' + AMOUNT_ROLES.join("|") + "}],",
    '  "dates": [{"value": as printed, "role": one of ' + DATE_ROLES.join("|") + "}],",
    '  "obligation": {"kind": one of ' + OBLIGATION_KINDS.join("|") + ', "sentence": the sentence that states it, copied exactly} or null,',
    '  "consequence": {"kind": one of ' + CONSEQUENCE_KINDS.join("|") + ', "conditional": true or false, "sentence": the sentence that states it, copied exactly} or null,',
    '  "account_in_credit": true or false',
    "}",
    "",
    "role deadline means a date by which the reader must act. A billing period start or end is NOT a deadline.",
    "conditional means the document says it MAY or COULD happen rather than that it WILL."
  ].join("\n");
}

async function requestFactsFromOpenAi({ documentText, model, apiKey, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: buildFactSystemPrompt() },
          { role: "user", content: "Document text:\n" + documentText }
        ],
        temperature: 0,
        // Measured at 143 to 291 output tokens across six documents. 900 leaves
        // room for a dense letter without leaving room for prose.
        max_output_tokens: 900,
        store: false
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const error = new Error(`openai_http_${response.status}`);
      error.code = response.status === 401 ? "invalid_api_key" : `openai_http_${response.status}`;
      throw error;
    }

    const data = await response.json();
    const text = extractText(data);
    if (!text) {
      const error = new Error("empty_fact_response");
      error.code = "empty_fact_response";
      throw error;
    }

    return { facts: parseJsonObject(text), usage: data.usage || null };
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("facts_timeout");
      timeoutError.code = "facts_timeout";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function extractText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  if (!Array.isArray(data.output)) return "";
  const parts = [];
  data.output.forEach((item) => {
    if (!Array.isArray(item.content)) return;
    item.content.forEach((content) => {
      if (typeof content.text === "string") parts.push(content.text);
    });
  });
  return parts.join("\n").trim();
}

function parseJsonObject(text) {
  const trimmed = String(text || "").trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first === -1 || last <= first) {
    const error = new Error("facts_json_not_found");
    error.code = "facts_json_not_found";
    throw error;
  }
  try {
    return JSON.parse(trimmed.slice(first, last + 1));
  } catch (error) {
    error.code = "facts_json_parse_failed";
    throw error;
  }
}

// ─── validation ──────────────────────────────────────────────────────────────

// THE GUARD A FACT SCHEMA ALLOWS AND PROSE NEVER COULD: every free text value
// must appear in the document. Invention becomes a substring test.
//
// Whitespace is normalised on both sides because a quoted sentence can span a
// line break in the source and arrive as one line, which is a formatting
// difference rather than an invention. Case is normalised because a letterhead
// in capitals is the same sender.
function normaliseForComparison(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim().toLowerCase();
}

// A date the composer may put in "Due by {date}." It must be a date, not a
// period. This is the field-level catch for the anchor invention recorded in
// KNOWN_ENGINE_DEFECTS: the model returned {"value": "14 days", "role":
// "deadline"} on a letter that states a period and no anchor, which in prose is
// invisible because both halves are on the page and only the relation is
// invented. Here the relation IS the field.
//
// LANGUAGE NEUTRAL, and the first version was not. It required the month name
// to sit directly beside the day, which is true of "3 September 2026" and
// "4 września 2026" and false of "15 de junio de 2026", where Spanish puts a
// two letter word in between. Run over the corpus it rejected a perfectly
// correct Spanish deadline, which is precisely the English-shaped failure D3
// exists to remove, committed inside D3's own guard.
//
// So: any decimal digits rather than ASCII ones, any script's letters plus
// their combining marks for the month, and a bounded gap either side that
// absorbs whatever connector a language uses. What it still refuses is the
// thing it is for, a period with no year in it.
const LOOKS_LIKE_A_DATE = new RegExp([
  // numeric, any separator
  "\\p{Nd}{1,2}\\s*[/-]\\s*\\p{Nd}{1,2}\\s*[/-]\\s*\\p{Nd}{2,4}",
  // ISO
  "\\p{Nd}{4}-\\p{Nd}{2}-\\p{Nd}{2}",
  // day, month name in any script, year
  "(?<!\\p{Nd})\\p{Nd}{1,2}[^\\p{Nd}\\n]{0,12}[\\p{L}\\p{M}]{3,}[^\\p{Nd}\\n]{0,12}\\p{Nd}{2,4}(?!\\p{Nd})",
  // month first
  "[\\p{L}\\p{M}]{3,}[^\\p{Nd}\\n]{0,4}\\p{Nd}{1,2},?\\s*\\p{Nd}{4}(?!\\p{Nd})"
].join("|"), "u");

function validateFacts(candidate, sourceText) {
  const errors = [];
  const source = normaliseForComparison(sourceText);
  let checked = 0;
  const notVerbatim = [];

  const verbatim = (path, value) => {
    if (typeof value !== "string" || !value) return;
    checked += 1;
    if (!source.includes(normaliseForComparison(value))) notVerbatim.push(path);
  };
  const oneOf = (path, value, allowed) => {
    if (!allowed.includes(value)) errors.push(`${path} is not one of ${allowed.join("|")}`);
  };

  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return { valid: false, errors: ["facts must be an object"], metrics: emptyMetrics() };
  }

  if (candidate.document_language != null && !/^[a-z]{2}$/i.test(String(candidate.document_language))) {
    errors.push("document_language must be a two letter code or null");
  }

  verbatim("sender", candidate.sender);
  verbatim("reference", candidate.reference);

  const amounts = Array.isArray(candidate.amounts) ? candidate.amounts : [];
  if (!Array.isArray(candidate.amounts)) errors.push("amounts must be an array");
  amounts.forEach((entry, index) => {
    oneOf(`amounts[${index}].role`, entry && entry.role, AMOUNT_ROLES);
    verbatim(`amounts[${index}].value`, entry && entry.value);
  });

  const dates = Array.isArray(candidate.dates) ? candidate.dates : [];
  if (!Array.isArray(candidate.dates)) errors.push("dates must be an array");
  let relativeDeadline = false;
  dates.forEach((entry, index) => {
    oneOf(`dates[${index}].role`, entry && entry.role, DATE_ROLES);
    verbatim(`dates[${index}].value`, entry && entry.value);
    if (entry && entry.role === "deadline" && !LOOKS_LIKE_A_DATE.test(String(entry.value || ""))) {
      relativeDeadline = true;
      errors.push(`dates[${index}] is labelled a deadline but is not a date`);
    }
  });

  if (candidate.obligation != null) {
    oneOf("obligation.kind", candidate.obligation.kind, OBLIGATION_KINDS);
    verbatim("obligation.sentence", candidate.obligation.sentence);
  }

  if (candidate.consequence != null) {
    oneOf("consequence.kind", candidate.consequence.kind, CONSEQUENCE_KINDS);
    verbatim("consequence.sentence", candidate.consequence.sentence);
    if (typeof candidate.consequence.conditional !== "boolean") {
      errors.push("consequence.conditional must be a boolean");
    }
  }

  if (candidate.account_in_credit != null && typeof candidate.account_in_credit !== "boolean") {
    errors.push("account_in_credit must be a boolean");
  }

  notVerbatim.forEach((path) => errors.push(`${path} does not appear in the document`));

  return {
    valid: errors.length === 0,
    errors,
    metrics: {
      document_language: candidate.document_language == null ? null : String(candidate.document_language).toLowerCase().slice(0, 2),
      has_sender: Boolean(candidate.sender),
      has_reference: Boolean(candidate.reference),
      amount_count: amounts.length,
      amount_roles: countBy(amounts.map((a) => a && a.role)),
      date_count: dates.length,
      date_roles: countBy(dates.map((d) => d && d.role)),
      obligation_kind: candidate.obligation ? candidate.obligation.kind : null,
      consequence_kind: candidate.consequence ? candidate.consequence.kind : null,
      consequence_conditional: candidate.consequence ? candidate.consequence.conditional : null,
      account_in_credit: candidate.account_in_credit === true,
      verbatim_checked: checked,
      verbatim_failed: notVerbatim.length,
      relative_deadline: relativeDeadline
    }
  };
}

function countBy(values) {
  const out = {};
  values.forEach((value) => {
    const key = typeof value === "string" ? value : "invalid";
    out[key] = (out[key] || 0) + 1;
  });
  return out;
}

function emptyMetrics() {
  return {
    document_language: null, has_sender: false, has_reference: false,
    amount_count: 0, amount_roles: {}, date_count: 0, date_roles: {},
    obligation_kind: null, consequence_kind: null, consequence_conditional: null,
    account_in_credit: false, verbatim_checked: 0, verbatim_failed: 0, relative_deadline: false
  };
}

// ─── the measurement entry point ─────────────────────────────────────────────

// NEVER THROWS, NEVER REJECTS. Tier 1 serves nothing, so a failure here must be
// incapable of reaching a reader. Everything is caught and turned into a status.
//
// NO DOCUMENT CONTENT IN THE RETURN VALUE. debug travels to the browser in the
// API response, so this returns counts, roles and kinds and never a sender, an
// amount, a date or a sentence. Those are measured in process by the corpus
// harness, which is where the schema fit question actually gets answered.
async function measureFactExtraction({ documentText, model, apiKey, timeoutMs }) {
  const startedAt = Date.now();

  if (!apiKey) {
    return { facts_schema: FACT_SCHEMA_VERSION, facts_status: "skipped", facts_error_code: "missing_api_key" };
  }

  try {
    const { facts, usage } = await requestFactsFromOpenAi({ documentText, model, apiKey, timeoutMs });
    const validation = validateFacts(facts, documentText);
    return {
      facts_schema: FACT_SCHEMA_VERSION,
      facts_status: validation.valid ? "completed" : "invalid",
      facts_error_code: validation.valid ? null : "facts_failed_validation",
      facts_duration_ms: Date.now() - startedAt,
      facts_input_tokens: usage ? (usage.input_tokens ?? usage.prompt_tokens ?? null) : null,
      facts_output_tokens: usage ? (usage.output_tokens ?? usage.completion_tokens ?? null) : null,
      facts_errors: validation.errors.slice(0, 8),
      facts_metrics: validation.metrics
    };
  } catch (error) {
    return {
      facts_schema: FACT_SCHEMA_VERSION,
      facts_status: "failed",
      facts_error_code: cleanCode(error && (error.code || error.message)),
      facts_duration_ms: Date.now() - startedAt
    };
  }
}

function cleanCode(value) {
  return String(value || "facts_failed").toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 80) || "facts_failed";
}

module.exports = {
  FACT_SCHEMA_VERSION,
  FACT_MEASUREMENT_BUDGET_MS,
  AMOUNT_ROLES,
  DATE_ROLES,
  OBLIGATION_KINDS,
  CONSEQUENCE_KINDS,
  buildFactSystemPrompt,
  requestFactsFromOpenAi,
  validateFacts,
  measureFactExtraction
};
