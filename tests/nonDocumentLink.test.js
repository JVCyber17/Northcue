// What a refused upload that carries a link is told.
//
// THE PROBLEM. Three corpus documents are refused by the non-document gate AND
// carry a link: a Polish parcel smish, a Polish crypto lure and a Portuguese
// energy refund lure. Each is a few lines with a link and none of the things a
// letter has, so the gate is right to refuse them. But every sentence Northcue
// owns on that path then invited a clearer photo, which asks the reader to
// come back with the message they should be leaving alone.
//
// WHAT THIS IS NOT. Not detection. is_probable_non_document, scam_signals,
// severity and processing_mode are untouched on all 54 documents. The engine
// makes no claim that a link means a scam; it declines to give re-upload
// advice to something it can see carries a link, and says plainly that it has
// not checked the link.
//
// AND IT TREATS A SYMPTOM. These three reach this path because the gate zeroes
// their extraction before any scam rule runs, so no rule can see them. That is
// recorded as an open item in KNOWN_ENGINE_DEFECTS.md. This file only pins
// that the wording is no longer wrong while that stays true.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { hasLink } = require(path.join(__dirname, "..", "src", "utils", "documentSignals"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

const META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "nondoc-link-test" };

// The exact set, named rather than derived, so a document arriving or leaving
// this state is a test change someone has to make on purpose. This is that
// change, 5 August 2026: smish_parcel_link_only_pl and scam_energy_refund_pt
// left when the neutral structural tier learned to read them, so they are now
// refused as suspected scams BEFORE the non-document gate sees them, which is
// the honest refusal instead of the wrong-reason one. The crypto lure stays:
// it carries no pound amount and only two structural facts, below the
// threshold, so the non-document gate still catches it first.
const LINK_CARRYING_REFUSALS = [
  "scam_crypto_investment_pl"
];
// Refused, no link. The control: its wording must not have moved at all.
const REFUSED_WITHOUT_LINK = ["non_document_recipe"];

function runOf(id) {
  const entry = CORPUS.find((e) => e.id === id);
  assert.ok(entry, id + " is not in the corpus");
  return runClearStepsEngine({ extractedText: entry.text, fileMeta: META });
}

function readerSentences(run) {
  const extraction = run.structured_output.extractor_internal;
  return [
    run.api_output.banner.text,
    run.structured_output.trust_internal.safe_next_step,
    extraction.helpful_note
  ].concat(extraction.actions || []);
}

test("a refused upload carrying a link is not asked to upload again", async (t) => {
  await t.test("the flag is exactly the documents that are refused and carry a link", () => {
    const flagged = [];
    const shouldBe = [];
    CORPUS.forEach((entry) => {
      const trust = runClearStepsEngine({ extractedText: entry.text, fileMeta: META })
        .structured_output.trust_internal;
      if (trust.non_document_carries_link) flagged.push(entry.id);
      if (trust.is_probable_non_document && hasLink(entry.text)) shouldBe.push(entry.id);
    });
    assert.deepEqual(flagged.sort(), LINK_CARRYING_REFUSALS.slice().sort());
    assert.deepEqual(flagged.sort(), shouldBe.sort(),
      "the flag has drifted from its own definition");
  });

  await t.test("nothing Northcue says to them mentions a photo, a page or an upload", () => {
    // The whole point. If any of these four sentences comes back inviting a
    // re-upload, the fix has been undone somewhere.
    const INVITES_RETRY = /\b(upload|photo|clearer|different page)\b/i;
    LINK_CARRYING_REFUSALS.forEach((id) => {
      readerSentences(runOf(id)).forEach((sentence) => {
        assert.ok(!INVITES_RETRY.test(sentence),
          id + " is still being invited to upload again: " + JSON.stringify(sentence));
      });
    });
  });

  await t.test("each of them is told the link was not checked", () => {
    LINK_CARRYING_REFUSALS.forEach((id) => {
      const note = runOf(id).structured_output.extractor_internal.helpful_note;
      assert.match(note, /has not checked the link/,
        id + " is not told what Northcue did not do");
    });
  });

  await t.test("none of them is told the link is unsafe, or that this is a scam", () => {
    // Northcue cannot know either, and the engine is not being given a new
    // opinion here. Every sentence must stay a statement about Northcue or an
    // observable fact about the text.
    const CLAIMS = /\b(scam|fraud|fraudulent|phishing|fake|dangerous|unsafe|do not click|malicious)\b/i;
    LINK_CARRYING_REFUSALS.forEach((id) => {
      readerSentences(runOf(id)).forEach((sentence) => {
        assert.ok(!CLAIMS.test(sentence),
          id + " is being told something the engine cannot know: " + JSON.stringify(sentence));
      });
    });
  });

  await t.test("a refused upload with no link keeps the wording it had", () => {
    REFUSED_WITHOUT_LINK.forEach((id) => {
      const run = runOf(id);
      assert.equal(run.structured_output.trust_internal.non_document_carries_link, false);
      assert.equal(run.structured_output.trust_internal.safe_next_step,
        "If this is a letter or bill, try a clearer photo or a different page.");
      assert.equal(run.api_output.banner.text,
        "This does not look like an official letter or bill. If it is one, try a clearer photo or a different page.");
      assert.equal(run.structured_output.extractor_internal.actions[0],
        "Upload a clearer photo or a different page if this is a letter or bill.");
    });
  });

  await t.test("a document that was never refused cannot pick this up, link or not", () => {
    // hasLink is true on 13 of 54 documents and three of those are genuine
    // letters. None of them may be affected, because the flag is gated on the
    // refusal that has already happened.
    const withLinks = CORPUS.filter((e) => hasLink(e.text)).map((e) => e.id);
    assert.ok(withLinks.length >= 10, "the corpus lost its link-carrying documents");
    withLinks.forEach((id) => {
      const trust = runOf(id).structured_output.trust_internal;
      if (trust.is_probable_non_document) return;
      assert.equal(trust.non_document_carries_link, false,
        id + " carries a link and was not refused, so the flag must be false");
    });
  });
});

test("every sentence on this path is in the bank in all ten languages", () => {
  // translationParity covers the ids; this covers the pairing, because an id
  // that exists but is never emitted, or a sentence emitted with no id, both
  // reach the reader in English with the notice.
  require(path.join(__dirname, "..", "public", "i18n", "templates-en"));
  const bank = require(path.join(__dirname, "..", "public", "i18n", "templateBank"));

  const EXPECTED = {
    "tpl.banner.non_document_link": 0,
    "tpl.nondoc.next_step_link": 1,
    "tpl.nondoc.helpful_note_link": 2,
    "tpl.nondoc.action_link": 3
  };
  const sentences = readerSentences(runOf(LINK_CARRYING_REFUSALS[0]));
  Object.entries(EXPECTED).forEach(([id, index]) => {
    assert.equal(bank.templateIdFor(sentences[index]), id,
      "sentence " + index + " did not resolve to " + id + ": " + JSON.stringify(sentences[index]));
  });
});
