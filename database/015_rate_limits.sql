-- ──────────────────────────────────────
-- XtractNote — Migration 015: Per-user rate limits on YouTube lookups
-- ──────────────────────────────────────
-- Every call the backend makes to the YouTube Data API spends the project's
-- daily quota, which all users share. A search costs 100 units of 10,000, so
-- one user repeating searches, or repeating refused starts, could use it up
-- and stop search, video lookups and every generation start for everyone.
--
-- `consume_rate_limit` records one use of a bucket for a user, or refuses it
-- when the user has made `p_limit` uses of that bucket in the last
-- `p_window_seconds`. The window rolls: a use counts until it is that old. It
-- takes a lock per user and bucket for the rest of its transaction, so two
-- calls from one user — from any process or host — are counted one after the
-- other, and the second sees the first.
--
-- A refusal is SQLSTATE XN429, with JSON detail `{"retry_after_seconds": n}`:
-- how long until enough of the user's uses age out for one more. A refused
-- call records nothing.
--
-- Each successful call deletes that user's uses of that bucket that have aged
-- out before recording the new one. There is no scheduled cleanup.
--
-- Users can neither read nor write the table: their uses are recorded by the
-- backend, and a user able to delete their own rows could reset their limit.
-- Only service_role may call the function: a client calling it could pass any
-- user id and any limit.
--
-- Safe to re-apply: the table and index are created if missing, the function
-- is replaced, and the grants restate the same end state.

create table if not exists public.rate_limit_events (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  -- What was used. 'video-length' is the lookup a start or a quote makes to
  -- price a video; both count against the same limit.
  bucket    text not null check (bucket in ('youtube-search', 'youtube-metadata', 'video-length')),
  used_at   timestamptz not null default clock_timestamp()
);

create index if not exists rate_limit_events_user_bucket_time
  on public.rate_limit_events (user_id, bucket, used_at);

-- Row-level security with no policies refuses every user. Revoking the table
-- privileges as well means a policy added later by mistake still cannot open
-- it.
alter table public.rate_limit_events enable row level security;
revoke all on public.rate_limit_events from anon, authenticated;

create or replace function public.consume_rate_limit(
  p_user_id         uuid,
  p_bucket          text,
  p_limit           int,
  p_window_seconds  int
)
-- A one-row table rather than a bare int: the backend's client accepts only
-- a list as a function's result.
returns table (remaining int)
language plpgsql
set search_path = ''
as $$
declare
  v_now     timestamptz;
  v_since   timestamptz;
  v_used    int;
  v_freeing timestamptz;
  v_retry   int;
begin
  if p_limit is null or p_limit < 1 then
    raise exception 'The rate limit must be at least 1.'
      using errcode = '22023';  -- invalid_parameter_value
  end if;
  if p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'The rate-limit window must be at least 1 second.'
      using errcode = '22023';
  end if;

  -- One call at a time per user and bucket. Released when the transaction
  -- ends, after the insert below is committed, so the next call counts it.
  perform pg_advisory_xact_lock(
    hashtextextended('rate_limit:' || p_user_id::text || ':' || coalesce(p_bucket, ''), 0)
  );

  -- Read after the lock is held, so calls that waited on it are timed in the
  -- order they were counted.
  v_now := clock_timestamp();
  v_since := v_now - make_interval(secs => p_window_seconds);

  select count(*) into v_used
  from public.rate_limit_events
  where user_id = p_user_id and bucket = p_bucket and used_at > v_since;

  if v_used >= p_limit then
    -- The use whose ageing out leaves room for one more. Past the oldest when
    -- the limit was lowered while the user had more uses than it allows.
    select used_at into v_freeing
    from public.rate_limit_events
    where user_id = p_user_id and bucket = p_bucket and used_at > v_since
    order by used_at
    offset v_used - p_limit
    limit 1;

    v_retry := greatest(
      1,
      ceil(extract(epoch from (v_freeing + make_interval(secs => p_window_seconds) - v_now)))::int
    );
    raise exception 'This user has used % of % in the last % seconds.', v_used, p_bucket, p_window_seconds
      using errcode = 'XN429',
            detail = json_build_object('retry_after_seconds', v_retry)::text;
  end if;

  delete from public.rate_limit_events
  where user_id = p_user_id and bucket = p_bucket and used_at <= v_since;

  insert into public.rate_limit_events (user_id, bucket, used_at)
  values (p_user_id, p_bucket, v_now);

  remaining := p_limit - v_used - 1;
  return next;
end;
$$;

comment on function public.consume_rate_limit(uuid, text, int, int) is
  'Records one use of p_bucket for p_user_id and returns how many remain, if '
  'the user has made fewer than p_limit uses of it in the last p_window_seconds; '
  'otherwise raises SQLSTATE XN429 with JSON detail {"retry_after_seconds": n}. '
  'Serialised per user and bucket. Backend only.';

-- Postgres grants execute on a new function to PUBLIC, and the hosted
-- database also grants it to anon and authenticated. Take all three away.
revoke all on function public.consume_rate_limit(uuid, text, int, int)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(uuid, text, int, int)
  to service_role;
