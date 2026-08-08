// A COLD PAGE LOAD WITH A NON-ENGLISH LANGUAGE ALREADY SAVED.
//
// THE LIVE INCIDENT THIS PINS (8 August 2026). A returning Polish reader on a
// phone loaded northcue.co.uk and saw the page in Polish with the language
// button still reading "English", the button unclickable, and the document
// journey dead. One throw caused all three:
//
//   Uncaught ReferenceError: Cannot access 'SEPARATED_AMOUNT' before
//   initialization    at app.js:547    at i18n.js:189
//
// app.js runs its wiring at the bottom of the file. Those init calls reach
// shouldExplainMoneyFormat, which read SEPARATED_AMOUNT, a const declared two
// thousand lines further down and therefore still in its temporal dead zone.
// The throw aborted top-level execution from that line on, so everything wired
// after it never happened.
//
// WHY EVERY EXISTING TEST MISSED IT, and this is the point of this file. The
// suite had 2,284 tests and not one of them loaded app.js. The defect also
// needed a language carrying invertedNumberFormat, because shouldExplainMoneyFormat
// returns early for every other language and never reaches the regex. So English
// cold loads were clean, runtime language switching after load was clean (the
// const is initialised by then), and only a cold load in pl, ro, pt, es or fr
// reproduced it. That is the normal arrival state for a returning reader in
// those languages.
//
// This test loads app.js for real, with the language stored exactly as a
// returning reader's browser would store it.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const PUBLIC_DIR = path.join(__dirname, "..", "public");

// A DOM stub with a registry, so a selector asked for twice returns the same
// element and the test can read back what init wrote into it.
function installDom(storedLanguage) {
  const registry = new Map();
  const injectedScripts = [];

  function makeElement(name) {
    const element = {
      name,
      dataset: {},
      style: { setProperty() {}, removeProperty() {} },
      classList: {
        _set: new Set(),
        add(...c) { c.forEach((x) => this._set.add(x)); },
        remove(...c) { c.forEach((x) => this._set.delete(x)); },
        toggle(c, on) { if (on === undefined) { this._set.has(c) ? this._set.delete(c) : this._set.add(c); } else if (on) { this._set.add(c); } else { this._set.delete(c); } },
        contains(c) { return this._set.has(c); }
      },
      textContent: "",
      innerHTML: "",
      value: "",
      files: [],
      children: [],
      childElementCount: 0,
      parentElement: null,
      offsetParent: null,
      setAttribute() {}, removeAttribute() {}, getAttribute() { return null; }, hasAttribute() { return false; },
      addEventListener() {}, removeEventListener() {},
      appendChild() {}, append() {}, remove() {}, insertAdjacentHTML() {},
      focus() {}, click() {}, closest() { return null; },
      querySelector(sel) { return lookup(sel); },
      querySelectorAll() { return []; },
      getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }; }
    };
    return element;
  }

  function lookup(selector) {
    if (!registry.has(selector)) registry.set(selector, makeElement(selector));
    return registry.get(selector);
  }

  const body = makeElement("body");
  const documentElement = makeElement("html");

  globalThis.window = globalThis;
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
  globalThis.scrollTo = () => {};
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => "", display: "block" });
  globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.navigator = { language: storedLanguage, languages: [storedLanguage], serviceWorker: { register() { return Promise.resolve(); } } };
  globalThis.location = { href: "https://northcue.co.uk/", hostname: "northcue.co.uk", search: "", pathname: "/" };
  globalThis.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  globalThis.crypto = globalThis.crypto || { randomUUID: () => "test-job" };
  if (typeof globalThis.CustomEvent !== "function") {
    globalThis.CustomEvent = class CustomEvent {
      constructor(type, init) { this.type = type; this.detail = init && init.detail; }
    };
  }

  const listeners = new Map();
  globalThis.document = {
    body,
    documentElement,
    head: { appendChild(script) { injectedScripts.push(script); } },
    title: "",
    readyState: "complete",
    querySelector: lookup,
    // Only the selectors init actually iterates need real members back.
    querySelectorAll(selector) {
      if (selector === "[data-language-label]") return [lookup("[data-language-label]")];
      return [];
    },
    createElement() { return makeElement("created"); },
    getElementById(id) { return lookup("#" + id); },
    addEventListener(type, fn) { listeners.set(type, (listeners.get(type) || []).concat(fn)); },
    removeEventListener() {},
    dispatchEvent(event) {
      (listeners.get(event.type) || []).forEach((fn) => fn(event));
      return true;
    }
  };

  const store = {};
  if (storedLanguage) store.northcue_language = storedLanguage;
  globalThis.localStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; }
  };

  return { registry, injectedScripts, lookup, body };
}

// Fires the browser's "the injected dictionary finished loading" moment: the
// script's own global assignment happens first, exactly as a real script tag
// would, then onload runs.
function landInjectedScripts(injectedScripts, code) {
  const upper = String(code).toUpperCase();
  globalThis["NORTHCUE_STRINGS_" + upper] = { "language.nativeName": code };
  globalThis["NORTHCUE_TEMPLATES_" + upper] = { exact: {}, patterns: {} };
  injectedScripts.forEach((script) => { if (typeof script.onload === "function") script.onload(); });
}

test("cold load with a language already saved", async (t) => {
  await t.test("app.js top-level init completes for a stored Polish reader", () => {
    const dom = installDom("pl");
    require(path.join(PUBLIC_DIR, "i18n", "config.js"));
    require(path.join(PUBLIC_DIR, "i18n.js"));

    // THE ASSERTION THE INCIDENT NEEDED. Loading app.js runs every init call at
    // the bottom of the file. Before the fix this threw a ReferenceError on
    // SEPARATED_AMOUNT and took the language switcher and the journey with it.
    assert.doesNotThrow(
      () => { require(path.join(PUBLIC_DIR, "app.js")); },
      "app.js must finish its top-level init on a cold load in a language that carries invertedNumberFormat"
    );

    landInjectedScripts(dom.injectedScripts, "pl");

    // The journey state machine initialised: both of these statements sit after
    // the init calls that used to throw, so either one failing means init died.
    assert.equal(dom.body.dataset.journeyStep, "upload",
      "setJourneyStep must have run, so the journey is usable after an upload");
    assert.notEqual(dom.lookup("#progress-dots").innerHTML, "",
      "renderProgressDots must have run, so the card progress indicator exists");
  });
});

test("the money note constants are reachable from init", async (t) => {
  // A source-order guard, so the class of bug cannot return by a route this
  // file's stub does not happen to exercise. Everything the init sequence can
  // reach must be declared above the init sequence itself.
  const fs = require("node:fs");
  const source = fs.readFileSync(path.join(PUBLIC_DIR, "app.js"), "utf8");
  const lines = source.split(/\r?\n/);
  const lineOf = (pattern) => lines.findIndex((line) => pattern.test(line)) + 1;

  await t.test("SEPARATED_AMOUNT is declared before the init calls that reach it", () => {
    const declaration = lineOf(/^const SEPARATED_AMOUNT\s*=/);
    const firstInitCall = lineOf(/^wireLanguageControls\(\);/);
    assert.ok(declaration > 0, "SEPARATED_AMOUNT must be declared at module level");
    assert.ok(firstInitCall > 0, "the init sequence must still call wireLanguageControls");
    assert.ok(declaration < firstInitCall,
      "SEPARATED_AMOUNT (line " + declaration + ") must be declared before the init sequence (line " +
      firstInitCall + "), or a cold load in pl, ro, pt, es or fr throws a ReferenceError");
  });
});
