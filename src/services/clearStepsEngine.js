const crypto = require("node:crypto");

const { trustEvaluatorPrompt } = require("../prompts/trustEvaluatorPrompt");
const { extractorPrompt } = require("../prompts/extractorPrompt");
const { rendererPrompt } = require("../prompts/rendererPrompt");
const { trustSchema } = require("../schemas/trustSchema");
const { extractorSchema } = require("../schemas/extractorSchema");
const { cardSchema, allowedCardIds } = require("../schemas/cardSchema");
const { validateBySchema, validateCards } = require("../utils/validateOutput");
const { splitDocuments } = require("../utils/splitDocuments");

const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

function runClearStepsEngine({ extractedText, fileMeta }) {
  const jobId = fileMeta.jobId || crypto.randomUUID();
  const split = splitDocuments(extractedText);
  const primaryText = split.documents[0] || "";

  const trust = evaluateTrustAndSeverityLayer({
    text: primaryText,
    fileMeta,
    split,
    prompt: trustEvaluatorPrompt
  });

  const extraction = runExtractorLayer({
    text: primaryText,
    trust,
    prompt: extractorPrompt
  });

  const cards = runRendererLayer({
    trust,
    extraction,
    prompt: rendererPrompt
  });

  const banner = buildBanner(trust);
  const structuredResult = buildStructuredResult({
    jobId,
    anonymousSessionId: fileMeta.anonymousSessionId || null,
    text: primaryText,
    trust,
    extraction,
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

function evaluateTrustAndSeverityLayer({ text, fileMeta, split }) {
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
  const scamSignals = detectScamSignals(lower);
  const severitySignals = detectSeveritySignals(lower);
  const seriousSignals = detectSeriousDocumentSignals(lower);

  // Stakes-based floor: genuinely serious document types (active enforcement,
  // eviction/possession, court/debt enforcement, immigration refusal) must never
  // be rated below their tier, however calm their wording. Keyword severity is the
  // base; the floor only ever raises it, never lowers it.
  const baseSeverityLevel = pickSeverityLevel({ lower, severitySignals, selectedCategory });
  const severityLevel = seriousSignals.tier
    ? raiseSeverityTo(baseSeverityLevel, seriousSignals.tier)
    : baseSeverityLevel;
  const urgencyLevel = pickUrgencyLevel(lower, severityLevel);
  const documentCategory = detectDocumentCategory({
    lower,
    selectedCategory,
    isTemplate,
    isOutgoing,
    isUnsupported,
    scamSignals
  });

  const trustAssessment = pickTrustAssessment({
    inputQuality,
    isUnsupported,
    scamSignals,
    distrustSignals,
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
    split
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
    split
  });

  return {
    trust_assessment: trustAssessment,
    severity_level: severityLevel,
    urgency_level: urgencyLevel,
    document_category: documentCategory,
    document_type: documentType,
    processing_mode: processingMode,
    confidence,
    needs_human_review: needsHumanReview,
    review_reason: reviewReason,
    authentic_signals: authenticSignals,
    distrust_signals: distrustSignals,
    scam_signals: scamSignals,
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
    safe_next_step: buildSafeNextStep({ processingMode, severityLevel, trustAssessment })
  };
}

function runExtractorLayer({ text, trust }) {
  if (trust.processing_mode === "unsupported") {
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
      deadline: null,
      risk: "You could lose money or share private data.",
      helpful_note: "Do not use links or numbers from this document until checked.",
      money_amounts: extractMoneyAmounts(text),
      reference_numbers: extractReferenceNumbers(text),
      contact_details: [],
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
    return buildReadableUnsupportedExtraction(text, trust);
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
    return {
      summary: inferGarbledSummary(text, trust),
      most_important_point: inferMostImportantPoint(trust, actions),
      actions,
      deadline: null,
      risk,
      helpful_note: note,
      money_amounts: extractMoneyAmounts(text),
      reference_numbers: extractReferenceNumbers(text),
      contact_details: extractContactDetails(text, trust),
      appeal_rights: [],
      support_options: [],
      confidence: "low",
      needs_human_review: true,
      review_reason: "OCR garbling detected. Amounts and dates may be unreliable.",
      evidence_spans: []
    };
  }

  const deadline = isInCreditOrNoPayment(text)
    ? null
    : trust.document_category === "appointment"
      ? (extractAppointmentDate(text) || extractDeadline(text))
      : extractDeadline(text);
  const summary = inferSummary(text, trust);

  return {
    summary,
    most_important_point: inferMostImportantPoint(trust, actions),
    actions,
    deadline,
    visible_dates: extractVisibleDates(text),
    risk,
    has_consequence: Boolean(consequenceSentence),
    consequence_sentence: consequenceSentence,
    helpful_note: note,
    money_amounts: extractMoneyAmounts(text),
    reference_numbers: extractReferenceNumbers(text),
    contact_details: extractContactDetails(text, trust),
    appeal_rights: [],
    support_options: [],
    confidence: trust.confidence,
    needs_human_review: trust.needs_human_review,
    review_reason: trust.review_reason,
    evidence_spans: []
  };
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
        : trust.garbled_by_ocr
          ? "A date or deadline may appear in this document, but the text quality is too low to read it reliably. Check the original document."
          : (Array.isArray(extraction.visible_dates) && extraction.visible_dates.length > 0
              ? cleanLine(`No clear due date. These dates appear in the document: ${extraction.visible_dates.slice(0, 3).join(", ")}. Check what they refer to.`)
              : "No deadline clearly stated."),
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
      short_answer: cleanLine(inferHelpfulNote(trust, extraction.helpful_note)),
      status: cardStatus
    }
  ];
}

function buildReadableUnsupportedExtraction(text, trust) {
  const signals = extractReadableDocumentSignals(text, trust);
  const summary = signals.topic === GENERIC_TOPIC
    ? "This appears to be a readable formal document. Northcue is not fully trained for this type yet, so use it as a reading aid only."
    : `This appears to be a readable official or formal document about ${signals.topic}. Northcue is not fully trained for this document type yet, so use this as a reading aid only.`;
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
    appeal_rights: [],
    support_options: [],
    confidence: trust.input_quality === "good" ? "medium" : "low",
    needs_human_review: true,
    review_reason: "This readable document type is not fully supported yet.",
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
  const signals = extractReadableDocumentSignals(text, trust);
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
  signals.mostImportantPoint = mostImportant;
  // Do not attach a single calendar date: benefits letters often list several
  // dates and we cannot reliably tell which (if any) is the real deadline.
  signals.primaryDate = null;

  const summary = signals.sender
    ? `This appears to be a letter about benefits or welfare support from ${signals.sender}. Northcue is not fully trained for benefits letters yet, so use this as a reading aid only and check the original document.`
    : "This appears to be a letter about benefits or welfare support. Northcue is not fully trained for benefits letters yet, so use this as a reading aid only and check the original document.";

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
  const actionLine = normalizeActionLine(extraction.actions);
  const deadline = extraction.deadline || null;
  const moneyAmount = bestMoneyAmount(extraction.money_amounts);

  return {
    schema_version: "clearsteps_structured_v1",
    session_id: jobId,
    anonymous_session_id: anonymousSessionId,
    document_type: documentType,
    document_type_label: labelForStructuredDocumentType(documentType),
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

function buildStructuredCards({ trust, extraction, displayCards }) {
  const status = statusFromTrustAndSeverity(trust);
  const actionLine = normalizeActionLine(extraction.actions);
  const deadlineText = extraction.deadline ? `Due by ${extraction.deadline}.` : "No deadline clearly stated.";
  const paymentAmount = firstOrNull(extraction.money_amounts);
  const oldCardById = new Map(displayCards.map((card) => [card.id, card]));
  const deadlineDisplayText = oldCardById.get("when_is_it_due")?.short_answer || deadlineText;

  const cardDefinitions = [
    {
      legacyId: "what_is_this",
      cardType: "what_is_this",
      title: "What is this?",
      explanation: oldCardById.get("what_is_this")?.short_answer || extraction.summary,
      keyPoints: [extraction.most_important_point],
      actionNeeded: null
    },
    {
      legacyId: "what_matters_most",
      cardType: "what_matters_most",
      title: "What matters most?",
      explanation: oldCardById.get("what_matters_most")?.short_answer || extraction.most_important_point,
      keyPoints: trust.severity_signals,
      actionNeeded: null
    },
    {
      legacyId: "what_do_i_need_to_do",
      cardType: "what_do_i_need_to_do",
      title: "What do I need to do?",
      explanation: actionLine,
      keyPoints: Array.isArray(extraction.actions) ? extraction.actions : [],
      actionNeeded: actionLine
    },
    {
      legacyId: "when_is_it_due",
      cardType: "when_does_it_matter",
      title: "When is it due?",
      explanation: deadlineDisplayText,
      keyPoints: extraction.deadline ? [`Check this date on the original document: ${extraction.deadline}.`] : [],
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
        : "Check key details on the original document.",
      keyPoints: buildCheckKeyPoints({ trust, extraction }),
      actionNeeded: null,
      possiblePayment: paymentAmount
    },
    {
      legacyId: "helpful_note",
      cardType: "what_if_i_feel_stuck",
      title: "Helpful note",
      explanation: oldCardById.get("helpful_note")?.short_answer || inferHelpfulNote(trust, extraction.helpful_note),
      keyPoints: [trust.safe_next_step],
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

function buildCheckKeyPoints({ trust, extraction }) {
  const points = [];

  if (extraction.deadline) points.push(`Date: ${extraction.deadline}.`);
  if (firstOrNull(extraction.money_amounts)) points.push(`Amount shown: ${firstOrNull(extraction.money_amounts)}.`);
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

  if (trust.processing_mode === "unsupported") {
    return "This upload may be hard to read.";
  }

  if (cardType === "when_does_it_matter" && !trust.severity_signals.length) {
    return null;
  }

  if (trust.severity_level === "urgent") {
    return "This looks important. Do not ignore it.";
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

function shouldUseReadableUnsupportedAid(text, trust) {
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

function extractReadableDocumentSignals(text, trust) {
  const value = String(text || "");
  const lower = value.toLowerCase();
  const sender = guessDetailedSender(value) || trust.sender_guess || null;
  const topic = inferReadableTopic(value, trust);
  const visibleDates = extractVisibleDates(value);
  const visibleTimeframes = extractVisibleTimeframes(value);
  const dateParts = unique([...visibleDates, ...visibleTimeframes]).slice(0, 4);
  const hasResponseRequest = /\b(please respond|respond by|response|reply by|submit|provide|return|complete|consultation|representation|comment|contact)\b/i.test(value);
  const hasDeadlineLanguage = /\b(deadline|due by|by no later than|no later than|before|within|reply by|respond by|return by|submit by|complete by)\b/i.test(value);
  const primaryDate = dateParts[0] || null;

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
    dateMessage: buildReadableDateMessage({ dateParts, hasDeadlineLanguage }),
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

function buildReadableDateMessage({ dateParts, hasDeadlineLanguage }) {
  if (dateParts.length === 0) {
    return "No clear date was found. Check the original document.";
  }

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
    [["court", "tribunal", "legal"], "a legal or court matter"],
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

  const senderLine = lines.find((line) => (
    /\b(HMRC|NHS|Council|Borough|County|University|School|College|Department|Authority|Bank|Court|Hospital|Clinic|Trust|Employer|Landlord)\b/i.test(line) &&
    line.length <= 90 &&
    !/\b(email|telephone|tel|floor|street|road|postcode)\b/i.test(line)
  ));

  return senderLine ? stripSenderPrefix(senderLine) : null;
}

// Strips a leading "From:" / "To:" / "Sender:" label so a sender never reads
// "appears to be from From: Greenfield Lettings".
function stripSenderPrefix(line) {
  return cleanLine(String(line || "").replace(/^\s*(?:from|to|sender)\s*:\s*/i, ""));
}

function extractVisibleDates(text) {
  const value = String(text || "");
  const matches = [];

  // Numeric dates are validated to exclude sort codes and other NN-NN-NN sequences.
  (value.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g) || []).forEach((m) => {
    if (isPlausibleNumericDate(m)) matches.push(cleanLine(m));
  });

  const longPatterns = [
    /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{2,4}\b/gi,
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{2,4}\b/gi
  ];
  longPatterns.forEach((pattern) => {
    (value.match(pattern) || []).forEach((m) => matches.push(cleanLine(m)));
  });

  return unique(matches).slice(0, 5);
}

function extractVisibleTimeframes(text) {
  const value = String(text || "");
  const matches = value.match(/\bwithin\s+\d+\s+(?:day|days|week|weeks|month|months)|\b(?:today|tomorrow|next week|next month)\b/gi) || [];
  return unique(matches.map(cleanLine)).slice(0, 3);
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

function labelForStructuredDocumentType(documentType) {
  const labels = {
    council_tax_notice: "Council tax notice",
    energy_bill: "Energy bill",
    bill_or_payment_notice: "Bill or payment notice",
    appointment_letter: "Appointment letter",
    unknown: "Unknown document",
    unsupported: "Unsupported document"
  };
  return labels[documentType] || labels.unknown;
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

  // Walk backwards to find the last line that starts with a capital letter.
  let sentenceStart = 0;
  const capLineRe = /(?:^|\n)([A-Z])/g;
  let m;
  while ((m = capLineRe.exec(beforeStr)) !== null) {
    sentenceStart = m.index + (beforeStr[m.index] === "\n" ? 1 : 0);
  }

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
    return stripSenderPrefix(line);
  }
  return null;
}

const RISK_PHRASES = [
  /\bprosecution\b/i,
  /\bfixed\s+penalty\b/i,
  /\bpenalty\s+(?:notice|charge)\b/i,
  /\bbailiff\b/i,
  /\bcounty\s+court\b/i,
  /\blegal\s+action\b/i,
  /\breferred\s+for\s+(?:further\s+)?action\b/i,
  /\bfurther\s+action\s+(?:will|may|might|could)\s+be\s+(?:taken|pursued)\b/i,
  /\bdisconnect(?:ion)?\b/i,
  /\beviction\b/i,
  /\bdebt\s+collect(?:ion|or)\b/i,
  /\bcredit\s+(?:reference|rating|score)\b/i
];

function extractRiskSentence(text) {
  const raw = String(text || "");
  for (const pattern of RISK_PHRASES) {
    const match = pattern.exec(raw);
    if (match) {
      const sentence = extractSentenceAround(raw, match.index);
      if (sentence.length > 5) return normalizeRiskSentence(sentence);
    }
  }
  return null;
}

function normalizeRiskSentence(sentence) {
  // When the document uses certain/assertive consequence language ("will be", "shall be"),
  // frame the output as a report so Northcue is not asserting it in its own voice.
  // Hedged language ("may result", "could lead") passes through unchanged.
  const assertive = /\b(will\s+(?:be|result|lead|face|incur)|shall\s+be)\b/i;
  if (!assertive.test(sentence)) return sentence;
  const lower = sentence.charAt(0).toLowerCase() + sentence.slice(1);
  const body = lower.endsWith(".") ? lower.slice(0, -1) : lower;
  return `The document states that ${body}.`;
}

function buildBanner(trust) {
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
    if (trust.high_stakes_tier === "urgent") {
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

function detectScamSignals(lower) {
  const checks = [
    ["gift card", "Mentions gift card payment."],
    ["crypto", "Mentions crypto payment."],
    ["bank transfer today", "Requests immediate bank transfer."],
    ["act now", "Uses pressure wording."],
    ["final warning", "Uses pressure warning wording."],
    ["click this link", "Requests link-based response."],
    ["confirm your account", "Requests account verification details."],
    ["share your password", "Requests secret details."],
    // Credential phishing: real organisations never ask for a full password, PIN,
    // or full card number, and do not threaten to freeze an account via a link.
    // These are high-precision signals that legitimate bills/letters do not use.
    ["full password", "Asks for a full password, which real organisations never request."],
    ["confirm your password", "Asks you to confirm a password."],
    ["enter your password", "Asks you to enter a password."],
    ["confirm your pin", "Asks you to confirm a PIN."],
    ["enter your pin", "Asks you to enter a PIN."],
    ["card number, pin", "Asks for card number and PIN together."],
    ["card number and pin", "Asks for card number and PIN together."],
    ["pin and full password", "Asks for PIN and password together."],
    ["verify your identity within", "Pressures you to verify your identity within a short time."],
    ["account will be frozen", "Threatens to freeze your account."],
    ["account will be suspended within", "Threatens to suspend your account within a short time."]
  ];

  return checks.filter(([needle]) => lower.includes(needle)).map(([, label]) => label);
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

function looksTemplate(text) {
  return /\[[^\]]+\]|{[^}]+}|<[^>]+>|insert name|insert date|template/i.test(String(text || ""));
}

function looksOutgoing(lower) {
  // "Yours sincerely/faithfully" and "from our team" appear in standard incoming
  // company letters and cannot distinguish direction. Use only signals that are
  // genuinely distinctive of user-authored (outgoing) correspondence.
  return (
    lower.includes("to whom it may concern") ||
    lower.includes("dear sir or madam") ||
    lower.includes("dear sir/madam") ||
    lower.includes("i am writing to request") ||
    lower.includes("i am writing to complain") ||
    lower.includes("i am writing to cancel") ||
    lower.includes("i am writing to dispute") ||
    lower.includes("i wish to cancel") ||
    lower.includes("i wish to complain") ||
    lower.includes("i hereby give notice")
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

  const checks = [
    [["invoice", "bill", "payment reminder", "arrears", "outstanding balance", "overdue", "final demand"], "bill_or_payment"],
    [["appointment", "clinic", "consultation"], "appointment"],
    [["disciplinary", "employment", "termination"], "employment"],
    [["school", "university", "student"], "education"],
    [["loan", "mortgage", "credit"], "bank_or_loan"],
    [["hmrc", "council", "department", "gov.uk"], "government"],
    [["nhs", "hospital", "gp", "medical"], "medical"],
    [["court", "tribunal", "legal", "prosecution", "bailiff"], "legal_or_court"],
    [["benefit", "universal credit", "allowance"], "benefits"],
    [["insurance", "policy"], "insurance"],
    [["email", "subject:", "from:"], "email"]
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

function pickTrustAssessment({ inputQuality, isUnsupported, scamSignals, distrustSignals, authenticSignals }) {
  if (isUnsupported || inputQuality === "poor") return "unknown";
  if (scamSignals.length > 0) return "low";
  if (distrustSignals.length > 1) return "low";
  if (authenticSignals.length >= 2 && distrustSignals.length === 0) return "high";
  return "medium";
}

function pickConfidence({ inputQuality, trustAssessment, split }) {
  if (inputQuality === "poor" || split.isMultiLetterInput) return "low";
  if (trustAssessment === "high" && inputQuality === "good") return "high";
  return "medium";
}

function pickProcessingMode({ trustAssessment, isUnsupported, inputQuality, scamSignals, isTemplate, isOutgoing, split }) {
  if (isUnsupported || inputQuality === "poor") return "unsupported";
  if (trustAssessment === "low" || scamSignals.length > 0) return "verification_only";
  if (trustAssessment === "medium" || isTemplate || isOutgoing || inputQuality === "borderline" || split.isMultiLetterInput) {
    return "caution";
  }
  return "normal";
}

function pickReviewReason({ processingMode, trustAssessment, inputQuality, isTemplate, isOutgoing, split }) {
  if (processingMode === "unsupported") return "Some parts are unclear or unsupported.";
  if (processingMode === "verification_only") return "Suspicious patterns were detected.";
  if (split.isMultiLetterInput) return "Multiple documents may be mixed in one upload.";
  if (isTemplate) return "Template markers were found.";
  if (isOutgoing) return "Looks like an outgoing document.";
  if (inputQuality === "borderline") return "Some details are readable but need checking.";
  if (trustAssessment === "high") return "No major trust issue found.";
  return "Some details need checking before action.";
}

function buildSafeNextStep({ processingMode, severityLevel, trustAssessment }) {
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

const SERIOUS_SEVERITY_RANK = { low: 0, medium: 1, high: 2, urgent: 3 };

// Raise a severity level to at least `floor`, never lowering it.
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
  const amount = bestMoneyAmount(extractMoneyAmounts(text));
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
  const base = sender
    ? `${sender} appears to have sent ${label}.`
    : `This appears to be ${label}.`;
  return `${base} The text quality is too low to read specific amounts or dates reliably. Check the original document for these details.`;
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

function inferRisk(text, trust) {
  if (trust.processing_mode === "verification_only") {
    return "You may be tricked into unsafe payment or data sharing.";
  }

  const riskSentence = extractRiskSentence(text);
  if (riskSentence) return riskSentence;

  if (trust.severity_level === "urgent") {
    return "Ignoring this could cause serious problems quickly.";
  }

  if (trust.severity_level === "high") {
    return "Ignoring this could lead to penalties or service issues.";
  }

  if (trust.severity_level === "medium") {
    return "Ignoring this may create delays or follow-up action.";
  }

  if (trust.input_quality === "poor") {
    return "No risk clearly stated.";
  }

  if (String(text || "").toLowerCase().includes("no action needed")) {
    return "No risk clearly stated.";
  }

  return "No risk clearly stated.";
}

function inferContextNote(text, trust) {
  if (trust.document_type === "template") return "Some fields may be missing.";
  if (trust.document_type === "outgoing") return "This may be a copy sent by you.";
  if (trust.input_quality === "poor") return "Upload a clearer version if possible.";
  if (extractReferenceNumbers(text).length > 0) return "Keep the reference number ready.";
  return "Keep this with your records in case you need it later.";
}

function inferHelpfulNote(trust, extractorNote) {
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
function isPlausibleNumericDate(dateStr) {
  const parts = dateStr.split(/[-\/]/);
  if (parts.length !== 3) return false;
  const a = parseInt(parts[0], 10);
  const b = parseInt(parts[1], 10);
  // Accept if either DD/MM or MM/DD reading produces values in range.
  return (a >= 1 && a <= 31 && b >= 1 && b <= 12) ||
         (a >= 1 && a <= 12 && b >= 1 && b <= 31);
}

function extractDeadline(text) {
  const value = String(text || "");

  // Keywords that, when appearing within 35 chars before a date, mark it as a deadline.
  // "to pay" catches "Failure to pay the outstanding amount by 24 June 2026" style clauses
  // where "to pay" lands in the window but "pay by" (adjacent) does not.
  const deadlineContext = /\b(?:pay(?:ment)?\s+(?:due|by)|due\s+(?:by|date)|due\b[^\n]{0,22}\bby|no\s+later\s+than|please\s+pay\s+by?|must\s+(?:be\s+)?paid\s+by|deadline|pay\s+by|to\s+pay|payable\s+by|cleared\s+by|received\s+by|remove[d]?\s+by|comply\s+by|complete[d]?\s+by|cleared\s+before|before)\b/i;

  const numericPattern = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g;
  const longPattern = /\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4}\b/gi;

  // Priority pass: skip dates preceded by past-tense language ("was due by", "became due") —
  // those describe an already-overdue amount, not the future compliance deadline.
  const backwardLookingContext = /\b(?:was\s+due|were\s+due|became\s+due|overdue\s+since)\b/i;
  for (const pattern of [numericPattern, longPattern]) {
    let match;
    while ((match = pattern.exec(value)) !== null) {
      if (pattern === numericPattern && !isPlausibleNumericDate(match[0])) continue;
      const before = value.slice(Math.max(0, match.index - 35), match.index);
      if (deadlineContext.test(before) && !backwardLookingContext.test(before)) return match[0];
    }
  }

  // Second pass: any deadline context — fallback for documents where the only deadline
  // phrase is past-tense and no forward-looking date exists.
  for (const pattern of [numericPattern, longPattern]) {
    let match;
    while ((match = pattern.exec(value)) !== null) {
      if (pattern === numericPattern && !isPlausibleNumericDate(match[0])) continue;
      const before = value.slice(Math.max(0, match.index - 35), match.index);
      if (deadlineContext.test(before)) return match[0];
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
  const lines = value.split(/\r?\n/);
  const appointmentFieldRe = /\b(?:department|consultant|location|clinic|time)\b/i;

  for (let i = 0; i < lines.length; i++) {
    const nearby = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 4)).join(" ");
    if (!appointmentFieldRe.test(nearby)) continue;

    const longMatch = lines[i].match(/\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4}\b/i);
    if (longMatch) return longMatch[0];

    const numMatch = lines[i].match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/);
    if (numMatch && isPlausibleNumericDate(numMatch[0])) return numMatch[0];
  }
  return null;
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

  return unique(actions);
}

function extractMoneyAmounts(text) {
  return String(text || "").match(/(?:£|GBP)\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/gi) || [];
}

function extractReferenceNumbers(text) {
  return String(text || "").match(/\bref(?:erence)?[:\s-]*[a-z0-9-]{4,}\b/gi) || [];
}

function extractContactDetails(text, trust) {
  if (trust.processing_mode === "verification_only") return [];
  const emailMatches = String(text || "").match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [];
  return unique(emailMatches);
}

function guessSender(text) {
  const match = String(text || "").match(/\b(HMRC|NHS|Council|University|Employer|Department|Bank|Landlord|Court)\b/i);
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
