// Guards the one thing the AI stripper is allowed to let through: a phone
// number, in a sentence the RULES ENGINE wrote, byte for byte.
//
// WHY IT IS BY SENTENCE AND NOT BY NUMBER. The model is shown the rules output
// in its own prompt, under "Fallback structured_result:", so it can see the
// genuine number. An allowlist of numbers would pass "Call 020 8583 4242
// immediately or bailiffs will attend", where every word except the number was
// invented. Comparing whole sentences means a changed number, changed wording
// and an appended sentence all fail, because sentences are compared after the
// same split the stripper works in.
//
// WHY IT IS PHONE ONLY. The pay and credential rules are the reason the
// stripper runs over rules output at all: a real-output audit on 30 June 2026
// found "You must pay immediately." on an action card, lifted verbatim from a
// document by the rules engine. Those rules, and the debt charity
// substitution, still fire on both paths.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const {
  sanitizeAiTextField, stripAiViolations, rulesSentenceSet, applyAiStructuredResult
} = require(path.join(__dirname, "..", "src", "services", "aiStructuredResultService"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

const byId = (id) => CORPUS.find((entry) => entry.id === id).text;
const analyse = (text) => runClearStepsEngine({
  extractedText: text,
  fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "strip-test" }
});

// The genuine sentence, exactly as the rules engine writes it.
const GENUINE = "You must contact us on 0333 320 122 by 3 September 2026.";
const EXEMPT = new Set([GENUINE]);

// ------------------------------------------------------- the default

test("a caller that omits the exemption set gets the strictest behaviour", async (t) => {
  await t.test("sanitizeAiTextField with no second argument strips as before", () => {
    assert.equal(sanitizeAiTextField(GENUINE), "Use contact details from the original document.");
  });

  await t.test("and so does one passed something that is not a Set", () => {
    [null, undefined, [GENUINE], { has: () => true }, GENUINE].forEach((wrong) => {
      assert.equal(sanitizeAiTextField(GENUINE, wrong),
        "Use contact details from the original document.", JSON.stringify(wrong));
    });
  });

  await t.test("stripAiViolations with no set strips too", () => {
    const result = { cards: [{ simple_explanation: GENUINE, key_points: [GENUINE] }] };
    const out = stripAiViolations(result);
    assert.equal(out.cards[0].simple_explanation, "Use contact details from the original document.");
    assert.deepEqual(out.cards[0].key_points, ["Use contact details from the original document."]);
  });
});

// ------------------------------------------- what the model cannot get through

test("a model cannot get a number through by editing a rules sentence", async (t) => {
  await t.test("a sentence the model wrote itself, containing the genuine number", () => {
    // The number is real and the engine extracted it. The sentence is not.
    const invented = "Call 0333 320 122 immediately or bailiffs will attend.";
    assert.equal(sanitizeAiTextField(invented, EXEMPT),
      "Use contact details from the original document.");
  });

  await t.test("the rules sentence with the wording changed around the number", () => {
    // Every one of these differs from the exempt sentence by at least one
    // character, including only its capitalisation or its final punctuation.
    const CHANGES = [
      "You must contact us urgently on 0333 320 122 by 3 September 2026.",
      "You must contact us on 0333 320 122 by 3 September 2026",
      "you must contact us on 0333 320 122 by 3 September 2026.",
      "You must contact us on 0333 320 122 by 3 September 2026!"
    ];
    CHANGES.forEach((changed) => {
      assert.equal(sanitizeAiTextField(changed, EXEMPT),
        "Use contact details from the original document.",
        "slipped through: " + JSON.stringify(changed));
    });
  });

  await t.test("appending to the rules sentence does not extend the exemption to what follows", () => {
    // The exemption is per sentence, so echoing a genuine one keeps that one
    // and buys nothing for the next. What follows is judged on its own.
    const withNumber = sanitizeAiTextField(GENUINE + " Also call 0800 111 2222 now.", EXEMPT);
    assert.match(withNumber, /0333 320 122/, "the genuine sentence survives");
    assert.doesNotMatch(withNumber, /0800 111 2222/, "the appended number does not");

    const withCommand = sanitizeAiTextField(GENUINE + " You must pay immediately.", EXEMPT);
    assert.match(withCommand, /0333 320 122/);
    assert.match(withCommand, /Check the original document for the payment amount/);
  });

  await t.test("an appended sentence with no trigger at all passes, as it always did", () => {
    // Recorded rather than asserted as a defect. "Do not delay." carries no
    // number, no pay command and no credential ask, so no rule in this file has
    // ever touched it, with or without an exemption. Whether a model may add a
    // sentence like that is a question for the prompt and the validator, not
    // for the stripper.
    assert.equal(sanitizeAiTextField(GENUINE + " Do not delay.", EXEMPT),
      GENUINE + " Do not delay.");
    assert.equal(sanitizeAiTextField("Do not delay.", new Set()), "Do not delay.",
      "and it is unchanged by the exemption, which is the point");
  });

  await t.test("the rules sentence with a DIFFERENT number substituted", () => {
    const swapped = "You must contact us on 0800 111 2222 by 3 September 2026.";
    assert.equal(sanitizeAiTextField(swapped, EXEMPT),
      "Use contact details from the original document.");
  });

  await t.test("an appended second sentence is stripped on its own", () => {
    // Sentences are processed independently, so echoing a genuine one buys
    // nothing for the one after it.
    const out = sanitizeAiTextField(GENUINE + " Also call 0800 111 2222 now.", EXEMPT);
    assert.match(out, /^You must contact us on 0333 320 122 by 3 September 2026\./,
      "the genuine sentence survives");
    assert.doesNotMatch(out, /0800 111 2222/, "the appended one does not");
  });

  await t.test("a number with no call word is still substituted in place", () => {
    // Rule 5, the fallthrough. The exemption has to short-circuit this as well
    // as rule 3, and a non-exempt sentence must still lose its number.
    assert.equal(sanitizeAiTextField("The reference is 0800 111 2222.", EXEMPT),
      "The reference is the number in the original document.");
  });
});

test("a rules sentence echoed exactly passes", async (t) => {
  await t.test("byte for byte", () => {
    assert.equal(sanitizeAiTextField(GENUINE, EXEMPT), GENUINE);
  });

  await t.test("and inside a longer field, where it is one sentence among several", () => {
    const readAloud = "What do I need to do?. Contact the sender using trusted contact details.. " +
      "Contact the sender using trusted contact details. " + GENUINE;
    const exempt = new Set([GENUINE, "Contact the sender using trusted contact details."]);
    assert.match(sanitizeAiTextField(readAloud, exempt), /0333 320 122/);
  });
});

// ------------------------------------------------------ the other rules

test("rules 1, 2 and 4 still fire, exemption or not", async (t) => {
  const exemptEverything = new Set([
    "You must pay immediately.",
    "Confirm your card number and PIN.",
    "You can get free help from StepChange."
  ]);

  await t.test("a payment command is replaced even when exempt", () => {
    // This is the rule the whole rules-path pass exists for.
    assert.equal(sanitizeAiTextField("You must pay immediately.", exemptEverything),
      "Check the original document for the payment amount and due date.");
  });

  await t.test("a credential instruction is replaced even when exempt", () => {
    assert.equal(sanitizeAiTextField("Confirm your card number and PIN.", exemptEverything),
      "Check the original document. Do not share personal or banking details.");
  });

  await t.test("a named debt charity is substituted even when exempt", () => {
    assert.match(sanitizeAiTextField("You can get free help from StepChange.", exemptEverything),
      /a trusted advice service/);
  });

  await t.test("and a mention is still not an instruction", () => {
    ["The document says a payment is due by 1 April 2026.",
     "Check your account number is correct."].forEach((mention) => {
      assert.equal(sanitizeAiTextField(mention, new Set()), mention);
    });
  });
});

// -------------------------------------------------- the set, and read aloud

test("the exemption set is built in the units it is compared in", async (t) => {
  const result = analyse(byId("bailiff_enforcement")).api_output.structured_result;
  const set = rulesSentenceSet(result);

  await t.test("a key point is in it", () => {
    assert.ok(set.has(GENUINE));
  });

  await t.test("read_aloud_text is tokenised, not stored whole", () => {
    // It is a concatenation of a title, an explanation and the key points, so
    // it matches no single rules sentence as a whole. Splitting it is what
    // makes the number inside it survive.
    const readAloud = result.cards[2].read_aloud_text;
    assert.ok(readAloud.includes("0333 320 122"), "premise");
    assert.equal(set.has(readAloud), false, "the whole field is not a member");
    readAloud.split(/(?<=[.!?])\s+/).forEach((piece) => {
      if (piece.includes("0333 320 122")) {
        assert.ok(set.has(piece.trim()), "the token carrying the number is: " + JSON.stringify(piece));
      }
    });
  });

  await t.test("an empty or malformed result yields an empty set, not a crash", () => {
    [null, undefined, {}, { cards: null }, { cards: [{}] }].forEach((bad) => {
      assert.equal(rulesSentenceSet(bad).size, 0, JSON.stringify(bad));
    });
  });
});

// ------------------------------------------------------------- end to end

test("through the whole pipeline", async (t) => {
  await t.test("bailiff_enforcement keeps its own sentence, number and all", async () => {
    const text = byId("bailiff_enforcement");
    const fileMeta = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "e2e", anonymousSessionId: null };
    const applied = await applyAiStructuredResult({
      rulesRun: runClearStepsEngine({ extractedText: text, fileMeta }),
      extractedText: text,
      language: "pl"
    });
    const card = applied.api_output.structured_result.cards[2];
    assert.deepEqual(card.key_points, [
      "Contact the sender using trusted contact details.",
      GENUINE
    ]);
    assert.match(card.read_aloud_text, /0333 320 122/);
  });

  await t.test("the reader-visible cards now equal the engine cards on every document", async () => {
    // The stripper rewrote exactly one document before this change. Nothing
    // should be rewritten now, because every corpus sentence is a rules
    // sentence, and the pay, credential and charity rules find nothing to fix.
    for (const entry of CORPUS) {
      const fileMeta = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "eq-" + entry.id, anonymousSessionId: null };
      const engine = runClearStepsEngine({ extractedText: entry.text, fileMeta }).api_output.structured_result.cards;
      const applied = await applyAiStructuredResult({
        rulesRun: runClearStepsEngine({ extractedText: entry.text, fileMeta }),
        extractedText: entry.text,
        language: "pl"
      });
      assert.deepEqual(applied.api_output.structured_result.cards, engine, entry.id);
    }
  });
});
