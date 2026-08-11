const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const { cleanupTemporaryFile } = require("../utils/temporaryStorageCleanup");
const {
  DOCUMENT_SESSION_RETENTION_MS,
  expiryFromNow
} = require("../config/retentionPolicy");

const {
  extractTextFromInput,
  extractTextFromImage,
  extractTextFromPdf,
  isImageMimeType,
  rateInputQuality,
  countWords
} = require("../services/textExtraction");
const { runClearStepsEngine } = require("../services/clearStepsEngine");
const {
  createDocumentSession,
  updateDocumentSession,
  markDocumentSessionAnalysed,
  markDocumentSessionFailed,
  markOcrStarted,
  markOcrCompleted,
  markOcrFailed
} = require("../services/documentSessionService");
const {
  applySafetyPassAndRecordAiStatus,
  providerSkipReason,
  redactForAi,
  AI_TIMEOUT_MS,
  AI_OUTBOUND_TEXT_MAX_CHARS,
  DEFAULT_MODEL
} = require("../services/aiStructuredResultService");
const { extractFacts, FACT_EXTRACTION_BUDGET_MS } = require("../services/aiFactExtractionService");
const {
  ocrSessionStore,
  rememberOcrText,
  cleanupOldOcrSessions,
  OCR_SESSION_TTL_MS
} = require("../services/ocrSessionStore");

async function simplifyRoute({ file, fields, directories }) {
  const { uploadsDir, resultsDir } = directories;
  const pastedText = fields.pastedText || fields.text || "";
  const action = fields.action || "";
  const requestedJobId = fields.jobId || fields.job_id || "";
  const selectedCategory = fields.documentCategory || "auto";
  const anonymousSessionId = fields.anonymousSessionId || "";
  const interfaceLanguage = normaliseInterfaceLanguage(fields.language);

  if (action === "analyse") {
    return await analyseStoredDocument({
      jobId: requestedJobId,
      selectedCategory,
      anonymousSessionId,
      resultsDir,
      interfaceLanguage
    });
  }

  let filePath = null;
  let mimeType = "text/plain";
  let originalName = "pasted-text";
  let jobId = null;

  if (file) {
    jobId = file.jobId;
    filePath = file.savedPath;
    mimeType = file.contentType;
    originalName = file.filename;
  }

  if (filePath) {
    // The uploaded temp file must be deleted on EVERY exit path, including a
    // throw inside createDocumentSession. Keep the whole flow inside try/finally.
    try {
      await createDocumentSession({
        clientJobId: jobId,
        status: "uploaded",
        anonymousSessionId,
        sourceMimeType: mimeType,
        sourceSizeBytes: file.sizeBytes,
        documentCategory: selectedCategory,
        language: interfaceLanguage,
        // The ROW's retention, thirty days. This used to be OCR_SESSION_TTL_MS,
        // the fifteen minute TTL for extracted text held in memory, which is a
        // different thing entirely: that TTL governs how long the text lives
        // between the upload step and the analyse step, and it is untouched.
        expiresAt: expiryFromNow(DOCUMENT_SESSION_RETENTION_MS)
      });

      const extractionResult = await extractUploadedFileText({
        filePath,
        mimeType,
        originalName,
        jobId,
        anonymousSessionId,
        sourceSizeBytes: file.sizeBytes,
        selectedCategory
      });

      if (!extractionResult.success) {
        await markDocumentSessionFailed(jobId, "unreadable_document", {
          inputQuality: "poor",
          anonymousSessionId,
          sourceMimeType: mimeType,
          sourceSizeBytes: file.sizeBytes,
          documentCategory: selectedCategory
        });
        return extractionResult;
      }

      // Store extracted text in memory only for the next backend step.
      // Do not send raw OCR or document text to the normal user interface.
      rememberOcrText({
        jobId,
        extractedText: extractionResult.extractedText,
        inputQuality: extractionResult.inputQuality,
        mimeType,
        originalName
      });

      await updateDocumentSession(jobId, {
        status: "uploaded",
        anonymousSessionId,
        inputQuality: extractionResult.inputQuality,
        sourceMimeType: mimeType,
        sourceSizeBytes: file.sizeBytes,
        documentCategory: selectedCategory,
        // The row's retention, not the in-memory text TTL. See the note above.
        expiresAt: expiryFromNow(DOCUMENT_SESSION_RETENTION_MS)
      });

      return {
        success: true,
        job_id: jobId,
        message: "Your document is ready.",
        input_quality: extractionResult.inputQuality
      };
    } finally {
      deleteTemporaryUpload({ filePath, uploadsDir });
    }
  }

  const extractedText = pastedText.trim();
  jobId = jobId || crypto.randomUUID();
  const pastedInputQuality = hasEnoughText(extractedText)
    ? (extractedText.length >= 160 ? "good" : "borderline")
    : "poor";

  await createDocumentSession({
    clientJobId: jobId,
    status: "uploaded",
    anonymousSessionId,
    sourceMimeType: mimeType,
    sourceSizeBytes: Buffer.byteLength(extractedText, "utf8"),
    language: interfaceLanguage,
    inputQuality: pastedInputQuality,
    documentCategory: selectedCategory
  });

  if (!hasEnoughText(extractedText)) {
    await markDocumentSessionFailed(jobId, "unreadable_document", {
      inputQuality: "poor",
      anonymousSessionId,
      sourceMimeType: mimeType,
      documentCategory: selectedCategory
    });
    return unreadableDocumentResponse();
  }

  const run = await analyseDocumentText(extractedText, {
    jobId,
    mimeType,
    originalName,
    selectedCategory,
    anonymousSessionId,
    interfaceLanguage
  });

  const output = run.api_output;

  // Store safe processing metadata only. The API response still returns cue cards,
  // but local disk does not retain document-derived text, OCR text, or raw AI output.
  fs.writeFileSync(
    path.join(resultsDir, `${output.job_id}.json`),
    JSON.stringify(buildSafeStoredResult(output), null, 2)
  );

  await markDocumentSessionAnalysed(jobId, output, {
    inputQuality: pastedInputQuality,
    anonymousSessionId,
    sourceMimeType: mimeType,
    documentCategory: selectedCategory,
    language: interfaceLanguage
  });

  // Keep file retention short in production.
  // TODO: Add scheduled deletion policy for uploads.
  deleteTemporaryUpload({ filePath, uploadsDir });

  return output;
}

async function extractUploadedFileText({
  filePath,
  mimeType,
  originalName,
  jobId,
  anonymousSessionId,
  sourceSizeBytes,
  selectedCategory
}) {
  if (isImageMimeType(mimeType)) {
    const ocrStartedAt = new Date().toISOString();
    const ocrStartMs = Date.now();

    await markOcrStarted(jobId, {
      anonymousSessionId,
      sourceMimeType: mimeType,
      sourceSizeBytes,
      documentCategory: selectedCategory,
      ocrStartedAt,
      ocrEngine: "tesseract"
    });

    const ocrResult = await extractTextFromImage({ filePath });
    const ocrDurationMs = Date.now() - ocrStartMs;
    const ocrCompletedAt = new Date().toISOString();
    const ocrInputQuality = normaliseOcrInputQuality(ocrResult.input_quality);
    const ocrConfidenceCategory = inferOcrConfidenceCategory(ocrInputQuality);

    if (!ocrResult.success || !hasEnoughText(ocrResult.extracted_text)) {
      await markOcrFailed(jobId, "ocr_unreadable", {
        anonymousSessionId,
        sourceMimeType: mimeType,
        sourceSizeBytes,
        documentCategory: selectedCategory,
        inputQuality: "poor",
        ocrStartedAt,
        ocrCompletedAt,
        ocrDurationMs,
        ocrInputQuality: ocrInputQuality === "unknown" ? "poor" : ocrInputQuality,
        ocrConfidenceCategory: ocrConfidenceCategory === "unknown" ? "low" : ocrConfidenceCategory,
        ocrEngine: "tesseract"
      });
      return unreadableDocumentResponse();
    }

    await markOcrCompleted(jobId, {
      anonymousSessionId,
      sourceMimeType: mimeType,
      sourceSizeBytes,
      documentCategory: selectedCategory,
      inputQuality: normaliseAppInputQuality(ocrResult.input_quality),
      ocrStartedAt,
      ocrCompletedAt,
      ocrDurationMs,
      ocrInputQuality,
      ocrConfidenceCategory,
      ocrEngine: "tesseract"
    });

    return {
      success: true,
      extractedText: ocrResult.extracted_text,
      inputQuality: normaliseAppInputQuality(ocrResult.input_quality)
    };
  }

  if (mimeType === "application/pdf") {
    const pdfResult = await extractTextFromPdf({ filePath });

    if (pdfResult.pageCount > 5) {
      return {
        success: false,
        code: "pdf_too_many_pages",
        error: "Please upload a PDF with 5 pages or fewer for now."
      };
    }

    if (!hasEnoughText(pdfResult.text)) {
      return {
        success: false,
        code: "pdf_no_text_layer",
        error:
          "This PDF appears to be a scanned document rather than a text document. " +
          "For best results, please upload a clear photo of the document instead."
      };
    }

    return {
      success: true,
      extractedText: pdfResult.text,
      inputQuality: rateInputQuality(pdfResult.text)
    };
  }

  const extractedText = await extractTextFromInput({
    pastedText: "",
    filePath,
    mimeType,
    originalName
  });

  if (!hasEnoughText(extractedText)) {
    return unreadableDocumentResponse();
  }

  return {
    success: true,
    extractedText,
    inputQuality: extractedText.length >= 160 ? "good" : "borderline"
  };
}

async function analyseStoredDocument({ jobId, selectedCategory, anonymousSessionId, resultsDir, interfaceLanguage }) {
  cleanupOldOcrSessions();

  const storedDocument = ocrSessionStore.get(jobId);
  if (!storedDocument || !hasEnoughText(storedDocument.extractedText)) {
    await markDocumentSessionFailed(jobId, "ocr_session_missing_or_expired", {
      inputQuality: "poor",
      anonymousSessionId,
      documentCategory: selectedCategory
    });
    return unreadableDocumentResponse();
  }

  await updateDocumentSession(jobId, {
    status: "uploaded",
    anonymousSessionId,
    inputQuality: storedDocument.inputQuality,
    sourceMimeType: storedDocument.mimeType,
    documentCategory: selectedCategory
  });

  const run = await analyseDocumentText(storedDocument.extractedText, {
    jobId,
    mimeType: storedDocument.mimeType,
    originalName: storedDocument.originalName,
    selectedCategory,
    anonymousSessionId,
    interfaceLanguage
  });

  const output = run.api_output;

  // Store safe processing metadata only. The temporary OCR text is deleted below.
  fs.writeFileSync(
    path.join(resultsDir, `${output.job_id}.json`),
    JSON.stringify(buildSafeStoredResult(output), null, 2)
  );

  await markDocumentSessionAnalysed(jobId, output, {
    inputQuality: storedDocument.inputQuality,
    anonymousSessionId,
    sourceMimeType: storedDocument.mimeType,
    documentCategory: selectedCategory,
    language: interfaceLanguage
  });

  // Remove the temporary raw text after it has been used.
  ocrSessionStore.delete(jobId);

  return output;
}

// The order matters, and it is the only reason this lives here rather than in a
// service: the engine decides the gates, the gates decide whether the extractor
// may run, and the extractor's answer is an input to the engine's second run.
//
//   1. engine, with no facts        -> trust, severity, category, the gates
//   2. gates                        -> may this document reach the provider?
//   3. extractor                    -> fact candidates, or null
//   4. engine, with the facts       -> the reading a reader gets
//   5. phrasing pass                -> unchanged, and removed in the next commit
//
// Step 4 costs 0.36ms measured across all forty corpus documents, which is why
// the engine is simply run again rather than patched in place. Step 3 returning
// null is the failure path, and step 4 with null facts is byte-identical to
// step 1, so there is no separate fallback that could be got wrong.
async function analyseDocumentText(extractedText, fileMeta = {}) {
  const language = fileMeta.interfaceLanguage;
  const rulesRun = runClearStepsEngine({ extractedText, fileMeta });

  const { run, factsDebug } = await withFactCandidates({ rulesRun, extractedText, fileMeta, language });

  // Optional backend-only AI pass. If it is unavailable, slow, invalid, or unsafe,
  // the existing rules-based result is returned unchanged. When the interface
  // language is not English the pass is skipped entirely inside the service:
  // AI phrasing is English only in the multilingual MVP, and non English cards
  // are the deterministic rules cards translated by the template bank.
  const applied = await applySafetyPassAndRecordAiStatus({
    rulesRun: run,
    extractedText,
    language
  });

  applied.api_output.debug.ai_facts = factsDebug;
  return applied;
}

// Runs the fact extractor behind the SAME gate the phrasing pass uses, and
// re-runs the engine with whatever came back.
//
// Returns the original run untouched whenever the gate declines or the
// extractor fails, so a gated document is not merely unchanged in content but
// is the same object it always was.
async function withFactCandidates({ rulesRun, extractedText, fileMeta, language }) {
  const skipReason = providerSkipReason({ rulesRun, language });
  if (skipReason) {
    return { run: rulesRun, factsDebug: { facts_status: "skipped", facts_error_code: skipReason } };
  }

  const { facts, debug } = await extractFacts({
    // The same redaction and the same outbound cap the phrasing pass used.
    // CLEARSTEPS_AI_TIMEOUT_MS stays as an operator ceiling over the top, so a
    // deployment can still cap this lower without a code change.
    documentText: redactForAi(extractedText).slice(0, AI_OUTBOUND_TEXT_MAX_CHARS),
    model: DEFAULT_MODEL,
    apiKey: process.env.OPENAI_API_KEY,
    timeoutMs: Math.min(AI_TIMEOUT_MS, FACT_EXTRACTION_BUDGET_MS)
  });

  if (!facts) return { run: rulesRun, factsDebug: debug };

  return { run: runClearStepsEngine({ extractedText, fileMeta, facts }), factsDebug: debug };
}

// Interface language sent by the frontend with the analyse request. Validated
// against the same language list the browser uses (public/i18n/config.js is a
// plain UMD data module, so requiring it here keeps a single source of truth).
// Anything unknown falls back to English, which means the AI pass behaviour
// is unchanged for every existing caller.
const I18N_CONFIG = require("../../public/i18n/config");

function normaliseInterfaceLanguage(value) {
  const cleaned = String(value || "").toLowerCase().trim();
  const known = I18N_CONFIG.languages.some((entry) => entry.code === cleaned);
  return known ? cleaned : "en";
}

function buildSafeStoredResult(output = {}) {
  const trust = output.trust || {};
  const ai = output.debug?.ai || {};

  return {
    job_id: output.job_id,
    created_at: output.debug?.created_at,
    status: "analysed",
    cards_count: Array.isArray(output.cards) ? output.cards.length : 0,
    trust: {
      trust_assessment: trust.trust_assessment,
      severity_level: trust.severity_level,
      processing_mode: trust.processing_mode,
      confidence: trust.confidence,
      input_quality: trust.input_quality,
      document_category: trust.document_category,
      document_type: trust.document_type,
      needs_human_review: trust.needs_human_review
    },
    banner_type: output.banner?.type,
    debug: {
      prompt_version: output.debug?.prompt_version,
      model: output.debug?.model,
      ai: {
        ai_used: ai.ai_used,
        ai_status: ai.ai_status,
        ai_provider: ai.ai_provider,
        ai_model: ai.ai_model,
        ai_duration_ms: ai.ai_duration_ms,
        ai_error_code: ai.ai_error_code
      }
    }
  };
}

// The volume floor every path shares: pasted text, an image, a PDF and a stored
// OCR session all pass through here, and five of the six call sites REFUSE on a
// false. It counted [A-Za-z0-9], which is zero for a document written in
// Bengali, Gujarati, Hindi or Panjabi, so a letter in any of those scripts was
// refused outright no matter how clean it was. countWords is shared with
// rateInputQuality rather than re-expressed, because a second copy is exactly how
// one of the two gates ends up ASCII-only again.
//
// cleaned.length was already script neutral and is unchanged.
function hasEnoughText(text) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  return cleaned.length >= 25 && countWords(cleaned) >= 5;
}

function unreadableDocumentResponse() {
  return {
    success: false,
    error: "We could not read enough text from this document. Please upload a clearer image or PDF."
  };
}

function normaliseAppInputQuality(value) {
  const cleaned = String(value || "").toLowerCase();
  if (cleaned === "good") return "good";
  if (cleaned === "fair" || cleaned === "borderline") return "borderline";
  return "poor";
}

function normaliseOcrInputQuality(value) {
  const cleaned = String(value || "").toLowerCase();
  if (cleaned === "good") return "good";
  if (cleaned === "fair" || cleaned === "borderline") return "fair";
  if (cleaned === "poor") return "poor";
  return "unknown";
}

function inferOcrConfidenceCategory(inputQuality) {
  if (inputQuality === "good") return "high";
  if (inputQuality === "fair") return "medium";
  if (inputQuality === "poor") return "low";
  return "unknown";
}

function deleteTemporaryUpload({ filePath, uploadsDir }) {
  if (process.env.CLEARSTEPS_ENABLE_FILE_RETENTION || !filePath) {
    return;
  }

  cleanupTemporaryFile({
    filePath,
    allowedDirectories: [uploadsDir],
    logger: console
  });
}

// analyseDocumentText is exported for tests. It is the orchestration point
// where the engine, the gates, the fact extractor and the phrasing pass meet,
// and the failure path is a property of that ORDER rather than of any one of
// them, so it has to be exercised here to be exercised at all.
module.exports = { simplifyRoute, ocrSessionStore, analyseDocumentText };
