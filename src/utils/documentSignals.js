// Structural evidence that an upload is an official document, read without
// reading English.
//
// WHY THIS EXISTS. detectProbableNonDocument asks four questions and all four
// are English: a hand-listed vocabulary of organisation words, thirteen English
// reference labels, English month names, and twenty-five English phrases. A
// Polish rent arrears letter carrying a sender on line one, a tenant number on
// line three, a date on line five, an amount, a deadline and a warning that the
// matter may go to court for an eviction order answers no to all four, and is
// refused outright with "This does not look like an official letter or bill."
//
// Measured on 1 August 2026 across four languages: of the seventeen items that
// gate actually judges, it wrongly refused two real letters and correctly
// refused nine non documents. The nine include a cafe menu, a chat screenshot,
// a novel page and a community poster, and every one of them scores ZERO here
// too. Their English-ness was incidental. What was not incidental is the two
// letters.
//
// WHAT THIS IS NOT. It is not a documenthood oracle. A till receipt scores five
// of five, and so does a bill, because structurally they are the same thing: a
// sender, a code, a date, an amount and some labelled fields. Nothing over
// shape can separate them in any language. This is evidence, weighed by the
// caller against the asymmetry the caller already states, which is that wrongly
// declining a real letter is worse than wrongly accepting a menu.
//
// EVERY SIGNAL HERE IS DIGITS, PUNCTUATION OR STRUCTURE. No word list, in any
// language, appears below. Two of the five are already in the engine and were
// already language independent; they are imported rather than re-expressed.

const { findAmounts, findPhoneNumbers } = require("./coLocation");

// A date in any script. Decimal digits are \p{Nd}, month names are just letters,
// and the separators between them vary by language ("15 de junio de 2026",
// "3 września 2026", "mardi 7 juillet 2026"), so the gap is bounded rather than
// named. This is the same rule aiFactExtractionService validates deadlines with.
const LOOKS_LIKE_A_DATE = new RegExp([
  // 03/06/2026 and 03-06-26
  "\\p{Nd}{1,2}\\s*[/-]\\s*\\p{Nd}{1,2}\\s*[/-]\\s*\\p{Nd}{2,4}",
  // 2026-09-03
  "\\p{Nd}{4}-\\p{Nd}{2}-\\p{Nd}{2}",
  // day, month word, year, with up to twelve characters of connective tissue
  // either side for "de" / "września" style joins
  "(?<!\\p{Nd})\\p{Nd}{1,2}[^\\p{Nd}\\n]{0,12}[\\p{L}\\p{M}]{3,}[^\\p{Nd}\\n]{0,12}\\p{Nd}{2,4}(?!\\p{Nd})",
  // month word first: "June 3, 2026"
  "[\\p{L}\\p{M}]{3,}[^\\p{Nd}\\n]{0,4}\\p{Nd}{1,2},?\\s*\\p{Nd}{4}(?!\\p{Nd})"
].join("|"), "u");

// A reference or account code: a standalone token that mixes letters and digits
// across a separator (BH-44712, TW-8830921, FV/2026/118, HG/DR/22981), or a run
// of six or more digits (4471028866). The lookaheads require at least one
// letter and at least one digit, so a plain word and a plain number both fail.
const REFERENCE_CODE = new RegExp([
  "(?<![\\p{L}\\p{Nd}])(?=[\\p{L}\\p{Nd}/-]*\\p{L})(?=[\\p{L}\\p{Nd}/-]*\\p{Nd})[\\p{L}\\p{Nd}]+(?:[/-][\\p{L}\\p{Nd}]+)+(?![\\p{L}\\p{Nd}])",
  "(?<!\\p{Nd})\\p{Nd}{6,}(?!\\p{Nd})"
].join("|"), "u");

// A field label line: "something: value". A letter states its facts in labelled
// fields and a menu, a chat, a novel and a recipe do not.
//
// The label must contain a letter, so "12: 30" is not one, and the value must
// not begin with a slash, so the scheme in "https://example.com/x" is not read
// as a label. Without that guard a phishing message carrying nothing but a link
// would score a structural point for having a link.
const LABEL_LINE = /^[^\n:]{2,32}:\s*(?!\/)\S/;
const LABEL_HAS_LETTER = /[\p{L}\p{M}]/u;
const MIN_LABEL_LINES = 2;

// A link, including the bare-domain form. A phishing message often writes
// "royalmail-redelivery-fee.example.com" with no scheme, so a scheme-only rule
// misses the shape it exists for.
//
// NOT a document signal, and deliberately not in DOCUMENT_SIGNALS below: 14 of
// 60 corpus documents carry a link and four of them are genuine, so a link
// says nothing about whether something is a document. It is here because it is
// structural, language independent and read by the same kind of caller.
const LINK = /(?:https?:\/\/)?(?<![\p{L}\p{Nd}@.])[\p{L}\p{Nd}][\p{L}\p{Nd}-]*(?:\.[\p{L}\p{Nd}-]+)*\.(?:com|net|org|info|xyz|top|online|site|link|uk|eu|pl|es|fr|pt|ro)(?![\p{L}\p{Nd}])/iu;

function hasLink(text) {
  return LINK.test(String(text || ""));
}

function hasCurrencyAmount(text) {
  return findAmounts(String(text || "")).length > 0;
}

// Delegated, not restated. This file used to carry a byte-identical copy of
// coLocation's PHONE and its digit bounds, with a comment saying it was the same
// shape on purpose. It was the same shape until it was not: the international
// fix would have had to be made in two places, or a Polish letter would keep
// losing the structural signal here while the contact field found the number.
// One pattern, one file.
function hasTelephoneNumber(text) {
  return findPhoneNumbers(String(text || "")).length > 0;
}

function hasDateInAnyScript(text) {
  return LOOKS_LIKE_A_DATE.test(String(text || ""));
}

function hasReferenceCode(text) {
  return REFERENCE_CODE.test(String(text || ""));
}

function countLabelLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (!LABEL_LINE.test(trimmed)) return false;
      return LABEL_HAS_LETTER.test(trimmed.slice(0, trimmed.indexOf(":")));
    })
    .length;
}

function hasLabelledFields(text) {
  return countLabelLines(text) >= MIN_LABEL_LINES;
}

const DOCUMENT_SIGNALS = [
  ["currency_amount", hasCurrencyAmount],
  ["telephone_number", hasTelephoneNumber],
  ["date_any_script", hasDateInAnyScript],
  ["reference_code", hasReferenceCode],
  ["labelled_fields", hasLabelledFields]
];

// A POSTAL ADDRESS, in the two shapes that carry one: a UK postcode, and a
// numbered street line. THE ONE COPY, moved here on 6 August 2026 from
// validateStructuredResult's unsafe-advice list when the sender candidate
// needed the same gate: the engine never surfaces an address on any card,
// and a sender fact that arrives as "Name, 14 Sutton Court Road, TW3 8SG"
// (outgoing_letter's real shape, the reader's own name and home) must be
// refused at the candidate exactly as the validator would reject the card.
// Both readers import these; a copy in each drifted the moment one was
// edited, which is the same lesson the date patterns taught coLocation.
const UK_POSTCODE = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/;
const STREET_LINE =
  /\b\d+[A-Za-z]?\s+(?:[A-Z][A-Za-z]*\s+){0,3}(?:Road|Street|Lane|Avenue|Close|Drive|Court|House|Way|Place|Gardens|Terrace|Crescent|Grove|Hill|Park|Square)\b/;

function documentSignalsIn(text) {
  return DOCUMENT_SIGNALS.filter(([, test]) => test(text)).map(([name]) => name);
}

function countDocumentSignals(text) {
  return documentSignalsIn(text).length;
}

module.exports = {
  DOCUMENT_SIGNALS,
  hasLink,
  LOOKS_LIKE_A_DATE,
  REFERENCE_CODE,
  MIN_LABEL_LINES,
  UK_POSTCODE,
  STREET_LINE,
  hasCurrencyAmount,
  hasTelephoneNumber,
  hasDateInAnyScript,
  hasReferenceCode,
  hasLabelledFields,
  countLabelLines,
  documentSignalsIn,
  countDocumentSignals
};
