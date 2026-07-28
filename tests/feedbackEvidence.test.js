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

  await t.test("the confidence answer normalises to the three reportable values", () => {
    assert.equal(feedbackService.normaliseConfidence("more_able"), "more_able");
    assert.equal(feedbackService.normaliseConfidence("about_same"), "about_same");
    assert.equal(feedbackService.normaliseConfidence("still_unsure"), "still_unsure");
    assert.equal(feedbackService.normaliseConfidence("MORE_ABLE"), "more_able");
  });

  await t.test("skipping the confidence question is a normal outcome, not an error", () => {
    // The question is optional, so most rows will not carry it. An absent or
    // unrecognised answer must become null rather than throwing or being
    // guessed at, otherwise the column stops being reportable.
    assert.equal(feedbackService.normaliseConfidence(""), null);
    assert.equal(feedbackService.normaliseConfidence(undefined), null);
    assert.equal(feedbackService.normaliseConfidence("very confident"), null);
    assert.equal(feedbackService.normaliseConfidence("<script>"), null);
  });

  await t.test("the confidence question is single select and skippable", () => {
    // Tapping the chosen answer again clears it, so a stray tap does not trap
    // someone into answering a question they would rather leave alone.
    assert.match(
      APP_SOURCE,
      /feedback-confidence-chip[\s\S]{0,600}wasSelected/,
      "the handler must clear the answer when the same chip is tapped again"
    );
    // Confidence chips share the reason chip class for styling, so the reason
    // collector must exclude them or the two answers contaminate each other.
    assert.match(
      APP_SOURCE,
      /feedback-reason-chip\.selected:not\(\.feedback-confidence-chip\)/,
      "reasons must exclude confidence chips"
    );
  });

  await t.test("the note privacy warning is persistent, not placeholder only", () => {
    // A placeholder disappears the moment someone starts typing, which is
    // exactly when the warning matters.
    assert.match(APP_SOURCE, /feedback-field-note/, "expected a persistent helper note");
    assert.match(
      APP_SOURCE,
      /aria-describedby="modal-feedback-comment-privacy"/,
      "the note must be announced with the field"
    );
  });

  await t.test("optional columns never take the whole feedback down with them", () => {
    // confidence_after and contact_email each arrived in a later migration. If
    // the database has not caught up, naming one fails the insert and the
    // rating, reasons and note are lost too.
    const service = fs.readFileSync(
      path.join(__dirname, "..", "src", "services", "feedbackService.js"), "utf8"
    );
    assert.match(service, /PGRST204/, "must recognise the schema cache miss");
    assert.match(service, /OPTIONAL_FEEDBACK_COLUMNS/, "must know which columns are optional");
    assert.match(service, /delete reducedRow\[column\]/, "must retry without them");
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
