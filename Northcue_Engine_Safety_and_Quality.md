# Northcue Engine Safety and Quality

*Prepared for investors and institutional partners. Every claim below is drawn from the committed audit reports and the engine source, and was verified against that evidence on 3 July 2026. The examples are real, unedited output captured from the pipeline. Nothing is invented or idealised. This is a rigorous engineering record, not promotional material.*

---

## 1. Summary

Northcue reads a confusing official document and turns it into a few calm cue cards that say what the document appears to be, what matters, and what to check next, without giving advice. The engine was tested by running 39 fictional UK documents through the real live pipeline and capturing the actual output word for word, across three audit rounds. The first round found real problems, including a case where a phishing letter was echoed back as instructions and cases where serious letters were reassured as normal. Every finding was fixed in the rules engine and then verified in the real output, with full set regression scans confirming that only the intended documents changed. In the final round all 39 documents processed with zero crashes, no card issued a payment command, and every fix held in the live output.

---

## 2. How Northcue generates cue cards

Northcue is not a chatbot. It is a structured document understanding pipeline with a clear division of responsibility.

### The rules engine decides everything that matters

A deterministic rules engine reads the extracted text and decides the substance of the result: the document category, the severity level, the trust assessment, the processing mode, the banner, and the structure and safety of the six cue cards. This layer applies the safety behaviour: it detects suspected scams, it floors serious document types to a serious severity, it strips payment commands, it attributes consequences to the document rather than asserting them, and it declines uploads that do not look like official documents.

### The AI provider only phrases

An optional AI step is asked to put the rules based result into clearer, gentler language. It does not decide category, severity, trust, or safety. If the AI step is unavailable, slow, invalid, or gated off, the rules based result is returned unchanged.

### Safety is carried by the rules layer on every path

This is the central design point, and it is precise. The safety filtering runs on every path, not only when the AI succeeds:

- A backstop stripper runs over the rules cards at the very top of the AI step, before any decision to call or skip the AI. So the pay and credential filtering applies whether the AI runs or not.
- The AI step is skipped entirely for low quality input, for suspected scam and verification only documents, for unsupported and non document uploads, and when no provider key is present. On each of these paths the safe rules output is returned.
- On the AI success path, the AI output is separately sanitised and passed through the same stripper before it is shown.

### Determinism versus AI variation

The AI layer is a live model, so its wording varies between runs and which documents fall back to the rules cards changes from run to run. The safety of the system does not depend on the AI completing. Every safety critical behaviour, the severity floors, the scam suppression, the payment command stripping, and the non document declining, is computed by the deterministic rules layer and is present on every path. A slow or failed AI call reduces fluency, never protection. This separation is deliberate and is the reason the safety posture can be stated with confidence even though the phrasing layer is not deterministic.

---

## 3. Testing methodology

The engine was tested by running realistic documents through the real pipeline and reading the actual output, rather than by reasoning about what it should do.

- **The document set.** 39 fictional UK documents, containing no real personal data, spanning the supported types (energy bills, council tax, late payment notices, benefits letters, health and appointment letters, immigration letters, tenancy notices, and HMRC and employment letters), the high risk types (bailiff and enforcement notices, county court claims, letters before action, debt collection, eviction notices, and phishing), and adversarial edge cases (OCR garbled text, a notice cut off mid sentence, two letters merged into one upload, a non document, and near empty input).
- **The pipeline.** Each document was run through the real engine and the real AI phrasing call, and the actual output was captured verbatim, including cases where the output was still thin or imperfect.
- **Three rounds, all committed.** An initial audit that found the issues, a mid point re run after the first wave of fixes, and a final clean audit on the finished engine. All three reports are committed to the repository so the full before and after record is preserved.

---

## 4. Findings and fixes

Each item below states what was wrong, what was changed, and the verified result, with real captured output.

### Scam coaching suppression

The phishing letter was being echoed back as instructions. In the initial audit its second cue card read, verbatim:

> "You must confirm your details within 48 hours to claim the refund."

That repeats the scam's own demand. The fix routes suspected scams into a verification only mode and skips the AI so it cannot restate the scam. In the final output the same document produces safe cards only, verbatim:

> Card 3: "Verify the organisation on its official website."
> Card 6: "Do not use links or numbers in the document until checked."

No card instructs the reader to confirm account details or share their National Insurance number or bank details. The processing mode is verification only and the AI is skipped.

### Stakes based severity floor

A bailiff Notice of Enforcement was rated low severity and shown the green normal banner, verbatim:

> "This looks like a normal document. Check the original if anything is unclear."

The fix adds a stakes based floor that raises genuinely serious document types to a serious severity regardless of how calm their wording is. The same bailiff notice now shows, verbatim:

> "This looks like an important letter that may need action soon. Please read it carefully and check the original document."

Its severity moved from low to urgent. The floor covers bailiff and enforcement notices, eviction and possession notices, county court claims, letters before action, and third party debt collection. A debt collection letter that had been rated low is now high with the sender correctly identified, and an eviction notice that had been low is now high.

### Energy disconnection flooring

An overdue energy final reminder threatening disconnection and a warrant was still rated low with the green banner, because energy disconnection was not in the floored tiers and the keyword for disconnection did not match the document's wording. The fix adds energy disconnection and warrant of entry phrasing to the stakes floor, matched against a whitespace normalised copy so a phrase wrapped across a line break is still caught. The document moved from low severity with the green banner to urgent severity with the careful banner.

### Legal false alarm and the Sycamore Court cause

A routine direct debit confirmation was being categorised as a legal or court letter. The cause was that the addressee's street, "4 Sycamore Court", contained the word court, which matched a bare court needle in the category detection. The fix requires specific multi word court phrases (for example "county court", "claim form", "claimant" together with "defendant") rather than the bare word court, so a street name no longer triggers a legal classification. The direct debit letter is now categorised as an ordinary document, and a genuine credit card letter still classifies as finance, confirming the fix did not over correct.

### County court categorisation and sender

The genuine county court claim was miscategorised as a bank or finance letter, and its sender extracted as the heading "IN THE COUNTY COURT". The deterministic before and after, captured from the rules layer, is:

> Before: category bank or loan, label "Bank or finance letter", sender "IN THE COUNTY COURT".
> After: category legal or court, label "Legal or court letter", sender "County Court Business Centre".

Its severity stayed high with the careful banner throughout, so the safety signal was correct before and after. The fix corrected the classification and stopped the court heading being read as a sender.

### Payment command reframing

A late payment notice contained a direct instruction to pay. Its consequence card read, verbatim:

> "You must pay immediately to avoid your account being passed to a debt collection agency."

Giving an instruction to pay crosses from explaining into advising. The fix reframes payment commands into attributed, hedged statements. The same card now reads, verbatim:

> "The document says your account may be passed to a debt collection agency if a payment is not made. Check the original document."

Across all 39 documents in the final run, no card contains a direct payment command.

### Fallback quality improvements

When the AI does not run, the deterministic cards were labelling several documents "Unknown document" and listing the letter's own header date as a mystery deadline. The fix uses honest labels drawn from what the engine already knows, cleans up date presentation, and leads with the detected type and sender. The count of documents labelled "Unknown document" fell from four to one, and the one that remains is the phishing letter, where a plain label is acceptable.

### Conservative non document declining

A pizza menu was being processed as if it were an official document. Its first cue card read, verbatim:

> "This is a menu for Luigi's Wood Fired Pizza with prices listed."

with a later card advising the reader to decide what to order. The fix adds a conservative non document detector that declines an upload only when the text is readable good quality, matched no category, and carries none of the markers a real letter has (a recognised sender, a reference, a formal date, or official phrasing). The same menu now produces, verbatim:

> Card 1: "This does not look like an official letter or bill."
> Card 6: "Northcue is made for official letters and bills, so it has not turned this into cue cards. If it is one, a clearer photo or a different page may help."

The AI is skipped for this path. Across the whole set, exactly one document is declined, the menu, and zero genuine documents are wrongly declined.

---

## 5. The two sided safety principle

Every fix was designed and verified against a single principle stated in both directions.

**Never under alarm a serious document. Never over alarm a routine one.** A wrongly reassured serious letter could leave a vulnerable person unaware of a real deadline. A wrongly alarmed routine letter could frighten someone who had nothing to worry about. Both are failures, so every change was checked in both directions rather than only for the case it was meant to fix.

The verification method was a full set regression scan for each fix: the change was applied, and the output of all 39 documents was compared against the pre change output, so that only the intended documents were allowed to move.

- The energy disconnection fix was confirmed to change only the disconnection letter, with every other document byte identical.
- The county court fix was confirmed to change only the county court claim. A genuine credit card letter stayed classified as finance, and the direct debit letter whose addressee lives at Sycamore Court was unchanged, confirming the legal detection did not sweep in ordinary documents.
- The non document fix was confirmed to change only the menu. The garbled, blank, and vague but genuine uploads kept their own handling and were not declined.

In each case the scan showed exactly one document changing, which is the evidence that the fix caught its target without disturbing anything else.

---

## 6. Current verified state

From the final clean audit, run through the real live pipeline:

- **39 of 39 documents processed. Zero crashes.**
- On that run the AI completed on 25 documents, fell back to the rules cards on 9, and was deliberately skipped on 5 (low quality, scam, and non document). The completed and fallback split varies between runs; the safety behaviour does not.
- **No card in any of the 39 documents contained a payment command.**
- Every fix listed in section 4 was confirmed present in the live output: the scam is in verification only mode with safe cards, the serious documents carry careful banners, the county court claim is a legal letter with the correct sender, the fallback labels are honest, and the menu is declined.

---

## 7. Honest remaining limits

These are stated plainly and ranked. None of them produces unsafe output.

1. **Fallback cards are thinner than AI cards.** On the documents where the AI does not run (9 of 39 on the final run), the deterministic cards are safe but less fluent, and cannot compute relative deadlines or phrase as naturally. This affects clarity, not safety, and the same document reads more richly when the AI completes.
2. **Garbled text flooring limit.** A heavily OCR garbled disconnection line whose words run together is not caught by the clean disconnection phrases, so it is not floored to urgent. This is a deliberate, accepted limit, because matching broken text risks false positives on clean text. Such input is already flagged for review and a clearer upload is requested.
3. **Multi document uploads are not flagged.** Two letters merged into one upload are handled by explaining the primary letter and mentioning the second, but the system does not tell the user that two documents were detected, so the second could be under served.
4. **Minor label quirks.** The floored bailiff notice keeps a council tax label because of its category, and the phishing letter carries the plain "Unknown document" label rather than a clearer "Possible scam" label. Both remain safe because the severity and banner are correct.
5. **A fallback wording inconsistency.** On urgent documents where the AI falls back, a secondary card can still read "This looks like a normal formal letter" even though the banner is urgent. This is inconsistent wording on one card, not a safety issue.
6. **AI variation.** The phrasing layer is a live model whose output varies between runs. Safety is deterministic in the rules layer, so this affects fluency and which documents fall back, never protection.

**Explicit limit of this testing.** All of the above is based on the engine's real output on 39 fictional inputs. It is not a substitute for testing with real people on real documents. Whether an anxious, neurodivergent, low confidence, or non native English reader actually feels calmer, understands the card, and takes a safe next step can only be learned by observing real users, ideally including people in genuine distress handling their own letters. Real uploads are also messier than these tidy fictional ones, so the OCR and quality paths should be validated on real scans. The findings here are a strong, honest engineering baseline, not evidence of real world outcomes.

---

## 8. Closing statement

Northcue's engine was tested by reading its real output on a broad set of documents, the problems that testing found were fixed at the deterministic core rather than papered over in the phrasing, and each fix was verified in both directions so that serious documents are not reassured and routine documents are not alarmed. In the final audit every document processed without crashing, no card issued a payment command, and every fix held in the live output. The safety of the system rests on the rules layer, which runs on every path, so the result does not depend on the AI phrasing step completing. The remaining limits are matters of clarity and edge case handling, stated openly above, and the honest boundary is that this evidence comes from fictional inputs and must be complemented by testing with real users. This is the verified safety and quality position of the current engine.
