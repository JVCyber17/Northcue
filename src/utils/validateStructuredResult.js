const deadlineIso = require("./deadlineIso");

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

  // THE COMMAND FAMILY LIVED HERE AND HAS MOVED TO THE STRIPPER.
  //
  // It is now _AI_COMMAND_RE in aiStructuredResultService.js, with the same
  // pattern, the same attribution exception and the same provenance exemption.
  // Nothing about what it CATCHES changed. What changed is what happens next.
  //
  // WHY IT MOVED. A pattern in this list rejects the entire result, so a reader
  // loses all six cards over one sentence. Measured across two harness runs, the
  // command family was the single largest cause of that: six documents in one
  // run, three in another, more than every other pattern in this list combined.
  // In the stripper the same sentence is replaced with a reported form and the
  // other five cards survive.
  //
  // AND IT IS THE PATTERN LEAST LIKELY TO SURVIVE TRANSLATION. It assumes
  // pronoun, then modal, then verb, adjacent and in that order. Polish carries
  // the imperative in one fixed word with the verb second; Hindi, Bengali,
  // Gujarati and Panjabi put the verb last with arbitrary material between. When
  // the guards are built for those languages this pattern will over-fire more
  // than any other, and an over-fire on this side of the line costs a reader
  // everything on the screen. Moving it before translating it is the cheap half
  // of that problem, and it is worth doing whether or not the gate ever opens.
  //
  // Recorded rather than deleted, because the reason this is not a weakening is
  // the whole point: a guard that strips is still a guard.

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

// COMPARED AS CALENDAR DAYS WHERE THAT IS POSSIBLE, not as strings.
//
// The literal comparison rejected the model for expanding the document's own
// abbreviation. bill_with_contacts_page prints "Bill date: 22 Apr 2026" and
// "Covering: 22 Jan 2026 to 22 Apr 2026"; the model wrote "22 April 2026" and
// "22 January 2026", which is the same day spelled the way a person reads it.
// The guard called both invented and threw the whole response away, so a reader
// lost all six cards over an abbreviation. Measured on the restored prose path,
// this was the single most common non-guard reason a reader saw the floor.
//
// canonicalNamedDate collapses ONLY the month spelling. An ISO or numeric form
// returns null from it and is still compared literally, so the deliberate
// rejection of "2026-09-03" where the engine wrote "3 September 2026" is
// unchanged: those fields quote the paper, and an ISO string is not what the
// paper says.
//
// Both sides go through the same function, which is the whole point. Doing it
// to one side would move the mismatch rather than remove it.
function canonicalise(raw) {
  return deadlineIso.canonicalNamedDate(raw) || String(raw).toLowerCase();
}

function datesIn(text) {
  const found = new Set();
  DATE_SHAPES.forEach((pattern) => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) found.add(canonicalise(match[0]));
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

// BOTH SIDES THROUGH THE SAME NORMALISATION, WHICH IS THE RULE THREE GUARDS
// HAVE NOW BROKEN.
//
// This compared raw string to raw string, so the engine's "19 June 2026" and a
// model's "19/06/2026" were different facts. That is the same defect as the
// abbreviation case and the numeric-date case one layer up, in a third place:
// a canonical value tested against a raw one.
//
// Dates go through canonicalise, exactly as datesIn does. An amount goes
// through sameAmount, because "£240.22" and "240.22" are one figure written two
// ways and a raw comparison calls them two.
//
// WHAT IS DELIBERATELY NOT NORMALISED AWAY: the currency symbol is required on
// at least one side and the digits must match exactly. A bare number is only
// accepted as equal to a currency-marked one when the DIGITS ARE IDENTICAL, so
// "17454" cannot become "£17,454.00" from a different figure, and a meter
// reading of 17454 litres is not equal to any amount the engine did not already
// hold. Separators and trailing pence zeros are the only formatting collapsed.
function sameDate(a, b) {
  if ((a ?? null) === (b ?? null)) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return canonicalise(String(a)) === canonicalise(String(b));
}

function sameAmount(a, b) {
  if ((a ?? null) === (b ?? null)) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  const digits = (value) => {
    const raw = String(value).trim();
    // A UNIT MAKES IT A MEASUREMENT, NOT AN AMOUNT. "17454 litres" and "1,492
    // kWh" must never equal "£17,454.00", so anything carrying a unit declines
    // rather than reducing to its digits.
    if (/\d\s*(?:k?wh|litres?|units?|m3|kg|miles?|days?|months?|%)\b/i.test(raw)) return null;
    const m = raw.match(/-?\d[\d,]*(?:\.\d+)?/);
    if (!m) return null;
    const n = Number(m[0].replace(/,/g, ""));
    return Number.isFinite(n) ? n.toFixed(2) : null;
  };
  const left = digits(a);
  const right = digits(b);
  return left !== null && left === right;
}

const FACT_COMPARISON = {
  "summary.main_date": sameDate,
  "cards.possible_deadline": sameDate,
  "summary.main_amount": sameAmount,
  "cards.possible_payment": sameAmount
};

function validateEngineOwnedFacts(candidate, fallback, errors) {
  if (!fallback) return;

  ENGINE_OWNED_FACTS.forEach(([label, read]) => {
    const same = FACT_COMPARISON[label] ||
      ((a, b) => (a ?? null) === (b ?? null));
    if (!same(read(candidate), read(fallback))) {
      errors.push(`${label} must match the engine value`);
    }
  });

  const candidateCards = Array.isArray(candidate.cards) ? candidate.cards : [];
  const fallbackCards = Array.isArray(fallback.cards) ? fallback.cards : [];
  candidateCards.forEach((card, index) => {
    const source = fallbackCards[index];
    if (!source) return;
    ["possible_deadline", "possible_payment"].forEach((field) => {
      const same = FACT_COMPARISON["cards." + field];
      if (!same(card[field], source[field])) {
        errors.push(`cards[${index}].${field} must match the engine value`);
      }
    });
  });
}

// THE FOURTH INSTANCE OF THE ASYMMETRY, found by the sweep of 5 August 2026
// rather than by a reader.
//
// Every ALLOWED_* set below is written in lower case. The candidate value was
// tested against it RAW, so a model returning "High" instead of "high", or
// " high " with padding, failed the membership test and the WHOLE RESULT was
// discarded. Six fields carried it: document_type, document_type_confidence,
// overall_confidence, risk_level, processing_mode, and per card card_type,
// confidence_level and status.
//
// A canonical set tested against a raw value is exactly the shape that produced
// the abbreviation defect, the numeric-date defect and the engine-owned-facts
// defect. Here it costs a reader all six cards over a capital letter.
//
// NOT APPLIED TO card_id OR schema_version. Those are structural identifiers
// rather than vocabulary: an exact match is the point, and loosening them would
// let a mislabelled card through. The rule is that both sides share a
// normalisation, not that every comparison must be lenient.
function inAllowedSet(allowed, value) {
  if (typeof value !== "string") return allowed.has(value);
  return allowed.has(value.trim().toLowerCase());
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
  if (!inAllowedSet(ALLOWED_DOCUMENT_TYPES, candidate.document_type)) errors.push("document_type is not allowed");
  if (!isNonEmptyString(candidate.document_type_label)) errors.push("document_type_label is required");
  if (!inAllowedSet(ALLOWED_CONFIDENCE, candidate.document_type_confidence)) errors.push("document_type_confidence is not allowed");
  if (!inAllowedSet(ALLOWED_CONFIDENCE, candidate.overall_confidence)) errors.push("overall_confidence is not allowed");
  if (!inAllowedSet(ALLOWED_RISK_LEVELS, candidate.risk_level)) errors.push("risk_level is not allowed");
  if (!inAllowedSet(ALLOWED_PROCESSING_MODES, candidate.processing_mode)) errors.push("processing_mode is not allowed");
  if (typeof candidate.needs_user_check !== "boolean") errors.push("needs_user_check must be boolean");

  validateSummary(candidate.summary, errors);
  validateCards(candidate.cards, errors);
  validateWarnings(candidate.warnings, errors);
  validatePrivacy(candidate.privacy, errors);
  validateNoUnsafeAdvice(candidate, errors, fallback);
  validateEngineOwnedFacts(candidate, fallback, errors);
  // validateDatesComeFromTheEngine no longer runs here. The invented-date
  // protection is a REPAIR in repairInventedDates, applied before this
  // validation inside sanitizeStructuredResultWithVerdict, so one date can
  // no longer cost a reader all six cards. The function is kept and exported
  // for tests that probe the detection itself.
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
// REPAIR, NOT REJECTION, and the production measurement that forced it.
//
// validateDatesComeFromTheEngine used to push errors, and one error discarded
// the ENTIRE result. On 5 August 2026 a real 702KB communal bill lost all six
// cards, twice in five uploads, over a single date the canonicaliser could not
// yet match, while every clean sentence the model wrote was thrown away with
// it. The invented-date protection was right; the blast radius was not.
//
// WHAT THIS DOES INSTEAD, per sentence rather than per result:
//   an offending SENTENCE is removed. If it was the card's answer, the
//     engine's own answer stands in. A key point carrying one is dropped whole.
//   date FIELDS need nothing here: sanitizeSummary and sanitizeCards already
//     force possible_deadline, possible_payment, main_date and deadline_iso
//     from the fallback, so a model cannot author one.
//   a card whose repair throws is replaced by the ENGINE'S WHOLE CARD, never
//     by a guess. Fail closed, at card granularity.
//
// THE PROTECTION IS INTACT: an invented date reaches no reader in any field or
// sentence, asserted on served output in tests/inventedDateRepair.test.js. What
// changed is that the other five cards survive.
//
// Every repair is returned for logging, message starting "date <raw>", so the
// session column can record WHICH SHAPE failed to canonicalise and the gap can
// name itself on the next real upload instead of costing a diagnosis round.
function disallowedDateIn(text, allowed) {
  for (const pattern of DATE_SHAPES) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(String(text))) !== null) {
      if (!allowed.has(canonicalise(match[0]))) return match[0];
    }
  }
  return null;
}

function repairInventedDates(output, fallback, sourceText) {
  const repairs = [];
  const allowed = datesIn(JSON.stringify(fallback));
  if (typeof sourceText === "string") datesIn(sourceText).forEach((d) => allowed.add(d));

  const cards = Array.isArray(output.cards) ? output.cards : [];
  const fallbackCards = Array.isArray(fallback.cards) ? fallback.cards : [];

  cards.forEach((card, index) => {
    const engineCard = fallbackCards[index];
    if (!engineCard) return;
    try {
      ["simple_explanation", "action_needed", "read_aloud_text"].forEach((field) => {
        if (typeof card[field] !== "string") return;
        const kept = card[field].split(/(?<=[.!?])\s+/).filter((sentence) => {
          const bad = disallowedDateIn(sentence, allowed);
          if (bad) repairs.push("date " + bad + " removed from cards[" + index + "]." + field);
          return !bad;
        }).join(" ").trim();
        if (kept !== card[field]) {
          // The engine's own words stand in for an emptied answer; a shortened
          // one stands as shortened rather than being padded with anything.
          card[field] = kept || engineCard[field];
        }
      });
      if (Array.isArray(card.key_points)) {
        card.key_points = card.key_points.filter((point) => {
          if (typeof point !== "string") return true;
          const bad = disallowedDateIn(point, allowed);
          if (bad) repairs.push("date " + bad + " removed a key point on cards[" + index + "]");
          return !bad;
        });
      }
    } catch (error) {
      // Fail closed at card granularity: the engine's whole card, never a guess.
      cards[index] = JSON.parse(JSON.stringify(engineCard));
      repairs.push("date repair failed on cards[" + index + "], engine card restored");
    }
  });

  // The summary's free-text fields get the same treatment; its date fields are
  // already forced from the fallback in sanitizeSummary.
  if (output.summary) {
    ["one_line_summary", "main_action"].forEach((field) => {
      const value = output.summary[field];
      if (typeof value !== "string") return;
      const bad = disallowedDateIn(value, allowed);
      if (bad) {
        output.summary[field] = (fallback.summary || {})[field] ?? null;
        repairs.push("date " + bad + " replaced summary." + field + " with the engine value");
      }
    });
  }

  return repairs;
}

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

  const repairs = repairInventedDates(output, fallback, sourceText);

  const validation = validateStructuredResult(output, fallback, sourceText);
  if (!validation.valid) {
    return { result: fallback, rejected: true, errors: validation.errors, repairs };
  }

  return { result: output, rejected: false, errors: [], repairs };
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
    if (!inAllowedSet(ALLOWED_CARD_TYPES, card.card_type)) errors.push(`card ${index + 1} has an invalid card_type`);
    if (!isNonEmptyString(card.title)) errors.push(`card ${index + 1} title is required`);
    if (!isNonEmptyString(card.simple_explanation)) errors.push(`card ${index + 1} simple_explanation is required`);
    if (!Array.isArray(card.key_points)) errors.push(`card ${index + 1} key_points must be an array`);
    if (!Object.prototype.hasOwnProperty.call(card, "action_needed")) errors.push(`card ${index + 1} action_needed is required`);
    if (!Object.prototype.hasOwnProperty.call(card, "possible_deadline")) errors.push(`card ${index + 1} possible_deadline is required`);
    if (!Object.prototype.hasOwnProperty.call(card, "possible_payment")) errors.push(`card ${index + 1} possible_payment is required`);
    if (!inAllowedSet(ALLOWED_CONFIDENCE, card.confidence_level)) errors.push(`card ${index + 1} confidence_level is invalid`);
    if (!Object.prototype.hasOwnProperty.call(card, "warning")) errors.push(`card ${index + 1} warning is required`);
    if (!isNonEmptyString(card.read_aloud_text)) errors.push(`card ${index + 1} read_aloud_text is required`);
    if (!inAllowedSet(ALLOWED_STATUSES, card.status)) errors.push(`card ${index + 1} status is invalid`);
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

// The card carries at most MAX_KEY_POINTS lines. Protected lines claim their
// places first; the model fills what is left, in its own order.
const MAX_KEY_POINTS = 4;

function mergeProtected(modelKeyPoints, protectedKeyPoints) {
  const model = Array.isArray(modelKeyPoints) ? modelKeyPoints : [];
  const keep = (Array.isArray(protectedKeyPoints) ? protectedKeyPoints : [])
    .map((point) => String(point == null ? "" : point).trim())
    .filter(Boolean)
    .slice(0, MAX_KEY_POINTS);

  // A model line identical to a protected one is the same line, not a second
  // copy of it. Compared on the normalised string, because that is the form
  // both sides are stored in.
  const kept = new Set(keep);
  const room = Math.max(0, MAX_KEY_POINTS - keep.length);
  const fromModel = model
    .map((point) => String(point == null ? "" : point).trim())
    .filter((point) => point && !kept.has(point))
    .slice(0, room);

  return fromModel.concat(keep);
}

function sanitizeCards(cards, fallbackCards) {
  return REQUIRED_CARD_IDS.map((cardId, index) => {
    const candidate = cards[index] || {};
    const fallback = fallbackCards[index] || {};
    // ONE ARRAY OR THE OTHER WAS THE DEFECT. Any model key point discarded
    // every engine line on the card: 224 displaced against 10 kept across the
    // corpus, the contact number lost 15 times out of 15, every severity signal
    // and every not-fully-trained caution gone.
    //
    // The engine now marks which of its lines may not be displaced, and marks
    // them by PROVENANCE: protected_key_points is built by calling the same
    // functions that built the key points, not by matching how a line reads.
    // Wording was tried and it misses bailiff_enforcement card 3, where the
    // phone number arrives inside a sentence lifted from the document rather
    // than in the composed "The document gives this phone number:" form.
    //
    // MODEL FIRST, PROTECTED APPENDED. That preserves the engine's own
    // ordering, where the contact number deliberately sits after the actions
    // because it is reported and not recommended.
    //
    // AND THE PROTECTED LINES ARE TAKEN OUT OF THE CAP FIRST, so a card at the
    // four-point limit drops a model line rather than a protected one. The cap
    // is not raised: 45 of 161 corpus cards would exceed it under a full merge,
    // and card length is its own decision.
    const modelKeyPoints = Array.isArray(candidate.key_points)
      ? candidate.key_points
      : fallback.key_points;
    const protectedKeyPoints = Array.isArray(fallback.protected_key_points)
      ? fallback.protected_key_points
      : [];
    const keyPoints = mergeProtected(modelKeyPoints, protectedKeyPoints);
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
