// Facts are CANDIDATES. The engine adjudicates.
//
// The tier 2 proposal assumed a clean handover: the model extracts, the engine
// composes, and the engine's own extractors retire. Measuring all forty corpus
// documents said otherwise. Of the thirteen deadlines the facts found where the
// engine had declined, three were genuine wins, three were caught by the
// date-parse rule, four were in a population the engine's gates null anyway,
// and THREE WERE WRONG in ways the engine already has machinery to prevent:
//
//   failed_direct_debit   "Your payment WAS DUE by direct debit on 3 July 2026
//                          and was returned unpaid by your bank."
//                         A past, failed payment. BACKWARD_LOOKING exists for
//                         exactly this, and the model has no such notion.
//
//   broadband_bill        "This will be taken by Direct Debit on 2 May 2026."
//                         Nothing is owed by the reader on that date. Card 4
//                         would say "Due by" for an automatic collection.
//
//   multi_document        two deadlines from two letters fused in one upload,
//                         which applyMultiLetterAttribution deliberately
//                         declines to compose.
//
// So this module never returns a value the engine's own rules reject. It adds
// reach where the engine's vocabulary is English and its judgement is not.
//
// THREE HARD VALIDATIONS, all promoted from tier 1's debug reporting to gating:
//   V1  verbatim   every free text value must appear in the REDACTED source,
//                  which is the text the model actually saw
//   V2  date parse a value in a deadline role must be a date, not a period.
//                  This is residual 3's catch, at the field.
//   V3  engine     a fact deadline must survive the engine's own guards
//
// FIELD LEVEL, NOT ALL OR NOTHING. Tier 1 validated the whole object, so one
// bad date discarded a correct sender, amount and consequence. Measured, that
// threw away five of forty documents; five of five were the same date rule.
// Here the offending field is dropped and the rest stands.

const { isClaimedByCompetingDateLabel, BACKWARD_LOOKING } = require("./coLocation");
const { LOOKS_LIKE_A_DATE, UK_POSTCODE, STREET_LINE } = require("./documentSignals");
const { AMOUNT_ROLES, DATE_ROLES, OBLIGATION_KINDS, CONSEQUENCE_KINDS } = require("./factSchema");

// Whitespace normalised on both sides, because a sentence quoted out of the
// document can span a line break in the source and arrive as one line. That is
// a formatting difference, not an invention. Case normalised because a
// letterhead in capitals is the same sender.
function normalise(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim().toLowerCase();
}

function appearsVerbatim(sourceNormalised, value) {
  if (typeof value !== "string" || !value.trim()) return false;
  return sourceNormalised.includes(normalise(value));
}

// The sentence a value sits in, for the tense test. Bounded rather than split
// on punctuation because a date can contain a full stop ("03.06.2026").
function sentenceAround(source, index) {
  if (index < 0) return "";
  let start = index;
  while (start > 0 && !/[.!?\n]/.test(source[start - 1])) start -= 1;
  let end = index;
  while (end < source.length && !/[.!?\n]/.test(source[end])) end += 1;
  return source.slice(start, end + 1);
}

// V3. The engine's own guards, applied to a candidate the engine's English
// vocabulary never reached.
//
// This deliberately does NOT require a governing label. Requiring one would
// reject every non-English deadline, which is the whole reason facts exist. It
// applies the NEGATIVE rules only: the ones that say a date is not a deadline
// whatever labels it.
function survivesEngineDeadlineGuards(source, value) {
  const index = source.indexOf(value);
  if (index === -1) return false;

  // A sentence in the past tense states what happened, not what is required.
  // The engine applies this within 24 characters of a label; there is no label
  // here, so the unit is the sentence the date sits in.
  const sentence = sentenceAround(source, index);
  if (BACKWARD_LOOKING.test(sentence)) return false;

  // A date the document has already labelled as something else: a statement
  // date, a billing period, a direct debit collection. The engine keeps this
  // list for its own keyword fallback and it applies here unchanged.
  if (isClaimedByCompetingDateLabel(source, value)) return false;

  return true;
}

// One deadline, or null.
//
// Facts NEVER override an engine deadline. The engine had the co-location
// rules, the forward-only rule and the label vocabulary in front of it; where
// it answered, its answer stands.
function deadlineCandidate({ facts, sourceText, engineDeadline }) {
  if (engineDeadline) return null;
  if (!facts || !Array.isArray(facts.dates)) return null;

  const source = String(sourceText || "");
  const sourceNormalised = normalise(source);

  const usable = facts.dates.filter((entry) => {
    if (!entry || entry.role !== "deadline") return false;
    if (!appearsVerbatim(sourceNormalised, entry.value)) return false;      // V1
    if (!LOOKS_LIKE_A_DATE.test(String(entry.value))) return false;         // V2
    return survivesEngineDeadlineGuards(source, String(entry.value));       // V3
  });

  // TWO SURVIVING CANDIDATES IS NOT AN ANSWER. The same rule selectPhoneNumber
  // already applies: a document naming two states two and names neither as the
  // one, and choosing between them would be Northcue ranking the reader's
  // obligations. multi_document returns exactly this shape.
  return usable.length === 1 ? String(usable[0].value) : null;
}

// The amount the document says is owed, when the engine had to guess.
//
// bestMoneyAmount picks the largest, and unlabelled_amount exists because the
// engine knows that is a guess. A role beats a guess, and only a guess.
// total_due and arrears are both "what is owed". Every other role names an
// amount that is NOT the one a card should lead with: a fee is a component, an
// instalment is a part, a credit is the opposite, and balance and other are too
// vague to be the answer to "how much".
const OWED_ROLES = ["total_due", "arrears"];

function amountCandidate({ facts, sourceText, engineUnlabelled }) {
  if (!engineUnlabelled) return null;
  if (!facts || !Array.isArray(facts.amounts)) return null;

  const sourceNormalised = normalise(String(sourceText || ""));
  const owed = facts.amounts.filter((entry) =>
    entry && OWED_ROLES.includes(entry.role) && appearsVerbatim(sourceNormalised, entry.value));

  // Two amounts both claiming to be what is owed is not an answer, for the same
  // reason two deadlines are not.
  return owed.length === 1 ? { value: String(owed[0].value), role: owed[0].role } : null;
}

// A consequence the document states, where the engine's English phrase list
// found none. The SENTENCE is carried verbatim in this commit, exactly as the
// engine carries its own; composing from consequence.kind is the bank's job.
// A consequence kind that is the SHAPE OF A THREAT A SCAM MAKES.
//
// Found by measurement, not by reasoning. With real facts, polish_phishing
// gained a card 5 quoting "Brak potwierdzenia danych w podanym terminie
// spowoduje zablokowanie konta", which is the phishing message's own deadline
// and its own threat to block the account. Northcue would have amplified it.
//
// The engine never surfaced that because RISK_PHRASES is English and the scam
// detector caught the English twin at six signals. Facts reach past both, and
// the scam detector is still blind to Polish, so the document arrives here with
// nothing having judged it.
//
// account_suspension is excluded for exactly the reason the severity floor
// excludes it. The cost is a genuine utility letter's "your account may be
// suspended" going unquoted, and that is the right way round: the engine's
// English path still catches it, and a missed consequence on a real letter is
// recoverable where an amplified scam threat is not.
const SCAM_SHAPED_KINDS = ["account_suspension"];

// THE KIND AND THE SENTENCE ARE TWO QUESTIONS, and answering them together was
// wrong. The first version returned null whenever the engine had found its own
// consequence, which is right for the SENTENCE (the engine's own reading wins)
// and wrong for the KIND: the severity floor needs to know what sort of
// consequence a document states even when the engine wrote the sentence itself.
//
// Measured: with them fused, a kind reached the engine on two of forty
// documents and floored on none, because the eight documents whose consequence
// the floor most wants to read are exactly the eight where RISK_PHRASES already
// matched. The caller decides whether to use `sentence`; `kind` is always
// reported when it is valid.
// A KIND IS A CLAIM, AND A CLAIM NEEDS CORROBORATION.
//
// The verbatim check proves the model quoted the document. It proves nothing
// about the LABEL the model put on that quote, and the engine composes its
// sentence and its severity floor from the label, not the quote.
//
// WHAT THAT COST. A Gujarati NHS appointment letter says "જો તમે જાણ કર્યા વિના
// ન આવો, તો તમને યાદીમાંથી દૂર કરવામાં આવી શકે છે": if you do not attend without
// telling us, you may be removed from the LIST. The extractor labelled it
// remove_goods, and the engine rendered the label:
//
//     "The document says goods may be taken to cover what is owed."
//
// on a hospital appointment letter, taking severity from low to urgent and
// urgency from none to immediate. A fabricated bailiff threat, stated calmly,
// on a health document. The sentence was quoted correctly. Only the label was
// wrong, and only the label was used.
//
// THE CORROBORATION IS STRUCTURAL, NOT LEXICAL, and that choice was measured.
// Requiring English vocabulary in the sentence drops the Gujarati
// misclassification and also drops three GENUINE non-English enforcement
// letters, taking a Polish eviction warning, a Spanish final notice and a
// Portuguese disconnection notice from high to low. Under-alarming three real
// letters to fix one wrong one is not a trade this makes.
//
// The two kinds that set an URGENT floor are debt enforcement by definition:
// "an enforcement agent may visit" and "goods may be taken TO COVER WHAT IS
// OWED". Both assert a debt. A document stating no money at all cannot support
// either, in any language, and findAmounts reads money in all ten. Measured
// across the corpus: this drops exactly one document, the defect, and costs
// nothing.
//
// NARROW ON PURPOSE. It guards the two urgent-floor kinds and not the five
// high-floor ones, so a misclassification into court_action or disconnection on
// a document that does state money still composes from its label. That residual
// is recorded in KNOWN_ENGINE_DEFECTS.md rather than closed with a lexical rule
// that would cost more than it saves.
//
// THE QUOTE SURVIVES. An uncorroborated candidate is returned with
// corroborated:false rather than dropped, so the reader still gets the
// document's own sentence. It is the LABEL that is refused, which is what was
// wrong. The Gujarati letter keeps "you may be removed from the list", which is
// a true consequence, and loses the bailiff sentence that was never in it.
const DEBT_ENFORCEMENT_KINDS = ["enforcement_agent", "remove_goods"];
const STATES_AN_AMOUNT = /(?:£|GBP)\s?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?/i;

function corroboratesKind(kind, sourceText) {
  if (!DEBT_ENFORCEMENT_KINDS.includes(kind)) return true;
  return STATES_AN_AMOUNT.test(String(sourceText || ""));
}

function consequenceCandidate({ facts, sourceText }) {
  if (!facts || !facts.consequence) return null;

  const consequence = facts.consequence;
  if (!CONSEQUENCE_KINDS.includes(consequence.kind)) return null;
  if (SCAM_SHAPED_KINDS.includes(consequence.kind)) return null;
  if (typeof consequence.conditional !== "boolean") return null;

  const sourceNormalised = normalise(String(sourceText || ""));
  if (!appearsVerbatim(sourceNormalised, consequence.sentence)) return null;

  return {
    kind: consequence.kind,
    // False when the document cannot support the kind. The caller may quote the
    // sentence and may not compose from the label or floor severity by it.
    corroborated: corroboratesKind(consequence.kind, sourceText),
    conditional: consequence.conditional,
    // Normalised to one line. A quoted sentence that spans a line break in the
    // source renders with the break intact otherwise, which reads as two cards
    // worth of text in one field.
    sentence: String(consequence.sentence).replace(/\s+/g, " ").trim()
  };
}

// Field level validation, reported. Every field that failed is named, so a
// document where the facts were mostly good and one field was not is legible
// in the metadata rather than appearing as a blanket rejection.
function validateFactFields(facts, sourceText) {
  const rejected = [];
  if (!facts || typeof facts !== "object") return { rejected: ["facts is not an object"] };

  const sourceNormalised = normalise(String(sourceText || ""));
  const check = (path, value) => {
    if (typeof value !== "string" || !value.trim()) return;
    if (!appearsVerbatim(sourceNormalised, value)) rejected.push(path + " not verbatim");
  };

  check("sender", facts.sender);
  check("reference", facts.reference);
  (facts.amounts || []).forEach((entry, i) => {
    check("amounts[" + i + "]", entry && entry.value);
    if (entry && !AMOUNT_ROLES.includes(entry.role)) rejected.push("amounts[" + i + "].role invalid");
  });
  (facts.dates || []).forEach((entry, i) => {
    check("dates[" + i + "]", entry && entry.value);
    if (entry && !DATE_ROLES.includes(entry.role)) rejected.push("dates[" + i + "].role invalid");
    if (entry && entry.role === "deadline" && !LOOKS_LIKE_A_DATE.test(String(entry.value || ""))) {
      rejected.push("dates[" + i + "] is a period, not a date");
    }
  });
  if (facts.obligation) {
    check("obligation.sentence", facts.obligation.sentence);
    if (!OBLIGATION_KINDS.includes(facts.obligation.kind)) rejected.push("obligation.kind invalid");
  }
  if (facts.consequence) {
    check("consequence.sentence", facts.consequence.sentence);
    if (!CONSEQUENCE_KINDS.includes(facts.consequence.kind)) rejected.push("consequence.kind invalid");
  }
  return { rejected };
}

// The sender the letter itself names, or null. Promoted to a composed,
// protected card 1 line on the founder's order of 6 August 2026, after the
// translate-after-English measurement showed the sender surviving the whole
// pipeline whenever the model happened to write it and appearing 0 of 30
// runs because the model usually did not: the four-key-point lottery. The
// same mechanism that carries the phone number 30 of 30 now carries this.
//
// V1 verbatim applies as everywhere: the value must appear in the source.
// The additional gate is the FIELD LABEL shape from KNOWN_ENGINE_DEFECTS:
// guessSender's recorded defect is returning "Supply address:" where a
// sender belongs, because the top line of a UK bill is routinely a label
// over a value. A label is structurally recognisable, it ends in a colon or
// a labelling noun, and a candidate shaped like one is refused rather than
// composed into a card a reader will trust.
const SENDER_FIELD_LABEL_SHAPE = /(?::\s*$|\b(?:no\.?|number|reference|ref\.?|address)\s*:?\s*$)/i;

function senderCandidate({ facts, sourceText }) {
  if (!facts || typeof facts.sender !== "string") return null;
  const value = facts.sender.replace(/\s+/g, " ").trim();
  if (!value || value.length > 80) return null;
  if (!/\p{L}/u.test(value)) return null;
  if (SENDER_FIELD_LABEL_SHAPE.test(value)) return null;
  // A sender that arrives carrying an address is refused whole. Found by the
  // English benchmark the day this candidate was written: outgoing_letter's
  // fact sender is "Priya Sharma, 14 Sutton Court Road, Hounslow, TW3 8SG",
  // the reader's own name and home, and the validator would rightly reject
  // any card composed from it. The engine never surfaces an address; a
  // candidate is held to the same rule at the door, with the same two
  // patterns the validator uses.
  if (UK_POSTCODE.test(value) || STREET_LINE.test(value)) return null;
  if (!appearsVerbatim(normalise(String(sourceText || "")), value)) return null;
  return value;
}

// The composed card 1 line and its prefix live in ONE place, on purpose: the
// engine calls the composer, and the sanitiser reads the prefix to recognise
// the protected line it must dedupe the model's own sender wording against.
// Defined apart they would drift, and the dedupe would silently stop
// matching the line it exists for.
const SENDER_KEY_POINT_PREFIX = "The document names this sender: ";

function composeSenderKeyPoint(sender) {
  return sender ? SENDER_KEY_POINT_PREFIX + sender + "." : null;
}

module.exports = {
  SCAM_SHAPED_KINDS,
  deadlineCandidate,
  amountCandidate,
  consequenceCandidate,
  senderCandidate,
  composeSenderKeyPoint,
  SENDER_KEY_POINT_PREFIX,
  validateFactFields,
  survivesEngineDeadlineGuards,
  appearsVerbatim,
  sentenceAround
};
