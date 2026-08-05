#!/usr/bin/env node
// THE STANDING DAILY PRODUCTION CHECK. Reads what production actually served,
// which no local run can prove, and alerts on the one signal that means
// English has silently degraded: completed dropping to ZERO on a day that had
// good-quality sessions.
//
// This is the check that would have caught the incident of Monday 4 August
// within a day, instead of when the founder happened to upload a bill and
// look. Both incidents that week were invisible to every local instrument and
// visible in one query against document_sessions.
//
// WHAT IT EXCLUDES, and why the raw table cannot be read without excluding it:
//   batches   three or more sessions in the same second are script traffic,
//             794 of 1,000 sessions in the fourteen days measured
//   bots      unreadable_document at input_quality poor with zero cards is
//             scanner traffic, median PDF size 58 bytes
//
// COST WHEN HEALTHY: one REST read per run, no writes, no provider calls, no
// tokens. Exit 0 healthy, exit 1 on alert, exit 2 on query failure, so any
// scheduler can page on non-zero.
//
// WHERE IT RUNS: any daily scheduler with SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY in the environment:
//     node scripts/production/daily-check.js
// It reads .env when run from a checkout, so a local daily run needs no setup.
// The service key stays server-side per the privacy rules: this script prints
// counts and guard shapes only, never document content, and the column it
// reads is already value-redacted at write time.

"use strict";

const path = require("path");
const { loadEnvFile } = require(path.join(__dirname, "..", "..", "src", "utils", "loadEnv"));
loadEnvFile(path.join(__dirname, "..", ".."));

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DAYS = Number(process.argv[2] || 3);

async function q(pathAndQuery) {
  const res = await fetch(URL + "/rest/v1/" + pathAndQuery, {
    headers: { apikey: KEY, Authorization: "Bearer " + KEY, Accept: "application/json" }
  });
  const body = await res.text();
  if (!res.ok) throw new Error(res.status + " " + body.slice(0, 200));
  return JSON.parse(body);
}

(async () => {
  if (!URL || !KEY) { console.error("supabase configuration missing"); process.exitCode = 2; return; }

  const since = new Date(Date.now() - DAYS * 864e5).toISOString();
  const rows = await q("document_sessions?select=created_at,ai_status,ai_error_code," +
    "ai_validation_errors,input_quality,error_code,cards_count&created_at=gte." + since +
    "&order=created_at.desc&limit=2000");

  // Exclude same-second batches of three or more: script traffic, not readers.
  const bySecond = {};
  rows.forEach((r) => {
    const s = r.created_at.slice(0, 19);
    (bySecond[s] = bySecond[s] || []).push(r);
  });
  const readers = Object.values(bySecond)
    .filter((g) => g.length < 3).flat()
    // Exclude bot uploads: failed unreadable at poor quality with no cards.
    .filter((r) => !(r.error_code === "unreadable_document" && r.input_quality === "poor"));

  const byDay = {};
  readers.forEach((r) => {
    const day = r.created_at.slice(0, 10);
    const d = (byDay[day] = byDay[day] || { good: 0, completed: 0, statuses: {}, shapes: {} });
    if (r.input_quality === "good") d.good++;
    if (r.ai_status === "completed") d.completed++;
    const k = (r.ai_status || "null") + (r.ai_error_code ? "/" + r.ai_error_code : "");
    d.statuses[k] = (d.statuses[k] || 0) + 1;
    if (r.ai_validation_errors) {
      d.shapes[r.ai_validation_errors] = (d.shapes[r.ai_validation_errors] || 0) + 1;
    }
  });

  console.log("\n  READER TRAFFIC BY DAY, batches and bots excluded\n");
  let alert = false;
  Object.keys(byDay).sort().reverse().forEach((day) => {
    const d = byDay[day];
    const bad = d.good > 0 && d.completed === 0;
    if (bad) alert = true;
    console.log("  " + day + (bad ? "  *** ALERT: good sessions, ZERO completed ***" : ""));
    console.log("      " + Object.entries(d.statuses).sort((a, b) => b[1] - a[1])
      .map(([k, v]) => k + " x" + v).join("   "));
    Object.entries(d.shapes).forEach(([shape, n]) =>
      console.log("      guard: x" + n + "  " + shape.slice(0, 110)));
  });

  if (alert) {
    console.log("\n  ALERT: a day with good-quality reader sessions completed ZERO prose.");
    console.log("  English has silently degraded. Read ai_validation_errors above: the");
    console.log("  guard shape is named there, value-free.\n");
    process.exitCode = 1;
    return;
  }
  console.log("\n  healthy\n");
})().catch((e) => { console.error("QUERY FAILED: " + e.message); process.exitCode = 2; });
