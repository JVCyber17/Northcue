// Guards the unsafe-advice scan after it was scoped by provenance.
//
// THE DEFECT. buildStructuredCardWarning attaches "This looks important. Do not
// ignore it." to every card on an urgent document. sanitizeCards copies it into
// the AI candidate, because the AI is never asked for `warning`. The validator
// then rejected the candidate for containing "ignore it". Every urgent document
// discarded its AI result deterministically, and because
// sanitizeStructuredResult validates its own output and falls back when
// invalid, the AI's content was thrown away BEFORE it was judged. On the
// documents that matter most, nobody ever established whether it was safe.
//
// The fix skips a string only when the fallback holds a byte-identical string
// at the same path. This file exists to prove that everything else is still
// scanned, in every field, including a warning the model wrote itself.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { validateStructuredResult, sanitizeStructuredResult } =
  require(path.join(__dirname, "..", "src", "utils", "validateStructuredResult"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

const byId = (id) => CORPUS.find((entry) => entry.id === id).text;

function rulesResult(id) {
  return runClearStepsEngine({
    extractedText: byId(id),
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "prov-" + id, anonymousSessionId: null }
  }).api_output.structured_result;
}

const clone = (value) => JSON.parse(JSON.stringify(value));

// Every unsafe phrase the patterns exist for, including the dismissive "ignore
// it" that the engine's own warning was being caught by.
const UNSAFE = [
  "You should pay the balance today.",
  "Pay now to avoid further action.",
  "Make a payment before Friday.",
  "Click the link to confirm.",
  "Call this number to sort it out.",
  "Reply to the sender with your details.",
  "This document is genuine.",
  "It is definitely genuine.",
  "This is guaranteed safe.",
  "You can ignore it."
];

// --------------------------------------------------- the guard the fix needs

test("an urgent document's own output validates against itself", async (t) => {
  // THE GUARD. This is exactly the condition that was false before the fix, and
  // it fails if engine-injected fields ever re-enter the validator's scope.
  const URGENT = ["bailiff_enforcement", "eviction_possession", "court_fine",
    "ocr_enforcement", "arrears_before_clause"];

  for (const id of URGENT) {
    await t.test(id, () => {
      const result = rulesResult(id);
      const validation = validateStructuredResult(result, result);
      assert.deepEqual(validation.errors, [], id + " rejects its own output");
    });
  }

  await t.test("the premise: these documents really do carry the warning", () => {
    URGENT.forEach((id) => {
      const warnings = rulesResult(id).cards.map((card) => card.warning);
      assert.ok(warnings.includes("This looks important. Do not ignore it."),
        id + ": got " + JSON.stringify(warnings));
    });
  });

  await t.test("every corpus document validates against itself", () => {
    const failing = [];
    CORPUS.forEach((entry) => {
      const result = rulesResult(entry.id);
      if (!validateStructuredResult(result, result).valid) failing.push(entry.id);
    });
    assert.deepEqual(failing, []);
  });
});

// ------------------------------------------------- the protection, unchanged

test("AI-authored unsafe advice is still rejected, in every free text field", async (t) => {
  const fallback = rulesResult("council_tax");

  const FIELDS = [
    ["document_type_label", (c, v) => { c.document_type_label = v; }],
    ["summary.one_line_summary", (c, v) => { c.summary.one_line_summary = v; }],
    ["summary.main_action", (c, v) => { c.summary.main_action = v; }],
    ["summary.main_date", (c, v) => { c.summary.main_date = v; }],
    ["summary.main_amount", (c, v) => { c.summary.main_amount = v; }],
    ["cards[0].title", (c, v) => { c.cards[0].title = v; }],
    ["cards[0].simple_explanation", (c, v) => { c.cards[0].simple_explanation = v; }],
    ["cards[2].action_needed", (c, v) => { c.cards[2].action_needed = v; }],
    ["cards[2].key_points[0]", (c, v) => { c.cards[2].key_points[0] = v; }],
    ["cards[3].possible_deadline", (c, v) => { c.cards[3].possible_deadline = v; }],
    ["cards[4].read_aloud_text", (c, v) => { c.cards[4].read_aloud_text = v; }],
    ["warnings[0]", (c, v) => { c.warnings = [v]; }]
  ];

  for (const [where, set] of FIELDS) {
    await t.test(where, () => {
      UNSAFE.forEach((phrase) => {
        const candidate = clone(fallback);
        set(candidate, phrase);
        const validation = validateStructuredResult(candidate, fallback);
        assert.equal(validation.valid, false,
          where + " accepted " + JSON.stringify(phrase));
        assert.ok(validation.errors.some((e) => /unsafe advice/.test(e)),
          where + ": " + JSON.stringify(validation.errors));
      });
    });
  }
});

test("a warning the MODEL wrote is scanned, and the engine's own is not", async (t) => {
  // The exact field the exemption is for, from both directions. This is what
  // makes the rule provenance rather than field name.
  const fallback = rulesResult("bailiff_enforcement");

  await t.test("the engine's warning passes at its own path", () => {
    assert.equal(validateStructuredResult(clone(fallback), fallback).valid, true);
  });

  await t.test("a model-authored warning carrying unsafe advice fails", () => {
    UNSAFE.forEach((phrase) => {
      const candidate = clone(fallback);
      candidate.cards[0].warning = phrase;
      assert.equal(validateStructuredResult(candidate, fallback).valid, false,
        "accepted a model warning of " + JSON.stringify(phrase));
    });
  });

  await t.test("a model-authored top level warnings entry is scanned too", () => {
    const candidate = clone(fallback);
    candidate.warnings = ["You can ignore it."];
    assert.equal(validateStructuredResult(candidate, fallback).valid, false);
  });

  await t.test("the engine string moved to a DIFFERENT path is scanned", () => {
    // Matching by value alone would let a model relocate an engine string into
    // a field where it means something else. The path is part of the identity.
    const candidate = clone(fallback);
    candidate.cards[0].simple_explanation = "This looks important. Do not ignore it.";
    assert.equal(validateStructuredResult(candidate, fallback).valid, false,
      "an engine warning moved into the explanation must be scanned");
  });

  await t.test("a warning the model EDITED is scanned", () => {
    const candidate = clone(fallback);
    candidate.cards[0].warning = "This looks important. Do not ignore it. Pay now.";
    assert.equal(validateStructuredResult(candidate, fallback).valid, false);
  });
});

test("the exemption cannot be widened by an empty or absent fallback", async (t) => {
  await t.test("no fallback means everything is scanned", () => {
    const candidate = rulesResult("bailiff_enforcement");
    // Without a fallback the engine warning has nothing to match against, so it
    // is scanned like anything else and the old behaviour returns. Safe default.
    assert.equal(validateStructuredResult(candidate).valid, false);
  });

  await t.test("an unrelated fallback does not exempt anything", () => {
    const candidate = rulesResult("bailiff_enforcement");
    const unrelated = rulesResult("energy_bill");
    assert.equal(validateStructuredResult(candidate, unrelated).valid, false,
      "energy_bill carries no urgent warning, so bailiff's is not exempt");
  });
});

// ------------------------------------------------- the guards added with it

test("an obligation addressed to the reader is rejected, unless attributed", async (t) => {
  const fallback = rulesResult("court_fine");

  await t.test("the sentence a live capture actually produced", () => {
    // "You must pay £726.00 by 30 September 2026 to avoid further action." on a
    // court fine. None of the older patterns matched it; only the stripper did,
    // and the stripper is a different layer.
    const candidate = clone(fallback);
    candidate.cards[1].simple_explanation = "You must pay £726.00 by 30 September 2026 to avoid further action.";
    assert.equal(validateStructuredResult(candidate, fallback).valid, false);
  });

  await t.test("the family, not just the one verb", () => {
    ["You must contact the council today.", "You must clear the arrears by Friday.",
     "You need to call the Fines Team.", "You are required to respond.",
     "You should contact them about this."].forEach((line) => {
      const candidate = clone(fallback);
      candidate.cards[1].simple_explanation = line;
      assert.equal(validateStructuredResult(candidate, fallback).valid, false, line);
    });
  });

  await t.test("attributing it is allowed, because attributing is what we ask for", () => {
    // Dates kept to ones court_fine actually prints, so this tests the command
    // rule rather than tripping the date rule. That distinction cost a test
    // failure to find, which is the rules being independent as intended.
    ["The document says you must contact them by 30 September 2026.",
     "The letter says you must pay by 30 September 2026.",
     "According to the document, you must clear the balance.",
     "The notice states that you must respond about this."].forEach((line) => {
      const candidate = clone(fallback);
      candidate.cards[1].simple_explanation = line;
      const validation = validateStructuredResult(candidate, fallback, byId("court_fine"));
      assert.equal(validation.valid, true, line + "  ->  " + JSON.stringify(validation.errors));
    });
  });

  await t.test("the engine's own quoted obligation still passes at its own path", () => {
    // bailiff_enforcement's card 3 carries "You must contact us on 0333 320 122
    // by 3 September 2026." This pattern and the provenance rule only work
    // together: without provenance this would reject every enforcement letter.
    const bailiff = rulesResult("bailiff_enforcement");
    assert.equal(validateStructuredResult(bailiff, bailiff).valid, true);
  });
});

test("facts come from the engine, and the tripwire says so", async (t) => {
  const fallback = rulesResult("court_fine");

  await t.test("the sanitiser forces all four, whatever the model sends", () => {
    const candidate = clone(fallback);
    candidate.summary.main_date = "2026-07-25";
    candidate.summary.main_amount = "£1.00";
    candidate.cards[3].possible_deadline = "2026-07-25";
    candidate.cards[4].possible_payment = "£235.00";
    const out = sanitizeStructuredResult(candidate, fallback);
    assert.equal(out.summary.main_date, fallback.summary.main_date);
    assert.equal(out.summary.main_amount, fallback.summary.main_amount);
    assert.equal(out.cards[3].possible_deadline, fallback.cards[3].possible_deadline);
    assert.equal(out.cards[4].possible_payment, fallback.cards[4].possible_payment);
  });

  await t.test("and the validator rejects a differing value, if forcing is ever removed", () => {
    const candidate = clone(fallback);
    candidate.summary.main_date = "1 January 2027";
    const validation = validateStructuredResult(candidate, fallback);
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((e) => /main_date must match the engine value/.test(e)));
  });
});

test("a date the model calculated is rejected; one printed on the page is not", async (t) => {
  const source = byId("legal_solicitor");
  const fallback = rulesResult("legal_solicitor");

  await t.test("the calculated date a live capture produced", () => {
    // The letter says only "within 14 days". 25 July is 11 July plus fourteen,
    // and appears nowhere on the page.
    const candidate = clone(fallback);
    candidate.cards[3].simple_explanation = "Payment is due by 25 July 2026.";
    const validation = validateStructuredResult(candidate, fallback, source);
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((e) => /25 july 2026 appears in neither/.test(e)),
      JSON.stringify(validation.errors));
  });

  await t.test("a date printed on the letter but absent from the cards is allowed", () => {
    // The engine surfaces no letter date on court_fine's cards, but "2 September
    // 2026" is on the page. Rejecting that would reject a legitimate citation.
    const fine = rulesResult("court_fine");
    const candidate = clone(fine);
    candidate.cards[0].key_points = ["It is dated 2 September 2026."];
    assert.equal(validateStructuredResult(candidate, fine, byId("court_fine")).valid, true);
  });

  await t.test("without the source text the rule falls back to the stricter comparison", () => {
    const fine = rulesResult("court_fine");
    const candidate = clone(fine);
    candidate.cards[0].key_points = ["It is dated 2 September 2026."];
    assert.equal(validateStructuredResult(candidate, fine).valid, false,
      "a caller that omits the source must fail closed, not open");
  });
});

test("card five's title is the engine's, not the model's", async (t) => {
  await t.test("the model cannot turn a check card into a consequence card", () => {
    // council_tax, not bailiff_enforcement: the RISK_PHRASES sweep turned that
    // one into a consequence card, which is what the sweep was for.
    const fallback = rulesResult("council_tax");
    assert.equal(fallback.cards[4].title, "What should I check?", "premise");
    const candidate = clone(fallback);
    candidate.cards[4].title = "What could happen if I ignore it?";
    assert.equal(sanitizeStructuredResult(candidate, fallback).cards[4].title, "What should I check?");
  });

  await t.test("nor the other way round", () => {
    const fallback = rulesResult("court_fine");
    assert.equal(fallback.cards[4].title, "What could happen if I ignore it?", "premise");
    const candidate = clone(fallback);
    candidate.cards[4].title = "What should I check?";
    assert.equal(sanitizeStructuredResult(candidate, fallback).cards[4].title,
      "What could happen if I ignore it?");
  });

  await t.test("the other five titles are still the model's to shorten", () => {
    const fallback = rulesResult("court_fine");
    const candidate = clone(fallback);
    candidate.cards[0].title = "What is this letter?";
    assert.equal(sanitizeStructuredResult(candidate, fallback).cards[0].title, "What is this letter?");
  });
});

test("an address the engine never surfaced is rejected", async (t) => {
  const fallback = rulesResult("eviction_possession");

  await t.test("the key point a live capture produced", () => {
    const candidate = clone(fallback);
    candidate.cards[0].key_points = ["Property involved: 22 Alder House, Feltham."];
    assert.equal(validateStructuredResult(candidate, fallback, byId("eviction_possession")).valid, false);
  });

  await t.test("a postcode in any field", () => {
    const candidate = clone(fallback);
    candidate.cards[0].simple_explanation = "A notice about the property at TW3 8SG.";
    assert.equal(validateStructuredResult(candidate, fallback, byId("eviction_possession")).valid, false);
  });

  await t.test("street shapes, several forms", () => {
    ["14 Sutton Court Road", "8 Maple Close", "22 Alder House"].forEach((address) => {
      const candidate = clone(fallback);
      candidate.cards[0].simple_explanation = "The letter concerns " + address + ".";
      assert.equal(validateStructuredResult(candidate, fallback, byId("eviction_possession")).valid,
        false, address);
    });
  });

  await t.test("no corpus document's engine output trips it", () => {
    // The engine never puts an address on a card, so this pattern must be inert
    // across the whole corpus, or it would reject every AI result.
    CORPUS.forEach((entry) => {
      const result = rulesResult(entry.id);
      assert.equal(validateStructuredResult(result, result, byId(entry.id)).valid, true, entry.id);
    });
  });
});

test("the AI result is no longer discarded before it is judged", async (t) => {
  // sanitizeStructuredResult validates its own output and returns the fallback
  // when invalid. On an urgent document that first validation used to fail on
  // the engine's own warning, so a clean AI candidate never survived.
  const fallback = rulesResult("bailiff_enforcement");

  await t.test("a clean AI candidate now survives sanitising", () => {
    const candidate = clone(fallback);
    candidate.cards[0].simple_explanation = "Marston Holdings has sent a notice about money owed.";
    const sanitized = sanitizeStructuredResult(candidate, fallback);
    assert.notEqual(sanitized, fallback, "the AI content was discarded");
    assert.equal(sanitized.cards[0].simple_explanation,
      "Marston Holdings has sent a notice about money owed.");
  });

  await t.test("an unsafe AI candidate is still replaced by the fallback", () => {
    const candidate = clone(fallback);
    candidate.cards[0].simple_explanation = "Pay now to avoid bailiffs.";
    assert.equal(sanitizeStructuredResult(candidate, fallback), fallback);
  });
});
