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
  "remove your goods by",
  // Statutory and regulatory notices name their date without any verb at all.
  // An environmental health notice, a planning enforcement notice and a school
  // attendance notice all print "Compliance date:" or "Date for compliance:" in
  // a field, and a consultation prints "Response date:". None of them says pay,
  // respond or contact, so nothing above could reach them and the date was read
  // as unlabelled.
  "compliance date", "date for compliance", "response date",
  "act by", "you must act by"
];

const DATE_COMPETES = [
  "year ending", "year ended", "period", "bill date", "statement date",
  "invoice date", "letter date", "date of issue", "issued on", "next statement",
  "reading taken", "read on", "covering", "from", "printed",
  // A collection date is not a deadline. "This will be taken by Direct Debit on
  // 2 May 2026" states when the sender will move the money, and the reader owes
  // nothing on that day. This list is exactly the home for "the document has
  // already labelled this date as something else", and the entry earns its
  // place on the English path too: the keyword fallback could reach the same
  // date. Added 1 August 2026 when the fact extractor labelled it a deadline
  // and card 4 would have said "Due by" for an automatic payment.
  "taken by direct debit on", "direct debit on", "collected on"
];

// DISCONTIGUOUS LABELS. An obligation to make contact almost never puts its
// "by" next to its verb, because the reader has to be told HOW to make contact
// first. The corpus's most urgent document is the whole case:
//
//   "You must contact us on 0333 320 122 by 3 September 2026."
//
// "contact us by" is already a literal, and it cannot see this, because the
// phone number sits between the two halves. Recorded as B-1, and described
// there as arguably the highest-harm single item in the audit: the enforcement
// notice showed main_date null and listed its contact deadline as one of three
// undifferentiated dates.
//
// A spanning entry is a head, a bounded gap, and the temporal "by". The whole
// thing is the label, so label.end lands immediately before the date and every
// existing rule still applies unchanged: forward-only proximity, the adjacency
// test, same block, and the between-test, which reads from label.index and so
// sweeps the entire clause for a competing label.
//
// THE HEAD MUST CARRY A FIRST PERSON PLURAL OBJECT. This is the rule that makes
// the class safe rather than merely narrow. A head like a bare "respond" or
// "reply" lets the SENDER be the subject, and "We will respond to your
// complaint by 3 September 2026" is a service promise, not the reader's
// deadline. With "us" as the object the reader is the only possible actor.
// Verified: the four sender-subject forms above match nothing here.
//
// "pay" was tried as a head and rejected, with the reason recorded as: it
// matches inside "payment" and "payments", so it fired on four corpus
// documents. THAT REASON IS WRONG. spanningPattern wraps every head in \b, and
// /\bpay\b/ does not match inside "payment"; "pay" is three characters, below
// MIN_TOLERANT_LENGTH, so it is escaped literally rather than made tolerant.
// Adding bare "pay" today moves ZERO of the 63 corpus documents.
//
// THE CONCLUSION WAS RIGHT ANYWAY, for the other reason the same comment gives:
// a head must not let the SENDER be the subject. Measured on 2 August 2026,
// bare "pay" reads a deadline out of "We will pay your refund of £83.86 by
// 3 September 2026", which is money moving TO the reader.
//
// So the heads below are the reader-subject forms only. Each one names the
// reader as the actor, so no sender-subject sentence can match, and each was
// checked against "We must pay...", "We should pay...", "The council must
// pay..." and "Your supplier will need to pay you...", none of which match.
//
// WHY THEY WERE NEEDED. The fully supported path is STRICTER than the reading
// aid, so the better supported the document, the more likely its deadline was
// dropped. On a bill, none of these read before this change:
//
//   "Please pay £482.30 by 3 September 2026."
//   "You must pay £482.30 in full by 3 September 2026."
//   "You must pay the balance by 3 September 2026."
//   "Please pay the outstanding balance of £482.30 by 3 September 2026."
//   "You must pay the arrears of £482.30 by 3 September 2026."
//
// Every one is ordinary UK demand wording, and the reason all five failed is
// that "pay ... by" is discontiguous the moment an amount or a noun phrase sits
// between the verb and the date. The corpus never caught it because in all 20
// of its deadline sentences the label is adjacent to the date. See
// CORPUS_STRATEGY.md.
//
// STILL NOT READ, and left alone deliberately: "If we do not hear from you by
// 3 September 2026 we will escalate." A conditional clause is not a demand, and
// a head reaching into one would promote the date in every "if you do not..."
// sentence in UK post.
const DATE_GOVERNS_SPANNING = [
  "contact us", "reply to us", "write to us", "respond to us", "notify us",
  "please pay", "you must pay", "you should pay", "you need to pay",
  "you are required to pay"
];

// The gap bound, measured rather than chosen. Across fifteen realistic UK
// contact clauses the interposed object runs 12 to 48 characters, median 31:
//
//    17   " on 0333 320 122 "                          the corpus, B-1
//    27   " on the number shown above "
//    31   " quoting reference EN-77120934 "
//    34   " using the details on this notice "
//    44   " at the address on the front of this letter "
//    48   " on 020 8583 2000 quoting reference EN-77120934 "
//
// 44 covers fourteen of the fifteen. The one it does not is a clause that
// stacks two objects, a phone number AND a reference, and that exclusion is
// deliberate: the cost of a bound that is too small is a null deadline, which
// the cards already word honestly, and the cost of one that is too large is a
// wrong date asserted confidently. The asymmetry says pick the smaller.
const MAX_LABEL_GAP = 44;

// PHONE NUMBERS. What the number is FOR, in the letter's own words.
//
// A number with no purpose beside it is not surfaced at all. "0333 320 122"
// alone tells a reader nothing about whether to ring it, and a letter's footer
// carries switchboards, fax lines and registered-office numbers that have
// nothing to do with why the letter was sent. Requiring a purpose is what
// separates the number the reader needs from the ones the page happens to
// carry.
//
// Two shapes, because letters write it both ways:
//   direct     "telephone 020 8321 5000", "by calling 0333 200 5100"
//   spanning   "contact us on ...", "contact the Fines Team on ...",
//              "talk to us about your account on ..."
// The spanning gap is where the letter names WHO, which is exactly the part
// that varies, so it reuses the discontiguous-label machinery with "on" as the
// tail instead of "by".
const PHONE_GOVERNS = ["telephone", "call", "calling", "phone", "ring"];
const PHONE_GOVERNS_SPANNING = [
  "contact", "call", "telephone", "phone", "speak to", "talk to", "answer questions"
];

// Phrases that say this number is NOT the one to use. Each ends where its
// governing counterpart ends, so governingLabel's rival rule sees a competing
// label binding exactly as closely and declines, which is the behaviour wanted:
// "Do not call 0906 111 2222" must yield nothing rather than yield the number.
const PHONE_COMPETES = [
  "do not call", "do not use", "do not telephone", "do not contact",
  "never call", "never give", "fax"
];

// A phone number, matched whole or not at all. THE ONE COPY: documentSignals.js
// imports findPhoneNumbers from here rather than restating the pattern, because
// it used to hold a byte-identical duplicate and a fix had to be made twice or
// it was not made.
//
// TWO BRANCHES, TWO DIFFERENT ANCHORS.
//
// THE PLUS, for a number written the international way. Every one of the 54
// documents in the corpus before 2 August 2026 printed a UK national number, so
// nothing had ever asked what happened to +44, +48, +351 or +40, which is how
// the people this product is for write a number down. A genuine Polish clinic
// letter was refused outright as a non document for want of the structural
// signal its own phone number should have given it.
//
// The plus is a STRONGER anchor than the leading zero, not a weaker one, so no
// country code list is needed and none is used: any code matches. Measured
// against 28 shapes that must never match, including account numbers, the UTR,
// NI numbers, sort codes, an IBAN, meter readings, "+44.20 in part payment" and
// "rose by +12.5 per cent": 28 of 28 clean. No reference, account number, UTR,
// NI number, sort code, IBAN or meter reading contains a plus.
//
// THE 00 FORM IS DELIBERATELY NOT MATCHED, and 0(?!0) makes that explicit
// rather than incidental. "00" is two more digits, so it inherits the leading
// zero's whole weakness and adds surface: measured, it wrongly matched a meter
// serial "00 4471 028866", a claim reference "00 8842 0076 1234", an order
// number "0044-1182-7345" and a contract "004471028866112". Restricting to
// known country codes does not save it, because 0044 IS a known country code.
//
// That costs recall on a form real European post uses, and buys back something
// worse than a miss. Before 0(?!0), "0044 118 273 4567" was FOURTEEN digits, so
// the cap below should have declined it whole; instead the global pattern found
// the ten digit prefix "0044 118 273", the cap accepted that, and card 3 told
// the reader to ring a number that was not on the letter. A number not found
// costs nothing. A wrong number is a call to a stranger.
//
// LEADING ZERO, still the false-positive defence for the national branch.
// Account numbers (4471028866), the HMRC UTR (4471 028866), National Insurance
// numbers (QQ 12 34 56 C) and hyphenated bank accounts (8842-0076) all fail it,
// because none begins with a zero followed by a non-zero digit.
//
// THE DIGIT COUNT IS VALIDATED, NOT TRIMMED. [\d\s] is greedy, so
// "on 0800 980 8800 8 August 2026" matches "0800 980 8800 8", one digit too
// many. Trimming back to eleven would be guessing where the number ends, which
// is the mistake MONEY made when it returned the longest well formed prefix of
// a malformed amount and told a reader a bailiff wanted £124 instead of
// £1,247.00. So a candidate outside the range is declined whole.
//
// The international range is wider because a country code is part of the count:
// +48 22 123 45 67 is eleven digits, +44 20 8583 4242 is twelve, and
// +880 2 1234 5678 is thirteen.
const PHONE = /\+\d{1,3}[\s.-]?(?:\(0\)[\s.-]?)?\d[\d\s.-]{5,13}\d|(?<![\d+])0(?!0)\d[\d\s]{7,12}\d\b/g;
const PHONE_DIGITS_MIN = 10;
const PHONE_DIGITS_MAX = 11;
const PHONE_INTL_DIGITS_MAX = 15;

function isInternationalForm(raw) {
  return String(raw).trim().startsWith("+");
}

function hasUsableDigitCount(raw) {
  const digits = String(raw).replace(/\D/g, "").length;
  const max = isInternationalForm(raw) ? PHONE_INTL_DIGITS_MAX : PHONE_DIGITS_MAX;
  return digits >= PHONE_DIGITS_MIN && digits <= max;
}

// ---------------------------------------------------------------------------
// OCR tolerance, for LABELS ONLY.
//
// A phone photograph substitutes digits for letters constantly, and the corpus
// shows it: "Am0unt due", "Am0unt outstanding", "Prev1ous balance", "c0ntact
// us". A damaged label is invisible to a literal match, so a document can carry
// a perfectly readable £214.63 next to a label the engine cannot see, and
// decline.
//
// A CHARACTER CLASS PER LETTER, not a substitution map. The digit 1 is
// ambiguous between i and l and both readings are needed ("B1ll" wants i,
// "C1ear" wants l), so no single fold can serve both. A class matches exactly
// one character, so a pattern stays 1:1 in length and every offset survives,
// which is what lets co-location keep measuring against the original string.
//
// NEVER FOLD THE DOCUMENT WHOLESALE. Folding the text destroys the values the
// labels point at: £214.63 becomes £2l4.6e and findDates drops from 2 to 0. The
// tolerance lives in the label pattern; the document is never rewritten.
//
// MINIMUM LENGTH FIVE, and this is evidence, not caution. Across 150,000
// generated UK reference strings the full vocabulary produced 54 false matches,
// all from two short entries: "less" matched inside "Reference: MZMZ-43713556"
// (1355 folds to less) and "fee" inside "Policy number: SF33485198". At five
// characters and above the collisions go to zero and all 25 corpus recoveries
// are kept, because neither short entry recovers anything. This is the same
// hazard that keeps the classification vocabularies out of scope entirely,
// where "gp" would fold to [g9]p and match "9p per day" on every energy bill.
const CONFUSABLE = { o: "o0", i: "i1", l: "l1", e: "e3", a: "a4", s: "s5", g: "g9", b: "b6" };
const MIN_TOLERANT_LENGTH = 5;

function tolerantLabelSource(phrase) {
  return phrase.split("").map((ch) =>
    (CONFUSABLE[ch] ? "[" + CONFUSABLE[ch] + "]" : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  ).join("");
}

// EVERY ENTRY IS MATCHED AS A WHOLE WORD.
//
// A phrase compiled as a bare substring is safe for a distinctive multi word
// literal and unsafe for one whose text is a prefix or a suffix of ordinary
// English. Five entries were verified colliding against the engine, and the
// pipe marks what matched:
//
//   "act by"           "you may cont|act by| telephone", "the ex|act by|-law",
//                      "this will imp|act by| a small amount"
//   "response date"    "the |response date|d 3 July 2026 was received"
//   "compliance date"  "non |compliance date|s back to 3 July 2026"
//   "less"             "un|less| payment is received", on legal_solicitor
//                      and insurance_letter in the corpus today
//   "period"           "a |period|ic charge applies"
//
// THE TWO KINDS FAIL IN OPPOSITE DIRECTIONS, which is why bounding them took
// two commits rather than one. A GOVERNS entry that over-matches ASSERTS a
// wrong answer, which is the D-1 shape; the first three above are governs
// entries and were bounded when they were added. A COMPETES entry that
// over-matches makes co-location DECLINE, losing a right answer rather than
// inventing a wrong one:
//
//   "Amount to pay now: £120.00"               -> £120.00
//   "Amount to pay unless waived: £120.00"     -> null   "less" inside "unless"
//   "Please pay by periodic order 3 Sep 2026"  -> null   "period" inside "periodic"
//
// A decline is the safe direction, which is why the competes entries were left
// alone while the governs ones were fixed. They are not harmless though.
// isClaimedByCompetingDateLabel reads the same hits, and there a false competes
// match on the line above a date SUPPRESSES a genuine deadline on the
// reading-aid path. school_periodic in the corpus is that case.
const labelPatterns = new Map();
function labelPattern(phrase) {
  let pattern = labelPatterns.get(phrase);
  if (!pattern) {
    const body = phrase.length >= MIN_TOLERANT_LENGTH
      ? tolerantLabelSource(phrase)
      : phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    pattern = new RegExp("\\b" + body + "\\b", "gi");
    labelPatterns.set(phrase, pattern);
  }
  return pattern;
}

// Compiles a discontiguous entry: head, bounded gap, temporal "by".
//
// THE QUANTIFIER MUST BE LAZY, and this is the detail the whole pattern turns
// on. A greedy gap reaches for the LAST "by" within range, so a line carrying a
// second one loses the date entirely:
//
//   "You must contact us on 0333 320 122 by 3 September 2026 or pay by card."
//     greedy   label ends after "pay by", the date now sits BEHIND the label,
//              forward-only proximity rejects it, deadline null
//     lazy     label ends after the first "by", binds 3 September 2026
//
// Worth being exact about what this does and does not fix, because the earlier
// note on this overstated it: on the flagship line as the corpus actually
// writes it, greedy and lazy agree, because that line contains only one "by".
// Greedy fails on the very next realistic variant of it, not on it.
//
// The gap is [^\n], so a discontiguous label never spans a line. Proximity
// already allows a label on the line above a date; a label that could also run
// ACROSS lines would make its own extent, and therefore the between-test's
// span, unbounded in the one direction that matters.
//
// Both ends are word bounded. Without them "contact us" matches inside
// "contact usage" and "notify us" inside "notify usual contacts", which is the
// same substring hazard the tier 2 literals hit.
// The tail is a parameter because two different kinds of label have this shape.
// A deadline is "<obligation> ... by <date>"; a phone number is "<contact verb>
// ... on <number>", where the gap names who to contact. Same structure, same
// three tests, different preposition.
const spanningPatterns = new Map();
function spanningPattern(head, tail) {
  const key = head + " ... " + tail;
  let pattern = spanningPatterns.get(key);
  if (!pattern) {
    const body = head.length >= MIN_TOLERANT_LENGTH
      ? tolerantLabelSource(head)
      : head.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    pattern = new RegExp(
      "\\b" + body + "\\b[^\\n]{0," + MAX_LABEL_GAP + "}?\\b" + tail + "\\b", "gi");
    spanningPatterns.set(key, pattern);
  }
  return pattern;
}

// A greeting marks the end of the header zone. Tolerant for the same reason as
// the labels: "D3ar Patient" moved the NHS appointment date back to the letter
// date, re-opening the greeting-zone rule with one damaged character.
const GREETING = new RegExp("^\\s*(?:" + tolerantLabelSource("dear") + "\\b|" +
  tolerantLabelSource("to whom it may concern") + ")", "i");

// AND A GREETING IN ANY SCRIPT, because the rule above is English and the zone
// it draws is what separates a letter date from an appointment date.
//
// THE DEFECT THIS CLOSES. A Gujarati NHS letter labels its letter date
// "પત્રની તારીખ:" and its appointment date "તારીખ:". Neither label is English,
// GREETING never matched "પ્રિય શ્રીમતી Patel,", so no header zone existed, every
// date was "body", and the first one won. Card 4 read "The document shows 12
// June 2026 as the date that matters" on a letter about an appointment on 14
// July. The Bengali screening invitation did the same. A reader could miss a
// screening.
//
// A GREETING IS SHORT, ENDS IN A COMMA, AND IS NOT A LABELLED FIELD. No word
// list, in any language, which is the same discipline documentSignals.js keeps.
// Measured across all 70 corpus documents: the shape appears 14 times and every
// one of the 14 is a genuine greeting, in seven languages:
//
//   Szanowni Państwo,        Estimado cliente,      Madame, Monsieur,
//   Exmo. Senhor Ferreira,   પ્રિય શ્રીમતી Patel,        प्रिय श्री Sharma,
//   প্রিয় মিসেস Begum,          ਸਤਿਕਾਰਯੋਗ ਸ. Singh,
//
// Zero false positives, and NO ENGLISH DOCUMENT CARRIES IT, because English
// writes "Dear Mr Vaidya" with no trailing comma. So this only ever adds a zone
// where there was none; it cannot move an English letter.
//
// The colon test is what keeps it off a labelled field, and the length bound is
// what keeps it off a sentence that happens to end in a comma before a line
// break. Tried second, after the English rule, so a letter carrying both is
// still cut at the English greeting.
const STRUCTURAL_GREETING_MAX = 45;
function looksLikeStructuralGreeting(line) {
  const value = String(line || "").trim();
  if (!/,$/.test(value)) return false;
  if (value.length >= STRUCTURAL_GREETING_MAX) return false;
  return value.indexOf(":") === -1;
}

// An amount, matched whole or not at all.
//
// The previous pattern was /(?:£|GBP)\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/ and both
// tails were optional, so it matched the longest well formed PREFIX of a
// malformed amount instead of rejecting it. That turned ordinary inputs into
// confident wrong answers:
//
//   "Amount outstanding: £1247.00"   -> "£124"    a tenfold understatement
//   "Amount outstanding: £1.247.00"  -> "£1.24"   out by a thousand
//   "Amount outstanding: £1,2O7.00"  -> "£1"
//
// The first of those is not OCR damage at all. Plenty of UK billing systems
// print a four figure amount with no thousands separator, so the engine was
// telling a reader that a bailiff wanted £124 when the notice said £1,247.00,
// with input_quality "good" and confidence "high" because nothing in the
// pipeline had any reason to doubt it.
//
// Two changes. Unseparated thousands are now accepted, so £1247.00 reads whole.
// And the match must not be followed by another digit, by a separator carrying
// digits, or by a letter, so a malformed amount declines instead of truncating.
// Declining is safe: an amount with no value is simply not asserted. Asserting
// a prefix is not.
const MONEY = /(?:£|GBP)\s?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?(?!\d|[.,]\d|[A-Za-z])/gi;

// A long form date, with the separators optional.
//
// OCR loses the space between a day and a month routinely, and the two OCR
// documents in the corpus both show it: "20August 2026", "3September 2026",
// "4May 2026", "28May 2026". Requiring \s+ meant those documents produced ZERO
// parseable dates, so no amount of vocabulary or co-location work could reach
// them. There was nothing to bind.
//
// The left boundary is the whole safety of this change. \b alone is not enough
// once the separator is optional: in "£1,04720 August 2026" there is no word
// boundary inside "04720", but a naive optional separator would still let the
// pattern start at "20" and read a date out of the middle of an amount. The
// lookbehind requires that whatever precedes the day is not a digit and not a
// decimal separator carrying digits, so a date can never be carved out of a
// longer number.
const LONG_DATE = /(?<![\d.,])\b\d{1,2}(?:st|nd|rd|th)?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s*\d{2,4}\b/gi;

// Month-first order, "April 1, 2026". Kept separate because its separators must
// stay mandatory. With \s* it reads "May 2026" as day 20 of May in year 26, and
// a bare month and year is one of the commonest things a letter writes: "Period
// covered May 2026 to June 2026" would yield two dates that are not dates.
// Day-first has no such collision, because a day-first match must begin with a
// digit and a bare month cannot.
const MONTH_FIRST_DATE = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{2,4}\b/gi;
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
  // Only when the English rule found nothing, so an English letter can never be
  // cut anywhere but at its own "Dear".
  for (let i = 0; i < lines.length; i++) {
    if (looksLikeStructuralGreeting(lines[i])) return i;
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

// A date as the reader should SEE it, never as it is matched.
//
// The optional separator recovers "1April 2026" from OCR, which is the right
// value, but the paper in the reader's hand says "1 April 2026". Northcue shows
// values verbatim so the screen matches the paper, and here verbatim-from-OCR
// is not verbatim-from-paper. Restoring the space serves that rule rather than
// breaking it.
//
// This is called at render time only. Extraction, locateLabels, all three
// co-location tests and every offset run on the original string, so
// normalisation cannot change what matches what. tests/valueFinding.test.js
// asserts that directly.
const MONTH_NAME = /^(\d{1,2})(st|nd|rd|th)?\s*([A-Za-z]+?)\s*(\d{2,4})$/;

function formatDateForDisplay(value) {
  const raw = String(value == null ? "" : value).trim();
  const parts = MONTH_NAME.exec(raw);
  if (!parts) return raw;
  const [, day, ordinal, month, year] = parts;
  return day + (ordinal || "") + " " + month + " " + year;
}

// The one definition of what a date looks like. The engine's extractVisibleDates
// carried an independent copy of these patterns, and the two drifted the moment
// one was corrected: after the separator fix they disagreed on four shapes, and
// that disagreement is what put "No clear date was found." on the same card as
// "Check this date on the original document: 1April 2026."
//
// This is the union of both copies. Day-first gains ordinals, month-first order
// is new to co-location, and both were previously only in the engine's copy.
function findDates(text, isPlausibleNumericDate) {
  const value = String(text || "");
  const long = locate(value, LONG_DATE);
  const monthFirst = locate(value, MONTH_FIRST_DATE);
  const numeric = locate(value, NUMERIC_DATE,
    (raw) => (isPlausibleNumericDate ? isPlausibleNumericDate(raw) : true));
  return long.concat(monthFirst, numeric).sort((a, b) => a.index - b.index);
}

// ---------------------------------------------------------------------------
// The three tests.
// ---------------------------------------------------------------------------

// Where does a label phrase sit? Returns every occurrence with its position.
function locateLabels(text, phrases) {
  const source = String(text || "");
  const starts = lineStarts(text);
  const lines = text.split("\n");
  const blocks = blockIndexes(lines);
  const hits = [];
  phrases.forEach((phrase) => {
    // The pattern is case-insensitive and, above the length threshold, tolerant
    // of digit-for-letter damage. It is 1:1 in length, so index and end still
    // address the original string exactly as the old indexOf did.
    const pattern = labelPattern(phrase);
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      hits.push({
        phrase,
        index: match.index,
        end: match.index + match[0].length,
        lineIndex: lineIndexAt(starts, match.index),
        block: blocks[lineIndexAt(starts, match.index)]
      });
      if (pattern.lastIndex === match.index) pattern.lastIndex++;
    }
  });
  return hits.sort((a, b) => a.index - b.index);
}

// Where does a discontiguous entry sit? Same hit shape as locateLabels, so
// every test downstream treats it identically. index is the start of the head
// and end is the character after "by", which is what makes the adjacency test
// see only the whitespace before the date.
//
// phrase reads "contact us ... by" rather than the raw source, because it is
// reported back through selectDeadline and a regex is not an explanation.
function locateSpanningLabels(text, heads, tail) {
  const source = String(text || "");
  const preposition = tail || "by";
  const starts = lineStarts(source);
  const blocks = blockIndexes(source.split("\n"));
  const hits = [];
  heads.forEach((head) => {
    const pattern = spanningPattern(head, preposition);
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const lineIndex = lineIndexAt(starts, match.index);
      hits.push({
        phrase: head + " ... " + preposition,
        index: match.index,
        end: match.index + match[0].length,
        lineIndex,
        block: blocks[lineIndex]
      });
      if (pattern.lastIndex === match.index) pattern.lastIndex++;
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

// Language that puts a label in the past. "due on" and "due by" state a
// relationship between a label and a date whichever tense they are in, so
// co-location binds them identically, and an arrears letter opens with the
// instalment that has already been missed:
//
//   "Your last payment was due on 3 July 2026 and has not been received."
//     -> bound 3 JULY, the receipt, on a letter whose obligation is later
//
// The engine's keyword fallback has carried a guard against exactly this since
// it was written. Co-location runs first and returned before reaching it, so
// the guard protected only the shapes co-location could not bind, which is the
// smaller half and the less important one.
//
// The reach is 24 characters back from the START of the label, which covers
// "your last payment was " and "both instalments were ". Measured from the
// longest subject phrase that realistically separates the tense marker from the
// label, not chosen.
//
// AND IT STOPS AT A SENTENCE BOUNDARY, which is what it always claimed to do.
// The comment said 24 characters "stops well short of the previous sentence"
// and a test asserts the reach does not span one. Neither was enforced: the
// window was a fixed character count, and it held only because every label it
// had been tried with happened to be short enough.
//
// It stopped holding on 2 August 2026, when the spanning heads below were
// added. "you must pay ... by" starts four characters earlier than "must pay",
// and on "Your payment was due on 3 July 2026. You must pay by 3 September
// 2026." those four characters are the difference between the window ending
// inside the previous sentence and ending after it. The deadline vanished from
// an arrears letter, which is the exact shape the skip-and-continue rule below
// exists to serve. A guard that depends on the character length of the label it
// is protecting is not a guard.
const BACKWARD_LOOKING = /\b(?:was\s+due|were\s+due|became\s+due|overdue\s+since)\b/i;
const BACKWARD_LOOKING_REACH = 24;
const SENTENCE_END = /[.!?\n]/g;

// The text a past-tense marker may be found in: the label itself, plus up to
// BACKWARD_LOOKING_REACH characters before it, cut at the last sentence end.
function backwardLookingWindow(source, label) {
  const from = Math.max(0, label.index - BACKWARD_LOOKING_REACH);
  const before = source.slice(from, label.index);
  let start = from;
  SENTENCE_END.lastIndex = 0;
  let match;
  while ((match = SENTENCE_END.exec(before)) !== null) {
    start = from + match.index + 1;
  }
  return source.slice(start, label.end);
}

// The one date the document says is a deadline, or null.
//
// Contiguous and discontiguous labels are one pool. A spanning hit is not a
// weaker kind of evidence to be consulted only on failure: it is the same
// claim, written with the contact method in the middle, and it competes on
// distance with everything else exactly as another literal would.
//
// Deliberately NOT wired into isClaimedByCompetingDateLabel. That function
// answers a narrower question for the reading-aid fallback, and it tests
// proximity without the forward-only rule, so a spanning label would gain
// governing power there under weaker conditions than it has here.
function selectDeadline(text, isPlausibleNumericDate) {
  const source = String(text || "");
  const values = findDates(source, isPlausibleNumericDate);
  if (!values.length) return null;
  const governs = locateLabels(source, DATE_GOVERNS)
    .concat(locateSpanningLabels(source, DATE_GOVERNS_SPANNING))
    .sort((a, b) => a.index - b.index);
  const competes = locateLabels(source, DATE_COMPETES);

  for (const value of values) {
    // Dates bind forwards only, and adjacently. Money does neither.
    const label = governingLabel(value, governs, competes, { forwardOnly: true, source });
    // A label in the past tense states what happened, not what is required.
    // Skipping the value rather than returning null lets a later date on the
    // same letter still be found, which is what an arrears letter needs: the
    // receipt is stated first and the obligation second.
    if (label && BACKWARD_LOOKING.test(backwardLookingWindow(source, label))) continue;
    if (label) return { value: value.value, label: label.phrase, index: value.index };
  }
  return null;
}

function findPhoneNumbers(text) {
  return locate(String(text || ""), PHONE, hasUsableDigitCount);
}

// The one number the document says to ring, or null.
//
// DECLINES WHEN TWO SURVIVE. A letter carrying a payments line and a complaints
// line states two purposes and names neither as the one. Choosing between them
// would be Northcue ranking the reader's options, which is the line this class
// of work does not cross. One number or none.
function selectPhoneNumber(text) {
  const source = String(text || "");
  const values = findPhoneNumbers(source);
  if (!values.length) return null;

  const governs = locateLabels(source, PHONE_GOVERNS)
    .concat(locateSpanningLabels(source, PHONE_GOVERNS_SPANNING, "on"))
    .sort((a, b) => a.index - b.index);
  const competes = locateLabels(source, PHONE_COMPETES);

  const bound = [];
  for (const value of values) {
    // Forward only and adjacent, as dates are: a purpose phrase points at the
    // number that follows it, and words in between mean it points elsewhere.
    const label = governingLabel(value, governs, competes, { forwardOnly: true, source });
    if (label) bound.push({ value: value.value, label: label.phrase, index: value.index });
  }
  return bound.length === 1 ? bound[0] : null;
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
  // Exported for factCandidates, which applies the same tense rule to a date
  // the engine's English label vocabulary never reached. One definition, so a
  // change to what counts as past tense reaches both readers.
  BACKWARD_LOOKING,
  findAmounts,
  findDates,
  findPhoneNumbers,
  selectPhoneNumber,
  locateLabels,
  locateSpanningLabels,
  passesProximity,
  passesSameBlock,
  passesNoCompetingLabel,
  governingLabel,
  selectAmount,
  selectDeadline,
  formatDateForDisplay,
  selectLetterDate,
  selectContentDate,
  AMOUNT_GOVERNS,
  AMOUNT_COMPETES,
  DATE_GOVERNS,
  DATE_GOVERNS_SPANNING,
  DATE_COMPETES,
  PHONE_GOVERNS,
  PHONE_GOVERNS_SPANNING,
  PHONE_COMPETES,
  MAX_LABEL_GAP
};
