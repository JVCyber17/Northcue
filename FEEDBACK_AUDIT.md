# Feedback capture audit

Walked the whole path: the buttons that open it, the two step flow, the browser
payload, the server route, the sanitiser, and the live table. Where I could
test something rather than read it, I tested it.

## The short version

The feedback flow itself is in good shape. It is calm, it is genuinely opt in,
it saves reliably, and the optional email works end to end. Three things were
wrong, and one of them was quietly poisoning the evidence you are about to
start collecting.

1. **Feedback given before any upload was being filed against a fake document.**
2. **The get in touch form threw everything away and said someone would be in touch.**
3. **The reply address column exists in the live database but in no migration file.**

All three are fixed. Nothing about what you ask has changed.

---

## Where the ask appears and what people see

Every entry point is a button the reader chooses to press. **Nothing pops up,
nothing interrupts, nothing appears on a timer.** An anxious person can use
Northcue start to finish and never be asked anything.

There are five ways in, all leading to the same modal:

| Where | What it looks like |
|---|---|
| Home page, connect tile | A quiet card, "Give feedback" |
| Home page, second tile | Same |
| Home page, quiet row | A low emphasis row |
| End of the cue cards | A text link, "Was this helpful?" |
| Help page | A card, now "Tell us how Northcue worked for you" |

The flow is two steps. Step one asks "Was this helpful?" with three large
choice cards: Yes, A little, No. Step two adapts to that answer and offers five
reason chips, an optional note, an optional email, and a send button.

**On nagging: there is none, and there is nothing to suppress.** Your
requirement that a user who ignores it is never asked again in that session is
already met, because the ask is never made unprompted in the first place. I
checked specifically for a dormant auto prompt and found one, `#card-feedback-panel`,
which is only ever hidden and never shown. It is dead markup, not a live nag. I
have left it alone rather than delete it, and flagged it below.

The one place the tone leaned slightly was the Help page, which promised "leave
your details and we'll reach out". That promise could not be kept, so it is gone.

## What gets stored, field by field

Table `feedback_events`. Ten real rows existed before this audit.

| Field | What it holds | Status |
|---|---|---|
| `rating` | yes, little or no | Always populated |
| `reasons` | The chips they tapped, up to 8 | 9 of 10 rows |
| `note` | Free text, 500 char cap, **redacted server side** | Optional |
| `has_comment`, `comment_length` | Derived from the note | Always |
| `contact_requested` | Whether they ticked the reply box | Always |
| `contact_email` | Reply address, **stored intact by design** | Never yet used |
| `page`, `section` | Where they were | Always |
| `anonymous_session_id` | Cookie level session | Always |
| `document_category` | What the document appeared to be | **Was being faked, now fixed** |
| `trust_assessment` | high / medium / low / unknown | **Was being faked, now fixed** |
| `severity_level` | low / medium / high / urgent | **Was being faked, now fixed** |
| `document_session_id` | Link to the actual document | **Never populated, 0 of 10** |

The redaction on `note` is good and I tested it: emails, phone numbers,
postcodes, card length digit runs, sort codes, NI numbers and pound amounts are
all replaced before storage. The reply address deliberately bypasses that,
because a redacted address cannot be replied to. That is the right call.

## Is the email opt in working, visible and clearly optional

Yes, on all three counts, and it is the best built part of the flow.

It is off by default behind an unticked box reading "I'm happy for Northcue to
contact me about this". Ticking it reveals the field and moves focus there. The
field is labelled "Email", marked "(optional), only if you'd like a reply", and
carries the note "We'll only use this to reply to your feedback." Leaving it
blank still sends the feedback. A typo produces a gentle message rather than a
block.

I tested the whole path end to end, because **not one of the ten existing rows
had ever used it**. It works: a submission with an address returned 201 and the
address landed intact in `contact_email`.

That test left one row in your table, marked `page: feedback_audit`,
`section: audit_email_path`. I did not delete it, because deleting from your
production data is your call, not mine. Worth knowing: five of the ten
pre existing rows are also smoke tests from earlier sessions, so filter on
`page` before you read anything as real user signal.

## Are people warned not to paste private details

Partly, and this is the one gap I did not close because closing it means adding
a visible element.

Step one carries a visible line: "Your feedback is private and helps us
improve." Step two, which is where the text box actually is, carries the real
warning only inside the placeholder: "A short note is enough. Please do not
include personal details such as your name, address, or account numbers."

**A placeholder disappears the moment someone starts typing.** The warning is
gone exactly when it is needed. The server side redaction is a genuine safety
net, so this is not a data leak, but the reader is not being clearly told. See
decision 2.

---

## What I changed

### 1. Stopped feedback being filed against a document that never existed

This is the important one.

Before any upload, `latestResult` holds the built in demo result used to render
the example card. That demo carries `document_category: "bill_or_payment"`,
`trust_assessment: "medium"` and `severity_level: "medium"`. The feedback
payload read those fields unconditionally.

So feedback given from the home page or the help page, by someone who had never
uploaded anything, was stored as if they had just read a medium severity bill.
I confirmed this by intercepting the real request, not by reading the code:

```
page: "home", document_category: "bill_or_payment",
trust_level: "medium", severity_level: "medium"
```

Four of your ten existing rows came from the home or help pages, so some of
your current data almost certainly says this.

Document metadata is now attached only when a real analysis has happened.
Verified both directions in the browser: no upload sends no document fields at
all, and a real analysis still sends the true values.

### 2. Hid the get in touch route, which was discarding everything

The form asked for an email or phone number and a note, then ran this:

```js
// TODO: Backend, POST contact request to a new server endpoint
```
(quoted from `app.js`, lightly reformatted)

There is no endpoint, no `contact_requests` table, and no mailbox anywhere in
the product. I checked all three. It then showed: **"We've noted your request.
Someone from Northcue will be in touch."**

Nothing was noted. Nobody was going to be in touch. The people most likely to
press that button are the ones least able to afford waiting for help that is
not coming, and your users arrive shortly.

The route is now hidden behind one flag, `CONTACT_REQUEST_ENABLED = false`. All
the code behind it is untouched, so switching it back on is a one line change
once it has somewhere to send. The Help page copy that promised a reply has
been reworded to describe feedback, which is what actually happens.

### 3. Wrote the missing migration for `contact_email`

The column exists in the live database. It exists in no migration file. Anyone
rebuilding the schema from `supabase/*.sql` would get a table without it, and
then **every feedback carrying an email would fail its insert and be lost, note
and rating included**. Added `supabase/phase7_feedback_contact_email.sql`, safe
to run against live as a no op.

### 4. Stopped writing the reply address to the device

On a network failure, feedback falls back to `localStorage`, and that record
included the email address. Nothing ever reads that store back, so the address
was sitting on what may be a shared family device, indefinitely, for no purpose.
The address is no longer written there. The rest of the fallback is unchanged.

### 5. Touch targets

- "Change", the control for correcting a mis-tap, was 61x22. Now 44 high.
- The modal close button was 42 high. Now 44.

Contrast I measured rather than assumed: every text element in the flow passes
AA comfortably in both themes, the lowest being 6.12 against a 4.5 requirement.
Nothing needed changing.

### Copy

Only the Help page card changed, because it made a promise the product could
not keep. No dashes anywhere. I read the rest of the feedback copy for pressure
and found none worth changing: "This will only take a few seconds" is
reassurance rather than a push, and every field is marked optional.

---

## Does this measure clarity, confidence and reduced overwhelm

**Not reliably, no.** Today you can measure one thing: a three point
helpfulness rating. That is a decent proxy for overall value and nothing more.

The reason chips get closer than you might expect, but they cannot carry the
claim:

- Clarity has partial cover: "Simple words", "Clear next step", "Easy to read"
- Overwhelm has exactly one chip, "Less overwhelming", and only on the Yes branch
- Confidence has nothing anywhere

The deeper problem is that chips are optional and multi select, so they give you
"of the people who tapped something" and never a rate across everyone who
answered. You cannot say "68% found it clearer" from this data. You can only say
"of those who elaborated, this many mentioned clarity". That will not carry a
business plan, and one of your three commitments, confidence, is not represented
at all.

Both options below are yours to approve, since they change what is asked.

**Option A, recommended. One optional question, one extra tap.** After the
reason chips in step two, add a single row of three choices:

> **How do you feel about this letter now?**
> More able to deal with it · About the same · Still unsure

This gives you a per respondent confidence measure, which nothing currently
captures. Paired with the existing rating it produces two of your three
commitments as real rates. Overwhelm stays inferred from the chips. It reuses
the chip component exactly, so it is a small build and adds no visual weight.

**Option B, zero extra taps.** Leave the flow alone and re cut the five chips
on each branch so each one carries exactly one clarity chip, one confidence chip
and one overwhelm chip, plus two free. You would then get all three dimensions
with no change in effort for the reader. The catch is that it stays opt in and
multi select, so you still get proportions of those who elaborated rather than
clean rates.

My recommendation is A. It is the only version that gives you a number you can
put in front of a funder for confidence, and it costs one optional tap. If you
want, A and B combine well.

---

## Needs your decision

**1. The get in touch route.** It is hidden, not deleted. To bring it back it
needs somewhere to send. Cleanest version is a `contact_requests` table and a
`POST /api/contact-request` route, kept separate from feedback because the
retention rules differ. Note the field asks for "email or phone number" but the
only storage that exists is `contact_email`, and the note sanitiser strips phone
numbers, so a phone number would be lost. That needs deciding before it goes
back on, which is why I did not just wire it up.

**2. The privacy warning on the note box.** Currently placeholder only, so it
vanishes as the reader types. I recommend moving it to a visible line under the
box, reusing the existing `.feedback-private-note` component already used in
step one. It is a new visible element, so it is yours to approve.

**3. `document_session_id` is never populated, 0 of 10 rows.** You cannot join
feedback to the document that produced it, so you cannot ask whether people
found urgent letters clearer than routine ones. `anonymous_session_id` gives a
weaker link. Fixing it means returning the session id to the client and sending
it back, which touches the upload response, so I left it alone.

**4. Dead code.** `.short-feedback-panel` and `.feedback-rating-btn` are
referenced in `app.js` but exist in no markup, and `#card-feedback-panel` is
only ever hidden. All three are unreachable. I have not deleted them, per the
project rule about being certain first. Happy to remove on your word.

**5. The local fallback is never read.** When saving fails, feedback goes to
`localStorage` and stays there forever. Nothing sends it on, so that feedback is
lost regardless, while raw un redacted note text sits on the device. I removed
the email from it. I would remove the whole store, but that is a judgement call
about whether you would rather build a retry.

## Checks

- 204 tests pass, including 6 new ones in `tests/feedbackEvidence.test.js`
  guarding the fabricated metadata bug, the address never reaching local
  storage, and the contact route staying off until it persists somewhere.
- Verified at 375px in light, dark and focus. No overflow, modal fits at 327px,
  no control under 44px except the checkbox input itself, whose wrapping label
  gives a 259x52 target.
- Contrast measured in both themes, all passing AA.
- The hero, the engine and the upload flow were not touched.
