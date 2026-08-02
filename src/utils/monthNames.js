// The month names the nine non-English languages write a date with.
//
// WHY THIS FILE EXISTS. findDates is the finder every other rule sits on: a
// label can only bind a value the finder produced, so a date it cannot see is
// invisible to co-location, to the deadline vocabulary, to the zone rule and to
// card 4. Until now it recognised English month names only, and the cost was
// not partial, it was total. Measured across the corpus on 2 August 2026:
//
//   pt, es                   0 of 12 months        every date invisible
//   pl                       1 of 12               only "marca"
//   fr                       5 of 12
//   ro                       7 of 12               by accident: "sep" matches
//                                                  "septembrie"
//   hi, gu, bn, pa           0 of 12
//
// FIVE OF THE SIX GENUINE NON-ENGLISH LETTERS IN THE CORPUS PRODUCED NO DATE AT
// ALL. The Spanish water notice says "El pago debe realizarse antes del 15 de
// junio de 2026" and the engine found nothing to bind, nothing to list, and
// card 4 read "No clear date was found."
//
// The four Indic documents only worked because they print "14 July 2026" in
// English. That is an assumption about how those letters are written, not a
// property of the languages, and it was doing more work than anyone intended.
//
// A LIST, NOT A PREFIX RULE. English is matched as a three letter prefix plus
// any letters, which is deliberately loose and is why "1 Mayor 2026" matches.
// That looseness cannot be extended: "ma" would collide with Polish "maja" and
// "marca", and a prefix rule across nine languages produces a class of false
// matches nobody can enumerate. So every name is written out in full and the
// alternation is tried longest first, which is the only way a shorter name
// cannot shadow a longer one that starts with it.
//
// GENITIVE AND NOMINATIVE, for Polish. A Polish date is written in the
// genitive, "6 sierpnia 2026", but a header field prints the nominative,
// "sierpień 2026". Both are here because a document carries both.
//
// SPELLING VARIANTS ARE INCLUDED, NOT NORMALISED. "fevrier" for "février" and
// "marco" for "março" are what a system that strips accents produces, and
// Northcue reads whatever the extractor hands it. "सितंबर" and "सितम्बर" are
// both current Hindi spellings of September. Including a variant costs one
// alternative; missing one costs the whole date.
//
// NOT NATIVELY REVIEWED. This is machine-checked language data, like the
// translation bank was before it was reviewed. Flagged in NATIVE_REVIEW.md. The
// failure mode is asymmetric and mild: a wrong or missing name means a date is
// not found, which the cards already word honestly, and it cannot make the
// engine assert something false.

"use strict";

const MONTH_NAMES = {
  pl: [
    // genitive, which is how a Polish date is written
    "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca",
    "sierpnia", "września", "października", "listopada", "grudnia",
    // nominative, which is how a header field is written
    "styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec",
    "sierpień", "wrzesień", "październik", "listopad", "grudzień"
  ],
  ro: [
    "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie",
    "august", "septembrie", "octombrie", "noiembrie", "decembrie"
  ],
  pt: [
    "janeiro", "fevereiro", "março", "marco", "abril", "maio", "junho", "julho",
    "agosto", "setembro", "outubro", "novembro", "dezembro"
  ],
  es: [
    "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
    "septiembre", "setiembre", "octubre", "noviembre", "diciembre"
  ],
  fr: [
    "janvier", "février", "fevrier", "mars", "avril", "mai", "juin", "juillet",
    "août", "aout", "septembre", "octobre", "novembre", "décembre", "decembre"
  ],
  hi: [
    "जनवरी", "फ़रवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त",
    "सितंबर", "सितम्बर", "अक्टूबर", "अक्तूबर", "नवंबर", "नवम्बर", "दिसंबर", "दिसम्बर"
  ],
  gu: [
    "જાન્યુઆરી", "ફેબ્રુઆરી", "માર્ચ", "એપ્રિલ", "મે", "જૂન", "જુલાઈ", "ઓગસ્ટ",
    "સપ્ટેમ્બર", "ઓક્ટોબર", "નવેમ્બર", "ડિસેમ્બર"
  ],
  bn: [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট",
    "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
  ],
  pa: [
    "ਜਨਵਰੀ", "ਫ਼ਰਵਰੀ", "ਫਰਵਰੀ", "ਮਾਰਚ", "ਅਪ੍ਰੈਲ", "ਮਈ", "ਜੂਨ", "ਜੁਲਾਈ", "ਅਗਸਤ",
    "ਸਤੰਬਰ", "ਅਕਤੂਬਰ", "ਨਵੰਬਰ", "ਦਸੰਬਰ"
  ]
};

// Longest first, so "septiembre" is tried before "sep" style shorter names in
// another language and a short name can never truncate a long one.
function alternationSource(names) {
  return Array.from(new Set(names))
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
}

const LOCALISED_MONTH_SOURCE = alternationSource(
  Object.keys(MONTH_NAMES).reduce((all, code) => all.concat(MONTH_NAMES[code]), [])
);

module.exports = { MONTH_NAMES, LOCALISED_MONTH_SOURCE };
