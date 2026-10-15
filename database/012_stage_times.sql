-- ──────────────────────────────────────
-- XtractNote — Migration 012: When each stage of a job began
-- ──────────────────────────────────────
-- A generation now runs as a graph of nodes, and each node starting moves
-- the job to that node's stage. This records when: `stage_started_at` maps
-- each stage the job entered to the time it entered it, so how long a stage
-- took no longer depends on how often the page asked.
--
-- `{"fetching": "2026-10-13T…", "drafting": "2026-10-13T…"}`
--
-- Written by the run, in the same statement as the status change. The whole
-- object is written each time rather than merged: a job has one writer — the
-- run `claim` admitted — since the sweep writes only terminal fields and
-- users cannot write jobs (migration 010).
--
-- Existing jobs get `{}`: their stages were never timed.
--
-- Safe to re-apply: the column is added only if missing.

alter table public.generation_jobs
  add column if not exists stage_started_at jsonb not null default '{}'::jsonb
  check (jsonb_typeof(stage_started_at) = 'object');

comment on column public.generation_jobs.stage_started_at is
  'When the job entered each stage, as {stage: timestamp}. Written by the run '
  'with each status change.';
