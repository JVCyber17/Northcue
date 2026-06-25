// In-memory store for OCR/extracted document text held briefly between the
// upload step and the analyse step. One responsibility: keep that temporary
// text only as long as needed — a hard TTL plus an active background sweep so
// abandoned uploads don't linger in memory. Lifted out of simplifyRoute so the
// route can focus on orchestration; behaviour is unchanged from when this lived
// there.

// How long extracted text may sit in memory between the upload step and the
// analyse step. Kept short to limit how long document text lives in memory,
// while leaving a slow/anxious user time to press "Understand". Env-configurable.
const OCR_SESSION_TTL_MS = Math.max(60000, Number(process.env.OCR_SESSION_TTL_MS || 15 * 60 * 1000));
// Active eviction interval so in-memory text is cleared promptly even when no
// further requests arrive (lazy cleanup alone could let an abandoned upload
// linger past the TTL).
const OCR_SWEEP_INTERVAL_MS = Math.max(15000, Number(process.env.OCR_SWEEP_INTERVAL_MS || 60 * 1000));
const ocrSessionStore = new Map();
let ocrSweepTimer = null;

function rememberOcrText({ jobId, extractedText, inputQuality, mimeType, originalName }) {
  cleanupOldOcrSessions();

  ocrSessionStore.set(jobId, {
    extractedText,
    inputQuality,
    mimeType,
    originalName,
    createdAt: Date.now()
  });

  ensureOcrSweepTimer();
}

// Start a lightweight background timer that evicts expired in-memory text even
// with no further traffic. It unref()s so it never keeps the process (or a
// test run) alive, and stops itself once the store is empty.
function ensureOcrSweepTimer() {
  if (ocrSweepTimer || ocrSessionStore.size === 0) return;

  ocrSweepTimer = setInterval(() => {
    cleanupOldOcrSessions();
    if (ocrSessionStore.size === 0) {
      clearInterval(ocrSweepTimer);
      ocrSweepTimer = null;
    }
  }, OCR_SWEEP_INTERVAL_MS);

  if (typeof ocrSweepTimer.unref === "function") ocrSweepTimer.unref();
}

function cleanupOldOcrSessions() {
  const cutoff = Date.now() - OCR_SESSION_TTL_MS;
  for (const [storedJobId, value] of ocrSessionStore.entries()) {
    if (value.createdAt < cutoff) {
      ocrSessionStore.delete(storedJobId);
    }
  }
}

module.exports = {
  ocrSessionStore,
  rememberOcrText,
  cleanupOldOcrSessions,
  OCR_SESSION_TTL_MS
};
