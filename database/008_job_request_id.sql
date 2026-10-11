-- ──────────────────────────────────────
-- XtractNote — Migration 008: A request key on every generation job
-- ──────────────────────────────────────
-- Starting a generation is a paid action, and its reply can be lost: a
-- connection that drops, or a reply that arrives too late, leaves the client
-- not knowing whether the job was created. Trying again would then create
-- and pay for a second one.
--
-- So each start carries a request key the client generates, and repeating a
-- start with the same key returns the job it already created instead of
-- making another. This column holds the key; the index makes it unique per
-- user, so the database — not a check in the application — is what refuses a
-- second job for the same request, including two copies racing each other.
--
-- Unique per USER, not globally: one user's key can never match, or reveal,
-- another user's job.
--
-- Rows from before this migration keep a NULL key. NULLs do not collide in a
-- unique index, so they are unaffected.
--
-- Safe to re-apply: `if not exists` on both statements.

alter table public.generation_jobs
  add column if not exists request_id uuid;

create unique index if not exists generation_jobs_user_request_id_key
  on public.generation_jobs (user_id, request_id);

comment on column public.generation_jobs.request_id is
  'Key the client sent when starting this job. Unique per user: starting again '
  'with the same key returns this job rather than creating another.';
