// Guards the security headers.
//
// MEASURED 9 August 2026, before this landed: northcue.co.uk sent NONE of them.
// No HSTS, no CSP, no X-Content-Type-Options, no X-Frame-Options, no
// Referrer-Policy, no Permissions-Policy, in code or in the live response.
// Cloudflare added none of its own.
//
// They are set once at the top of the request handler rather than inside each
// writeHead, so these tests check the paths that are easiest to add later and
// forget: a static asset, a JSON API reply, a 404, and the canonical-host
// redirect.

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");

const { createNorthcueServer } = require("../server");

function request(port, requestPath, { method = "GET", host = "northcue.co.uk" } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, method, path: requestPath, headers: { host } },
      (res) => {
        res.resume();
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers }));
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.end();
  });
}

const REQUIRED = {
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
};

test("security headers", async (t) => {
  const server = createNorthcueServer();
  const port = await new Promise((resolve) => {
    server.listen(0, () => resolve(server.address().port));
  });

  try {
    await t.test("every response carries every header", async () => {
      // The HTML shell, a static asset, a JSON reply, and a refused path.
      const paths = ["/", "/app.js", "/health", "/does-not-exist.md"];
      for (const requestPath of paths) {
        const res = await request(port, requestPath);
        for (const [name, value] of Object.entries(REQUIRED)) {
          assert.equal(res.headers[name], value, `${requestPath} must send ${name}`);
        }
        assert.ok(res.headers["content-security-policy"], `${requestPath} must send a CSP`);
      }
    });

    await t.test("the redirect carries them too", async () => {
      // A 301 is a response a browser acts on, and it is written before the
      // normal path, so it is the easiest one to miss.
      const res = await request(port, "/", { host: "northcue.uk" });
      assert.equal(res.status, 301);
      assert.equal(res.headers["x-frame-options"], "DENY");
      assert.ok(res.headers["content-security-policy"]);
    });

    await t.test("the CSP matches what the site actually loads", async () => {
      const res = await request(port, "/");
      const csp = res.headers["content-security-policy"];

      assert.match(csp, /default-src 'self'/);
      assert.match(csp, /object-src 'none'/);
      assert.match(csp, /frame-ancestors 'none'/);
      assert.match(csp, /base-uri 'self'/);
      assert.match(csp, /form-action 'self'/);

      // No third party origin is loaded anywhere, so nothing may be allowlisted.
      assert.doesNotMatch(csp, /https?:\/\//, "no external origin may appear in the CSP");
      assert.doesNotMatch(csp, /\*/, "no wildcard source may appear in the CSP");

      // There are no inline event handlers, so scripts stay strict. If this ever
      // fails, an onclick= has been added and the policy was loosened to suit.
      assert.match(csp, /script-src 'self'/);
      assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/,
        "script-src must never take 'unsafe-inline'");
      assert.doesNotMatch(csp, /unsafe-eval/, "nothing needs eval");

      // The two deliberate relaxations, pinned so they stay deliberate.
      assert.match(csp, /style-src 'self' 'unsafe-inline'/,
        "index.html carries 39 style= attributes; see the note in server.js");
      assert.match(csp, /img-src 'self' data:/,
        "the wallpaper art is a data: SVG built in app.js");
    });

    await t.test("HSTS does not carry preload", async () => {
      // preload is hard to reverse and commits every subdomain. Adding it should
      // be a decision, not a drift.
      const res = await request(port, "/");
      assert.doesNotMatch(res.headers["strict-transport-security"], /preload/);
    });

    await t.test("the camera feature stays disabled, and that is safe", async () => {
      // "Take a photo" is <input type="file" accept="image/*" capture>, which
      // hands off to the OS camera app. getUserMedia is not used anywhere, so
      // camera=() cannot break it.
      const res = await request(port, "/");
      assert.match(res.headers["permissions-policy"], /camera=\(\)/);
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
