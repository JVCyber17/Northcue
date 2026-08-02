// Guards which date on a letter is promoted to the deadline, in the keyword
// fallback inside extractDeadline.
//
// WHY THE TESTS CARRY EVERYTHING HERE. The keyword fallback supplies the
// shipped deadline for no corpus document at all: co-location, the appointment
// rule and the reading-aid path between them account for every one. Four rounds
// of co-location work absorbed what the fallback used to carry. So a change to
// this function moves nothing in the baseline, and nothing but a test can tell
// a fix from a no-op.
//
// That is also why each rule below has a whole corpus document behind it, added
// in the same commit as the rule. A shape with no document is a shape the
// rendered baseline cannot see.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const co = require(path.join(__dirname, "..", "src", "utils", "coLocation"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));
const { CORPUS } = require(path.join(__dirname, "..", "scripts", "engine-baseline", "corpus"));

function isPlausibleNumericDate(dateStr) {
  const parts = dateStr.split(/[-\/]/);
  if (parts.length !== 3) return false;
  const a = parseInt(parts[0], 10);
  const b = parseInt(parts[1], 10);
  return (a >= 1 && a <= 31 && b >= 1 && b <= 12) ||
         (a >= 1 && a <= 12 && b >= 1 && b <= 31);
}

function byId(id) {
  return CORPUS.find((entry) => entry.id === id).text;
}

// Long enough to keep the engine off the short-input paths, and headed so it
// takes the fully supported path where extractDeadline is actually called.
// The reading-aid path never calls it.
function letter(body) {
  return [
    "Hounslow Borough Council", "Council Tax Recovery", "Reference: CT-90114",
    "", "Dear Occupier", "", "Amount to pay: £486.20"
  ].concat(body).concat([
    "", "If you cannot pay in full, contact the recovery team on 020 8583 4242."
  ]).join("\n");
}

function deadline(body) {
  return runClearStepsEngine({
    extractedText: letter(body),
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "promotion" }
  }).structured_output.extractor_internal.deadline;
}

// --------------------------------------------------------------------- A

test("a 'before' that states no obligation is not a deadline", async (t) => {
  // D-1. The bare token was already word bounded, so this was never a boundary
  // problem: "before X" marks a boundary in either direction and carries no
  // obligation, so the pattern matched correctly and meant the wrong thing.
  // All eight of these were promoted to deadline before the verb anchor.
  const MENTIONS = [
    ["payments excluded from a balance", "Any payments made before 3 July 2026 are not included in this balance."],
    ["when a tenancy began", "Your tenancy began before 1 April 2024."],
    ["arriving early for an appointment", "Please arrive fifteen minutes before your appointment on 1 July 2026."],
    ["when a notice was served", "This notice was served before 3 July 2026 under section 8."],
    ["when prices were correct", "Prices shown were correct before 1 April 2026."],
    ["a discount qualifying date", "If you moved in before 1 April 2024 a discount may apply."],
    ["when a reading was estimated", "Meter readings taken before 3 July 2026 are estimated."],
    ["an appeal already considered", "Any appeal lodged before 3 July 2026 has already been considered."]
  ];

  for (const [why, line] of MENTIONS) {
    await t.test(why + ": " + JSON.stringify(line.slice(0, 44) + "..."), () => {
      assert.equal(deadline([line]), null,
        "a sentence stating no obligation was promoted to the deadline");
    });
  }
});

test("a 'before' that states an obligation still is one", async (t) => {
  // The other half, and the reason the token was anchored rather than deleted.
  // Deleting it was simulated and rejected: co-location binds none of these, so
  // all five would have been lost.
  const OBLIGATIONS = [
    ["pay the balance", "You must pay the balance before 3 September 2026.", "3 September 2026"],
    ["respond", "Please respond before 3 September 2026.", "3 September 2026"],
    ["clear the account", "The account must be cleared before 3 September 2026.", "3 September 2026"],
    ["contact us", "Contact us before 3 September 2026 to arrange payment.", "3 September 2026"],
    ["tell us otherwise", "Please tell us otherwise before 1 August 2026.", "1 August 2026"]
  ];

  for (const [why, line, expected] of OBLIGATIONS) {
    await t.test(why + ": " + JSON.stringify(line.slice(0, 44) + "..."), () => {
      assert.equal(deadline([line]), expected);
    });
  }

  await t.test("the verb must belong to the same clause as the before", () => {
    // The gap is bounded, so a verb in an unrelated earlier clause cannot
    // anchor a later "before".
    assert.equal(deadline([
      "You can pay online at any time using the reference above, and your tenancy began before 1 April 2024."
    ]), null);
  });
});

test("arrears_before_clause: both readings in one real letter", async (t) => {
  // The corpus document this rule exists for. It carries a mention on one line
  // and an obligation on the next, which is how an arrears letter is actually
  // written, and before the verb anchor it reported the mention.
  const run = runClearStepsEngine({
    extractedText: byId("arrears_before_clause"),
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "corpus-a" }
  });
  const result = run.api_output.structured_result;

  await t.test("the obligation is the deadline, not the mention", () => {
    assert.equal(run.structured_output.extractor_internal.deadline, "3 September 2026");
    assert.equal(result.summary.main_date, "3 September 2026");
    assert.equal(result.cards[3].simple_explanation, "Due by 3 September 2026.");
  });

  await t.test("the mention is still listed as a visible date, just not as the deadline", () => {
    // Suppressing it entirely would hide something the letter says. It is
    // reported without being related to an obligation, which is the whole
    // distinction this rule draws.
    assert.ok(run.structured_output.extractor_internal.visible_dates.includes("3 July 2026"),
      "got " + JSON.stringify(run.structured_output.extractor_internal.visible_dates));
  });

  await t.test("it reaches the fully supported path, where extractDeadline runs", () => {
    // If a future change routes it to the reading aid, this rule stops being
    // exercised by it and the test above would pass for the wrong reason.
    assert.equal(run.structured_output.extractor_internal.readable_unsupported_signals, undefined);
  });
});

// --------------------------------------------------------------------- B

test("a past-tense receipt is not a future deadline", async (t) => {
  // D-2. The guard against "was due" / "became due" / "overdue since" was
  // written, fired, and then overruled by a second keyword pass that omitted
  // it. Every sentence below was rejected by the guard and promoted three lines
  // later by the bypass.
  const RECEIPTS = [
    ["was due by, with a payment method between", "Your payment was due by direct debit on 3 July 2026 and was returned unpaid."],
    ["were due by, standing order", "Both instalments were due by standing order on 3 July 2026."],
    ["became due by, card payment", "The balance became due by card payment on 3 July 2026."],
    ["overdue since", "This account has been overdue since 3 July 2026."]
  ];

  for (const [why, line] of RECEIPTS) {
    await t.test(why, () => {
      assert.equal(deadline([line]), null,
        "a date describing what has already happened was promoted to the deadline");
    });
  }

  await t.test("the guard is not doing this by declining everything", () => {
    // The same sentence shape, forward looking, must still promote. Without
    // this the test above would pass if extractDeadline stopped working.
    assert.equal(deadline(["Your payment is due by direct debit on 3 July 2026."]), "3 July 2026");
    assert.equal(deadline(["The balance is payable by 3 September 2026."]), "3 September 2026");
  });
});

test("failed_direct_debit: a letter whose only dated clause is a receipt", async (t) => {
  const run = runClearStepsEngine({
    extractedText: byId("failed_direct_debit"),
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "corpus-b" }
  });
  const result = run.api_output.structured_result;

  await t.test("no deadline is claimed", () => {
    assert.equal(run.structured_output.extractor_internal.deadline, null);
    assert.equal(result.summary.main_date, null);
    assert.equal(result.summary.deadline_iso, null);
  });

  await t.test("the date is still shown, as a date rather than as an obligation", () => {
    // The letter asks the reader to check with their bank, not to pay by a
    // date. Card 4 lists what it can see and relates none of it.
    assert.match(result.cards[3].simple_explanation, /No clear due date/);
    assert.match(result.cards[3].simple_explanation, /3 July 2026/);
  });

  await t.test("it reaches the fully supported path, where the passes run", () => {
    assert.equal(run.structured_output.extractor_internal.readable_unsupported_signals, undefined);
  });

  await t.test("co-location declines it, so only the keyword passes decide", () => {
    // The premise of the whole document: without this, the second pass was
    // never what produced the answer and the test would prove nothing.
    assert.equal(co.selectDeadline(byId("failed_direct_debit"), isPlausibleNumericDate), null);
  });
});

// --------------------------------------------------------------------- C

test("co-location does not bind a label that is in the past tense", async (t) => {
  // The guard existed in the keyword fallback from the day it was written, and
  // co-location ran first and returned before reaching it. So it protected only
  // the shapes co-location could not bind, which is the smaller half.
  const colocated = (text) => {
    const found = co.selectDeadline(text, isPlausibleNumericDate);
    return found ? found.value : null;
  };

  await t.test("was due on, which co-location bound via 'due on'", () => {
    assert.equal(colocated("Your last payment was due on 3 July 2026 and has not been received."), null);
  });

  await t.test("were due on, and became due on", () => {
    assert.equal(colocated("Two instalments were due on 3 July 2026."), null);
    assert.equal(colocated("The balance became due on 3 July 2026."), null);
  });

  await t.test("the present tense binds exactly as before", () => {
    // The counterweight. Without this the guard could pass by rejecting
    // everything.
    assert.equal(colocated("The balance is due on 3 September 2026."), "3 September 2026");
    assert.equal(colocated("Payment is due by 3 September 2026."), "3 September 2026");
    assert.equal(colocated("You must pay by 3 September 2026."), "3 September 2026");
  });

  await t.test("a rejected value does not stop a later one being found", () => {
    // The guard skips the value rather than abandoning the search, which is
    // what an arrears letter needs: receipt first, obligation second.
    assert.equal(colocated("Your payment was due on 3 July 2026. You must pay by 3 September 2026."),
      "3 September 2026");
  });

  await t.test("the reach does not span a previous sentence", () => {
    // 24 characters back from the start of the label. A tense marker further
    // away than that belongs to a different clause.
    assert.equal(colocated("The last cheque was returned unpaid some time ago. Payment is due by 3 September 2026."),
      "3 September 2026");
  });
});

test("arrears_past_and_future: the receipt first, the obligation second", async (t) => {
  const run = runClearStepsEngine({
    extractedText: byId("arrears_past_and_future"),
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "corpus-c" }
  });
  const result = run.api_output.structured_result;

  await t.test("the deadline is the obligation, not the missed payment", () => {
    assert.equal(run.structured_output.extractor_internal.deadline, "3 September 2026");
    assert.equal(result.summary.main_date, "3 September 2026");
    assert.equal(result.summary.deadline_iso, "2026-09-03");
    assert.equal(result.cards[3].simple_explanation, "Due by 3 September 2026.");
  });

  await t.test("the missed payment is still a visible date", () => {
    assert.ok(run.structured_output.extractor_internal.visible_dates.includes("3 July 2026"),
      "got " + JSON.stringify(run.structured_output.extractor_internal.visible_dates));
  });

  await t.test("co-location is what decides it, so the guard is what is tested", () => {
    assert.equal(co.selectDeadline(byId("arrears_past_and_future"), isPlausibleNumericDate).value,
      "3 September 2026");
  });
});

test("the anchor does not disturb the rest of the context vocabulary", async (t) => {
  await t.test("cleared before keeps its own literal", () => {
    assert.equal(deadline(["The balance must be cleared before 24 June 2026."]), "24 June 2026");
  });

  await t.test("every other alternative still promotes", () => {
    const OTHERS = [
      ["Failure to pay the outstanding amount by 24 June 2026 may result in action.", "24 June 2026"],
      ["Payment must reach us no later than 24 June 2026.", "24 June 2026"],
      ["The deadline for this account is 24 June 2026.", "24 June 2026"],
      ["Payment must be received by 24 June 2026.", "24 June 2026"],
      ["You must comply by 24 June 2026.", "24 June 2026"]
    ];
    OTHERS.forEach(([line, expected]) => {
      assert.equal(deadline([line]), expected, line);
    });
  });

  await t.test("arrears_before_clause is the only corpus deadline the fallback supplies", () => {
    // The reason this file's rules are invisible to the baseline, stated as an
    // assertion rather than a comment. Co-location, the appointment rule and
    // the reading-aid path account for every other corpus deadline, so before
    // this document was added a change here could not move the rendered output
    // at all. If a second document ever starts depending on the fallback, that
    // is worth knowing, and this is where it shows up.
    const fallbackOnly = [];
    CORPUS.forEach((entry) => {
      const run = runClearStepsEngine({
        extractedText: entry.text,
        fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "layer" }
      });
      const x = run.structured_output.extractor_internal;
      if (!x.deadline || x.readable_unsupported_signals) return;
      if (run.structured_output.trust_internal.document_category === "appointment") return;
      if (co.selectDeadline(entry.text, isPlausibleNumericDate)) return;
      fallbackOnly.push(entry.id);
    });
    assert.deepEqual(fallbackOnly, ["arrears_before_clause"]);
  });
});

// ------------------------------- the demand phrasings a real bill actually uses

test("pay ... by, when something sits between the verb and the date", async (t) => {
  // Added 2 August 2026. The corpus has 20 documents that yield a deadline and
  // in EVERY one the label is adjacent to the date: "Please pay by DATE",
  // "You must pay by DATE", "due by DATE". Not one interposes an amount. So the
  // vocabulary was written against the corpus, and the corpus was written
  // against the vocabulary. See CORPUS_STRATEGY.md.
  //
  // The fully supported path is the STRICTER one, so the better supported the
  // document type, the more likely its deadline was dropped.
  const bill = (line) => [
    "Northfield Energy", "Your electricity bill", "Account number: NE-77410",
    "Bill date: 19 June 2026", "", "Dear Mr Sowande", "", line
  ].join("\n");
  const deadlineOf = (line) => runClearStepsEngine({
    extractedText: bill(line),
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto", jobId: "spanning-pay" }
  }).api_output.structured_result.summary.deadline_iso;

  await t.test("ordinary UK demand wording is read", () => {
    [
      "Please pay £482.30 by 3 September 2026.",
      "You must pay £482.30 in full by 3 September 2026.",
      "You must pay the balance by 3 September 2026.",
      "Please pay the outstanding balance of £482.30 by 3 September 2026.",
      "Please pay the amount shown by 3 September 2026.",
      "You must pay the arrears of £482.30 by 3 September 2026."
    ].forEach((line) => assert.equal(deadlineOf(line), "2026-09-03", line));
  });

  await t.test("the sender as subject is never the reader's deadline", () => {
    // THE RULE THAT MAKES THE CLASS SAFE. Bare "pay" reads a deadline out of
    // "We will pay your refund", which is money moving TO the reader. Every
    // head names the reader as the actor, so no sender-subject sentence can
    // match one.
    [
      "We will pay your refund of £83.86 by 3 September 2026.",
      "We must pay your compensation of £83.86 by 3 September 2026.",
      "We should pay this refund by 3 September 2026.",
      "The council must pay the grant by 3 September 2026."
    ].forEach((line) => assert.equal(deadlineOf(line), null, line));
  });

  await t.test("a date that states no obligation is still refused", () => {
    [
      "You can pay online or at any Post Office. Your meter will be read by 3 September 2026.",
      "You do not need to pay. Your credit will be carried forward by 3 September 2026.",
      "Thank you for your payment. Your next bill will be issued by 3 September 2026.",
      "You can pay by card, cash or cheque. We will write to you again by 3 September 2026.",
      "If you pay by instalments the first is taken on 1 April 2026 and the last by 3 September 2026."
    ].forEach((line) => assert.equal(deadlineOf(line), null, line));
  });

  await t.test("a conditional clause is not a demand, and is left alone", () => {
    // Deliberately not read. A head reaching into a conditional would promote
    // the date in every "if you do not..." sentence in UK post.
    assert.equal(deadlineOf("If we do not hear from you by 3 September 2026 we will escalate."), null);
  });

  await t.test("KNOWN AND PRE-EXISTING: two shapes that read and should not", () => {
    // Neither is caused by the spanning heads: both read the same before them.
    // Recorded here because this is where someone will look.
    assert.equal(deadlineOf("You agreed to pay by direct debit on 3 September 2026."), "2026-09-03",
      "a collection date read as a demand, the Tier 1b shape, despite DATE_COMPETES " +
      "carrying 'direct debit on'");
    assert.equal(deadlineOf("Your supplier will need to pay you by 3 September 2026."), "2026-09-03",
      "a sender-subject sentence read as the reader's deadline");
  });
});

test("the past-tense guard stops at a sentence boundary", async (t) => {
  // The guard reads 24 characters back from the START of the label. Its comment
  // said that "stops well short of the previous sentence" and a test above
  // asserts the reach does not span one. Neither was enforced: it was a fixed
  // character count that happened to be short enough for every label it had
  // been tried with.
  //
  // Adding "you must pay ... by" broke it, because that head starts four
  // characters earlier than "must pay" and those four characters put the window
  // inside the previous sentence. The window is now cut at the last sentence
  // end before the label.
  const colocated = (text) => {
    const found = co.selectDeadline(text, isPlausibleNumericDate);
    return found ? found.value : null;
  };

  await t.test("an arrears letter still finds the obligation after the receipt", () => {
    assert.equal(colocated("Your payment was due on 3 July 2026. You must pay by 3 September 2026."),
      "3 September 2026");
    assert.equal(colocated("Your payment was due on 3 July 2026. You must pay £482.30 by 3 September 2026."),
      "3 September 2026");
  });

  await t.test("a past-tense marker in the SAME clause still rejects", () => {
    // The counterweight. Without it the fix could pass by never rejecting.
    assert.equal(colocated("Your payment was due by 3 September 2026."), null);
    assert.equal(colocated("The balance became due by 3 September 2026."), null);
  });

  await t.test("a newline counts as a boundary, because letters break lines", () => {
    assert.equal(colocated("Your payment was due on 3 July 2026.\nYou must pay by 3 September 2026."),
      "3 September 2026");
  });
});
