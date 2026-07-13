// Guards the static file caching split: icon PNGs under /icons/ get a real
// browser cache so they are not refetched on every page load and card render,
// while HTML, JS, and CSS keep no-store so deploys reach users instantly.

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");

const { createNorthcueServer } = require("../server");

function requestHeaders(port, requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, method: "GET", path: requestPath, headers: { host: "northcue.co.uk" } },
      (res) => {
        res.resume();
        res.on("end", () => resolve({ status: res.statusCode, cacheControl: res.headers["cache-control"] }));
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.end();
  });
}

test("static cache headers", async (t) => {
  const server = createNorthcueServer();
  const port = await new Promise((resolve) => {
    server.listen(0, () => resolve(server.address().port));
  });

  try {
    await t.test("icon PNGs under /icons/ are cached for a week", async () => {
      const res = await requestHeaders(port, "/icons/northcue/foreground/document.png");
      assert.equal(res.status, 200);
      assert.equal(res.cacheControl, "public, max-age=604800");
    });

    await t.test("a nested icon path gets the same cache header", async () => {
      const res = await requestHeaders(port, "/icons/northcue/foreground-light/deadline.png");
      assert.equal(res.status, 200);
      assert.equal(res.cacheControl, "public, max-age=604800");
    });

    await t.test("the HTML shell stays no-store", async () => {
      const res = await requestHeaders(port, "/");
      assert.equal(res.status, 200);
      assert.equal(res.cacheControl, "no-store");
    });

    await t.test("app.js stays no-store", async () => {
      const res = await requestHeaders(port, "/app.js");
      assert.equal(res.status, 200);
      assert.equal(res.cacheControl, "no-store");
    });

    await t.test("styles.css stays no-store", async () => {
      const res = await requestHeaders(port, "/styles.css");
      assert.equal(res.status, 200);
      assert.equal(res.cacheControl, "no-store");
    });

    await t.test("non icon PNGs outside /icons/ stay no-store", async () => {
      const res = await requestHeaders(port, "/assets/northcue-document-stack.png");
      assert.equal(res.status, 200);
      assert.equal(res.cacheControl, "no-store");
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
