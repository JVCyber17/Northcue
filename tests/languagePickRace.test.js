// The language identity every analyse request reads must be the picker's
// value at the moment of upload.
//
// THE LIVE DEFECT THIS PINS (6 August 2026): the founder switched the
// interface to English and uploaded, and the session recorded Gujarati. The
// page-load application of the stored language choice is asynchronous
// (initialise() -> setLanguage(stored) -> script injection), and before the
// supersession guard existed its late completion silently overwrote a pick
// the reader had already made. getLanguage() feeds the language field of
// /api/simplify, which becomes the prose call's language and the
// document_sessions record, so the stale overwrite sent his English upload
// down the Gujarati path.
//
// Two rules under test, both in setLanguage():
//   1. A pick flips the active identity SYNCHRONOUSLY, so an upload in the
//      load window still carries the picker's value.
//   2. A completion applies only if it is still the latest pick; a stale one
//      applies nothing and unloads its own files (active-language-only
//      memory policy).

const test = require("node:test");
const assert = require("node:assert");

// Minimal browser stubs, installed BEFORE the require because the runtime
// binds to globals at load time. Injected scripts are captured instead of
// fetched, so the test fires each completion by hand and can land them in
// any order it likes. That hand control IS the test: the defect was an
// ordering, not a value.
const injectedScripts = [];
globalThis.document = {
  body: { dataset: {} },
  documentElement: { setAttribute() {} },
  head: { appendChild(script) { injectedScripts.push(script); } },
  createElement() { return {}; },
  querySelectorAll() { return []; },
  addEventListener() {},
  dispatchEvent() {},
  title: ""
};
globalThis.localStorage = {
  getItem() { return null; },
  setItem() {},
  removeItem() {}
};
if (typeof globalThis.CustomEvent !== "function") {
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init && init.detail;
    }
  };
}
globalThis.NORTHCUE_I18N_CONFIG = {
  defaultLanguage: "en",
  languages: [
    { code: "en", nativeName: "English", enabled: true },
    { code: "gu", nativeName: "ગુજરાતી", enabled: true }
  ]
};

const NorthcueI18n = require("../public/i18n.js");

// Simulates the browser finishing one injected script load: the dictionary
// script's own side effect (assigning the window global) runs first, exactly
// as a real script tag would, then onload fires.
function landScript(index, globalsToAssign) {
  Object.assign(globalThis, globalsToAssign || {});
  injectedScripts[index].onload();
}

test("a stale load completion cannot overwrite a newer pick (the founder's defect)", () => {
  // Page load applied the stored choice: the Gujarati files are in flight.
  NorthcueI18n.setLanguage("gu", { remember: false });
  assert.strictEqual(injectedScripts.length, 1, "the Gujarati dictionary load should be in flight");

  // The reader picks English before those files land. English is always
  // loaded, so this applies synchronously.
  NorthcueI18n.setLanguage("en");
  assert.strictEqual(NorthcueI18n.getLanguage(), "en");

  // The stale Gujarati load lands afterwards: dictionary script, then the
  // template script it chains.
  landScript(0, { NORTHCUE_STRINGS_GU: { "meta.title": "Northcue" } });
  assert.strictEqual(injectedScripts.length, 2, "the template script should chain after the dictionary");
  landScript(1, {});

  // Before the supersession guard, this read "gu": the stored session state
  // beat the picker, and the next upload recorded the wrong language.
  assert.strictEqual(NorthcueI18n.getLanguage(), "en",
    "the picker's choice must survive a stale async completion");
  assert.strictEqual(globalThis.NORTHCUE_STRINGS_GU, undefined,
    "a stale completion must unload its own files (active-language-only memory)");
});

test("an upload during the load window carries the picker's value, not the previous language", () => {
  const scriptsBefore = injectedScripts.length;
  NorthcueI18n.setLanguage("gu");

  // The files have not landed, but the identity has already flipped: this is
  // the value formData.append("language", ...) would send.
  assert.strictEqual(NorthcueI18n.getLanguage(), "gu",
    "the pick must take effect synchronously, before any file loads");

  landScript(scriptsBefore, { NORTHCUE_STRINGS_GU: { "meta.title": "Northcue" } });
  landScript(scriptsBefore + 1, {});
  assert.strictEqual(NorthcueI18n.getLanguage(), "gu",
    "the completion of the latest pick applies normally");
  assert.ok(globalThis.NORTHCUE_STRINGS_GU, "the active language's dictionary stays resident");
});
