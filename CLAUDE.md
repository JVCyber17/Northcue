# Northcue project memory

Northcue was previously called ClearSteps. Treat Northcue as the current
brand, but expect older code, assets, database names, or comments to
still say ClearSteps or clearsteps.

## Product definition
Northcue turns confusing official documents (energy bills, council tax
notices, government letters, phone/broadband bills, payment notices,
appointment letters) into calm, short "cue cards": what the document
appears to be, what matters, and what to check next. It is a structured
document understanding journey — not a chatbot, not a generic PDF
summariser.

## Core users
Primary: UK parents and carers supporting neurodivergent children or
young people, and neurodivergent adults managing official paperwork on
their own. Secondary: overwhelmed adults, non-native English speakers,
older adults, students, tenants, people under financial stress. Assume
the person reading the UI may be anxious, rushed, or have low confidence
with official language — never assume a confident, unhurried reader.

## Safety boundaries
Never produce legal, financial, medical, debt, benefits, immigration,
tenancy, or official advice. Use cautious wording: appears, may, visible
in the document, check the original document. Never say the user must
act unless the document itself clearly says so and the app still frames
it as something to check, not an instruction.

## Privacy rules
Raw uploaded documents and raw extracted text are not stored by default.
Only safe metadata, feedback, session status, and analytics are stored.
Service role keys (Supabase, OpenAI) stay server-side only — never in
browser code, logs, or committed files.

## Engine status — do not edit here
The backend rules engine (src/services/clearStepsEngine.js) is fully
built, tested, and hardened: 6 UK document types, real PDF extraction,
OCR garble handling, AI-layer safety gating, severity escalation. This
work happens in dedicated backend sessions. If a frontend task seems to
require touching src/, server.js, or the engine, stop and flag it instead
of editing it directly.

## Critical pre-deployment blocker
The OpenAI API key and Supabase service role key were exposed in local
chat/terminal sessions during development. Both must be rotated in their
dashboards and .env updated before any public deployment. This is
unresolved — do not treat it as already done.

## Repo structure
- public/index.html, public/app.js, public/styles.css — frontend, vanilla
  JS/HTML/CSS, no framework, no build step. See public/CLAUDE.md for
  frontend-specific notes.
- public/icons/northcue/ — icon assets
- src/services/clearStepsEngine.js — rules engine (backend-only territory)
- src/schemas/, src/routes/, src/prompts/ — backend (backend-only territory)
- supabase/ — schema migrations (phase1, phase2, phase3_5, phase4, phase6)
- tests/ — node --test, backend-focused

## Build and test commands
- `npm start` — runs server.js
- `npm test` — runs `node --test tests/*.test.js`
- No frontend build step; public/ is served as static files

## UI rules
Do not touch the hero/landing section (document stack, cue card stack,
dotted line, scribble, headline, CTA, spacing, layout) without an
explicit request, even when a CSS change elsewhere could plausibly
affect it. Do not redesign product positioning or overall page layout
without discussing it first. Never weaken the calm, cautious tone of UI
copy. Keep the brand: dark green line icons, soft pastel circle
backgrounds, rounded strokes, generous white space, simple cards. Avoid
purple gradient blobs, decorative tech orbs, or flashy SaaS dashboard
energy.

## Coding standards
Standing rules for all future code in this project — read and follow
them by default every session. Goal: clean, readable, maintainable
code, with behaviour never changed as a side effect of tidying.

### Code quality
- One clear responsibility per file and per function. Keep functions
  small enough to read at a glance; split a function when it's doing
  several unrelated jobs and splitting genuinely improves clarity.
- Keep files focused. As a rough guide, when a file grows well past
  ~400 lines or starts handling many unrelated things, consider
  splitting it into smaller files with one clear purpose each. Caveat:
  public/app.js and public/styles.css are already large legacy files —
  do NOT undertake a big split of them without discussing it first;
  this guide is mainly for new files and new code.
- Separate concerns. Backend: route files (src/routes/) receive,
  validate, delegate to a service, and respond — they don't hold
  business logic or data access. Frontend: markup in index.html,
  behaviour in app.js, styling in styles.css — don't inline logic or
  styles where they don't belong.
- Keep Supabase/database and rules-engine logic in services or
  dedicated files (src/services/), never mixed into route handlers or
  UI code. (See also Privacy rules and Engine status.)
- No duplication. If the same logic appears in more than one place,
  extract a shared, well-named helper/utility and reuse it.
- Descriptive names for files, functions, and variables. Avoid vague
  names like data, stuff, temp, final, handleThing, doSomething — name
  by what the thing is or does.
- Don't over-engineer. Don't create many tiny files or layers for
  simple things; split only when it genuinely makes the project easier
  to understand.

### How to work
- Inspect the relevant code before editing — don't assume from memory
  or past summaries.
- For non-trivial changes, give a short plan before implementing.
- Make small, scoped changes, not large sweeping ones.
- Cleanliness must never change behaviour. Never alter working
  behaviour, design, layout, styling, mobile responsiveness, dark mode,
  themes, content, user flow, or features just because the code could
  be cleaner. Reorganising where code lives is fine; its behaviour must
  stay identical.
- When moving code, update every import/reference so nothing breaks.
- Don't delete code unless you're certain it's unused — explain why
  first.
- Don't add new libraries or dependencies unless truly necessary.
- After any UI change, verify visually at both desktop and mobile width
  before calling it done.
- Run the full test suite (`npm test`) after changes and confirm it
  passes identically. If behaviour changes, stop and flag it rather
  than committing.
- Report what changed, what was left untouched, and anything needing
  manual review.

## Known codebase health notes
public/styles.css is large (6,000+ lines) and has accumulated duplicate
rule blocks and inconsistent breakpoints (1180px vs 1120px, 760px vs
700px) from being patched across many sessions. When editing a CSS
selector, search the whole file first — the same selector block may
appear more than once.

## Do not touch without an explicit request
Hero section and its visual elements, product positioning, privacy
rules, advice boundaries, the working upload flow, Supabase secret
handling, and existing OCR/PDF parsing code.
