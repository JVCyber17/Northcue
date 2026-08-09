// Guards what the web server will hand out.
//
// THE LIVE EXPOSURE THIS PINS (9 August 2026). https://northcue.co.uk/CLAUDE.md
// returned 200 with 6,676 bytes of engineering notes: internal decisions, and a
// list of known defects, readable by anyone who asked for it.
//
// It was not the repo root being served, and it was not a traversal. Everything
// outside public/ already 404s, verified against production at the time:
// /README.md, /ENGINE_STATE.md, /package.json, /server.js, /.env, /.env.example,
// /src/..., /tests/..., /supabase/... all returned 404. The cause was narrower
// and quieter: public/CLAUDE.md lives inside the directory that IS served, and
// serveStaticFile resolved unknown extensions to application/octet-stream and
// handed the bytes over. Any file dropped into public/ was on the public web
// whether the site needed it or not, so it was published by default.
//
// The fix turned that content-type lookup into an allowlist. These tests hold
// the two halves of it: nothing outside the allowlist is servable, and
// everything the site genuinely loads still is.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");

const { createNorthcueServer } = require("../server");

function request(port, requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, method: "GET", path: requestPath, headers: { host: "northcue.co.uk" } },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
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

test("static exposure", async (t) => {
  const server = createNorthcueServer();
  const port = await new Promise((resolve) => {
    server.listen(0, () => resolve(server.address().port));
  });

  try {
    await t.test("CLAUDE.md is not served", async () => {
      const res = await request(port, "/CLAUDE.md");
      assert.equal(res.status, 404, "/CLAUDE.md must not be readable over the web");
      assert.doesNotMatch(res.body, /Northcue frontend notes/, "no part of the file may reach the response");
    });

    await t.test("but CLAUDE.md is still in the repository, where it belongs", () => {
      // The fix must never become "delete the file". It is project memory, and
      // it is loaded by tooling from disk. This pins that the exposure was
      // closed by changing what is SERVED, not by removing anything.
      const onDisk = path.join(__dirname, "..", "public", "CLAUDE.md");
      assert.ok(fs.existsSync(onDisk), "public/CLAUDE.md must remain in the repo");
      assert.ok(
        fs.readFileSync(onDisk, "utf8").includes("Northcue frontend notes"),
        "public/CLAUDE.md must still hold its contents"
      );
    });

    await t.test("an unserved extension 404s wherever it sits", async () => {
      // The guard is the allowlist, not a rule about one filename.
      for (const requestPath of ["/CLAUDE.md", "/notes.md", "/assets/anything.md", "/backup.bak", "/dump.sql", "/data.json"]) {
        const res = await request(port, requestPath);
        assert.equal(res.status, 404, requestPath + " must not be servable");
      }
    });

    await t.test("a refused type is indistinguishable from a missing file", async () => {
      // Otherwise the response tells an attacker which files exist.
      const present = await request(port, "/CLAUDE.md");
      const absent = await request(port, "/does-not-exist-anywhere.md");
      assert.equal(present.status, absent.status);
      assert.equal(present.body, absent.body);
    });

    await t.test("everything the site actually loads is still served", async () => {
      const mustServe = [
        ["/", "text/html; charset=utf-8"],
        ["/app.js", "text/javascript; charset=utf-8"],
        ["/styles.css", "text/css; charset=utf-8"],
        ["/i18n.js", "text/javascript; charset=utf-8"],
        ["/sw.js", "text/javascript; charset=utf-8"],
        ["/manifest.webmanifest", "application/manifest+json"],
        ["/favicon.ico", "image/x-icon"],
        ["/assets/northcue-mark.svg", "image/svg+xml"],
        ["/assets/northcue-document-stack.png", "image/png"],
        ["/icons/northcue/foreground/document.png", "image/png"]
      ];
      for (const [requestPath, expectedType] of mustServe) {
        const res = await request(port, requestPath);
        assert.equal(res.status, 200, requestPath + " must still be served");
        assert.equal(res.contentType, expectedType, requestPath + " must keep its content type");
      }
    });

    await t.test("the font licence stays reachable with the fonts", async () => {
      // SIL OFL travels with the font software, so .txt is on the allowlist on
      // purpose rather than by oversight.
      const res = await request(port, "/assets/fonts/OFL.txt");
      assert.equal(res.status, 200);
      assert.equal(res.contentType, "text/plain; charset=utf-8");
    });

    await t.test("nothing outside public/ is reachable", async () => {
      for (const requestPath of ["/../server.js", "/../package.json", "/../.env", "/../README.md"]) {
        const res = await request(port, requestPath);
        assert.notEqual(res.status, 200, requestPath + " must never be served");
      }
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
