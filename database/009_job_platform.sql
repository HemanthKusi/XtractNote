-- ──────────────────────────────────────
-- XtractNote — Migration 009: The platform a social job is for
-- ──────────────────────────────────────
-- A start that repeats a request key is answered with the job that key
-- already made — but only when the request is the same one. Migration 008's
-- key was matched against the job's video and format, and a social request
-- has a third part, its platform, which the table did not record. A key
-- reused for the same video with a different platform was therefore answered
-- with the earlier job: a draft written for the wrong platform.
--
-- Recording it also puts every input a run needs on the row, which a worker
-- that picks jobs up from the table, rather than from the request, depends on.
--
-- The CHECK names the platforms the backend accepts (`SocialPlatform` in
-- backend/app/services/prompts.py; a backend test pins the two together).
-- Users hold insert and update policies on this table (migration 005), so the
-- database, not only the API, is what refuses a platform nothing can run.
--
-- NULL means no platform: every non-social job, and every job from before
-- this migration. A CHECK passes when its expression is NULL, so the NULL
-- case is written out rather than left to that rule. Old rows are not
-- touched: a social job from before this migration keeps a NULL platform,
-- and a key repeated for it no longer matches a request that names one, so
-- it is refused rather than answered.
--
-- Safe to re-apply: the column is added only if missing, and the constraint
-- is dropped before it is added.

alter table public.generation_jobs
  add column if not exists platform text;

alter table public.generation_jobs
  drop constraint if exists generation_jobs_platform_check;

alter table public.generation_jobs
  add constraint generation_jobs_platform_check
  check (
    platform is null
    or platform in (
      'linkedin', 'x-thread', 'instagram', 'youtube-description', 'newsletter'
    )
  );

comment on column public.generation_jobs.platform is
  'Social platform the job writes for, e.g. linkedin. NULL for every other '
  'content type. Part of what a repeated request key must match.';
