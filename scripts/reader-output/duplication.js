#!/usr/bin/env node
// DOES THE READER MEET THE SAME FACT TWICE, AND IN WHAT TWO SHAPES.
//
// Item E opened three contact-number gates and the number now reaches card 3.
// It reaches it TWICE: once as the engine's own labelled line, which is
// protected at source by provenance, and once inside the model's prose, which
// is not. This measures that, and it measures it across REPEAT RUNS, because
// the prose path is non-deterministic and one run measures a rate rather than
// a document.
//
// WHY REPEATS ARE THE POINT, not a refinement. The obvious fix for a duplicate
// is to drop the engine's line when the model has already said it. That makes
// the protected line CONDITIONAL ON THE MODEL: present on the runs where the
// model happens to mention the number, absent on the runs where it does not,
// for the same reader on the same document. A single run cannot see that. So
// this script runs the prose condition N times and reports, per document and
// per field, how many of the N mentioned it.
//
// It captures every card verbatim rather than answering one question, so the
// same JSON settles the phone number, the amount, the date and the reference
// without another round of live calls.
//
// Usage:
//   node scripts/reader-output/duplication.js --runs 5 --json out.json
//   node scripts/reader-output/duplication.js --only bill_with_contacts_page

"use strict";

const fs = require("fs");
const path = require("path");

// loadEnv.js EXPORTS loadEnvFile without calling it. Requiring the module is
// not enough, and forgetting that is how this programme twice reported an API
// key missing that had been in .env for weeks.
const { loadEnvFile } = require(path.join(__dirname, "..", "..", "src", "utils", "loadEnv"));
loadEnvFile(path.join(__dirname, "..", ".."));

const { CORPUS } = require(path.join(__dirname, "..", "engine-baseline", "corpus"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "..", "src", "services", "clearStepsEngine"));
const aiService = require(path.join(__dirname, "..", "..", "src", "services", "aiStructuredResultService"));
const CORPUS_FACTS = require(path.join(__dirname, "..", "..", "tests", "fixtures", "corpus-facts.json"));

const FILE_META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "duplication" };

// One run, one condition. Mirrors scripts/reader-output/run.js exactly, which
// in turn mirrors src/routes/simplifyRoute.js. Also returns the engine's own
// protected_key_points, because the question here is what the protection
// contributes on top of what the model says unprompted.
async function serve(entry, withProvider) {
  const savedKey = process.env.OPENAI_API_KEY;
  if (!withProvider) delete process.env.OPENAI_API_KEY;
  try {
    const facts = CORPUS_FACTS[entry.id] || null;
    const rulesRun = runClearStepsEngine({ extractedText: entry.text, fileMeta: FILE_META, facts });

    // SNAPSHOT BEFORE THE AI PASS, and the reason is a bug this file already
    // had. applySafetyPassAndRecordAiStatus replaces the cards on rulesRun in
    // place, so reading protected_key_points off it afterwards returns the
    // SERVED cards, which do not carry that field. Every protected set came
    // back empty, which made "the model said it in its own words" trivially
    // true of the engine's own protected line and produced a duplication table
    // that was all zeros for the wrong reason.
    const engine = JSON.parse(JSON.stringify(rulesRun.api_output.structured_result.cards || []));

    const applied = await aiService.applySafetyPassAndRecordAiStatus({
      rulesRun, extractedText: entry.text, language: "en"
    });
    const ai = (applied.api_output.debug && applied.api_output.debug.ai) || {};
    const served = applied.api_output.structured_result.cards || [];
    return {
      ai_status: ai.ai_status || null,
      ai_used: Boolean(ai.ai_used),
      cards: served.map((card, i) => ({
        card_number: card.card_number,
        title: card.title,
        simple_explanation: card.simple_explanation,
        key_points: (card.key_points || []).slice(),
        possible_deadline: card.possible_deadline || null,
        possible_payment: card.possible_payment || null,
        // Marked at source by item 1. These are the lines the merge is
        // obliged to keep, whatever the model wrote.
        protected_key_points: ((engine[i] || {}).protected_key_points || []).slice()
      }))
    };
  } finally {
    if (savedKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = savedKey;
  }
}

// The values the engine extracted, so a "mention" can be tested against the
// actual value rather than against a phrasing.
function valuesFor(entry) {
  const facts = CORPUS_FACTS[entry.id] || null;
  const run = runClearStepsEngine({ extractedText: entry.text, fileMeta: FILE_META, facts });
  const internal = (run.structured_output && run.structured_output.extractor_internal) || {};
  const cards = run.api_output.structured_result.cards || [];
  return {
    contact_number: internal.contact_number || null,
    amount: (cards[4] && cards[4].possible_payment) || internal.selected_amount || null,
    deadline: (cards[3] && cards[3].possible_deadline) || null,
    reference: (internal.reference_numbers || [])[0] || null
  };
}

// Does this text carry the value? Compared on digits for numbers so spacing
// never decides the answer, and on the literal string otherwise.
function mentions(text, value) {
  if (!value || !text) return false;
  const haystack = String(text);
  if (haystack.indexOf(String(value)) >= 0) return true;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length >= 5 && haystack.replace(/[^\d]/g, "").indexOf(digits) >= 0) return true;
  return false;
}

function cardText(card) {
  return [card.simple_explanation].concat(card.key_points || []).filter(Boolean).join(" • ");
}

async function main() {
  const args = process.argv.slice(2);
  const runs = args.includes("--runs") ? Number(args[args.indexOf("--runs") + 1]) : 5;
  const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
  const jsonPath = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;

  if (!process.env.OPENAI_API_KEY) {
    console.error("\n  OPENAI_API_KEY is not set. This script measures the prose path;");
    console.error("  without a key there is nothing to compare the engine against.\n");
    process.exit(1);
  }

  // Every document where a contact number binds, since that is the set item E
  // moved, plus anything named explicitly.
  let documents = CORPUS;
  if (only) documents = CORPUS.filter((e) => e.id === only);
  else documents = CORPUS.filter((e) => valuesFor(e).contact_number);

  console.log("\n  " + documents.length + " documents, " + runs + " prose runs each.\n");

  const out = [];
  for (const entry of documents) {
    const values = valuesFor(entry);
    const floor = await serve(entry, false);
    const proseRuns = [];
    for (let i = 0; i < runs; i++) proseRuns.push(await serve(entry, true));

    out.push({ id: entry.id, values, floor, prose: proseRuns });

    // Live progress, per field, so a long run is readable while it happens.
    const line = ["contact_number", "amount", "deadline", "reference"].map((field) => {
      const value = values[field];
      if (!value) return field + " -";
      const hits = proseRuns.filter((r) =>
        r.cards.some((c) => mentions(cardText(c), value))).length;
      return field + " " + hits + "/" + runs;
    }).join("   ");
    console.log("  " + entry.id.padEnd(36) + line);
  }

  if (jsonPath) {
    fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2), "utf8");
    console.log("\n  written: " + jsonPath);
  }
  console.log("");
}

main().catch((error) => { console.error(error); process.exit(1); });
