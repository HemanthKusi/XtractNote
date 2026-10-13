-- ──────────────────────────────────────
-- XtractNote — Migration 010: A per-user limit on unfinished generations
-- ──────────────────────────────────────
-- Generation runs on a fixed number of slots, and nothing limited how many
-- one user held: a user starting several different generations, or a script,
-- could take every slot and leave everyone else refused as busy — each run
-- paid for.
--
-- Two changes, and the second is what makes the first trustworthy:
--
-- 1. `admit_generation_job` creates a job only if the user has fewer
--    unfinished jobs than the limit the backend passes. It takes a lock per
--    user for the rest of its transaction, so two starts from one user — from
--    any process or host — are admitted one after the other, and the second
--    counts the first.
--
--    Execute is revoked from everyone but `service_role`. A client calling it
--    could otherwise pass any limit it liked, and any user id.
--
-- 2. Users lose their insert and update policies on `generation_jobs`. The
--    browser never writes this table — only the backend does, with the
--    service-role key, which bypasses row-level security. With those policies
--    a user could create job rows or mark their own running jobs failed, and
--    so drop out of the count while their runs still held slots. The select
--    policy stays: a user may still read their own jobs.
--
-- Safe to re-apply: the function is replaced, policies are dropped only if
-- they exist, and the grants restate the same end state.

create or replace function public.admit_generation_job(
  p_user_id      uuid,
  p_video_id     text,
  p_content_type text,
  p_request_id   uuid,
  p_platform     text,
  p_limit        int
)
-- A one-row table rather than a bare uuid: the backend's client accepts
-- only a list as a function's result.
returns table (job_id uuid)
language plpgsql
set search_path = ''
as $$
declare
  v_unfinished int;
begin
  if p_limit is null or p_limit < 1 then
    raise exception 'The generation limit must be at least 1.'
      using errcode = '22023';  -- invalid_parameter_value
  end if;

  -- One admission at a time per user. Released when the transaction ends,
  -- after the insert below is committed, so the next admission counts it.
  perform pg_advisory_xact_lock(
    hashtextextended('generation_jobs:' || p_user_id::text, 0)
  );

  -- A key this user already used is answered as a duplicate before anything
  -- is counted. Two copies of one request can arrive together; the second
  -- waits on the lock above, and must be told its job exists rather than be
  -- refused for the limit that job now counts towards. The backend answers
  -- a duplicate with the job it made.
  if exists (
    select 1 from public.generation_jobs
    where user_id = p_user_id and request_id = p_request_id
  ) then
    raise exception 'A job already exists for this request.'
      using errcode = '23505';  -- unique_violation, as the index would raise
  end if;

  select count(*) into v_unfinished
  from public.generation_jobs
  where user_id = p_user_id
    and status not in ('completed', 'failed');

  if v_unfinished >= p_limit then
    raise exception 'This user already has % unfinished generation(s).', v_unfinished
      using errcode = 'XN429';
  end if;

  -- A pending job at progress 0, matching the backend's patch_for_status
  -- ('pending'); a backend test pins the two. A key already used by this user
  -- fails on the unique index from migration 008, with its usual 23505.
  insert into public.generation_jobs
    (user_id, video_id, content_type, platform, request_id, status, progress)
  values
    (p_user_id, p_video_id, p_content_type, p_platform, p_request_id, 'pending', 0)
  returning id into job_id;

  return next;
end;
$$;

comment on function public.admit_generation_job(uuid, text, text, uuid, text, int) is
  'Creates a pending generation job if the user has fewer unfinished jobs than '
  'p_limit, and returns its id as one row; otherwise raises SQLSTATE XN429. '
  'Serialised per user. Backend only.';

-- Postgres grants execute on a new function to PUBLIC, and the hosted
-- database also grants it to anon and authenticated. Take all three away.
revoke all on function public.admit_generation_job(uuid, text, text, uuid, text, int)
  from public, anon, authenticated;
grant execute on function public.admit_generation_job(uuid, text, text, uuid, text, int)
  to service_role;

-- ── Job rows are written by the backend only ──
drop policy if exists "Users can create own jobs" on public.generation_jobs;
drop policy if exists "Users can update own jobs" on public.generation_jobs;

-- With no policy, row-level security already refuses these. Revoking the
-- table privileges as well means a policy added later by mistake still
-- cannot reopen them.
revoke insert, update, delete on public.generation_jobs from anon, authenticated;
