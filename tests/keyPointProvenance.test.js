// THE MODEL MAY NOT DISPLACE AN ENGINE LINE THAT ONLY THE ENGINE CAN WRITE.
//
// sanitizeCards used to choose one key-point array or the other:
//
//   const keyPoints = Array.isArray(candidate.key_points) ? candidate.key_points
//                                                         : fallback.key_points;
//
// So a single model key point discarded every engine line on that card.
// Measured across the corpus with the reader-output harness: 224 engine key
// points displaced against 10 kept. The contact number was lost 15 times out of
// 15, every severity signal, every not-fully-trained caution.
//
// PROTECTED BY PROVENANCE, NEVER BY WORDING. The engine marks which of its
// lines may not be displaced, and it marks them by calling the same functions
// that built them. Matching on how a line reads was tried and rejected:
// a pattern for "The document gives this phone number:" misses
// bailiff_enforcement card 3, whose number arrives inside a sentence lifted
// from the letter, "You must contact us on 0333 320 122 by 3 September 2026."
// Same family, same value, different words.
//
// The same trap caught the severity signals a second time. A first version
// derived card 2's protected lines from trust.severity_signals, which is EMPTY
// on exactly the documents the stakes floor raised, so bailiff_enforcement was
// left unprotected while a routine energy bill was protected. Card 2 now calls
// its builder, because every line that card carries is Northcue's own severity
// vocabulary with nothing quoted from the document.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { sanitizeStructuredResultWithVerdict } =
  require(path.join(__dirname, "..", "src", "utils", "validateStructuredResult"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

const META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "provenance" };
const analyse = (text) => runClearStepsEngine({ extractedText: text, fileMeta: META });
const byId = (id) => CORPUS.find((entry) => entry.id === id).text;

// A model answer that replaces every card's key points with its own wording,
// which is what a real one does. Nothing here quotes the engine.
function modelRewriteOf(fallback) {
  const candidate = JSON.parse(JSON.stringify(fallback));
  candidate.cards.forEach((card, index) => {
    card.simple_explanation = "A model sentence for card " + (index + 1) + ".";
    card.key_points = [
      "A model key point for card " + (index + 1) + ".",
      "A second model key point."
    ];
  });
  return candidate;
}

function servedCards(text) {
  const run = analyse(text);
  const fallback = run.api_output.structured_result;
  const verdict = sanitizeStructuredResultWithVerdict(
    modelRewriteOf(fallback), fallback, text);
  return { fallback, served: verdict.result };
}

test("every protected line survives a model that rewrites the card", async (t) => {
  await t.test("across all 70 corpus documents, nothing protected is lost", () => {
    const lost = [];
    CORPUS.forEach((entry) => {
      const { fallback, served } = servedCards(entry.text);
      fallback.cards.forEach((card, index) => {
        const survived = new Set((served.cards[index].key_points || []).map(String));
        (card.protected_key_points || []).forEach((point) => {
          if (!survived.has(point)) lost.push(entry.id + " card " + (index + 1) + ": " + point);
        });
      });
    });
    assert.deepEqual(lost, [],
      "a protected key point was displaced by the model:\n" + lost.join("\n"));
  });

  await t.test("the contact number survives in BOTH the wordings it comes in", () => {
    // The composed form, and the form lifted from the letter. Wording-matching
    // protected the first and missed the second, which is the whole reason this
    // is keyed on provenance.
    [["council_tax", /020 8583 4242/], ["bailiff_enforcement", /0333 320 122/]]
      .forEach(([id, number]) => {
        const { fallback, served } = servedCards(byId(id));
        assert.ok(number.test(JSON.stringify(fallback.cards[2].key_points)),
          id + ": premise, the engine puts the number on card 3");
        assert.ok(number.test(JSON.stringify(served.cards[2].key_points)),
          id + ": the number did not survive the model");
      });
  });

  await t.test("an enforcement notice keeps its severity line", () => {
    // trust.severity_signals is EMPTY here and the line comes from the theme
    // path. Deriving the protected set from the field rather than the builder
    // left exactly this document unprotected.
    const run = analyse(byId("bailiff_enforcement"));
    assert.deepEqual(run.api_output.trust.severity_signals, [],
      "premise: the field is empty, so only the builder knows this line exists");
    const { served } = servedCards(byId("bailiff_enforcement"));
    assert.ok(
      (served.cards[1].key_points || []).includes("This mentions enforcement action or bailiffs."),
      "the severity line was displaced on an enforcement notice");
  });

  await t.test("the model still owns the rest of the card", () => {
    // The counterweight. Without it this passes by protecting everything, which
    // would make the prose pass pointless.
    const { served } = servedCards(byId("council_tax"));
    const card3 = served.cards[2].key_points || [];
    assert.ok(card3.some((p) => /A model key point/.test(p)),
      "the model's own lines must still reach the card");
  });
});

test("protection claims its place in the cap, not the model's", async (t) => {
  await t.test("a card never exceeds four key points", () => {
    CORPUS.forEach((entry) => {
      const { served } = servedCards(entry.text);
      served.cards.forEach((card, index) => {
        assert.ok((card.key_points || []).length <= 4,
          entry.id + " card " + (index + 1) + " has " + card.key_points.length);
      });
    });
  });

  await t.test("when the card is full, a MODEL line is dropped and not a protected one", () => {
    // Four protected lines and four model lines on one card: the protected four
    // must be what survives.
    const run = analyse(byId("council_tax"));
    const fallback = JSON.parse(JSON.stringify(run.api_output.structured_result));
    fallback.cards[2].protected_key_points = ["P one.", "P two.", "P three.", "P four."];
    const candidate = JSON.parse(JSON.stringify(fallback));
    candidate.cards[2].key_points = ["M one.", "M two.", "M three.", "M four."];
    const served = sanitizeStructuredResultWithVerdict(candidate, fallback, byId("council_tax")).result;
    assert.deepEqual(served.cards[2].key_points,
      ["P one.", "P two.", "P three.", "P four."]);
  });

  await t.test("a model line identical to a protected one is not shown twice", () => {
    const run = analyse(byId("council_tax"));
    const fallback = JSON.parse(JSON.stringify(run.api_output.structured_result));
    const protectedLine = fallback.cards[2].protected_key_points[0];
    assert.ok(protectedLine, "premise: card 3 has a protected line");
    const candidate = JSON.parse(JSON.stringify(fallback));
    candidate.cards[2].key_points = [protectedLine, "A model key point."];
    const served = sanitizeStructuredResultWithVerdict(candidate, fallback, byId("council_tax")).result;
    const copies = (served.cards[2].key_points || []).filter((p) => p === protectedLine).length;
    assert.equal(copies, 1, "the same line appeared twice");
  });
});

test("protected_key_points is always a subset of key_points", async (t) => {
  // The structural guarantee. If a protected line is not one the engine
  // actually put on the card, the merge would ADD a line the engine never
  // showed, which is a different defect arriving from the fix.
  await t.test("across all 70 documents", () => {
    const orphans = [];
    CORPUS.forEach((entry) => {
      analyse(entry.text).api_output.structured_result.cards.forEach((card, index) => {
        const shown = new Set((card.key_points || []).map(String));
        (card.protected_key_points || []).forEach((point) => {
          if (!shown.has(point)) orphans.push(entry.id + " card " + (index + 1) + ": " + point);
        });
      });
    });
    assert.deepEqual(orphans, []);
  });
});
