// Co-location: deciding whether a label and a value are close enough that the
// document itself states the relationship between them.
//
// THE PROBLEM THIS REPLACES. Every extractor returned bare values with no idea
// where in the text they came from, so selection fell back to "the largest" or
// "the first in document order". Those are guesses about meaning dressed as
// rules, and they were wrong in four documented ways:
//
//   council tax     "asking you to pay £1,842.00" when £1,842.00 is labelled
//                   "Total charge for the year" and the amount owed is the
//                   £1,381.50 labelled "Amount to pay".
//   HMRC            deadline "5 April 2026", which is "the year ending", while
//                   the actual deadline is "You must pay by 31 July 2026".
//   in credit       deadline "9 August 2026", which is when the NEXT statement
//                   is issued, on a letter that says there is nothing to pay.
//   NHS appointment "an appointment on 5 June 2026", which is the letter date,
//                   while the appointment is 1 July.
//
// Two of those are money and two are dates, which is the sign this is one
// defect and not four.
//
// THE RULE. A label governs a value only when all three tests pass, applied
// cheapest first:
//
//   1. PROXIMITY   the label is on the same line as the value, or on the line
//                  immediately above it. One line, one relationship.
//   2. SAME BLOCK  they sit in the same blank-line-delimited block. A letter's
//                  header, body and footer are different zones and a label in
//                  one does not reach into another.
//   3. NO COMPETING LABEL BETWEEN
//                  no other label of the same kind sits textually between them.
//                  The nearer binding wins. This is what stops "the year ending
//                  5 April" capturing the date that belongs to "pay by".
//
// Dates carry a fourth, zone rule: a date ABOVE the greeting is the letter
// date, a date BELOW it is content. That alone settles the NHS letter.
//
// WHEN NO LABEL GOVERNS, THIS RETURNS NULL. It never falls back to the largest
// or the first. The caller states what was found without relating it, using the
// decline vocabulary. Refusing to assert is a supported card state; guessing is
// not.

"use strict";

// ---------------------------------------------------------------------------
// Vocabulary. Labels that say "this is the amount owed" or "this is the
// deadline", and competing labels that say the value means something else.
// Competing labels matter as much as governing ones: they are what makes test
// three able to reject a nearer wrong binding.
// ---------------------------------------------------------------------------

// Phrases that say "this number is what you owe". Each one was added because a
// real document in the regression corpus labels its demand that way, and each
// is an unambiguous demand: none of them can describe money the reader
// RECEIVES. That distinction is load bearing. "Your new monthly payment will be
// £742.19" on a DWP letter is money paid TO the reader, so bare "payment" is
// deliberately absent from this list and that document correctly declines.
const AMOUNT_GOVERNS = [
  "amount to pay", "amount due", "amount payable", "amount outstanding",
  "total to pay", "total due", "total payable", "total this month",
  "balance due", "balance outstanding", "outstanding balance", "arrears",
  "please pay", "you must pay", "now due", "to pay"
];

const AMOUNT_COMPETES = [
  "total charge", "total charges", "discount", "less", "instalment", "instalments",
  "payments received", "payment received", "in credit", "credit balance",
  "previous balance", "brought forward", "used", "usage", "vat", "subtotal",
  "sub total", "fee", "fees", "charge for", "paid", "refund"
];

const DATE_GOVERNS = [
  "pay by", "payment due", "due by", "due date", "payable by", "must pay by",
  "must be paid by", "no later than", "deadline", "respond by", "reply by",
  "contact us by", "return by", "submit by", "complete by", "expires",
  "first instalment due by", "due on",
  // Possession and enforcement notices state their compliance date without ever
  // using the word "pay": a possession notice says "clear the arrears by", a
  // warrant says "vacate the property by". Without these the engine reads the
  // date as unlabelled and card 4 lists it as one of several dates to work out,
  // on the documents where the date matters most. Each entry is a specific
  // multi word phrase, never a bare verb, so an ordinary bill cannot match.
  "clear the arrears by", "cleared by", "clear the balance by",
  "bring your account up to date by", "settle the account by",
  "paid in full by", "make payment by",
  "vacate the property by", "vacate by", "leave the property by",
  "remove your goods by"
];

const DATE_COMPETES = [
  "year ending", "year ended", "period", "bill date", "statement date",
  "invoice date", "letter date", "date of issue", "issued on", "next statement",
  "reading taken", "read on", "covering", "from", "printed"
];

// A greeting marks the end of the header zone.
const GREETING = /^\s*(?:dear\b|to whom it may concern)/i;

const MONEY = /(?:£|GBP)\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/gi;

const LONG_DATE = /\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{2,4}\b/gi;
const NUMERIC_DATE = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g;

// ---------------------------------------------------------------------------
// Offsets. The five helpers the engine used all returned bare strings; these
// are the offset-carrying equivalents. Everything below is built on them.
// ---------------------------------------------------------------------------

function lineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") starts.push(i + 1);
  }
  return starts;
}

function lineIndexAt(starts, offset) {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (starts[mid] <= offset) low = mid;
    else high = mid - 1;
  }
  return low;
}

// Block index: blank-line-delimited regions, counted over lines.
function blockIndexes(lines) {
  const blocks = [];
  let block = 0;
  lines.forEach((line) => {
    if (!line.trim()) block++;
    blocks.push(block);
  });
  return blocks;
}

function greetingLineIndex(lines) {
  for (let i = 0; i < lines.length; i++) {
    if (GREETING.test(lines[i])) return i;
  }
  return -1;
}

// Finds every match of a pattern with its offset, line index and block index.
function locate(text, pattern, validate) {
  const starts = lineStarts(text);
  const lines = text.split("\n");
  const blocks = blockIndexes(lines);
  const greeting = greetingLineIndex(lines);
  const found = [];
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  let match;
  while ((match = re.exec(text)) !== null) {
    if (validate && !validate(match[0])) continue;
    const index = match.index;
    const lineIndex = lineIndexAt(starts, index);
    found.push({
      value: match[0].trim(),
      index,
      lineIndex,
      block: blocks[lineIndex],
      line: lines[lineIndex],
      zone: greeting === -1 ? "body" : (lineIndex < greeting ? "header" : "body")
    });
  }
  return found;
}

function findAmounts(text) {
  return locate(String(text || ""), MONEY);
}

function findDates(text, isPlausibleNumericDate) {
  const value = String(text || "");
  const long = locate(value, LONG_DATE);
  const numeric = locate(value, NUMERIC_DATE,
    (raw) => (isPlausibleNumericDate ? isPlausibleNumericDate(raw) : true));
  return long.concat(numeric).sort((a, b) => a.index - b.index);
}

// ---------------------------------------------------------------------------
// The three tests.
// ---------------------------------------------------------------------------

// Where does a label phrase sit? Returns every occurrence with its position.
function locateLabels(text, phrases) {
  const lower = String(text || "").toLowerCase();
  const starts = lineStarts(text);
  const lines = text.split("\n");
  const blocks = blockIndexes(lines);
  const hits = [];
  phrases.forEach((phrase) => {
    let from = 0;
    for (;;) {
      const at = lower.indexOf(phrase, from);
      if (at === -1) break;
      const lineIndex = lineIndexAt(starts, at);
      hits.push({ phrase, index: at, end: at + phrase.length, lineIndex, block: blocks[lineIndex] });
      from = at + phrase.length;
    }
  });
  return hits.sort((a, b) => a.index - b.index);
}

// TEST 1. Same line, or the label on the line immediately above.
//
// For MONEY the label may sit either side of the value on the same line.
// English writes both "Amount to pay: £1,381.50" and "an amount of £486.20
// still to pay", and both state the relationship.
//
// For DATES it may not. Allowing a date label to reach backwards let the "due
// by" at the end of a line capture an earlier date on the same line:
//
//   "A liability order was granted on 3 July 2026 and the full balance is now
//    due by 3 September 2026."   ->  bound 3 JULY, the order date
//
// Dates differ from money because a letter routinely states several, and the
// one that matters is almost always the one a label points forward at. Across
// lines only the label above ever counts, for both kinds: a label on the NEXT
// line belongs to whatever follows it, not to what came before.
function passesProximity(label, value, forwardOnly) {
  if (label.lineIndex === value.lineIndex) {
    return forwardOnly ? label.end <= value.index : true;
  }
  return label.lineIndex === value.lineIndex - 1 && label.end <= value.index;
}

// TEST 1b. Nothing but punctuation and whitespace between a date label and its
// date.
//
// A "<verb> by" literal cannot tell a temporal "by" from an instrumental or
// agentive one, so "pay by", "cleared by" and "paid in full by" were all
// binding the wrong date:
//
//   "You agreed to pay by direct debit on 3 July 2026."          -> 3 July
//   "The arrears were cleared by a third party on 3 July 2026."  -> 3 July
//
// The test is on CONTENT, not on a character count. Real tabular layouts pad
// generously, and a small numeric bound would reject all of these:
//
//   "Pay by:  3 September 2026"                  gap 3
//   "Compliance date          3 September 2026"  gap 10
//   "Deadline .......... 3 September 2026"       gap 12
//
// Letters and digits are what an instrumental reading always brings with it
// ("by direct debit on", "by telephone on 0800 121 4433 about"), and what a
// genuine deadline label never does.
//
// Money is exempt: its label may follow its value, and "still to pay" is
// separated from "£486.20" by a word.
function passesAdjacency(label, value, source) {
  if (label.end > value.index) return true;
  return !/[A-Za-z0-9]/.test(source.slice(label.end, value.index));
}

// TEST 2. Same blank-line-delimited block.
function passesSameBlock(label, value) {
  return label.block === value.block;
}

// TEST 3. No competing label of the same kind anywhere across the label and the
// value.
//
// The span runs from the START of the label, not its end, so a competing label
// sitting inside the label's own extent is caught. With today's short literals
// that span is a few characters, but any future gap-tolerant label would cover
// a whole clause, and a competing label hiding inside it would otherwise be
// invisible to this test.
function passesNoCompetingLabel(label, value, competingHits) {
  const from = Math.min(label.index, value.index);
  const to = Math.max(label.end, value.index);
  return !competingHits.some((other) => other.index >= from && other.index < to);
}

function distanceTo(label, value) {
  return Math.abs(value.index - (label.end <= value.index ? label.end : label.index));
}

// Applies the three tests, cheapest first, and returns the governing label or
// null. Exported so each test can be exercised on its own.
//
// A fourth condition falls out of allowing the label on either side of the
// value: if a COMPETING label binds the same value just as closely, the
// document has two labels claiming one number and states no single
// relationship. "Your account is in credit by £83.86, so there is nothing to
// pay" is the case that forced this. "to pay" follows the value and "in credit"
// precedes it, so neither the between-test nor the nearest-wins rule can
// separate them, and the honest answer is to decline rather than to pick a
// side.
function governingLabel(value, governHits, competeHits, options) {
  const forwardOnly = Boolean(options && options.forwardOnly);
  const source = options && options.source;
  const adjacent = (label) =>
    !source || !forwardOnly || passesAdjacency(label, value, source);
  const binds = (label) =>
    passesProximity(label, value, forwardOnly) &&
    passesSameBlock(label, value) &&
    adjacent(label);

  const candidates = governHits
    .filter(binds)
    .filter((label) => passesNoCompetingLabel(label, value, competeHits))
    // Nearest binding wins when several survive.
    .sort((a, b) => distanceTo(a, value) - distanceTo(b, value));
  if (!candidates.length) return null;

  const rivals = competeHits.filter(binds);
  if (rivals.length) {
    const nearestRival = Math.min(...rivals.map((label) => distanceTo(label, value)));
    if (nearestRival <= distanceTo(candidates[0], value)) return null;
  }
  return candidates[0];
}

// ---------------------------------------------------------------------------
// The single selectors. These replace bestMoneyAmount and firstOrNull.
// ---------------------------------------------------------------------------

// The one amount the document says is owed, or null. Never the largest, never
// the first: a value with no governing label is not an answer.
function selectAmount(text) {
  const source = String(text || "");
  const values = findAmounts(source);
  if (!values.length) return null;
  const governs = locateLabels(source, AMOUNT_GOVERNS);
  const competes = locateLabels(source, AMOUNT_COMPETES);

  for (const value of values) {
    const label = governingLabel(value, governs, competes);
    if (label) return { value: value.value, label: label.phrase, index: value.index };
  }
  return null;
}

// The one date the document says is a deadline, or null.
function selectDeadline(text, isPlausibleNumericDate) {
  const source = String(text || "");
  const values = findDates(source, isPlausibleNumericDate);
  if (!values.length) return null;
  const governs = locateLabels(source, DATE_GOVERNS);
  const competes = locateLabels(source, DATE_COMPETES);

  for (const value of values) {
    // Dates bind forwards only, and adjacently. Money does neither.
    const label = governingLabel(value, governs, competes, { forwardOnly: true, source });
    if (label) return { value: value.value, label: label.phrase, index: value.index };
  }
  return null;
}

// The letter's own date: a date in the header zone, above the greeting. The
// zone rule is what separates a letter date from an appointment date when both
// carry the same "Date:" label.
function selectLetterDate(text, isPlausibleNumericDate) {
  const header = findDates(String(text || ""), isPlausibleNumericDate)
    .filter((value) => value.zone === "header");
  return header.length ? { value: header[0].value, index: header[0].index } : null;
}

// A content date: below the greeting. Used for appointments, where the date
// that matters is the one in the body, not the one in the letterhead.
function selectContentDate(text, isPlausibleNumericDate) {
  const body = findDates(String(text || ""), isPlausibleNumericDate)
    .filter((value) => value.zone === "body");
  return body.length ? { value: body[0].value, index: body[0].index } : null;
}

// Is this date claimed by a label that says it is NOT a deadline?
//
// The engine keeps an older keyword scan as a fallback for the shapes
// co-location cannot bind, and that scan finds real deadlines this rule would
// miss. But it also finds "your next statement will be issued on 9 August" and
// calls it a deadline on a letter that says there is nothing to pay. This lets
// the fallback keep its reach while refusing a date the document has already
// labelled as something else.
function isClaimedByCompetingDateLabel(text, value, isPlausibleNumericDate) {
  const source = String(text || "");
  const occurrences = findDates(source, isPlausibleNumericDate)
    .filter((found) => found.value === value);
  if (!occurrences.length) return false;

  const competes = locateLabels(source, DATE_COMPETES);
  const governs = locateLabels(source, DATE_GOVERNS);

  return occurrences.every((found) => {
    const binds = (label) => passesProximity(label, found) && passesSameBlock(label, found);
    return competes.some(binds) && !governs.some(binds);
  });
}

module.exports = {
  isClaimedByCompetingDateLabel,
  findAmounts,
  findDates,
  locateLabels,
  passesProximity,
  passesSameBlock,
  passesNoCompetingLabel,
  governingLabel,
  selectAmount,
  selectDeadline,
  selectLetterDate,
  selectContentDate,
  AMOUNT_GOVERNS,
  AMOUNT_COMPETES,
  DATE_GOVERNS,
  DATE_COMPETES
};
