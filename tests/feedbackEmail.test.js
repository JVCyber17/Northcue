const test = require("node:test");
const assert = require("node:assert");

const { normaliseEmail, sanitiseNote } = require("../src/services/feedbackService");

test("normaliseEmail keeps a plausible email intact", () => {
  assert.equal(normaliseEmail("Jo.Smith@example.co.uk"), "Jo.Smith@example.co.uk");
  assert.equal(normaliseEmail("  reply@northcue.co.uk  "), "reply@northcue.co.uk");
  assert.equal(normaliseEmail("a+tag@sub.domain.org"), "a+tag@sub.domain.org");
});

test("normaliseEmail rejects implausible values (forgiving, not RFC-strict)", () => {
  assert.equal(normaliseEmail("not-an-email"), "");
  assert.equal(normaliseEmail("missing@domain"), "");
  assert.equal(normaliseEmail("two spaces@example.com"), "");
  assert.equal(normaliseEmail("@example.com"), "");
  assert.equal(normaliseEmail(""), "");
  assert.equal(normaliseEmail(null), "");
  assert.equal(normaliseEmail(undefined), "");
});

test("the dedicated email field is preserved while the free-text note still redacts emails", () => {
  // The dedicated field is stored intact via normaliseEmail...
  assert.equal(normaliseEmail("reply@example.com"), "reply@example.com");

  // ...but an email typed into the free-text NOTE is still redacted, unchanged.
  const note = sanitiseNote("please contact me at reply@example.com about this");
  assert.match(note, /\[redacted-email\]/);
  assert.doesNotMatch(note, /reply@example\.com/);
});
