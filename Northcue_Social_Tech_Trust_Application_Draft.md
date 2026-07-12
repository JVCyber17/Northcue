# Northcue, Social Tech Trust application, working draft

*Working draft prepared 12 July 2026 for the funding round closing 20 July 2026. This is a draft for Jash Vaidya to complete and review. It has not been submitted anywhere. Every product claim in this draft traces to the committed verified documents listed in the appendix. Anything the founder must supply is marked in square brackets.*

---

## Read this first: what the live round actually is

The research against socialtechtrust.org found one funding programme matching the 20 July 2026 deadline, and it is more specific than a general Social Tech Trust grant round. The following facts were verified directly against the official programme page (socialtechtrust.org/ai-and-social-mobility-challenge-prize):

- The open programme is the **AI and Social Mobility Challenge Prize**, delivered by the EY Foundation and Social Tech Trust. Applications open 22 June 2026 and close 20 July 2026.
- **Funding**: 40,000 pounds in total, non dilutive. 10,000 pounds to the winner, 5,000 pounds to the runner up, and 3,125 pounds to each of the eight shortlisted ventures, plus up to 5,000 dollars in Microsoft Azure credits.
- **Assessment criteria**: four criteria, Challenge Fit, Commercial Viability, Scalability, and Impact, with Impact carrying particular weight.
- **Theme**: the programme is specifically focused on outcomes for **young people from lower socio economic backgrounds**, and requires AI or emerging technology at the core of the solution.
- **Stage eligibility**: a working prototype or MVP at pre seed to seed stage, with meaningful customer or business validation.
- **UK requirement**: headquarters or operations in the UK, or a clear commitment and pathway to operating in the UK.

### The legal structure answer you asked for

The verified eligibility wording is: **"A legally registered organisation behind the solution, or a clear pathway to becoming one. We welcome a range of structures, including social enterprises, nonprofits, and companies limited by shares."**

So on the form's own words, you do **not** need to be incorporated at submission. A clear pathway to incorporation is accepted, and a company limited by shares is an explicitly welcomed structure. Northcue Ltd being in progress is consistent with eligibility as written. Two cautions: confirm this wording on the live form when you apply, since pages can change, and be ready to show the pathway concretely, for example a planned incorporation date.

### Two honest fit warnings before you invest time

1. **The theme is young people from lower socio economic backgrounds.** Northcue's verified positioning is neurodivergent adults and carers. There is a genuine bridge, because official letters about housing, money, benefits, and tenancy land on young people at exactly the moment they first face these systems alone, and young carers and care leavers face them earliest and with the least support. But the application must make that bridge explicitly and honestly, and section 1 below drafts it that way. **[YOUR INPUT NEEDED: decide whether you want to angle Northcue toward young people for this prize. If this framing does not feel honest to you, this may be the wrong round, and the draft below can be retargeted at a general Social Tech Trust application or another funder.]**
2. **The exact application form questions could not be retrieved.** The criteria and eligibility above are verified, but the live form's question list was not fully retrievable. This draft is structured around your six requested sections mapped onto their four assessment criteria. **Before submission, open the live form and re map each section onto their actual questions.**

Unverified but reported by secondary sources, check on the live page: the programme is said to run August to October 2026, to require a founder or C suite member to participate, to list six solution areas of which one is accessibility, wellbeing and financial capability, and to expect an impact measurement tool in use.

---

## 1. What the venture does

*Maps to: Challenge Fit, Impact.*

Northcue is a privacy first web app, live at northcue.co.uk, that turns confusing official letters and bills into a small set of calm cue cards: what the document appears to be, what matters, and what to check next. It never gives advice, never invents information that is not in the document, and never stores the document.

The problem it addresses is structural, not individual. Official communication in the UK is written for confident readers. Council tax notices, benefits letters, tenancy notices, and enforcement letters use procedural language that assumes a reader who is calm, fluent, and unafraid. Around one in six UK adults is neurodivergent, so a structural barrier excludes millions of people from understanding the letters that decide their housing, money, and care. The barrier is built into how the state and utilities communicate, and the people it excludes are then blamed for missing deadlines they were never given a fair chance to understand.

For this programme's theme: that barrier lands on young people from lower socio economic backgrounds earlier and harder than on anyone else. A care leaver receives tenancy and benefits letters at eighteen with no family safety net to interpret them. A young carer reads council letters for the person they support while still in education themselves. A first time renter on a low income meets a Section 21 notice with no experience of what it is. These are the moments where one misread letter becomes a missed deadline, a debt escalation, or a lost tenancy, and where the gap between confident readers and everyone else becomes a social mobility gap. **[YOUR INPUT NEEDED: confirm this is the angle you want, and add any direct experience or evidence you have of young users or young carers using Northcue.]**

The technology is AI at the core, used cautiously. A deterministic rules engine reads the document and decides everything that matters: the category, the severity, whether it looks genuine, and whether Northcue should refuse to proceed. An AI language layer is then used only to phrase the result in clearer, gentler language. If the AI is unavailable or fails, the safe rules based result is shown unchanged, so safety never depends on the AI behaving well.

## 2. The problem and who it affects

*Maps to: Challenge Fit, Impact.*

Two people stand behind this product.

The first is a carer, holding a council letter that is not about them. They are reading it for a son, a sister, or an adult they support, and they have to get it right, because the decision lands on someone else's life. They are tired, between phone calls, and the letter reads like it was designed to be misread. Northcue exists to give that person their time back and to make the reading feel calm instead of frightening.

The second is the person the letter is actually about, who deserves to understand what is happening to them, calmly, in their own time. For many neurodivergent adults the moment an official envelope arrives is a freeze moment. The letter goes unopened, the deadline passes, and a manageable situation becomes an unmanageable one. Not because the person could not act, but because the format of the communication asked more of their attention and confidence than it had any right to.

This is a digital inclusion problem, not a clinical one. Northcue does not diagnose, treat, or gatekeep. It removes a barrier from an everyday task the same way a ramp removes a barrier from a doorway. The product's most loved design decision reflects this: focus mode strips the screen to nothing but the document made clear, because if your attention is the thing that struggles, the kindest thing software can do is ask less of it.

Nearly every tool in the market is built for confident people who want to move faster. Northcue is built for the person who feels their chest tighten when the envelope comes through the door, and for the person reading on their behalf.

## 3. What makes the approach different and credible

*Maps to: Challenge Fit, Commercial Viability (credibility), Impact.*

Northcue is not a chatbot and not a generic AI summariser. Five verified design decisions separate it from both.

**A fixed cue card format.** Every document becomes the same small set of calm cards: what it appears to be, what matters, what to check next. No open ended conversation, no rabbit holes, nothing extra to think about.

**A cautious no advice boundary.** Northcue explains, it never instructs. Consequences are attributed to the document rather than asserted, wording is hedged by design with phrases like appears to and check the original document, and in the final audit run not one card across the full test set contained a direct payment command.

**Refusal as a feature.** When a message shows the patterns of a scam, Northcue routes it to a verification only mode with fixed safe cards, and the AI layer is switched off entirely so it can never restate the scam's instructions in friendlier language. When an upload is not an official document at all, Northcue declines politely rather than pretending. An honest system must be willing to stop, and this one is.

**A deterministic safety layer.** Every safety decision, the severity floors, the scam suppression, the payment command stripping, and the refusal paths, is made by a deterministic rules engine that behaves the same way on every run. The AI can only rephrase. A slow or failed AI call reduces fluency, never protection. One example of why this matters: genuinely serious letters, bailiff notices, eviction notices, court claims, are usually written calmly, so a system judging tone alone would under alarm exactly the letters where that is most dangerous. Northcue holds these document types at a serious severity regardless of how gentle their wording is.

**Privacy first architecture with no document storage.** Raw uploads are deleted on every code path, including failures. Extracted text lives only in server memory under a hard time limit before it is cleared. Only anonymous safe metadata is ever written to the database, never document contents. Before the single AI phrasing call, structured identifiers such as phone numbers and National Insurance numbers are redacted, and provider side storage is switched off. The one honest boundary, that a name written in ordinary prose can still reach the AI provider, is disclosed to users in plain language rather than hidden.

**The evidence behind these claims.** The engine was audited three times against the hardest documents we could construct: 39 fictional UK documents including bailiff notices, eviction letters, county court claims, and phishing letters, run through the real live pipeline with the real output captured verbatim. The first audit found real problems. The engine once rated a bailiff enforcement notice as a normal document, and once echoed a phishing letter's own demand back as an instruction. Every finding was fixed in the deterministic core, every fix was verified in the real output, and each change was regression checked across the full document set so that only the intended documents changed. In the final audit all 39 documents processed with zero crashes and no card contained a payment command. The full before and after record is committed to the repository, including the problems, because if you build for people who cannot afford a confident wrong answer, the safety work is not compliance. It is the product.

## 4. Stage and traction

*Maps to: Commercial Viability, Scalability.*

Honest position: Northcue is an early stage, working product.

- **Live product** at northcue.co.uk, a working web app, not a prototype: real document upload, real PDF extraction and OCR, the audited engine described above, and an installable mobile experience.
- **Self funded** to date, with no external investment.
- **Team**: a solo technical founder, Jash Vaidya, who designed, built, tested, and audited the product end to end. **[YOUR INPUT NEEDED: one or two sentences on your own background and why you are the person to build this.]**
- **Legal structure**: incorporation of Northcue Ltd, a company limited by shares, is in progress. The programme's eligibility wording accepts a clear pathway to registration, and companies limited by shares are an explicitly welcomed structure. **[YOUR INPUT NEEDED: planned incorporation date, to show the pathway concretely.]**
- **Stage**: early user feedback. The product collects structured in app feedback with optional contact details. **[YOUR INPUT NEEDED: current user numbers, sessions or documents processed if you have them, any feedback quotes you have permission to use, and any partnership or pilot conversations underway. The eligibility asks for meaningful customer or business validation, so this section carries real weight and cannot stay empty.]**

## 5. How the funding would be used

*Maps to: Scalability, Impact.*

**[YOUR INPUT NEEDED: this whole section needs your numbers and priorities. The categories below are suggested structure only, aligned with the product's committed direction. Note the realistic award sizes: 3,125 pounds if shortlisted, 10,000 pounds for the winner, so scope this honestly for those amounts rather than for a large grant.]**

Suggested structure:

- **Accessibility expansion.** People do not understand information in one way, because brains are not built one way. Voice readout for people who need to hear the letter rather than read it, and language support for people who think in a language other than English. [amount and timeline]
- **User testing with carers and neurodivergent adults.** The audits are a strong engineering baseline, but they are fictional inputs. The honest next step, stated plainly in the committed documents, is testing with real people on their own real, messier documents, including young carers and young adults meeting these letters for the first time. [amount, number of participants, how they would be recruited and compensated]
- **Partnership pilots.** Letters come from somewhere. Councils, housing associations, and charities are the organisations whose letters land hardest, and the long term model is that the sender pays so the person the letter serves never has to. Early pilot conversations with [named councils or charities] would test that route. [amount and target partners]
- **Founder time.** A realistic allocation so the solo founder can dedicate focused time to the above during the programme period. [amount]

## 6. Impact and how we would measure it

*Maps to: Impact, the most heavily weighted criterion.*

The change Northcue exists to make is simple to say. Today, for millions of people, the moment a letter lands is a freeze moment: one more thing to figure out. Northcue wants that moment to become, let's see what this is. That change sounds small. It is the difference between acting on time and freezing for weeks, and for a young person meeting the housing, benefits, and debt systems for the first time, it is the difference between a wobble and a spiral.

Proposed measures, honestly framed:

- **Before and after clarity.** Whether a user understands what their document is, what matters, and what to check next, after reading the cue cards, compared with before. Measured by short in product prompts and structured testing sessions.
- **Letters acted on rather than avoided.** Whether users report opening, reading, and acting on official letters they would previously have set aside. Measured through follow up with consenting users.
- **Time saved for carers.** Whether carers report the reading and deciding taking less time and feeling less frightening. Measured through carer specific feedback sessions.
- **Safety held in the field.** The audited engine guarantees, no advice, no payment commands, scams refused, serious letters never reassured, monitored on real usage rather than only fictional tests.

An honest acknowledgement, and we suggest making it openly in the application: structured impact measurement is what the grant period would establish, not something Northcue can already claim. What exists today is a verified engineering record showing that the product behaves safely and honestly on the hardest documents. What does not exist yet is measured real world outcome data, because the product is at the early user feedback stage. The funding and the programme's support would be used to build exactly that measurement foundation, with the user testing in section 5 as its first structured data. **[YOUR INPUT NEEDED: if you already run any impact or analytics measure you consider meaningful, state it here, since one secondary source suggests the programme expects an impact measurement tool in use. Verify that requirement on the live form.]**

---

## Before you submit, a checklist

1. Open the live application form and re map these sections onto their actual questions. This draft follows their four published criteria, but the form's question wording was not retrievable.
2. Confirm the legal structure wording on the live form, then state your incorporation pathway with a date.
3. Decide on the young people angle in section 1, and make sure you are comfortable it is honest.
4. Fill every square bracket placeholder. The traction and validation placeholders matter most for eligibility.
5. Check the unverified programme details on the live page: programme dates, founder participation requirement, solution areas, and the impact measurement expectation.
6. Keep the tone as it is here: calm, specific, no hype. It matches both the product and the funder.

## Appendix: verified source documents

Every product claim above traces to these documents, all in the Northcue repository history:

- **Why Northcue Exists**, the founder narrative: the carer and the freeze moment, one in six UK adults neurodivergent, focus mode, the never rules, the sender pays direction. The one in six figure carries a source note: estimates range from 15 percent (City and Guilds Neurodiversity Index 2025) to one in seven (Local Government Association).
- **Northcue Security and Privacy Position** (verified against source 3 July 2026): deletion on every path, memory only text with a time limit, anonymous metadata only, structured redaction, provider storage off, the disclosed prose boundary, UK GDPR data minimisation posture.
- **Northcue Engine Safety and Quality** (verified 3 July 2026): the three audit rounds, 39 fictional documents, the scam echo finding and its fix, the bailiff severity finding and the stakes floor, payment command reframing, non document declining, zero crashes and no payment commands in the final run, and the honest limits including that fictional testing is not real user evidence.
- **The Northcue Trust and Severity System** (verified 3 July 2026): two sided safety, the stakes floor, refusal as a feature, deterministic safety, honesty over confidence.
- **The audit reports**: the original output audit, the mid point re run, and the final clean audit (committed as Northcue_Cue_Card_Audit_Final), which is the verbatim evidence base for every engine claim.

Programme facts in this draft were verified against socialtechtrust.org/ai-and-social-mobility-challenge-prize on 12 July 2026 with three way source agreement. Items marked unverified came from secondary sources and must be checked on the live page.
