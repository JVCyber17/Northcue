const { getSupabaseAdminClient } = require("./supabaseService");
const { ANALYTICS_EVENT_RETENTION_MS, expiryFromNow } = require("../config/retentionPolicy");

const ALLOWED_EVENT_NAMES = new Set([
  "upload_started",
  "upload_completed",
  "upload_failed",
  "analysis_started",
  "analysis_completed",
  "analysis_failed",
  "cards_generated",
  "card_viewed",
  "next_clicked",
  "back_clicked",
  "focus_mode_used",
  "simple_view_used",
  "document_check_clicked",
  "copy_summary_clicked",
  "feedback_opened",
  "feedback_submitted",
  "journey_completed"
]);

const ALLOWED_FIELDS = new Set([
  "event_name",
  "anonymous_session_id",
  "client_job_id",
  "page",
  "section",
  "card_number",
  "card_type",
  "document_type",
  "input_quality",
  "ai_status",
  "ocr_status",
  "error_code",
  "created_at"
]);

const MAX_TEXT_LENGTH = 80;

function buildAnalyticsEventRow(payload, options = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw validationError("Analytics event must be a JSON object.");
  }

  rejectUnknownFields(payload);

  const eventName = cleanText(payload.event_name, MAX_TEXT_LENGTH);
  if (!ALLOWED_EVENT_NAMES.has(eventName)) {
    throw validationError("Analytics event is not allowed.");
  }

  const metadata = {
    // Browser-sent anonymous_session_id is accepted for API compatibility,
    // but the backend-generated session ID is the only value stored.
    anonymous_session_id: cleanText(options.anonymousSessionId, 120) || null,
    client_job_id: cleanText(payload.client_job_id, 120) || null,
    section: cleanText(payload.section, MAX_TEXT_LENGTH) || null,
    card_number: cleanCardNumber(payload.card_number),
    card_type: cleanText(payload.card_type, MAX_TEXT_LENGTH) || null,
    document_type: cleanText(payload.document_type, MAX_TEXT_LENGTH) || null,
    input_quality: cleanText(payload.input_quality, 40) || null,
    ai_status: cleanText(payload.ai_status, 40) || null,
    ocr_status: cleanText(payload.ocr_status, 40) || null,
    error_code: cleanText(payload.error_code, MAX_TEXT_LENGTH) || null,
    client_created_at: cleanIsoTimestamp(payload.created_at)
  };

  return {
    event_name: eventName,
    page: cleanText(payload.page, MAX_TEXT_LENGTH) || null,
    // Thirty days, the same as a document session. Stated on the row; the purge
    // measures created_at. See src/config/retentionPolicy.js.
    expires_at: expiryFromNow(ANALYTICS_EVENT_RETENTION_MS),
    metadata: removeEmptyValues(metadata)
  };
}

async function saveAnalyticsEvent(payload, options = {}) {
  const row = buildAnalyticsEventRow(payload, options);
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    const error = new Error("Supabase is not configured for analytics.");
    error.statusCode = 503;
    throw error;
  }

  const { data, error } = await insertAnalyticsRow(supabase, row);

  if (error) {
    const saveError = new Error("Analytics event could not be saved.");
    saveError.statusCode = 500;
    throw saveError;
  }

  return data;
}

// PRE-MIGRATION TOLERANCE for expires_at, the same trade the other two tables
// already make. If this deploy reaches a database that has not applied phase10
// yet, naming the column fails the whole insert and the event is lost. Losing
// the event because a column is late is never the right trade, so the retry
// drops it and keeps the event. The row is still purged correctly either way,
// because the purge measures created_at, not this column.
async function insertAnalyticsRow(supabase, row) {
  const first = await supabase.from("analytics_events").insert(row).select("id").single();
  if (!isUnknownColumnError(first.error) || !("expires_at" in row)) return first;

  const { expires_at, ...withoutExpiry } = row;
  console.warn(
    "Analytics expires_at column missing, retrying without it. Run the pending Supabase migration:",
    first.error.message
  );
  return await supabase.from("analytics_events").insert(withoutExpiry).select("id").single();
}

function isUnknownColumnError(error) {
  if (!error) return false;
  // PostgREST schema cache miss, and the underlying Postgres undefined column.
  return error.code === "PGRST204" || error.code === "42703";
}

function rejectUnknownFields(payload) {
  const unknownFields = Object.keys(payload).filter((key) => !ALLOWED_FIELDS.has(key));
  if (unknownFields.length > 0) {
    throw validationError(`Unknown analytics fields: ${unknownFields.join(", ")}`);
  }
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.replace(/[^\w .:/-]/g, "").trim().slice(0, maxLength);
}

function cleanCardNumber(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 20) return null;
  return number;
}

function cleanIsoTimestamp(value) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function removeEmptyValues(values) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== null && value !== "")
  );
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

module.exports = {
  ALLOWED_EVENT_NAMES,
  buildAnalyticsEventRow,
  saveAnalyticsEvent
};
