const ALLOWED_DOCUMENT_TYPES = new Set([
  "council_tax_notice",
  "energy_bill",
  "bill_or_payment_notice",
  "appointment_letter",
  "unknown",
  "unsupported"
]);

const ALLOWED_CONFIDENCE = new Set(["high", "medium", "low", "unknown"]);
const ALLOWED_RISK_LEVELS = new Set(["low", "medium", "high", "unknown"]);
const ALLOWED_PROCESSING_MODES = new Set(["normal", "caution", "failed"]);
const ALLOWED_STATUSES = new Set(["normal", "caution", "urgent", "good"]);
const ALLOWED_CARD_TYPES = new Set([
  "what_is_this",
  "who_sent_it",
  "what_matters_most",
  "what_do_i_need_to_do",
  "when_does_it_matter",
  "what_should_i_check",
  "what_if_i_feel_stuck"
]);

const REQUIRED_CARD_IDS = [
  "what_is_this",
  "what_matters_most",
  "what_do_i_need_to_do",
  "when_is_it_due",
  "what_could_happen",
  "helpful_note"
];

const UNSAFE_ADVICE_PATTERNS = [
  /\byou should pay\b/i,
  /\bpay now\b/i,
  /\bmake a payment\b/i,
  /\bclick (the|this|any)?\s*link\b/i,
  /\bcall (the|this)?\s*number\b/i,
  /\breply to (the|this)?\s*sender\b/i,
  /\bthis document is genuine\b/i,
  /\bdefinitely genuine\b/i,
  /\bguaranteed safe\b/i,
  // Catches advice to dismiss the document ("just ignore it", "you can ignore it"),
  // but NOT the conditional "...if I/you ignore it" used by the adaptive Card 5
  // title "What could happen if I ignore it?" — that warns against ignoring, the
  // opposite of unsafe advice.
  /(?<!if i )(?<!if you )\bignore it\b/i,

  // THE COMMAND FAMILY. An obligation addressed to the reader, in Northcue's own
  // voice rather than attributed to the document.
  //
  // Added after a live capture on 1 August 2026, when the AI wrote "You must pay
  // £726.00 by 30 September 2026 to avoid further action." on a court fine.
  // Nothing above matched it: "you should pay", "pay now" and "make a payment"
  // all miss "you must pay". Only the stripper's own pay patterns caught it, and
  // the stripper is a different layer with different scope. One wall is not a
  // defence.
  //
  // The engine says these things too, quoted from the document ("You must
  // contact us on 0333 320 122 by 3 September 2026."), and those are exempt
  // because validateNoUnsafeAdvice skips a string byte-identical to the
  // fallback at the same path. So this pattern and the provenance rule only
  // work together: without provenance it would reject every enforcement letter,
  // and without the pattern the AI may command whatever it likes.
  //
  // ATTRIBUTION IS THE EXCEPTION, and it has to be, because attributing is
  // exactly what the prompt asks for and what the engine itself does. "The
  // document says you must contact them by 3 September 2026." is a report;
  // "You must clear £2,480.00 by 12 September 2026." is a command. The first
  // version of this pattern rejected both, which would have rejected a model
  // doing the right thing. The lookbehind allows says/states/said/according to
  // within twenty-four characters, so "the notice states that you must ..."
  // passes and a bare imperative does not.
  /(?<!\b(?:says|stating|states|said|according to)\b[^.!?]{0,24})\byou\s+(?:must|should|need\s+to|have\s+to|are\s+required\s+to|are\s+obliged\s+to)\s+(?:pay|contact|clear|call|ring|phone|reply|respond|send|provide|confirm|settle|attend|complete|return|submit|act|vacate|remove|arrange|apply)\b/i,

  // A postal address the reader lives at. The AI put "Property involved:
  // 22 Alder House, Feltham." on card one of a possession notice; the engine
  // never surfaces an address on any card. This is the minimum durable form of
  // "do not introduce document text the engine did not surface": the general
  // rule is not expressible as a pattern, but this shape is, and it is the one
  // that carries the reader's home into the output.
  /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/,
  /\b\d+[A-Za-z]?\s+(?:[A-Z][A-Za-z]*\s+){0,3}(?:Road|Street|Lane|Avenue|Close|Drive|Court|House|Way|Place|Gardens|Terrace|Crescent|Grove|Hill|Park|Square)\b/
];

// Facts the ENGINE owns. The AI may rephrase around them; it may not author one.
//
// Added after the same capture, when the AI wrote possible_deadline
// "2026-07-25" on a solicitor's letter whose engine value was null. It had
// added fourteen days to the letter date, which is exactly the arithmetic the
// deadline work refuses to do, because "within 14 days" is anchored to service
// rather than to the letter date. It also wrote an ISO string into main_date, a
// field meant to quote the paper.
//
// All four are now FORCED from the fallback in the sanitiser, so this check can
// only fail if that forcing is removed. It is kept deliberately as a tripwire on
// the mechanism rather than on the model: edit sanitizeCards to take the
// candidate's value again and every AI result starts failing here, loudly,
// instead of a wrong figure reaching a card quietly.
//
// Forcing rather than rejecting, because the alternative was rejection on every
// document. The model filled these on cards the engine had deliberately left
// null, mostly with correct values, and throwing away an entire result over
// redundant metadata would make the AI pass pointless. What forcing does NOT
// fix is an invented value in the PROSE, and that is what
// validateDatesComeFromTheEngine below is for.
const ENGINE_OWNED_FACTS = [
  ["summary.main_date", (result) => result.summary && result.summary.main_date],
  ["summary.main_amount", (result) => result.summary && result.summary.main_amount]
];

// A date the AI states that the engine never stated.
//
// Forcing possible_deadline did not stop "Payment is due by 25 July 2026."
// appearing in a card's own sentence, computed by adding fourteen days to a
// letter date on a document whose engine deadline is null. The engine is the
// only layer allowed to decide what date a letter states: it has the
// co-location rules, the backward-looking guard, the relative-period gate and
// the one-reading test behind it. So any date shape in AI text must already
// appear somewhere in the engine's own output for the same document.
//
// This also catches a reformatting the model is fond of: "2026-09-03" where the
// engine wrote "3 September 2026". That string is not in the fallback, so it is
// rejected, which is correct twice over, because these fields quote the paper.
const DATE_SHAPES = [
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
  /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{2,4}\b/gi,
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{2,4}\b/gi
];

function datesIn(text) {
  const found = new Set();
  DATE_SHAPES.forEach((pattern) => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) found.add(match[0].toLowerCase());
  });
  return found;
}

// THE PAGE IS THE GROUND TRUTH, not the engine's cards.
//
// The first version compared against the fallback alone and rejected five of
// six documents for citing dates that are printed on the letter but that the
// engine does not surface: a notice date, a letter date, a payment-received
// date. Those are legitimate citations, and rejecting them would have made the
// AI pass useless while catching nothing real.
//
// So the allowed set is the document text plus the engine's own output, the
// second because deadline_iso is an ISO string that appears nowhere on paper.
// What that leaves rejected is the case this exists for: a date on neither, ie.
// one the model calculated. "Payment is due by 25 July 2026." on a letter that
// says only "within 14 days" is precisely that.
//
// sourceText is optional and, when absent, the rule falls back to the engine
// output alone. That is stricter rather than looser, so a caller that forgets
// it fails closed.
function validateDatesComeFromTheEngine(candidate, fallback, errors, sourceText) {
  if (!fallback) return;
  const allowed = datesIn(JSON.stringify(fallback));
  if (typeof sourceText === "string") datesIn(sourceText).forEach((date) => allowed.add(date));

  const seen = new Set();
  datesIn(JSON.stringify(candidate)).forEach((date) => {
    if (!allowed.has(date) && !seen.has(date)) {
      seen.add(date);
      errors.push(`date ${date} appears in neither the document nor the engine output`);
    }
  });
}

function validateEngineOwnedFacts(candidate, fallback, errors) {
  if (!fallback) return;

  ENGINE_OWNED_FACTS.forEach(([label, read]) => {
    const mine = read(candidate);
    const theirs = read(fallback);
    if ((mine ?? null) !== (theirs ?? null)) {
      errors.push(`${label} must match the engine value`);
    }
  });

  const candidateCards = Array.isArray(candidate.cards) ? candidate.cards : [];
  const fallbackCards = Array.isArray(fallback.cards) ? fallback.cards : [];
  candidateCards.forEach((card, index) => {
    const source = fallbackCards[index];
    if (!source) return;
    ["possible_deadline", "possible_payment"].forEach((field) => {
      if ((card[field] ?? null) !== (source[field] ?? null)) {
        errors.push(`cards[${index}].${field} must match the engine value`);
      }
    });
  });
}

function validateStructuredResult(candidate, fallback, sourceText) {
  const errors = [];

  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return { valid: false, errors: ["structured_result must be an object"] };
  }

  if (candidate.schema_version !== "clearsteps_structured_v1") {
    errors.push("schema_version must be clearsteps_structured_v1");
  }

  if (!isNonEmptyString(candidate.session_id)) errors.push("session_id is required");
  if (!ALLOWED_DOCUMENT_TYPES.has(candidate.document_type)) errors.push("document_type is not allowed");
  if (!isNonEmptyString(candidate.document_type_label)) errors.push("document_type_label is required");
  if (!ALLOWED_CONFIDENCE.has(candidate.document_type_confidence)) errors.push("document_type_confidence is not allowed");
  if (!ALLOWED_CONFIDENCE.has(candidate.overall_confidence)) errors.push("overall_confidence is not allowed");
  if (!ALLOWED_RISK_LEVELS.has(candidate.risk_level)) errors.push("risk_level is not allowed");
  if (!ALLOWED_PROCESSING_MODES.has(candidate.processing_mode)) errors.push("processing_mode is not allowed");
  if (typeof candidate.needs_user_check !== "boolean") errors.push("needs_user_check must be boolean");

  validateSummary(candidate.summary, errors);
  validateCards(candidate.cards, errors);
  validateWarnings(candidate.warnings, errors);
  validatePrivacy(candidate.privacy, errors);
  validateNoUnsafeAdvice(candidate, errors, fallback);
  validateEngineOwnedFacts(candidate, fallback, errors);
  validateDatesComeFromTheEngine(candidate, fallback, errors, sourceText);
  validateKeepsSession(candidate, fallback, errors);

  return {
    valid: errors.length === 0,
    errors
  };
}

// THE SANITISER'S VERDICT, not just its output.
//
// This function rebuilds the candidate field by field and then validates its
// OWN result, returning the fallback when that fails. It returned it silently,
// and the caller could not tell the two apart: the engine's own result
// validates clean on the way back out, so applyAiStructuredResult recorded
// ai_status "completed" and ai_used true on a run where nothing the model wrote
// reached the reader.
//
// The reader was safe throughout. The METADATA was not, and it is the field
// every decision about the AI is made from. Measured live on 1 August 2026,
// three of twenty eight eligible corpus documents were discarded here while
// reporting success, and all three were high stakes: two urgent, one high.
//
// The verdict is the only thing added. `result` is byte for byte what this
// function returned before on both paths, INCLUDING the fallback by reference
// on the rejection path, because callers compare it by identity.
function sanitizeStructuredResultWithVerdict(candidate, fallback, sourceText) {
  const output = {
    schema_version: "clearsteps_structured_v1",
    session_id: fallback.session_id,
    anonymous_session_id: fallback.anonymous_session_id,
    document_type: pickAllowed(candidate.document_type, ALLOWED_DOCUMENT_TYPES, fallback.document_type),
    document_type_label: cleanText(candidate.document_type_label || fallback.document_type_label, 80),
    document_type_confidence: pickAllowed(candidate.document_type_confidence, ALLOWED_CONFIDENCE, fallback.document_type_confidence),
    overall_confidence: pickAllowed(candidate.overall_confidence, ALLOWED_CONFIDENCE, fallback.overall_confidence),
    risk_level: pickAllowed(candidate.risk_level, ALLOWED_RISK_LEVELS, fallback.risk_level),
    processing_mode: pickAllowed(candidate.processing_mode, ALLOWED_PROCESSING_MODES, fallback.processing_mode),
    needs_user_check: typeof candidate.needs_user_check === "boolean"
      ? candidate.needs_user_check
      : Boolean(fallback.needs_user_check),
    summary: sanitizeSummary(candidate.summary || {}, fallback.summary || {}),
    cards: sanitizeCards(candidate.cards || [], fallback.cards || []),
    warnings: sanitizeWarnings(candidate.warnings || fallback.warnings || []),
    privacy: {
      original_file_stored: false,
      ocr_text_stored: false,
      document_text_stored: false,
      personal_details_stored: false
    }
  };

  const validation = validateStructuredResult(output, fallback, sourceText);
  if (!validation.valid) {
    return { result: fallback, rejected: true, errors: validation.errors };
  }

  return { result: output, rejected: false, errors: [] };
}

// The original contract, unchanged, for every caller that wants the object and
// not the verdict. One implementation, two readings of it.
function sanitizeStructuredResult(candidate, fallback, sourceText) {
  return sanitizeStructuredResultWithVerdict(candidate, fallback, sourceText).result;
}

function validateSummary(summary, errors) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    errors.push("summary must be an object");
    return;
  }

  // deadline_iso is required, not optional. sanitizeSummary always carries it
  // from the rules output, so its absence means someone removed it there, and
  // a field that quietly becomes undefined reads downstream as "this date may
  // not be reasoned about" rather than as a bug.
  ["one_line_summary", "main_action", "main_date", "deadline_iso", "main_amount"].forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(summary, key)) {
      errors.push(`summary.${key} is required`);
    }
  });
}

function validateCards(cards, errors) {
  if (!Array.isArray(cards) || cards.length !== 6) {
    errors.push("cards must contain exactly six cards");
    return;
  }

  cards.forEach((card, index) => {
    if (!card || typeof card !== "object" || Array.isArray(card)) {
      errors.push(`card ${index + 1} must be an object`);
      return;
    }

    if (card.card_id !== REQUIRED_CARD_IDS[index]) errors.push(`card ${index + 1} has the wrong card_id`);
    if (card.card_number !== index + 1) errors.push(`card ${index + 1} has the wrong card_number`);
    if (!ALLOWED_CARD_TYPES.has(card.card_type)) errors.push(`card ${index + 1} has an invalid card_type`);
    if (!isNonEmptyString(card.title)) errors.push(`card ${index + 1} title is required`);
    if (!isNonEmptyString(card.simple_explanation)) errors.push(`card ${index + 1} simple_explanation is required`);
    if (!Array.isArray(card.key_points)) errors.push(`card ${index + 1} key_points must be an array`);
    if (!Object.prototype.hasOwnProperty.call(card, "action_needed")) errors.push(`card ${index + 1} action_needed is required`);
    if (!Object.prototype.hasOwnProperty.call(card, "possible_deadline")) errors.push(`card ${index + 1} possible_deadline is required`);
    if (!Object.prototype.hasOwnProperty.call(card, "possible_payment")) errors.push(`card ${index + 1} possible_payment is required`);
    if (!ALLOWED_CONFIDENCE.has(card.confidence_level)) errors.push(`card ${index + 1} confidence_level is invalid`);
    if (!Object.prototype.hasOwnProperty.call(card, "warning")) errors.push(`card ${index + 1} warning is required`);
    if (!isNonEmptyString(card.read_aloud_text)) errors.push(`card ${index + 1} read_aloud_text is required`);
    if (!ALLOWED_STATUSES.has(card.status)) errors.push(`card ${index + 1} status is invalid`);
  });
}

function validateWarnings(warnings, errors) {
  if (!Array.isArray(warnings)) errors.push("warnings must be an array");
}

function validatePrivacy(privacy, errors) {
  const expected = {
    original_file_stored: false,
    ocr_text_stored: false,
    document_text_stored: false,
    personal_details_stored: false
  };

  if (!privacy || typeof privacy !== "object" || Array.isArray(privacy)) {
    errors.push("privacy must be an object");
    return;
  }

  Object.entries(expected).forEach(([key, value]) => {
    if (privacy[key] !== value) errors.push(`privacy.${key} must be false`);
  });
}

// Every string in an object, keyed by the exact path it sits at.
function stringsByPath(value, path, out) {
  if (typeof value === "string") {
    out.set(path, value);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => stringsByPath(item, `${path}[${index}]`, out));
    return out;
  }
  if (value && typeof value === "object") {
    Object.keys(value).forEach((key) => stringsByPath(value[key], path ? `${path}.${key}` : key, out));
  }
  return out;
}

// Unsafe advice, scanned by PROVENANCE rather than by field name.
//
// THE DEFECT THIS FIXES. buildStructuredCardWarning attaches "This looks
// important. Do not ignore it." to every card on an urgent document.
// sanitizeCards copies that string into the AI candidate, because the AI is
// never asked for `warning` and the ?? falls back to the engine's own value.
// This function then rejected the candidate for containing "ignore it", so on
// every urgent document the AI result was discarded deterministically. Verified
// across the whole corpus: five documents fail their own validator, all five
// are urgent, every urgent document is one of them, cards[n].warning is the ONLY
// field implicated, and the one offending string is that warning.
//
// Worse than losing the AI: sanitizeStructuredResult validates its own output
// and returns the fallback when invalid, so the AI's content was discarded
// BEFORE it was ever judged. The error reported came from the engine's warning.
// Whether the AI's own output was safe was never established, on precisely the
// documents where it matters most.
//
// THE RULE. A string is skipped only when the fallback holds a byte-identical
// string at the SAME PATH. Those are engine constants that already ship to
// readers on every non-AI path, so scanning them protects nobody. Everything
// else is scanned by every pattern, exactly as before.
//
// BY PATH, NOT BY VALUE. Matching on value alone would let the model move an
// engine string into a field where it means something else. Matching on field
// NAME, the alternative considered and rejected in the plan, hard-codes the
// assumption that `warning` and `warnings` are always engine-owned, and becomes
// a silent hole the moment a prompt starts requesting them. Under this rule a
// model-authored warning differs from the fallback and is scanned, and if a
// future prompt requests `warnings` they are scanned automatically.
//
// With no fallback the map is empty and everything is scanned, which is the
// safe way round for a default.
//
// One narrowing worth naming: the old version stringified the whole object, so
// object KEYS were in scope too. This scans values only. No pattern has ever
// matched a key, and keys are engine-defined structure rather than anything a
// model writes.
function validateNoUnsafeAdvice(candidate, errors, fallback) {
  const engineStrings = fallback ? stringsByPath(fallback, "", new Map()) : new Map();
  const authored = [];
  stringsByPath(candidate, "", new Map()).forEach((value, path) => {
    if (engineStrings.get(path) === value) return;
    authored.push(value);
  });

  // Patterns in declaration order, one error each, so the reported errors are
  // identical in text and order to what this produced before.
  UNSAFE_ADVICE_PATTERNS.forEach((pattern) => {
    if (authored.some((value) => pattern.test(value))) {
      errors.push(`unsafe advice matched ${pattern}`);
    }
  });
}

function validateKeepsSession(candidate, fallback, errors) {
  if (!fallback) return;
  if (candidate.session_id !== fallback.session_id) errors.push("session_id must not change");
  if (candidate.anonymous_session_id !== fallback.anonymous_session_id) {
    errors.push("anonymous_session_id must not change");
  }
}

function sanitizeSummary(candidate, fallback) {
  return {
    one_line_summary: cleanNullableText(candidate.one_line_summary ?? fallback.one_line_summary, 180),
    main_action: cleanNullableText(candidate.main_action ?? fallback.main_action, 180),
    // FROM THE FALLBACK ALWAYS, like deadline_iso beside it. A live capture
    // found the model writing "2026-07-25" here on a letter whose engine value
    // was null, having added fourteen days to the letter date. This field is
    // meant to quote the paper, and the engine is what decides whether the
    // paper states a date at all.
    main_date: cleanNullableText(fallback.main_date, 80),
    // From the fallback ALWAYS, never from the candidate. Two reasons, and both
    // matter.
    //
    // This function rebuilds the summary from a fixed key list, so a field
    // omitted here does not survive the AI pass at all: it would be present on
    // every non-English document, where the language gate skips the provider,
    // and silently absent on English ones. That is the same silent-drop shape
    // jsonFieldParity.test.js guards on the request side.
    //
    // And deadline_iso is a rules-engine judgement about whether a date may be
    // reasoned about, made behind five gates that read trust and extraction
    // state the model never sees. A model cannot re-derive it and must not be
    // able to assert it, so the ?? fallback pattern used above would be wrong
    // here even though it reads consistently.
    deadline_iso: cleanNullableText(fallback.deadline_iso, 10),
    main_amount: cleanNullableText(fallback.main_amount, 80)
  };
}

function sanitizeCards(cards, fallbackCards) {
  return REQUIRED_CARD_IDS.map((cardId, index) => {
    const candidate = cards[index] || {};
    const fallback = fallbackCards[index] || {};
    const keyPoints = Array.isArray(candidate.key_points) ? candidate.key_points : fallback.key_points;
    // Card five's title is the ENGINE's signal for which mode the card is in:
    // "What could happen if I ignore it?" when the document states a
    // consequence, "What should I check?" when it does not. The prompt tells
    // the model to keep that exact title and it changed it anyway, on two of
    // six documents in a live capture, in both cases escalating a check card
    // into a consequence card. Pinned rather than asked for, because a title
    // that says which mode a card is in is not the model's to choose.
    const title = cardId === "what_could_happen"
      ? cleanText(fallback.title, 80)
      : cleanText(candidate.title || fallback.title, 80);
    const simpleExplanation = cleanText(candidate.simple_explanation || fallback.simple_explanation, 220);
    const safeKeyPoints = Array.isArray(keyPoints)
      ? keyPoints.map((point) => cleanText(point, 140)).filter(Boolean).slice(0, 4)
      : [];

    return {
      card_id: cardId,
      card_number: index + 1,
      card_type: pickAllowed(candidate.card_type, ALLOWED_CARD_TYPES, fallback.card_type),
      title,
      simple_explanation: simpleExplanation,
      key_points: safeKeyPoints,
      action_needed: cleanNullableText(candidate.action_needed ?? fallback.action_needed, 180),
      // Engine-owned, for the same reason. The model filled these on cards the
      // engine deliberately left null, and on one enforcement notice it
      // replaced the £1,247.00 owed with the £235.00 fee.
      possible_deadline: cleanNullableText(fallback.possible_deadline, 80),
      possible_payment: cleanNullableText(fallback.possible_payment, 80),
      confidence_level: pickAllowed(candidate.confidence_level, ALLOWED_CONFIDENCE, fallback.confidence_level),
      warning: cleanNullableText(candidate.warning ?? fallback.warning, 180),
      read_aloud_text: cleanText(candidate.read_aloud_text || fallback.read_aloud_text || `${title}. ${simpleExplanation}`, 320),
      status: pickAllowed(candidate.status, ALLOWED_STATUSES, fallback.status)
    };
  });
}

function sanitizeWarnings(warnings) {
  return Array.isArray(warnings)
    ? warnings.map((warning) => cleanText(warning, 180)).filter(Boolean).slice(0, 5)
    : [];
}

function pickAllowed(value, allowedValues, fallback) {
  const cleaned = cleanText(value, 80).toLowerCase();
  if (allowedValues.has(cleaned)) return cleaned;
  return fallback;
}

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanNullableText(value, maxLength) {
  if (value === null || value === undefined || value === "") return null;
  return cleanText(value, maxLength) || null;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

module.exports = {
  validateStructuredResult,
  sanitizeStructuredResult,
  sanitizeStructuredResultWithVerdict,
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_CARD_TYPES
};
