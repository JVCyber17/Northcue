const { getSupabaseAdminClient } = require("./supabaseService");

const VALID_RATINGS = new Set(["yes", "little", "no"]);
const VALID_TRUST_LEVELS = new Set(["high", "medium", "low", "unknown"]);
const VALID_SEVERITY_LEVELS = new Set(["low", "medium", "high", "urgent"]);
const MAX_NOTE_LENGTH = 500;
const MAX_REASONS = 8;

function createValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function normaliseRating(value) {
  const rating = cleanText(value, 40).toLowerCase();
  if (VALID_RATINGS.has(rating)) return rating;
  if (rating.startsWith("yes")) return "yes";
  if (rating.includes("little") || rating.includes("partly")) return "little";
  if (rating.startsWith("no")) return "no";
  return "";
}

function cleanText(value, maxLength = 120) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitiseNote(value) {
  const note = cleanText(value, MAX_NOTE_LENGTH);
  if (!note) return "";

  return note
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "[redacted-phone]")
    .replace(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi, "[redacted-postcode]")
    .replace(/\b\d{2}-\d{2}-\d{2}\b/g, "[redacted-number]")
    .replace(/\b\d{8,}\b/g, "[redacted-number]")
    .replace(/£\s?\d+(?:[.,]\d{2})?/g, "[redacted-amount]")
    .slice(0, MAX_NOTE_LENGTH);
}

function normaliseReasons(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((reason) => cleanText(reason, 60))
    .filter(Boolean)
    .slice(0, MAX_REASONS);
}

function normaliseOptionalEnum(value, allowedValues, fallback = null) {
  const cleaned = cleanText(value, 40).toLowerCase();
  if (allowedValues.has(cleaned)) return cleaned;
  return fallback;
}

async function saveFeedbackEvent(payload, options = {}) {
  const rating = normaliseRating(payload.rating);
  if (!rating) {
    throw createValidationError("Feedback rating is required.");
  }

  const note = sanitiseNote(payload.note || payload.comment || "");
  const row = {
    rating,
    reasons: normaliseReasons(payload.reasons),
    note: note || null,
    has_comment: Boolean(note),
    comment_length: note.length,
    contact_requested: Boolean(
      payload.contact_permission || payload.contact_requested || payload.contactRequested
    ),
    page: cleanText(payload.page, 80) || null,
    section: cleanText(payload.section, 80) || null,
    anonymous_session_id: cleanText(options.anonymousSessionId, 120) || null,
    document_category: cleanText(payload.document_category || payload.document_type, 80) || null,
    trust_assessment: normaliseOptionalEnum(payload.trust_level || payload.trust_assessment, VALID_TRUST_LEVELS),
    severity_level: normaliseOptionalEnum(payload.severity_level, VALID_SEVERITY_LEVELS)
  };

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase is not configured. Add Supabase environment variables before saving feedback.");
  }

  const { data, error } = await supabase
    .from("feedback_events")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return { id: data.id };
}

module.exports = {
  saveFeedbackEvent,
  sanitiseNote,
  normaliseRating
};
