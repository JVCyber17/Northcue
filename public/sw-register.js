// PWA install support. The app never depends on the worker; if registration
// fails, normal browsing is completely unaffected.
//
// THIS LIVES IN A FILE RATHER THAN INLINE IN index.html so the Content Security
// Policy can keep script-src 'self' with no 'unsafe-inline'. The alternative was
// pinning a sha256 of the inline block, which breaks on a single byte of
// whitespace, and registration failure is swallowed below by design, so that
// break would have been silent.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
