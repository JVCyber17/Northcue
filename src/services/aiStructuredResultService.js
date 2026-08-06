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

// 30 SECONDS, CHOSEN FROM THE DISTRIBUTION AND THEN LOWERED FOR A FRONTEND
// REASON. scripts/reader-output/latency.js, 126 calls over three rounds with a
// 90s ceiling so the tail is uncensored:
//
//   min 10,054   p50 14,330   p90 18,424   p95 20,163   p99 30,403   max 31,174
//
//   ceiling   times out     reader wait p50 / p90   worst ACTUAL wait
//   15s       53 (42.1%)    14,330 / 15,000         15,000
//   20s        7 ( 5.6%)    14,330 / 18,424         20,000
//   25s        2 ( 1.6%)    14,330 / 18,424         25,000
//   30s        2 ( 1.6%)    14,330 / 18,424         30,000
//   35s        0 ( 0.0%)    14,330 / 18,424         31,174
//   40s        0 ( 0.0%)    14,330 / 18,424         31,174
//
// p50 and p90 are identical at every value from 20s up. The ceiling changes
// nothing for the typical reader; it only decides what happens to the tail.
//
// 40 IS THE BETTER NUMBER ON LATENCY ALONE and the data supports it: the
// timeout rate goes to zero, the worst ACTUAL wait stays 31,174ms because
// nobody waits a ceiling nothing reaches, and the two readers who lose the
// prose at 25s would instead wait about six seconds longer and get it. 35 was
// rejected as over-fitting, being four seconds above the largest value in 126
// samples.
//
// IT IS REFUSED FOR A FRONTEND REASON, not a latency one. The upload screen has
// no progress indication: no spinner, no elapsed time, and two aria-live regions
// that announce once and then go silent. A 31 second silent wait is not
// something to ship to an anxious person holding a letter about money. When the
// screen can tell a reader honestly that their letter is being read and roughly
// where it is, 40 becomes the right number and this comment is the argument for
// making that change.
//
// 30 costs nothing against 25 on the measured distribution, the same two calls
// exceed both, and it leaves headroom for provider drift. It is the value that
// buys time without buying silence.
//
// The fact extractor is unaffected: it takes Math.min(AI_TIMEOUT_MS,
// FACT_EXTRACTION_BUDGET_MS) and its own budget is 8,000ms.
// RAISED TO 40 SECONDS, 5 AUGUST 2026. The condition this comment set has been
// met by evidence rather than by the frontend, and the reason is above.
//
// The table above says 40 is the better number on latency alone and always did.
// It was refused for a frontend reason: a 31 second silent wait on a screen
// with no spinner, no elapsed time and two aria-live regions that announce once
// and go quiet. That argument has not gone away. What changed is the cost of
// the other side of the trade, measured on real production uploads of one
// 702KB communal bill:
//
//     18,438ms  served      24,940ms  served
//     19,252ms  served      26,095ms  REJECTED
//     24,104ms  served      28,593ms  REJECTED
//     27,850ms  served      30,034ms  TIMED OUT at the ceiling
//
// Good runs are completing at 28 to 29 seconds against a 30 second ceiling.
// A reader is losing rich cards over one second of headroom, on the document
// type this product exists for, and the corpus distribution that chose 30 had
// no document of this size in it.
//
// THE PROGRESS INDICATION SHIPS SEPARATELY AND NEXT, per the scope already
// approved in principle: honest state, no fabricated percentage, elapsed time
// rather than a fake bar, and the two aria-live regions made to keep speaking.
// Until it lands a reader can wait up to 40 seconds with nothing on screen,
// which is worse than it was yesterday. That is a deliberate trade taken with
// the numbers above in view, and it is not finished until the screen changes.
const AI_TIMEOUT_MS = positiveNumberSetting("CLEARSTEPS_AI_TIMEOUT_MS", 40000);
// TEMPORARY, recorded as such on 6 August 2026: the ceiling for a prose call
// asked to WRITE IN A LAUNCHED READER'S LANGUAGE, not for English. The
// founder's live review found a production-scale bill timing out on the
// Gujarati path: writing Gujarati prose on a document that saturates the
// outbound cap runs past 40 seconds, so long documents never completed for
// exactly the readers wave one opened the gates for. 90 seconds lets them
// complete while the founder decides the translate-after-English
// architecture (D-FIX-2); if that proposal is adopted, generation returns
// to English for everyone and this constant and its branch are removed.
// The client's progress announcements carry the longer wait honestly for
// launched non-English readers (startProgressAnnouncements in app.js).
const AI_LANGUAGE_TIMEOUT_MS = positiveNumberSetting("CLEARSTEPS_AI_LANGUAGE_TIMEOUT_MS", 90000);

// The ceiling for one prose call: the language ceiling when the model is
// asked to write in a reader's language, the standard ceiling otherwise.
// Exported so the pin test can hold the pair without racing a real timer.
function aiCeilingMs(writeInLanguage) {
  return writeInLanguage ? AI_LANGUAGE_TIMEOUT_MS : AI_TIMEOUT_MS;
}
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
// THE MEASUREMENT-ONLY LANGUAGE OVERRIDE.
//
// WHAT IT IS FOR, and it is a narrow thing. The language gate below means there
// is no way to obtain a single sentence of model output in any language but
// English, which makes it impossible to measure what a translated reader would
// receive, or to test a guard written for their language against real output.
// That is the prerequisite for every remaining piece of the multilingual guard
// work, and it is the only piece that needs no new corpus.
//
// IT IS NOT THE GATE. The gate below is untouched: a request that reaches this
// function through the route still returns "non_english_language" for every
// language but English, because the route does not pass measurementLanguage and
// physically cannot. simplifyRoute.js calls this with exactly
// { rulesRun, extractedText, language }, and tests/measurementLanguageGate.test.js
// reads the source to hold that.
//
// FOUR LOCKS, and all four must be open:
//
//   1. the caller passes measurementLanguage explicitly. No request field maps
//      to it, so only in-process code can.
//   2. NODE_ENV is not "production".
//   3. CLEARSTEPS_MEASUREMENT_LANGUAGE is set to "1" in the environment.
//   4. server.js refuses to START if 2 and 3 disagree, so a production deploy
//      carrying the flag hard-fails at boot rather than serving with it on.
//      That mirrors CLEARSTEPS_ENABLE_FILE_RETENTION, which is the existing
//      precedent for a local-debugging escape hatch that must never ship.
//
// AND IT PERSISTS NOTHING. Everything on this path is in-memory: the callers are
// scripts that hold the result and print it. The route is the only thing that
// writes a document_session, and the route cannot reach this.
// Named rather than coded, because "write in pa" is not an instruction a model
// follows reliably and "write in Panjabi, in Gurmukhi script" is.
const LANGUAGE_NAMES = {
  pl: "Polish", ro: "Romanian", es: "Spanish", fr: "French", pt: "European Portuguese",
  hi: "Hindi", bn: "Bengali", gu: "Gujarati", pa: "Panjabi (Gurmukhi script)"
};

function measurementLanguage(requested) {
  if (!requested || requested === "en") return null;
  if (process.env.NODE_ENV === "production") return null;
  if (process.env.CLEARSTEPS_MEASUREMENT_LANGUAGE !== "1") return null;
  return String(requested);
}

// THE LAUNCH SWITCH, server side. True only when config.launch.open is
// flipped in the founder-approved launch commit AND the language is one the
// interface actually offers. The same config file drives the client's
// privacy copy swap, so this cannot open before the wording that describes
// it, or after it.
const I18N_CONFIG = require("../../public/i18n/config.js");
const guardVocabularies = require("../utils/guardVocabularies");

function launchedLanguage(language) {
  const open = I18N_CONFIG && I18N_CONFIG.launch && I18N_CONFIG.launch.open;
  if (!Array.isArray(open) || !open.includes(language)) return false;
  return I18N_CONFIG.languages.some(
    (entry) => entry.code === language && entry.enabled === true);
}

// THE TRANSLATE-AFTER-ENGLISH ARCHITECTURE, approved by the founder on
// 6 August 2026 after reading Gujarati and Hindi side-by-side samples.
// True when the reader's language is launched AND config.launch says the
// prose architecture is "translate": generation happens in English, the
// full English guard stack runs on it exactly as for an English reader,
// then one further call translates the guarded cards and the reader's
// guard vocabulary runs on the translation. Read live from the same config
// file as the gates, so the founder's flip commit changes reader behaviour
// and nothing else. Uniform for Latin and Indic scripts by construction:
// nothing here reads the script.
function translationArchitecture(language) {
  if (!launchedLanguage(language)) return false;
  return Boolean(I18N_CONFIG && I18N_CONFIG.launch &&
    I18N_CONFIG.launch.proseArchitecture === "translate");
}

function providerSkipReason({ rulesRun, language, measurementLanguage: requested }) {
  const trust = rulesRun.api_output.trust || {};

  // AI phrasing is English only until THE LAUNCH SWITCH opens: one flag in
  // public/i18n/config.js, flipped in one founder-approved commit, which
  // simultaneously swaps the client's privacy wording (i18n.js reads the
  // same file), so gates and copy cannot ship apart. Until then non-English
  // interface languages serve the deterministic rules cards, which the
  // frontend translates through the reviewed template bank.
  //
  // The launch switch and the measurement override skip ONLY this branch.
  // Every gate below it, low-quality input, suspected scam and the lure
  // shape, still applies unchanged, because those decisions have nothing to
  // do with which language the answer is written in.
  if (language && language !== "en" &&
      !launchedLanguage(language) && !measurementLanguage(requested)) {
    return "non_english_language";
  }

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

  // THE LURE SHAPE IS ADVISORY FOR SEVERITY AND TRUST. IT IS DECISIVE HERE.
  //
  // Measured on the restored prose path, 2 August 2026. Two corpus lures carry
  // no English scam phrase, so the engine leaves scam_signals empty and
  // processing_mode "caution", and every branch above correctly returns null.
  // The model was then asked to rewrite them, and it did:
  //
  //   scam_council_refund_link_only
  //     floor, card 3   "No action needed right now."
  //     prose, card 3   "Complete the online form to claim your council tax
  //                      refund."
  //
  // That is Northcue, in its own voice, telling a reader to complete a phishing
  // form on a lookalike domain. The engine refused to act and the model
  // instructed. smish_parcel_link_only is the same shape softer: it restates
  // the lure's own 48-hour deadline as fact.
  //
  // NO OUTPUT GUARD CATCHES THIS. stripAiViolations covers pay and credential
  // commands; "complete the online form" is neither. UNSAFE_ADVICE_PATTERNS
  // needs "you must / should / need to" and this is a bare imperative. The
  // guards are not weakened to fix it and they are not enough to fix it.
  //
  // WHY THE GATE AND NOT THE GUARD. The lure rule stays advisory everywhere it
  // can only withhold a clean bill of health, which is what src/utils/
  // lureShape.js argues for at length: seven of sixty documents, and a margin
  // over the genuine invoice that is one working regex wide. Asking the model
  // is a different question from judging the reader's document. Declining to
  // ask costs a lure its phrasing and costs a false positive nothing but the
  // engine's own cards, which is the output it would have received before the
  // phrasing pass came back.
  const lureSignals = Array.isArray(trust.lure_shape_signals) ? trust.lure_shape_signals : [];
  if (lureSignals.length > 0) return "lure_shape";

  // Unsupported or probable non-document. The engine already emits a calm,
  // honest "this is not an official letter" message.
  if (trust.processing_mode === "unsupported" || trust.is_probable_non_document) return "unsupported_or_non_document";

  if (!process.env.OPENAI_API_KEY) return "missing_api_key";

  return null;
}

// measurementLanguage is NOT part of the request path. simplifyRoute.js passes
// exactly { rulesRun, extractedText, language }; this fourth option exists so a
// measurement script can ask for output in another language behind the four
// locks described on measurementLanguage() above.
async function applySafetyPassAndRecordAiStatus({
  rulesRun, extractedText, language, measurementLanguage: requestedLanguage
}) {
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
  const skipReason = providerSkipReason({ rulesRun, language, measurementLanguage: requestedLanguage });
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

  // Under the translate architecture a launched reader's cards are GENERATED
  // IN ENGLISH and translated after the English guard stack has run, so
  // writeInLanguage stays null for them. The measurement override keeps its
  // direct write-in behaviour: it exists to probe raw model output per
  // language and is not a reader path.
  const translateTo = !measurementLanguage(requestedLanguage) &&
    translationArchitecture(language) ? language : null;

  try {
    const candidate = await requestStructuredResultFromOpenAi({
      extractedText,
      fallbackStructuredResult,
      model,
      inputQuality,
      garbledByOcr,
      // The reader's language when their gate is open, exactly as the
      // measurement override always did it, because that is the mechanism
      // every vocabulary was measured against. Found by the wave-one live
      // confirmation: the gate opened but nothing asked the model to WRITE
      // in Gujarati, so a launched reader got English prose their bank
      // cannot translate. Null under the translate architecture: the
      // reader's language is applied by the translation stage below.
      writeInLanguage: measurementLanguage(requestedLanguage) ||
        (translateTo ? null : (launchedLanguage(language) ? language : null))
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
    // language, not the measurement override: with launch.open false the
    // vocabularies resolve for nobody, so measurement output stays raw and
    // today's behaviour is byte-identical. When launched, the reader's
    // language selects the verified vocabulary.
    // Under the translate architecture the source is English, so the strip
    // runs exactly as it does for an English reader; the reader's verified
    // vocabulary runs on the translation in the stage below instead.
    const stripped = stripAiViolations(sanitized, rulesSentenceSet(fallbackStructuredResult), translateTo ? "en" : language);
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

    // THE TRANSLATION STAGE, translate-after-English architecture only.
    // The guarded, validated ENGLISH cards go out; the same cards in the
    // reader's language come back, the shape contract is checked, and the
    // reader's verified guard vocabulary runs on what came back. Skipped
    // when the sanitiser rejected: the engine's own result is what is about
    // to be served and the rejected branch below returns the rules run.
    //
    // ANY failure in this stage falls back to the bank cards: the metadata
    // records a translation_* code and the reader gets the deterministic
    // rules cards their template bank translates, never a lost session and
    // never English prose their bank cannot handle.
    let served = stripped;
    if (translateTo && !sanitizeVerdict.rejected) {
      try {
        const translated = await requestTranslatedResultFromOpenAi({
          structuredResult: stripped,
          language: translateTo,
          model
        });
        const shapeErrors = translationShapeErrors(translated, stripped);
        if (shapeErrors.length) {
          const invalid = new Error("translation_invalid");
          invalid.code = "translation_invalid";
          invalid.shapeErrors = shapeErrors;
          throw invalid;
        }
        served = stripAiViolations(translated, rulesSentenceSet(fallbackStructuredResult), translateTo);
      } catch (error) {
        const translationErrorCode = normalizeTranslationErrorCode(error);
        attachAiMetadata(output, {
          ai_used: false,
          ai_status: "fallback",
          ai_provider: "openai",
          ai_model: model,
          ai_duration_ms: Date.now() - startedAt,
          ai_error_code: translationErrorCode,
          validation_errors: Array.isArray(error.shapeErrors)
            ? summarizeValidationErrors(error.shapeErrors)
            : undefined
        });
        logAiDebug("translation_failed", {
          ai_status: "fallback",
          ai_error_code: translationErrorCode,
          ai_model: model,
          ai_duration_ms: output.debug.ai.ai_duration_ms,
          http_status: error.httpStatus || null
        });
        return rulesRun;
      }
    }

    output.structured_result = served;
    output.display_text = served.cards.map((card) => `${card.title} ${card.simple_explanation}`).join("\n");
    output.tts_script = served.cards.map((card) => card.read_aloud_text).join("\n");
    rulesRun.structured_output.structured_result = served;
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
      ai_error_code: null,
      // REPAIRS LOG THE SAME WAY REJECTIONS DO. A completed result that had an
      // invented-date sentence repaired out records what was repaired, so the
      // session column shows WHICH DATE SHAPE failed to canonicalise and the
      // remaining gap names itself on the next real upload instead of costing
      // another diagnosis round. Values are redacted to shapes before storage
      // by cleanValidationErrors, exactly as rejection messages are.
      validation_errors: Array.isArray(sanitizeVerdict.repairs) && sanitizeVerdict.repairs.length
        ? sanitizeVerdict.repairs
        : undefined
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

async function requestStructuredResultFromOpenAi({ extractedText, fallbackStructuredResult, model, inputQuality, garbledByOcr, writeInLanguage }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), aiCeilingMs(writeInLanguage));

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
            content: buildSystemPrompt(writeInLanguage)
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

// The translation step's own ceiling. Provisional at the English ceiling's
// value while the pipeline lands; step 4 of the founder's build order sets
// the default from measured evidence and records the maths.
const AI_TRANSLATION_TIMEOUT_MS = positiveNumberSetting("CLEARSTEPS_AI_TRANSLATION_TIMEOUT_MS", 40000);

// The second call of the translate-after-English architecture: the guarded
// English structured_result in, the same JSON in the reader's language out.
// Same model, same determinism lever (temperature 0), same privacy posture
// (store: false); the input is the guarded CARDS, which is strictly less
// than the first call already sent. Every failure is thrown with a
// translation_* code and the caller falls back to the bank cards, so a
// translation death can never cost the session.
async function requestTranslatedResultFromOpenAi({ structuredResult, language, model }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TRANSLATION_TIMEOUT_MS);

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
          { role: "system", content: buildTranslationSystemPrompt(language) },
          { role: "user", content: JSON.stringify(structuredResult) }
        ],
        temperature: 0,
        max_output_tokens: 2600,
        store: false
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const error = new Error(`translation_http_${response.status}`);
      error.code = `translation_http_${response.status}`;
      error.httpStatus = response.status;
      throw error;
    }

    const data = await response.json();
    console.log(`[northcue-ai] translation model=${data.model || "unknown"} id=${data.id || "unknown"}`);
    const text = extractResponseText(data);
    if (!text) {
      const error = new Error("empty_translation");
      error.code = "empty_translation";
      throw error;
    }

    return parseJsonObject(text);
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("translation_timeout");
      timeoutError.code = "translation_timeout";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildTranslationSystemPrompt(language) {
  return [
    "You translate Northcue cue cards for a reader.",
    `Translate every string value in the JSON into ${LANGUAGE_NAMES[language] || language}, in that language's own script.`,
    "Keep amounts, dates, reference numbers and phone numbers exactly as they appear, unchanged and untranslated, in the same Western digits.",
    "Keep the JSON shape, every field name, the card order and every card_id value exactly the same.",
    "Do not add, remove, merge or reorder cards or key points.",
    "Plain language, calm wording, short lines.",
    "Return strict JSON only. No Markdown. No commentary."
  ].join("\n");
}

// The structural contract a translation must keep before it may be served:
// the same cards, in the same order, with the same card_id values, none of
// the reader-facing strings emptied, and no key point added or removed.
// Messages are digit-free by construction because they can reach the
// session's validation_errors column.
function translationShapeErrors(translated, source) {
  const errors = [];
  if (!translated || typeof translated !== "object" || !Array.isArray(translated.cards)) {
    return ["translation is not a structured result"];
  }
  if (translated.cards.length !== source.cards.length) {
    errors.push("translation changed the number of cards");
    return errors;
  }
  source.cards.forEach((sourceCard, index) => {
    const card = translated.cards[index];
    if (!card || card.card_id !== sourceCard.card_id) {
      errors.push("translation changed the card order or a card_id");
      return;
    }
    ["title", "simple_explanation", "read_aloud_text"].forEach((field) => {
      if (typeof sourceCard[field] === "string" && sourceCard[field].trim() &&
          !(typeof card[field] === "string" && card[field].trim())) {
        errors.push("translation emptied a card " + field.replace(/_/g, " "));
      }
    });
    const sourcePoints = Array.isArray(sourceCard.key_points) ? sourceCard.key_points : [];
    const translatedPoints = Array.isArray(card.key_points) ? card.key_points : [];
    if (sourcePoints.length !== translatedPoints.length) {
      errors.push("translation added or removed a key point");
    }
  });
  return errors;
}

function normalizeTranslationErrorCode(error) {
  if (!error) return "translation_failed";
  if (error.name === "AbortError") return "translation_timeout";
  return cleanAiErrorCode(error.code || error.message || "translation_failed");
}

function buildSystemPrompt(writeInLanguage) {
  return [
    "You are the backend structured-output layer for Northcue.",
    "Return strict JSON only. No Markdown. No commentary.",
    // MEASUREMENT ONLY. Without this the model answers in English whatever
    // language it is asked for, because the line below tells it to, and the
    // measurement would show nothing. It is reached only behind the four locks
    // on measurementLanguage(), and is null on every production path.
    writeInLanguage
      ? `Write every string value in ${LANGUAGE_NAMES[writeInLanguage] || writeInLanguage}, in that language's own script. Keep amounts, dates, reference numbers and phone numbers exactly as they appear in the document, unchanged and untranslated. Plain language, calm wording, short lines.`
      : "Use UK English, plain language, calm wording, and short lines.",
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
// ascii-boundary-ok: this reads AI OUTPUT, and the AI pass is English only. A
// non-English interface language skips it entirely with no network egress, so
// there is no path by which a non-ASCII sentence reaches these patterns.
// tests/aiLanguageGate.test.js is what holds that. If the AI layer is ever
// opened to another language, this list and both patterns below have to be
// rewritten as Unicode-bounded BEFORE that happens, not after.
const _AI_SENSITIVE_TERM = "(?:account\\s+details?|account\\s+information|bank\\s+(?:account|details?)|banking\\s+details?|card\\s+(?:details?|number)|national\\s+insurance(?:\\s+number)?|\\bni\\s+number\\b|sort\\s+code|pass(?:word|code)|\\bpin\\b|security\\s+(?:details?|code)|personal\\s+details?|your\\s+details?)";
// The imperative verbs, shared by the sentence-initial pattern and the
// position-free one below it, so the two cannot drift apart.
const _AI_CREDENTIAL_VERB =
  "(?:confirm|enter|provide|share|give|send|submit|supply|update|re-?enter|input)";

// THE NEGATION EXCEPTION, and it is the mirror of the command family's
// attribution exception. "Do not share your password, PIN, or full card number
// with anyone." is the exact INVERSE of a credential ask, and it is a sentence a
// bank actually prints. Measured: without this, the position-free pattern
// stripped genuine anti-fraud advice on genuine_bank_fraud_advice, and it
// stripped this guard's own replacement sentence, which would have been a loop.
//
// The window excludes commas on purpose. At [^.!?]{0,32} it also swallowed
// "If you have not done so, share your bank details with them.", where the "not"
// belongs to "have not done so" and not to "share". Barring the comma fixed
// that without losing any of the negated cases.
const _AI_CREDENTIAL_NOT_NEGATED =
  // ascii-boundary-ok: English-only AI output, per the note on _AI_SENSITIVE_TERM.
  "(?<!\\b(?:do not|dont|don’t|never|not|avoid|warns you not to)\\b[^.!?,]{0,24})";

const _AI_DETAIL_PATTERNS = [
  // Imperative instruction at the start of the sentence + a sensitive term anywhere in it.
  // ascii-boundary-ok: English-only AI output, per the note on _AI_SENSITIVE_TERM.
  new RegExp("^(?:please\\s+)?(?:confirm|enter|provide|share|give|send|submit|supply|update|re-?enter|input)\\b[^.!?]*\\b" + _AI_SENSITIVE_TERM, "i"),
  // "you (will/may/would/must) need your ... <sensitive term>".
  // ascii-boundary-ok: English-only AI output, per the note on _AI_SENSITIVE_TERM.
  new RegExp("\\byou\\s+(?:will\\s+|may\\s+|would\\s+|must\\s+)?need\\s+your\\b[^.!?]*\\b" + _AI_SENSITIVE_TERM, "i"),
  // Bare "confirm your account / identity / card / bank / payment" phishing imperative.
  /^(?:please\s+)?confirm\s+your\s+(?:account|identity|card|bank|payment)\b/i,

  // POSITION-FREE, added 3 August 2026. The three patterns above anchor on
  // where the verb SITS: two at the start of the sentence, one on the fixed
  // English frame "you need your". Measured, that costs five of twelve
  // credential asks a model can plausibly write, because an English sentence
  // puts the imperative second whenever anything precedes it:
  //
  //     "To continue, please confirm your account details."
  //     "Before 5 June, enter your sort code on the portal."
  //     "The website asks you to provide your card details."
  //     "Your account details must be confirmed within 7 days."
  //     "If you have not done so, share your bank details with them."
  //
  // THIS ONE ANCHORS ON THE SENSITIVE TERM AND ASKS WHETHER AN IMPERATIVE
  // GOVERNS IT, wherever in the clause it happens to be. That is what makes it
  // the design that can survive nine more languages: Polish carries the
  // imperative in one fixed word with the verb second, and Hindi, Bengali,
  // Gujarati and Panjabi put the verb last. A sentence-initial anchor cannot
  // be translated, only replaced.
  //
  // "your|the" IS LOAD BEARING. Without it, "The council will send your details
  // to the tribunal." fires, and a third party moving a file between offices is
  // not a credential ask. It was measured firing on that sentence before the
  // constraint was added.
  //
  // ascii-boundary-ok: English-only AI output, per the note on _AI_SENSITIVE_TERM.
  new RegExp(_AI_CREDENTIAL_NOT_NEGATED + "(?:" +
    _AI_CREDENTIAL_VERB + "\\s+(?:\\w+\\s+){0,3}?(?:your|the)\\s+[^.!?]{0,40}?" + _AI_SENSITIVE_TERM +
    // ascii-boundary-ok: English-only AI output, per the note on _AI_SENSITIVE_TERM.
    "|" + _AI_SENSITIVE_TERM + "[^.!?]{0,40}?\\b(?:must|should|need\\s+to|have\\s+to)\\s+be\\s+" +
    // ascii-boundary-ok: English-only AI output, per the note on _AI_SENSITIVE_TERM.
    _AI_CREDENTIAL_VERB + "(?:e?d)\\b" +
    ")", "i")
];

// THE COMMAND FAMILY. Moved here from UNSAFE_ADVICE_PATTERNS in
// validateStructuredResult.js on 3 August 2026. Same pattern, same attribution
// exception, same provenance exemption. Only the consequence changed: there it
// rejected the whole result and a reader lost all six cards over one sentence,
// here the sentence is replaced and the other five cards survive.
//
// An obligation addressed to the reader in Northcue's own voice rather than
// attributed to the document. Added after a live capture on 1 August 2026, when
// the AI wrote "You must pay £726.00 by 30 September 2026 to avoid further
// action." on a court fine. The flat phrases all missed it: "you should pay",
// "pay now" and "make a payment" do not match "you must pay".
//
// ATTRIBUTION IS THE EXCEPTION, and it has to be, because attributing is what
// the prompt asks for and what the engine itself does. "The document says you
// must contact them by 3 September 2026." is a report; "You must clear £2,480.00
// by 12 September 2026." is a command. The lookbehind allows says, stating,
// states, said and according to within twenty-four characters.
//
// ascii-boundary-ok: reads AI output, and the AI pass is English only. See the
// note on _AI_SENSITIVE_TERM below, which applies here in full.
// THE SUBORDINATE-CLAUSE EXCEPTION, added 4 August 2026, and it is an ENGLISH
// defect found in translation rather than a translation defect.
//
// Building the Spanish, French and Portuguese vocabularies produced four
// over-fires on those reviewed banks, and all four were the same shape:
//
//     es  "Menciona un formulario que hay que rellenar."
//     fr  "... si vous devez répondre ou envoyer quelque chose."
//     pt  "Verifique no documento original se é necessário responder ou agir."
//
// Each is the translation of an English bank sentence that ALREADY over-fires
// here: "Check the original document, or with the sender, whether you need to
// respond or send anything." An obligation inside a whether clause REPORTS an
// obligation; it does not issue one, which is the same distinction attribution
// draws. Fixing it in English means every language inherits it instead of each
// one rediscovering it.
//
// IN PRODUCTION TODAY THIS CHANGES NOTHING VISIBLE, because that sentence is
// engine-written and the provenance exemption already spares it. It matters
// because THE PROVENANCE EXEMPTION DOES NOT SURVIVE TRANSLATION: the exemption
// set is built from the English engine output, so a model's Spanish rendering
// of an engine sentence is byte-identical to nothing in it and is not spared.
//
// "and" and "or" are deliberately NOT subordinators here: "Contact us and you
// must pay by Friday" is still a command.
//
// The window bars the comma for the reason the credential negation does. At
// [^.!?]{0,24} it also swallowed "Whether or not you agree, you must pay by
// 30 September 2026.", where the whether governs the concession and not the
// command. Found by an adversarial case, not by the corpus.
const _AI_COMMAND_RE = /(?<!\b(?:says|stating|states|said|according to)\b[^.!?]{0,24})(?<!\b(?:whether|if)\b[^.!?,]{0,24})\byou\s+(?:must|should|need\s+to|have\s+to|are\s+required\s+to|are\s+obliged\s+to)\s+(?:pay|contact|clear|call|ring|phone|reply|respond|send|provide|confirm|settle|attend|complete|return|submit|act|vacate|remove|arrange|apply)\b/i;

// Already a bank sentence in all ten languages, so this move adds no new string
// and no NATIVE_REVIEW entry. It reports rather than instructs, which is the
// whole substitution being made.
const _AI_COMMAND_REPLACEMENT =
  "Check the original document to see whether a response or action is needed.";

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
//
// language is optional and matters only when the LAUNCH SWITCH is open: a
// launched language resolves its verified guard vocabulary and the stripper
// applies it beside the English rules. Callers that omit it, including the
// English benchmark and the rules-floor pass, get English behaviour
// unchanged, and with launch.open false the vocabularies resolve for
// nobody, so nothing observable changes before launch.
function stripAiViolations(result, exemptSentences, language) {
  if (!result || !Array.isArray(result.cards)) return result;
  const vocab = launchedLanguage(language)
    ? {
      obligation: guardVocabularies.obligationPatternFor(language),
      credential: guardVocabularies.credentialPatternFor(language)
    }
    : null;
  const out = JSON.parse(JSON.stringify(result));
  for (const card of out.cards) {
    for (const field of ["simple_explanation", "action_needed", "read_aloud_text"]) {
      if (typeof card[field] === "string") card[field] = sanitizeAiTextField(card[field], exemptSentences, vocab);
    }
    if (Array.isArray(card.key_points)) {
      card.key_points = card.key_points.map(s => typeof s === "string" ? sanitizeAiTextField(s, exemptSentences, vocab) : s);
    }
  }
  return out;
}

// The splitter the stripper works in. Shared with rulesSentenceSet so the
// exemption is built in exactly the units it will be compared in. The danda
// joined on 6 August 2026 with the guard wiring: Hindi, Bengali and Panjabi
// end sentences with it, and without it a multi-sentence Indic field is one
// unit, so a single command would cost the whole field. English text never
// contains it, so English tokenisation is byte-identical.
const _AI_SENTENCE_SPLIT = /(?<=[.!?।])\s+/;

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
function sanitizeAiTextField(text, exemptSentences, vocab) {
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
      // THE WIRED GUARD VOCABULARIES, launched languages only. Same
      // replacements as the English rules they mirror, and both are bank
      // sentences in all ten languages, so the client renders them in the
      // reader's language. The credential rule sits with its English
      // sibling above in spirit: a credential ask is dangerous with or
      // without an auxiliary, so it is not exemption-gated either.
      if (vocab && vocab.credential && vocab.credential.test(trimmed)) {
        return "Check the original document. Do not share personal or banking details.";
      }
      if (vocab && vocab.obligation && vocab.obligation.test(trimmed)) {
        return _AI_COMMAND_REPLACEMENT;
      }
      // Short-circuits rule 3 below AND the in-place rule 5 in the fallthrough,
      // which is why it is read once here rather than tested twice.
      const keepNumbers = exempt.has(trimmed);
      if (!keepNumbers && _AI_PHONE_RE.test(trimmed) && _AI_CALL_CONTEXT_RE.test(trimmed)) {
        return "Use contact details from the original document.";
      }
      // EXEMPT-CHECKED, which is what makes this identical in effect to the
      // validator rule it replaces. There, a string byte-identical to the
      // engine's own output at the same path was skipped; here, a sentence
      // byte-identical to an engine sentence is exempt. So the engine quoting a
      // letter ("You must contact us on 0333 320 122 by 3 September 2026.")
      // still passes, and a model-authored command still does not.
      //
      // LAST OF THE FOUR REPLACING RULES, on purpose. Every rule above is more
      // specific about what the sentence was trying to do, and each has a
      // better replacement for it: a command to pay gets the payment line, a
      // command to ring a number gets the contact line. This one only handles a
      // command those three do not already describe, which keeps the move to
      // the stripper from changing any sentence that was already being handled.
      if (!keepNumbers && _AI_COMMAND_RE.test(trimmed)) return _AI_COMMAND_REPLACEMENT;
      const withoutOrgNames = trimmed.replace(_AI_DEBT_ORG_RE, "a trusted advice service");
      return keepNumbers
        ? withoutOrgNames
        : withoutOrgNames.replace(_AI_PHONE_G_RE, "the number in the original document");
    })
    .join(" ");
}

module.exports = {
  applySafetyPassAndRecordAiStatus,
  requestStructuredResultFromOpenAi,
  requestTranslatedResultFromOpenAi,
  translationArchitecture,
  translationShapeErrors,
  AI_TRANSLATION_TIMEOUT_MS,
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
  AI_LANGUAGE_TIMEOUT_MS,
  aiCeilingMs,
  AI_OUTBOUND_TEXT_MAX_CHARS,
  DEFAULT_MODEL
};
