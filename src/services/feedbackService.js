const { getSupabaseAdminClient } = require("./supabaseService");
const { FEEDBACK_EVENT_RETENTION_MS, expiryFromNow } = require("../config/retentionPolicy");

const VALID_RATINGS = new Set(["yes", "little", "no"]);
const VALID_TRUST_LEVELS = new Set(["high", "medium", "low", "unknown"]);
const VALID_SEVERITY_LEVELS = new Set(["low", "medium", "high", "urgent"]);
// How the reader felt about their letter after reading the cards. One optional
// tap, so most rows will not carry it. Anything outside this set is dropped
// rather than stored, which keeps the column reportable without a cleanup pass.
const VALID_CONFIDENCE_LEVELS = new Set(["more_able", "about_same", "still_unsure"]);
const MAX_NOTE_LENGTH = 500;
const MAX_REASONS = 8;
const MAX_EMAIL_LENGTH = 254;

// Forgiving email check for the dedicated optional contact field. A local part,
// an @, and a dotted domain, with no whitespace. Deliberately permissive — it
// only rejects obvious non-emails rather than enforcing RFC 5322. This field is
// stored INTACT and is never passed through sanitiseNote(), so a real reply
// address is preserved while free-text note redaction stays exactly as it was.
function normaliseEmail(value) {
  const cleaned = cleanText(value, MAX_EMAIL_LENGTH);
  if (!cleaned) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return "";
  return cleaned;
}

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
    .replace(/\b(?:\d[ -]){12,18}\d\b/g, "[redacted-number]")
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "[redacted-phone]")
    .replace(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi, "[redacted-postcode]")
    .replace(/\b[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/gi, "[redacted-number]")
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

// Returns one of the three confidence answers, or null when the reader skipped
// the question or sent something unrecognised. Skipping is a normal outcome
// here, not an error, so this never throws.
function normaliseConfidence(value) {
  return normaliseOptionalEnum(value, VALID_CONFIDENCE_LEVELS);
}

async function saveFeedbackEvent(payload, options = {}) {
  const rating = normaliseRating(payload.rating);
  if (!rating) {
    throw createValidationError("Feedback rating is required.");
  }

  const note = sanitiseNote(payload.note || payload.comment || "");
  const row = {
    // Six months, longer than the other two tables because feedback is read by a
    // person rather than being operational. Stated on the row; the purge measures
    // created_at. See src/config/retentionPolicy.js.
    expires_at: expiryFromNow(FEEDBACK_EVENT_RETENTION_MS),
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

  // Optional confidence answer, one tap and skippable, so most rows will not
  // carry it. Added only when the reader actually chose something, for the same
  // reason as contact_email below. See supabase/phase8_feedback_confidence.sql.
  const confidenceAfter = normaliseConfidence(payload.confidence_after || payload.confidenceAfter);
  if (confidenceAfter) {
    row.confidence_after = confidenceAfter;
  }

  // Optional reply address. Stored intact (never through sanitiseNote). Only added
  // to the row when a plausible email is present, so ordinary feedback does not
  // reference the contact_email column — keeping inserts working even before the
  // column is added in Supabase.
  const contactEmail = normaliseEmail(payload.email);
  if (contactEmail) {
    row.contact_email = contactEmail;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase is not configured. Add Supabase environment variables before saving feedback.");
  }

  const { data, error } = await insertFeedbackRow(supabase, row);

  if (error) {
    throw error;
  }

  return { id: data.id };
}

// Columns that only appear on some rows and were each added by a later
// migration. If the database has not caught up yet, naming one of them fails
// the whole insert and the rating, the reasons and the note go down with it.
// Losing a reader's answer because a column is late is never the right trade,
// so the retry drops the optional fields and keeps the answer.
const OPTIONAL_FEEDBACK_COLUMNS = ["confidence_after", "contact_email", "expires_at"];

function isUnknownColumnError(error) {
  if (!error) return false;
  // PostgREST schema cache miss, and the underlying Postgres undefined column.
  return error.code === "PGRST204" || error.code === "42703";
}

async function insertFeedbackRow(supabase, row) {
  const first = await supabase.from("feedback_events").insert(row).select("id").single();
  if (!isUnknownColumnError(first.error)) return first;

  const carriesOptional = OPTIONAL_FEEDBACK_COLUMNS.some((column) =>
    Object.prototype.hasOwnProperty.call(row, column)
  );
  if (!carriesOptional) return first;

  const reducedRow = { ...row };
  OPTIONAL_FEEDBACK_COLUMNS.forEach((column) => delete reducedRow[column]);
  console.warn(
    "Feedback insert retried without optional columns. Run the pending Supabase migration:",
    first.error.message
  );

  return await supabase.from("feedback_events").insert(reducedRow).select("id").single();
}

module.exports = {
  saveFeedbackEvent,
  sanitiseNote,
  normaliseRating,
  normaliseEmail,
  normaliseConfidence
};
