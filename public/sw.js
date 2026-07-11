// Northcue service worker.
//
// Strategy: NETWORK-FIRST for same-origin GET requests. While online, every
// load fetches fresh files from the server, so installed users always receive
// the latest deploy and can never be stuck on a cached old version. The cache
// is only an offline fallback, filled as pages are visited (no precache list,
// so nothing can go stale by design).
//
// /api/ requests are never intercepted or cached. Cue-card responses derive
// from the user's document and must not sit in CacheStorage.
//
// CACHE VERSIONING: bump the string below on deploy (same habit as the ?v=
// query strings). Freshness does not depend on it, but a bump guarantees the
// offline fallback cache is rebuilt clean: the new worker installs because the
// file bytes changed, takes over immediately (skipWaiting + clients.claim),
// and the activate step deletes every old northcue-* cache.
const CACHE_VERSION = "northcue-v1-20260711";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("northcue-") && key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          // Offline navigation with no cached page yet: fall back to the app
          // shell if we have it, otherwise surface the network error honestly.
          if (request.mode === "navigate") return caches.match("/");
          return Response.error();
        })
      )
  );
});
