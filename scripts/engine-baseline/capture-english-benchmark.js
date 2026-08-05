#!/usr/bin/env node
// CAPTURES THE ENGLISH BENCHMARK: one known-good model candidate per reachable
// corpus document, plus the production-scale benchmark shapes, stored RAW so
// tests/englishBenchmark.test.js can replay them through the live guard stack
// forever without a network call.
//
// WHY CAPTURED CANDIDATES AND NOT A LIVE RATE. The prose path is
// non-deterministic and a unit test cannot call a provider, so "the completion
// rate" cannot be a test directly. What CAN be pinned deterministically is the
// half of the rate the codebase controls: given model output that served an
// English reader on the day quality was confirmed, the guard stack must go on
// serving it. Any guard change, in any language, that would newly reject or
// degrade that output is a red build. Model drift is the other half, and it is
// covered by the daily production check, not by CI.
//
// A candidate is stored only if it SERVES through today's full stack, so the
// fixture is known-good by construction. Timeouts retry twice; a document whose
// candidate never serves is recorded as absent, loudly.
//
// Rerun to refresh after a deliberate prompt or guard change:
//   node scripts/engine-baseline/capture-english-benchmark.js

"use strict";

const fs = require("fs");
const path = require("path");
const { loadEnvFile } = require(path.join(__dirname, "..", "..", "src", "utils", "loadEnv"));
loadEnvFile(path.join(__dirname, "..", ".."));

const { CORPUS } = require(path.join(__dirname, "corpus"));
const { BENCHMARK_DOCS } = require(path.join(__dirname, "corpus-benchmark"));
const { runClearStepsEngine } = require(path.join(__dirname, "..", "..", "src", "services", "clearStepsEngine"));
const ai = require(path.join(__dirname, "..", "..", "src", "services", "aiStructuredResultService"));
const CORPUS_FACTS = require(path.join(__dirname, "..", "..", "tests", "fixtures", "corpus-facts.json"));

const OUT = path.join(__dirname, "..", "..", "tests", "fixtures", "english-benchmark-candidates.json");
const FILE_META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "benchmark-capture" };
const CONCURRENCY = 6;

async function candidateFor(entry) {
  const rulesRun = runClearStepsEngine({
    extractedText: entry.text, fileMeta: FILE_META, facts: CORPUS_FACTS[entry.id] || null
  });
  const fallback = rulesRun.api_output.structured_result;
  const inputQuality = rulesRun.api_output.trust?.input_quality || "unknown";
  const garbledByOcr = Boolean(rulesRun.structured_output?.trust_internal?.garbled_by_ocr);
  const raw = await ai.requestStructuredResultFromOpenAi({
    extractedText: entry.text, fallbackStructuredResult: fallback,
    model: ai.DEFAULT_MODEL, inputQuality, garbledByOcr
  });
  return { raw, fallback };
}

async function pool(jobs, size, run) {
  const out = new Array(jobs.length);
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (true) { const i = next++; if (i >= jobs.length) return; out[i] = await run(jobs[i]); }
  }));
  return out;
}

(async () => {
  if (!process.env.OPENAI_API_KEY) { console.error("OPENAI_API_KEY is not set"); process.exit(1); }

  const reachable = CORPUS.filter((entry) => {
    const run = runClearStepsEngine({
      extractedText: entry.text, fileMeta: FILE_META, facts: CORPUS_FACTS[entry.id] || null
    });
    return !ai.providerSkipReason({ rulesRun: run, language: "en" });
  }).concat(BENCHMARK_DOCS);

  console.log("\n  capturing " + reachable.length + " documents, " + CONCURRENCY + " at a time\n");
  const captured = {};
  const absent = [];
  let done = 0;

  await pool(reachable, CONCURRENCY, async (entry) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { raw } = await candidateFor(entry);
        // Known-good by construction: store only a candidate today's stack serves.
        const rulesRun = runClearStepsEngine({
          extractedText: entry.text, fileMeta: FILE_META, facts: CORPUS_FACTS[entry.id] || null
        });
        const fallback = rulesRun.api_output.structured_result;
        const { sanitizeStructuredResultWithVerdict } =
          require(path.join(__dirname, "..", "..", "src", "utils", "validateStructuredResult"));
        const verdict = sanitizeStructuredResultWithVerdict(raw, fallback, entry.text);
        if (!verdict.rejected) {
          captured[entry.id] = raw;
          break;
        }
      } catch (error) { /* timeout or parse: retry */ }
    }
    if (!captured[entry.id]) absent.push(entry.id);
    done++;
    if (done % 10 === 0) console.log("    " + done + "/" + reachable.length);
  });

  fs.writeFileSync(OUT, JSON.stringify({
    captured_note: "Known-good English model candidates. Replayed by tests/englishBenchmark.test.js through the live guard stack. Refresh with scripts/engine-baseline/capture-english-benchmark.js after a DELIBERATE prompt or guard change, never to make a red build green.",
    candidates: captured
  }, null, 1), "utf8");

  console.log("\n  captured " + Object.keys(captured).length + " of " + reachable.length);
  if (absent.length) {
    console.log("  ABSENT, never served in three attempts:");
    absent.forEach((id) => console.log("    " + id));
  }
  console.log("  written: " + OUT + "\n");
})().catch((e) => { console.error(e); process.exit(1); });
