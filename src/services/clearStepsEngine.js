const crypto = require("node:crypto");

const { trustEvaluatorPrompt } = require("../prompts/trustEvaluatorPrompt");
const { extractorPrompt } = require("../prompts/extractorPrompt");
const { rendererPrompt } = require("../prompts/rendererPrompt");
const { trustSchema } = require("../schemas/trustSchema");
const { extractorSchema } = require("../schemas/extractorSchema");
const { cardSchema, allowedCardIds } = require("../schemas/cardSchema");
const { validateBySchema, validateCards } = require("../utils/validateOutput");
const { splitDocuments } = require("../utils/splitDocuments");
const coLocation = require("../utils/coLocation");
const { countDocumentSignals, hasLink } = require("../utils/documentSignals");
const { detectLureShapeSignals } = require("../utils/lureShape");
const factCandidates = require("../utils/factCandidates");

// How many language-independent document signals stand in for the four English
// checks in detectProbableNonDocument when all four have failed. See that
// function, and src/utils/documentSignals.js, for why it is three.
const MIN_DOCUMENT_SIGNALS = 3;
const deadlineIso = require("../utils/deadlineIso");

// Co-location decline vocabulary. These match ids in the template bank, so the
// nine translated languages carry them; see docs/i18n/adding-a-bank-sentence.md.
const UNLABELLED = {
  amount: "An amount is shown but the document does not label what it is for. Check the original document.",
  date: "A date is shown but the document does not label what it is for. Check the original document.",
  amountPoint: "An amount is shown without a label.",
  datePoint: "A date is shown without a label."
};

// The single amount selector. Replaces bestMoneyAmount (largest) and
// firstOrNull (first in document order), which disagreed with each other and
// were both guesses about meaning. Returns the amount the document labels as
// owed, or null. Never the largest, never the first.
//
// Card 1, card 5 and summary.main_amount all read the ONE value this produces,
// stored once on the extraction, so the two cards cannot disagree by
// construction rather than by luck.
function selectedAmountFor(text) {
  const chosen = coLocation.selectAmount(text);
  return chosen ? chosen.value : null;
}

const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

// ONE NORMALISATION, AT THE ONE PLACE TEXT ENTERS THE ENGINE.
//
// NFC, because a label and the text it is matched against have to be in the
// same form or nothing matches at all. "até" written as a-t-é and "até" written
// as a-t-e-plus-combining-acute are different strings to every rule in this
// file, and a PDF may carry either: the two forms are visually identical, so
// nothing downstream could ever detect the difference. Unicode boundaries make
// the boundary correct around a decomposed accent; they do not make the LABEL
// match one. Only this does.
//
// AND THE INVISIBLES GO. A byte-order mark and a soft hyphen are category Cf,
// and Cf is deliberately inside co-location's word-character class so that a
// zero-width non-joiner inside a Devanagari conjunct is not read as a word
// boundary. That is right for ZWNJ and wrong for a BOM: a label sitting against
// a leading BOM would be invisible. Stripping the two that never belong in a
// word is what makes keeping Cf in the class safe.
//
// HERE AND NOWHERE ELSE. Every offset co-location computes, every span the
// extractor slices and every value a card quotes is measured against this one
// string, so normalising once at the boundary keeps them all consistent.
// Normalising anywhere further in would mean two strings and two coordinate
// systems, which is the defect that put "No clear date was found." on the same
// card as a date.
const INVISIBLE = /[﻿­]/g;

function normaliseForMatching(text) {
  return String(text == null ? "" : text).normalize("NFC").replace(INVISIBLE, "");
}

function runClearStepsEngine({ extractedText, fileMeta, facts }) {
  const jobId = fileMeta.jobId || crypto.randomUUID();
  const split = splitDocuments(normaliseForMatching(extractedText));
  const primaryText = split.documents[0] || "";

  // Adjudicated ONCE and read by both layers below, so the severity floor and
  // the card can never disagree about what the document states. Null unless an
  // English document's extractor answered and the fact survived every rule.
  const factConsequence = factCandidates.consequenceCandidate({ facts, sourceText: primaryText });

  const trust = evaluateTrustAndSeverityLayer({
    text: primaryText,
    fileMeta,
    split,
    factConsequence,
    prompt: trustEvaluatorPrompt
  });

  const extraction = runExtractorLayer({
    text: primaryText,
    trust,
    split,
    // Validated fact candidates, or null. Null on every path today except an
    // English document whose extractor answered, and null is the failure path:
    // every consumer falls through to the engine's own reading.
    facts,
    factConsequence,
    prompt: extractorPrompt
  });

  // One normalisation, at the single boundary where extraction becomes output.
  // Everything upstream, including every regex, every label lookup and all
  // three co-location tests, has already run on the original string;
  // extractor_internal below keeps the verbatim values. Only what the reader
  // sees, and the display fields that must agree with it, are normalised.
  const displayExtraction = withDisplayDates(extraction);

  const cards = runRendererLayer({
    trust,
    extraction: displayExtraction,
    prompt: rendererPrompt
  });

  const banner = buildBanner(trust);
  const structuredResult = buildStructuredResult({
    jobId,
    anonymousSessionId: fileMeta.anonymousSessionId || null,
    text: primaryText,
    trust,
    extraction: displayExtraction,
    displayCards: cards
  });

  const output = {
    job_id: jobId,
    trust: toPublicTrustShape(trust),
    cards,
    structured_result: structuredResult,
    banner,
    display_text: cards.map((card) => `${card.title} ${card.short_answer}`).join("\n"),
    tts_script: cards.map((card) => `${card.title}. ${card.short_answer}`).join("\n"),
    debug: {
      prompt_version: "clearsteps_v1",
      model: process.env.CLEARSTEPS_MODEL || "mock-clearsteps-engine-v1",
      created_at: new Date().toISOString()
    }
  };

  const trustErrors = validateBySchema(output.trust, trustSchema, "trust");
  const extractorErrors = validateBySchema(extraction, extractorSchema, "extractor");
  const cardErrors = validateCards(output.cards, cardSchema, allowedCardIds);
  const allErrors = [...trustErrors, ...extractorErrors, ...cardErrors];

  if (allErrors.length > 0) {
    output.debug.validation_errors = allErrors;
  }

  return {
    structured_output: {
      ...output,
      trust_internal: trust,
      extractor_internal: extraction
    },
    api_output: output
  };
}

function evaluateTrustAndSeverityLayer({ text, fileMeta, split, factConsequence }) {
  const normalizedText = String(text || "");
  const lower = normalizedText.toLowerCase();
  const selectedCategory = String(fileMeta.selectedCategory || "auto").toLowerCase();

  const inputQuality = detectInputQuality(normalizedText);
  // Garbling is detected when the text is long enough to otherwise be "good" but
  // estimateOcrGarbling found digit-in-word or digit-before-uppercase patterns.
  // Carried separately so the extractor can suppress specific values rather than
  // just switching mode — a category is still useful, wrong amounts are not.
  const garbledByOcr = estimateOcrGarbling(normalizedText) >= 0.06 && normalizedText.trim().length >= 160;
  const isTemplate = looksTemplate(normalizedText);
  const isOutgoing = looksOutgoing(lower);
  const isUnsupported = looksUnsupported(fileMeta.mimeType, normalizedText);

  const authenticSignals = detectAuthenticSignals(lower, fileMeta);
  const distrustSignals = detectDistrustSignals(lower);
  // ADVISORY ONLY. Kept in its own list rather than merged into the one above,
  // because that list reaching two means "low" trust and verification_only, and
  // this must never be able to cause either. See src/utils/lureShape.js.
  const lureShapeSignals = detectLureShapeSignals(normalizedText);
  const decisiveScamSignals = detectScamSignals(lower);
  const advisoryScamSignals = detectAdvisoryScamSignals(lower);

  // THE COUNTERWEIGHT. Three or more advisory phrasings together are decisive.
  //
  // F3 demoted nine needles because each one also occurs in genuine post, and
  // that was right one needle at a time. It was wrong in aggregate: a message
  // reading "Dear customer. Final warning. Act now. Click this link and pay by
  // bank transfer today." carries four of them, no credential ask, and F3
  // stopped refusing it. Worse than unrefused, the sender guess read the
  // phishing instruction as the sender.
  //
  // Three, from the distribution rather than from taste. Measured across all 54
  // corpus documents: 47 carry none, six carry exactly one and every one of
  // those six is a genuine letter, and one carries three and is scam_phishing.
  // NOTHING SITS AT TWO, so the boundary is empty on the evidence and the
  // threshold could be two or three without changing any outcome. Three is
  // chosen because it is the further of the two from the six genuine letters,
  // and because a genuine letter picking up a second advisory phrase is far
  // more likely than it picking up a third.
  //
  // A single needle still cannot refuse anything. That was the whole point of
  // F3 and it is unchanged.
  const advisoryReachesThreshold = advisoryScamSignals.length >= ADVISORY_DECISIVE_THRESHOLD;
  const scamSignals = advisoryReachesThreshold
    ? decisiveScamSignals.concat(advisoryScamSignals)
    : decisiveScamSignals;
  const severitySignals = detectSeveritySignals(lower);
  const seriousSignals = detectSeriousDocumentSignals(lower);

  // Stakes-based floor: genuinely serious document types (active enforcement,
  // eviction/possession, court/debt enforcement, immigration refusal) must never
  // be rated below their tier, however calm their wording. Keyword severity is the
  // base; the floor only ever raises it, never lowers it.
  const baseSeverityLevel = pickSeverityLevel({ lower, severitySignals, selectedCategory });
  const englishFloored = seriousSignals.tier
    ? raiseSeverityTo(baseSeverityLevel, seriousSignals.tier)
    : baseSeverityLevel;

  const documentCategory = detectDocumentCategory({
    lower,
    selectedCategory,
    isTemplate,
    isOutgoing,
    isUnsupported,
    scamSignals
  });

  // Conservative non-document detection (a menu, flyer or recipe rather than an
  // official letter or bill). Only true when the text is readable good quality,
  // matched no category, and carries none of the markers a real letter almost
  // always has. When uncertain it is false and the upload is processed normally.
  const isProbableNonDocument = detectProbableNonDocument({
    normalizedText,
    lower,
    inputQuality,
    documentCategory
  });

  // A REFUSED UPLOAD THAT CARRIES A LINK MUST NOT BE ASKED TO UPLOAD AGAIN.
  //
  // Three corpus documents sit here: a Polish parcel smish, a Polish crypto
  // lure and a Portuguese energy refund lure. Each is a few lines with a link
  // and nothing a letter has, so the non-document gate refuses all three, and
  // every refusal sentence Northcue owns then invites a clearer photo. The
  // reader is being told to try again with the message the reader should be
  // walking away from.
  //
  // THIS IS NOT A JUDGEMENT ABOUT THE DOCUMENT. It changes four sentences and
  // nothing else. is_probable_non_document is unmoved, no scam signal is
  // raised, no severity is floored and no processing mode changes. The engine
  // is not saying "this is a scam", which it cannot know here; it is declining
  // to give re-upload advice to something it can see carries a link.
  //
  // Narrow by construction: false unless the upload was ALREADY refused as a
  // non-document, so it can never reach a document Northcue actually read. 51
  // of the 54 corpus documents are false, including the 10 link-carrying ones
  // that were not refused and the recipe that was refused without a link.
  const nonDocumentCarriesLink = isProbableNonDocument && hasLink(normalizedText);

  // A CONSEQUENCE A DOCUMENT STATES IS A SEVERITY SIGNAL, in any language.
  //
  // detectSeriousDocumentSignals reads English phrases, so a Polish letter
  // warning of a court eviction order was rated low. This merges a fact-derived
  // floor through the SAME helper, so it can only ever raise and never lower.
  //
  // PLACED HERE, below the non-document decision, rather than beside the
  // English floor above. A test caught the reason: sitting up there it floored
  // non_document_recipe to urgent, because isProbableNonDocument does not exist
  // yet at that point and isUnsupported is about the file type rather than
  // about whether this is a document at all. Every gate that can refuse a
  // document has now had its say before a fact is allowed to raise anything.
  //
  // In production these documents never reach the provider, so `facts` is
  // already null; this makes that structural rather than incidental, and keeps
  // a test that hands facts in directly honest.
  const factsAreAdmissible = !garbledByOcr &&
    inputQuality === "good" &&
    scamSignals.length === 0 &&
    !isUnsupported &&
    !isProbableNonDocument &&
    !(split && split.isMultiLetterInput);
  const consequenceFloor = factsAreAdmissible ? consequenceSeverityFloor(factConsequence) : null;
  const severityLevel = consequenceFloor
    ? raiseSeverityTo(englishFloored, consequenceFloor)
    : englishFloored;
  const urgencyLevel = pickUrgencyLevel(lower, severityLevel);

  const trustAssessment = pickTrustAssessment({
    inputQuality,
    isUnsupported,
    scamSignals,
    distrustSignals,
    lureShapeSignals,
    authenticSignals
  });

  const confidence = pickConfidence({
    inputQuality,
    trustAssessment,
    split
  });

  const documentType = pickDocumentType({
    isUnsupported,
    isTemplate,
    isOutgoing,
    scamSignals
  });

  const processingMode = pickProcessingMode({
    trustAssessment,
    isUnsupported,
    inputQuality,
    scamSignals,
    isTemplate,
    isOutgoing,
    split,
    isProbableNonDocument
  });

  const needsHumanReview = (
    confidence === "low" ||
    trustAssessment === "low" ||
    trustAssessment === "unknown" ||
    split.isMultiLetterInput ||
    processingMode === "verification_only" ||
    processingMode === "unsupported"
  );

  const reviewReason = pickReviewReason({
    processingMode,
    trustAssessment,
    inputQuality,
    isTemplate,
    isOutgoing,
    split,
    isProbableNonDocument
  });

  return {
    trust_assessment: trustAssessment,
    severity_level: severityLevel,
    urgency_level: urgencyLevel,
    // A probable non-document is presented through the unsupported machinery, so
    // its category reads as an unclear upload rather than a confident "unknown".
    document_category: isProbableNonDocument ? "unsupported" : documentCategory,
    document_type: documentType,
    processing_mode: processingMode,
    is_probable_non_document: isProbableNonDocument,
    non_document_carries_link: nonDocumentCarriesLink,
    confidence,
    needs_human_review: needsHumanReview,
    review_reason: reviewReason,
    authentic_signals: authenticSignals,
    distrust_signals: distrustSignals,
    // The structural tier. Advisory by construction: pickTrustAssessment reads
    // it only to withhold "high", never to reach "low", so it cannot produce
    // verification_only, null a deadline or replace a card.
    lure_shape_signals: lureShapeSignals,
    scam_signals: scamSignals,
    // The advisory tier, always, whether or not it reached the threshold. On a
    // document refused by the counterweight these also appear in scam_signals,
    // which is the list of what actually decided; here they are the answer to
    // "which of those were advisory".
    advisory_scam_signals: advisoryScamSignals,
    severity_signals: severitySignals,
    is_high_stakes: Boolean(seriousSignals.tier),
    high_stakes_tier: seriousSignals.tier,
    serious_document_signals: seriousSignals.signals,
    input_quality: inputQuality,
    garbled_by_ocr: garbledByOcr,
    sender_guess: guessSender(normalizedText),
    is_template: isTemplate,
    is_outgoing: isOutgoing,
    is_multi_document: split.isMultiLetterInput,
    safe_next_step: buildSafeNextStep({
      processingMode,
      severityLevel,
      trustAssessment,
      isProbableNonDocument,
      nonDocumentCarriesLink
    })
  };
}

// Wording for a multi letter upload. The engine may only emit sentences that
// exist in the template bank, so these match tpl.multi.* in templates-en.js.
const MULTI_LETTER = {
  summary: "This upload appears to contain more than one letter.",
  point: "The details have not been matched to a single letter.",
  action: "Check each letter on the original documents.",
  noDeadline: "Dates cannot be matched to one letter in this upload. Check the original documents.",
  check: "Amounts cannot be matched to one letter in this upload. Check the original documents.",
  firstOnlyNotice: "Only the first letter in this upload has been read.",
  helpfulNote: "Uploading one letter at a time gives a clearer result."
};

// Card 6 on a serious document. Calm and supportive, never reassuring: the
// banner and cards 2 and 5 carry the urgency, so this card's only job is to
// stop contradicting them. It does not repeat "check the original document",
// which the banner and this card's own key point already say, because at
// phone width the longer wording pushed card 6 to eight lines in the longest
// language and short cards are the point of the product.
// Shared by the reading aid path and by documents diverted off it for being
// serious, so the two cannot drift apart.
const UNSUPPORTED_TYPE_REVIEW_REASON = "This readable document type is not fully supported yet.";

// The advice boundary caveat, and the categories that carry it whichever path
// reads the document. Housing and court letters are the two the engine is not
// fully trained for AND the two where being mistaken for advice does the most
// harm, so the caveat follows the category rather than the code path.
const TRAINING_CAVEAT =
  "Northcue is not fully trained for this type yet, so use it as a reading aid and check the original document.";
const NOT_FULLY_TRAINED = new Set(["housing", "legal_or_court"]);

const HIGH_STAKES_NOTE =
  "This looks like an important letter. Ask someone you trust if you are not sure what to do.";

// Extraction, plus the multi letter attribution rule.
//
// When an upload holds more than one letter, an amount and a date can come from
// different letters, and composing them into "X is asking you to pay A by D"
// states a relationship no document made. The engine therefore declines to
// compose rather than guessing which letter a fact belongs to. Two shapes:
//
//   first_only  the letters were separated, so the facts below belong to the
//               first letter and are kept; the reader is told the rest were
//               not read.
//   fused       the boundary was detected but the text could not be separated,
//               so every extractor ran across all of the letters and no value
//               can be attributed. Every field a card would assert a relation
//               from is dropped.
function runExtractorLayer({ text, trust, split, facts, factConsequence }) {
  return applyMultiLetterAttribution(withSelectedAmount(buildExtraction({ text, trust, facts, factConsequence }), text, facts), trust, split);
}

// Selects the one amount, for every extraction branch rather than only the
// normal one, so a garbled or reading-aid document is judged by the same rule
// as a clean one.
//
// Branches that deliberately force money_amounts to [] keep money suppressed:
// the verification-only path and the poor-quality path do that on purpose, and
// co-location must not reintroduce an amount they chose not to show.
function withSelectedAmount(extraction, text, facts) {
  const amounts = Array.isArray(extraction.money_amounts) ? extraction.money_amounts : [];
  if (!amounts.length) {
    return Object.assign({}, extraction, { selected_amount: null, unlabelled_amount: false });
  }
  const chosen = coLocation.selectAmount(text);
  // A ROLE BEATS A GUESS, AND ONLY A GUESS. selectAmount binds an amount to a
  // label it can see; where it cannot, bestMoneyAmount downstream picks the
  // largest and unlabelled_amount records that the engine knows it is guessing.
  // A fact carrying role total_due answers the question the guess was standing
  // in for, so it is taken only when the guess was going to be used.
  const fromFacts = chosen ? null : factCandidates.amountCandidate({
    facts, sourceText: text, engineUnlabelled: true
  });
  return Object.assign({}, extraction, {
    // Stays a STRING. amountCandidate returns { value, role } because the role
    // is what the key point below is labelled from, and assigning the object
    // here put "[object Object]" a template slot away from a reader.
    selected_amount: chosen ? chosen.value : (fromFacts ? fromFacts.value : null),
    unlabelled_amount: !chosen && !fromFacts,
    // Null on the engine's own path: selectAmount binds an amount to a label it
    // can read, and does not name what sort of amount it is.
    selected_amount_role: fromFacts ? fromFacts.role : null
  });
}

function applyMultiLetterAttribution(extraction, trust, split) {
  if (!split || !split.isMultiLetterInput) return extraction;

  // The refusal paths keep priority. An unsupported upload or a suspected scam
  // already has its own honest answer, and that answer is not improved by
  // replacing it with the multi letter one.
  if (trust.processing_mode === "unsupported" || trust.processing_mode === "verification_only") {
    return extraction;
  }

  if (split.documents.length > 1) {
    return Object.assign({}, extraction, { multi_letter_state: "first_only" });
  }

  const fused = Object.assign({}, extraction, {
    summary: MULTI_LETTER.summary,
    most_important_point: MULTI_LETTER.point,
    actions: [MULTI_LETTER.action],
    deadline: null,
    visible_dates: [],
    header_date: null,
    has_consequence: false,
    consequence_sentence: null,
    money_amounts: [],
    // The selected amount is an attribution too, so it goes with the rest. A
    // fused upload must not name a number, whatever labelled it.
    selected_amount: null,
    // Same rule for the phone number. "Contact us on" on a fused upload does
    // not say WHICH sender, so the number cannot be attributed to a letter.
    contact_number: null,
    // AND THE REFERENCE, which is the most attribution-like value of all: its
    // entire purpose is to say which letter this is. It was the one field the
    // fusion missed, so card 6 read "Keep this reference ready: MB-44712." on
    // an upload whose card 1 says "The details have not been matched to a
    // single letter." Two sentences from the same six cards contradicting each
    // other, and the reference belonged to whichever of the two letters
    // happened to carry one.
    //
    // Found by sweeping for this shape after the benefits date defect rather
    // than by a failing test: neither corpus fused document carries a reference
    // number, so nothing exercised it. buildHelpfulNoteKeyPoints gates that
    // line on garble and on verification_only, and never on the fused state.
    reference_numbers: [],
    unlabelled_amount: false,
    helpful_note: MULTI_LETTER.helpfulNote,
    multi_letter_state: "fused"
  });
  // The reading aid renderer composes its own sender and topic sentences, which
  // is the same fusion by another route, so the fused upload leaves that path.
  delete fused.readable_unsupported_signals;
  return fused;
}

function buildExtraction({ text, trust, facts, factConsequence }) {
  if (trust.processing_mode === "unsupported") {
    // A probable non-document gets a calm, honest "this is not an official letter"
    // message, never a reading-aid that pretends to understand it.
    if (trust.is_probable_non_document) {
      return buildNonDocumentExtraction(trust);
    }
    if (trust.input_quality !== "poor" && String(text || "").trim().length >= 80) {
      return buildReadableUnsupportedExtraction(text, trust);
    }

    return {
      summary: "Readable text is limited in this upload.",
      most_important_point: "Not clearly stated.",
      actions: ["Upload a clearer copy if possible."],
      deadline: null,
      risk: "Important details may be missing.",
      helpful_note: "This document can be partly explained, but details need checking.",
      money_amounts: [],
      reference_numbers: [],
      contact_details: [],
      contact_number: null,
      appeal_rights: [],
      support_options: [],
      confidence: "low",
      needs_human_review: true,
      review_reason: trust.review_reason,
      evidence_spans: []
    };
  }

  if (trust.processing_mode === "verification_only") {
    return {
      summary: inferSummary(text, trust),
      most_important_point: "Check authenticity before taking any action.",
      actions: [
        "Verify the organisation on its official website.",
        "Use contact details from an official source.",
        "Keep your money and personal details protected."
      ],
      // deadline stays null: a date on a document we may not trust is not an
      // obligation, so nothing downstream may treat it as one. But the reader
      // still needs to SEE it. A person warned that a letter might be a scam
      // needs to know how long they have to check, and deleting the date was
      // costing far more when the scam call was wrong than it ever saved when
      // it was right. Card 4 shows it as something stated, not something owed.
      deadline: null,
      unverified_date: extractDeadline(text),
      risk: "You could lose money or share private data.",
      helpful_note: "Do not use links or numbers from this document until checked.",
      money_amounts: extractMoneyAmounts(text),
      reference_numbers: extractReferenceNumbers(text),
      contact_details: [],
      contact_number: null,
      appeal_rights: [],
      support_options: [],
      confidence: "low",
      needs_human_review: true,
      review_reason: trust.review_reason,
      evidence_spans: []
    };
  }

  // Benefits / welfare letters (DWP, Universal Credit, PIP, housing benefit, etc.)
  // are deliberately handled as a cautious reading aid, never the confident path,
  // so they can never tell an anxious reader "no action needed" when an obligation
  // or deadline may exist. Real obligations found in the text are still surfaced.
  if (isWelfareBenefitsLetter(text)) {
    return buildBenefitsReadingAidExtraction(text, trust);
  }

  if (shouldUseReadableUnsupportedAid(text, trust)) {
    return withFactsOnReadingAid(buildReadableUnsupportedExtraction(text, trust), text, facts, factConsequence);
  }

  const actions = extractActions(text, trust);
  const risk = inferRisk(text, trust);
  const note = inferContextNote(text, trust);

  // Real, document-stated consequence of ignoring the letter (prosecution, debt
  // collection, disconnection, eviction, etc.), already hedged/attributed by
  // normalizeRiskSentence. Non-null only when the document itself states a
  // consequence — drives the adaptive Card 5 (consequence vs check). Deliberately
  // NOT severity-based, so a medium-severity appointment with no threat stays a
  // "What should I check?" card and never manufactures alarm.
  const consequenceSentence = extractRiskSentence(text);

  // When OCR garbling was the reason for the quality downgrade, amounts and dates
  // extracted from the text are likely wrong (corrupted characters). Return a
  // category-level summary without specific figures and null the deadline so the
  // renderer can show a "check the original" message instead of a wrong date.
  if (trust.garbled_by_ocr) {
    // Actions were passed through this branch untouched while the deadline
    // beside them was nulled, so the same document was judged too damaged to
    // name a date and confident enough to name an action. On ocr_enforcement
    // that produced card 3 reading "Am0unt outstanding: £1,247.00 You must
    // c0ntact us on 0333 320 122 by 3September 2026." A sentence lifted out of
    // a document we have just called unreliable is not an instruction.
    const safeActions = withoutRawDocumentText(actions, trust);
    return {
      summary: inferGarbledSummary(text, trust),
      garbled_caution: inferGarbledCaution(text, trust),
      most_important_point: inferMostImportantPoint(trust, safeActions),
      actions: safeActions,
      deadline: null,
      // Card 5 quotes the document's own consequence sentence verbatim when
      // has_consequence is true, which is right on a clean letter and wrong
      // here for the same reason the action card was: a sentence lifted out of
      // a document we have just called unreliable is not something to present
      // in the engine's confident register.
      //
      // This was already the behaviour, but only because this object happened
      // not to set the key. Anyone completing the return object for tidiness
      // would have reintroduced the defect with no test failing. Stated, not
      // inherited.
      has_consequence: false,
      consequence_sentence: null,
      // inferRisk QUOTES the document when a risk phrase matches, so on a
      // garbled document it hands back the damage verbatim: widening
      // RISK_PHRASES turned this field into "If paym3nt is not received by this
      // date an enforcement agent may attend your pr0perty and rem0ve goods
      // belonging to you." That is O-2's shape exactly, and the reason
      // has_consequence and consequence_sentence are already nulled two lines
      // above. risk was only clean here by luck: no phrase had matched this
      // document before.
      //
      // Severity-based wording instead, which is what inferRisk falls through
      // to when nothing matches, so a damaged letter says what its severity
      // means rather than repeating text the engine has called unreliable.
      risk: severityRisk(trust),
      helpful_note: note,
      money_amounts: extractMoneyAmounts(text),
      reference_numbers: extractReferenceNumbers(text),
      contact_details: extractContactDetails(text, trust),
      contact_number: extractContactNumber(text, trust),
      appeal_rights: [],
      support_options: [],
      confidence: "low",
      needs_human_review: true,
      review_reason: "OCR garbling detected. Amounts and dates may be unreliable.",
      evidence_spans: []
    };
  }

  const engineDeadline = isInCreditOrNoPayment(text)
    ? null
    : trust.document_category === "appointment"
      ? (extractAppointmentDate(text) || extractDeadline(text))
      : extractDeadline(text);
  const summary = inferSummary(text, trust);
  const headerDate = extractHeaderDate(text);

  // FACTS ARE CANDIDATES, AND ONLY HERE.
  //
  // The engine has already done its own reading above, in full, and every
  // value below is its own unless a candidate survives adjudication. That
  // ordering is the failure path: an extractor that errors, times out or
  // returns nothing leaves `facts` null and every line here falls through to
  // the engine's answer, so there is no separate fallback to get wrong.
  //
  // This is also the ONLY place facts are read. Every earlier return in this
  // function is a gate the engine owns: unsupported, probable non-document,
  // verification_only, the benefits reading aid, the readable-unsupported aid,
  // and garbled OCR. A document that took one of those never reaches this line,
  // so those gates dominate facts absolutely rather than by a check anyone has
  // to remember. applyMultiLetterAttribution runs AFTER this and nulls the
  // deadline, the amounts and the consequence on a fused upload, so it
  // dominates too.
  //
  // A candidate never overrides an engine answer. It fills a null.
  const deadline = engineDeadline || factCandidates.deadlineCandidate({
    facts, sourceText: text, engineDeadline
  });
  // The SENTENCE is the engine's when the engine found one. The KIND is the
  // model's whenever it is valid, because the severity floor needs it either
  // way, and the two are adjudicated once in runClearStepsEngine so this and
  // the floor cannot disagree.
  const factSentence = consequenceSentence
    ? null
    : (composedConsequenceFor(factConsequence) || (factConsequence ? factConsequence.sentence : null));

  return {
    summary,
    most_important_point: inferMostImportantPoint(trust, actions),
    actions,
    deadline,
    // Recorded so a card built from a candidate is distinguishable downstream
    // from one the engine read for itself, without changing what is shown.
    deadline_from_facts: Boolean(!engineDeadline && deadline),
    visible_dates: extractVisibleDates(text).filter((d) => d !== headerDate),
    header_date: headerDate,
    risk,
    has_consequence: Boolean(consequenceSentence) || Boolean(factSentence),
    consequence_sentence: consequenceSentence || factSentence,
    // The kind, kept for the severity floor that lands with the bank entries.
    // Null on the engine's own path, because RISK_PHRASES matches a phrase and
    // does not name a kind.
    consequence_kind: factConsequence ? factConsequence.kind : null,
    consequence_conditional: factConsequence ? factConsequence.conditional : null,
    helpful_note: note,
    money_amounts: extractMoneyAmounts(text),
    reference_numbers: extractReferenceNumbers(text),
    contact_details: extractContactDetails(text, trust),
    contact_number: extractContactNumber(text, trust),
    appeal_rights: [],
    support_options: [],
    confidence: trust.confidence,
    // The reading aid path forced this true for its own reason, that the type
    // is not fully supported yet. That reason still holds for a document
    // diverted off it for being serious, so the flag is carried rather than
    // dropped: without this, routing a possession notice onto this path would
    // flip it from needing a human check to not needing one.
    // trust.needs_human_review itself is untouched.
    needs_human_review: trust.needs_human_review || isReadableUnsupportedType(text, trust),
    // Carried with the flag above, and for the same reason. Without it a
    // diverted possession notice reports "No major trust issue found." as its
    // review reason, which is pickReviewReason answering a trust question
    // where a seriousness one was asked.
    review_reason: isReadableUnsupportedType(text, trust)
      ? UNSUPPORTED_TYPE_REVIEW_REASON
      : trust.review_reason,
    evidence_spans: []
  };
}

// Returns a copy of the extraction with every date the reader will see written
// the way the paper writes it. The optional separator recovers "1April 2026",
// which is the right value, but the letter in the reader's hand says
// "1 April 2026", so showing the OCR form breaks the rule that the screen
// should match the paper rather than serving it.
//
// A copy, never a mutation: extractor_internal must keep the verbatim values,
// and nothing that matches or measures may ever see this.
// Replaces each raw date inside an already-built sentence with its display
// form. The header date is covered too, because it can carry the same damage.
function rewriteDatesForDisplay(sentence, dateParts, primaryDate) {
  if (typeof sentence !== "string") return sentence;
  const raws = unique(
    [].concat(Array.isArray(dateParts) ? dateParts : [], primaryDate || [])
      .filter(Boolean)
      .concat(extractVisibleDates(sentence))
  );
  return raws.reduce((text, raw) => {
    const shown = coLocation.formatDateForDisplay(raw);
    return shown === raw ? text : text.split(raw).join(shown);
  }, sentence);
}

function withDisplayDates(extraction) {
  const display = Object.assign({}, extraction);
  if (display.deadline) display.deadline = coLocation.formatDateForDisplay(display.deadline);
  if (display.header_date) display.header_date = coLocation.formatDateForDisplay(display.header_date);
  if (Array.isArray(display.visible_dates)) {
    display.visible_dates = display.visible_dates.map(coLocation.formatDateForDisplay);
  }
  const signals = display.readable_unsupported_signals;
  if (signals) {
    // The date sentence is rebuilt from the normalised values rather than
    // patched afterwards, so it cannot drift from the fields beside it. That
    // drift is the whole defect this session closed.
    const primaryDate = signals.primaryDate
      ? coLocation.formatDateForDisplay(signals.primaryDate)
      : signals.primaryDate;
    const dateParts = Array.isArray(signals.dateParts)
      ? signals.dateParts.map(coLocation.formatDateForDisplay)
      : signals.dateParts;
    display.readable_unsupported_signals = Object.assign({}, signals, {
      primaryDate,
      dateParts,
      // Each raw date is replaced by its display form inside the sentence the
      // extractor already built. Rebuilding the sentence here instead would
      // need every input that produced it, and dropping one of them silently
      // lost "The letter is dated 27 May 2026." from medical_letter. For an
      // undamaged date the replacement is a no-op.
      dateMessage: rewriteDatesForDisplay(signals.dateMessage, signals.dateParts, signals.primaryDate)
    });
  }
  return display;
}

function runRendererLayer({ trust, extraction }) {
  const cardStatus = statusFromTrustAndSeverity(trust);
  const actionLine = normalizeActionLine(extraction.actions);

  if (extraction.readable_unsupported_signals) {
    return buildReadableUnsupportedCards({ trust, extraction, cardStatus, actionLine });
  }

  return [
    {
      id: "what_is_this",
      title: "What is this?",
      short_answer: cleanLine(extraction.summary || "Not clearly stated."),
      status: cardStatus
    },
    {
      id: "what_matters_most",
      title: "What matters most?",
      short_answer: cleanLine(extraction.most_important_point),
      status: cardStatus
    },
    {
      id: "what_do_i_need_to_do",
      title: "What do I need to do?",
      short_answer: actionLine,
      steps: Array.isArray(extraction.actions) ? extraction.actions.map(cleanLine) : [],
      status: cardStatus
    },
    {
      id: "when_is_it_due",
      title: "When is it due?",
      short_answer: extraction.deadline
        ? trust.document_category === "appointment"
          ? cleanLine(`Your appointment is on ${extraction.deadline}.`)
          : cleanLine(`Due by ${extraction.deadline}.`)
        : extraction.unverified_date
          ? cleanLine(`The document states a date of ${extraction.unverified_date}. Check this with the organisation before acting.`)
          : trust.garbled_by_ocr
            ? "A date or deadline may appear in this document, but the text quality is too low to read it reliably. Check the original document."
            : cleanLine(buildNoDeadlineMessage(extraction)),
      date: extraction.deadline || null,
      status: cardStatus
    },
    {
      id: "what_could_happen",
      title: "What could happen if I ignore it?",
      short_answer: cleanLine(extraction.risk || "No risk clearly stated."),
      status: cardStatus
    },
    {
      id: "helpful_note",
      title: "Helpful note",
      short_answer: cleanLine(inferHelpfulNote(trust, extraction.helpful_note, extraction.multi_letter_state)),
      status: cardStatus
    }
  ];
}

// A calm "a <kind> letter" phrase for the Card 1 headline on the reading-aid
// paths, so the engine uses the category it already detected instead of a
// generic "readable formal document". The "appears to be" hedge is kept by the
// caller, and the "not fully trained" caution moves to a key point / helpful note.
function friendlyTypeForCategory(category) {
  const map = {
    government: "an official letter",
    benefits: "a benefits letter",
    bank_or_loan: "a bank or finance letter",
    legal_or_court: "a legal or court letter",
    housing: "a housing letter",
    medical: "a health letter",
    employment: "a work letter",
    education: "a school or education letter",
    insurance: "an insurance letter"
  };
  return map[category] || "a formal letter";
}

// Calm, non-blaming response for an upload that does not look like an official
// document. Never invents a summary, amount, date, or action from the content.
function buildNonDocumentExtraction(trust) {
  const carriesLink = Boolean(trust.non_document_carries_link);
  return {
    summary: "This does not look like an official letter or bill.",
    most_important_point: "Northcue could not find the things an official letter usually has, like a sender, a reference, or a date.",
    actions: [carriesLink
      ? "Check with the organisation it appears to be from, using contact details you already have, rather than the link."
      : "Upload a clearer photo or a different page if this is a letter or bill."],
    deadline: null,
    risk: "No official document details were found.",
    helpful_note: carriesLink
      ? "Northcue is made for official letters and bills, so it has not turned this into cue cards. It has not checked the link, and cannot tell you whether it is safe."
      : "Northcue is made for official letters and bills, so it has not turned this into cue cards. If it is one, a clearer photo or a different page may help.",
    money_amounts: [],
    reference_numbers: [],
    contact_details: [],
    contact_number: null,
    appeal_rights: [],
    support_options: [],
    confidence: "low",
    needs_human_review: true,
    review_reason: "This does not look like an official document.",
    evidence_spans: []
  };
}

// THE READING AID PATH MAY TAKE A DEADLINE AND A CONSEQUENCE. NOTHING ELSE.
//
// After the non-document gate learned to read structure, every non-English
// letter lands here, because detectDocumentCategory is English and returns
// "unknown". That is where polish_rent_arrears and spanish_water_final_notice
// sit: each carries a deadline, an amount and a stated consequence, and this
// path was saying "No clear date was found" and rating them low.
//
// Facts were originally read only on the fully supported path, which meant the
// two documents D3 exists for got nothing. Measured: with facts here, the floor
// fires on exactly those two and the deadlines appear.
//
// THIS PATH'S OWN WORDING IS UNTOUCHED. Card 6 still says Northcue is not fully
// trained for this document type, and needs_human_review and review_reason are
// left exactly as buildReadableUnsupportedExtraction set them. The reader is
// told the type is not fully supported AND told the date and the consequence
// the letter states. Those are compatible; withholding the second was not
// caution, it was a gap.
//
// THE SAME THREE HARD VALIDATIONS apply, because it is the same adjudicator.
// Every gate above still returns before this line: unsupported, probable non
// document, verification_only, the benefits aid and garbled OCR.
function withFactsOnReadingAid(extraction, text, facts, factConsequence) {
  if (!facts) return extraction;

  const deadline = extraction.deadline || factCandidates.deadlineCandidate({
    facts, sourceText: text, engineDeadline: extraction.deadline || null
  });
  const sentence = extraction.consequence_sentence
    ? null
    : (composedConsequenceFor(factConsequence) || (factConsequence ? factConsequence.sentence : null));

  return Object.assign({}, extraction, {
    deadline,
    deadline_from_facts: Boolean(!extraction.deadline && deadline),
    has_consequence: Boolean(extraction.has_consequence) || Boolean(sentence),
    consequence_sentence: extraction.consequence_sentence || sentence,
    consequence_kind: factConsequence ? factConsequence.kind : null,
    consequence_conditional: factConsequence ? factConsequence.conditional : null
  });
}

function buildReadableUnsupportedExtraction(text, trust) {
  const signals = extractReadableDocumentSignals(text, trust);
  const typeLabel = friendlyTypeForCategory(trust.document_category);
  const summary = signals.sender
    ? `This appears to be ${typeLabel} from ${signals.sender}.`
    : (signals.topic === GENERIC_TOPIC
        ? `This appears to be ${typeLabel}.`
        : `This appears to be ${typeLabel} about ${signals.topic}.`);
  const hasClearNoAction = clearlySaysNoActionNeeded(text);
  const actions = hasClearNoAction
    ? ["No action needed right now."]
    : ["Check the original document to see whether a response or action is needed."];

  return {
    summary,
    most_important_point: signals.mostImportantPoint,
    actions,
    deadline: signals.primaryDate,
    risk: signals.risk,
    helpful_note: "Northcue is not fully trained for this document type yet. Use this as a reading aid, not advice.",
    money_amounts: extractMoneyAmounts(text),
    reference_numbers: [],
    contact_details: [],
    contact_number: extractContactNumber(text, trust),
    appeal_rights: [],
    support_options: [],
    confidence: trust.input_quality === "good" ? "medium" : "low",
    needs_human_review: true,
    review_reason: UNSUPPORTED_TYPE_REVIEW_REASON,
    evidence_spans: [],
    readable_unsupported_signals: signals
  };
}

// High-precision detector for benefits / welfare letters. Uses specific scheme
// names and the DWP so it does not sweep in ordinary council-tax or energy bills.
function isWelfareBenefitsLetter(text) {
  const lower = String(text || "").toLowerCase();
  const substrings = [
    "department for work and pensions",
    "universal credit",
    "personal independence payment",
    "housing benefit",
    "employment and support allowance",
    "jobseeker",
    "pension credit",
    "disability living allowance",
    "attendance allowance",
    "carer's allowance",
    "child benefit",
    "tax credit"
  ];
  if (substrings.some((needle) => lower.includes(needle))) return true;
  // Acronyms need word boundaries so they do not match inside other words.
  return /\b(?:dwp|pip|esa|dla|jsa)\b/i.test(lower);
}

// Cautious reading-aid extraction for benefits letters. Surfaces any real
// obligations found in the text, but never emits "no action needed" /
// "information only", and always frames the output as a reading aid.
function buildBenefitsReadingAidExtraction(text, trust) {
  // Do not attach a single calendar date: benefits letters often list several
  // dates and we cannot reliably tell which (if any) is the real deadline.
  //
  // ASKED FOR, NOT UNDONE AFTERWARDS. This used to set signals.primaryDate =
  // null after the fact, which suppressed the field and left the sentence that
  // had already been built from it. See the note on extractReadableDocumentSignals.
  const signals = extractReadableDocumentSignals(text, trust, { namesASingleDate: false });
  const obligations = extractActions(text, trust).filter(
    (action) => action && action !== "No action needed right now."
  );
  const hasObligations = obligations.length > 0;
  const actions = hasObligations
    ? obligations
    : ["Check the original document, or with the sender, whether you need to respond or send anything."];

  const mostImportant = hasObligations
    ? "This may ask you to do something. Check the original document carefully."
    : "This may need a response. Check the original document, or with the sender, to be sure.";
  // Override so this path can never read as "information only" / "no action needed".
  //
  // SAFE TO SET AFTERWARDS, unlike the date, because nothing else is derived
  // from it: mostImportantPoint is a leaf, written straight onto card 1 and
  // read by nothing. The date was not a leaf, and that is the difference.
  signals.mostImportantPoint = mostImportant;

  const summary = signals.sender
    ? `This appears to be a benefits letter from ${signals.sender}.`
    : "This appears to be a benefits letter.";

  return {
    summary,
    most_important_point: mostImportant,
    actions,
    deadline: null,
    risk: signals.risk,
    helpful_note: "Northcue is not fully trained for benefits letters yet. Use this as a reading aid, not advice, and check the original document or with the sender.",
    money_amounts: extractMoneyAmounts(text),
    reference_numbers: [],
    contact_details: [],
    contact_number: extractContactNumber(text, trust),
    appeal_rights: [],
    support_options: [],
    confidence: "low",
    needs_human_review: true,
    review_reason: "Benefits or welfare letters are handled as a reading aid only.",
    evidence_spans: [],
    readable_unsupported_signals: signals
  };
}

function buildReadableUnsupportedCards({ extraction, cardStatus, actionLine }) {
  const signals = extraction.readable_unsupported_signals;
  const status = cardStatus === "good" ? "caution" : cardStatus;

  return [
    {
      id: "what_is_this",
      title: "What is this?",
      short_answer: cleanLine(extraction.summary),
      status
    },
    {
      id: "what_matters_most",
      title: "Who sent it?",
      short_answer: signals.sender
        ? cleanLine(`This appears to be from ${signals.sender}. Check the original document to confirm.`)
        : "The sender is not clearly stated. Check the original document.",
      status
    },
    {
      id: "what_do_i_need_to_do",
      title: "What do I need to do?",
      short_answer: actionLine,
      steps: Array.isArray(extraction.actions) ? extraction.actions.map(cleanLine) : [],
      status
    },
    {
      id: "when_is_it_due",
      title: "When does it matter?",
      short_answer: cleanLine(signals.dateMessage),
      date: signals.primaryDate || null,
      status
    },
    {
      id: "what_could_happen",
      title: "What matters most?",
      short_answer: cleanLine(signals.mostImportantPoint),
      status
    },
    {
      id: "helpful_note",
      title: "What should I check?",
      short_answer: cleanLine(extraction.helpful_note),
      steps: signals.keyChecks,
      status
    }
  ];
}

function toPublicTrustShape(trust) {
  return {
    trust_assessment: trust.trust_assessment,
    severity_level: trust.severity_level,
    urgency_level: trust.urgency_level,
    document_category: trust.document_category,
    document_type: trust.document_type,
    processing_mode: trust.processing_mode,
    confidence: trust.confidence,
    needs_human_review: trust.needs_human_review,
    review_reason: trust.review_reason,
    authentic_signals: trust.authentic_signals,
    distrust_signals: trust.distrust_signals,
    scam_signals: trust.scam_signals,
    // Advisory phrasings, shown beside the decisive ones in the trust panel.
    // Published deliberately: a phrase that occurs in both a scam and a genuine
    // letter is still information for a reader who already doubts the letter.
    // Nothing in this file reads it.
    advisory_scam_signals: trust.advisory_scam_signals,
    // The structural tier, same reasoning. Nothing in this file reads it
    // either; its only effect is upstream, where it withholds "high" trust.
    lure_shape_signals: trust.lure_shape_signals,
    severity_signals: trust.severity_signals,
    input_quality: trust.input_quality,
    sender_guess: trust.sender_guess,
    is_template: trust.is_template,
    is_outgoing: trust.is_outgoing,
    is_multi_document: trust.is_multi_document,
    safe_next_step: trust.safe_next_step
  };
}

function buildStructuredResult({ jobId, anonymousSessionId, text, trust, extraction, displayCards }) {
  const documentType = detectStructuredDocumentType({ text, trust });
  const documentTypeConfidence = pickStructuredDocumentTypeConfidence({ documentType, trust });
  // Welfare letters take the benefits reading-aid path regardless of the coarse
  // document_category (which may read "government"/"bank_or_loan"), so label them
  // "Benefits letter" to match their summary. isWelfareBenefitsLetter is
  // high-precision, so this never relabels energy/council-tax/appointment letters.
  const documentTypeLabel = trust.is_probable_non_document
    ? "Not an official document"
    : isWelfareBenefitsLetter(text)
      ? "Benefits letter"
      : labelForStructuredDocumentType(documentType, trust.document_category);
  const actionLine = normalizeActionLine(extraction.actions);
  const deadline = extraction.deadline || null;
  // The one selected amount, or null. Not the largest, not the first.
  const moneyAmount = extraction.selected_amount || null;

  return {
    schema_version: "clearsteps_structured_v1",
    session_id: jobId,
    anonymous_session_id: anonymousSessionId,
    document_type: documentType,
    document_type_label: documentTypeLabel,
    document_type_confidence: documentTypeConfidence,
    overall_confidence: normaliseStructuredConfidence(extraction.confidence || trust.confidence),
    risk_level: normaliseStructuredRiskLevel(trust.severity_level),
    processing_mode: normaliseStructuredProcessingMode(trust.processing_mode),
    needs_user_check: Boolean(
      trust.needs_human_review ||
      trust.processing_mode !== "normal" ||
      ["high", "urgent"].includes(trust.severity_level)
    ),
    summary: {
      one_line_summary: cleanLine(extraction.summary || "Not clearly stated."),
      main_action: actionLine,
      main_date: deadline,
      // main_date's machine readable twin, and null far more often than it is.
      // Beside it on purpose, so nothing has to look in two places to find out
      // whether the date the reader sees may also be reasoned about. Nothing
      // renders this today; the five gates behind it are in deadlineIso.
      deadline_iso: deadlineIso.deadlineIsoFor({
        garbledByOcr: trust.garbled_by_ocr,
        processingMode: trust.processing_mode,
        multiLetterState: extraction.multi_letter_state,
        // The reading aid guesses its date rather than adjudicating one, so it
        // may be shown and not reasoned about. See deadlineIsoFor.
        readingAid: Boolean(extraction.readable_unsupported_signals),
        deadline: extraction.deadline
      }),
      main_amount: moneyAmount
    },
    cards: buildStructuredCards({ trust, extraction, displayCards }),
    warnings: buildStructuredWarnings(trust),
    privacy: {
      original_file_stored: false,
      ocr_text_stored: false,
      document_text_stored: false,
      personal_details_stored: false
    }
  };
}

// Card 4's key point, which is where the engine says what it could not settle
// about the date above it.
//
// The answer sentence stays "Due by X." even when X has no single reading,
// because X is quoted from the paper and the reader holding the letter can
// resolve what the engine cannot. Deleting the date would take away the one
// thing they can check it against. What was wrong was saying only "check this
// date" while knowing exactly WHICH part of it was unsettled, so the caveat
// names the part.
//
// This REPLACES the ordinary key point rather than joining it. Both sentences
// end by pointing at the original document, so keeping the old one too would
// tell the reader to check the same thing twice, and it would cost card 4 a
// line at phone width for nothing.
const DEADLINE_CHECK = {
  ambiguous_order: (date) =>
    `The day and the month could be either way round. Check the original document: ${date}.`,
  incomplete_year: (date) =>
    `The year is not written in full. Check the original document: ${date}.`
};

function buildDeadlineCardKeyPoints(extraction) {
  const date = extraction.deadline;
  if (!date) return [];
  const write = DEADLINE_CHECK[deadlineIso.unresolvableReason(date)];
  return [write ? write(date) : `Check this date on the original document: ${date}.`];
}

// Card 3's key points: the actions Northcue composed, and then, last, the one
// phone number the document itself gives for getting in touch.
//
// REPORTED, NOT RECOMMENDED. The sentence attributes the number to the document
// and says nothing about whether to ring it, when, or what happens if the
// reader does not. It is not an action, which is why it sits after the actions
// rather than among them, and why normalizeActionLine never sees it and it can
// never become the action line.
//
// The number inserts verbatim so it matches the paper, exactly as an amount or
// a reference does. Everything about WHICH number, and whether there is one at
// all, was decided in extractContactNumber, behind four gates.
function contactNumberKeyPoint(extraction) {
  if (!extraction.contact_number) return null;
  return `The document gives this phone number: ${extraction.contact_number}.`;
}

// Does this line already carry the number? Compared with the separators made
// optional, so a line writing "0333320122" counts as naming "0333 320 122",
// and the digits still have to appear in order rather than being pooled.
function lineNamesNumber(line, number) {
  if (!line || !number) return false;
  if (String(line).indexOf(String(number)) >= 0) return true;
  const digits = String(number).replace(/\D/g, "");
  if (digits.length < 6) return false;
  return new RegExp(digits.split("").join("[\\s.()-]*")).test(String(line));
}

// THE SAME NUMBER TWICE ON ONE CARD, and it was the engine doing it to itself.
//
// bailiff_enforcement card 3 carried the number in both of its own lines, with
// no model involved:
//     "You must contact us on 0333 320 122 by 3 September 2026."   lifted
//     "The document gives this phone number: 0333 320 122."        composed
//
// WHICH ONE GOES, and this is the whole decision. The obvious reading is to
// stop composing when a line already names the number. Measured across eight
// prose runs, that is the wrong way round: on one run in eight the model
// rewrote card 3, replaced the lifted sentence with calmer wording of its own,
// and the number survived ONLY because the composed line is protected. Drop the
// composed line and that run loses the number entirely, and which run a reader
// gets is a coin toss.
//
// So the LIFT goes and the composed line stays. It is also the better survivor
// on its own terms: the lift carries the letter's imperative voice, "You must
// contact us", into a card whose contact line is deliberately reported rather
// than recommended, and the composed form is the one the template bank
// translates into all ten languages.
//
// One corpus document today. The rule is written on the value, not on the
// wording, so a second document shaped like this is covered without an edit.
function buildActionCardKeyPoints(extraction) {
  const actions = Array.isArray(extraction.actions) ? extraction.actions : [];
  const contact = contactNumberKeyPoint(extraction);
  if (!contact) return actions;
  return actions
    .filter((action) => !lineNamesNumber(action, extraction.contact_number))
    .concat(contact);
}

// PROVENANCE, NOT WORDING.
//
// sanitizeCards used to choose one key-point array or the other, so any model
// key point discarded every engine line on that card. Measured over the corpus:
// 224 engine key points displaced against 10 kept, the contact number lost 15
// times out of 15, every severity signal and every not-fully-trained caution
// gone.
//
// The lines below are the ones the model may not displace. They are collected
// by CALLING THE SAME FUNCTIONS the key-point builders call, so a protected
// line and the line it protects cannot drift apart.
//
// MATCHING ON WORDING WAS TRIED AND REJECTED, and the evidence is in the tree:
// a pattern for "The document gives this phone number:" misses
// bailiff_enforcement card 3, whose number arrives inside a sentence lifted
// from the document, "You must contact us on 0333 320 122 by 3 September 2026."
// Same family, same value, different words. A protected set keyed on how a line
// reads protects the lines someone remembered to write a pattern for.
//
// WHAT IS PROTECTED, and why each one:
//
//   the contact number      the engine chose it behind four gates and the model
//                           cannot re-derive which of several numbers was meant
//   severity signals        they say WHY a document is serious, and card 2's
//                           answer says only that it is
//   the not-fully-trained   an advice boundary. It is the sentence that keeps
//   caution                 a serious letter honest about what Northcue is
//   the input-quality       the same boundary for a document that could not be
//   caution                 read reliably
//
// Deliberately NOT protected: composed actions, reading-aid checks and the
// reference line. A model that has written its own actions has said what those
// say, and 51 of the corpus lines in that group carry a value the model repeats
// anyway.
function protectedKeyPointsFor(legacyId, { extraction, trust }) {
  const points = [];
  if (legacyId === "what_is_this") {
    if (extraction.garbled_caution) points.push(extraction.garbled_caution);
    if (extraction.readable_unsupported_signals ||
      NOT_FULLY_TRAINED.has(trust && trust.document_category)) {
      points.push(TRAINING_CAVEAT);
    }
  }
  if (legacyId === "what_matters_most") {
    // THE WHOLE CARD, by calling the builder rather than re-deriving from
    // severity_signals. Every line card 2 carries is Northcue's own severity
    // vocabulary, selected by a phrase match, with nothing quoted from the
    // document, so all of it is engine-owned.
    //
    // Re-deriving from trust.severity_signals was tried and it misses the
    // documents that matter most. buildSecondCardKeyPoints says why in its own
    // comment: severity_signals is EMPTY on the documents the stakes floor
    // raised. bailiff_enforcement is one of them, and its card 2 line, "This
    // mentions enforcement action or bailiffs.", comes from the theme path
    // instead. Protecting the field rather than the builder would have left the
    // enforcement notice unprotected while protecting a routine energy bill.
    buildSecondCardKeyPoints(trust).forEach((line) => points.push(line));
  }
  if (legacyId === "what_do_i_need_to_do") {
    const contact = contactNumberKeyPoint(extraction);
    if (contact) points.push(contact);
  }
  return points.filter(Boolean);
}

function buildStructuredCards({ trust, extraction, displayCards }) {
  const status = statusFromTrustAndSeverity(trust);
  const actionLine = normalizeActionLine(extraction.actions);
  const deadlineText = extraction.deadline ? `Due by ${extraction.deadline}.` : "No deadline clearly stated.";
  // Card 5 reads the same selected amount as card 1 and the summary. This is
  // the structural half of "the two cards can never disagree about money".
  const paymentAmount = extraction.selected_amount || null;
  const oldCardById = new Map(displayCards.map((card) => [card.id, card]));
  const deadlineDisplayText = oldCardById.get("when_is_it_due")?.short_answer || deadlineText;

  const cardDefinitions = [
    {
      legacyId: "what_is_this",
      cardType: "what_is_this",
      title: "What is this?",
      explanation: oldCardById.get("what_is_this")?.short_answer || extraction.summary,
      keyPoints: buildFirstCardKeyPoints(extraction, trust),
      actionNeeded: null
    },
    {
      legacyId: "what_matters_most",
      cardType: "what_matters_most",
      title: "What matters most?",
      explanation: oldCardById.get("what_matters_most")?.short_answer || extraction.most_important_point,
      keyPoints: buildSecondCardKeyPoints(trust),
      actionNeeded: null
    },
    {
      legacyId: "what_do_i_need_to_do",
      cardType: "what_do_i_need_to_do",
      title: "What do I need to do?",
      explanation: actionLine,
      keyPoints: buildActionCardKeyPoints(extraction),
      actionNeeded: actionLine
    },
    {
      legacyId: "when_is_it_due",
      cardType: "when_does_it_matter",
      title: "When is it due?",
      explanation: deadlineDisplayText,
      keyPoints: buildDeadlineCardKeyPoints(extraction),
      actionNeeded: null,
      possibleDeadline: extraction.deadline || null
    },
    {
      // Adaptive Card 5: leads with a real consequence when the document states
      // one, otherwise stays a calm "what to check" card. card_id and card_type
      // are intentionally unchanged in both modes (minimal surface — only the
      // user-facing title and explanation adapt). See known-gotchas.
      legacyId: "what_could_happen",
      cardType: "what_should_i_check",
      title: extraction.has_consequence ? "What could happen if I ignore it?" : "What should I check?",
      explanation: extraction.has_consequence
        ? (extraction.consequence_sentence || extraction.risk)
        : buildCheckExplanation(extraction),
      keyPoints: buildCheckKeyPoints({ trust, extraction }),
      actionNeeded: null,
      possiblePayment: paymentAmount
    },
    {
      legacyId: "helpful_note",
      cardType: "what_if_i_feel_stuck",
      title: "Helpful note",
      explanation: oldCardById.get("helpful_note")?.short_answer || inferHelpfulNote(trust, extraction.helpful_note, extraction.multi_letter_state),
      keyPoints: buildHelpfulNoteKeyPoints(trust, extraction),
      actionNeeded: trust.safe_next_step || null
    }
  ];

  return cardDefinitions.map((definition, index) => {
    const simpleExplanation = cleanLine(definition.explanation || "Not clearly stated.");
    const keyPoints = normaliseKeyPoints(definition.keyPoints);
    const warning = buildStructuredCardWarning({ trust, cardType: definition.cardType });

    return {
      card_id: definition.legacyId,
      card_number: index + 1,
      card_type: definition.cardType,
      title: definition.title,
      simple_explanation: simpleExplanation,
      key_points: keyPoints,
      // The subset of key_points the model may not displace, carried as its own
      // field so sanitizeCards protects by PROVENANCE rather than by matching
      // how a line reads. Always a subset of key_points above, and normalised
      // through the same function, so the two cannot disagree about wording.
      protected_key_points: normaliseKeyPoints(
        protectedKeyPointsFor(definition.legacyId, { extraction, trust })),
      action_needed: definition.actionNeeded ? cleanLine(definition.actionNeeded) : null,
      possible_deadline: definition.possibleDeadline || null,
      possible_payment: definition.possiblePayment || null,
      confidence_level: normaliseStructuredConfidence(extraction.confidence || trust.confidence),
      warning,
      read_aloud_text: buildReadAloudText(definition.title, simpleExplanation, keyPoints),
      status
    };
  });
}

// Card 1 key points. The headline leads with what the letter is, so the
// cautions ride underneath it: the reading-aid paths add the "not fully
// trained" note, and a separated multi letter upload adds the notice that only
// the first letter was read. Both are additive, so a document that is on the
// aid path AND multi letter keeps both.
// Card 6 already tells the reader to keep the reference number ready. It now
// shows the reference as well, which is what that advice was for.
//
// Three gates, and each exists for its own reason.
//
// GARBLED. A damaged reference is worse than none: "Reference: EN-77l2O934" is
// something a reader will quote to an enforcement agency, get nowhere with, and
// believe they have done the right thing. Same rule as everywhere else on this
// path, gate what is QUOTED from the document.
//
// VERIFICATION ONLY. Never help a reader quote a suspected scam's own reference
// back to it. scam_phishing carries "SEC-99120" and it must stay unshown.
//
// FIRST ONLY. One reference is what a letter asks for; a list invites the
// reader to choose, which is the opposite of the help intended.
//
// There is deliberately no digit filter here. That moved into
// extractReferenceNumbers with U-3, so "reference above" and "reference
// agencies" never reach this layer at all, and duplicating the check would put
// the same rule in two places to drift apart.
function buildHelpfulNoteKeyPoints(trust, extraction) {
  const points = [trust.safe_next_step];
  const references = extraction.reference_numbers || [];
  if (references.length && !trust.garbled_by_ocr && trust.processing_mode !== "verification_only") {
    points.push(`Keep this reference ready: ${references[0]}.`);
  }
  return points.filter(Boolean);
}

function buildFirstCardKeyPoints(extraction, trust) {
  const points = [extraction.most_important_point];
  // The quality caution rides under the headline rather than inside it. As part
  // of the answer it ran 486 to 518px at phone width and pushed both garbled
  // documents past the viewport; here it costs a fraction of that.
  if (extraction.garbled_caution) {
    points.push(extraction.garbled_caution);
  }
  // Keyed on what the document IS, not on which path read it. A possession
  // notice and a court fine are diverted off the reading aid for being
  // serious, and the advice boundary they were relying on has to travel with
  // them: those are the categories where "not advice" matters most.
  if (extraction.readable_unsupported_signals || NOT_FULLY_TRAINED.has(trust && trust.document_category)) {
    points.push(TRAINING_CAVEAT);
  }
  if (extraction.multi_letter_state === "first_only") {
    points.push(MULTI_LETTER.firstOnlyNotice);
  }
  return points;
}

// Card "What should I check?" headline. Uses the amount/date the engine already
// has so it is not the bare "Check key details on the original document."
function buildCheckExplanation(extraction) {
  // Same rule as the deadline card: amounts from different letters must not be
  // presented as one letter's amount.
  if (extraction.multi_letter_state === "fused") return MULTI_LETTER.check;
  const amount = extraction.selected_amount || null;
  const date = extraction.deadline;
  if (amount && date) return `Check the amount (${amount}) and the date (${date}) on the original document.`;
  if (amount) return `Check the amount (${amount}) and any dates on the original document.`;
  if (date) return `Check the date (${date}) and any amounts on the original document.`;
  // The document shows money but labels none of it. State the finding without
  // relating it, the same shape the multi letter path uses, rather than
  // reaching for the largest or the first.
  if (extraction.unlabelled_amount) return UNLABELLED.amount;
  return "Check key details on the original document.";
}

// Only the two roles amountCandidate will ever select. Every other role names
// an amount that is not the answer to "how much": a fee is a component, an
// instalment is a part, a credit is the opposite.
const AMOUNT_ROLE_POINT = {
  total_due: (value) => `Amount to pay: ${value}.`,
  arrears: (value) => `Arrears shown: ${value}.`
};

function amountKeyPoint(extraction) {
  const withRole = AMOUNT_ROLE_POINT[extraction.selected_amount_role];
  return withRole ? withRole(extraction.selected_amount) : `Amount shown: ${extraction.selected_amount}.`;
}

function buildCheckKeyPoints({ trust, extraction }) {
  const points = [];

  if (extraction.deadline) points.push(`Date: ${extraction.deadline}.`);
  // "Amount shown" is what the engine says when it does not know what SORT of
  // amount it found, which is every time on its own path: selectAmount binds a
  // value to a label it can read without naming the kind. A fact carries the
  // role, so the reader can be told which amount it is rather than only that
  // one exists.
  if (extraction.selected_amount) points.push(amountKeyPoint(extraction));
  else if (extraction.unlabelled_amount) points.push(UNLABELLED.amountPoint);
  if (trust.processing_mode === "verification_only") {
    points.push("Use official contact details before acting.");
  } else if (trust.needs_human_review) {
    points.push("Check unclear details on the original.");
  }

  if (points.length === 0) points.push("No extra checks clearly stated.");
  return points;
}

function buildStructuredCardWarning({ trust, cardType }) {
  if (trust.processing_mode === "verification_only") {
    return "This may be suspicious. Verify before acting.";
  }

  // Severity outranks both the readability note and the signals test. The
  // stakes floor (raiseSeverityTo) can make a document urgent without adding
  // anything to severity_signals, so an empty signals array is not evidence
  // that a document is calm. Reading it as though it were left the deadline
  // card, the one card about time running out, as the only silent card on a
  // notice of enforcement. Scam wording still wins, so it stays first.
  if (trust.severity_level === "urgent") {
    return "This looks important. Do not ignore it.";
  }

  if (trust.processing_mode === "unsupported") {
    return "This upload may be hard to read.";
  }

  if (cardType === "when_does_it_matter" && !trust.severity_signals.length) {
    return null;
  }

  return null;
}

function buildStructuredWarnings(trust) {
  const warnings = [];

  if (trust.processing_mode === "verification_only") {
    warnings.push("This may be suspicious. Verify using official contact details before acting.");
  }

  if (trust.processing_mode === "unsupported") {
    warnings.push("This document may be hard to read. Upload a clearer copy if possible.");
  }

  if (trust.severity_level === "urgent") {
    warnings.push("This looks important. Check the original document carefully.");
  }

  if (trust.needs_human_review && trust.review_reason) {
    warnings.push(cleanLine(trust.review_reason));
  }

  return unique(warnings);
}

// A serious document never takes the reading aid, whatever its category. The
// aid path is entered on document_category alone, and housing and
// legal_or_court are not on the supported whitelist, so a possession notice
// and a court fine were answering "What matters most?" with a sender caveat
// and titling card 5 "What should I check?", while a less serious solicitor
// letter kept "What could happen if I ignore it?" and its real consequence.
//
// The aid path gave those documents two things besides its wording: the human
// review flag and the not fully trained caveat. Both are carried over rather
// than dropped, which is why the type test is a separate predicate.
function shouldUseReadableUnsupportedAid(text, trust) {
  if (trust.is_high_stakes) return false;
  return isReadableUnsupportedType(text, trust);
}

// Whether the aid path would have claimed this document on type alone,
// ignoring how serious it is. A high stakes document that answers true here is
// one this engine is not fully trained for, and both the review flag and the
// caveat still apply to it.
function isReadableUnsupportedType(text, trust) {
  if (!text || trust.input_quality === "poor") return false;
  if (trust.processing_mode === "verification_only") return false;
  if (trust.document_type === "template" || trust.document_type === "outgoing" || trust.document_type === "possible_scam") {
    return false;
  }
  return !isFullySupportedDocument(text, trust);
}

function isFullySupportedDocument(text, trust) {
  const lower = String(text || "").toLowerCase();
  if (lower.includes("council tax")) return true;
  if (
    lower.includes("energy bill") ||
    lower.includes("electricity bill") ||
    lower.includes("gas bill") ||
    lower.includes("water bill") ||
    lower.includes("phone bill") ||
    lower.includes("broadband bill") ||
    (trust.document_category === "bill_or_payment" && /\b(energy|electricity|gas|water)\b/.test(lower))
  ) {
    return true;
  }
  // Government letters have specific inferSummary templates and safe obligation detection
  if (trust.document_category === "government") return true;

  // All bill/payment/arrears/final-notice documents — extractActions and inferSummary have
  // dedicated bill_or_payment templates that produce accurate summaries and action lines.
  if (trust.document_category === "bill_or_payment") return true;

  // Appointment letters — but only when confirmed by appointment-specific language or
  // structured appointment fields. "consultation" in the category check also matches
  // planning consultations and other non-appointment documents, so the broad category
  // alone is not enough.
  if (trust.document_category === "appointment" && (
    lower.includes("outpatient appointment") ||
    lower.includes("your appointment") ||
    lower.includes("appointment has been") ||
    lower.includes("appointment is booked") ||
    /\b(?:department|consultant)\s*:/i.test(lower)
  )) {
    return true;
  }

  return false;
}

// namesASingleDate: false means this document may never have ONE date called the
// date that matters, whatever the text supports.
//
// IT IS A PARAMETER RATHER THAN A FIELD SET AFTERWARDS, and that is the whole
// point of this change. The benefits path used to call this function, get a
// primaryDate and a dateMessage built from it, and then write
// signals.primaryDate = null. That suppressed the FIELD and left the SENTENCE,
// and the sentence is what the reader sees: a Hindi DWP letter said "The
// document shows 18 June 2026 as the date that matters" while deadline was
// null. 18 June is its next payment date; the obligation is 24 June.
//
// Suppressing before the sentence is built means no derived value can survive
// its own suppression, including one added later by someone who has never read
// this comment. That is the same rule the display layer states at the
// rewriteDatesForDisplay caller: rebuild from the normalised values rather than
// patch afterwards, so a sentence cannot drift from the fields beside it. The
// lesson was written down there and this function was one call away.
function extractReadableDocumentSignals(text, trust, options) {
  const namesASingleDate = !options || options.namesASingleDate !== false;
  const value = String(text || "");
  const lower = value.toLowerCase();
  const sender = guessDetailedSender(value) || trust.sender_guess || null;
  const topic = inferReadableTopic(value, trust);
  const headerDate = extractHeaderDate(value);
  const visibleDates = extractVisibleDates(value).filter((d) => d !== headerDate);
  const visibleTimeframes = extractVisibleTimeframes(value);
  const dateParts = unique([...visibleDates, ...visibleTimeframes]).slice(0, 4);
  const hasResponseRequest = /\b(please respond|respond by|response|reply by|submit|provide|return|complete|consultation|representation|comment|contact)\b/i.test(value);
  const hasDeadlineLanguage = /\b(deadline|due by|by no later than|no later than|before|within|reply by|respond by|return by|submit by|complete by)\b/i.test(value);
  // The reading-aid path used the first visible date, which is the same "first
  // in document order" guess co-location exists to remove. A date the document
  // labels as something else is not a deadline: "your next statement will be
  // issued on 9 August" was being shown as the deadline on a statement that
  // says there is nothing to pay. Prefer a co-located deadline, otherwise take
  // the first date no competing label has claimed, otherwise none.
  //
  // dateParts itself is left alone: listing the dates that appear in a letter
  // is honest, because that list claims nothing about what they mean.
  //
  // AND THE CANDIDATE MAY NOT BE PART OF A PERIOD. The "unclaimed" filter is
  // only as good as DATE_COMPETES, which is English, and that stopped being
  // harmless the moment findDates learned to read nine more languages: the
  // Spanish water notice promoted the start of its billing period as the date
  // that matters, on a letter whose deadline is four months later. The range
  // test is structural, so it reaches every language the competing labels
  // cannot.
  //
  // DISQUALIFIES, NEVER RE-SELECTS. Skipping to the next candidate would name
  // 15 June on the Spanish letter, which is exactly right, and would also name
  // "Payment received 04 Feb 2026" on an English bill, which is a receipt. One
  // right answer bought with one new wrong assertion is not a trade this makes.
  // The first unclaimed date is the only candidate the ordering supports; if it
  // is part of a period there is no candidate, and card 4 lists the dates
  // instead, which is a supported state.
  const colocatedDeadline = coLocation.selectDeadline(value, isPlausibleNumericDate);
  const unclaimedDates = dateParts.filter(
    (candidate) => !coLocation.isClaimedByCompetingDateLabel(value, candidate, isPlausibleNumericDate)
  );
  const inARange = coLocation.datesInARange(value, isPlausibleNumericDate);
  const readableCandidate = unclaimedDates[0] && !inARange.has(unclaimedDates[0])
    ? unclaimedDates[0]
    : null;
  const primaryDate = namesASingleDate
    ? (colocatedDeadline ? colocatedDeadline.value : readableCandidate)
    : null;

  const mostImportantPoint = buildReadableMostImportantPoint({
    text: value,
    topic,
    dateParts,
    hasResponseRequest,
    hasDeadlineLanguage
  });

  return {
    sender,
    topic,
    dateParts,
    primaryDate,
    hasResponseRequest,
    hasDeadlineLanguage,
    mostImportantPoint,
    dateMessage: buildReadableDateMessage({ dateParts, hasDeadlineLanguage, headerDate, primaryDate }),
    risk: buildReadableRiskMessage({ dateParts, hasResponseRequest, hasDeadlineLanguage }),
    keyChecks: buildReadableKeyChecks({ sender, topic, dateParts, hasResponseRequest })
  };
}

function buildReadableMostImportantPoint({ text, topic, dateParts, hasResponseRequest, hasDeadlineLanguage }) {
  const riskSentence = extractRiskSentence(text);
  if (riskSentence) return riskSentence;
  if (hasDeadlineLanguage && dateParts.length > 0) {
    return `This may include a deadline about ${topic}. Check the original before acting.`;
  }
  if (hasResponseRequest) {
    return `This may ask for a response about ${topic}. Check the original document.`;
  }
  if (dateParts.length > 0) {
    return `Important dates are visible. Check what each date refers to.`;
  }
  if (topic === GENERIC_TOPIC) {
    return "Check the original document to understand what this is.";
  }
  return `The clearest topic appears to be ${topic}. Check the original for details.`;
}

function buildReadableDateMessage({ dateParts, hasDeadlineLanguage, headerDate, primaryDate }) {
  // When the engine has judged which date matters, say so. The sentence used to
  // be computed from dateParts alone while the card's own field carried
  // primaryDate, so the two could disagree, and on ocr_council_tax they did.
  //
  // The wording stops short of the supported path's "Due by X." on purpose.
  // This path exists because Northcue is not fully trained for the category,
  // and card 1 carries the caveat saying so, so card 4 names the date the
  // engine picked without asserting the obligation with confidence it has not
  // earned.
  // Only for something that is actually a date. primaryDate can also hold a
  // relative timeframe, because dateParts carries those too, and "The document
  // shows within 14 days as the date that matters" is not a sentence. A
  // timeframe falls through to the list form, which reads correctly and claims
  // less. That housing_letter reports a period where a date belongs is a
  // separate defect, recorded as D-6.
  if (primaryDate && coLocation.findDates(String(primaryDate), isPlausibleNumericDate).length > 0) {
    return `The document shows ${primaryDate} as the date that matters. Check the original document.`;
  }

  if (dateParts.length === 0) {
    return headerDate
      ? `No clear due date was found. The letter is dated ${headerDate}.`
      : "No clear date was found. Check the original document.";
  }

  // Several dates and no judgement about which matters. Listing them claims
  // nothing, which is the honest answer here.
  const visibleText = dateParts.slice(0, 3).join(", ");
  if (hasDeadlineLanguage) {
    return `These may be important dates: ${visibleText}. Check what they refer to.`;
  }
  return `These dates appear in the document: ${visibleText}. Check what they refer to.`;
}

function buildReadableRiskMessage({ dateParts, hasResponseRequest, hasDeadlineLanguage }) {
  if (hasDeadlineLanguage || hasResponseRequest) {
    return "You may miss a response request or important date.";
  }
  if (dateParts.length > 0) {
    return "You may miss what the visible dates mean.";
  }
  return "Not clearly stated. Check the original document.";
}

function buildReadableKeyChecks({ sender, topic, dateParts, hasResponseRequest }) {
  const checks = [];
  checks.push(sender ? `Check the sender: ${sender}.` : "Check who sent the document.");
  checks.push(topic === GENERIC_TOPIC ? "Check what the document is about." : `Check the topic: ${topic}.`);
  if (dateParts.length > 0) checks.push(`Check these visible dates: ${dateParts.slice(0, 3).join(", ")}.`);
  if (hasResponseRequest) checks.push("Check whether a response is requested.");
  checks.push("Use official contact details before acting.");
  return unique(checks).slice(0, 5);
}

const GENERIC_TOPIC = "the topic shown in the document";

// True when a candidate topic heading looks garbled (OCR noise like "C0unc1l T@x")
// or non-topical (a price/menu line like "latte 3.20"), so we drop the "about X"
// clause rather than echo nonsense back to the user.
function looksGarbledOrJunkTopic(heading) {
  const h = String(heading || "").trim();
  if (!h) return true;
  if (/\d[.,]\d/.test(h)) return true; // price/menu-like line
  let garbled = 0;
  let realWords = 0;
  for (const token of h.split(/\s+/)) {
    const w = token.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "");
    if (/[a-zA-Z][0-9@|]|[0-9@|][a-zA-Z]/.test(w)) garbled++;
    else if (/^[a-zA-Z]{3,}$/.test(w)) realWords++;
  }
  return garbled >= 1 || realWords === 0;
}

function inferReadableTopic(text, trust) {
  const lower = String(text || "").toLowerCase();
  // Word-boundary check for "rent" — inferReadableTopic has the same substring bug as detectDocumentCategory
  if (/\brent\b/i.test(lower) || ["landlord", "tenancy"].some((n) => lower.includes(n))) return "housing or rent";

  const topicChecks = [
    [["local plan", "planning", "consultation"], "a local plan or consultation"],
    [["urgent care centre", "healthcare", "nhs"], "healthcare services"],
    [["appointment", "clinic"], "an appointment"],
    [["school", "student"], "school or education"],
    [["employment", "attendance"], "work or employment"],
    [["landlord", "tenancy"], "housing or rent"],
    [["loan", "mortgage"], "banking or a loan"],
    [["insurance", "policy"], "insurance"],
    [["benefit", "universal credit"], "benefits support"],
    [["county court", "magistrates' court", "crown court", "high court", "family court", "court order", "court action", "court costs", "court hearing", "court proceedings", "court summons", "to court", "tribunal", "legal proceedings", "legal action"], "a legal or court matter"],
    [["council", "borough"], "a council or local authority matter"],
    [["hmrc", "tax"], "tax or HMRC"],
    [["medical", "hospital", "gp"], "medical information"]
  ];

  for (const [needles, label] of topicChecks) {
    if (needles.some((needle) => lower.includes(needle))) return label;
  }

  const heading = firstMeaningfulHeading(text);
  if (heading && !looksGarbledOrJunkTopic(heading)) return heading.toLowerCase();

  const categoryLabels = {
    appointment: "an appointment",
    employment: "work or employment",
    education: "school or education",
    housing: "housing or rent",
    bank_or_loan: "banking or a loan",
    government: "a government or council matter",
    medical: "medical information",
    legal_or_court: "a legal or court matter",
    benefits: "benefits support",
    insurance: "insurance",
    email: "an email message",
    unknown: GENERIC_TOPIC,
    unsupported: GENERIC_TOPIC
  };

  return categoryLabels[trust.document_category] || GENERIC_TOPIC;
}

function firstMeaningfulHeading(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => cleanLine(line))
    .filter(Boolean)
    .slice(0, 12);

  return lines.find((line) => (
    line.length >= 6 &&
    line.length <= 70 &&
    !/\b(dear|tel|telephone|email|address|postcode|reference|ref:)\b/i.test(line) &&
    !/\b\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+\s+\d{4}\b/i.test(line) &&
    !/^\d/.test(line)
  )) || null;
}

function guessDetailedSender(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => cleanLine(line))
    .filter(Boolean)
    .slice(0, 14);

  // A street-address line (e.g. "4 Sycamore Court") must never be read as the
  // sender. "Court" was also removed from the organisation list below for the
  // same reason; "Magistrates"/"Tribunal" cover genuine court senders.
  const isAddressLine = (line) =>
    /^\d+\s/.test(line) &&
    /\b(court|close|lane|road|street|avenue|drive|way|place|gardens|terrace|crescent|walk|row|hill)\b/i.test(line);
  // "IN THE COUNTY COURT" is a claim heading, not a sender line; excluding it
  // lets the proper court office line ("County Court Business Centre") be used.
  const isCourtHeading = (line) => /^in the\b.*\bcourt\b/i.test(line);
  const isExcluded = (line) =>
    /\b(email|telephone|tel|floor|street|road|postcode|registered|authorised|regulated)\b/i.test(line) ||
    isAddressLine(line) ||
    isCourtHeading(line);

  const orgLine = lines.find((line) => (
    /\b(HMRC|NHS|Council|Borough|County|Magistrates|Tribunal|University|School|College|Department|Authority|Bank|Hospital|Clinic|Trust|Employer|Landlord)\b/i.test(line) &&
    line.length <= 90 &&
    !isExcluded(line)
  ));
  if (orgLine) return stripSenderPrefix(orgLine);

  // Company-style senders (debt collectors, solicitors, lettings agents, banks),
  // read from the letterhead, excluding regulatory footer lines.
  const companyLine = lines.find((line) => (
    /\b(Ltd|Limited|PLC|LLP|Solicitors|Collections|Recoveries|Enforcement|Chambers|Associates|Lettings)\b/i.test(line) &&
    line.length <= 90 &&
    !isExcluded(line)
  ));
  if (companyLine) return stripSenderPrefix(companyLine);

  return null;
}

// Strips a leading "From:" / "To:" / "Sender:" label so a sender never reads
// "appears to be from From: Greenfield Lettings".
function stripSenderPrefix(line) {
  return cleanLine(String(line || "").replace(/^\s*(?:from|to|sender)\s*:\s*/i, ""));
}

// One definition of what a date looks like, shared with co-location. This file
// previously carried its own copy of these patterns, so the two could be
// corrected independently and disagree, which is exactly what happened.
function extractVisibleDates(text) {
  return unique(
    coLocation.findDates(text, isPlausibleNumericDate).map((date) => cleanLine(date.value))
  ).slice(0, 5);
}

// days?/weeks?/months? (plural alternative first via the optional s) so
// "within 14 days" is not truncated to "within 14 day". The source lives in
// deadlineIso, which also needs to recognise a whole value as a period, and one
// definition is the rule here: this file and coLocation each carried their own
// copy of the date patterns once, and they drifted the moment one was fixed.
const VISIBLE_TIMEFRAME = new RegExp(deadlineIso.RELATIVE_TIMEFRAME_SOURCE, "gi");

function extractVisibleTimeframes(text) {
  const value = String(text || "");
  const matches = value.match(VISIBLE_TIMEFRAME) || [];
  return unique(matches.map(cleanLine)).slice(0, 3);
}

// The document's own header date ("Date: 03 June 2026") is almost never the
// deadline. Identify it so it can be excluded from "dates appear" lists and
// instead reported plainly ("the letter is dated ...").
// The letter's own date, which the reading-aid path removes from the list of
// dates a reader is asked to check, and therefore from the one it may pick as
// primaryDate.
//
// TWO ROUTES, BECAUSE THE FIRST IS ENGLISH. The label scan below wants the
// literal word "date" followed by a colon. A Gujarati letter writes
// "પત્રની તારીખ:" and a Bengali one "চিঠির তারিখ:", so it found nothing, the
// letter date stayed in visible_dates, and being first it became the date the
// reader was told mattered. On the Gujarati NHS letter that meant card 4 named
// 12 June when the appointment was 14 July.
//
// The fallback asks co-location for the date in the header zone instead. That
// is a position, not a word, so it works in any script, and it only reaches
// documents where the label scan already failed.
//
// BOTH LAYERS ARE NEEDED AND NEITHER IS SUFFICIENT. The zone only exists if a
// greeting was found, which is why coLocation gained a structural greeting at
// the same time. Prototyping either alone moved nothing.
function extractHeaderDate(text) {
  const value = String(text || "");
  const lines = value.split(/\r?\n/).slice(0, 12);
  for (const line of lines) {
    if (/\bdate\s*:/i.test(line)) {
      const dates = extractVisibleDates(line);
      if (dates.length > 0) return dates[0];
    }
  }
  const zoned = coLocation.selectLetterDate(value, isPlausibleNumericDate);
  return zoned ? zoned.value : null;
}

// Card "When is it due?" message when no genuine deadline was found. Lists any
// remaining (non-header) dates to check, or reports the letter date plainly.
// Never invents or computes a deadline.
function buildNoDeadlineMessage(extraction) {
  // A fused multi letter upload has dates from more than one letter, so naming
  // any of them as the deadline would attribute it to the wrong letter.
  if (extraction.multi_letter_state === "fused") return MULTI_LETTER.noDeadline;
  const dates = Array.isArray(extraction.visible_dates) ? extraction.visible_dates : [];
  if (dates.length > 0) {
    return `No clear due date. These dates appear in the document: ${dates.slice(0, 3).join(", ")}. Check what they refer to.`;
  }
  if (extraction.header_date) {
    return `No clear due date was found. The letter is dated ${extraction.header_date}.`;
  }
  return "No deadline clearly stated.";
}

function clearlySaysNoActionNeeded(text) {
  return /\b(no action needed|no action is needed|you do not need to do anything|for information only)\b/i.test(String(text || ""));
}

// True when a bill clearly states there is nothing to pay (in credit / zero balance).
// Kept payment-specific so it never matches a normal payable bill.
function isInCreditOrNoPayment(text) {
  return /\b(in credit|no payment is needed|no payment needed|nothing to pay|you do not need to pay|do not need to pay|no payment is due|account is in credit|you are in credit)\b/i.test(String(text || ""));
}

function detectStructuredDocumentType({ text, trust }) {
  if (trust.processing_mode === "unsupported" || trust.document_category === "unsupported") {
    return "unsupported";
  }

  const lower = String(text || "").toLowerCase();
  if (lower.includes("council tax")) return "council_tax_notice";
  if (
    lower.includes("energy bill") ||
    lower.includes("electricity bill") ||
    lower.includes("gas bill") ||
    (trust.document_category === "bill_or_payment" && /\b(energy|electricity|gas)\b/.test(lower))
  ) {
    return "energy_bill";
  }

  if (trust.document_category === "bill_or_payment") return "bill_or_payment_notice";
  if (trust.document_category === "appointment") return "appointment_letter";

  return "unknown";
}

function labelForStructuredDocumentType(documentType, documentCategory) {
  const labels = {
    council_tax_notice: "Council tax notice",
    energy_bill: "Energy bill",
    bill_or_payment_notice: "Bill or payment notice",
    appointment_letter: "Appointment letter",
    unknown: "Unknown document",
    unsupported: "Unsupported document"
  };
  if (documentType !== "unknown" && labels[documentType]) return labels[documentType];
  // documentType is "unknown" but the engine often still knows the category.
  // Give a calm, honest label from it rather than the unhelpful "Unknown document".
  // (legal_or_court is only set for genuine legal phrases, per detectDocumentCategory.)
  const categoryLabels = {
    government: "Official letter",
    benefits: "Benefits letter",
    bank_or_loan: "Bank or finance letter",
    legal_or_court: "Legal or court letter",
    housing: "Housing letter",
    medical: "Health letter",
    employment: "Work letter",
    education: "School or education letter",
    insurance: "Insurance letter"
  };
  return categoryLabels[documentCategory] || labels.unknown;
}

function pickStructuredDocumentTypeConfidence({ documentType, trust }) {
  if (documentType === "unsupported") return "low";
  if (documentType === "unknown") return "unknown";
  if (trust.input_quality === "good") return "high";
  if (trust.input_quality === "borderline") return "medium";
  return "low";
}

function normaliseStructuredConfidence(value) {
  const confidence = String(value || "").toLowerCase();
  if (["high", "medium", "low"].includes(confidence)) return confidence;
  return "unknown";
}

function normaliseStructuredRiskLevel(value) {
  const severity = String(value || "").toLowerCase();
  if (severity === "urgent") return "high";
  if (["low", "medium", "high"].includes(severity)) return severity;
  return "unknown";
}

function normaliseStructuredProcessingMode(value) {
  const mode = String(value || "").toLowerCase();
  if (mode === "normal") return "normal";
  if (mode === "caution" || mode === "verification_only") return "caution";
  return "failed";
}

function normaliseKeyPoints(points) {
  if (!Array.isArray(points)) return [];
  return unique(points.map(cleanLine).filter(Boolean)).slice(0, 4);
}

function buildReadAloudText(title, simpleExplanation, keyPoints) {
  const extra = keyPoints.length > 0 ? ` ${keyPoints.join(" ")}` : "";
  return cleanLine(`${title}. ${simpleExplanation}.${extra}`);
}

function firstOrNull(items) {
  return Array.isArray(items) && items.length > 0 ? cleanLine(items[0]) : null;
}

function bestMoneyAmount(amounts) {
  if (!Array.isArray(amounts) || amounts.length === 0) return null;
  const nonZero = amounts
    .map((raw) => ({ raw: cleanLine(raw), num: parseFloat(cleanLine(raw).replace(/[£GBP\s,]/gi, "")) }))
    .filter(({ num }) => Number.isFinite(num) && num > 0)
    .sort((a, b) => b.num - a.num);
  return nonZero.length > 0 ? nonZero[0].raw : cleanLine(amounts[0]);
}

function extractSentenceAround(text, matchIndex) {
  const raw = String(text || "");
  const beforeStr = raw.slice(0, matchIndex);

  // Walk backwards to the last line that starts with a capital letter.
  //
  // The match's OWN line counts. Scanning only what comes before the match
  // meant a match at the start of its line could never see that line's start,
  // so the walk landed one line too early and swept the previous line in. On
  // the enforcement notice that turned "You must contact us on 0333 320 122 by
  // 3 September 2026." into "Amount outstanding: £1,247.00 You must contact us
  // on 0333 320 122 by 3 September 2026." The existing field-label guard did
  // not catch it, because it rejects two or more "Label: value" markers and
  // this sweeps in exactly one.
  const lineStart = beforeStr.lastIndexOf("\n") + 1;
  let sentenceStart = 0;
  const capLineRe = /(?:^|\n)([A-Z])/g;
  let m;
  while ((m = capLineRe.exec(beforeStr)) !== null) {
    sentenceStart = m.index + (beforeStr[m.index] === "\n" ? 1 : 0);
  }
  if (/[A-Z]/.test(raw[lineStart] || "")) sentenceStart = Math.max(sentenceStart, lineStart);

  // Walk forward to the next sentence-ending punctuation, skipping a period that
  // is part of a decimal number (e.g. the "." in "£130.00") so an amount is not
  // truncated mid-number.
  const afterStr = raw.slice(matchIndex);
  let endOffset = Math.min(200, afterStr.length);
  const endRe = /[.!?]/g;
  let e;
  while ((e = endRe.exec(afterStr)) !== null) {
    if (e.index >= 250) break;
    const prev = afterStr[e.index - 1];
    const next = afterStr[e.index + 1];
    if (e[0] === "." && /\d/.test(prev || "") && /\d/.test(next || "")) continue;
    endOffset = e.index + 1;
    break;
  }

  const sentence = raw.slice(sentenceStart, matchIndex + endOffset)
    .replace(/\s+/g, " ")
    .trim();

  // Reject header/title dumps. A genuine consequence sentence does not contain
  // several "Label: value" field markers (e.g. "PCN number: ... Date: ... Vehicle: ...").
  // This happens when a risk keyword matches a document title that has no real
  // sentence punctuation before the first body line.
  const fieldLabels = sentence.match(/\b[A-Za-z][A-Za-z ]{1,20}:\s/g) || [];
  if (fieldLabels.length >= 2) return "";

  return sentence;
}

function extractSummaryFirstLineSender(text) {
  const lines = String(text || "").split(/\r?\n/);
  for (const raw of lines.slice(0, 6)) {
    const line = raw.trim();
    if (!line || line.length < 4 || line.length > 60) continue;
    if (/^(ref|reference|date|dear|po box|\d|your account|account)/i.test(line)) continue;
    if (/\b[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}\b/.test(line)) continue;
    // "IN THE COUNTY COURT" is a claim heading, not a sender. Skip it so the
    // proper court office line (e.g. "County Court Business Centre") is used.
    if (/^in the\b.*\bcourt\b/i.test(line)) continue;
    return stripSenderPrefix(line);
  }
  return null;
}

// What a letter says will happen if the reader does nothing.
//
// Swept 1 August 2026 against the corpus and against enforcement, possession
// and court wording, after the AI was found reporting a consequence card 5 was
// silent about. bailiff_enforcement, the most serious document in the set,
// had has_consequence false because its letter says "an enforcement agent may
// attend your property and remove goods" and this list only knew the word
// "bailiff".
//
// TWO OF THE ORIGINAL TWELVE HAD WORD-BOUNDARY BUGS, and both missed the
// commonest form of their own word:
//   disconnect(?:ion)?\b   missed "disconnected", matching only the noun
//   eviction\b             missed "evicted"
//
// ORDER MATTERS. extractRiskSentence returns on the first phrase that yields a
// sentence, so a phrase that lands on a letterhead rather than a clause is not
// merely useless, it can shadow a later one. Two were rejected for that:
//
//   "enforcement agent"  is kept, but note it matches "Marston Holdings
//                        Enforcement AgentS" in the letterhead FIRST. That
//                        sweeps in field labels, extractSentenceAround returns
//                        "", and the search falls through to "remove goods",
//                        which lands correctly. It earns its place on
//                        arrears_before_clause, where there is no such header.
//   "liability order"    REJECTED. On bailiff_enforcement it matches "Liability
//                        Order obtained by Hounslow Borough Council on 3 July
//                        2026", which is a past fact, not a consequence.
//
// Deliberately NOT added, and recorded so a later session does not assume they
// were missed: revenue wording ("interest will be charged", "a penalty may be
// charged"), utility wording ("we may fit a prepayment meter", "your service
// may be restricted"), and benefits wording ("your payments may be suspended",
// "an overpayment may be recovered"). All are real and all are outside the
// enforcement, possession and court scope this sweep covered; each needs its
// own baseline review because each turns card 5 from a check card into a
// quoting card on a different class of letter.
const RISK_PHRASES = [
  /\bprosecution\b/i,
  /\bfixed\s+penalty\b/i,
  /\bpenalty\s+(?:notice|charge)\b/i,
  /\bbailiff\b/i,
  /\bcounty\s+court\b/i,
  /\blegal\s+action\b/i,
  /\breferred\s+for\s+(?:further\s+)?action\b/i,
  /\bfurther\s+action\s+(?:will|may|might|could)\s+be\s+(?:taken|pursued)\b/i,
  /\bdisconnect(?:ion|ed|s)?\b/i,
  /\bevict(?:ion|ed|ing)\b/i,
  /\bdebt\s+collect(?:ion|or)\b/i,
  /\bcredit\s+(?:reference|rating|score)\b/i,

  // Enforcement: taking control of goods, in the words the regulations and the
  // notices actually use.
  /\benforcement\s+agent/i,
  /\bremove\s+goods\b/i,
  /\btake\s+control\s+of\s+(?:your\s+)?goods\b/i,
  /\bgoods\s+(?:may|will|could)\s+be\s+(?:removed|sold|taken)\b/i,
  /\bwarrant\s+of\s+control\b/i,

  // Possession: what a tenant is told they stand to lose.
  /\bpossession\s+order\b/i,
  /\bwarrant\s+for\s+possession\b/i,
  /\blose\s+your\s+home\b/i,

  // Court: the orders a fine or a judgment can turn into.
  /\bmagistrates.{0,3}\s+court\b/i,
  /\battachment\s+of\s+earnings\b/i,
  /\bcharging\s+order\b/i,
  /\bsummons(?:ed|es)?\b/i
];

// A PROMISE NOT TO DO SOMETHING IS NOT A THREAT TO DO IT.
//
// Ofgem requires a domestic energy bill to carry a debt and disconnection
// safeguard, and the safeguard is a reassurance: "We will never disconnect a
// domestic supply for debt without first offering a payment plan based on your
// ability to pay." RISK_PHRASES sees "disconnect" and "debt", and card 5 of a
// routine quarterly bill read that sentence back as what happens if the reader
// ignores it. The more compliant the bill, the more alarming Northcue made it.
//
// THE SHAPE, and it is narrow on purpose: the sender promises, in its own
// voice, NOT to do something, and attaches no condition to the reader.
//
// EVIDENCE, measured across all 70 corpus documents. The shape appears in
// exactly THREE sentences and every one of the three is a reassurance:
//
//   genuine_bank_fraud_advice   "We will never ask you to share your password,
//                                your PIN, or your full card number."
//   spec_energy_bill_full       "We will never disconnect a domestic supply for
//                                debt without first offering a payment plan..."
//   spec_energy_bill_full       "We will not disconnect a household during the
//                                winter months where anyone living there is..."
//
// It suppresses ONE of the ten consequences the corpus states, the energy bill,
// and leaves the other nine untouched. Every genuine enforcement consequence is
// conditional: "If payment is not received", "Unless payment is received",
// "Failure to pay may result", "Continued arrears may be reported". None of
// them is a negated commitment.
//
// THE SHAPE IT WOULD GET WRONG, named because no corpus document carries it:
//
//   "We will not accept further instalments and the full balance becomes due."
//
// That is a genuine warning phrased as a refusal, it is realistic council tax
// and utility wording, and this rule would suppress it. The three reassurances
// above all continue with a mitigation ("without first offering...", "where
// anyone living there...") where that one continues with a consequence, but
// that is a second discriminator resting on three examples and it is not built.
//
// So this rests on very little, exactly like the structural lure rule, and is
// recorded the same way rather than presented as settled.
const NEGATED_COMMITMENT = /\b(?:we|the council|the authority)\s+(?:will|shall)\s+(?:never|not)\b/i;
const READER_CONDITION = /\b(?:if|unless|failure to|should you|continued|where you)\b/i;

function isNegatedCommitment(sentence) {
  const value = String(sentence || "");
  if (!NEGATED_COMMITMENT.test(value)) return false;
  // A condition on the reader turns it back into a warning: "If you do not pay,
  // we will not be able to offer a payment plan" is about what the reader risks.
  return !READER_CONDITION.test(value);
}

function extractRiskSentence(text) {
  const raw = String(text || "");
  for (const pattern of RISK_PHRASES) {
    const match = pattern.exec(raw);
    if (match) {
      const sentence = extractSentenceAround(raw, match.index);
      if (sentence.length <= 5) continue;
      if (isNegatedCommitment(sentence)) continue;
      return normalizeRiskSentence(sentence);
    }
  }
  return null;
}

// True when a sentence is a payment COMMAND: a pay verb plus command/urgency
// framing ("You must pay immediately", "Pay now"). Used to keep such commands
// off the action card and out of the consequence card. A non-payment obligation
// ("You must tell us within 21 days") has no pay verb, so it is not a match.
function isPaymentCommand(sentence) {
  const s = String(sentence || "").toLowerCase();
  if (!/\b(pay|make a payment|makes? a payment|settle the|remit)\b/.test(s)) return false;
  return /\b(must|need to|needs to|are required to|is required to|should|immediately|right away|at once|without delay|now|today)\b/.test(s);
}

// Turns a raw "to avoid X" / "or X" consequence clause into a hedged report
// fragment: "your account being passed to ..." -> "your account may be passed
// to ...", and a bare noun phrase ("further action") -> "further action may follow".
function describeConsequence(consequence) {
  const c = cleanLine(consequence).replace(/[.?!]+$/, "");
  if (/\bbeing\s+\w+/i.test(c)) return c.replace(/\bbeing\s+(\w+)/i, "may be $1");
  return `${c} may follow`;
}

function normalizeRiskSentence(sentence) {
  const raw = cleanLine(sentence);

  // A consequence sentence phrased as a payment command ("You must pay
  // immediately to avoid X" / "Pay now or X") must never be echoed as a command.
  // Keep the genuine consequence (X), attribute it, and frame it as a check.
  if (isPaymentCommand(raw)) {
    const avoidMatch = raw.match(/\bto\s+avoid\s+(.+)$/i) || raw.match(/\bor\s+(?:else\s+)?(.+)$/i);
    if (avoidMatch && cleanLine(avoidMatch[1]).length > 3) {
      return `The document says ${describeConsequence(avoidMatch[1])} if a payment is not made. Check the original document.`;
    }
    return "The document says a payment may be due. Check the original document.";
  }

  // When the document uses certain/assertive consequence language ("will be", "shall be"),
  // frame the output as a report so Northcue is not asserting it in its own voice.
  // Hedged language ("may result", "could lead") passes through unchanged.
  const assertive = /\b(will\s+(?:be|result|lead|face|incur)|shall\s+be)\b/i;
  if (!assertive.test(raw)) return raw;
  const lower = raw.charAt(0).toLowerCase() + raw.slice(1);
  const body = lower.endsWith(".") ? lower.slice(0, -1) : lower;
  return `The document states that ${body}.`;
}

function buildBanner(trust) {
  // A probable non-document gets a calm, honest banner rather than any wording
  // that implies Northcue understood it as an official letter.
  if (trust.non_document_carries_link) {
    return {
      show: true,
      type: "caution",
      text: "This does not look like an official letter or bill, and it carries a link. Check using contact details you already have."
    };
  }
  if (trust.is_probable_non_document) {
    return {
      show: true,
      type: "caution",
      text: "This does not look like an official letter or bill. If it is one, try a clearer photo or a different page."
    };
  }

  if (trust.trust_assessment === "low" && trust.severity_level === "urgent") {
    return {
      show: true,
      type: "urgent",
      text: "This may be suspicious and serious. Verify before acting."
    };
  }

  // Serious document types must never be reassured as a normal document. Calm,
  // supportive wording (important, read carefully) — never panic, never the green
  // "normal document" banner. The scam / low-trust path above is left untouched.
  if (trust.is_high_stakes && trust.trust_assessment !== "low") {
    if (trust.high_stakes_tier === "urgent" || trust.severity_level === "urgent") {
      return {
        show: true,
        type: "urgent",
        text: "This looks like an important letter that may need action soon. Please read it carefully and check the original document."
      };
    }
    return {
      show: true,
      type: "caution",
      text: "This looks like an important letter. Please read it carefully and check the original document."
    };
  }

  if (trust.severity_level === "urgent") {
    return {
      show: true,
      type: "urgent",
      text: "This looks important. Do not ignore it."
    };
  }

  if (trust.trust_assessment === "low") {
    return {
      show: true,
      type: "warning",
      text: "This may be suspicious. Check before responding."
    };
  }

  if (trust.trust_assessment === "medium") {
    return {
      show: true,
      type: "caution",
      text: "Some details need checking before you act."
    };
  }

  if (trust.trust_assessment === "high" && trust.severity_level === "low") {
    return {
      show: true,
      type: "safe",
      text: "This looks like a normal document. Check the original if anything is unclear."
    };
  }

  return {
    show: true,
    type: "caution",
    text: "Read the next step card before you act."
  };
}

// TWO TIERS, because one hit currently forces three decisions with no
// counterweight: document_category to possible_scam, trust_assessment to low,
// processing_mode to verification_only.
//
// DECISIVE. Things a real organisation never asks for in writing. A letter
// asking for a full password, a PIN alongside a card number, a gift card or a
// crypto transfer is asking for something no genuine sender asks for, and no
// amount of surrounding context makes it innocent. These keep the power they
// have.
//
// ADVISORY. Nine phrasings that also occur in genuine correspondence, verified
// twice: across thirty genuine letters on 31 July and again on 1 August against
// six letters written around them one at a time. They still raise a signal a
// reader can see in the trust panel; they no longer decide anything.
//
// WHAT THE DEMOTION COSTS, measured against the expanded scam corpus rather
// than argued: nothing. Of the ten scams, ONE is refused today, and it is
// refused on decisive needles alone. The nine that are invisible stay
// invisible, which is a real gap and a separate piece of work.
//
// WHAT IT RECOVERS: all six near-miss genuine letters. A bank's own anti-fraud
// advice, an NHS booking link, a school attendance warning, a DWP identity
// check, a county court debt order and a council bill naming card payment at
// the Post Office are each refused today with trust low and all six cards
// replaced by "This may be a suspicious message about money or details."
//
// The advisory tier is NOT deleted. A phrase that appears in both a scam and a
// genuine letter is still information, and a reader looking at the trust panel
// on a letter they already doubt is better served seeing it than not.
const DECISIVE_SCAM_CHECKS = [
  ["gift card", "Mentions gift card payment."],
  ["crypto", "Mentions crypto payment."],
  ["full password", "Asks for a full password, which real organisations never request."],
  ["confirm your password", "Asks you to confirm a password."],
  ["enter your password", "Asks you to enter a password."],
  ["confirm your pin", "Asks you to confirm a PIN."],
  ["card number, pin", "Asks for card number and PIN together."],
  ["card number and pin", "Asks for card number and PIN together."],
  ["pin and full password", "Asks for PIN and password together."],
  ["account will be suspended within", "Threatens to suspend your account within a short time."],
  // THE CARD SECURITY CODE, added 1 August 2026.
  //
  // The list was missing this in its own language. scam_dvla_vehicle_tax asks
  // for a card number, an expiry date and a three digit CVV and raised nothing
  // at all; scam_bank_security_fr asks for a CVV in French and raised nothing
  // for the same reason twice over.
  //
  // It belongs in the decisive tier on the tier's own test: a real organisation
  // never asks for a card security code in writing. And it needs no
  // cross-language work, because CVV and CVC are borrowed unchanged into all
  // nine languages Northcue supports.
  //
  // "card number" is deliberately NOT here, and the pairings above are why. The
  // bare phrase appears in genuine_bank_fraud_advice, which is a bank telling
  // its customers never to share one. That is the same trap as "share your
  // password", and it is why the existing entries pair the card number with a
  // PIN rather than standing alone.
  ["cvv", "Asks for a card security code, which real organisations never request."],
  ["cvc", "Asks for a card security code, which real organisations never request."]
];

// Each entry carries the genuine phrasing that trips it, so the reason it is
// advisory is readable here rather than only in KNOWN_ENGINE_DEFECTS.
const ADVISORY_SCAM_CHECKS = [
  ["bank transfer today", "Requests immediate bank transfer."],           // "If you pay by bank transfer today, please quote your account number."
  ["act now", "Uses pressure wording."],                                  // "Failure to act now will result in further fees being added."
  ["final warning", "Uses pressure warning wording."],                    // a school letter before a penalty notice
  ["click this link", "Requests link-based response."],                   // an NHS appointment booking link
  ["confirm your account", "Requests account verification details."],     // "Please confirm your account number when you contact us."
  ["share your password", "Requests secret details."],                    // a bank's own anti-fraud advice
  ["enter your pin", "Asks you to enter a PIN."],                         // paying by card at the Post Office
  ["verify your identity within", "Pressures you to verify your identity within a short time."], // a DWP claim check
  ["account will be frozen", "Threatens to freeze your account."]         // a third party debt order
];

// How many advisory phrasings together carry the weight one of them does not.
// See the counterweight comment in evaluateTrustAndSeverityLayer for the
// distribution this comes from.
const ADVISORY_DECISIVE_THRESHOLD = 3;

function matchChecks(lower, checks) {
  return checks.filter(([needle]) => lower.includes(needle)).map(([, label]) => label);
}

// The decisive tier. This is what drives category, trust and processing mode,
// and it is the only thing that does.
function detectScamSignals(lower) {
  return matchChecks(lower, DECISIVE_SCAM_CHECKS);
}

// The advisory tier. Shown to the reader, and consulted by nothing.
function detectAdvisoryScamSignals(lower) {
  return matchChecks(lower, ADVISORY_SCAM_CHECKS);
}


function detectDistrustSignals(lower) {
  const checks = [
    ["dear customer", "Generic greeting used."],
    ["urgent payment required", "Urgent payment pressure."],
    ["limited time", "Artificial urgency used."],
    ["unusual sender", "Sender wording appears unusual."]
  ];

  return checks.filter(([needle]) => lower.includes(needle)).map(([, label]) => label);
}

function detectAuthenticSignals(lower, fileMeta) {
  const signals = [];
  if (String(fileMeta.mimeType || "").includes("pdf")) signals.push("Uploaded as PDF format.");
  if (lower.includes("reference")) signals.push("Contains reference details.");
  if (/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(lower)) signals.push("Contains date format.");
  if (lower.includes("dear")) signals.push("Contains formal letter structure.");
  return signals;
}

function detectInputQuality(text) {
  const cleaned = String(text || "").trim();
  if (!cleaned || cleaned.length < 40) return "poor";
  if (cleaned.length < 160) return "borderline";

  // Text is long enough to be "good" — check for OCR garbling before committing.
  // Garbled input can pass a letter-count check while containing corrupted values;
  // returning "borderline" here shifts the engine into caution mode instead of
  // confidently extracting specific (possibly wrong) amounts and dates.
  const garbleScore = estimateOcrGarbling(cleaned);
  if (garbleScore >= 0.25) return "poor";
  if (garbleScore >= 0.06) return "borderline";

  return "good";
}

// Returns the fraction of whitespace-delimited tokens that show OCR garbling signals.
// Only tokens ≥4 chars (after stripping leading/trailing punctuation) are examined —
// short tokens such as postcode segments ("3AB"), unit codes ("CO2"), or reference
// fragments are excluded to avoid false positives on clean text.
function estimateOcrGarbling(text) {
  const tokens = text.split(/\s+/).filter(t => t.length >= 2);
  if (tokens.length < 5) return 0;

  let garbledCount = 0;
  for (const raw of tokens) {
    const token = raw.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "");
    if (token.length < 4) continue;

    // Pattern 1 — digit sandwiched between letters: "Ener9y", "rece1ved", "c0unc1l"
    if (/[a-zA-Z][0-9][a-zA-Z]/.test(token)) { garbledCount++; continue; }

    // Pattern 2 — digit immediately before an uppercase letter: "25June", "£89.2O"
    if (/[0-9][A-Z]/.test(token)) { garbledCount++; continue; }
  }

  return garbledCount / tokens.length;
}

// A blank form the reader has not filled in yet, as opposed to a letter that
// merely contains a bracket.
//
// The previous test was /\[[^\]]+\]|{[^}]+}|<[^>]+>|.../ and matched ANY square,
// curly or angle bracket. In a UK letter angle brackets are an email address,
// and square brackets are a reference number, a neutral legal citation, or a
// clinical reference range. Each of those turned a genuine letter into "This
// looks like a template with blank fields." and a label of "Unknown document".
//
// It also never caught the thing it was for: the UK blank form convention is an
// underscore run or a dot leader, so the one real blank form in the corpus was
// classified as an ordinary letter. Both halves of that are fixed here.
const TEMPLATE_MARKERS = [
  // A square bracket only counts when what is inside it is placeholder shaped:
  // empty, a fill rule, or an instruction to the person completing the form.
  /\[\s*\]/,
  /\[[\s_.]*\]/,
  /\[\s*(?:insert|enter|your|add|delete|tick|choose|select|name|address|date|amount|x)\b[^\]]*\]/i,
  // Curly braces are a mail merge field. No UK letter prints them.
  /\{[^}]*\}/,
  // Fill in rules: four or more underscores, or a dot leader.
  /_{4,}/,
  /\.{5,}\s*$/m,
  /\binsert name\b|\binsert date\b|\btemplate\b/i
];

function looksTemplate(text) {
  const value = String(text || "");
  return TEMPLATE_MARKERS.some((marker) => marker.test(value));
}

// Only first person authorship counts. The reader saying what THEY are doing is
// the one thing an incoming letter cannot also say.
//
// Four entries have been removed. "to whom it may concern", "dear sir or madam"
// and "dear sir/madam" are salutations, and an enforcement agency uses them
// precisely because it does not know who is at the address; "i hereby give
// notice" is the operative verb of a served notice, so it appeared on the very
// documents it then misclassified. Any of the four flipped a live notice of
// enforcement to document_category outgoing, which detectDocumentCategory
// returns before any real category test runs, and card 1 to "This looks like a
// document sent by you." while severity stayed urgent.
//
// "i am writing to request" is also gone: it is standard HR, claims handler and
// council wording on incoming letters ("I am writing to request your attendance
// at a formal capability meeting").
function looksOutgoing(lower) {
  return (
    lower.includes("i am writing to complain") ||
    lower.includes("i am writing to cancel") ||
    lower.includes("i am writing to dispute") ||
    lower.includes("i wish to cancel") ||
    lower.includes("i wish to complain")
  );
}

function looksUnsupported(mimeType, text) {
  if (!mimeType) return false;
  return !SUPPORTED_MIME_TYPES.includes(mimeType) || (!String(text || "").trim() && mimeType !== "text/plain");
}

function pickDocumentType({ isUnsupported, isTemplate, isOutgoing, scamSignals }) {
  if (isUnsupported) return "unsupported";
  if (isTemplate) return "template";
  if (isOutgoing) return "outgoing";
  if (scamSignals.length > 0) return "possible_scam";
  return "official_incoming";
}

function detectDocumentCategory({ lower, selectedCategory, isTemplate, isOutgoing, isUnsupported, scamSignals }) {
  if (isUnsupported) return "unsupported";
  if (isTemplate) return "template";
  if (isOutgoing) return "outgoing";
  if (scamSignals.length > 0) return "possible_scam";

  const selectedCategoryMap = {
    bill: "bill_or_payment",
    work: "employment",
    medical: "medical",
    school: "education",
    legal: "legal_or_court",
    email: "email"
  };

  // Housing uses word-boundary regex for "rent" — bare includes() matches "current"/"currently"/"Trent"
  if (/\brent\b/i.test(lower) || ["landlord", "tenancy", "eviction"].some((n) => lower.includes(n))) {
    return "housing";
  }

  // Genuine court claim documents. High-precision signals that a claim is being
  // made (not just a letter mentioning court), so an incidental word like
  // "credit" describing the debt does not miscategorise a county court claim as
  // a bank letter. Placed after housing so possession notices stay housing, and
  // it never uses bare "court", so a street name like "Sycamore Court" is safe.
  const isCourtClaim =
    ["in the county court", "county court judgment", "claim form",
      "particulars of claim", "moneyclaim", "letter before claim"]
      .some((phrase) => lower.includes(phrase)) ||
    (lower.includes("claimant") && lower.includes("defendant"));
  if (isCourtClaim) return "legal_or_court";

  const checks = [
    [["invoice", "bill", "payment reminder", "arrears", "outstanding balance", "overdue", "final demand"], "bill_or_payment"],
    [["appointment", "clinic", "consultation"], "appointment"],
    [["disciplinary", "employment", "termination"], "employment"],
    [["school", "university", "student"], "education"],
    [["loan", "mortgage", "credit"], "bank_or_loan"],
    [["hmrc", "council", "department", "gov.uk"], "government"],
    [["nhs", "hospital", "gp", "medical"], "medical"],
    [["county court", "magistrates' court", "crown court", "high court", "family court", "court order", "court action", "court costs", "court hearing", "court proceedings", "court summons", "to court", "tribunal", "prosecution", "bailiff", "legal proceedings", "legal action"], "legal_or_court"],
    [["benefit", "universal credit", "allowance"], "benefits"],
    [["insurance", "policy"], "insurance"],
    [["subject:", "from:"], "email"]
  ];

  for (const [needles, category] of checks) {
    if (needles.some((needle) => lower.includes(needle))) {
      return category;
    }
  }

  if (selectedCategoryMap[selectedCategory]) {
    return selectedCategoryMap[selectedCategory];
  }

  return "unknown";
}

// Conservative detector for uploads that are not official documents at all
// (a menu, flyer, recipe, or random text). Declines ONLY when the text is
// readable good quality, matched no category, and carries none of the markers a
// real letter or bill almost always has: a recognised sender, a reference or
// account token, a formal date, or official/action phrasing. If any marker is
// present, or the text is not clearly readable, it returns false and the upload
// is processed normally. This asymmetry is deliberate: wrongly declining a real
// letter is worse than wrongly accepting a menu.
function detectProbableNonDocument({ normalizedText, lower, inputQuality, documentCategory }) {
  if (inputQuality !== "good") return false;
  if (documentCategory !== "unknown") return false;

  const hasSender = Boolean(guessDetailedSender(normalizedText) || guessSender(normalizedText));
  const hasReference = /\b(reference|ref[:.]|account\s*(?:number|no|:)|claim\s*(?:number|no)|invoice|policy\s*(?:number|no)|national insurance|ni number|utr|case\s*(?:number|no)|award|notice number)\b/i.test(lower);
  const hasFormalDate =
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(lower) ||
    /\bdate\s*:/i.test(lower) ||
    /\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{4}\b/i.test(lower);
  const hasOfficialPhrasing = /\b(dear|you must|please pay|amount due|amount payable|balance|payment|outstanding|arrears|your account|on behalf of|we are writing|we have been|notice|summons|claim|benefit|appointment|tax|overdue|direct debit|refund|penalty|policy|assessment|hearing|tribunal)\b/i.test(lower);

  if (hasSender || hasReference || hasFormalDate || hasOfficialPhrasing) return false;

  // STRUCTURAL FALLBACK, ADDITIVE ONLY. Reached only when all four English
  // checks above have already failed, so it can accept a document this function
  // would otherwise refuse and can never refuse one it would otherwise accept.
  //
  // Three of five, chosen from measurement rather than taste. At three, none of
  // the four real letters in the corpus is refused and the nine plain non
  // documents stay refused. At four, employment_letter starts being refused,
  // which is a real English letter. At one or two, a menu carrying prices and a
  // booking line gets through.
  //
  // WHAT THREE ADMITS THAT TWO DID NOT, recorded rather than discovered later:
  // a parcel delivery card, a gym flyer with prices and an offer end date, and
  // a sole trader's invoice. Of those only the flyer is unambiguously not a
  // document; a delivery card and a plumber's invoice are things a reader may
  // reasonably want explained, and the invoice is a bill. A till receipt and a
  // hotel booking confirmation score five, and both are ALREADY accepted today,
  // so they are not part of this trade.
  return countDocumentSignals(normalizedText) < MIN_DOCUMENT_SIGNALS;
}

function pickTrustAssessment({ inputQuality, isUnsupported, scamSignals, distrustSignals, lureShapeSignals, authenticSignals }) {
  if (isUnsupported || inputQuality === "poor") return "unknown";
  if (scamSignals.length > 0) return "low";
  if (distrustSignals.length > 1) return "low";
  // THE ADVISORY TIER STOPS HERE. Every route to "low" is above this line and
  // none of them reads lureShapeSignals, so the structural rule cannot produce
  // "low", and therefore cannot produce verification_only. Below, it can only
  // withhold "high", which is the whole of its power: a document that looks
  // like a lure does not get a clean bill of health, but is never condemned by
  // shape alone.
  const advisory = lureShapeSignals || [];
  if (authenticSignals.length >= 2 && distrustSignals.length === 0 && advisory.length === 0) return "high";
  return "medium";
}

function pickConfidence({ inputQuality, trustAssessment, split }) {
  if (inputQuality === "poor" || split.isMultiLetterInput) return "low";
  if (trustAssessment === "high" && inputQuality === "good") return "high";
  return "medium";
}

function pickProcessingMode({ trustAssessment, isUnsupported, inputQuality, scamSignals, isTemplate, isOutgoing, split, isProbableNonDocument }) {
  if (isUnsupported || inputQuality === "poor") return "unsupported";
  // A probable non-document reuses the unsupported path (no invented cards, human
  // review, calm honest wording) rather than being processed as a real document.
  if (isProbableNonDocument) return "unsupported";
  if (trustAssessment === "low" || scamSignals.length > 0) return "verification_only";
  if (trustAssessment === "medium" || isTemplate || isOutgoing || inputQuality === "borderline" || split.isMultiLetterInput) {
    return "caution";
  }
  return "normal";
}

function pickReviewReason({ processingMode, trustAssessment, inputQuality, isTemplate, isOutgoing, split, isProbableNonDocument }) {
  if (isProbableNonDocument) return "This does not look like an official document.";
  if (processingMode === "unsupported") return "Some parts are unclear or unsupported.";
  if (processingMode === "verification_only") return "Suspicious patterns were detected.";
  if (split.isMultiLetterInput) return "Multiple documents may be mixed in one upload.";
  if (isTemplate) return "Template markers were found.";
  if (isOutgoing) return "Looks like an outgoing document.";
  if (inputQuality === "borderline") return "Some details are readable but need checking.";
  if (trustAssessment === "high") return "No major trust issue found.";
  return "Some details need checking before action.";
}

function buildSafeNextStep({ processingMode, severityLevel, trustAssessment, isProbableNonDocument, nonDocumentCarriesLink }) {
  if (nonDocumentCarriesLink) {
    return "Check using contact details you already have, not the link in this message.";
  }
  if (isProbableNonDocument) {
    return "If this is a letter or bill, try a clearer photo or a different page.";
  }
  if (processingMode === "verification_only") {
    return "Verify using official contact details from the organisation website.";
  }
  if (processingMode === "unsupported") {
    return "Upload a clearer copy before taking action.";
  }
  if (severityLevel === "urgent") {
    return "Check the action card now and act using trusted details.";
  }
  if (trustAssessment === "medium") {
    return "Check key details on the original document before acting.";
  }
  return "Follow the action card step by step.";
}

function detectSeveritySignals(lower) {
  const checks = [
    ["court action", "Mentions court action."],
    ["eviction", "Mentions eviction risk."],
    ["winding up", "Mentions winding up action."],
    ["bailiff", "Mentions bailiff action."],
    ["criminal prosecution", "Mentions criminal prosecution."],
    ["termination", "Mentions termination."],
    ["disconnection", "Mentions disconnection risk."],
    ["foreclosure", "Mentions foreclosure risk."],
    ["urgent medical appointment", "Mentions urgent medical appointment."],
    ["final notice", "Mentions final notice wording."],
    ["immediate payment required", "Mentions immediate payment required."],
    ["payment overdue", "Mentions overdue payment."],
    ["missed deadline", "Mentions missed deadline."],
    ["employment warning", "Mentions employment warning."],
    ["benefit problem", "Mentions benefit issue."],
    ["housing risk", "Mentions housing risk."],
    ["loan default", "Mentions loan default."],
    ["legal response required", "Mentions legal response required."],
    ["appointment", "Mentions appointment."],
    ["school action needed", "Mentions school action needed."],
    ["documents to send", "Mentions documents to send."],
    ["form to complete", "Mentions form to complete."],
    ["meeting to attend", "Mentions meeting to attend."],
    ["information only", "Marked as information only."],
    ["confirmation", "Looks like confirmation content."],
    ["receipt", "Looks like receipt content."],
    ["newsletter", "Looks like newsletter content."],
    ["no action needed", "Says no action needed."],
    ["general update", "Looks like general update content."]
  ];

  return checks.filter(([needle]) => lower.includes(needle)).map(([, label]) => label);
}

// Why a document was rated serious, in Northcue's words rather than the
// document's.
//
// detectSeriousDocumentSignals returns the raw phrases it matched ("notice of
// enforcement", "county court"). Those are vocabulary entries, not sentences,
// and showing them verbatim would read as debug output. Each maps to a theme
// with one composed sentence.
//
// Themes rather than one sentence per phrase, because the phrase list holds
// near-duplicates by design: a notice of enforcement matches both "notice of
// enforcement" and "enforcement agent", and a reader gains nothing from being
// told the same thing twice. bailiff_enforcement therefore shows one bullet,
// not two.
const SERIOUS_SIGNAL_THEMES = {
  enforcement: [
    "notice of enforcement", "enforcement agent", "take control of your goods",
    "take control of goods", "controlled goods", "warrant of control",
    "writ of control", "high court enforcement", "bailiff"
  ],
  possession: [
    "warrant of possession", "warrant for possession", "notice seeking possession",
    "notice to quit", "accelerated possession", "possession proceedings",
    "section 21", "section 8"
  ],
  insolvency: ["statutory demand", "winding up", "winding-up"],
  court: [
    "letter before claim", "letter before action", "county court", "moneyclaim",
    "attachment of earnings", "charging order", "court claim"
  ],
  debt: ["debt collection"],
  supply: ["supply disconnection", "supply disconnection under warrant"],
  immigration: ["immigration refusal"]
};

const SERIOUS_SIGNAL_SENTENCES = {
  enforcement: "This mentions enforcement action or bailiffs.",
  possession: "This mentions possession or eviction of a home.",
  insolvency: "This mentions insolvency action.",
  court: "This mentions court action.",
  debt: "This mentions debt collection.",
  supply: "This mentions disconnection of a supply.",
  immigration: "This mentions an immigration decision."
};

// Where detectSeveritySignals already covers a theme in its own words. Keyed on
// the label it emits, which is a fixed constant in that function.
const SEVERITY_LABEL_THEMES = {
  "Mentions bailiff action.": "enforcement",
  "Mentions eviction risk.": "possession",
  "Mentions court action.": "court",
  "Mentions disconnection risk.": "supply",
  "Mentions winding up action.": "insolvency"
};

const THEME_BY_PHRASE = new Map();
Object.entries(SERIOUS_SIGNAL_THEMES).forEach(([theme, phrases]) => {
  phrases.forEach((phrase) => THEME_BY_PHRASE.set(phrase, theme));
});

// Card 2 key points. severity_signals holds keyword matches and is EMPTY on the
// documents the stakes floor raised, so "This is urgent." was rendered with
// nothing under it on three high stakes documents while the field explaining
// why sat unread.
//
// No garble gate here, and that is deliberate rather than an omission. These
// sentences are Northcue's own vocabulary, selected by a phrase match; damage
// can stop a phrase matching, but it cannot corrupt what is shown, because
// nothing from the document reaches the card. That is the general rule: gate
// what is QUOTED, not what is COMPOSED.
function buildSecondCardKeyPoints(trust) {
  const severitySignals = trust.severity_signals || [];
  // A severity signal can already say what a theme would say. "Mentions bailiff
  // action." next to "This mentions enforcement action or bailiffs." is the
  // same redundancy the themes exist to remove, arriving from the other list
  // instead of from within one.
  const covered = new Set(
    severitySignals.map((label) => SEVERITY_LABEL_THEMES[label]).filter(Boolean)
  );
  const themes = [];
  (trust.serious_document_signals || []).forEach((phrase) => {
    const theme = THEME_BY_PHRASE.get(phrase);
    if (theme && !covered.has(theme) && !themes.includes(theme)) themes.push(theme);
  });
  return unique([].concat(
    severitySignals,
    themes.map((theme) => SERIOUS_SIGNAL_SENTENCES[theme])
  ));
}

const SERIOUS_SEVERITY_RANK = { low: 0, medium: 1, high: 2, urgent: 3 };

// Raise a severity level to at least `floor`, never lowering it.
// WHAT A STATED CONSEQUENCE MEANS, in one table.
//
// consequence.kind is a SIGNAL the engine interprets, never a verdict the model
// issues. The model reports what sort of thing a letter says will happen; this
// table decides what that is worth in severity and what Northcue says about it.
// Both live together so a kind can never floor without a sentence to show, or
// carry a sentence without a considered floor.
//
// SEVEN KINDS ONLY. The model's kind is less reliable than its sentence, and
// council_tax is the proof: it labelled "you may lose the right to pay by
// instalments and the full balance will become due" as debt_collection, which
// is wrong. Composing from that would have printed a sentence the letter does
// not say. The seven below are the ones whose meaning is unambiguous; every
// other kind keeps the document's own words and floors nothing.
//
// account_suspension is absent on purpose and is refused earlier, in
// factCandidates.SCAM_SHAPED_KINDS: both corpus documents returning it are
// scams, and a floor there would make Northcue amplify the attacker's deadline.
// debt_collection, credit_record, penalty and other floor nothing because they
// describe consequences a calm letter states routinely.
//
// The sentences are attributed and hedged in the register the engine already
// uses, and each has a matching id in the template bank so every language gets
// it. The reader is the subject of the warning, as the bank review asks.
const CONSEQUENCE_KIND_POLICY = {
  enforcement_agent: {
    floor: "urgent",
    may: "The document says an enforcement agent may visit.",
    will: "The document says an enforcement agent will visit."
  },
  remove_goods: {
    floor: "urgent",
    may: "The document says goods may be taken to cover what is owed.",
    will: "The document says goods will be taken to cover what is owed."
  },
  possession: {
    floor: "high",
    may: "The document says the sender may ask a court for possession of your home.",
    will: "The document says the sender will ask a court for possession of your home."
  },
  eviction: {
    floor: "high",
    may: "The document says this may lead to you losing your home.",
    will: "The document says this will lead to you losing your home."
  },
  court_action: {
    floor: "high",
    may: "The document says court action may follow.",
    will: "The document says court action will follow."
  },
  disconnection: {
    floor: "high",
    may: "The document says your supply may be cut off.",
    will: "The document says your supply will be cut off."
  },
  prosecution: {
    floor: "high",
    may: "The document says this may lead to prosecution.",
    will: "The document says this will lead to prosecution."
  }
};

// A composed sentence for a kind the table names, or null to keep the quote.
//
// AN UNCORROBORATED KIND COMPOSES NOTHING. The adjudicator marks a kind the
// document cannot support, and both readers of the kind honour that: this one
// falls through to the quote, and consequenceSeverityFloor below returns no
// floor. See the note on consequenceCandidate for the Gujarati NHS letter that
// was rendered as a bailiff threat because the label was used and the sentence
// was not.
function composedConsequenceFor(factConsequence) {
  if (!factConsequence) return null;
  if (factConsequence.corroborated === false) return null;
  const policy = CONSEQUENCE_KIND_POLICY[factConsequence.kind];
  if (!policy) return null;
  return factConsequence.conditional ? policy.may : policy.will;
}

// The severity floor a stated consequence sets, or null.
//
// NEVER LOWERS: the caller merges through raiseSeverityTo, which is the same
// helper the English stakes floor uses, so a document already urgent stays
// urgent whatever kind comes back.
function consequenceSeverityFloor(factConsequence) {
  if (!factConsequence) return null;
  // The floor is the more dangerous of the two readers: a wrong composed
  // sentence is visible on a card, a wrong floor silently reorders how alarming
  // the whole document looks.
  if (factConsequence.corroborated === false) return null;
  const policy = CONSEQUENCE_KIND_POLICY[factConsequence.kind];
  return policy ? policy.floor : null;
}

function raiseSeverityTo(current, floor) {
  const currentRank = SERIOUS_SEVERITY_RANK[current] ?? 0;
  const floorRank = SERIOUS_SEVERITY_RANK[floor] ?? 0;
  return floorRank > currentRank ? floor : current;
}

// Stakes-based detector for genuinely serious document types. Uses specific
// multi-word phrases (never single common words) so routine letters — energy
// bills, council tax annual notices, NHS appointments, benefits reviews and
// Section 13 rent increases — are never escalated. Returns the highest tier
// matched: "urgent" for active enforcement, "high" for serious-but-less-immediate.
function detectSeriousDocumentSignals(lower) {
  const urgentPhrases = [
    "notice of enforcement", "enforcement agent", "take control of your goods",
    "take control of goods", "controlled goods", "warrant of control",
    "writ of control", "high court enforcement", "bailiff",
    "warrant of possession", "warrant for possession",
    "statutory demand", "winding up", "winding-up"
  ];
  const urgentMatched = urgentPhrases.filter((phrase) => lower.includes(phrase));

  // Energy / utility supply disconnection threats. A letter threatening to cut
  // off someone's gas, electricity or energy supply is genuinely serious. Gated
  // on specific multi-word cut-off phrasing so a routine bill that merely
  // mentions "supply" or "energy" is never escalated. Matched against a
  // whitespace-collapsed copy so a phrase wrapped across a line break (real
  // letters wrap, e.g. "install a\nprepayment meter") is still caught.
  const collapsed = lower.replace(/\s+/g, " ");
  const supplyDisconnection = [
    "disconnect your supply", "disconnect your gas", "disconnect your electricity",
    "disconnect your energy", "supply may be disconnected", "supply will be disconnected",
    "supply could be disconnected", "disconnection of your supply",
    "cut off your supply", "cut off your gas", "cut off your electricity",
    "cut off your energy"
  ].some((phrase) => collapsed.includes(phrase));
  const warrantOrForcedInstall = [
    "warrant of entry", "warrant to enter", "enter your property", "enter your home",
    "apply for a warrant", "court for a warrant", "prepayment meter under warrant",
    "install a prepayment meter", "fit a prepayment meter"
  ].some((phrase) => collapsed.includes(phrase));

  // Active disconnection threat backed by a warrant or forced meter install is
  // urgent; a milder "we may disconnect" warning alone is high (added below).
  if (supplyDisconnection && warrantOrForcedInstall) {
    urgentMatched.push("supply disconnection under warrant");
  }

  if (urgentMatched.length > 0) {
    return { tier: "urgent", signals: urgentMatched };
  }

  const highMatched = [];

  // Eviction / possession. "section 21" / "section 8" are gated on a housing
  // context so an unrelated "Section 8 of the ... Act" cannot escalate.
  const housingContext = ["landlord", "tenant", "tenancy", "housing act", "assured shorthold"]
    .some((needle) => lower.includes(needle));
  ["notice seeking possession", "notice to quit", "accelerated possession", "possession proceedings"]
    .forEach((phrase) => { if (lower.includes(phrase)) highMatched.push(phrase); });
  if (housingContext && lower.includes("section 21")) highMatched.push("section 21");
  if (housingContext && lower.includes("section 8")) highMatched.push("section 8");

  // Court / debt enforcement.
  ["letter before claim", "letter before action", "county court", "moneyclaim",
    "attachment of earnings", "charging order"]
    .forEach((phrase) => { if (lower.includes(phrase)) highMatched.push(phrase); });
  if (lower.includes("claimant") && lower.includes("defendant")) highMatched.push("court claim");

  // First-contact / third-party debt collection. Specific third-party phrasing so
  // ordinary bills and "we may refer you to collections" threats are not swept in.
  if (
    lower.includes("debt collection") || lower.includes("debt collector") ||
    lower.includes("debt recovery") || lower.includes("notice of assigned debt") ||
    lower.includes("assigned debt") ||
    ((lower.includes("been passed to") || lower.includes("passed to us")) &&
      (lower.includes("recover") || lower.includes("collect")))
  ) {
    highMatched.push("debt collection");
  }

  // Milder supply disconnection warning, with no warrant or forced install, is
  // high. (The urgent combination was already handled and returned above.)
  if (supplyDisconnection) highMatched.push("supply disconnection");

  // Immigration refusal, only in an immigration context (so "your refund was
  // refused" cannot escalate).
  const immigrationContext = ["home office", "ukvi", "uk visas", "visas and immigration",
    "leave to remain", "leave to enter", "asylum", "immigration"]
    .some((needle) => lower.includes(needle));
  if (immigrationContext) {
    const refused = ["has been refused", "is refused", "application refused", "refusal of leave",
      "refusal of entry", "no right to remain", "removal directions", "you must leave the uk",
      "liable to removal", "deportation"]
      .some((phrase) => lower.includes(phrase));
    if (refused) highMatched.push("immigration refusal");
  }

  if (highMatched.length > 0) {
    return { tier: "high", signals: highMatched };
  }
  return { tier: null, signals: [] };
}

function pickSeverityLevel({ lower, severitySignals, selectedCategory }) {
  if (matchesAny(lower, URGENT_SEVERITY_KEYWORDS)) return "urgent";
  if (matchesAny(lower, HIGH_SEVERITY_KEYWORDS)) return "high";
  if (matchesAny(lower, MEDIUM_SEVERITY_KEYWORDS)) return "medium";
  if (matchesAny(lower, LOW_SEVERITY_KEYWORDS)) return "low";

  if (selectedCategory === "bill") return "medium";
  if (selectedCategory === "medical") return "medium";
  if (selectedCategory === "legal") return "high";
  if (selectedCategory === "work") return "medium";

  if (severitySignals.length > 0) return "medium";
  return "low";
}

function pickUrgencyLevel(lower, severityLevel) {
  if (severityLevel === "urgent") return "immediate";
  if (severityLevel === "high") return "urgent";
  if (severityLevel === "medium") {
    if (lower.includes("today") || lower.includes("within 24 hours")) return "urgent";
    return "soon";
  }
  return "none";
}

function inferSummary(text, trust) {
  if (trust.input_quality === "poor") return "Some parts are unclear in this document.";
  if (trust.document_type === "template") return "This looks like a template with blank fields.";
  if (trust.document_type === "outgoing") return "This looks like a document sent by you.";
  if (trust.document_type === "possible_scam") return "This may be a suspicious message about money or details.";

  const cat = trust.document_category;
  const sender = extractSummaryFirstLineSender(text) || trust.sender_guess;
  // The same selected amount card 5 uses. inferSummary used to run its own
  // selector here, which is how card 1 and card 5 came to name different
  // numbers on one screen. There is now one source.
  const amount = selectedAmountFor(text);
  const date = cat === "appointment"
    ? (extractAppointmentDate(text) || extractDeadline(text))
    : extractDeadline(text);

  if (cat === "bill_or_payment") {
    // In-credit / nothing-to-pay statements must not be framed as a payment demand.
    if (isInCreditOrNoPayment(text)) {
      return sender
        ? `This appears to be a bill from ${sender}. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.`
        : "This appears to be a bill. It looks like your account may be in credit, so there may be nothing to pay. Check the original document to be sure.";
    }
    if (sender && amount && date) return `${sender} appears to be asking you to pay ${amount} by ${date}.`;
    if (amount && date)           return `This appears to be a payment request for ${amount}, due by ${date}.`;
    if (sender && amount)         return `${sender} appears to be asking you to pay ${amount}.`;
    if (sender && date)           return `This appears to be a bill from ${sender}, dated ${date}.`;
    if (amount)                   return `This appears to be a payment request for ${amount}.`;
    if (sender)                   return `This appears to be a bill from ${sender}.`;
    return "This is about a bill or payment request.";
  }

  if (cat === "government") {
    // Headlines stay one short clause: the date lives on the deadline card and in
    // bullets, so it is dropped here rather than padding the Card 1 headline.
    if (sender && amount)         return `${sender} appears to have sent an official notice mentioning ${amount}.`;
    if (sender)                   return `This appears to be an official notice from ${sender}.`;
    if (amount)                   return `This appears to be an official notice mentioning ${amount}.`;
    return "This is from a government or council source.";
  }

  if (cat === "appointment") {
    if (sender && date) return `This appears to be an appointment from ${sender} on ${date}.`;
    if (sender)         return `This appears to be an appointment from ${sender}.`;
    if (date)           return `This appears to be an appointment on ${date}.`;
    return "This is about an appointment.";
  }

  // Generic composition for all other categories when facts are available
  if (sender && amount && date) return `This appears to be from ${sender}, mentioning ${amount} and a date of ${date}.`;
  if (amount && date)           return `This document appears to mention ${amount} and a date of ${date}.`;
  if (sender && amount)         return `This appears to be from ${sender}, mentioning ${amount}.`;
  if (sender && date)           return `This appears to be from ${sender}, with a date of ${date}.`;
  if (sender)                   return `This appears to be from ${sender}.`;

  const summaryByCategory = {
    bill_or_payment: "This is about a bill or payment request.",
    appointment:     "This is about an appointment.",
    employment:      "This is about work or employment.",
    education:       "This is about school or university.",
    housing:         "This is about housing or rent.",
    bank_or_loan:    "This is about banking or a loan.",
    government:      "This is from a government or council source.",
    medical:         "This is a medical document.",
    legal_or_court:  "This is a legal or court document.",
    benefits:        "This is about benefits support.",
    insurance:       "This is about insurance.",
    email:           "This appears to be an email message.",
    unsupported:     "This document is not fully readable.",
    unknown:         "This is a readable formal document."
  };

  return summaryByCategory[cat] || "This is a readable formal document.";
}

// The quality caution that used to sit inside the garbled card 1 answer. Two
// forms, because the caution covers the sender's name only when the card names
// one: widening it on a card that names no sender would claim uncertainty about
// something it never states.
const GARBLED_CAUTION = {
  withSender: "The text quality is too low to read the sender's name, amounts or dates reliably. Check the original document for these details.",
  withoutSender: "The text quality is too low to read specific amounts or dates reliably. Check the original document for these details."
};

function inferGarbledCaution(text, trust) {
  return (extractSummaryFirstLineSender(text) || trust.sender_guess)
    ? GARBLED_CAUTION.withSender
    : GARBLED_CAUTION.withoutSender;
}

function inferGarbledSummary(text, trust) {
  const sender = extractSummaryFirstLineSender(text) || trust.sender_guess;
  const categoryLabels = {
    bill_or_payment: "a bill or payment request",
    government:      "an official notice",
    appointment:     "an appointment notice",
    employment:      "a work or employment document",
    education:       "a school or education document",
    housing:         "a housing or rent document",
    bank_or_loan:    "a banking or loan document",
    medical:         "a medical document",
    legal_or_court:  "a legal or court document",
    benefits:        "a benefits document",
    insurance:       "an insurance document"
  };
  const label = categoryLabels[trust.document_category] || "a formal document";
  // The caution names the sender when there is one. Card 1 was hedging amounts
  // and dates while stating the sender's name flatly, and the name is read from
  // the same damaged text: "Marst0n Holdings Enf0rcement Agents", "EDF Ener9y".
  //
  // The name is kept rather than declined, because on an enforcement notice
  // knowing who is chasing you is worth more than a tidy card, and the reader
  // can match a damaged name to the paper more easily than a missing one. What
  // changes is that the hedge already on the card now covers it.
  //
  // Label tolerance cannot repair a sender: it matches damaged input against a
  // known vocabulary, and a name is not in any vocabulary. There is nothing to
  // recover it to.
  // The caution is a KEY POINT, not part of this sentence. Carrying sender,
  // category and caution in one answer ran 486 to 518px at phone width, over
  // half the panel, and put both garbled documents past the viewport. The
  // key-point layout absorbs it at a fraction of the height, and the answer
  // gets to be the one thing card 1 is for: what the letter appears to be.
  // See GARBLED_CAUTION.
  // "This document appears to be X." rather than "This appears to be X.",
  // because the shorter frame is byte identical to tpl.readable.summary once
  // the caution is removed, and two ids sharing one template make the bank
  // matcher ambiguous. tests/templateBank.test.js catches that.
  return sender
    ? `${sender} appears to have sent ${label}.`
    : `This document appears to be ${label}.`;
}

function inferMostImportantPoint(trust, actions) {
  if (trust.trust_assessment === "low") {
    return "This may be suspicious. Check it first.";
  }

  if (trust.severity_level === "urgent") {
    return "This is urgent. You may need to act today.";
  }

  if (trust.severity_level === "high") {
    return "This is important, but not an emergency.";
  }

  if (trust.severity_level === "medium") {
    return "Action is likely needed soon.";
  }

  // Don't say "information only" if extractActions found a real obligation
  const hasRealAction =
    Array.isArray(actions) &&
    actions.length > 0 &&
    actions[0] !== "No action needed right now.";
  if (hasRealAction) {
    return "This document appears to require an action from you. See what you need to do.";
  }

  return "This looks like information only.";
}

// What the severity level alone implies, with nothing quoted from the page.
//
// Extracted from inferRisk rather than copied, because the garbled branch needs
// exactly this and must never reach the quoting step above it.
function severityRisk(trust) {
  if (trust.severity_level === "urgent") {
    return "Ignoring this could cause serious problems quickly.";
  }
  if (trust.severity_level === "high") {
    return "Ignoring this could lead to penalties or service issues.";
  }
  if (trust.severity_level === "medium") {
    return "Ignoring this may create delays or follow-up action.";
  }
  return "No risk clearly stated.";
}

function inferRisk(text, trust) {
  if (trust.processing_mode === "verification_only") {
    return "You may be tricked into unsafe payment or data sharing.";
  }

  const riskSentence = extractRiskSentence(text);
  if (riskSentence) return riskSentence;

  return severityRisk(trust);
}

function inferContextNote(text, trust) {
  if (trust.document_type === "template") return "Some fields may be missing.";
  if (trust.document_type === "outgoing") return "This may be a copy sent by you.";
  if (trust.input_quality === "poor") return "Upload a clearer version if possible.";
  if (extractReferenceNumbers(text).length > 0) return "Keep the reference number ready.";
  return "Keep this with your records in case you need it later.";
}

function inferHelpfulNote(trust, extractorNote, multiLetterState) {
  // A multi letter upload keeps its own note. Without this the trust branches
  // below would answer "This looks like a normal formal letter." on an upload
  // the engine has just said holds more than one letter.
  if (multiLetterState) return MULTI_LETTER.helpfulNote;

  // A serious document is never described as normal, whatever its trust score.
  // A genuine bailiff or possession letter comes from a real organisation, so
  // trust is high and severity is urgent at the same time, and the trust
  // branches below would answer "This looks like a normal formal letter." on a
  // notice of enforcement. Same shape and position as the buildBanner guard:
  // it sits above the trust branches and excludes low trust, so the scam
  // wording still wins.
  if (trust.is_high_stakes && trust.trust_assessment !== "low") {
    return HIGH_STAKES_NOTE;
  }

  if (trust.trust_assessment === "low") {
    return "Do not use links or numbers in the document until checked.";
  }

  if (trust.document_type === "template") {
    return "This looks like a template with blank fields.";
  }

  if (trust.document_type === "outgoing") {
    return "This looks like an outgoing document.";
  }

  if (trust.trust_assessment === "high") {
    return "This looks like a normal formal letter.";
  }

  if (trust.trust_assessment === "unknown") {
    return "Some details are unclear. Check the original document.";
  }

  return extractorNote || "Some details are missing. Check the original.";
}

// Returns false for sort codes (e.g. 40-22-99) and other NN-NN-NN sequences
// where neither segment pair can represent a valid day/month combination.
// Is a numeric date a date at all? "12-34-56" is a sort code and "20.0.1" is
// not a day and a month, so the two leading groups have to be in range under at
// least one reading.
//
// THE DOT IS NOW A SEPARATOR, because Poland and Romania write 24.06.2026, and
// this guard is what keeps that from admitting sort codes and version strings.
// Splitting on [-/] only meant every dotted candidate returned three parts of
// one, failed the length check, and was rejected whole.
//
// AND THE DIGITS MAY NOT BE ASCII. parseInt returns NaN on a Devanagari digit,
// so "२४/०६/२०२६" was found by the pattern and then thrown away here.
// A fresh compile of one of co-location's date patterns. Fresh because these
// scans are stateful: a shared global regex carries lastIndex between calls and
// two callers would silently skip each other's matches.
function datePattern(kind) {
  const spec = coLocation.DATE_PATTERN_SOURCES[kind];
  return new RegExp(spec.source, spec.flags);
}

function isPlausibleNumericDate(dateStr) {
  const parts = coLocation.toAsciiDigits(dateStr).split(/[-./]/);
  if (parts.length !== 3) return false;
  const a = parseInt(parts[0], 10);
  const b = parseInt(parts[1], 10);
  // Accept if either DD/MM or MM/DD reading produces values in range.
  return (a >= 1 && a <= 31 && b >= 1 && b <= 12) ||
         (a >= 1 && a <= 12 && b >= 1 && b <= 31);
}

function extractDeadline(text) {
  const value = String(text || "");

  // Co-location first. A date governed by a deadline label, with no competing
  // label between them, is the deadline the document states. This is what
  // stops "the year ending 5 April 2026" being read as the deadline when the
  // letter says "You must pay by 31 July 2026", and stops "your next statement
  // will be issued on 9 August" becoming a deadline on a letter that says
  // there is nothing to pay.
  const colocated = coLocation.selectDeadline(value, isPlausibleNumericDate);
  if (colocated) return colocated.value;

  // Keywords that, when appearing within 35 chars before a date, mark it as a deadline.
  // "to pay" catches "Failure to pay the outstanding amount by 24 June 2026" style clauses
  // where "to pay" lands in the window but "pay by" (adjacent) does not.
  //
  // THE LAST ALTERNATIVE USED TO BE A BARE "before", and it is the one entry
  // here that was not a boundary problem but a meaning one. It was already word
  // bounded, so "beforehand" never matched it. The defect was that "before X"
  // marks a boundary in either direction and states no obligation, so the
  // pattern matched correctly and meant the wrong thing. Verified, all eight
  // promoted to deadline, all eight pure mentions:
  //
  //   "Any payments made before 3 July 2026 are not included in this balance."
  //   "Your tenancy began before 1 April 2024."
  //   "Please arrive fifteen minutes before your appointment on 1 July 2026."
  //   "This notice was served before 3 July 2026 under section 8."
  //   "Prices shown were correct before 1 April 2026."
  //   "If you moved in before 1 April 2024 a discount may apply."
  //   "Meter readings taken before 3 July 2026 are estimated."
  //   "Any appeal lodged before 3 July 2026 has already been considered."
  //
  // Deleting it outright was tried and rejected: four genuine obligations reach
  // the engine through this token and nothing else finds them, because
  // co-location binds none of them. So the token is kept and anchored to an
  // obligation verb, which is what D-1 prescribed. Across the thirteen verified
  // sentences the anchor separates the two sets exactly, eight rejected and
  // five kept, with the gap bounded so the verb has to belong to the same
  // clause as the "before".
  const deadlineContext = /\b(?:pay(?:ment)?\s+(?:due|by)|due\s+(?:by|date)|due\b[^\n]{0,22}\bby|no\s+later\s+than|please\s+pay\s+by?|must\s+(?:be\s+)?paid\s+by|deadline|pay\s+by|to\s+pay|payable\s+by|cleared\s+by|received\s+by|remove[d]?\s+by|comply\s+by|complete[d]?\s+by|cleared\s+before|(?:pay|paid|respond|reply|contact\s+us|tell\s+us|notify\s+us|clear|cleared|settle|settled|return|submit|comply|complete|completed|act|vacate|remove|removed)\b[^\n]{0,30}?\bbefore)\b/i;

  // ONE DEFINITION, shared with co-location. These two were independent copies
  // and they were already behind: the long one had no ordinals and no optional
  // separator, so this scan could not see a date the rest of the engine could.
  // Now that findDates reads nine more languages, an independent copy here
  // would mean the keyword fallback stayed English while co-location did not,
  // and card 4 would list a date the deadline scan had never heard of.
  const numericPattern = datePattern("numeric");
  const longPattern = datePattern("long");

  // Skip dates preceded by past-tense language ("was due by", "became due").
  // Those describe an already-overdue amount, not the future compliance date.
  //
  // THERE USED TO BE A SECOND PASS BELOW THIS ONE, identical except that it
  // omitted this guard. Its own comment described it as a "fallback for
  // documents where the only deadline phrase is past-tense", which is a
  // description of deliberately undoing the line above. So the guard was
  // written, fired, and was then overruled by the next loop, and every sentence
  // it rejected was promoted three lines later anyway:
  //
  //   "Your payment was due by direct debit on 3 July 2026 and was returned
  //    unpaid by your bank."
  //     co-location   declines, the adjacency test rejects "by direct debit on"
  //     this pass     skipped, the guard fires
  //     second pass   3 July 2026
  //
  // A guard with an unconditional bypass is worse than no guard, because it
  // reads as protection. Deleted rather than kept: the case it claimed to serve
  // is a letter whose only dated clause is a past-tense receipt, and the honest
  // answer there is no deadline, which is what the cards already word for.
  const backwardLookingContext = /\b(?:was\s+due|were\s+due|became\s+due|overdue\s+since)\b/i;
  for (const pattern of [numericPattern, longPattern]) {
    let match;
    while ((match = pattern.exec(value)) !== null) {
      if (pattern === numericPattern && !isPlausibleNumericDate(match[0])) continue;
      const before = value.slice(Math.max(0, match.index - 35), match.index);
      if (deadlineContext.test(before) && !backwardLookingContext.test(before) &&
          !coLocation.isClaimedByCompetingDateLabel(value, match[0], isPlausibleNumericDate)) {
        return match[0];
      }
    }
  }

  // No date with genuine deadline context was found. Do NOT fall back to the
  // first date in the document: that produced wrong "Due by [letter date]"
  // results. Return null so the renderer shows an honest "no clear due date"
  // message and lists the visible dates instead.
  return null;
}

// Finds the appointment date in a structured appointment block (lines near "Department:",
// "Consultant:", "Location:", "Time:", "Clinic:"). This separates the letter date from the
// actual appointment date when both appear in the document (e.g. "Date: 05 June 2026"
// header vs "Date: Tuesday 01 July 2026" inside the appointment details block).
function extractAppointmentDate(text) {
  const value = String(text || "");

  // The greeting zone rule. An appointment letter carries two dates under the
  // same "Date:" label: the letter date in the header block, and the
  // appointment itself in the body. A date above the greeting is when the
  // letter was written; a date below it is what the letter is about. Without
  // this the card announced the appointment on the day the letter was typed.
  const content = coLocation.selectContentDate(value, isPlausibleNumericDate);
  const letterDate = coLocation.selectLetterDate(value, isPlausibleNumericDate);
  if (content && letterDate && content.value !== letterDate.value) return content.value;

  const lines = value.split(/\r?\n/);
  const appointmentFieldRe = /\b(?:department|consultant|location|clinic|time)\b/i;

  for (let i = 0; i < lines.length; i++) {
    const nearby = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 4)).join(" ");
    if (!appointmentFieldRe.test(nearby)) continue;

    // The same one definition. This scan carried a third copy, older than both
    // the others: no ordinals, no optional separator, no localised months.
    const longMatch = lines[i].match(datePattern("long"));
    if (longMatch) return longMatch[0];

    const numMatch = lines[i].match(datePattern("numeric"));
    if (numMatch && isPlausibleNumericDate(numMatch[0])) return numMatch[0];
  }
  return null;
}

// The action lines Northcue writes, as opposed to sentences lifted out of the
// document. Kept as one list because two rules depend on telling them apart: a
// composed line always outranks a raw one, and on a garbled document a raw one
// is not shown at all.
const COMPOSED_ACTIONS = new Set([
  "Check the payment amount and due date.",
  "Contact the sender using trusted contact details.",
  "Attend the appointment or meeting.",
  "Send the requested documents or form.",
  "No action needed right now.",
  "Check the original document to see whether a response or action is needed.",
  "Check the original document, or with the sender, whether you need to respond or send anything.",
  "Upload a clearer copy if possible.",
  "Upload a clearer photo or a different page if this is a letter or bill.",
  "Check each letter on the original documents.",
  "Verify the organisation on its official website.",
  "Use contact details from an official source.",
  "Keep your money and personal details protected."
]);

function isComposedAction(line) {
  return COMPOSED_ACTIONS.has(String(line || "").trim());
}

// Drops sentences lifted out of the document, keeping the lines Northcue wrote.
// When nothing composed survives, the reader gets the decline this path already
// uses elsewhere rather than silence: the engine can see there is an obligation,
// because "you must" matched, and cannot read it reliably. Saying so is a
// supported card state.
function withoutRawDocumentText(actions, trust) {
  const composed = (Array.isArray(actions) ? actions : []).filter(isComposedAction);
  if (composed.length) return composed;
  return trust.input_quality === "poor"
    ? ["Upload a clearer copy if possible."]
    : ["Check the original document to see whether a response or action is needed."];
}

function extractActions(text, trust) {
  if (trust.processing_mode === "verification_only") {
    return [
      "Verify the organisation on its official website.",
      "Use contact details from an official source.",
      "Keep your money and personal details protected."
    ];
  }

  const lower = String(text || "").toLowerCase();
  const original = String(text || "");
  const actions = [];
  const paymentLikeCategory = ["bill_or_payment", "bank_or_loan", "housing"].includes(trust.document_category);
  const explicitPaymentRequest = /\b(pay|payment|settle|amount due|balance due|overdue|arrears|final notice)\b/.test(lower);
  const hasMoneyAmount = extractMoneyAmounts(text).length > 0;

  if (paymentLikeCategory && explicitPaymentRequest && (hasMoneyAmount || /\b(due|overdue|arrears|final notice)\b/.test(lower))) {
    actions.push("Check the payment amount and due date.");
  }
  if (/\b(please contact|contact us|call us|reply by|email us|phone us)\b/.test(lower)) {
    actions.push("Contact the sender using trusted contact details.");
  }
  if (trust.document_category === "appointment" || /\b(must attend|please attend|your appointment|meeting to attend)\b/.test(lower)) {
    actions.push("Attend the appointment or meeting.");
  }
  if (/\b(send us|submit|provide evidence|complete the form|fill in|return the form)\b/.test(lower)) {
    actions.push("Send the requested documents or form.");
  }

  // Obligation language: extract the actual clause from the document text.
  const obligationPatterns = [
    /\byou\s+(?:must|are\s+required\s+to|need\s+to)\b/i,
    /\b(?:tell|notify|inform)\s+us\b/i,
    /\blet\s+us\s+know\b/i,
    /\breport\s+any\s+changes?\b/i,
    /\brespond\s+by\b/i,
    /\breply\s+(?:by|to\s+this)\b/i
  ];

  // Collect all distinct obligation sentences across the full document.
  // A Set keyed on the 30-char normalised prefix prevents the same sentence
  // being added twice when two patterns happen to match at the same position
  // (e.g. "You must tell us" matching both the "you must" and "tell us" patterns).
  // Capped at 3 obligation sentences to avoid flooding the card on dense policy text.
  const seenObligationPrefixes = new Set();
  for (const pattern of obligationPatterns) {
    if (seenObligationPrefixes.size >= 3) break;
    const globalPat = new RegExp(pattern.source, "gi");
    let match;
    while ((match = globalPat.exec(original)) !== null) {
      // extractSentenceAround preserves leading conditional clauses
      // ("if your details change", "where applicable", etc.)
      const sentence = extractSentenceAround(original, match.index);
      if (sentence.length <= 5) continue;
      // Never surface a payment COMMAND ("You must pay immediately") as an action
      // step. The safe "Check the payment amount and due date." line already covers
      // payment-like documents; non-payment obligations are unaffected.
      if (isPaymentCommand(sentence)) {
        if (!actions.includes("Check the payment amount and due date.")) {
          actions.push("Check the payment amount and due date.");
        }
        continue;
      }
      const prefix = sentence.slice(0, 30).toLowerCase();
      if (seenObligationPrefixes.has(prefix)) continue;
      if (actions.some((a) => a.toLowerCase().includes(sentence.slice(0, 20).toLowerCase()))) continue;
      seenObligationPrefixes.add(prefix);
      actions.push(sentence);
      if (seenObligationPrefixes.size >= 3) break;
    }
  }

  if (actions.length === 0) {
    return ["No action needed right now."];
  }

  // A composed line always outranks a sentence lifted out of the document,
  // whatever order they matched in. normalizeActionLine takes actions[0] as the
  // card 3 headline, so without this the headline depends on which pattern
  // happened to fire first, and a raw sentence can lead the card whenever the
  // composed probes are pushed later or fail. A raw sentence may be a key
  // point; it may never be the instruction. Stable sort, so the existing order
  // within each group is untouched.
  return unique(actions)
    .map((action, position) => ({ action, position }))
    .sort((a, b) => (isComposedAction(b.action) - isComposedAction(a.action)) || (a.position - b.position))
    .map((entry) => entry.action);
}

// One definition of what an amount looks like, shared with co-location. This
// file previously carried a byte-identical copy of the pattern, so the two
// could drift apart and one could be tightened without the other. The engine
// already depends on coLocation for selection; it now depends on it for
// finding too.
function extractMoneyAmounts(text) {
  return coLocation.findAmounts(text).map((amount) => amount.value);
}

// The reference a letter tells the reader to quote.
//
// The previous pattern was /\bref(?:erence)?[:\s-]*[a-z0-9-]{4,}\b/gi and had
// three faults. It required four characters in a class excluding the slash, so
// "Our ref: HG/DR/22981" stopped at "HG" and was missed entirely, and slashed
// references are the convention on exactly the solicitor and council letters
// most likely to carry one. It captured the label into the value, so the stored
// reference read "Reference: EN-77120934". And with no digit requirement it
// returned "reference above" from "quoting the reference above" and "reference
// agencies" from "credit reference agencies".
//
// A reference token is letters and digits joined by slash, hyphen or dot, with
// one optional space-separated all-digit group for "Our ref HG 22981". Spaces
// are not otherwise allowed, so "Reference: EN-77120934 and case number
// CT-88213" yields the first reference rather than one run-on value.
const REFERENCE = /\b(?:our\s+)?ref(?:erence)?\b[:.\s-]{0,3}([A-Za-z0-9]+(?:[/\-.][A-Za-z0-9]+)*(?:\s\d+)?)/gi;

function extractReferenceNumbers(text) {
  const found = [];
  const source = String(text || "");
  let match;
  REFERENCE.lastIndex = 0;
  while ((match = REFERENCE.exec(source)) !== null) {
    const value = match[1].replace(/[.\s]+$/, "");
    // A reference without a digit is a word that happened to follow the label.
    // Filtering here rather than at display keeps every consumer honest.
    if (!/\d/.test(value)) continue;
    if (!found.includes(value)) found.push(value);
  }
  return found;
}

function extractContactDetails(text, trust) {
  if (trust.processing_mode === "verification_only") return [];
  const emailMatches = String(text || "").match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [];
  return unique(emailMatches);
}

// The one phone number the document says to ring, or null.
//
// THIS REACHES THE READER. buildActionCardKeyPoints appends it to card 3 as the
// last key point, through tpl.contact.phone_number, and 17 of the 60 corpus
// documents surface one. The decision about which number, and whether there is
// one at all, is made once here rather than by whatever later reads the text
// and pattern matches.
//
// THE COMMENT THAT USED TO BE HERE SAID "NOTHING RENDERS THIS", and it was
// right when it was written: the stripper replaced any card sentence carrying a
// phone-shaped number and a call-context word with "Use contact details from
// the original document.", so bailiff_enforcement's "You must contact us on
// 0333 320 122 by 3 September 2026." never reached the reader. The commit that
// added the card also added the stripper exemption for sentences byte-identical
// to rules output, and this comment was not updated with it. Corrected 2 August
// 2026. tests/stripperExemption.test.js is what holds that exemption in place;
// if it is narrowed, this field goes back to rendering nowhere.
//
// PHONE NUMBERS ONLY, and that is a rule about what may ever reach a reader
// rather than about what is easy to match. An email or web address on a letter
// is a place to send credentials, and scam_phishing carries
// "barclays-secure-verify.com" three lines above an instruction to confirm a
// card number, PIN and full password. A contact field that grew to cover
// addresses would be one render away from handing over the phishing domain.
//
// THE GATES, all of which suppress rather than qualify:
//
//   GARBLED. A damaged number is worse than none: "O333 32O 122" is something a
//   reader dials, reaches a stranger or nothing, and believes they have done
//   the right thing. Written against trust.garbled_by_ocr directly, because the
//   reading-aid path claims a document before the garble branch runs. This gate
//   is load bearing rather than belt and braces: co-location DOES bind
//   "c0ntact us on" through its label tolerance, so without it ocr_enforcement
//   would carry a number read off text the engine has called unreliable.
//
//   VERIFICATION ONLY. Never help a reader ring a number printed by a document
//   Northcue has decided may be impersonating someone.
//
//   FUSED is applied in applyMultiLetterAttribution alongside every other
//   attributed value, because that is where the decision that nothing may be
//   attributed is made.
//
//   TWO CANDIDATES is applied by selectPhoneNumber, which declines rather than
//   choosing between a payments line and a complaints line.
function extractContactNumber(text, trust) {
  if (trust.garbled_by_ocr) return null;
  if (trust.processing_mode === "verification_only") return null;
  const found = coLocation.selectPhoneNumber(text);
  return found ? found.value : null;
}

function guessSender(text) {
  const match = String(text || "").match(/\b(HMRC|NHS|Council|University|Employer|Department|Bank|Landlord|Magistrates|Tribunal)\b/i);
  return match ? match[0] : null;
}

function normalizeActionLine(actions) {
  if (!Array.isArray(actions) || actions.length === 0) return "No action needed right now.";
  const first = cleanLine(actions[0]);
  if (/^No action needed right now\./i.test(first)) return "No action needed right now.";
  if (/^(Check|Verify|Use|Contact|Attend|Send|Complete|Read|Keep|Upload|Please|Let|Confirm|Return|Submit|Provide|Bring|Call|Email|Visit|Reply|Respond|Update|Tell|Sign|Make|Pay|Arrange|Apply)\b/i.test(first)) return first;
  if (/\b(must|are required to|need to|tell us|notify|report any)\b/i.test(first)) return first;
  return `Check ${first}`;
}

function statusFromTrustAndSeverity(trust) {
  if (trust.severity_level === "urgent") return "urgent";
  if (trust.processing_mode === "verification_only") return "caution";
  if (trust.severity_level === "high") return "caution";
  if (trust.trust_assessment === "high" && trust.severity_level === "low") return "good";
  return "normal";
}

function cleanLine(value) {
  return String(value || "Not clearly stated.").replace(/\s+/g, " ").trim();
}

function matchesAny(text, list) {
  return list.some((entry) => text.includes(entry));
}

function unique(items) {
  return [...new Set(items)];
}

const URGENT_SEVERITY_KEYWORDS = [
  "court action",
  "eviction",
  "winding up",
  "bailiff",
  "criminal prosecution",
  "termination",
  "disconnection",
  "foreclosure",
  "urgent medical appointment",
  "final notice",
  "immediate payment required"
];

const HIGH_SEVERITY_KEYWORDS = [
  "payment overdue",
  "missed deadline",
  "employment warning",
  "benefit problem",
  "housing risk",
  "loan default",
  "medical appointment that may affect care",
  "legal response required",
  "rent arrears",
  // Formal enforcement/consequence language — these terms are caught by
  // RISK_PHRASES (extractRiskSentence) and severity must agree with them.
  // "criminal prosecution" stays in URGENT above; bare "prosecution" covers
  // environmental, council tax, and civil enforcement contexts.
  "prosecution",
  "fixed penalty",
  "county court",
  "debt collection"
];

const MEDIUM_SEVERITY_KEYWORDS = [
  "appointment",
  "routine bill",
  "school action needed",
  "documents to send",
  "form to complete",
  "meeting to attend"
];

const LOW_SEVERITY_KEYWORDS = [
  "information only",
  "confirmation",
  "receipt",
  "newsletter",
  "no action needed",
  "general update"
];

module.exports = { runClearStepsEngine };
