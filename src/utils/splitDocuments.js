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

// The same letterhead standing on its own line more than once. Two letters
// from one sender, or a letterhead repeated at the top of each letter. The
// standalone requirement is what keeps the NHS letter safe, where the hospital
// name also appears inside a Location field but never again on its own line.
function hasRepeatedLetterhead(text) {
  const seen = new Map();
  nonEmptyLines(text).forEach((line) => {
    if (!looksLikeLetterhead(line)) return;
    const key = line.toLowerCase();
    seen.set(key, (seen.get(key) || 0) + 1);
  });
  for (const count of seen.values()) {
    if (count > 1) return true;
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
