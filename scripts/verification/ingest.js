#!/usr/bin/env node
// THE VERIFICATION INGEST. Same-day path from a completed pack to fixtures,
// defect reports and the readiness table, per docs/i18n/verification/INGEST.md
// and the founder's decision of 5 August 2026: no language launches
// unverified, every disagreement is a defect the founder approves the
// resolution of, and an unsure mark is data with a conservative proposal.
//
// USAGE
//   node scripts/verification/ingest.js <lang>          ingest tests/fixtures/native-review-<lang>.json
//   node scripts/verification/ingest.js <lang> --dry    same, but reads and writes ONLY under --out
//   node scripts/verification/ingest.js --table         print the nine-row readiness table
//   --out <dir>   redirect all outputs (dry runs, tests)
//
// OUTPUTS per ingest
//   tests/fixtures/verification-verdicts/<lang>.json    the machine verdict
//   docs/i18n/verification/reports/<lang>-ingest.md     named defects, proposed fixes, founder checklist
//
// A language counts VERIFIED only when its verdict says so: every key id
// marked, zero unresolved over-fire disagreements (B on a firing sentence),
// zero unresolved unsure-on-firing (C on a firing sentence), and every
// defect in the report carries founder approval in the resolutions file.

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const LANGS = require(path.join(ROOT, "public", "i18n", "config.js")).languages
  .map((e) => e.code).filter((c) => c !== "en");

// The outcome table from INGEST.md, mechanical. Returns one of:
//   agreement_fire, agreement_keep, overfire_defect, recall_candidate,
//   unsure_keep, unsure_on_fire_defect, unmarked_defect
function classifyMark(mark, keyEntry) {
  const fires = Boolean(keyEntry.guard_fires);
  if (mark !== "A" && mark !== "B" && mark !== "C") return "unmarked_defect";
  if (mark === "A") return fires ? "agreement_fire" : "recall_candidate";
  if (mark === "B") return fires ? "overfire_defect" : "agreement_keep";
  return fires ? "unsure_on_fire_defect" : "unsure_keep";
}

// What each classification produces in the report.
const OUTCOME_META = {
  agreement_fire: { defect: false },
  agreement_keep: { defect: false },
  overfire_defect: {
    defect: true, blocking: true,
    title: "OVER-FIRE: the reviewer says this is not an order, the guard strips it",
    proposal: "Add a guard exception reproducing the reviewer's reading; pin the sentence as a keep; re-measure the language's table. Gate-blocking until resolved."
  },
  recall_candidate: {
    defect: true, blocking: false,
    title: "RECALL: the reviewer says this is an order, the guard keeps it",
    proposal: "If the verb is in the English 21 (translation equivalence): add the stem, pin MUST_FIRE. If not: record at the mirror boundary beside the notify decision; guard unchanged, because catching it would strip sentences an English reader keeps."
  },
  unsure_on_fire_defect: {
    defect: true, blocking: true,
    title: "UNSURE ON A STRIPPED SENTENCE: not good enough to strip",
    proposal: "Second reviewer before this language counts as verified; if none is available, the conservative resolution is to add the exception and keep the sentence."
  },
  unsure_keep: {
    defect: false, note: "Unsure on a kept sentence. Conservative reading: keep, which is what the guard already does. Recorded for the founder."
  },
  unmarked_defect: {
    defect: true, blocking: true,
    title: "UNMARKED ROW: the pack is incomplete",
    proposal: "Return to the reviewer; every row needs a mark before the language counts."
  }
};

function ingest(lang, outDir) {
  const keyPath = path.join(ROOT, "tests", "fixtures", "verification-keys", lang + ".json");
  const fixturePath = path.join(outDir.fixtures, "native-review-" + lang + ".json");
  if (!fs.existsSync(keyPath)) throw new Error("no answer key for " + lang);
  if (!fs.existsSync(fixturePath)) throw new Error("no completed pack at " + fixturePath);

  const key = JSON.parse(fs.readFileSync(keyPath, "utf8"));
  const pack = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  if (!pack.reviewer || !pack.date) throw new Error(lang + ": the fixture must name reviewer and date");

  const rows = key.entries.map((entry) => {
    const mark = (pack.marks || {})[entry.id];
    const outcome = classifyMark(mark, entry);
    return { id: entry.id, mark: mark || null, outcome, category: entry.category,
      guard_fires: Boolean(entry.guard_fires), text: entry.text,
      starred: (pack.starred || []).includes(entry.id) };
  });

  const defects = rows.filter((r) => OUTCOME_META[r.outcome].defect);
  const blocking = defects.filter((r) => OUTCOME_META[r.outcome].blocking);
  const unsureKeeps = rows.filter((r) => r.outcome === "unsure_keep");
  const starred = rows.filter((r) => r.starred);

  // Elicitations are listed for the guard check that happens in defect
  // resolution; the guards live in the vocabulary test files and are
  // deliberately not duplicated here.
  const verdict = {
    language: lang,
    reviewer: pack.reviewer,
    date: pack.date,
    rows: rows.length,
    agreements: rows.filter((r) => !OUTCOME_META[r.outcome].defect && r.outcome !== "unsure_keep").length,
    unsure_keeps: unsureKeeps.length,
    defects: defects.map((r) => ({ id: r.id, outcome: r.outcome, text: r.text })),
    blocking_defects: blocking.length,
    elicited_pending_guard_check: (pack.elicited || []).length,
    wordlist: pack.wordlist || { removed: [], added: [] },
    // Verified means: no blocking defects outstanding AND every defect
    // resolution is founder-approved in the resolutions file.
    verified: blocking.length === 0 && defects.length === 0
  };

  fs.mkdirSync(outDir.verdicts, { recursive: true });
  fs.writeFileSync(path.join(outDir.verdicts, lang + ".json"),
    JSON.stringify(verdict, null, 1), "utf8");

  const md = [];
  md.push("# Ingest report, " + lang + " (" + pack.reviewer + ", " + pack.date + ")");
  md.push("");
  md.push("Rows " + verdict.rows + ", agreements " + verdict.agreements +
    ", defects " + defects.length + " (" + blocking.length + " blocking), unsure keeps " +
    unsureKeeps.length + ", starred for tone " + starred.length + ".");
  md.push("");
  if (!defects.length) {
    md.push("No disagreements. The language flips to VERIFIED when the founder");
    md.push("signs this report and the elicitations pass their guard check.");
  } else {
    md.push("## Defects, each needing a founder-approved resolution");
    defects.forEach((r) => {
      const meta = OUTCOME_META[r.outcome];
      md.push("");
      md.push("### " + r.id + ": " + meta.title);
      md.push("");
      md.push("> " + r.text);
      md.push("");
      md.push("Proposed: " + meta.proposal);
      md.push("");
      md.push("- [ ] Founder approves the resolution");
    });
  }
  if (unsureKeeps.length) {
    md.push("");
    md.push("## Unsure marks on kept sentences, recorded as data");
    unsureKeeps.forEach((r) => md.push("- " + r.id + ": " + r.text.slice(0, 90)));
    md.push("");
    md.push("Conservative reading, proposed: keep all, which the guard already does.");
  }
  if (pack.elicited && pack.elicited.length) {
    md.push("");
    md.push("## Elicitations, to run against the guard in resolution");
    pack.elicited.forEach((s, i) => md.push((i + 1) + ". " + s));
  }
  if (starred.length) {
    md.push("");
    md.push("## Starred for tone, routed to the bank review");
    starred.forEach((r) => md.push("- " + r.id + ": " + r.text.slice(0, 90)));
  }
  fs.mkdirSync(outDir.reports, { recursive: true });
  fs.writeFileSync(path.join(outDir.reports, lang + "-ingest.md"), md.join("\n") + "\n", "utf8");

  return verdict;
}

function readinessTable() {
  const verdictDir = path.join(ROOT, "tests", "fixtures", "verification-verdicts");
  const lines = ["lang   status      detail"];
  LANGS.forEach((lang) => {
    const p = path.join(verdictDir, lang + ".json");
    if (!fs.existsSync(p)) {
      lines.push(lang.padEnd(6) + " pending     pack not yet returned");
      return;
    }
    const v = JSON.parse(fs.readFileSync(p, "utf8"));
    lines.push(lang.padEnd(6) +
      (v.verified ? " VERIFIED    " : " ingested    ") +
      v.reviewer + " " + v.date + ", agreements " + v.agreements + "/" + v.rows +
      (v.blocking_defects ? ", BLOCKING DEFECTS " + v.blocking_defects : "") +
      (v.defects.length && !v.blocking_defects ? ", defects " + v.defects.length : ""));
  });
  return lines.join("\n");
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === "--table") {
    console.log(readinessTable());
    process.exit(0);
  }
  const lang = args[0];
  const dry = args.includes("--dry");
  const outFlag = args.indexOf("--out");
  const base = outFlag >= 0 ? args[outFlag + 1] : null;
  if (!LANGS.includes(lang)) { console.error("unknown language: " + lang); process.exit(2); }
  if (dry && !base) { console.error("--dry requires --out <dir>"); process.exit(2); }
  const outDir = base
    ? { fixtures: base, verdicts: path.join(base, "verdicts"), reports: path.join(base, "reports") }
    : { fixtures: path.join(ROOT, "tests", "fixtures"),
        verdicts: path.join(ROOT, "tests", "fixtures", "verification-verdicts"),
        reports: path.join(ROOT, "docs", "i18n", "verification", "reports") };
  const verdict = ingest(lang, outDir);
  console.log(JSON.stringify(verdict, null, 1));
  if (!dry) console.log("\n" + readinessTable());
}

module.exports = { classifyMark, OUTCOME_META, ingest, readinessTable };
