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
const { LOOKS_LIKE_A_DATE } = require("./documentSignals");
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
function amountCandidate({ facts, sourceText, engineUnlabelled }) {
  if (!engineUnlabelled) return null;
  if (!facts || !Array.isArray(facts.amounts)) return null;

  const sourceNormalised = normalise(String(sourceText || ""));
  const owed = facts.amounts.filter((entry) =>
    entry && entry.role === "total_due" && appearsVerbatim(sourceNormalised, entry.value));

  return owed.length === 1 ? String(owed[0].value) : null;
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

function consequenceCandidate({ facts, sourceText, engineHasConsequence }) {
  if (engineHasConsequence) return null;
  if (!facts || !facts.consequence) return null;

  const consequence = facts.consequence;
  if (!CONSEQUENCE_KINDS.includes(consequence.kind)) return null;
  if (SCAM_SHAPED_KINDS.includes(consequence.kind)) return null;
  if (typeof consequence.conditional !== "boolean") return null;

  const sourceNormalised = normalise(String(sourceText || ""));
  if (!appearsVerbatim(sourceNormalised, consequence.sentence)) return null;

  return {
    kind: consequence.kind,
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

module.exports = {
  SCAM_SHAPED_KINDS,
  deadlineCandidate,
  amountCandidate,
  consequenceCandidate,
  validateFactFields,
  survivesEngineDeadlineGuards,
  appearsVerbatim,
  sentenceAround
};
