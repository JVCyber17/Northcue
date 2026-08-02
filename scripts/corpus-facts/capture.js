#!/usr/bin/env node
// Captures the fact extractor's real output for every corpus document, so the
// offline harnesses can reproduce production without a key and without a call.
//
// WHY THIS EXISTS NOW AND NOT BEFORE. tests/fixtures/corpus-facts.json was
// produced by hand when the corpus was 40 documents. The corpus is 70. Nothing
// regenerated it and nothing noticed: 30 documents have no captured facts, and
// every consumer quietly ran them factless. That includes
// scripts/reader-output/run.js, where it meant the "floor" being compared
// against was BELOW what production serves, on the two documents the comparison
// mattered most for.
//
// A fixture that silently covers less than it claims is worse than no fixture,
// because its consumers report a number either way. So this script exists, and
// the harnesses now fail loudly on a document it has not covered.
//
// RE-RUN IT WHENEVER THE CORPUS GROWS. That is the whole maintenance contract.
// If you add a document and do not run this, reader-output tells you so by name
// rather than running it factless.
//
// Usage:
//   node scripts/corpus-facts/capture.js            every uncovered document
//   node scripts/corpus-facts/capture.js --all      recapture everything
//   node scripts/corpus-facts/capture.js --only <id>
//   node scripts/corpus-facts/capture.js --dry-run  say what it would call
//
// Costs one extractor call per uncovered document, at the extractor's own
// budget. Needs OPENAI_API_KEY.

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const REPO = path.join(__dirname, "..", "..");
const { loadEnvFile } = require(path.join(REPO, "src", "utils", "loadEnv.js"));
loadEnvFile(REPO);

const { CORPUS } = require(path.join(REPO, "scripts", "engine-baseline", "corpus"));
const { extractFacts } = require(path.join(REPO, "src", "services", "aiFactExtractionService"));
const { redactForAi } = require(path.join(REPO, "src", "services", "aiStructuredResultService"));

const FIXTURE = path.join(REPO, "tests", "fixtures", "corpus-facts.json");

// The same outbound cap and the same budget the route uses. Capturing under
// different limits would produce a fixture production could never reproduce.
const OUTBOUND_MAX_CHARS = Number(process.env.CLEARSTEPS_AI_TEXT_MAX_CHARS || 8000);
const BUDGET_MS = 8000;
const MODEL = "gpt-4.1-mini";

async function main() {
  const args = process.argv.slice(2);
  const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
  const all = args.includes("--all");
  const dryRun = args.includes("--dry-run");

  const existing = fs.existsSync(FIXTURE)
    ? JSON.parse(fs.readFileSync(FIXTURE, "utf8"))
    : {};

  let targets = CORPUS;
  if (only) targets = CORPUS.filter((entry) => entry.id === only);
  else if (!all) targets = CORPUS.filter((entry) => !(entry.id in existing));

  console.log("  corpus " + CORPUS.length + " documents, fixture covers " +
    Object.keys(existing).length);
  console.log("  to capture: " + targets.length +
    (dryRun ? "   (dry run, no calls)" : ""));
  if (!targets.length) { console.log("\n  nothing to do."); return; }

  if (dryRun) {
    targets.forEach((entry) => console.log("    " + entry.id));
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("\n  OPENAI_API_KEY is not set. Add it to .env at the repo root.");
    process.exit(1);
  }

  const captured = Object.assign({}, existing);
  let answered = 0;
  let refused = 0;

  for (const entry of targets) {
    const startedAt = Date.now();
    const { facts, debug } = await extractFacts({
      documentText: redactForAi(entry.text).slice(0, OUTBOUND_MAX_CHARS),
      model: MODEL,
      apiKey: process.env.OPENAI_API_KEY,
      timeoutMs: BUDGET_MS
    });
    const ms = Date.now() - startedAt;

    if (facts) {
      captured[entry.id] = facts;
      answered++;
      console.log("  " + entry.id.padEnd(38) + "captured".padEnd(12) + ms + "ms");
    } else {
      // NOT recorded as an empty object. A document the extractor genuinely
      // could not answer for must stay uncovered, or the fixture would claim
      // coverage it does not have, which is the defect this script exists to
      // end.
      refused++;
      console.log("  " + entry.id.padEnd(38) + "no facts".padEnd(12) + ms + "ms   " +
        ((debug && debug.facts_error_code) || "unknown"));
    }
  }

  // Sorted, so a re-run produces a reviewable diff rather than a reshuffle.
  const sorted = {};
  Object.keys(captured).sort().forEach((key) => { sorted[key] = captured[key]; });
  fs.writeFileSync(FIXTURE, JSON.stringify(sorted, null, 2) + "\n", "utf8");

  console.log("\n  captured " + answered + ", no facts " + refused);
  console.log("  fixture now covers " + Object.keys(sorted).length + " of " + CORPUS.length);
  console.log("  written: tests/fixtures/corpus-facts.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
