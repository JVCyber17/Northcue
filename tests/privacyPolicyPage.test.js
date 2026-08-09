// Guards the published privacy policy at /privacy.
//
// WHY IT IS A REAL URL AND NOT AN APP SCREEN. A council doing due diligence
// pastes the link into a form, a funder saves it, a visa endorsement pack cites
// it, and someone arriving from a search must get the policy rather than the app
// shell. The previous destination was a button with no address, pointing at a
// stub that said the page was coming soon.
//
// THE CONTENT IS LEGAL TEXT. Several sentences were corrected after being checked
// against this codebase, including two that this repo's own audit caught: the
// unredacted structured result reaching OpenAI on EVERY document rather than in
// rare failures, and a page count that is never actually stored. Those exact
// corrections are pinned below, because a silent revert to the earlier wording
// would republish a claim the code contradicts.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");

const { createNorthcueServer } = require("../server");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const POLICY = fs.readFileSync(path.join(PUBLIC_DIR, "privacy.html"), "utf8");

// Derived from config, never a hand-maintained copy, so a tenth language cannot
// ship while silently exempt from the checks below. See i18nStandards.test.js.
const config = require(path.join(PUBLIC_DIR, "i18n", "config.js"));
const ALL_CODES = config.languages.map((entry) => entry.code);
const TRANSLATED_CODES = ALL_CODES.filter((code) => code !== "en");

function request(port, requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, method: "GET", path: requestPath, headers: { host: "northcue.co.uk" } },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({
          status: res.statusCode,
          contentType: res.headers["content-type"],
          body: Buffer.concat(chunks).toString("utf8")
        }));
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.end();
  });
}

test("published privacy policy", async (t) => {
  const server = createNorthcueServer();
  const port = await new Promise((resolve) => {
    server.listen(0, () => resolve(server.address().port));
  });

  try {
    await t.test("/privacy returns the real policy, not the app shell", async () => {
      const res = await request(port, "/privacy");
      assert.equal(res.status, 200);
      assert.equal(res.contentType, "text/html; charset=utf-8");
      assert.match(res.body, /<h1 id="top">Privacy policy/);
      // The distinguishing check: a crawler or a JavaScript-less reader must get
      // the policy text itself, not a shell that would need scripts to fill.
      assert.match(res.body, /Northcue Ltd is the data controller/);
      assert.match(res.body, /How long we keep everything/);
      assert.doesNotMatch(res.body, /id="page-landing"/, "must not be the app shell");
    });

    await t.test("the rewrite did not weaken the extension allowlist", async () => {
      // /privacy becomes /privacy.html BEFORE the extension lookup, so it flows
      // through the same allowlist with no exception. Nothing extensionless is
      // servable, which is the property ca6635f added.
      for (const p of ["/privacy-does-not-exist", "/CLAUDE.md", "/notes.md", "/config"]) {
        const res = await request(port, p);
        assert.equal(res.status, 404, p + " must still 404");
      }
    });

    await t.test("the policy needs no JavaScript to be readable", async () => {
      // Everything a reader must be able to read is in the markup. The only
      // script is an enhancement, and the page is complete without it.
      assert.match(POLICY, /<script src="\/privacy-page\.js/);
      const scriptCount = (POLICY.match(/<script/g) || []).length;
      assert.equal(scriptCount, 1, "one script, and it is an enhancement");
      assert.doesNotMatch(POLICY, /<script>[\s\S]*?<\/script>/, "no inline script, CSP forbids it");
    });

    await t.test("no new inline style attributes", async () => {
      // The 39 that exist in index.html are what force style-src 'unsafe-inline'.
      // Adding more moves dropping it further out of reach.
      assert.doesNotMatch(POLICY, /\sstyle="/, "the policy page adds no inline styles");
    });

    await t.test("the corrected statements are the ones published", () => {
      // Both of these were wrong in an earlier draft and were corrected against
      // the code. Reverting either would republish a claim the code contradicts.
      assert.match(POLICY, /This happens on every document, not in rare cases/,
        "the unredacted structured result reaches OpenAI on every document");
      assert.match(POLICY, /they are sent a second time to be translated/,
        "the second, translation copy must stay disclosed");
      assert.doesNotMatch(POLICY, /how many pages/,
        "no page count is stored, so the policy must not claim one is");
      assert.match(POLICY, /never sent to any other company/,
        "the softened cookie protections line");
      assert.doesNotMatch(POLICY, /cannot be read by scripts running in the page/,
        "that claim was softened because the identifier appears in the API response body");
    });

    await t.test("every jump link lands on a section that exists", () => {
      const anchors = [...POLICY.matchAll(/href="#([a-z-]+)"/g)].map((m) => m[1]);
      assert.ok(anchors.length >= 16, "expected the full jump list");
      for (const anchor of anchors) {
        assert.match(POLICY, new RegExp('id="' + anchor + '"'),
          "#" + anchor + " must have a target");
      }
    });

    await t.test("both tables are stacked pairs, never a raw table", () => {
      // A two column table at 375px either overflows or crushes the value column.
      // The retention table is the most important content on the page.
      assert.doesNotMatch(POLICY, /<table/, "no table element on the policy page");
      const pairs = (POLICY.match(/class="policy-pairs/g) || []).length;
      assert.equal(pairs, 3, "who we are, the cookie, and the retention periods");
    });

    await t.test("the language notice is present for every translated language, and readable without JS", () => {
      for (const code of TRANSLATED_CODES) {
        assert.match(POLICY, new RegExp('data-langnote="' + code + '"'), code + " notice must exist");
      }
      // Every notice is in the markup rather than injected, so a reader without
      // JavaScript still sees theirs. privacy-page.js only narrows them.
      const notices = (POLICY.match(/data-langnote="/g) || []).length;
      assert.equal(notices, TRANSLATED_CODES.length);
      // The address is the whole point of the line.
      const withEmail = (POLICY.match(/hello@northcue\.uk/g) || []).length;
      assert.ok(withEmail >= 11, "nine notices plus the contact section");
    });

    await t.test("the PDF is downloadable and is the only pdf served", async () => {
      const res = await request(port, "/assets/northcue-privacy-policy.pdf");
      assert.equal(res.status, 200);
      assert.equal(res.contentType, "application/pdf");
      const pdfs = fs.readdirSync(path.join(PUBLIC_DIR, "assets"))
        .filter((name) => name.endsWith(".pdf"));
      assert.deepEqual(pdfs, ["northcue-privacy-policy.pdf"],
        "'.pdf' was allowlisted for this one file");
    });

    await t.test("the summary links out to the policy, and the policy links back", () => {
      const shell = fs.readFileSync(path.join(PUBLIC_DIR, "index.html"), "utf8");
      assert.match(shell, /<a class="privacy-full-link" href="\/privacy">/,
        "a real anchor, so it can be shared and crawled");
      assert.match(POLICY, /href="\/#privacy"/, "and a way back to the summary");
    });

    await t.test("the stub and its strings are gone", () => {
      const shell = fs.readFileSync(path.join(PUBLIC_DIR, "index.html"), "utf8");
      const app = fs.readFileSync(path.join(PUBLIC_DIR, "app.js"), "utf8");
      assert.doesNotMatch(shell, /page-privacy-full/);
      assert.doesNotMatch(shell, /privacyFull\./);
      // The array entry has to go with the section: pageSections maps every entry
      // to #page-<entry>, so a leftover entry would make setPage throw on null.
      // Matched against the array itself, not the whole file, because the comment
      // above it names the removed entry on purpose.
      const pagesArray = app.slice(app.indexOf("const pages = ["), app.indexOf("];") + 2);
      assert.ok(pagesArray.length > 0, "expected to find the pages array");
      assert.doesNotMatch(pagesArray, /"privacy-full"/,
        "a leftover entry would make setPage throw on a null section");
      assert.match(pagesArray, /"privacy"/, "the illustrated privacy page stays");
      for (const code of ALL_CODES) {
        const dict = fs.readFileSync(path.join(PUBLIC_DIR, "i18n", code + ".js"), "utf8");
        assert.doesNotMatch(dict, /"privacyFull\./, code + " must not keep the stub strings");
      }
    });

    await t.test("the offline fallback never substitutes the app shell for the policy", () => {
      // Showing someone the home page when they asked for the privacy policy
      // would misrepresent what they are reading.
      const sw = fs.readFileSync(path.join(PUBLIC_DIR, "sw.js"), "utf8");
      assert.match(sw, /url\.pathname !== POLICY_PATH/);
      assert.match(sw, /const POLICY_PATH = "\/privacy"/);
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
