// Guards the canonical-host redirect that runs at the very top of the request
// handler on every request: northcue.uk / www.northcue.uk are permanently
// redirected to northcue.co.uk, while northcue.co.uk itself is untouched.

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");

const { createNorthcueServer } = require("../server");

// Send a request with an explicit Host header, without following redirects, so
// we can assert the 301 and its Location directly.
function requestWithHost(port, host, requestPath = "/") {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, method: "GET", path: requestPath, headers: { host } },
      (res) => {
        res.resume(); // drain the body; we only care about status + headers
        res.on("end", () => resolve({ status: res.statusCode, location: res.headers.location }));
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.end();
  });
}

test("canonical host redirect", async (t) => {
  const server = createNorthcueServer();
  const port = await new Promise((resolve) => {
    server.listen(0, () => resolve(server.address().port));
  });

  try {
    await t.test("northcue.uk is 301-redirected to northcue.co.uk", async () => {
      const res = await requestWithHost(port, "northcue.uk", "/");
      assert.equal(res.status, 301);
      assert.equal(res.location, "https://northcue.co.uk/");
    });

    await t.test("www.northcue.uk is 301-redirected to northcue.co.uk", async () => {
      const res = await requestWithHost(port, "www.northcue.uk", "/");
      assert.equal(res.status, 301);
      assert.equal(res.location, "https://northcue.co.uk/");
    });

    await t.test("the redirect preserves the full path and query string", async () => {
      const res = await requestWithHost(port, "northcue.uk", "/help?ref=abc");
      assert.equal(res.status, 301);
      assert.equal(res.location, "https://northcue.co.uk/help?ref=abc");
    });

    await t.test("host match ignores case and port", async () => {
      const res = await requestWithHost(port, "NorthCue.UK:443", "/");
      assert.equal(res.status, 301);
      assert.equal(res.location, "https://northcue.co.uk/");
    });

    await t.test("northcue.co.uk is left untouched (served normally, not redirected)", async () => {
      const res = await requestWithHost(port, "northcue.co.uk", "/");
      assert.equal(res.status, 200);
      assert.equal(res.location, undefined);
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
