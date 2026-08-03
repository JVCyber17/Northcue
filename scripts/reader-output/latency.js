#!/usr/bin/env node
// The prose call's latency distribution, measured UNCENSORED so a ceiling can
// be chosen from evidence rather than from the number already in the file.
//
// WHY THE EXISTING DATA CANNOT ANSWER THE QUESTION. Every run so far used
// CLEARSTEPS_AI_TIMEOUT_MS=25000, so a call that hit the ceiling recorded
// 25,019ms and told us only ">= 25s". That is censored data: it cannot say
// whether that call would have finished at 26s or at 90s, and the difference is
// the whole decision. Raising the ceiling for the MEASUREMENT and lowering it
// again for production is the only way to see the tail.
//
// WHAT A READER WAITS is not the same as what a call takes, and it is the thing
// worth optimising:
//
//   call completes before the ceiling   the reader waits the call, gets prose
//   call hits the ceiling               the reader waits the WHOLE ceiling and
//                                       then gets the floor
//
// So raising the ceiling trades a longer worst-case wait for a lower refusal
// rate, and the report below prices both at each candidate rather than naming a
// winner. That is how the extractor's own 8,000ms budget was chosen and it is
// the standard this repo holds numbers to.
//
// Usage:
//   node scripts/reader-output/latency.js --rounds 3
//   node scripts/reader-output/latency.js --rounds 1 --ceiling 60000
//
// SEQUENTIAL ON PURPOSE. Running the calls concurrently would measure the
// provider's queuing behaviour under our own load rather than what one reader
// experiences, and the number would be optimistic in a way that matters.

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const REPO = path.join(__dirname, "..", "..");
const { loadEnvFile } = require(path.join(REPO, "src", "utils", "loadEnv.js"));
loadEnvFile(REPO);

const args = process.argv.slice(2);
const rounds = args.includes("--rounds") ? Number(args[args.indexOf("--rounds") + 1]) : 3;
const ceiling = args.includes("--ceiling") ? Number(args[args.indexOf("--ceiling") + 1]) : 90000;
const jsonPath = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;

// Set BEFORE the service is required: AI_TIMEOUT_MS is read at module load.
process.env.CLEARSTEPS_AI_TIMEOUT_MS = String(ceiling);

const { CORPUS } = require(path.join(REPO, "scripts", "engine-baseline", "corpus"));
const { runClearStepsEngine } = require(path.join(REPO, "src", "services", "clearStepsEngine"));
const aiService = require(path.join(REPO, "src", "services", "aiStructuredResultService"));
const CORPUS_FACTS = require(path.join(REPO, "tests", "fixtures", "corpus-facts.json"));

const FILE_META = { mimeType: "application/pdf", selectedCategory: "auto", jobId: "latency" };

function quantile(sorted, p) {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("  OPENAI_API_KEY is not set. Add it to .env at the repo root.");
    process.exit(1);
  }

  // Only documents the gate actually hands to the provider. A gate skip costs
  // no wait at all and would drag every statistic towards zero.
  const english = CORPUS.filter((entry) =>
    !/[^\x00-\x7F]/.test(entry.text.replace(/[£€–—''""]/g, "")));
  const reaching = english.filter((entry) => {
    const run = runClearStepsEngine({
      extractedText: entry.text, fileMeta: FILE_META, facts: CORPUS_FACTS[entry.id] || null
    });
    return aiService.providerSkipReason({ rulesRun: run, language: "en" }) === null;
  });

  console.log("  measuring with a " + ceiling + "ms ceiling so nothing is censored");
  console.log("  " + reaching.length + " documents reach the provider, " +
    rounds + " rounds, " + (reaching.length * rounds) + " calls, sequential\n");

  const samples = [];
  for (let round = 1; round <= rounds; round++) {
    for (const entry of reaching) {
      const run = runClearStepsEngine({
        extractedText: entry.text, fileMeta: FILE_META, facts: CORPUS_FACTS[entry.id] || null
      });
      const startedAt = Date.now();
      let outcome = "completed";
      try {
        const candidate = await aiService.requestStructuredResultFromOpenAi({
          extractedText: entry.text,
          fallbackStructuredResult: run.api_output.structured_result,
          model: "gpt-4.1-mini",
          inputQuality: run.api_output.trust.input_quality,
          garbledByOcr: Boolean(run.structured_output.trust_internal.garbled_by_ocr)
        });
        if (!candidate) outcome = "empty";
      } catch (error) {
        outcome = /abort|timeout/i.test(String(error && error.message)) ? "timed_out" : "error";
      }
      const ms = Date.now() - startedAt;
      samples.push({ round, id: entry.id, ms, outcome });
      console.log("  r" + round + "  " + entry.id.padEnd(36) +
        String(ms).padStart(6) + "ms  " + outcome);
    }
  }

  const clean = samples.filter((s) => s.outcome === "completed").map((s) => s.ms).sort((a, b) => a - b);
  const censored = samples.filter((s) => s.outcome !== "completed");

  console.log("\n\n  === THE UNCENSORED DISTRIBUTION ===\n");
  console.log("    n " + clean.length + " completed, " + censored.length + " not completed");
  [["min", 0], ["p50", 0.5], ["p75", 0.75], ["p90", 0.9], ["p95", 0.95], ["p99", 0.99]]
    .forEach(([label, p]) => console.log("    " + label + "  " + quantile(clean, p) + " ms"));
  console.log("    max  " + clean[clean.length - 1] + " ms");
  if (censored.length) {
    console.log("\n    not completed even at the measurement ceiling:");
    censored.forEach((s) => console.log("      " + s.id + "  " + s.outcome + "  " + s.ms + "ms"));
  }

  console.log("\n\n  === WHAT EACH CANDIDATE CEILING COSTS A READER ===\n");
  console.log("    " + "ceiling".padEnd(10) + "times out".padEnd(12) +
    "reader wait p50".padEnd(18) + "p90".padEnd(10) + "worst");
  [15000, 20000, 25000, 30000, 35000, 40000, 45000].forEach((candidate) => {
    // A call over the candidate is refused, and that reader waits the whole
    // candidate before receiving the floor.
    const waits = samples.map((s) => (s.ms >= candidate ? candidate : s.ms)).sort((a, b) => a - b);
    const timedOut = samples.filter((s) => s.ms >= candidate).length;
    const pct = ((timedOut / samples.length) * 100).toFixed(1);
    console.log("    " + (candidate / 1000 + "s").padEnd(10) +
      (timedOut + " (" + pct + "%)").padEnd(12) +
      (quantile(waits, 0.5) + " ms").padEnd(18) +
      (quantile(waits, 0.9) + " ms").padEnd(10) +
      waits[waits.length - 1] + " ms");
  });

  console.log("\n  Documents that timed out in more than one round, if any:");
  const byId = {};
  samples.forEach((s) => {
    if (s.ms < 25000) return;
    byId[s.id] = (byId[s.id] || 0) + 1;
  });
  const repeat = Object.keys(byId).filter((id) => byId[id] > 1);
  console.log("    " + (repeat.length
    ? repeat.map((id) => id + " x" + byId[id]).join(", ")
    : "none, which is what non-determinism predicts"));

  if (jsonPath) {
    fs.writeFileSync(jsonPath, JSON.stringify(samples, null, 2), "utf8");
    console.log("\n  written: " + jsonPath);
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
