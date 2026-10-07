-- ──────────────────────────────────────
-- XtractNote — Migration 006: Job error codes, and a status that cannot be NULL
-- ──────────────────────────────────────
-- Two changes to generation_jobs, both needed before anything writes to it.
-- Re-runnable: each statement is guarded or idempotent.

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
  'error_message, which is prose for a human and must not be parsed.';

-- ── 2. status must not be NULL ──
--
-- `status` had a default and a CHECK but no NOT NULL, and **a CHECK constraint
-- passes when its expression is NULL**. An explicit NULL therefore slipped past
-- the eight-value vocabulary entirely, leaving a job in no state at all — which
-- no reader could interpret and no poll could resolve.
--
-- Safe to apply: the table has never been written to, so there are no rows to
-- violate it. If this fails, a row exists with a NULL status and should be
-- inspected rather than forced.
alter table public.generation_jobs
  alter column status set not null;
