#!/usr/bin/env node
// Renders the Tier 1 interface dictionary for one language exactly as the
// runtime resolves it: the language value where one exists, the English
// fallback where it does not, flagged loudly. This is what t(key) returns for
// every key, which is what the reader sees on buttons, headings, status lines
// and help pages.
//
// The browser dev override (?lang=xx on localhost) remains the check for how
// these strings sit on the page. This script exists so a formality or safety
// sweep can read every resolved string, including error states and aria text
// that no ordinary browsing session surfaces.
//
// THIS FILE IS FROZEN DURING A REVIEW PASS.
//
// Usage:
//   node scripts/render-dictionary.js pl

"use strict";

const path = require("path");

const I18N = path.join(__dirname, "..", "public", "i18n");
const en = require(path.join(I18N, "en.js"));

const code = process.argv[2];
if (!code) {
  console.error("usage: node scripts/render-dictionary.js <code>");
  process.exit(1);
}
const lang = code === "en" ? en : require(path.join(I18N, code + ".js"));

const keys = Object.keys(en);
console.log("LANGUAGE: " + code + ", " + keys.length + " dictionary keys");
keys.forEach((key, i) => {
  const value = lang[key];
  const resolved = value === undefined ? en[key] : value;
  console.log("\n" + (i + 1) + ". " + key);
  console.log("   en  " + en[key]);
  console.log("   " + code + "  " + resolved + (value === undefined ? "   <-- ENGLISH FALLBACK" : ""));
});
