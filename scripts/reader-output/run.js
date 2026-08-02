#!/usr/bin/env node
// WHAT A READER ACTUALLY SEES. Six cards, verbatim, per document.
//
// WHY THIS EXISTS, and it is worth being blunt about it. The engine baseline
// (scripts/engine-baseline/run.js) runs runClearStepsEngine and nothing else.
// The phrasing pass applies in the route, AFTER that, so the baseline has never
// seen a single word of model prose. It measures the FLOOR. The reader sees the
// CEILING.
//
// THREE DECISIONS IN THIS PROGRAMME WERE MADE ON THE WRONG MEASUREMENT:
//
//   1. 9607c98 switched the phrasing pass off and reported "no change across
//      40". True of the baseline, and true of nothing a reader ever saw.
//   2. The cost was then stated as "23 readers lose the model's phrasing and
//      gain nothing", derived from how often FACTS changed the engine's own
//      output, which is a statement about the floor and not about what was
//      lost from the ceiling.
//   3. c140289 deleted the validator on the grounds that nothing called it,
//      which was true only because the thing that called it had been switched
//      off, and made the switch unsafe to reverse.
//
// So: any change to the AI path or to the card builders reports THIS, not
// baseline movement. The baseline still matters and still runs; it guards the
// floor, which is what a reader falls back to. It is not evidence about the
// reader's experience and must never again be presented as if it were.
//
// TWO CONDITIONS, one variable.
//
//   floor   the gate is closed, so the engine's own cards are served through
//           the backstop stripper. This is exactly what shipped between
//           1 August and the restore, and exactly what a reader falls back to
//           today whenever the model is refused.
//   prose   the gate is open and the provider is called live.
//
// FACTS ARE HELD CONSTANT. Both conditions receive the same captured extractor
// output from tests/fixtures/corpus-facts.json, so the only thing that differs
// is the phrasing pass. Re-extracting per condition would add a second variable
// and 40 more calls for no gain. 30 of the 70 corpus documents have no captured
// facts; those run with none, in BOTH conditions, which keeps the comparison
// honest for them too.
//
// Usage:
//   node scripts/reader-output/run.js --only bill_with_contacts_page
//   node scripts/reader-output/run.js --english
//   node scripts/reader-output/run.js --only <id> --json out.json
//
// Requires OPENAI_API_KEY for the prose condition. Without it the script says
// so and reports the floor alone rather than pretending.

"use strict";

const fs = require("node:fs");
const path = require("node:path");

// loadEnv EXPORTS loadEnvFile and does not call it. server.js calls
// loadEnvFile(__dirname) on line 21; requiring the module alone does nothing,
// which is how the first version of this script reported "OPENAI_API_KEY is not
// set" against a .env that had carried the key since 28 June.
const { loadEnvFile } = require(path.join(__dirname, "..", "..", "src", "utils", "loadEnv.js"));
loadEnvFile(path.join(__dirname, "..", ".."));

const { CORPUS } = require(path.join(__dirname, "..", "engine-baseline", "corpus"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "..", "src", "services", "clearStepsEngine"));
const aiService = require(path.join(__dirname, "..", "..", "src", "services", "aiStructuredResultService"));
const CORPUS_FACTS = require(path.join(__dirname, "..", "..", "tests", "fixtures", "corpus-facts.json"));

const FILE_META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "reader-output" };

// Documents the extractor genuinely cannot answer for, with the reason. This is
// an exception list, not a silence: every entry has to be justified here, so
// "no facts" is a recorded decision rather than the absence of one.
const NO_FACTS_AVAILABLE = {
  // 1,545 words, and the extractor's own 8,000ms budget is reached before it
  // answers. That budget was chosen when the fact call had to finish inside a
  // 15 second phrasing pass; the justification changed when the phrasing pass
  // was removed and changed back when it returned. Raising it is its own piece
  // of work with its own latency measurement, so this stays listed rather than
  // quietly fixed by a number nobody argued for.
  spec_energy_bill_full: "facts_timeout at the extractor's 8s budget"
};

// The fields a reader actually meets, in the order they meet them. read_aloud_text
// is included because it is what the screen reader speaks, and a card can differ
// there while looking identical.
const READER_FIELDS = [
  "title", "simple_explanation", "key_points", "action_needed",
  "possible_deadline", "possible_payment", "status", "read_aloud_text"
];

function cardsOf(structuredResult) {
  return (structuredResult && structuredResult.cards ? structuredResult.cards : []).map((card) => {
    const out = {};
    READER_FIELDS.forEach((field) => { out[field] = card[field] === undefined ? null : card[field]; });
    return out;
  });
}

// One document, one condition. Mirrors src/routes/simplifyRoute.js: the engine
// composes with the facts, then the safety pass runs and may replace the cards.
async function serve(entry, { withProvider }) {
  const savedKey = process.env.OPENAI_API_KEY;
  if (!withProvider) delete process.env.OPENAI_API_KEY;
  try {
    const facts = CORPUS_FACTS[entry.id] || null;
    const rulesRun = runClearStepsEngine({
      extractedText: entry.text, fileMeta: FILE_META, facts
    });
    const startedAt = Date.now();
    const applied = await aiService.applySafetyPassAndRecordAiStatus({
      rulesRun, extractedText: entry.text, language: "en"
    });
    const ai = (applied.api_output.debug && applied.api_output.debug.ai) || {};
    return {
      cards: cardsOf(applied.api_output.structured_result),
      ai_status: ai.ai_status || null,
      ai_used: Boolean(ai.ai_used),
      ai_error_code: ai.ai_error_code || null,
      // The exact reasons, not just the code. A rejection code says the reader
      // lost the prose; only the reasons say why, and whether it was the model's
      // fault or a guard's.
      validation_errors: ai.validation_errors || null,
      ai_duration_ms: ai.ai_duration_ms === undefined ? Date.now() - startedAt : ai.ai_duration_ms,
      wall_ms: Date.now() - startedAt,
      had_facts: Boolean(facts)
    };
  } finally {
    if (savedKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = savedKey;
  }
}

// Does the prose introduce a FACT the floor did not carry, or only reword?
//
// A fact is a token a reader could check against the paper: a number, a date, a
// capitalised name. Everything else is phrasing. This is deliberately generous
// towards "adds facts", because a false "adds facts" costs a second look and a
// false "phrasing only" hides exactly the thing this harness exists to find.
const FACT_TOKEN = /(?:£\s?[\d,]+(?:\.\d{2})?)|(?:\b\d[\d,.]*\b)|(?:\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,})*\b)/g;

function factTokens(cards) {
  const text = JSON.stringify(cards);
  return new Set((text.match(FACT_TOKEN) || []).map((t) => t.trim()));
}

// WHY a rejection happened, split into the one defect we already understand and
// everything else. The something-else bucket is the point of this: an
// abbreviation mismatch is a known guard defect with a known fix, and anything
// that is not one is a new finding.
//
// THE KNOWN DEFECT. The invented-date guard compares literal date strings, so a
// model that expands the document's own "22 Apr 2026" into "22 April 2026" is
// judged to have invented it. Detected here by taking the date the guard named
// and asking whether the SAME date, with the month abbreviated to three
// letters, is in the document after all.
const MONTHS_LONG = ["january", "february", "march", "april", "may", "june", "july",
  "august", "september", "october", "november", "december"];

function isAbbreviationMismatch(reason, sourceText) {
  const named = /date (.+?) appears in neither/i.exec(String(reason || ""));
  if (!named) return false;
  const date = named[1].trim();
  const source = sourceText.toLowerCase();
  return MONTHS_LONG.some((month) => {
    if (date.indexOf(month) === -1) return false;
    const abbreviated = date.replace(month, month.slice(0, 3));
    // "may" abbreviates to itself, so that alone proves nothing.
    if (abbreviated === date) return false;
    return source.indexOf(abbreviated) !== -1;
  });
}

function rejectionReasons(prose, sourceText) {
  const errors = Array.isArray(prose.validation_errors) ? prose.validation_errors : [];
  const abbreviation = errors.filter((e) => isAbbreviationMismatch(e, sourceText));
  const other = errors.filter((e) => !isAbbreviationMismatch(e, sourceText));
  return {
    all: errors,
    abbreviation,
    other,
    // A rejection counts as the known defect only when EVERY reason is one.
    // One unexplained reason makes the whole rejection a new finding, which is
    // the conservative direction.
    bucket: errors.length === 0 ? "no reason recorded"
      : (other.length === 0 ? "abbreviation" : "something else")
  };
}

function classify(floor, prose) {
  if (!prose.ai_used || prose.ai_status !== "completed") return "rejected";
  if (JSON.stringify(floor.cards) === JSON.stringify(prose.cards)) return "identical";
  const before = factTokens(floor.cards);
  const gained = [...factTokens(prose.cards)].filter((t) => !before.has(t));
  return gained.length ? "adds facts" : "adds only phrasing";
}

function newFacts(floor, prose) {
  const before = factTokens(floor.cards);
  return [...factTokens(prose.cards)].filter((t) => !before.has(t));
}

function printCards(label, result) {
  console.log("\n  ---- " + label + " ".repeat(Math.max(0, 46 - label.length)) + "----");
  console.log("       ai_status " + JSON.stringify(result.ai_status) +
    "   ai_used " + result.ai_used +
    (result.ai_error_code ? "   error " + JSON.stringify(result.ai_error_code) : "") +
    "   " + result.wall_ms + "ms");
  result.cards.forEach((card, index) => {
    console.log("\n       CARD " + (index + 1) + "  " + card.title);
    console.log("         answer   " + JSON.stringify(card.simple_explanation));
    (card.key_points || []).forEach((point, i) => {
      console.log("         point " + (i + 1) + "  " + JSON.stringify(point));
    });
    if (card.action_needed) console.log("         action   " + JSON.stringify(card.action_needed));
    if (card.possible_deadline) console.log("         deadline " + JSON.stringify(card.possible_deadline));
    if (card.possible_payment) console.log("         payment  " + JSON.stringify(card.possible_payment));
  });
}

async function main() {
  const args = process.argv.slice(2);
  const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
  const englishOnly = args.includes("--english");
  const jsonPath = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
  const verbose = Boolean(only) || args.includes("--verbose");

  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  if (!hasKey) {
    console.log("\n  OPENAI_API_KEY is not set.");
    console.log("  Reporting the FLOOR only. The prose condition needs a key:");
    console.log("      echo \"OPENAI_API_KEY=sk-...\" >> .env\n");
  }

  let documents = CORPUS;
  if (only) documents = CORPUS.filter((entry) => entry.id === only);
  else if (englishOnly) documents = CORPUS.filter((entry) => !/[^\x00-\x7F]/.test(
    entry.text.replace(/[£€–—''""]/g, "")));
  if (!documents.length) {
    console.error("  no document matched " + JSON.stringify(only));
    process.exit(1);
  }

  // FAIL LOUDLY ON A DOCUMENT WITH NO CAPTURED FACTS.
  //
  // The fixture stopped at 40 documents while the corpus grew to 70, and every
  // consumer ran the uncovered 30 factless while reporting a number as if it
  // had not. That is how an NHS appointment letter came to be rendered as a
  // bailiff threat with no test seeing it: production runs the live extractor,
  // the fixture did not cover the document, and nothing compared the two.
  //
  // So a missing document is an error and not a shrug. The floor it would
  // produce is BELOW what production serves, which makes the whole comparison
  // wrong in the direction that flatters the prose.
  const uncovered = documents.filter((entry) => !(entry.id in CORPUS_FACTS))
    .map((entry) => entry.id)
    .filter((id) => !NO_FACTS_AVAILABLE[id]);
  if (uncovered.length) {
    console.error("\n  These documents have no captured facts, so the floor would be");
    console.error("  below what production serves and the comparison would be wrong:\n");
    uncovered.forEach((id) => console.error("      " + id));
    console.error("\n  Run: node scripts/corpus-facts/capture.js\n");
    process.exit(1);
  }

  const rows = [];
  for (const entry of documents) {
    const floor = await serve(entry, { withProvider: false });
    const prose = hasKey ? await serve(entry, { withProvider: true }) : null;
    const verdict = prose ? classify(floor, prose) : "floor only";
    const why = prose && verdict === "rejected" ? rejectionReasons(prose, entry.text) : null;
    rows.push({
      id: entry.id, verdict, floor, prose,
      gained: prose ? newFacts(floor, prose) : [],
      rejection: why
    });

    if (verbose) {
      console.log("\n" + "=".repeat(78));
      console.log("  " + entry.id + "   [" + verdict + "]" +
        (floor.had_facts ? "" : "   (no captured facts, both conditions)"));
      console.log("=".repeat(78));
      printCards("FLOOR, the engine's own cards", floor);
      if (prose) printCards("PROSE, restored", prose);
      if (prose && rows[rows.length - 1].gained.length) {
        console.log("\n       NEW IN THE PROSE: " + JSON.stringify(rows[rows.length - 1].gained));
      }
    } else {
      console.log("  " + entry.id.padEnd(38) + verdict.padEnd(18) +
        (why ? why.bucket.padEnd(17) : "".padEnd(17)) +
        (prose ? prose.wall_ms + "ms" : ""));
      if (why && why.other.length) {
        why.other.forEach((e) => console.log("        NEW: " + String(e).slice(0, 100)));
      }
    }
  }

  if (!verbose) {
    console.log("\n  " + "-".repeat(70));
    const counts = {};
    rows.forEach((r) => { counts[r.verdict] = (counts[r.verdict] || 0) + 1; });
    Object.keys(counts).sort().forEach((k) => console.log("  " + k.padEnd(22) + counts[k]));

    const rejected = rows.filter((r) => r.rejection);
    if (rejected.length) {
      console.log("\n  rejections by reason:");
      const buckets = {};
      rejected.forEach((r) => { buckets[r.rejection.bucket] = (buckets[r.rejection.bucket] || 0) + 1; });
      Object.keys(buckets).sort().forEach((k) => console.log("    " + k.padEnd(20) + buckets[k]));
      const newOnes = rejected.filter((r) => r.rejection.other.length);
      if (newOnes.length) {
        console.log("\n  SOMETHING ELSE, every distinct reason:");
        const seen = new Set();
        newOnes.forEach((r) => r.rejection.other.forEach((e) => {
          const key = String(e).replace(/\b[\d,.]+\b/g, "N").replace(/"[^"]*"/g, "Q");
          if (seen.has(key)) return;
          seen.add(key);
          console.log("    " + r.id + "  " + String(e).slice(0, 96));
        }));
      }
    }
    const timed = rows.filter((r) => r.prose).map((r) => r.prose.wall_ms).sort((a, b) => a - b);
    if (timed.length) {
      const at = (p) => timed[Math.min(timed.length - 1, Math.floor(timed.length * p))];
      console.log("\n  latency  min " + timed[0] + "  p50 " + at(0.5) +
        "  p90 " + at(0.9) + "  max " + timed[timed.length - 1] + " ms");
    }
  }

  if (jsonPath) {
    fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2), "utf8");
    console.log("\n  written: " + jsonPath);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
