// Has the deadline gone?
//
// WHY THIS IS ON THE CLIENT. A relative statement is only true at the moment it
// is read, and three things follow from that, all of which point the same way:
//
//   DETERMINISM  the engine baseline diffs a frozen render across 36 documents.
//                A clock inside the engine makes that render change by itself,
//                and gov_hmrc's date is today, so the baseline would have
//                flipped overnight. Here, the engine emits deadline_iso as a
//                fixed string and the baseline stays byte identical forever.
//   TIMEZONE     the reader's "today" is the one that matters, and their device
//                knows it. The server does not: Node here resolves
//                Europe/London, most hosts run UTC, and during BST that is a
//                one hour window every night in which a server computed "today"
//                is yesterday.
//   STALENESS    a server computed answer is baked into the result. Northcue
//                holds that result in the browser for the session, so a tab
//                left open overnight would keep showing yesterday's answer.
//                This is called from renderCard, so it is recomputed every time
//                the card is drawn.
//
// The cost, stated plainly: this sentence does not pass through the AI safety
// stripper or validateStructuredResult, because it never enters the structured
// result. It is a fixed dictionary string that never contains document text,
// the same class as any other piece of UI copy.

(function (root) {
  "use strict";

  var ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

  function localDay(date) {
    var month = date.getMonth() + 1;
    var day = date.getDate();
    return date.getFullYear() +
      "-" + (month < 10 ? "0" + month : month) +
      "-" + (day < 10 ? "0" + day : day);
  }

  // True when the deadline is on a day BEFORE the reader's today.
  //
  // Strictly before. A deadline falling today is not passed, and says nothing:
  // the today bucket is deliberately not built, so the only claim this file can
  // make is the one that is true for a whole calendar day either side of the
  // boundary rather than for an instant.
  //
  // The comparison is in LOCAL calendar days, not UTC. deadline_iso is a day
  // printed on paper with no time and no zone, and the reader's own midnight is
  // the boundary they would use. Comparing as strings is exact for this format,
  // and avoids constructing a Date for the deadline at all, which would drag a
  // zone back in.
  //
  // Anything that is not a well formed ISO day answers false, so a caller
  // cannot accidentally assert on a value the engine refused to produce.
  function hasPassed(deadlineIso, now) {
    if (typeof deadlineIso !== "string" || !ISO_DAY.test(deadlineIso)) return false;
    var today = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
    return deadlineIso < localDay(today);
  }

  var api = { hasPassed: hasPassed };

  root.NorthcueDeadlineStatus = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
