// Two small enhancements for the standalone privacy policy page. Both are
// enhancements, never requirements: with this file blocked or JavaScript off,
// the page is still complete and readable, which is the point of publishing the
// policy as static HTML rather than as an app screen.
//
// 1. RESTORE THE READER'S APPEARANCE. This page does not load app.js, so nothing
//    would otherwise apply the theme, text size or dyslexia setting they chose in
//    the product. A reader who set dark mode and then opened a link to the policy
//    would get a bright white wall of text, which is exactly the experience
//    Northcue exists to avoid.
//
//    It applies the body CLASS only. It does not reproduce themeConfig from
//    app.js: duplicating that table would be a second copy to drift. The class
//    carries --bg, --surface, --text and --line, which is what a page of text
//    needs; the accent tokens fall back to their :root values.
//
// 2. NARROW THE LANGUAGE NOTICE. The policy is English only. Every language's
//    notice is present in the markup so a reader without JavaScript still sees
//    theirs, and this hides the eight that are not theirs.
(function () {
  "use strict";

  var THEMES = ["light", "calm", "lavender", "cream", "sage", "classic", "dark"];
  var TEXT_SIZES = ["small", "medium", "large"];

  function applySavedAppearance() {
    var saved;
    try {
      saved = JSON.parse(localStorage.getItem("clearsteps-preferences") || "{}");
    } catch (error) {
      return; // Unreadable storage. The default calm theme in the markup stands.
    }
    if (!saved || typeof saved !== "object") return;

    var colour = THEMES.indexOf(saved.colour) === -1 ? "calm" : saved.colour;
    THEMES.forEach(function (name) {
      document.body.classList.remove("theme-" + name);
    });
    document.body.classList.add("theme-" + colour);

    var textSize = TEXT_SIZES.indexOf(saved.textSize) === -1 ? "medium" : saved.textSize;
    document.body.classList.remove("text-small", "text-large");
    if (textSize === "small") document.body.classList.add("text-small");
    if (textSize === "large") document.body.classList.add("text-large");

    document.body.classList.toggle("dyslexia-mode", Boolean(saved.dyslexiaMode));
  }

  // Hide the notices that are not this reader's. An English reader, or one whose
  // stored language is missing or unrecognised, sees none of them, which is
  // correct: the page they are reading is already in their language.
  function narrowLanguageNotice() {
    var chosen = "";
    try {
      chosen = localStorage.getItem("northcue_language") || "";
    } catch (error) {
      return; // Leave every notice visible rather than hide a reader's own.
    }

    var notices = document.querySelectorAll("[data-langnote]");
    var matched = false;
    for (var i = 0; i < notices.length; i += 1) {
      if (notices[i].getAttribute("data-langnote") === chosen) matched = true;
    }

    for (var j = 0; j < notices.length; j += 1) {
      var isTheirs = notices[j].getAttribute("data-langnote") === chosen;
      notices[j].hidden = matched ? !isTheirs : true;
    }

    var block = document.querySelector(".policy-langnote");
    if (block) block.hidden = !matched;
  }

  // The static theme-color in the markup is the light value, because that is what
  // the page paints before this file runs. Once a dark theme is restored above,
  // the tag would leave Chrome drawing light browser chrome against a dark page.
  // Safari 26 is unaffected either way: it ignores the tag and reads body's
  // background-color, which the theme class has already changed correctly.
  function syncBrowserChromeColour() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;

    var resolved = getComputedStyle(document.body).backgroundColor;
    if (typeof resolved !== "string") return;

    var parts = resolved.match(/[\d.]+/g);
    if (!parts || parts.length < 3) return;
    // rgb() arrives 0-255, color(srgb ...) arrives 0-1.
    var scale = resolved.indexOf("color(") === 0 ? 255 : 1;
    var hex = "#";
    for (var i = 0; i < 3; i += 1) {
      var value = Math.max(0, Math.min(255, Math.round(parts[i] * scale)));
      hex += (value < 16 ? "0" : "") + value.toString(16);
    }
    meta.setAttribute("content", hex);
  }

  try {
    applySavedAppearance();
    narrowLanguageNotice();
    syncBrowserChromeColour();
  } catch (error) {
    // A policy page must render whatever happens here.
  }
})();
