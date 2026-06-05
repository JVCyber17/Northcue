function createRateLimiter({ windowMs, limitsByRoute, now = () => Date.now() }) {
  const buckets = new Map();
  const safeWindowMs = Math.max(1000, Number(windowMs) || 60000);
  const safeLimitsByRoute = { ...limitsByRoute };

  function check({ routeKey, clientKey }) {
    const safeRouteKey = String(routeKey || "unknown");
    const safeClientKey = String(clientKey || "anonymous");
    const maxRequests = Number(safeLimitsByRoute[safeRouteKey] || safeLimitsByRoute.default || 60);
    const bucketKey = `${safeRouteKey}:${safeClientKey}`;
    const currentTime = now();
    const existing = buckets.get(bucketKey);

    if (!existing || currentTime >= existing.resetAt) {
      buckets.set(bucketKey, {
        count: 1,
        resetAt: currentTime + safeWindowMs
      });
      return { allowed: true, remaining: Math.max(0, maxRequests - 1), retryAfterSeconds: 0 };
    }

    if (existing.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - currentTime) / 1000))
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - existing.count),
      retryAfterSeconds: 0
    };
  }

  function prune() {
    const currentTime = now();
    for (const [bucketKey, bucket] of buckets.entries()) {
      if (currentTime >= bucket.resetAt) {
        buckets.delete(bucketKey);
      }
    }
  }

  return { check, prune, buckets };
}

module.exports = { createRateLimiter };
