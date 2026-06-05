const assert = require("node:assert/strict");
const test = require("node:test");

const { createRateLimiter } = require("../src/utils/rateLimiter");

test("rate limiter allows normal requests inside the route limit", () => {
  let now = 1000;
  const limiter = createRateLimiter({
    windowMs: 60000,
    limitsByRoute: { "/api/simplify": 2 },
    now: () => now
  });

  assert.equal(limiter.check({ routeKey: "/api/simplify", clientKey: "ip-a" }).allowed, true);
  assert.equal(limiter.check({ routeKey: "/api/simplify", clientKey: "ip-a" }).allowed, true);
});

test("rate limiter blocks only after the route limit is reached", () => {
  let now = 1000;
  const limiter = createRateLimiter({
    windowMs: 60000,
    limitsByRoute: { "/api/feedback": 1 },
    now: () => now
  });

  assert.equal(limiter.check({ routeKey: "/api/feedback", clientKey: "ip-a" }).allowed, true);
  const blocked = limiter.check({ routeKey: "/api/feedback", clientKey: "ip-a" });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 60);
});

test("rate limiter resets after the window", () => {
  let now = 1000;
  const limiter = createRateLimiter({
    windowMs: 60000,
    limitsByRoute: { "/api/analytics": 1 },
    now: () => now
  });

  assert.equal(limiter.check({ routeKey: "/api/analytics", clientKey: "ip-a" }).allowed, true);
  assert.equal(limiter.check({ routeKey: "/api/analytics", clientKey: "ip-a" }).allowed, false);

  now += 61000;
  assert.equal(limiter.check({ routeKey: "/api/analytics", clientKey: "ip-a" }).allowed, true);
});
