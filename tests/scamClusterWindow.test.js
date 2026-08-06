// THE CLUSTERING WINDOW, the founder's co-occurrence decision of
// 6 August 2026, pinned on behaviour at its margins.
//
// The defect it fixes: the neutral structural trio read its three facts
// document-wide, so a genuine 702KB bill whose around-the-clock emergency
// line sits pages away from its amounts collected all three and was refused
// at the gate, repeatedly, in every language. Under the window each
// short-deadline match looks for its link and its amount within
// NEUTRAL_CLUSTER_WINDOW characters of itself, the way the facts actually
// sit on a one-page lure, and the best-clustered match governs, so a dense
// threat section still refuses however long the padding around it.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const { runClearStepsEngine } = require(path.join(ROOT, "src", "services", "clearStepsEngine"));
const { providerSkipReason } = require(path.join(ROOT, "src", "services", "aiStructuredResultService"));
const { CORPUS } = require(path.join(ROOT, "scripts", "engine-baseline", "corpus"));

const META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "cluster-pin" };
const run = (text) => runClearStepsEngine({ extractedText: text, fileMeta: META });
const mode = (text) => run(text).api_output.trust.processing_mode;

// The refusal set the freeze protects: every scam letter, all nine
// languages' representatives among them, with its signal count. If a fix
// ever drops one of these, this fails before any founder does.
const REFUSAL_SET = {
  scam_phishing: 8,
  polish_phishing: 6,
  smish_parcel_link_only: 3,
  smish_parcel_link_only_pl: 3,
  scam_dvla_vehicle_tax: 1,
  scam_hmrc_refund_es: 4,
  scam_bank_security_fr: 2,
  scam_energy_refund_pt: 5
};

test("every scam letter still refuses, none weakened", () => {
  Object.entries(REFUSAL_SET).forEach(([id, signalCount]) => {
    const entry = CORPUS.find((e) => e.id === id);
    const trust = run(entry.text).api_output.trust;
    assert.equal(trust.processing_mode, "verification_only", id + " must refuse");
    assert.equal((trust.scam_signals || []).length, signalCount,
      id + " must refuse at full strength, not weakened");
  });
});

test("the whale and every long genuine document reach the prose path", () => {
  // The gate asks for the API key before anything else; the dummy is the
  // launchLanguagePrompt precedent so the pin tests the gates, not the env.
  const savedKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test-not-a-real-key";
  try {
    const longGenuine = CORPUS.filter((e) => e.text.length >= 4000);
    assert.ok(longGenuine.some((e) => e.id === "energy_quarterly_footer_sender"),
      "premise: the whale twin is in the long set");
    longGenuine.forEach((entry) => {
      const rulesRun = run(entry.text);
      ["en", "gu"].forEach((language) => {
        assert.equal(providerSkipReason({ rulesRun, language }), null,
          entry.id + " (" + language + "): a long genuine document must reach the prose path");
      });
    });
  } finally {
    if (savedKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = savedKey;
  }
});

test("the whale twin carries the once-fatal sentence and stays normal", () => {
  const whale = CORPUS.find((e) => e.id === "energy_quarterly_footer_sender");
  assert.ok(whale.text.includes("open 24 hours, 7 days a week"),
    "premise: the twin is truthful about the real bill's phrasing");
  const trust = run(whale.text).api_output.trust;
  assert.equal(trust.processing_mode, "normal");
  assert.equal((trust.scam_signals || []).length, 0);
});

// The boundary, both directions, built from the smish that legitimately
// refuses on the trio alone.
const smish = () => CORPUS.find((e) => e.id === "smish_parcel_link_only").text;
const PADDING_PARAGRAPH =
  "Thank you for being a customer. Your statement is enclosed and there is " +
  "nothing you need to send back. Meter readings keep your bills accurate " +
  "and can be sent through your online account whenever suits you. ";
const padding = (chars) => {
  let out = "";
  while (out.length < chars) out += PADDING_PARAGRAPH;
  return out.slice(0, chars);
};

test("a dense threat section still refuses however long the document", () => {
  const longLure = padding(4000) + "\n\n" + smish() + "\n\n" + padding(4000);
  assert.equal(mode(longLure), "verification_only",
    "a multi-page lure with its threats clustered must still refuse");
});

test("the same facts spread pages apart no longer aggregate", () => {
  // Deadline and link together (as genuine contacts panels print them), the
  // only amount six thousand characters away: two clustered facts, not
  // three, and two is not decisive. This is the founder's bill's shape.
  const spread =
    "Our helpline is open around the clock. Reply within 24 hours if anything is wrong.\n" +
    "Manage your account at www.example-energy.co.uk/account\n" +
    padding(6000) +
    "\nTotal due: £84.10";
  assert.notEqual(mode(spread), "verification_only",
    "two clustered facts must stay advisory; the founder's bar is no refusal");
});

test("the window's margins hold on constructed shapes", () => {
  // Inside the window: deadline, link and amount within a printed page of
  // each other refuse, which keeps every corpus scam (none longer than 437
  // characters end to end) refused with room to spare.
  const dense =
    "Your parcel is held. Pay the release fee of £2.99 within 24 hours at " +
    "www.parcel-fee-example.top or it will be returned.";
  assert.equal(mode(dense), "verification_only");

  // Outside the window: the identical facts with the amount pushed past the
  // window stay advisory, two signals, not decisive.
  const beyond =
    "Reply within 24 hours if anything is wrong at www.example-energy.co.uk/account\n" +
    padding(3000) +
    "\nYour balance is £2.99 in credit.";
  assert.notEqual(mode(beyond), "verification_only",
    "an amount beyond the window must not complete the trio");
});
