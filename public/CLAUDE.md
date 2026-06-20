# Northcue frontend notes (public/)

This file loads automatically whenever Claude Code reads files inside
public/. See the root CLAUDE.md for product rules, safety boundaries,
and the do-not-touch list — those still apply here.

## Stack
Vanilla HTML/CSS/JS, no framework, no build step. Three files carry
almost everything:
- index.html — markup for all pages/sections
- app.js (~2,300 lines) — all page logic and rendering
- styles.css (~6,300 lines) — all styling

Pages are sections inside index.html (#page-landing, #page-home,
#page-journey, #page-help, #page-comfort), shown and hidden via JS, not
separate routes or files.

## Icon system
Icons live in public/icons/northcue/. Three relevant sets:
- Root-level files (e.g. overwhelmed.png) — older set, larger visible
  glyph relative to canvas
- foreground/ and foreground-light/ — newer foreground-only icons, used
  automatically by the northcueIcon() JS helper for any filename listed
  in the northcueForegroundIcons Set near the top of app.js
- utility-light/ — light-mode-specific variants that exist for a
  couple of icons only

Every icon's soft circle background comes from a modifier class on its
wrapper span (northcue-circle-soft-green / -cream / -blue / -purple /
-white), combined with CSS custom properties (--northcue-circle-bg,
--northcue-circle-border, --northcue-circle-shadow) and a shared
`:has()` selector block that applies overflow/background/border based
on those properties.

IMPORTANT: this exact `:has()` selector block is duplicated verbatim in
two separate places in styles.css. If you edit one copy, find and update
the other too, or consolidate them into one.

If an icon wrapper has no circle modifier class, it silently renders
with no circle, no border, no shadow — this was the original Light/Dark
topbar bug. Always give a new topbar/card icon wrapper one of the
modifier classes above, even if the intended look is subtle.

## Known issues — check current status before assuming these are fixed
- app.js, classFromLevel(): the condition order means a document
  classified as "low" severity gets the "badge-high" (red/urgent) CSS
  class instead of "badge-low" (calm green), because the "low" check is
  grouped with "urgent"/"high". One-line fix, status unconfirmed as of
  this note — verify before assuming it's done.
- styles.css, .help-cards / .help-simple-sections / .help-support-strip
  / .help-head: no @media overrides exist anywhere in the file for
  these selectors. At narrow widths the fixed side margins (44px) and
  multi-column grids will overflow. Status unconfirmed as of this note.
- Per-card severity status (urgent / caution / normal / good, already
  computed by the engine) is not visually shown anywhere on the main
  cue-card reading screen (#page-journey, renderCard() in app.js) — it
  only surfaces in a separate "Document check" modal. This is a design
  opportunity that hasn't been built yet, not a regression.

## Topbar decisions log
Keep this section updated as topbar work lands, so future sessions don't
relitigate settled decisions.
- Light/Dark are genuinely mutually exclusive (driven by the same
  `theme` state as the Reading Comfort colour-style swatches) — fine to
  combine into one switch/segmented control.
- Focus mode is an INDEPENDENT toggle (its own body class, layered on
  top of whichever theme is active). Never group it into the same
  exclusive-selection control as Light/Dark — more than one can be true
  at the same time.
- The "Saved" button (data-action="save-preferences") has been removed
  from index.html. savePreferences(false) is still called automatically
  throughout app.js on every preference change. The savePreferences()
  function itself is kept — only the redundant topbar button is gone.
- Light/Dark are now a single pill switch (.theme-switch containing two
  .theme-seg buttons). Each segment keeps its original data-theme="light"
  / data-theme="dark" attribute. setTheme() still toggles .active on
  those buttons, which drives the filled/plain segment styling.
- Focus circle background was deepened via a .mode-btn context override
  on .northcue-circle-soft-green (from barely-visible #eaf2e5 to a more
  saturated #cde3c1). The global class is unchanged; only the topbar
  context has the deeper tint.
- Text comfort button now has northcue-circle-soft-cream added to its
  span, giving it a visible cream circle matching the brand palette.
- The colour wheel button is now a .mode-btn.colour-wheel-btn containing
  a .colour-swatch span and a "Comfort" label. The swatch uses a
  conic-gradient of var(--lavender)/--rose/--sage/--cream (4 solid
  quadrants, no rainbow) so it automatically shifts in dark mode.
  Shadow uses var(--soft-shadow). id="colour-wheel" is kept for the
  existing click handler.

## Upload page two-state flow decisions
The upload panel (#page-journey, .upload-active) operates in two states
controlled by a `.file-added` class on `#upload-form`:

- **State 1 (no file):** Only `.dropzone-wrapper` and `.privacy-note`
  are visible. `.document-type-row`, `.upload-actions`, and `.type-confirm`
  are hidden via `#upload-form:not(.file-added)` CSS selectors.
- **State 2 (file added):** `.dropzone-wrapper` collapses to max-height:0
  with a 320ms ease transition. `#status.ready-message` shows the file
  strip. `.type-confirm` shows the detected-type line. `.upload-actions`
  (the Understand button) is shown. The `.document-type-row` is hidden
  by default but revealed by clicking "Change type" (adds `.type-pills-visible`
  class). Selecting a chip removes `.type-pills-visible`.
- `.file-added` is toggled in `fileInput.addEventListener("change")`.
- The `#remove-document` button now says "Replace" and calls
  `fileInput.click()` when `.file-added` is present, opening the file picker.
- `setStatus("Choose a document to begin.")` resets `.file-added` and
  removes `.type-pills-visible`. This covers all reset paths including
  upload-another and the remove flow.
- The upload/submit pipeline, `selectedType`, and `setJourneyStep()` are
  entirely untouched — only the show/hide presentation layer changed.
- `updateTypeConfirmLabel()` maps `selectedType` to a human-readable
  string displayed in `[data-type-label]`.

## Verify after any topbar/icon/layout change
Check both light and dark theme. Check desktop and mobile width
(existing .topbar media queries sit around 1180px and 760px — search
for them, don't assume one breakpoint covers it). Click every control
you touched to confirm it still does what it did before — markup/CSS
restructuring should never change what a data-theme or data-toggle
attribute does.
