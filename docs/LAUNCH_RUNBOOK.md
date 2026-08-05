# Launch runbook

One page. Do the steps in order. Every step tells you what you should see.
If you see something else, stop and use the rollback at the bottom.

## Before you start

All nine packs verified (`node scripts/verification/ingest.js --table`
shows nine VERIFIED rows). If it does not, stop.

## The launch, three steps

**1. The migration.** In the Supabase SQL editor, run the contents of
`supabase/phase7_language.sql`. It is safe to run twice.
You should see: success, no rows returned.

**2. The flag.** In `public/i18n/config.js`, change

    launch: { open: false }
to
    launch: { open: true }

Commit exactly that one change with the message "Launch: open the nine
languages" and push. You should see: the test suite green in the commit
run. This one commit opens the gates, swaps the privacy wording in all
ten languages, and activates the wired guards, together.

**3. The deploy.** Deploy main on Render as normal. When it is live, open
the site, switch to Gujarati, upload any letter. You should see: cards in
Gujarati, and the privacy page saying details are masked before AI
processing.

## The first hour

Run:

    node scripts/production/daily-check.js 1

You should see: a line per language that has had sessions, with good and
completed counts. Healthy is `completed` climbing alongside `good` in
every language with traffic, and the word `healthy` at the end.

Do not react to a single `watch:` line. One reader with one bad upload is
weather, not signal.

## The first day, run the check morning and evening

Healthy looks like: `healthy` at the end, `ai_timeout` rare, `completed`
above zero for every language that has more than one good session.

**The two failure signatures that matter:**

1. **Completion drop.** A language line reading
   `*** ALERT: this language completes NOTHING ***`, or the day reading
   `ALERT: good sessions, ZERO completed`. The check exits non-zero and
   the guard shape lines above the alert name the cause, value-free.
2. **Refusal anomaly.** Genuine letters being refused as suspicious:
   readers you trust reporting scam warnings on real council letters, or
   `verification_only` counts far above the handful a day scams should
   be. The why-chips on the Document check panel name which signal fired,
   in the reader's language.

For either: roll back. Investigation happens after readers are safe, from
the value-free columns, not from live traffic.

## The rollback, one line

In `public/i18n/config.js` set `launch: { open: false }`, commit, deploy.
Readers immediately get today's behaviour back: engine cards translated
through the reviewed bank. No migration to undo, no data to fix. The
language column keeps recording either way.
