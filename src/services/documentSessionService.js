const { getSupabaseAdminClient } = require("./supabaseService");

const VALID_STATUSES = new Set(["uploaded", "analysed", "failed", "expired"]);
const VALID_INPUT_QUALITIES = new Set(["good", "borderline", "poor"]);
const VALID_OCR_STATUSES = new Set(["not_started", "processing", "completed", "failed", "skipped"]);
const VALID_OCR_INPUT_QUALITIES = new Set(["good", "fair", "poor", "unknown"]);
const VALID_OCR_CONFIDENCE_CATEGORIES = new Set(["high", "medium", "low", "unknown"]);
const VALID_TRUST_LEVELS = new Set(["high", "medium", "low", "unknown"]);
const VALID_SEVERITY_LEVELS = new Set(["low", "medium", "high", "urgent"]);
const VALID_PROCESSING_MODES = new Set(["normal", "caution", "verification_only", "unsupported"]);
const VALID_CONFIDENCE_LEVELS = new Set(["high", "medium", "low"]);
const VALID_BANNER_TYPES = new Set(["safe", "caution", "warning", "urgent"]);
const VALID_AI_STATUSES = new Set(["skipped", "completed", "fallback", "failed"]);

async function createDocumentSession(metadata = {}) {
  const clientJobId = cleanText(metadata.clientJobId, 120);
  if (!clientJobId) return null;

  const row = buildSafeSessionRow({
    ...metadata,
    clientJobId,
    status: metadata.status || "uploaded"
  });

  return writeDocumentSession("upsert", clientJobId, row);
}

async function updateDocumentSession(clientJobId, updates = {}) {
  const cleanedJobId = cleanText(clientJobId, 120);
  if (!cleanedJobId) return null;

  const row = buildSafeSessionRow({
    ...updates,
    clientJobId: cleanedJobId
  });

  delete row.client_job_id;
  return writeDocumentSession("update", cleanedJobId, row);
}

async function markDocumentSessionAnalysed(clientJobId, output = {}, updates = {}) {
  return updateDocumentSession(clientJobId, {
    ...updates,
    ...metadataFromAnalysisOutput(output),
    status: "analysed",
    processedAt: new Date().toISOString(),
    errorCode: null
  });
}

async function markDocumentSessionFailed(clientJobId, errorCode, updates = {}) {
  return updateDocumentSession(clientJobId, {
    ...updates,
    status: "failed",
    errorCode: cleanErrorCode(errorCode || "document_processing_failed")
  });
}

async function markOcrStarted(clientJobId, updates = {}) {
  return updateDocumentSession(clientJobId, {
    ...updates,
    ocrStatus: "processing",
    ocrStartedAt: new Date().toISOString(),
    ocrEngine: updates.ocrEngine || "tesseract"
  });
}

async function markOcrCompleted(clientJobId, updates = {}) {
  const completedAt = updates.ocrCompletedAt || new Date().toISOString();
  return updateDocumentSession(clientJobId, {
    ...updates,
    ocrStatus: "completed",
    ocrCompletedAt: completedAt,
    ocrEngine: updates.ocrEngine || "tesseract"
  });
}

async function markOcrFailed(clientJobId, errorCode, updates = {}) {
  const completedAt = updates.ocrCompletedAt || new Date().toISOString();
  return updateDocumentSession(clientJobId, {
    ...updates,
    ocrStatus: "failed",
    ocrCompletedAt: completedAt,
    ocrEngine: updates.ocrEngine || "tesseract",
    errorCode: cleanErrorCode(errorCode || "ocr_failed")
  });
}

function buildSafeSessionRow(metadata) {
  const row = {
    client_job_id: cleanText(metadata.clientJobId, 120),
    anonymous_session_id: cleanAnonymousSessionId(metadata.anonymousSessionId),
    status: normaliseEnum(metadata.status, VALID_STATUSES),
    input_quality: normaliseEnum(metadata.inputQuality, VALID_INPUT_QUALITIES),
    document_category: cleanCategory(metadata.documentCategory),
    document_type: cleanCategory(metadata.documentType),
    trust_assessment: normaliseEnum(metadata.trustAssessment, VALID_TRUST_LEVELS),
    severity_level: normaliseEnum(metadata.severityLevel, VALID_SEVERITY_LEVELS),
    processing_mode: normaliseEnum(metadata.processingMode, VALID_PROCESSING_MODES),
    confidence: normaliseEnum(metadata.confidence, VALID_CONFIDENCE_LEVELS),
    needs_human_review: typeof metadata.needsHumanReview === "boolean" ? metadata.needsHumanReview : undefined,
    banner_type: normaliseEnum(metadata.bannerType, VALID_BANNER_TYPES),
    cards_count: normaliseCardsCount(metadata.cardsCount),
    source_mime_type: cleanText(metadata.sourceMimeType || metadata.mimeType, 120),
    source_size_bytes: normaliseSize(metadata.sourceSizeBytes || metadata.fileSize),
    ocr_started_at: cleanIsoDate(metadata.ocrStartedAt),
    ocr_completed_at: cleanIsoDate(metadata.ocrCompletedAt),
    ocr_duration_ms: normaliseDuration(metadata.ocrDurationMs),
    ocr_status: normaliseEnum(metadata.ocrStatus, VALID_OCR_STATUSES),
    ocr_engine: cleanOcrEngine(metadata.ocrEngine),
    ocr_input_quality: normaliseEnum(metadata.ocrInputQuality, VALID_OCR_INPUT_QUALITIES),
    ocr_confidence_category: normaliseEnum(metadata.ocrConfidenceCategory, VALID_OCR_CONFIDENCE_CATEGORIES),
    ai_used: typeof metadata.aiUsed === "boolean" ? metadata.aiUsed : undefined,
    ai_status: normaliseEnum(metadata.aiStatus, VALID_AI_STATUSES),
    ai_provider: cleanAiProvider(metadata.aiProvider),
    ai_model: cleanAiModel(metadata.aiModel),
    ai_duration_ms: normaliseDuration(metadata.aiDurationMs),
    ai_error_code: metadata.aiErrorCode === null ? null : cleanErrorCode(metadata.aiErrorCode),
    // WHY THIS IS STORED AND ai_error_code IS NOT ENOUGH. A rejection records
    // "sanitizer_rejected" and nothing else, so a production failure can never
    // be traced to the guard that caused it. On 4 August 2026 the same 702KB
    // bill was rejected twice and the guard could not be named from the table.
    //
    // GUARD NAMES ONLY, NEVER DOCUMENT TEXT. Every validator message is of the
    // form "unsafe advice matched /pattern/" or "date 12 june 2026 appears in
    // neither the document nor the engine output", so a date or an amount CAN
    // appear inside one. cleanValidationErrors truncates and strips anything
    // that looks like a value, because this table holds safe metadata only.
    ai_validation_errors: metadata.aiValidationErrors === null
      ? null : cleanValidationErrors(metadata.aiValidationErrors),
    error_code: metadata.errorCode === null ? null : cleanErrorCode(metadata.errorCode),
    expires_at: cleanIsoDate(metadata.expiresAt),
    processed_at: cleanIsoDate(metadata.processedAt)
  };

  return Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== undefined && value !== "")
  );
}

function metadataFromAnalysisOutput(output = {}) {
  const trust = output.trust || {};
  const banner = output.banner || {};
  const ai = output.debug?.ai || {};

  return {
    inputQuality: trust.input_quality,
    documentCategory: trust.document_category,
    documentType: trust.document_type,
    trustAssessment: trust.trust_assessment,
    severityLevel: trust.severity_level,
    processingMode: trust.processing_mode,
    confidence: trust.confidence,
    needsHumanReview: trust.needs_human_review,
    bannerType: banner.type,
    cardsCount: Array.isArray(output.cards) ? output.cards.length : undefined,
    aiUsed: typeof ai.ai_used === "boolean" ? ai.ai_used : undefined,
    aiStatus: ai.ai_status,
    aiProvider: ai.ai_provider,
    aiModel: ai.ai_model,
    aiDurationMs: ai.ai_duration_ms,
    aiErrorCode: ai.ai_error_code,
    aiValidationErrors: ai.validation_errors
  };
}

async function writeDocumentSession(mode, clientJobId, row) {
  let supabase;
  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    console.warn("Document session tracking skipped:", error.message);
    return null;
  }

  if (!supabase) return null;

  try {
    const query = mode === "upsert"
      ? supabase
        .from("document_sessions")
        .upsert(row, { onConflict: "client_job_id" })
        .select("id")
        .single()
      : supabase
        .from("document_sessions")
        .update(row)
        .eq("client_job_id", clientJobId)
        .select("id")
        .maybeSingle();

    const { data, error } = await query;
    if (error) {
      console.warn("Document session tracking failed:", error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.warn("Document session tracking failed:", error.message);
    return null;
  }
}

function cleanText(value, maxLength = 120) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanAnonymousSessionId(value) {
  const cleaned = cleanText(value, 120);
  if (!/^anon_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleaned)) {
    return undefined;
  }
  return cleaned;
}

function cleanCategory(value) {
  const cleaned = cleanText(value, 80).toLowerCase();
  if (!cleaned || cleaned === "auto" || cleaned === "auto detect") return undefined;
  return cleaned.replace(/[^a-z0-9_-]/g, "_").slice(0, 80);
}

function cleanErrorCode(value) {
  if (value === null) return null;
  const cleaned = cleanText(value, 80).toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return cleaned || undefined;
}

// Validator messages, reduced to the GUARD and nothing else.
//
// This table holds safe metadata only, and a raw validator message can carry a
// value out of the reader's document: "date 12 june 2026 appears in neither the
// document nor the engine output" contains a date, and the money and reference
// checks quote what they found. So every digit run is replaced before storage
// and the result is capped.
//
// What survives is the part that answers the question this column exists for:
// which guard fired. "unsafe advice matched /(?<!\b(?:says|...)/" stays legible
// as a pattern; "date {n} appears in neither..." names the date rule without
// naming the date.
function cleanValidationErrors(value) {
  if (value === null) return null;
  const list = Array.isArray(value) ? value : [value];
  const safe = list
    .map((entry) => String(entry === null || entry === undefined ? "" : entry))
    .map((entry) => entry
      .replace(/[£$€]\s?[\d,]+(?:\.\d{2})?/g, "{amount}")
      // The reference sweep runs BEFORE the date shapes on purpose. It matches
      // uppercase-led runs, so left until after it would eat the shape tokens
      // themselves: "DD/MM/YY" is [A-Z]{2,} followed by /[A-Z0-9/-]{4,}. It
      // cannot match a raw slash date, which is digits-led.
      .replace(/\b[A-Z]{2,}[-\/]?[A-Z0-9\/-]{4,}\b/g, "{ref}")
      // DATES BECOME THEIR SHAPE, NOT {date}. "{date}" told us a date failed
      // and nothing else, which on 5 August 2026 left a production defect
      // undiagnosable for a day: the column could not say whether the failing
      // form was DD/MM/YY, ISO, or something new. The SHAPE is diagnostic and
      // carries no value: "DD/MM/YY" names the notation the canonicaliser
      // missed without naming the reader's date. Most specific first, full
      // month names before abbreviations because "June" is jun + one letter
      // and an [a-z]{2,} tail cannot see it. The generic digit sweeps below
      // catch whatever these miss, so no digit survives by falling between
      // shapes.
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "YYYY-MM-DD")
      .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/g, "DD/MM/YYYY")
      .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2}\b/g, "DD/MM/YY")
      .replace(/\b\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/gi, "D Month YYYY")
      .replace(/\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\.?\s+\d{4}\b/gi, "D Mon YYYY")
      .replace(/\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{2}\b/gi, "D Month YY")
      .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{2,4}\b/gi, "Month D YYYY")
      .replace(/\b[\d][\d,\/.-]{1,}\b/g, "{n}")
      // The absolute backstop: ANY digit still standing becomes {n}, including
      // one glued to letters ("5th", "3pm") that both boundary-based sweeps
      // miss. This is the line that makes "no digit reaches the column" an
      // invariant rather than a property of the patterns above.
      .replace(/\d+/g, "{n}")
      .replace(/\s+/g, " ")
      .trim())
    .filter(Boolean)
    .slice(0, 6);
  if (!safe.length) return undefined;
  return cleanText(safe.join(" | "), 500) || undefined;
}

function normaliseEnum(value, allowedValues) {
  const cleaned = cleanText(value, 60).toLowerCase();
  return allowedValues.has(cleaned) ? cleaned : undefined;
}

function normaliseCardsCount(value) {
  const count = Number(value);
  if (!Number.isInteger(count)) return undefined;
  return Math.max(0, Math.min(6, count));
}

function normaliseSize(value) {
  const size = Number(value);
  if (!Number.isFinite(size) || size < 0) return undefined;
  return Math.round(size);
}

function normaliseDuration(value) {
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration < 0) return undefined;
  return Math.round(duration);
}

function cleanOcrEngine(value) {
  const cleaned = cleanText(value, 40).toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return cleaned || undefined;
}

function cleanAiProvider(value) {
  const cleaned = cleanText(value, 40).toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return cleaned || undefined;
}

function cleanAiModel(value) {
  const cleaned = cleanText(value, 80).replace(/[^a-zA-Z0-9_.:-]/g, "_");
  return cleaned || undefined;
}

function cleanIsoDate(value) {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return undefined;
  return new Date(timestamp).toISOString();
}

module.exports = {
  createDocumentSession,
  updateDocumentSession,
  markDocumentSessionAnalysed,
  markDocumentSessionFailed,
  markOcrStarted,
  markOcrCompleted,
  markOcrFailed,
  metadataFromAnalysisOutput
};
