# index.html user-facing string inventory (Phase 0)

Source: `public/index.html` (1298 lines), inspected 2026-07-26. Strings are recorded verbatim from the source, including HTML entities (`&pound;`, `&rarr;`, `&larr;`, `&rsquo;`, `&rsaquo;`, `&middot;`, `&amp;`) exactly as written. Line numbers are approximate anchors for tagging, not guarantees.

Conventions used below:

- Mixed markup means the element's translatable content is interleaved with inline children (`<br>`, `<strong>`, `<span>`, inline SVG icons), so it needs markup-aware tagging (per-child keys or an interpolation scheme), not a plain `textContent` swap.
- JS-owned means app.js replaces or toggles this element's text at runtime. The static initial text is still listed here, but the runtime strings must be extracted from app.js in a separate pass. Where known, the runtime replacement values are noted.
- Two commented-out blocks (lines 211 to 252 and 370 to 415, the removed "calm cards you get" previews) contain strings but are inactive markup. They are excluded from counts and tables. If they are ever restored, they will need tagging too.
- Empty `alt=""` attributes (decorative images) are correct as-is and are not listed. There are no `placeholder` attributes and no `title` attributes anywhere in index.html.

## Summary counts

| Section | Text strings | aria-labels | Placeholders | Non-empty alts |
|---|---|---|---|---|
| head/meta | 3 | 0 | 0 | 0 |
| topbar | 8 | 9 | 0 | 0 |
| landing (#page-landing) | 14 | 1 | 0 | 1 |
| home: .home-welcome (mobile) | 13 | 1 | 0 | 0 |
| home: .home-board (desktop) | 23 | 4 | 0 | 0 |
| home: .home-dashboard (mobile) | 30 | 3 | 0 | 0 |
| install block | 8 | 0 | 0 | 0 |
| journey (#page-journey) | 62 | 10 | 0 | 0 |
| help (#page-help) | 16 | 0 | 0 | 0 |
| comfort (#page-comfort) | 30 | 0 | 0 | 0 |
| privacy (#page-privacy) | 20 | 1 | 0 | 0 |
| privacy-full (#page-privacy-full) | 3 | 0 | 0 | 0 |
| why-northcue (#page-why-northcue) | 13 | 0 | 0 | 0 |
| mobile tabbar | 4 | 1 | 0 | 0 |
| modal shell | 2 | 1 | 0 | 0 |
| **Total** | **249** | **31** | **0** | **1** |

Grand total user-facing strings: **281** (249 text plus 31 aria-labels plus 1 alt). The head/meta count includes 1 text node (`<title>`) and 2 meta content attributes.

## head/meta

| suggested_key | exact string | element | ~line | mixed | JS-owned |
|---|---|---|---|---|---|
| head.title | Northcue | `<title>` | 6 | no | no |
| head.meta_description | Northcue turns confusing documents into calm, clear next steps. | `meta[name="description"]` content attr | 7 | no | no |
| head.apple_app_title | Northcue | `meta[name="apple-mobile-web-app-title"]` content attr | 17 | no | no |

## topbar

Text strings:

| suggested_key | exact string | element | ~line | mixed | JS-owned |
|---|---|---|---|---|---|
| topbar.brand_name | Northcue | `span.brand-name` | 32 | no | no |
| topbar.nav.home | Home | `button.top-link[data-page-link="home"]` | 36 | no | no |
| topbar.nav.understand | Understand | `button.top-link[data-page-link="journey"]` | 37 | no | no |
| topbar.nav.help | Help | `button.top-link[data-page-link="help"]` | 38 | no | no |
| topbar.mode.focus | Focus | `span` inside `button.mode-btn[data-toggle="focus-mode"]` | 54 | parent button is mixed (icon span plus label span) | no |
| topbar.mode.text_glyph | Aa | `span.top-mode-icon.text-mode-icon` (aria-hidden) | 57 | no | no. Decorative glyph, likely should stay untranslated, flag for review |
| topbar.mode.text | Text | `span` inside `button.mode-btn[data-toggle="dyslexia-mode"]` | 58 | parent button is mixed | no |
| topbar.mode.comfort | Comfort | `span` inside `button#colour-wheel` | 62 | parent button is mixed (swatch span plus label span) | no |

aria-labels:

| suggested_key | exact string | element | ~line |
|---|---|---|---|
| topbar.aria.go_home | Go to homepage | `a.brand-button.brand-link` | 23 |
| topbar.aria.main_pages | Main pages | `nav.top-links` | 35 |
| topbar.aria.comfort_controls | Comfort controls | `div.mode-row` | 41 |
| topbar.aria.theme | Theme | `div.theme-switch` | 42 |
| topbar.aria.light_theme | Light theme | `button.theme-seg[data-theme="light"]` | 43 |
| topbar.aria.dark_mode | Dark mode | `button.theme-seg[data-theme="dark"]` | 46 |
| topbar.aria.focus_mode | Focus mode | `button.mode-btn[data-toggle="focus-mode"]` | 50 |
| topbar.aria.text_comfort | Text comfort | `button.mode-btn[data-toggle="dyslexia-mode"]` | 56 |
| topbar.aria.open_comfort | Open colour and comfort settings | `button#colour-wheel` | 60 |

Note: the "Light theme" and "Dark mode" aria-labels are inconsistently worded (theme vs mode). Worth normalising during extraction.

## landing (#page-landing)

Text strings:

| suggested_key | exact string | element | ~line | mixed | JS-owned |
|---|---|---|---|---|---|
| landing.title | Your letter,`<br>`made clearer. | `h1#landing-title` | 79 | yes, contains `<br>` | no |
| landing.copy | Upload a bill, notice, or letter. `<br>` We make it clear. | `p.landing-copy` | 80 to 84 | yes, contains `<br>` | no |
| landing.cta | Make it clearer | `button.landing-start-btn` | 85 to 87 | yes, trailing aria-hidden arrow `span.landing-arrow` | no |
| landing.preview.label | A preview of your cue cards | `p.landing-cue-label` (inside aria-hidden `.landing-cue-previews`) | 91 | no | no |
| landing.preview.what_is.title | What it is | `strong` in `article.landing-cue-preview` | 100 | sibling of `span.landing-cue-line` inside a `div` | no |
| landing.preview.what_is.line | What the letter appears to be | `span.landing-cue-line` | 101 | no | no |
| landing.preview.what_to_do.title | What to do | `strong` in `article.landing-cue-preview` | 113 | as above | no |
| landing.preview.what_to_do.line | The safest next thing to check | `span.landing-cue-line` | 114 | no | no |
| landing.preview.when_matters.title | When it matters | `strong` in `article.landing-cue-preview` | 130 | as above | no |
| landing.preview.when_matters.line | Any visible dates that matter | `span.landing-cue-line` | 131 | no | no |
| landing.example.title | Council Tax bill | `strong` in `article.landing-example-card` (aria-hidden `.landing-mobile-flow`) | 145 | no | no |
| landing.example.tag_due | Due 14 Jul | `span.landing-example-tag` | 148 | no | no |
| landing.example.tag_amount | &pound;128 | `span.landing-example-tag` | 149 | no, but entity renders as £128, locale-sensitive | no |
| landing.example.more | Plus what to check next | `p.landing-example-more` | 153 | no | no |

Note: `.landing-cue-previews` (line 90) and `.landing-mobile-flow` (line 135) are `aria-hidden="true"` but visually rendered, so their strings are user-facing and must be translated.

aria-labels and alts:

| suggested_key | exact string | element | ~line | type |
|---|---|---|---|---|
| landing.aria.go_home | Go to homepage | `a.landing-brand.brand-link` | 76 | aria-label |
| landing.alt.logo | Northcue | `img.landing-logo-img` | 77 | alt (the only non-empty alt in the file) |

## home: .home-welcome (mobile layer)

| suggested_key | exact string | element | ~line | mixed | JS-owned |
|---|---|---|---|---|---|
| home.welcome.title | Your letter,`<br>`made clearer. | `h2.home-welcome-title` | 161 | yes, `<br>` | no |
| home.welcome.sub | Upload a bill, notice, or letter and get calm cue cards. | `p.home-welcome-sub` | 162 | no | no |
| home.welcome.start | Start with a document | `button.home-welcome-start` | 163 | no | no |
| home.welcome.privacy | Only used to make your cards. | `p.home-welcome-privacy` | 164 | no | no |
| home.welcome.hiw_heading | How it works | `h3.home-welcome-heading` | 168 | no | no |
| home.hiw.upload.title | Upload | `strong` in `li.hiw-step` | 175 | inside `span.hiw-copy` with sibling `small` | no |
| home.hiw.upload.line | A letter, bill, notice, or screenshot. | `small` in `li.hiw-step` | 176 | no | no |
| home.hiw.understand.title | Understand | `strong` in `li.hiw-step` | 184 | as above | no |
| home.hiw.understand.line | Northcue reads it and finds the key points. | `small` in `li.hiw-step` | 185 | no | no |
| home.hiw.check.title | Check | `strong` in `li.hiw-step` | 193 | as above | no |
| home.hiw.check.line | It highlights what matters and what to check. | `small` in `li.hiw-step` | 194 | no | no |
| home.hiw.act.title | Act | `strong` in `li.hiw-step` | 202 | as above | no |
| home.hiw.act.line | You get calm cue cards with a clear next step. | `small` in `li.hiw-step` | 203 | no | no |

aria-label:

| suggested_key | exact string | element | ~line |
|---|---|---|---|
| home.welcome.aria.region | Welcome to Northcue | `div.home-welcome` | 159 |

## home: .home-board (desktop layer)

| suggested_key | exact string | element | ~line | mixed | JS-owned |
|---|---|---|---|---|---|
| home.board.title | Your letter,`<br>`made clearer. | `h1.home-board-title` | 264 | yes, `<br>` | no |
| home.board.sub | Upload a bill, notice, or letter and get calm cue cards. | `p.home-board-sub` | 265 | no | no |
| home.board.start | Start with a document | `button.home-board-start` | 266 to 273 | yes, inline SVG before the text node | no |
| home.board.focus_helper | Focus mode: start with the main upload action. | `p.focus-helper.focus-home-helper` | 274 | no | no, visibility toggled by CSS/JS but text is static |
| home.board.help_heading | What do you need help with? | `h2.home-board-heading` | 278 | no | no |
| home.board.overwhelmed.title | I feel overwhelmed | `strong` in `button.home-tile-card[data-help-open="overwhelmed"]` | 284 | inside `span.home-card-copy` with sibling `small` | no |
| home.board.overwhelmed.line | Get calm support before reading. | `small` | 285 | no | no |
| home.board.help_line_doc | `<strong>`Help with a document or something else`</strong>` on the Help page | `span.home-help-line-text` in `button.home-help-line[data-page-link="help"]` | 293 | yes, strong plus trailing text | no |
| home.board.help_line_why | `<strong>`Why Northcue is different`</strong>` and how it keeps you safe | `span.home-help-line-text` in `button.home-help-line[data-page-link="why-northcue"]` | 299 | yes, strong plus trailing text | no |
| home.board.feedback.title | Give feedback | `strong` in `button[data-feedback-open]` | 309 | as tile pattern | no |
| home.board.feedback.line | Tell us what helped or felt confusing. | `small` | 310 | no | no |
| home.board.private.title | Private &amp; secure | `strong` in `article.is-privacy-link` | 318 | no, but note the `&amp;` entity. The dashboard twin says "Private and secure", wording differs | no |
| home.board.private.line | Your documents stay private. | `small` | 319 | no | no |
| home.board.process.heading | How Northcue works | `h2` in `section.home-board-process > header` | 330 | no | no |
| home.board.process.sub | A simple way to understand a document. | `p` in same header | 331 | no | no |
| home.board.process.upload.title | Upload | `strong` in `div.process-step` (aria-hidden `.process-orbit`) | 338 | step div mixes icon span, strong, small | no |
| home.board.process.upload.line | Add your document | `small` | 339 | no | no |
| home.board.process.understand.title | Understand | `strong` in `div.process-step` | 346 | as above | no |
| home.board.process.understand.line | We explain it simply | `small` | 347 | no | no |
| home.board.process.check.title | Check | `strong` in `div.process-step` | 354 | as above | no |
| home.board.process.check.line | We highlight key details | `small` | 355 | no | no |
| home.board.process.act.title | Act | `strong` in `div.process-step` | 362 | as above | no |
| home.board.process.act.line | You choose what to do next | `small` | 363 | no | no |

aria-labels:

| suggested_key | exact string | element | ~line |
|---|---|---|---|
| home.board.aria.region | Northcue home | `div.home-board` | 260 |
| home.board.aria.connect | Feedback and privacy | `section.home-board-connect` | 303 |
| home.board.aria.privacy_card | Read how Northcue protects your privacy | `article.is-privacy-link[role="button"]` | 313 |
| home.board.aria.process | How Northcue works | `section.home-board-process` | 328 |

## home: .home-dashboard (mobile layer)

| suggested_key | exact string | element | ~line | mixed | JS-owned |
|---|---|---|---|---|---|
| home.dash.title_full | What do you need help with today? | `span.home-title-full` in `h1#home-title` | 423 | yes, h1 holds two alternate spans | no |
| home.dash.title_compact | Here if you need us | `span.home-title-compact` in `h1#home-title` | 423 | yes, as above | no |
| home.dash.intro | Northcue turns a confusing bill, notice or official letter into calm cue cards. They show what it appears to be, what matters, and what to check next. | `p` in `header.home-dashboard-head` | 424 | no | no |
| home.dash.focus_helper | Focus mode: start with the main upload action. | `p.focus-helper.focus-home-helper` | 425 | no | no |
| home.dash.primary.heading | Understand a document | `h2` in `article.home-primary-card` | 433 | no | no |
| home.dash.primary.upload | Upload | `button.home-upload-btn` | 434 to 441 | yes, inline SVG before text node | no |
| home.dash.overwhelmed.title | I feel overwhelmed | `strong` in `button.home-tile-card[data-page-link="help"]` | 451 | tile pattern | no |
| home.dash.overwhelmed.line | Get calm support before reading. | `small` | 452 | no | no |
| home.dash.feedback.title | Give feedback | `strong` in `button[data-feedback-open]` | 462 | tile pattern | no |
| home.dash.feedback.line | Tell us what helped or felt confusing. | `small` | 463 | no | no |
| home.dash.documents.title | Your documents | `strong` in `article.home-static-card` | 473 | tile pattern | no |
| home.dash.documents.line | Your documents will appear here after you upload one. | `small` | 474 | no | no |
| home.dash.private.title | Private and secure | `strong` in `article.is-privacy-link` | 483 | tile pattern. Board twin says "Private &amp; secure" | no |
| home.dash.private.line | Your documents stay private. | `small` | 484 | no | no |
| home.mobile.overwhelmed.title | I feel overwhelmed | `strong` in `button[data-help-open="overwhelmed"]` (.home-mobile-actions) | 496 | tile pattern | no |
| home.mobile.overwhelmed.line | Get calm support before reading. | `small` | 497 | no | no |
| home.mobile.help_line_doc | `<strong>`Help with a document or something else`</strong>` on the Help page | `span.home-help-line-text` | 506 | yes, strong plus trailing text | no |
| home.mobile.help_line_why | `<strong>`Why Northcue is different`</strong>` and how it keeps you safe | `span.home-help-line-text` | 513 | yes, strong plus trailing text | no |
| home.mobile.feedback | Give feedback | `span.home-quiet-label` in `button.home-quiet-row` | 522 | no | no |
| home.mobile.privacy_line | Private and secure. See how | `span.home-privacy-text` in `button.home-privacy-link` | 530 | no | no |
| home.dash.process.heading | How Northcue works | `h2` in `section.home-process-panel > header` | 537 | no | no |
| home.dash.process.sub | A simple way to understand a document. | `p` in same header | 538 | no | no |
| home.dash.process.upload.title | Upload | `strong` in `div.process-step` | 546 | step pattern | no |
| home.dash.process.upload.line | Add your document | `small` | 547 | no | no |
| home.dash.process.understand.title | Understand | `strong` | 556 | step pattern | no |
| home.dash.process.understand.line | We explain it simply | `small` | 557 | no | no |
| home.dash.process.check.title | Check | `strong` | 566 | step pattern | no |
| home.dash.process.check.line | We highlight key details | `small` | 567 | no | no |
| home.dash.process.act.title | Act | `strong` | 576 | step pattern | no |
| home.dash.process.act.line | You choose what to do next | `small` | 577 | no | no |

Note: the process orbit (Upload / Understand / Check / Act plus subtitles) appears twice verbatim, once in .home-board (338 to 363) and once in .home-dashboard (546 to 577). One set of dictionary keys can serve both if both DOM copies get the same data-i18n attributes.

aria-labels:

| suggested_key | exact string | element | ~line |
|---|---|---|---|
| home.dash.aria.options | Home options | `div.home-card-grid` | 445 |
| home.dash.aria.privacy_card | Read how Northcue protects your privacy | `article.is-privacy-link[role="button"]` | 478 |
| home.dash.aria.process | How Northcue works | `section.home-process-panel` | 535 |

## install block

Inside #page-home, `div.install-block[data-install-block]`, hidden until app.js reveals it. Text is static, visibility is JS-controlled.

| suggested_key | exact string | element | ~line | mixed | JS-owned |
|---|---|---|---|---|---|
| install.card.title | Add Northcue to your phone | `h2#install-card-title` | 589 | no | no |
| install.card.line | Keep it one tap away, like an app. | `p.install-card-line` | 590 | no | no |
| install.card.install | Install Northcue | `button.install-btn[data-install-trigger]` | 592 | no | no |
| install.card.dismiss | Not now | `button.install-dismiss[data-install-dismiss]` | 593 | no | no |
| install.card.ios_line | On iPhone, tap Share, then Add to Home Screen. | `p.install-ios-line[data-install-ios]` | 595 | no | no |
| install.footline.android | Add Northcue to your phone | `span` in `button.install-footline-btn` | 604 | button mixes mark span and text span | no |
| install.footline.ios | Add Northcue to your phone | `span.install-footline-iostext` | 610 | sibling small in same div | no |
| install.footline.ios_line | On iPhone, tap Share, then Add to Home Screen. | `small` in `div.install-footline-ios` | 611 | no | no |

## journey (#page-journey)

Text strings:

| suggested_key | exact string | element | ~line | mixed | JS-owned |
|---|---|---|---|---|---|
| journey.title_full | Start with one document | `span.journey-title-full` in `h1#journey-title` | 619 | yes, h1 holds two alternate spans | no |
| journey.title_compact | Start with a document | `span.journey-title-compact` | 619 | yes, as above | no |
| journey.upload.subtitle | Upload a file and we&rsquo;ll turn it into calm cue cards. | `p.journey-upload-subtitle` | 620 | no, note the `&rsquo;` entity | no |
| journey.upload.subtitle_mobile | Ready when you are. | `p.journey-upload-subtitle-mobile` | 621 | no | no |
| journey.upload.focus_helper | Focus mode: choose one file, then press Understand this document. | `p.focus-helper.focus-upload-helper` | 622 | no | no |
| journey.rail.upload | Upload | `button.rail-step[data-rail="upload"]` | 624 to 629 | yes, icon span before text node | no |
| journey.rail.understand | Understand | `button.rail-step[data-rail="understand"]` | 630 to 635 | yes | no |
| journey.rail.act | Act | `button.rail-step[data-rail="act"]` | 636 to 641 | yes | no |
| journey.rail.check | Check | `button.rail-step[data-rail="check"]` | 642 to 647 | yes | no |
| journey.dropzone.title | Drag and drop, or `<span>`browse`</span>` | `span.dropzone-title` | 657 | yes, inner span styles the word browse | no |
| journey.dropzone.choose | Choose a file | `span.dropzone-choose` | 658 | no | no |
| journey.dropzone.formats | PDF, JPG or PNG | `span#file-name.dropzone-sub` | 659 | no | YES. app.js swaps in the chosen filename, and resets to "PDF, JPG, or PNG" (with a comma, unlike the HTML). Copy mismatch to resolve |
| journey.take_photo | Take a photo | `label#take-photo` | 661 to 667 | yes, inline SVG before text node | no |
| journey.status.ready_title | Document ready | `strong[data-status-title]` in `#status` | 677 | `#status` block mixes icon, strong, span, button | YES. app.js sets "Document ready" or "Please check your upload" plus detail text in `[data-status-detail]` |
| journey.status.replace | Replace | `button#remove-document.ready-remove` | 680 | no | no, text static, behaviour JS |
| journey.type.change | Change type | `button.change-type-btn` | 687 | no | no. Sibling `span[data-type-label]` (686) starts empty and is JS-owned, app.js writes the human-readable detected type |
| journey.type.auto | Auto detect | `button.chip[data-category="auto"]` | 692 | no | no |
| journey.type.letter | Letter | `button.chip[data-category="letter"]` | 693 | no | no |
| journey.type.bill | Bill | `button.chip[data-category="bill"]` | 694 | no | no |
| journey.type.more | More | `span[data-more-label]` in `button#more-type-button` | 697 | no | YES. app.js overwrites with the selected type name and resets to "More" |
| journey.type.work | Work | `button.chip[data-category="work"]` | 700 | no | no |
| journey.type.medical | Medical | `button.chip[data-category="medical"]` | 701 | no | no |
| journey.type.school | School | `button.chip[data-category="school"]` | 702 | no | no |
| journey.type.legal | Legal | `button.chip[data-category="legal"]` | 703 | no | no |
| journey.type.email | Email | `button.chip[data-category="email"]` | 704 | no | no |
| journey.type.article | Article | `button.chip[data-category="article"]` | 705 | no | no |
| journey.type.other | Other | `button.chip[data-category="other"]` | 706 | no | no |
| journey.submit | Understand this document `<span aria-hidden="true">`&rarr;`</span>` | `button#submit-button.primary-btn` | 713 | yes, arrow span | YES. app.js sets "Reading..." while loading and restores "Understand this document →" via textContent (dropping the span) |
| journey.card_style | Card style | `button#card-style-button` | 714 | no | no, hidden by default |
| journey.doc_check | Document check | `button#check-button` | 715 | no | no, hidden by default |
| journey.privacy.title | Private and secure | `strong` in `div.privacy-note` | 723 | note block mixes icon, strong, small | no |
| journey.privacy.line | Only used to make your cards. | `small` | 724 | no | no |
| journey.privacy.mobile | Your document is not stored. We only use it to make your cards. | `button.privacy-line-mobile` | 727 | no | no |
| journey.results.heading | Understand your document | `h1` in `div.results-head` | 733 | no | no |
| journey.results.sub | We break it into clear cards, one step at a time. | `p` | 734 | no | no |
| journey.results.focus_helper | Focus mode: one card at a time. Actions are hidden until you exit Focus. | `p.focus-helper.focus-card-helper` | 735 | no | no |
| journey.card.progress | Card 1 of 6 | `p#card-progress` | 744 | no | YES. app.js writes "Card N of M" (interpolated string lives in app.js) |
| journey.card.focus_toggle | Focus on card | `span` in `button#card-focus-toggle` | 745 to 754 | yes, SVG plus span | YES. app.js toggles between "Focus on card" and "Exit focus" |
| journey.card.detail_toggle | Simple view | `span` in `button#card-detail-toggle` | 755 to 762 | yes, SVG plus span | YES. app.js toggles between "Simple view" and "Show full details" |
| journey.card.title | What is this? | `h2#card-title` | 773 | no | YES. Replaced with engine card titles |
| journey.card.answer | This looks like a formal document. | `p#card-answer` | 774 | no | YES. Replaced with engine short answers |
| journey.card.explanation | It can be read clearly, so we can pull out the key points. | `p#card-explanation` | 775 | no | YES. Replaced with engine explanations. Sibling `ul#card-steps` (776) starts empty, JS-owned |
| journey.card.back | &larr; Back | `button#card-back` | 780 | no, arrow entity inside the text | no |
| journey.card.next | Next &rarr; | `button#card-next` | 781 | no, arrow entity inside the text | YES. app.js sets "Finish" on the last card, else "Next &rarr;" |
| journey.done.headline | You made it. | `h2.completion-headline` | 796 | no | no |
| journey.done.body | You've been through all `<span id="completion-card-count">`your`</span>` cards. Your document is clearer now, and the original is always there whenever you want to check it. | `p.completion-body` | 797 | yes, inline span mid-sentence | PARTIAL. app.js overwrites only `#completion-card-count` with the card count number |
| journey.done.add_calendar | Add to calendar | `button#completion-add-calendar` | 798 | no | no |
| journey.done.another | Understand another | `button#completion-upload-another` | 800 | no | no |
| journey.done.divider | &middot; | `span.completion-divider` (aria-hidden) | 801 | no, decorative separator, likely excluded from the dictionary | no |
| journey.done.back_home | Back to home | `button#completion-back-home` | 802 | no | no |
| journey.done.feedback | Was this helpful? | `button#completion-feedback` | 804 | no | no |
| journey.card.feedback | Good start. Let's go one card at a time. | `p#card-feedback.micro-feedback` | 807 | no | YES. app.js writes per-card encouragement lines and the fallback "Keep going at your own pace." |
| journey.actions.heading | Actions | `h2` in `aside.action-panel` | 811 | no | no |
| journey.actions.copy | Copy summary | `button#copy-summary` | 813 to 818 | yes, icon span before text node | no |
| journey.actions.check | Document check | `button#review-check` | 819 to 824 | yes | no |
| journey.actions.calendar | Add to calendar | `button#add-calendar` | 825 to 830 | yes | no |
| journey.actions.upload_another | Upload another document | `button#upload-another` | 831 to 836 | yes | no |
| journey.actions.feedback | Give feedback | `button#give-feedback` | 837 to 842 | yes | no. Sibling `div#action-message` (845) starts empty, JS-owned status line |
| journey.achievement | `<strong>`Hurray, you completed this section.`</strong>` Great job, your journey is clearer now. | `span` in `div#achievement` | 860 | yes, strong plus trailing text | no, only visibility is JS |
| journey.after_feedback.heading | Was this helpful? | `h2` in `section#card-feedback-panel` | 865 | no | no |
| journey.after_feedback.sub | Tell us what felt clear or confusing. | `p` | 866 | no | no |
| journey.after_feedback.cta | Give feedback | `button.primary-btn[data-feedback-open]` | 868 | no | no |

Also JS-owned and initially empty (no static text, extract from app.js): `p[data-reading-hint]` (683), `span[data-type-label]` (686), `span[data-status-detail]` (678), `ul#card-steps` (776), `div#progress-dots` (764), `div#action-message` (845).

aria-labels:

| suggested_key | exact string | element | ~line |
|---|---|---|---|
| journey.aria.steps | Document steps | `div.journey-rail` | 623 |
| journey.aria.upload_area | Upload area | `section.upload-panel` | 650 |
| journey.aria.replace_doc | Choose a different document | `button#remove-document` | 680 |
| journey.aria.doc_type | Document type | `div.chips[role="radiogroup"]` | 691 |
| journey.aria.privacy_note | Read how Northcue protects your privacy | `div.privacy-note[role="button"]` | 718 |
| journey.aria.guided_card | Guided card | `section.cue-card-panel` | 741 |
| journey.aria.progress | Cue card progress | `div#progress-dots` | 764 |
| journey.aria.complete | Document complete | `div#completion-screen` | 785 |
| journey.aria.actions | Actions | `aside.action-panel` | 810 |
| journey.aria.after_feedback | Feedback after cue cards | `section#card-feedback-panel` | 863 |

## help (#page-help)

| suggested_key | exact string | element | ~line | mixed | JS-owned |
|---|---|---|---|---|---|
| help.eyebrow | Help | `p.eyebrow` | 876 | no | no |
| help.title | Support when`<br>`things feel hard | `h1#help-title` | 877 | yes, `<br>` | no |
| help.focus_helper | Focus mode: choose one support card. Details open in a small popup. | `p.focus-helper.focus-help-helper` | 878 | no | no |
| help.tier.quick | Quick help with your document | `p.help-tier-label` | 881 | no | no |
| help.card.fake | I think this document is fake | `strong` in `button.help-card[data-help="fake"]` | 887 | card mixes icon span, strong, arrow span | no, modal content comes from app.js |
| help.card.arrow | &rsaquo; | `span.help-card-arrow` (aria-hidden), repeated at 888, 895, 902, 909, 921, 928 | 888 | no | no. Decorative glyph, likely excluded from the dictionary |
| help.card.deadline | I cannot find the deadline | `strong` in `button.help-card[data-help="deadline"]` | 894 | as card pattern | no |
| help.card.time | I need more time | `strong` in `button.help-card[data-help="time"]` | 901 | as card pattern | no |
| help.card.wrong | I uploaded the wrong file | `strong` in `button.help-card[data-help="wrong"]` | 908 | as card pattern | no |
| help.tier.support | When you need more support | `p.help-tier-label` | 914 | no | no |
| help.card.overwhelmed | I feel overwhelmed | `strong` in `button.help-card[data-help="overwhelmed"]` | 920 | as card pattern | no |
| help.card.person | I need someone to help me | `strong` in `button.help-card[data-help="person"]` | 927 | as card pattern | no |
| help.contact.heading | Give feedback, or ask us to get in touch | `h3` in `div.help-contact-card-body` | 933 | no | no |
| help.contact.sub | Tell us how Northcue worked for you, or leave your details and we'll reach out. | `p` | 934 | no | no |
| help.contact.cta | Write to us | `button.soft-purple-btn[data-feedback-open]` | 936 | no | no |
| help.safety_note | If you or someone else is in immediate danger, call 999. Northcue is not an emergency service. | `span` in `p.help-safety-note` | 940 | yes, inline SVG icon before the span | no |

## comfort (#page-comfort)

| suggested_key | exact string | element | ~line | mixed | JS-owned |
|---|---|---|---|---|---|
| comfort.eyebrow_full | Accessibility settings | `span.comfort-eyebrow-full` | 948 | yes, parent span holds two alternate spans | no |
| comfort.eyebrow_short | Settings | `span.comfort-eyebrow-short` | 949 | yes, as above | no |
| comfort.title | Make Northcue comfortable for you`<span class="green-dot">`.`</span>` | `h1#comfort-title` | 951 | yes, green-dot span holds the full stop | no |
| comfort.sub | Choose settings that make reading feel easier. | `p` in `div.comfort-head` | 952 | no | no |
| comfort.appearance.label | Appearance | `p.settings-appearance-label` | 957 | no | no |
| comfort.appearance.dark | Dark mode | `span.appearance-toggle-label` | 961 | no | no |
| comfort.appearance.focus | Focus mode | `span.appearance-toggle-label` | 967 | no | no |
| comfort.appearance.focus_help | Simplifies the screen so you see less at once. Works best when reading your cue cards. | `span.appearance-toggle-help` | 968 | no | no |
| comfort.colour.label | Colour style | `p` in `div.settings-section` | 976 | no | no |
| comfort.colour.calm | Calm | `button.colour-style[data-colour-style="calm"]` | 978 | yes, swatch span before text node | no |
| comfort.colour.lavender | Soft Lavender | `button.colour-style[data-colour-style="lavender"]` | 979 | yes | no |
| comfort.colour.cream | Warm Cream | `button.colour-style[data-colour-style="cream"]` | 980 | yes | no |
| comfort.colour.sage | Sage Focus | `button.colour-style[data-colour-style="sage"]` | 981 | yes | no |
| comfort.colour.classic | Classic | `button.colour-style[data-colour-style="classic"]` | 982 | yes | no |
| comfort.text_size.label | Text size | `p` in `div.settings-section` | 987 | no | no |
| comfort.text_size.small | `<strong>`Aa`</strong>`Smaller | `button.text-size-btn[data-text-size="small"]` | 989 | yes, strong glyph plus text node. "Aa" likely untranslated | no |
| comfort.text_size.medium | `<strong>`Aa`</strong>`Medium | `button.text-size-btn[data-text-size="medium"]` | 990 | yes | no |
| comfort.text_size.large | `<strong>`Aa`</strong>`Larger | `button.text-size-btn[data-text-size="large"]` | 991 | yes | no |
| comfort.card_style.label | Reading card style | `p` in `div.settings-section` | 996 | no | no |
| comfort.card_style.soft.title | Soft rounded | `strong` in `button.card-style-choice[data-card-style-choice="soft"]` | 998 | yes, empty span plus strong plus small | no |
| comfort.card_style.soft.line | Gentle corners and padding | `small` in same button | 998 | yes | no |
| comfort.card_style.standard.title | Standard | `strong` in `button.card-style-choice[data-card-style-choice="standard"]` | 999 | yes | no |
| comfort.card_style.standard.line | More defined edges | `small` in same button | 999 | yes | no |
| comfort.background.label | Background style | `p` in `div.settings-section` | 1004 | no | no |
| comfort.background.plain | Plain calm | `span` in `button.background-style-choice[data-background-style="plain"]` | 1006 | yes, preview span plus label span | no |
| comfort.background.dots | Soft dots | `span` in `button[data-background-style="dots"]` | 1007 | yes, SVG preview plus label span | no |
| comfort.background.shapes | Soft shapes | `span` in `button[data-background-style="shapes"]` | 1008 | yes | no |
| comfort.background.notebook | School notebook | `span` in `button[data-background-style="notebook"]` | 1009 | yes | no |
| comfort.background.animals | Soft friends | `span` in `button[data-background-style="animals"]` | 1010 | yes | no |
| comfort.saved_note | Saved on this device. You can change this anytime. | `p.saved-on-device` | 1015 | no | no |

## privacy (#page-privacy)

| suggested_key | exact string | element | ~line | mixed | JS-owned |
|---|---|---|---|---|---|
| privacy.title | Your privacy`<span class="green-dot">`.`</span>` | `h1#privacy-title` | 1027 | yes, green-dot span | no |
| privacy.intro | The documents people bring to Northcue can feel personal. We treat them that way. Here is how we look after them, simply. | `p.privacy-intro` | 1028 | no | no |
| privacy.step.upload | You upload | `span.privacy-step-label` | 1036 | no | no |
| privacy.step.structure | Northcue structures it | `span.privacy-step-label` | 1045 | no | no |
| privacy.step.ai | AI helps phrase it clearly | `span.privacy-step-label` | 1054 | no | no |
| privacy.step.deleted | It is deleted | `span.privacy-step-label` | 1063 | no | no |
| privacy.journey_caption | Your document is deleted after we read it. We keep only anonymous information, never its contents. | `p.privacy-journey-caption` | 1066 | no | no |
| privacy.thinking.heading | The thinking is ours | `h2` in `div.privacy-authenticity` | 1069 | no | no |
| privacy.thinking.body | Northcue is not a chatbot. We built our own system that reads your document, works out what it appears to be, and carefully decides what belongs on each cue card and how gently to word it. That structure, and the safety behind it, is Northcue's own work. An AI provider only helps put it into clear, friendly language at the end. | `p` | 1070 | no | no |
| privacy.keep.heading | What we keep | `h3` in `div.privacy-card` | 1078 | no | no |
| privacy.keep.body | Only anonymous information, like the type of document and whether it read clearly. Never linked to you. | `p` | 1079 | no | no |
| privacy.never.heading | What we never keep | `h3` in `div.privacy-card` | 1085 | no | no |
| privacy.never.body | Your document, its text, or your name, address, and account numbers. | `p` | 1086 | no | no |
| privacy.cards.heading | How your cards are made | `h2` in `div.privacy-panel` | 1094 | no | no |
| privacy.cards.body | Northcue structures your cue cards and decides what matters. To help phrase them clearly, an AI provider reads what is on your document. That text is only used to make your cards, it is processed securely, it is not used to train AI, and it is not stored. | `p` | 1095 | no | no |
| privacy.questions.heading | Questions | `h2` in `div.privacy-panel` | 1102 | no | no |
| privacy.questions.body | If you have any questions about your privacy, you will find how to reach us in the full privacy details. | `p` | 1103 | no | no |
| privacy.full_link.title | Read the full privacy details | `strong` in `button.privacy-full-link` | 1109 | yes, strong plus small inside a span, plus arrow span | no |
| privacy.full_link.line | The complete version, including the AI provider we use and how long anything is kept. | `small` | 1110 | yes | no |
| privacy.closing | Northcue is a reading aid. It does not give legal, financial, or official advice. Always check your original document. | `p.privacy-closing` | 1117 | no | no |

aria-label:

| suggested_key | exact string | element | ~line |
|---|---|---|---|
| privacy.aria.journey | How Northcue handles your document | `ol.privacy-journey` | 1031 |

## privacy-full (#page-privacy-full)

| suggested_key | exact string | element | ~line | mixed | JS-owned |
|---|---|---|---|---|---|
| privacy_full.title | Full privacy details`<span class="green-dot">`.`</span>` | `h1#privacy-full-title` | 1123 | yes, green-dot span | no |
| privacy_full.coming_soon | The complete privacy details page is coming soon. | `p` | 1124 | no | no |
| privacy_full.back | Back to privacy | `button.outline-btn[data-page-link="privacy"]` | 1125 | no | no |

Note: this page is a stub (see the TODO comment at line 1106). Its strings will grow when the full page is built.

## why-northcue (#page-why-northcue)

| suggested_key | exact string | element | ~line | mixed | JS-owned |
|---|---|---|---|---|---|
| why.title | There's AI everywhere. Why is this different`<span class="green-dot">`?`</span>` | `h1#why-northcue-title` | 1132 | yes, green-dot span holds the question mark | no |
| why.lead | Built for the moment an official envelope makes your chest tighten. | `p.why-lead` | 1133 | no | no |
| why.kept.heading | Your document is never kept. | `h3` in `div.why-block` | 1157 | no | no |
| why.kept.body | Your file is deleted as soon as it is read. What stays behind is anonymous, never the words on your letter. | `p` | 1158 | no | no |
| why.safety.heading | AI never decides your safety. | `h3` in `div.why-block` | 1177 | no | no |
| why.safety.body | A fixed set of rules decides what your document appears to be and how carefully to treat it. AI is only allowed to soften the wording, never to change the judgement. | `p` | 1178 | no | no |
| why.honest.heading | It knows when to say I'm not sure. | `h3` in `div.why-block` | 1201 | no | no |
| why.honest.body | Northcue will not reassure you about a serious letter, and will not alarm you about a routine one. When it cannot tell, it says so honestly. | `p` | 1202 | no | no |
| why.refuse.heading | Sometimes the safest answer is no. | `h3` in `div.why-block` | 1219 | no | no |
| why.refuse.body | If an upload looks like a scam or does not look like a real letter, Northcue declines instead of guessing. Refusing is part of how it keeps you safe. | `p` | 1220 | no | no |
| why.closing | Never a chatbot. Never advice. Never invents what is not in your document. | `p.why-closing` | 1223 | no | no |
| why.cta.try | Try it with your letter | `button.primary-btn[data-page-link="journey"]` | 1226 | no | no |
| why.cta.home | Back to home | `button.outline-btn[data-page-link="home"]` | 1227 | no | no |

## mobile tabbar

| suggested_key | exact string | element | ~line | mixed | JS-owned |
|---|---|---|---|---|---|
| tabbar.home | Home | `span.mobile-tab__label` in `button.mobile-tab[data-page-link="home"]` | 1244 | tab mixes aria-hidden SVG icon span and label span | no |
| tabbar.understand | Understand | `span.mobile-tab__label` in `button[data-page-link="journey"]` | 1254 | as above | no |
| tabbar.help | Help | `span.mobile-tab__label` in `button[data-page-link="help"]` | 1265 | as above | no |
| tabbar.settings | Settings | `span.mobile-tab__label` in `button[data-page-link="comfort"]` | 1274 | as above | no |

aria-label:

| suggested_key | exact string | element | ~line |
|---|---|---|---|
| tabbar.aria.sections | Main sections | `nav.mobile-tabbar` | 1234 |

## modal shell

| suggested_key | exact string | element | ~line | mixed | JS-owned |
|---|---|---|---|---|---|
| modal.close | Back | `button#modal-close.modal-close` | 1280 | no | YES. app.js sets a custom close label via `options.closeLabel` and resets to "Back" |
| modal.title | Details | `h2#modal-title` | 1281 | no | YES. app.js writes "Get in touch", "Give feedback", "Thanks." and other titles. `div#modal-content` (1282) starts empty, fully JS-owned |

aria-label:

| suggested_key | exact string | element | ~line |
|---|---|---|---|
| modal.aria.close | Go back | `button#modal-close` | 1280 |

## Cross-cutting notes for the tagging pass

1. Duplicated strings that can share one key: the process orbit set (board and dashboard copies), "I feel overwhelmed" and "Get calm support before reading." (3 occurrences), "Give feedback" (5), "Add to calendar" (2), "Document check" (2), "Was this helpful?" (2), "Start with a document" (2 buttons plus the journey compact title), "Your letter, made clearer." (3), "Upload a bill, notice, or letter and get calm cue cards." (2), "Add Northcue to your phone" (3), "On iPhone, tap Share, then Add to Home Screen." (2), "Only used to make your cards." (2), the two help-line spans (board and mobile), "Back to home" (2), "Read how Northcue protects your privacy" aria-label (3).
2. Copy inconsistencies to resolve before freezing keys: "Private &amp; secure" (board, 318) vs "Private and secure" (dashboard, 483 and journey, 723); "PDF, JPG or PNG" (HTML, 659) vs "PDF, JPG, or PNG" (app.js reset value); "Light theme" vs "Dark mode" aria-labels (43 and 46).
3. Compact and full alternates driven by CSS visibility (`.home-title-full`/`.home-title-compact`, `.journey-title-full`/`.journey-title-compact`, `.comfort-eyebrow-full`/`.comfort-eyebrow-short`) each need their own key since both spans are always in the DOM.
4. Runtime strings to extract from app.js in the next phase include: card titles, answers, explanations and steps, per-card encouragement lines, "Card N of M", "Finish", "Reading...", "Exit focus", "Show full details", status titles and details ("Please check your upload", file name and size line), type-confirm labels, "More" reset, "PDF, JPG, or PNG" reset, modal titles and full modal body markup (feedback and contact flows), action messages, reading hints, and the feedback form fields (which include the only placeholders in the product).
5. Locale-sensitive non-translatable candidates: "Aa" glyphs (topbar 57, comfort 989 to 991), the `&rsaquo;` and `&middot;` decorative glyphs, "&pound;128" and "Due 14 Jul" (sample data, currency and date format are locale concerns), "999" in the help safety note (UK emergency number, must be reviewed per locale, not blindly translated).
