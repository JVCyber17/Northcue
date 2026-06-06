# Northcue MVP

Northcue is a neurodiversity-first document simplifier. It accepts one readable document, extracts text, and returns six calm cue cards.

## Run Locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Test

```bash
npm test
```

## Required Environment Variables

Copy `.env.example` to `.env` for local development.

- `PORT`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `CLEARSTEPS_AI_TIMEOUT_MS`
- `CLEARSTEPS_AI_DEBUG`
- `RATE_LIMIT_WINDOW_MS`
- `TEMP_FILE_RETENTION_MS`

Keep `.env` private. Never place `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY` in `public/` browser files.

## API Routes

- `POST /api/simplify`
- `POST /api/upload`
- `POST /api/feedback`
- `POST /api/analytics`
- `GET /health`

The Supabase service role key is used only by backend code.

## Private MVP Deployment Recommendation

Use persistent Node hosting for private MVP testing.

Northcue currently runs as a plain Node HTTP server with local Tesseract OCR, temporary private uploads, an in-memory upload-to-analyse handoff, local rate limiting, and local safe result files. That shape is much better suited to a long-running Node process than serverless functions.

Vercel serverless is risky for this version because:

- local Tesseract may not be available in the serverless runtime
- serverless file storage is temporary and not shared between invocations
- the in-memory OCR handoff can be lost between upload and analyse requests
- local rate limits reset per function instance
- `private_storage/results` is local and not durable across instances
- the plain `server.js` would need an adapter or a different route structure

Recommended hosts for this version include Render, Railway, Fly.io, DigitalOcean App Platform, a small VPS, or any provider that can run `node server.js` as a persistent process and install the `tesseract` binary.

Build command:

```bash
npm install
```

Start command:

```bash
npm start
```

Health check:

```text
GET /health
```

Production environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `RATE_LIMIT_WINDOW_MS`
- `TEMP_FILE_RETENTION_MS`
- `CLEARSTEPS_AI_TIMEOUT_MS`
- `CLEARSTEPS_AI_DEBUG=false`

Do not set `CLEARSTEPS_ENABLE_FILE_RETENTION` in production.

## Supabase SQL Already Added

Run these in Supabase SQL Editor for a fresh project:

- `supabase/phase1_schema.sql`
- `supabase/phase2_feedback_events.sql`
- `supabase/phase3_5_anonymous_session_linking.sql`
- `supabase/phase4_ocr_tracking.sql`
- `supabase/phase6_ai_metadata.sql`

## Privacy Rules

Northcue does not intentionally store:

- raw uploaded documents
- OCR text
- extracted document text
- prompt text
- raw AI responses
- uploaded file content
- names, addresses, account numbers, reference numbers, or payment details

Supabase rows store safe metadata only, such as anonymous session ID, job ID, file type, file size, status, OCR quality category, AI status, feedback rating, reason chips, and analytics event names.

## Temporary Storage

- Uploaded files are written to `private_storage/uploads` only while being processed.
- Active upload files are deleted after processing by default.
- Old files in `private_storage/uploads` and `private_storage/results` are cleaned on server startup after `TEMP_FILE_RETENTION_MS`.
- `CLEARSTEPS_ENABLE_FILE_RETENTION=1` can be used locally for debugging only. This is a legacy internal environment variable name and is not shown to users.

Do not enable file retention for public testing.

## Public MVP Safety

Protected routes have simple local rate limiting:

- `/api/simplify`
- `/api/upload`
- `/api/feedback`
- `/api/analytics`

If the limit is reached, the app returns a calm public message and does not expose stack traces or provider errors.

## Known Limits

- JPG and PNG are supported.
- WEBP images are accepted by the current image OCR path.
- PDF is supported for MVP document intake, with public testing limited to 5 pages.
- DOCX is not supported yet.
- Northcue works best with energy bills and council tax notices.
- Other readable documents get cautious reading aid cards.
- Northcue does not provide legal, financial, medical, debt, immigration, or official advice.
- Users must check the original document before acting.

## Deployment Checklist

1. Set all required environment variables in the hosting provider.
2. Confirm `.env` is not committed.
3. Run `npm test`.
4. Run the Supabase SQL files listed above.
5. Confirm service role key is server-side only.
6. Confirm `private_storage/` is not publicly served.
7. Upload a test JPG, PNG, and short PDF.
8. Submit test feedback and analytics events.
9. Confirm Supabase stores only safe metadata.
10. Confirm AI fallback still returns cue cards if OpenAI is unavailable.
