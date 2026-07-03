# Northcue Security and Privacy Position

*Prepared for investors and institutional partners. Every statement below is written from the current Northcue codebase and verified against the source on 3 July 2026. This document describes what the code does today. It is not marketing material, and it does not claim outcomes that the code cannot support.*

---

## 1. Summary

Northcue is a privacy by design service that turns a confusing official document into a few calm cue cards, and it is built so that the document itself does not need to be kept. Raw uploads are deleted immediately after processing on every path, and the extracted text lives only in server memory under a short time limit before it is cleared. Only anonymous, safe metadata is written to the database, never the contents of a document. To phrase the cue cards clearly, the text is sent once to an AI provider with structured identifiers redacted first and with provider side storage switched off, though a name or postal address written in ordinary prose can still be included, which the product discloses to the user. The posture is consistent with the UK GDPR principles of data minimisation and storage limitation, and the honest boundaries of that posture are stated plainly in section 6.

---

## 2. Architecture: privacy by design

Northcue is a small Node.js service with a vanilla browser front end and no build step. The design goal is that a document passes through the system, is turned into cue cards, and is then gone.

### No document storage

The service does not keep raw uploaded documents or raw extracted text as durable state. What is written to disk after analysis is a safe metadata summary only, produced by a dedicated function that copies a fixed list of non sensitive fields (job identifier, timestamps, trust and severity levels, banner type, counts, and AI processing metadata) and nothing derived from the document body.

### Deletion on every exit path

When a file is uploaded, it is written to a private storage folder that is not served to the web, then the entire processing flow runs inside a try and finally block. The deletion of the uploaded file is placed in the finally clause, so the file is removed whether processing succeeds, returns early, or throws. A recurring background sweeper runs during uptime as a backstop, removing any straggler file that a crash might have left behind, and a cleanup also runs at startup. The sweeper timer is unreferenced, so it never holds the process open on its own.

### Extracted text held in memory only, with a time limit and active sweeping

Between the upload step and the analyse step, the extracted text is held in an in memory map, not on disk and not in the database. Each entry carries a creation time. A hard time to live (fifteen minutes by default, configurable) bounds how long that text may sit in memory, and an active background sweep (every sixty seconds by default) evicts expired entries even when no further requests arrive, so an abandoned upload does not linger. After the analyse step uses the text, the entry is deleted explicitly. The sweep timer is unreferenced and stops itself once the store is empty.

### Anonymous metadata only

The only persistent record of activity is anonymous metadata. There is an anonymous session identifier generated on the server, and safe processing metadata such as document category, input quality, and AI status. No addressee name, no document text, and no card content is stored.

### Exact data flow, from upload to deletion

1. The browser sends a document to the upload endpoint. The server enforces a file type allow list, a fifteen megabyte size limit, a page limit for PDFs, and a per browser rate limit.
2. The server writes the file to the private uploads folder under a random job identifier.
3. Text is extracted (direct text for a PDF, or OCR for an image). The uploaded file is deleted in the finally clause of this step, so it does not survive past processing.
4. The extracted text is placed in the in memory store under the job identifier, subject to the time limit and sweep described above.
5. On the analyse step, the server reads the text from memory, runs the rules engine, optionally calls the AI phrasing layer, writes the safe metadata summary to disk and to the database, and then deletes the in memory text entry.
6. What remains afterward is the anonymous metadata record. The document and its text are gone.

A production safety assertion refuses to start the server if a local debugging flag that would retain raw uploads is set while the environment is production, so that retention cannot be enabled by accident in production.

---

## 3. Data handling with the AI provider

The AI layer is an optional phrasing step. The rules engine decides what each cue card should contain and carries every safety behaviour on its own. The AI provider is asked only to put the result into clearer, gentler language. If the AI call is unavailable, slow, invalid, or gated off, the rules based result is returned unchanged.

### What is sent

When the AI step runs, the extracted document text is sent once to the OpenAI Responses API, together with a system prompt and the rules based draft. The outbound text is capped (eight thousand characters by default, reduced from a higher earlier value specifically for privacy).

### Structured redaction before sending

Before the text is sent, a redaction pass replaces structured identifiers with placeholder tokens: email addresses, telephone numbers, National Insurance numbers, long card style digit sequences, and other long digit runs. These are removed from the text that leaves the server.

### What is not retained by the provider

The request sets the provider side storage flag to off, so the request and response are not retained as stored provider application state. The product discloses to the user that the text is used only to make the cards, is processed securely, is not used to train AI, and is not stored. The storage off setting is enforced in our request; the training and retention behaviour beyond that setting rests on the provider's API data policy rather than on our code.

### The honest boundary

The redaction is structured, not total. A person's name or postal address written in ordinary prose, rather than as a structured identifier, can still be present in the text that reaches the provider. The product states this to the user in plain language on the privacy page (the document is read by an AI provider to help phrase the cards). We do not claim that the document is fully private or that nothing personal ever reaches the provider. We claim that structured identifiers are redacted, that provider storage is switched off, and that the boundary is disclosed.

---

## 4. Database security

### Three tables, safe metadata only

The service writes to exactly three tables: document_sessions, feedback_events, and analytics_events. Every write path was reviewed field by field. The rows contain enumerated metadata (trust and severity levels, processing mode, input quality, counts, MIME type, sizes, timings, status values, error codes, and timestamps), an anonymous session identifier, and, for feedback, a user supplied rating and optional note. No document text and no card content is written to any table.

### Row level security posture

Row level security is enabled on all three tables in the schema migration, and no anon or authenticated access policies are defined. With row level security enabled and no permissive policies, the tables are not readable or writable by the browser facing publishable key. All access is performed on the server using the service role key, which operates above row level security by design. The migration records this intent explicitly: the tables are for backend writes with the service role key only.

### Server only access

The Supabase client is constructed on the server. The constructor throws if it detects a browser context, and it disables session persistence and token auto refresh. The browser never receives the service role key, and a scan of the front end found no Supabase secret material in any public asset.

### Key management

The service reads its credentials from environment variables. The current values are the rotated key formats: the OpenAI key uses the project key format, the Supabase publishable key uses the current publishable format, and the Supabase secret key uses the current secret format. These two Supabase values are held under the established variable names (the publishable value under the anon key variable and the secret value under the service role variable), which the code reads consistently. No key material is hardcoded anywhere in the tracked codebase, and no Supabase secret appears in front end code. The real environment file is git ignored and has never appeared in version history; only an example file containing placeholders is tracked.

---

## 5. Verification record

The following checks were performed directly against this codebase and are stated as verified on 3 July 2026.

- **Key presence and format.** Confirmed the four credentials are present with the expected prefixes (project key format for OpenAI, publishable and secret formats for the two Supabase keys, and a valid Supabase project URL), by reading the environment locally without printing any value.
- **No hardcoded secrets.** Searched the tracked codebase for the key prefixes and legacy token shapes and found no key material in any tracked file other than the placeholder example.
- **No secrets in the front end.** Scanned the public assets for service role or secret usage and found none.
- **Version history.** Confirmed the real environment file is git ignored, is not tracked, and appears in zero commits; only the placeholder example file is in history.
- **Deletion on every path.** Read the upload route and confirmed the uploaded file deletion sits in a finally clause covering success, early return, and thrown error, backed by a startup cleanup and a recurring sweeper.
- **Memory only text with time limit.** Read the in memory store and confirmed the time to live, the active sweep, the unreferenced self stopping timer, and the explicit deletion after use.
- **Database writes.** Read all three write paths and confirmed only enumerated safe metadata is written, with no document text or card content, and that feedback notes are redacted before storage.
- **Row level security.** Read the schema migration and confirmed row level security is enabled on all three tables with no anon or authenticated policies, and that access is server side through the service role key.
- **Logging.** Reviewed every logging call site and confirmed that logs carry only codes, statuses, and configuration error messages, not document text, personal details, or key values, and that the AI debug logger is gated off by default.
- **AI safety and privacy path.** Confirmed the outbound text is redacted and capped, the provider storage flag is set to off, and the AI phrasing layer is skipped for low quality, suspected scam, verification only, and non document uploads, with a safety stripper running on every path.

These checks concern the code in this repository. They are described further, with real output evidence, in the committed audit reports (the original output audit, the mid point re run, and the final clean audit).

---

## 6. Honest limitations and pending items

We state these plainly so that partners can assess the posture accurately.

- **Prose redaction boundary.** Redaction before the AI call removes structured identifiers, not free prose. A name or postal address written as ordinary text can reach the AI provider. This is disclosed to the user in the product. It is a real boundary, not a claim of full privacy.
- **Training and retention beyond our control.** Our request sets provider storage to off. The wider assurance that the text is not used to train models rests on the provider's API data policy, which is external to our code.
- **Free text feedback.** The optional feedback note is user supplied. It is passed through a redaction step that removes phone numbers, postcodes, National Insurance numbers, sort codes, long numbers, and money amounts before storage, but heuristic redaction of free text cannot guarantee that every possible personal detail is removed. Users are not asked to include personal information.
- **Deploy day tasks.** The production host must supply the environment variables through its own secret management rather than from any committed file. The environment must be marked as production so the retention safety assertion is active, and the host must not set the local retention debugging flag. These are operational steps for deployment, not properties of the code.
- **Database protection depends on project configuration.** The row level security posture is set in the migration, but the live protection also depends on Supabase project settings and on the service role key remaining server side. Those settings live outside this repository and should be confirmed in the live project.
- **Scope of this review.** This is a code level and configuration level review. It is not a live penetration test, a third party dependency audit, or a verification of the deployed hosting environment. The audit reports assess output safety on fictional test documents and are not a substitute for testing with real users on real documents.

---

## 7. Closing statement of posture

Northcue is built so that a person can get help understanding an official document without that document being retained. Raw uploads are deleted on every path, extracted text lives briefly in memory and is then cleared, and only anonymous metadata persists. The text is shared once with an AI provider for phrasing, with structured identifiers redacted and provider storage switched off, and the remaining boundary, that prose can carry a name or address, is disclosed to the user rather than hidden. Database access is server side only, credentials are held in the current rotated formats and are absent from both the front end and version history, and the design follows the UK GDPR principles of data minimisation and storage limitation. The limitations above are stated openly. This is the honest, verified security and privacy position of the current system.
