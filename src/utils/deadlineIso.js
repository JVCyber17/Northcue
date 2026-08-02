// Turning a date the document states into a machine readable one, or refusing
// to.
//
// WHY THIS EXISTS. Northcue shows the reader the date the letter prints and
// never relates it to today, so a reader is told "Due by 1 April 2026" with no
// hint that the day has gone. Relating the two is arithmetic, and arithmetic
// needs a date, not a string. This file is the conversion, and much more of it
// is about declining than converting.
//
// WHY IT DECLINES SO OFTEN. The engine's deadline field is a string it read off
// a letter, and it accepts strings that are not usable dates. Verified against
// the engine on 31 July 2026, all four accepted as deadlines today:
//
//   "Please pay by 03/06/2026."    -> "03/06/2026"   3 June or 6 March
//   "Please pay by 28 May 26."     -> "28 May 26"    2026 or 1926
//   "Please pay by 5 April 99."    -> "5 April 99"   1999 or 2099
//   "Please pay by 1 April 226."   -> "1 April 226"
//
// Echoing any of those back to the reader is honest, because the reader can
// compare it against the paper. Computing "this is in four days" from one is
// not, because the reader cannot check the arithmetic and the engine cannot
// show its working. So the rule here is the opposite of the extractor's: where
// the extractor accepts anything date shaped, this accepts only what has
// exactly one reading.
//
// THE MONTH MUST BE NAMED, NEVER NUMBERED. That single rule is what excludes
// the whole numeric family. "03/06/2026" is 3 June under UK convention and
// 6 March under US convention, and isPlausibleNumericDate deliberately accepts
// both readings without choosing (see its comment). The two readings are 95
// days apart and land on opposite sides of today. A named month cannot be
// misread, whichever system produced the letter.
//
// A CALENDAR DAY, NOT AN INSTANT. The output is YYYY-MM-DD with no time and no
// zone. A deadline printed on paper is a day, and attaching a zone here would
// bake in a decision that belongs wherever "today" is decided.

"use strict";

// Full names and the standard abbreviations, nothing else. The extractor's
// pattern is (?:jan|feb|...)[a-z]*, which also matches "Mayor" and "Janx"; that
// looseness is right for finding a date and wrong for parsing one.
const MONTHS = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
  may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7,
  september: 8, sept: 8, sep: 8, october: 9, oct: 9, november: 10, nov: 10,
  december: 11, dec: 11
};

// Both long forms, anchored end to end so a date embedded in a longer string
// cannot be parsed out of it. Four digit years only: "28 May 26" has two
// readings a century apart and "1 April 226" has none worth having.
const DAY_FIRST = /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})$/;
const MONTH_FIRST = /^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/;

// Shared with the engine's extractVisibleTimeframes, so the two cannot drift.
// They already did once: coLocation and the engine each carried their own copy
// of the date patterns and disagreed on four shapes after one was corrected,
// which is what put "No clear date was found." on the same card as a date.
// ascii-boundary-ok: every alternative here is an English word, so the boundary
// can only ever sit against English text. Swapping it for a Unicode one would
// change nothing, because "w ciągu 14 dni", "dentro de 14 dias" and
// "14 दिनों के भीतर" are not in this list at all. The limitation is the
// VOCABULARY, not the boundary, and it is recorded as such in
// KNOWN_ENGINE_DEFECTS.md. Widening it is per-language work, not this.
const RELATIVE_TIMEFRAME_SOURCE =
  "\\bwithin\\s+\\d+\\s+(?:days?|weeks?|months?)|\\b(?:today|tomorrow|next week|next month)\\b";  // ascii-boundary-ok: English vocabulary, see above

const WHOLE_RELATIVE_TIMEFRAME = new RegExp("^(?:" + RELATIVE_TIMEFRAME_SOURCE + ")$", "i");

// True when the value is a period rather than a date. housing_letter's deadline
// is the literal string "within 14 days" (D-6), and eviction_possession has
// emitted the bare word "today" (B-8). Neither can be resolved without an
// anchor, and the anchor a letter means ("within 14 days of service") is not
// the letter date and is not in the text.
function isRelativeTimeframe(value) {
  return WHOLE_RELATIVE_TIMEFRAME.test(String(value == null ? "" : value).trim());
}

function toParts(raw) {
  const dayFirst = DAY_FIRST.exec(raw);
  if (dayFirst) return { day: +dayFirst[1], month: dayFirst[2], year: +dayFirst[3] };
  const monthFirst = MONTH_FIRST.exec(raw);
  if (monthFirst) return { day: +monthFirst[2], month: monthFirst[1], year: +monthFirst[3] };
  return null;
}

// The date as YYYY-MM-DD, or null when the value has more than one reading or
// none. Never throws and never guesses.
function toIsoDate(value) {
  const raw = String(value == null ? "" : value).trim();
  if (!raw || isRelativeTimeframe(raw)) return null;

  const parts = toParts(raw);
  if (!parts) return null;

  const month = MONTHS[parts.month.toLowerCase()];
  if (month === undefined) return null;

  // Round trip through the calendar, so 31 February and 31 September decline
  // instead of rolling forward into the next month.
  const date = new Date(Date.UTC(parts.year, month, parts.day));
  if (date.getUTCFullYear() !== parts.year ||
      date.getUTCMonth() !== month ||
      date.getUTCDate() !== parts.day) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

// The same shapes as above, loosened so a value that will NOT convert can still
// be described. toIsoDate requires a four digit year; these do not, because the
// short year is the thing being reported.
const NUMERIC_SHAPE = /^(\d{1,2})[/-](\d{1,2})[/-](\d{1,4})$/;
const DAY_FIRST_SHAPE = /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{1,4})$/;
const MONTH_FIRST_SHAPE = /^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{1,4})$/;

// WHY a date the reader is shown has no single reading, or null when it has one.
//
// This exists so a card can name the problem instead of asserting over it.
// Northcue shows the date verbatim either way, because the reader holding the
// letter can resolve what the engine cannot, and telling them WHICH part is
// unresolved is the difference between a caveat they can act on and a hedge.
//
// Only two reasons, and each is reported only when it is genuinely present:
//
//   "ambiguous_order"   both numbers could be the day, so the value has two
//                       readings. "03/06/2026" is 3 June or 6 March. Reported
//                       ONLY when both are in 1..12; "25/06/2026" has a single
//                       reading even though toIsoDate still declines it, and
//                       claiming ambiguity there would be a false alarm.
//   "incomplete_year"   the year is not four digits, so the century is a guess.
//                       "28 May 26" is 2026 or 1926, "1 April 226" is neither.
//
// Order ambiguity outranks a short year when a value has both, because the two
// readings of the day and month are 95 days apart at worst and a wrong century
// is not a date anyone will act on by mistake.
//
// Everything else returns null, including a value that converts cleanly, a
// relative period, an unknown month word and a day that does not exist in its
// month. Those decline for reasons no short sentence improves on, so the card
// keeps its ordinary wording rather than gaining a caveat it cannot explain.
function unresolvableReason(value) {
  const raw = String(value == null ? "" : value).trim();
  if (!raw || isRelativeTimeframe(raw) || toIsoDate(raw)) return null;

  const numeric = NUMERIC_SHAPE.exec(raw);
  if (numeric) {
    const day = +numeric[1];
    const month = +numeric[2];
    if (day >= 1 && day <= 12 && month >= 1 && month <= 12) return "ambiguous_order";
    return numeric[3].length === 4 ? null : "incomplete_year";
  }

  const dayFirst = DAY_FIRST_SHAPE.exec(raw);
  if (dayFirst) return shortYearOf(dayFirst[2], dayFirst[3]);

  const monthFirst = MONTH_FIRST_SHAPE.exec(raw);
  if (monthFirst) return shortYearOf(monthFirst[1], monthFirst[3]);

  return null;
}

// A named-month value declines for a short year only when the month really is a
// month. "1 Mayor 2026" and "31 February 2026" also fail to convert, and
// neither is a year problem, so neither gets the year sentence.
function shortYearOf(monthWord, year) {
  if (MONTHS[monthWord.toLowerCase()] === undefined) return null;
  return year.length === 4 ? null : "incomplete_year";
}

// The deadline as a calendar day a machine can compare against today, or null.
//
// Takes four named facts rather than the engine's trust and extraction objects,
// so every gate can be exercised on its own. That matters more here than
// elsewhere: a corpus document exercises one gate at a time by accident, and a
// change that opened a different one would show up as "arithmetic went wrong"
// rather than as a failing test naming the gate.
//
// 1. GARBLED, and the caller must pass trust.garbled_by_ocr itself rather than
//    inferring it from which extraction branch ran. buildExtraction tests the
//    reading-aid path BEFORE the garble branch, so the aid path claims a
//    document first and the garble branch never runs on it. ocr_council_tax is
//    exactly that: garbled_by_ocr true, on the aid path, showing "1 April 2026"
//    read off text the engine has itself judged too damaged to trust. A branch
//    test lets it through; a field test does not.
// 2. VERIFICATION ONLY. A suspected scam's date is not an obligation, and the
//    extractor already keeps it out of deadline for that reason. Computing
//    "this is within the next seven days" off a scam's own manufactured urgency
//    would lend Northcue's voice to it. Kept here as well as there because the
//    two protect different things: one the card, one the arithmetic.
// 3. FUSED. Dates from more than one letter cannot be attributed to a letter,
//    so relating any of them to today attributes it too.
// 4. A RELATIVE PERIOD IS NOT A DATE. housing_letter's deadline is the literal
//    string "within 14 days" (D-6), and eviction_possession has emitted the
//    bare word "today" (B-8).
// 5. ONE READING ONLY, via toIsoDate.
//
// What this deliberately does NOT decide is whether the deadline is the RIGHT
// date. D-1, D-2, D-5 and D-8 record deadlines the engine reads correctly off
// the page and attributes wrongly, and no amount of parsing fixes those. A
// consumer of this field inherits those defects; that is an argument for fixing
// them, not for this field pretending they are not there.
function deadlineIsoFor({ garbledByOcr, processingMode, multiLetterState, deadline }) {
  if (garbledByOcr) return null;
  if (processingMode === "verification_only") return null;
  if (multiLetterState === "fused") return null;
  if (isRelativeTimeframe(deadline)) return null;
  return toIsoDate(deadline);
}

// The same calendar day written the same way, for comparing two spellings of
// one date. Returns null for anything that is not a named-month date.
//
// WHY NOT toIsoDate, which already canonicalises. Because the caller that needs
// this, validateDatesComeFromTheEngine, DELIBERATELY rejects a model that
// rewrites "3 September 2026" as "2026-09-03": those fields quote the paper, and
// an ISO string is not what the paper says. Canonicalising through ISO would
// collapse that distinction and silently drop a guard.
//
// A named-month canonical form collapses exactly one thing, the spelling of the
// month, which is the defect it is for: a document printing "22 Apr 2026" and a
// model writing "22 April 2026" are the same day, and the guard was calling the
// second one invented. ISO and numeric forms return null here and keep being
// compared literally, so their behaviour is unchanged.
const MONTH_NAMES_IN_ORDER = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

function canonicalNamedDate(value) {
  const parts = toParts(String(value == null ? "" : value).trim());
  if (!parts) return null;
  const monthIndex = MONTHS[String(parts.month).toLowerCase()];
  // "1 Mayor 2026" parses shape-wise and is not a month.
  if (monthIndex === undefined) return null;
  if (!(parts.day >= 1 && parts.day <= 31)) return null;
  return parts.day + " " + MONTH_NAMES_IN_ORDER[monthIndex] + " " + parts.year;
}

module.exports = {
  deadlineIsoFor,
  isRelativeTimeframe,
  toIsoDate,
  canonicalNamedDate,
  unresolvableReason,
  RELATIVE_TIMEFRAME_SOURCE
};
