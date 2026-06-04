-- ClearSteps Phase 4 OCR tracking
-- Privacy rule: store OCR timing and quality metadata only.
-- Do not store raw documents, OCR text, full document text, names, addresses,
-- account numbers, reference numbers, payment details, or uploaded files.

alter table public.document_sessions
  add column if not exists ocr_started_at timestamptz,
  add column if not exists ocr_completed_at timestamptz,
  add column if not exists ocr_duration_ms integer
    check (ocr_duration_ms is null or ocr_duration_ms >= 0),
  add column if not exists ocr_status text
    check (ocr_status in ('not_started', 'processing', 'completed', 'failed', 'skipped')),
  add column if not exists ocr_engine text,
  add column if not exists ocr_input_quality text
    check (ocr_input_quality in ('good', 'fair', 'poor', 'unknown')),
  add column if not exists ocr_confidence_category text
    check (ocr_confidence_category in ('high', 'medium', 'low', 'unknown'));

create index if not exists idx_document_sessions_ocr_status
  on public.document_sessions(ocr_status);

create index if not exists idx_document_sessions_ocr_completed_at
  on public.document_sessions(ocr_completed_at desc);
