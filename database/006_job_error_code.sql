-- ──────────────────────────────────────
-- XtractNote — Migration 006: Job error codes, and a status that cannot be NULL
-- ──────────────────────────────────────
-- Two changes to generation_jobs, both needed before anything writes to it.
--
-- Re-applying after a successful run is safe. The FIRST run has a precondition,
-- stated with the status change below — "idempotent" would overstate it, since
-- that statement can fail on its first application and succeed on every one
-- after.

-- ── 1. A typed error code alongside the human message ──
--
-- The generating screen maps a failure to its own copy, and that map is typed
-- against a set of reasons — so it needs the REASON, not the sentence. Storing
-- only `error_message` would force the frontend to pattern-match on prose, which
-- breaks the moment the wording changes.
--
-- The code is the same stable string the API layer already uses to pick an HTTP
-- status, so a failed job and a failed request describe themselves identically.
alter table public.generation_jobs
  add column if not exists error_code text;

comment on column public.generation_jobs.error_code is
  'Stable reason string for a failed job, e.g. transcript-too-long. Pairs with '
  'error_message, which is prose for a human and must not be parsed. The set is '
  'OPEN, not a fixed vocabulary: codes come from generation, the transcript '
  'service and later the pipeline nodes, so no CHECK constrains it and the '
  'application rejects only an empty one.';

-- ── 2. status must not be NULL ──
--
-- `status` had a default and a CHECK but no NOT NULL, and **a CHECK constraint
-- passes when its expression is NULL**. An explicit NULL therefore slipped past
-- the eight-value vocabulary entirely, leaving a job in no state at all — which
-- no reader could interpret and no poll could resolve.
--
-- PRECONDITION: no existing row may have a NULL status.
--
-- This cannot be guaranteed from the repository, and is stated rather than
-- assumed. Nothing in the schema or the policies prevents a NULL status — the
-- insert policy constrains user_id, not status — and the project's notes record
-- that the table has never been written to, which if still true makes this a
-- no-op over zero rows.
--
-- If it fails, rows with a NULL status exist. Inspect them and decide which
-- state each belongs in. Do not force the constraint: a NULL status is a job in
-- no state at all, and picking one on its behalf invents history that no reader
-- could tell from the real thing.
alter table public.generation_jobs
  alter column status set not null;
