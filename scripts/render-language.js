#!/usr/bin/env node
// Ground truth renderer for one language.
//
// Produces exactly what a reader sees, by running the REAL rules engine over
// four fixtures and pushing its output through the REAL template bank, then
// rendering all 51 slot patterns with three value sets chosen to trigger
// different agreement forms.
//
// This exists because every previous review worked from files or from scan
// counts, and both lied. Files show a translation that may never be reached;
// counts showed defects that were artefacts of the checker. Only rendered
// output settles what a reader actually gets.
//
// THIS FILE IS FROZEN DURING A REVIEW PASS. An earlier audit was run while the
// tooling was still being edited, and the agents' counts could not be
// reproduced afterwards, which wasted the whole run. If this needs to change
// mid pass, stop the pass.
//
// Usage:
//   node scripts/render-language.js pl              everything
//   node scripts/render-language.js pl scenarios    the four documents only
//   node scripts/render-language.js pl patterns     the 51 patterns only

"use strict";

const path = require("path");
const { runClearStepsEngine } = require(path.join(__dirname, "..", "src", "services", "clearStepsEngine"));

const I18N = path.join(__dirname, "..", "public", "i18n");
const enBank = require(path.join(I18N, "templates-en.js"));
const bank = require(path.join(I18N, "templateBank.js"));

const code = process.argv[2];
const only = process.argv[3];
if (!code) {
  console.error("usage: node scripts/render-language.js <code> [scenarios|patterns]");
  process.exit(1);
}
if (code !== "en") require(path.join(I18N, "templates-" + code + ".js"));
bank.resetCaches();

function say(text) {
  const result = bank.translateEngineSentence(String(text == null ? "" : text), code);
  return { text: result.text, fellBack: !result.translated };
}

// --------------------------------------------------------------------------
// Four fixtures. Each is checked below against the processing mode it is meant
// to exercise, so a fixture that stops triggering its path is loud rather than
// silently testing the wrong thing.
// --------------------------------------------------------------------------
const FIXTURES = {
  bailiff: {
    want: { severity: "urgent" },
    text: [
      "Marston Holdings Enforcement Agents",
      "Notice of Enforcement",
      "Reference: EN-77120934",
      "Liability Order obtained by Hounslow Borough Council",
      "Amount outstanding: £1,247.00",
      "You must contact us by 3 September 2026.",
      "If payment is not received, enforcement agents may attend your property",
      "and remove goods belonging to you. Further fees will be added."
    ].join("\n")
  },
  scam: {
    want: { mode: "verification_only" },
    text: [
      "Barcllays Security Team",
      "URGENT: Your account is at risk",
      "We have detected unusual activity on your account.",
      "You must verify your identity within 24 hours or your account will be frozen.",
      "Act now. Confirm your card number, PIN and full password at:",
      "barclays-secure-verify.com"
    ].join("\n")
  },
  routine: {
    want: { severity: "low" },
    text: [
      "EDF Energy",
      "Your electricity bill",
      "Account number: 1234567890",
      "Bill date: 1 May 2026",
      "Amount due: £8.50",
      "Please pay by 1 June 2026.",
      "Thank you for being an EDF customer."
    ].join("\n")
  },
  nondocument: {
    // A cafe menu does NOT work here: an all caps top line reads as a sender
    // and prices read as amounts, so the engine treats it as a plausible
    // document. The original review hit exactly this trap. A recipe in flowing
    // lowercase prose has no sender shaped line, no reference, no date and no
    // official phrasing, which is what detectProbableNonDocument() requires,
    // and it is long enough to score good input quality.
    want: { mode: "unsupported" },
    text: [
      "mix the flour and the softened butter together in a large bowl until",
      "the mixture looks like fine breadcrumbs",
      "stir in the sugar and a pinch of salt, then add two beaten eggs and",
      "fold everything together gently",
      "spoon the mixture into a lined tin and smooth the top with the back",
      "of a spoon",
      "bake in the middle of the oven for about forty five minutes until",
      "golden and springy to the touch",
      "leave the cake to cool in the tin for ten minutes before turning it",
      "out onto a wire rack",
      "once completely cool, dust with icing sugar and serve in thick",
      "slices with a cup of tea"
    ].join("\n")
  }
};

function renderScenario(name) {
  const fixture = FIXTURES[name];
  const out = runClearStepsEngine({
    extractedText: fixture.text,
    fileMeta: { mimeType: "application/pdf", selectedCategory: "auto" }
  }).api_output;

  const trust = out.trust || {};
  console.log("\n" + "=".repeat(72));
  console.log("SCENARIO: " + name);
  console.log("  engine says: mode=" + trust.processing_mode +
    " severity=" + trust.severity_level +
    " trust=" + trust.trust_assessment +
    " category=" + trust.document_category);

  const want = fixture.want;
  const ok = (!want.mode || want.mode === trust.processing_mode) &&
             (!want.severity || want.severity === trust.severity_level);
  console.log("  fixture still exercises its path: " + (ok ? "yes" : "NO, THIS FIXTURE HAS DRIFTED"));
  console.log("=".repeat(72));

  if (out.banner && out.banner.text) {
    const b = say(out.banner.text);
    console.log("\n  [banner] " + b.text + (b.fellBack ? "   <-- ENGLISH FALLBACK" : ""));
  }

  (out.cards || []).forEach((card, index) => {
    console.log("\n  --- card " + (index + 1) + ": " + card.id + " ---");
    [["title", card.title], ["answer", card.short_answer]].forEach(([label, value]) => {
      if (!value) return;
      const r = say(value);
      console.log("    " + label + ": " + r.text + (r.fellBack ? "   <-- ENGLISH FALLBACK" : ""));
    });
    (card.steps || []).forEach((step) => {
      const r = say(step);
      console.log("    step: " + r.text + (r.fellBack ? "   <-- ENGLISH FALLBACK" : ""));
    });
  });

  // The Document check panel: the why chips plus the safe next step.
  const signals = [].concat(trust.severity_signals || [], trust.scam_signals || []);
  if (signals.length) {
    console.log("\n  --- document check, why chips ---");
    signals.forEach((signal) => {
      const r = say(String(signal).trim());
      const shown = r.text.trim().replace(/[.।]+$/, "");
      console.log("    chip: " + shown + (r.fellBack ? "   <-- ENGLISH FALLBACK" : ""));
    });
  }
  if (trust.safe_next_step) {
    const r = say(trust.safe_next_step);
    console.log("\n  safe next step: " + r.text + (r.fellBack ? "   <-- ENGLISH FALLBACK" : ""));
  }
}

// --------------------------------------------------------------------------
// Pattern rendering. Three value sets, chosen so that languages with agreement
// after numerals, gendered labels or elision all get exercised.
//   A: small, singular, short vowel initial sender
//   B: mid, the 2 to 4 agreement band in Slavic languages
//   C: large, plural, long consonant initial sender
// --------------------------------------------------------------------------
const VALUE_SETS = {
  "A small / singular / vowel initial sender": {
    amount: "£8.50", date: "1 May 2026", header_date: "1 May 2026", dates: "1 May 2026",
    sender: "EDF", organisation: "EDF", topic: "an appointment",
    type_label: "a bill or payment request", category_label: "a bill or payment request",
    consequence: "a late fee", consequence_clause: "a late fee",
    action_sentence: "the amount shown.", title: "What is this?",
    short_answer: "This looks like a bill.", explanation: "It can be read clearly.",
    key_points: "One point.", sentence_body: "the amount shown", field_list: "reference"
  },
  "B mid / 2 to 4 band / feminine topic": {
    amount: "£142.50", date: "3 June 2026", header_date: "3 June 2026",
    dates: "3 June 2026, 4 June 2026, 5 June 2026",
    sender: "Hounslow Council", organisation: "Hounslow Council",
    topic: "a legal or court matter",
    type_label: "an official letter", category_label: "an official letter",
    consequence: "further charges", consequence_clause: "further charges",
    action_sentence: "the deadline shown.", title: "What is this?",
    short_answer: "This looks like a notice.", explanation: "It can be read clearly.",
    key_points: "Three points.", sentence_body: "the deadline shown", field_list: "reference, date"
  },
  "C large / plural / long sender": {
    amount: "£1,247.00", date: "3 September 2026", header_date: "3 September 2026",
    dates: "3 September 2026, 17 September 2026",
    sender: "Marston Holdings Enforcement Agents",
    organisation: "Marston Holdings Enforcement Agents",
    topic: "housing or rent",
    type_label: "a legal or court document", category_label: "a legal or court document",
    consequence: "enforcement action and further fees",
    consequence_clause: "enforcement action and further fees",
    action_sentence: "the amount and the deadline on the original notice.",
    title: "What could happen if I ignore it?",
    short_answer: "The document says enforcement agents may attend.",
    explanation: "This helps you decide how carefully to respond.",
    key_points: "Several points.", sentence_body: "the amount and the deadline",
    field_list: "reference, date, amount"
  }
};

function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (m, k) => (values[k] !== undefined ? values[k] : m));
}

function renderPatterns() {
  console.log("\n\n" + "#".repeat(72));
  console.log("ALL " + enBank.patterns.length + " PATTERNS, THREE VALUE SETS EACH");
  console.log("#".repeat(72));
  enBank.patterns.forEach((entry, i) => {
    console.log("\n" + (i + 1) + ". " + entry.id);
    Object.entries(VALUE_SETS).forEach(([label, values]) => {
      const source = fill(entry.template, values);
      const r = say(source);
      console.log("   " + label);
      console.log("     en  " + source);
      console.log("     " + code + "  " + r.text + (r.fellBack ? "   <-- ENGLISH FALLBACK" : ""));
    });
  });
}

console.log("LANGUAGE: " + code);
if (only !== "patterns") Object.keys(FIXTURES).forEach(renderScenario);
if (only !== "scenarios") renderPatterns();
