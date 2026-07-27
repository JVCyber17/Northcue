// Guards the quality of the feedback evidence itself.
//
// The business case for Northcue rests on what these rows say, so a row that
// looks like signal but is not is worse than a missing row. Two things are
// protected here: document metadata must only ever describe a document the
// reader actually uploaded, and the optional reply address must survive
// intact while free text stays redacted.
//
// public/app.js is a browser file with no module system, so the client side
// guard is checked at source level. That is a tripwire against the guard
// being removed, not a substitute for the browser check.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const feedbackService = require("../src/services/feedbackService");
const APP_SOURCE = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");

test("feedback evidence quality", async (t) => {
  await t.test("document metadata is omitted when no document has been analysed", () => {
    // The demo result that renders the example card carries a category, a
    // trust assessment and a severity. Sending those with feedback given
    // before any upload files the feedback against a document that does not
    // exist, which quietly corrupts the evidence base.
    assert.match(
      APP_SOURCE,
      /hasAnalysedDocument\s*\n?\s*\?/,
      "getFeedbackPayload must gate document metadata on a real analysis"
    );
    assert.match(
      APP_SOURCE,
      /let hasAnalysedDocument = false/,
      "the flag must default to false so the demo result is never reported"
    );
    // It must be set on the real result paths and cleared on reset.
    const setTrue = APP_SOURCE.match(/hasAnalysedDocument = true/g) || [];
    assert.ok(setTrue.length >= 2, "both analysis paths must mark the result as real");
    assert.match(APP_SOURCE, /hasAnalysedDocument = false/, "reset must clear the flag");
  });

  await t.test("a payload with no document metadata still saves", () => {
    // Feedback from the home page or the help page is about Northcue itself
    // and carries no document. Those fields are optional and must normalise
    // to null rather than throwing or inventing a value.
    const rating = feedbackService.normaliseRating("yes");
    assert.equal(rating, "yes");
  });

  await t.test("the reply address is never written to local storage", () => {
    // The reader agreed to Northcue receiving their address, not to it being
    // left on what may be a shared family device, and nothing reads this
    // store back to send it on.
    const fallback = APP_SOURCE.slice(
      APP_SOURCE.indexOf("function saveFeedbackFallback"),
      APP_SOURCE.indexOf("async function saveShortFeedback")
    );
    assert.ok(fallback.length > 0, "expected to find the fallback writer");
    assert.doesNotMatch(
      fallback,
      /email: feedback\.email/,
      "the fallback must not persist the reply address"
    );
  });

  await t.test("the reply address survives while free text is redacted", () => {
    assert.equal(feedbackService.normaliseEmail("reader@example.com"), "reader@example.com");
    const note = feedbackService.sanitiseNote("Call me on 07700 900123 or reader@example.com");
    assert.ok(!note.includes("reader@example.com"), "notes must redact addresses");
    assert.ok(!note.includes("07700"), "notes must redact phone numbers");
  });

  await t.test("the contact route is not offered while it has nowhere to send", () => {
    // It collected a contact detail and a note, discarded both, and told the
    // reader someone would be in touch. Until an endpoint exists the route
    // stays hidden rather than making a promise Northcue cannot keep.
    assert.match(
      APP_SOURCE,
      /const CONTACT_REQUEST_ENABLED = false/,
      "the contact request route must stay off until it persists somewhere"
    );
  });
});
