const test = require("node:test");
const assert = require("node:assert/strict");

const { redactForAi } = require("../src/services/aiStructuredResultService");

test("redactForAi masks identifiers but preserves dates and amounts", () => {
  const input = [
    "Email me at jane.doe@example.com or call 0114 271 1900.",
    "Account number 12345678901. Card 4111 1111 1111 1111.",
    "NI number QQ123456C.",
    "Your payment of £1,200.00 is due by 01 July 2026."
  ].join("\n");

  const out = redactForAi(input);

  // Sensitive identifiers must be masked.
  assert.ok(!out.includes("jane.doe@example.com"), "email must be masked");
  assert.ok(out.includes("[email]"));
  assert.ok(!out.includes("12345678901"), "long account number must be masked");
  assert.ok(!out.includes("4111 1111 1111 1111"), "spaced card must be masked");
  assert.ok(!/QQ123456C/i.test(out), "NI number must be masked");
  assert.ok(!out.includes("0114 271 1900"), "phone number must be masked");

  // Cue-card-critical facts must be preserved.
  assert.ok(out.includes("£1,200.00"), "money amount must be preserved");
  assert.ok(out.includes("01 July 2026"), "date must be preserved");
});

test("redactForAi handles empty and non-string input", () => {
  assert.equal(redactForAi(""), "");
  assert.equal(redactForAi(undefined), "");
  assert.equal(redactForAi(null), "");
});
