-- ──────────────────────────────────────
-- XtractNote — Migration 016: A run's draft and its job's completion, together
-- ──────────────────────────────────────
-- A finished run used to end in three requests: check the job was still
-- unfinished, insert the draft, then complete the job. The sweep could fail
-- the job between any two of them. A job failed after the check left a
-- draft linked to nothing, on a job whose credits had been refunded.
--
-- `finish_generation_job` does all three in one transaction. It locks the
-- job's row first, so the sweep's update of that row waits for it, or it
-- waits for the sweep:
--
-- - The job is this user's and unfinished: the draft is inserted, the job
--   is completed and linked to it, and the settlement trigger (migration
--   014) keeps the reserved credits. Returns the draft's id as one row.
-- - Otherwise — no such job, not this user's, or already finished: nothing
--   is written, and no row is returned.
--
-- So a job the sweep has failed gets no draft from its run, and its
-- refund stands.
--
-- The draft arrives as JSON and is read with the table's own column types.
-- Its owner is `p_user_id` and its status is 'draft', whatever the JSON
-- says; `folder_id`, `content_html` and the timestamps take their defaults.
--
-- Only service_role may call it: a client calling it could name any user.
--
-- Safe to re-apply: the function is replaced, and the grants restate the
-- same end state.

create or replace function public.finish_generation_job(
  p_job_id  uuid,
  p_user_id uuid,
  p_draft   jsonb
)
-- A one-row table rather than a bare uuid: the backend's client accepts
-- only a list as a function's result.
returns table (result_id uuid)
language plpgsql
set search_path = ''
as $$
declare
  v_draft public.generated_content;
begin
  if p_draft is null or jsonb_typeof(p_draft) <> 'object' then
    raise exception 'A finished job needs its draft as a JSON object.'
      using errcode = '22023';  -- invalid_parameter_value
  end if;

  -- The row lock is taken before anything is written. The settlement
  -- trigger takes the user's advisory lock after it, the same order the
  -- sweep's update takes them in.
  perform 1
  from public.generation_jobs
  where id = p_job_id
    and user_id = p_user_id
    and status not in ('completed', 'failed')
  for update;

  if not found then
    return;
  end if;

  v_draft := jsonb_populate_record(null::public.generated_content, p_draft);

  insert into public.generated_content (
    user_id, video_url, video_id, video_title, video_channel, video_duration,
    video_thumbnail, content_type, content_title, content_body, status,
    word_count, metadata, transcript_id
  )
  values (
    p_user_id, v_draft.video_url, v_draft.video_id, v_draft.video_title,
    v_draft.video_channel, v_draft.video_duration, v_draft.video_thumbnail,
    v_draft.content_type, v_draft.content_title, v_draft.content_body, 'draft',
    v_draft.word_count, coalesce(v_draft.metadata, '{}'::jsonb), v_draft.transcript_id
  )
  returning id into result_id;

  -- As the backend's patch_for_status('completed') writes it; a backend
  -- test pins the two.
  update public.generation_jobs
  set status = 'completed',
      progress = 100,
      result_id = finish_generation_job.result_id,
      completed_at = clock_timestamp()
  where id = p_job_id;

  return next;
end;
$$;

comment on function public.finish_generation_job(uuid, uuid, jsonb) is
  'Inserts a run''s draft and completes its job in one transaction, if the '
  'job is p_user_id''s and unfinished; returns the draft''s id as one row. '
  'Otherwise writes nothing and returns no row. Backend only.';

-- Postgres grants execute on a new function to PUBLIC, and the hosted
-- database also grants it to anon and authenticated. Take all three away.
revoke all on function public.finish_generation_job(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.finish_generation_job(uuid, uuid, jsonb)
  to service_role;
