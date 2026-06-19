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

## Working style
Inspect the actual current code before proposing or making changes — do
not assume from past summaries or handoff docs alone. For any
non-trivial task, give a short plan before editing. Keep changes scoped
to what was asked. Verify visually at both desktop and mobile width
after any UI change before calling it done. Report what changed, what
was left untouched, and anything that needs manual review.

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
