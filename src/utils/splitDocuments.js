// Multi letter detection.
//
// This answers two different questions, and keeping them apart is the whole
// safety property of the file.
//
//   WHERE ARE THE BOUNDARIES?
//   Only an explicit separator answers this. A bare rule or an inserted
//   "page break" marks a place where something deliberately divided two
//   documents, so the text either side is attributable and the engine may keep
//   the first letter's facts (the first_only shape).
//
//   ARE THERE SEVERAL LETTERS?
//   Weaker shapes answer this without locating a boundary anyone can trust:
//   two greetings, pagination followed by a fresh letter opening, a repeated
//   letterhead. These raise the multi letter flag and leave the text UNSPLIT,
//   which routes the upload into the decline to assert path (the fused shape),
//   where no amount, date or composed sentence survives.
//
// The asymmetry is deliberate. A shape that only half locates a boundary must
// never be used to attribute facts to "the first letter", because when the
// guess is wrong the reader is told the rest of their letter does not exist.
// Detection here exists to reach the safe path, not to enable better guessing.
//
// SHAPES CONSIDERED AND REJECTED, with the evidence:
//
//   Bare pagination. "--- Page 2 ---", "Page 2 of 3" and the form feed
//   character are PAGE boundaries, not LETTER boundaries. Every multi page
//   bill emits them. Splitting on them alone would cut ordinary letters in
//   half and hide the deadline that sits on page two, so pagination only
//   counts when a fresh letter opens immediately after it.
//
//   Repeated letter date lines. Rejected outright. The NHS appointment letter
//   in the regression corpus is a single letter carrying "Date: 5 June 2026"
//   (the letter date) and "Date: Tuesday 1 July 2026" (the appointment). A
//   repeated date label is normal inside one letter and cannot carry this on
//   its own.

const EXPLICIT_SEPARATORS = /\n-{3,}\n|\n={3,}\n|\n\s*page break\s*\n/i;

// A pagination marker occupying a whole line: "Page 2", "Page 2 of 3",
// "--- Page 2 ---", "== Page 2 of 3 ==". Decoration either side is optional.
const PAGE_MARKER_LINE = /^\s*(?:[-=_*—–]{0,8}\s*)?page\s+\d+(?:\s*(?:of|\/)\s*\d+)?\s*(?:[-=_*—–]{0,8})?\s*$/i;

const GREETING_LINE = /^\s*(?:dear|to whom it may concern)\b/i;

// A labelled date line, which is one half of a letter opening.
const DATE_LABEL_LINE = /^\s*(?:bill|invoice|statement|letter|notice|account)?\s*date\s*[:.–—-]/i;

const FORM_FEED = /\f/;

// How many non empty lines after a boundary count as "the opening".
const OPENING_WINDOW = 4;

// A letterhead shaped line: an organisation name standing on its own, not a
// sentence and not a labelled field.
function looksLikeLetterhead(line) {
  const value = String(line || "").trim();
  if (value.length < 3 || value.length > 60) return false;
  if (!/[A-Za-z]/.test(value)) return false;
  if (!/^[A-Z]/.test(value)) return false;          // sentences mid paragraph, and bullets
  if (/[.?!:;,]$/.test(value)) return false;         // a sentence, or a field label
  if (/\d/.test(value) && !/[A-Za-z]{3}/.test(value)) return false;
  if (DATE_LABEL_LINE.test(value)) return false;
  if (PAGE_MARKER_LINE.test(value)) return false;
  if (value.split(/\s+/).length > 7) return false;   // prose, not a letterhead
  return true;
}

function nonEmptyLines(text) {
  return String(text || "").split("\n").map((l) => l.trim()).filter(Boolean);
}

// Does this run of lines open a new letter? Either a greeting, or a letterhead
// standing above a letter date. One alone is not enough: a continuation page
// can carry a running header with either.
function opensNewLetter(lines) {
  const window = lines.slice(0, OPENING_WINDOW);
  if (window.some((line) => GREETING_LINE.test(line))) return true;
  const headIndex = window.findIndex(looksLikeLetterhead);
  if (headIndex === -1) return false;
  return window.slice(headIndex + 1).some((line) => DATE_LABEL_LINE.test(line));
}

// Pagination counts only when a fresh letter opens on the other side of it.
function hasPaginationWithNewLetter(text) {
  const lines = String(text || "").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const isBoundary = PAGE_MARKER_LINE.test(lines[i]) || FORM_FEED.test(lines[i]);
    if (!isBoundary) continue;
    const after = nonEmptyLines(lines.slice(i + 1).join("\n"));
    if (after.length && opensNewLetter(after)) return true;
  }
  return false;
}

// The same letterhead standing on its own line more than once, AND a letter
// actually opening where it repeats.
//
// A REPEATED LINE IS A RUNNING HEADER FAR MORE OFTEN THAN IT IS A SECOND
// LETTER. On 2 August 2026 a real British Gas bill was uploaded to the live
// product and all six cards declined, because "British Gas" stands alone at the
// top of page one and again at the top of page two. That is what a running
// header IS. extractTextFromPdf joins pages with "\n\n" and emits no page
// marker, so nothing else in this file could see the boundary, and the one rule
// with no boundary test was the one that fired.
//
// The repeat alone was never evidence of a second letter. It is evidence of a
// repeated line, and the reasons a genuine single document repeats a line are
// ordinary: a running header, a footer on every page, a Welsh council writing
// bilingually, a dual fuel bill listing "Standing charge" for gas and again for
// electricity. Every one of those was refused outright.
//
// SO IT NOW ASKS THE SAME QUESTION PAGINATION ALREADY ASKS. Pagination has
// always required opensNewLetter on the far side of the boundary, and this rule
// required nothing. That inconsistency was the bug. A repeat counts only when a
// letter opens there: a greeting, or a letterhead standing above a letter date.
//
// MEASURED, across all 63 corpus documents plus six constructed cases. It stops
// fusing four genuine single documents and NEWLY FUSES NOTHING, so it cannot
// reopen the fabrication class A1 closed. All three genuinely multi letter
// corpus documents stay flagged, and two of them never depended on this rule
// anyway: multi_document is caught by pagination and multi_document_split by an
// explicit separator.
//
// WHAT IT STILL GETS WRONG, stated rather than hidden: a continuation page
// carrying a running "Bill date:" header opens what looks like a letter, and
// still fuses. That is a real shape and it needs its own evidence.
function hasRepeatedLetterhead(text) {
  const lines = nonEmptyLines(text);
  const seen = new Map();
  lines.forEach((line, index) => {
    if (!looksLikeLetterhead(line)) return;
    const key = line.toLowerCase();
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push(index);
  });
  for (const positions of seen.values()) {
    if (positions.length < 2) continue;
    // Every occurrence after the first is a candidate boundary. The rule fires
    // only if a letter opens at one of them.
    const opensAtARepeat = positions
      .slice(1)
      .some((index) => opensNewLetter(lines.slice(index)));
    if (opensAtARepeat) return true;
  }
  return false;
}

function splitDocuments(rawText) {
  const text = String(rawText || "").trim();
  if (!text) {
    return { isMultiLetterInput: false, documents: [] };
  }

  // Boundaries we trust enough to attribute facts across.
  const chunks = text
    .split(EXPLICIT_SEPARATORS)
    .map((entry) => entry.trim())
    .filter(Boolean);

  // Multiplicity signals, which never split.
  const hasMultipleGreetings = (text.match(/\bdear\s+\w+/gi) || []).length > 1;
  const multiplicitySignal =
    hasMultipleGreetings ||
    hasPaginationWithNewLetter(text) ||
    hasRepeatedLetterhead(text);

  return {
    isMultiLetterInput: chunks.length > 1 || multiplicitySignal,
    documents: chunks.length ? chunks : [text]
  };
}

module.exports = { splitDocuments };
