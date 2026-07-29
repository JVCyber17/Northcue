#!/usr/bin/env node
// Companion to render-language.js: renders every EXACT sentence in the bank
// through the real matcher for one language, English beside the translation.
//
// The four scenario fixtures only exercise the exact sentences those journeys
// happen to emit. Safety sweeps (hedges turned certain, weakened warnings,
// softened refusals) have to read all 273, and they must come through
// bank.translateEngineSentence rather than from the translation file, so that
// what is judged is what a reader would actually receive, lookup included.
//
// THIS FILE IS FROZEN DURING A REVIEW PASS, for the same reason as
// render-language.js: counts read from a moving tool never reproduce.
//
// Usage:
//   node scripts/render-exact.js pl

"use strict";

const path = require("path");

const I18N = path.join(__dirname, "..", "public", "i18n");
const enBank = require(path.join(I18N, "templates-en.js"));
const bank = require(path.join(I18N, "templateBank.js"));

const code = process.argv[2];
if (!code) {
  console.error("usage: node scripts/render-exact.js <code>");
  process.exit(1);
}
if (code !== "en") require(path.join(I18N, "templates-" + code + ".js"));
bank.resetCaches();

const ids = Object.keys(enBank.exact);
console.log("LANGUAGE: " + code + ", " + ids.length + " exact sentences");
ids.forEach((id, i) => {
  const source = enBank.exact[id];
  const result = bank.translateEngineSentence(source, code);
  console.log("\n" + (i + 1) + ". " + id);
  console.log("   en  " + source);
  console.log("   " + code + "  " + result.text + (result.translated ? "" : "   <-- ENGLISH FALLBACK"));
});
