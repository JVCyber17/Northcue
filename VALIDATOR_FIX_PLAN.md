# Validator fix plan: the AI rejecting its own engine-injected warning

Status: **inspected, proposed, NOT approved. Deferred, not rejected.**

Deferral reasoning recorded at the time: the sanitizer fills missing AI fields
from the engine's own output, so every engine defect propagates into the AI
result. Turning the AI back on before the engine is correct would inherit the
wrong amounts and the wrong helpful note. The engine is also the permanent floor
for all nine translated languages and for every AI failure, so it gets fixed
first.

This file is the inspection report exactly as produced, saved so the analysis
survives between sessions. Nothing in it has been implemented.

## The defect

`buildStructuredCardWarning` attaches "This looks important. Do not ignore it."
to every urgent document. `sanitizeCard` copies that warning into the AI
candidate. `validateNoUnsafeAdvice` stringifies the whole candidate and rejects
it for containing "ignore it". Result: on every urgent document, the AI result
is discarded deterministically. This is why enforcement and bailiff letters fail
hardest in English.

## 1. Where the warning is attached

`buildStructuredCardWarning` in [clearStepsEngine.js:795](src/services/clearStepsEngine.js),
called from `buildStructuredCards` at line 749 for every card:

```js
if (trust.severity_level === "urgent") {
  return "This looks important. Do not ignore it.";   // line 809
}
```

Every card on an urgent document carries that string. There is no other engine
string anywhere that trips any unsafe-advice pattern (proven below).

## 2. Where the sanitizer copies it

[validateStructuredResult.js:225](src/utils/validateStructuredResult.js), inside
`sanitizeCards`:

```js
warning: cleanNullableText(candidate.warning ?? fallback.warning, 180),
```

The `??` means: when the AI omits `warning`, the **engine's own** string is
written into the AI candidate. Top-level `warnings` does the same at line 99
(`candidate.warnings || fallback.warnings`).

**The AI is never asked for these fields.** The strings `warning` and `warnings`
do not appear anywhere in `aiStructuredResultService.js`, including the prompt
builders. They are engine-owned safety furniture, so in practice they are
*always* engine-injected. `stripAiViolations` (line 445) also skips them: it only
cleans `simple_explanation`, `action_needed`, `read_aloud_text` and `key_points`.

## 3. What the validator stringifies

[validateStructuredResult.js:179](src/utils/validateStructuredResult.js):

```js
function validateNoUnsafeAdvice(candidate, errors) {
  const text = JSON.stringify(candidate);          // the ENTIRE object
  UNSAFE_ADVICE_PATTERNS.forEach((pattern) => {
    if (pattern.test(text)) errors.push(`unsafe advice matched ${pattern}`);
  });
}
```

It scans the whole merged object as one blob, with no notion of which field a
match came from or who wrote it. The failing pattern is
`/(?<!if i )(?<!if you )\bignore it\b/i` (line 47). Its lookbehinds were written
to exempt the card 5 title "What could happen if I ignore it?", and they do. They
do not exempt "Do **not** ignore it."

There is a second-order consequence worth naming: `sanitizeStructuredResult`
validates its own output at line 108 and returns `fallback` when invalid. On an
urgent document that first validation already fails, so the AI's content is
discarded **before it is ever judged**, and the error the service reports comes
from the fallback's warning. The AI's actual output may have been perfectly safe.
We never find out.

## 4. Every field the validator inspects, and its provenance

`validateNoUnsafeAdvice` inspects all of these, because it stringifies
everything:

| Field | Provenance | Free text? |
| --- | --- | --- |
| `schema_version` | Engine, hard-coded (line 85) | No |
| `session_id`, `anonymous_session_id` | Engine, from fallback (86 to 87) | No |
| `document_type`, `document_type_confidence`, `overall_confidence`, `risk_level`, `processing_mode` | AI-influenced but **enum-constrained** via `pickAllowed` | No |
| `needs_user_check` | AI-influenced, boolean | No |
| `document_type_label` | **AI or engine fallback** (89) | Yes |
| `summary.one_line_summary`, `.main_action`, `.main_date`, `.main_amount` | **AI or engine fallback** (196 to 199) | Yes |
| `cards[].card_id`, `.card_number` | Engine, hard-coded (215 to 216) | No |
| `cards[].card_type`, `.confidence_level`, `.status` | Enum-constrained | No |
| `cards[].title`, `.simple_explanation`, `.key_points`, `.action_needed`, `.possible_deadline`, `.possible_payment`, `.read_aloud_text` | **AI or engine fallback** | Yes |
| `cards[].warning` | **Engine-owned. Never requested from the AI, never stripped** (225) | Yes |
| `warnings[]` | **Engine-owned. Never requested from the AI** (99) | Yes |
| `privacy.*` | Engine, hard-coded false (100 to 105) | No |

## 5. Proof that this is deterministic and confined to one field

The engine's own rules output was run through the very validator that gates the
AI result, on four documents (read-only probe, no edits):

| Document | Severity | Engine output passes its own validator | Fields matching `ignore it` |
| --- | --- | --- | --- |
| Bailiff enforcement notice | urgent | **false** | `cards[0,1,2,4,5].warning` only |
| Notice seeking possession (eviction) | urgent | **false** | `cards[0..5].warning` only |
| Court fine and collection order | urgent | **false** | `cards[0..5].warning` only |
| Energy bill | low | true | none |

Three of three urgent documents fail; the non-urgent one passes. In every case
the validator returned **exactly one error**, and `card.warning` was the **only**
field carrying a match. So: the whole urgent class is affected, no other engine
string is implicated, and no other unsafe-advice pattern is involved.

## 6. Proposed fix, narrowest form

**Scope the unsafe-advice scan to AI-authored content, by provenance rather than
by field name.** Pass the fallback into `validateNoUnsafeAdvice` and skip any
string whose value at the same path is identical to the engine's own value for
that path; scan everything else exactly as today.

```
validateNoUnsafeAdvice(candidate, errors, fallback)
  walk candidate; for each string at path P:
    if fallback has an identical string at P  -> engine-injected, skip
    else                                      -> scan with all patterns
```

The fallback is already in scope at both call sites (line 108 and
`aiStructuredResultService.js:123`), so no signature change ripples outward.

**Why this does not weaken the protection.** The rule only ever skips a string
that is byte-identical to what the rules engine itself produced for that exact
field. Those strings are engine constants that already ship to readers on every
non-AI path, so they are trusted by construction; scanning them protects nobody
and is precisely what causes the self-rejection. Every AI deviation, in any field
including `warning`, is still scanned by all ten patterns. If the AI writes its
own warning, that warning differs from the fallback and is scanned. If a future
prompt starts requesting `warnings`, they are scanned automatically, with no
further change. Coverage of AI-authored text is unchanged; only engine-copy is
exempt.

**Alternative considered and not recommended:** deleting `card.warning` and
`warnings` from the scanned copy. Fewer lines, but it hard-codes an assumption
that those two fields are always engine-owned. The moment the prompt changes,
that becomes a silent hole. The provenance rule has no such failure mode.

## 7. Verification plan once approved

- **Protection intact:** unit cases where AI-authored fields carry "you should
  pay", "pay now", "make a payment", "click the link", "call this number",
  "reply to the sender", "this document is genuine", "definitely genuine",
  "guaranteed safe", and a genuinely dismissive "just ignore it" or "you can
  ignore it". All must still fail validation. Plus a case where the AI authors
  its *own* warning containing unsafe advice, which must fail.
- **Urgent class completes:** before and after on the bailiff, the eviction
  notice and the court fine, showing `ai_status` moving from
  `fallback`/`invalid_structured_result` to `completed`.
- **Regression:** the full document corpus re-run, confirming non-urgent
  documents are byte-identical and only the urgent ones changed.
- **New guard test:** fails if engine-injected fields ever re-enter the
  validator's scope, that is, it asserts an urgent document's engine output
  validates cleanly against itself, which is exactly the condition that is false
  today.
- Full suite green.

Scope stays exactly this: `validateNoUnsafeAdvice` and its two call sites, plus
tests. No template work, no money selectors, no vocabulary changes.

## Sequencing note added on deferral

The engine regression baseline (`scripts/engine-baseline/`) is built first, so
that when this fix is approved the "only the intended documents changed" claim
can be proved line by line rather than asserted.
