// Guards the local development language preview.
//
// The preview lets ?lang=fr render a disabled language on localhost, so
// translation work can be seen before it ships. Everything about it is a
// production risk if the host check is wrong, because it is the only thing
// standing between a disabled machine draft and a real reader.
//
// The hostname test is the part worth attacking. A substring check would pass
// "localhost.evil.com", a bare suffix check would pass "evillocalhost", and
// either would mean any attacker controlled domain could render an unreviewed
// translation of a letter about someone's debt.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
require(path.join(PUBLIC_DIR, "i18n", "config.js"));
const i18n = require(path.join(PUBLIC_DIR, "i18n.js"));

test("development language preview", async (t) => {
  await t.test("loopback hosts are accepted", () => {
    ["localhost", "LOCALHOST", "127.0.0.1", "::1", "[::1]",
     "app.localhost", "northcue.localhost"].forEach((host) => {
      assert.equal(i18n.isDevPreviewHost(host), true, host + " should be a dev host");
    });
  });

  await t.test("hosts that merely look like localhost are rejected", () => {
    // Each of these passes at least one naive implementation.
    const hostile = [
      "northcue.co.uk",
      "localhost.evil.com",        // substring, and a prefix
      "evil.com/localhost",        // substring
      "notlocalhost",              // bare suffix match
      "evillocalhost",             // bare suffix match
      "mylocalhost",               // bare suffix match
      "localhost.co",              // prefix with a real TLD
      "127.0.0.1.evil.com",        // loopback address as a label
      "xn--localhost-x1a",         // punycode lookalike
      "0.0.0.0",                   // binds locally but is not a browsing origin
      "192.168.1.10",              // LAN, not loopback
      "10.0.0.5",
      "",                          // file:// and similar
      null,
      undefined
    ];
    hostile.forEach((host) => {
      assert.equal(i18n.isDevPreviewHost(host), false, JSON.stringify(host) + " must not be a dev host");
    });
  });

  await t.test("the bare suffix on its own is not a host", () => {
    // ".localhost" has nothing in front of it, so there is no real subdomain.
    assert.equal(i18n.isDevPreviewHost(".localhost"), false);
  });

  await t.test("no preview is active outside a browser", () => {
    // In node there is no location, so the preview must resolve to nothing
    // rather than throwing or defaulting to on.
    assert.equal(i18n.devPreviewLanguage(), "");
  });

  await t.test("a disabled language is not supported without a preview", () => {
    // This is the production behaviour that must not change: every one of the
    // nine ships disabled and isSupported must keep saying so.
    const config = require(path.join(PUBLIC_DIR, "i18n", "config.js"));
    const disabled = config.languages.filter((entry) => !entry.enabled);
    assert.ok(disabled.length >= 9, "expected the nine languages to still be disabled");
    disabled.forEach((entry) => {
      assert.equal(i18n.isSupported(entry.code), false, entry.code + " must stay unsupported");
    });
  });

  await t.test("the switcher list is unaffected by the preview mechanism", () => {
    // languageList() drives the switcher and the detection banner. The preview
    // deliberately does not touch it, so both keep production behaviour.
    assert.deepEqual(i18n.languageList().map((entry) => entry.code), ["en"]);
  });

  await t.test("the preview cannot be persisted", () => {
    // A remembered preview would outlive the query parameter and turn a dev
    // convenience into a stuck state for whoever used that browser next.
    const source = require("node:fs").readFileSync(path.join(PUBLIC_DIR, "i18n.js"), "utf8");
    const initialise = source.slice(source.indexOf("function initialise()"));
    const previewBranch = initialise.slice(0, initialise.indexOf("var stored"));
    assert.match(previewBranch, /remember:\s*false/,
      "the preview branch must call setLanguage with remember false");
  });

  await t.test("the language code is constrained before it reaches a script src", () => {
    // loadLanguageFile builds "/i18n/<code>.js" from this value, so the
    // pattern is what stops "../" and anything else escaping the directory.
    const source = require("node:fs").readFileSync(path.join(PUBLIC_DIR, "i18n.js"), "utf8");
    assert.match(source, /lang=\(\[A-Za-z\]\{2\}\)/,
      "the query parameter must be restricted to two ASCII letters");
    assert.match(source, /isKnownLanguage\(code\)/,
      "the code must also be checked against the configured languages");
  });
});
