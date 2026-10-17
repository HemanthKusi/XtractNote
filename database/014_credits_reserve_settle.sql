-- ──────────────────────────────────────
-- XtractNote — Migration 014: Credits — reserve at the start, settle at the end
-- ──────────────────────────────────────
-- A generation's price is reserved from the user's balance when its job is
-- admitted, and settled exactly once when the job ends: kept when it
-- completes, refunded when it fails.
--
-- 1. admit_generation_job takes the price. Under the per-user lock it now
--    applies any due refill, refuses a balance below the price (XN402), and
--    otherwise creates the job, takes the price and writes the `reserve` row
--    — all in one transaction. The old signature, which took no price, is
--    dropped, so a job can no longer be admitted without one.
--
-- 2. Settling is a trigger on generation_jobs, fired when a job's status
--    first becomes completed or failed, in the same transaction as that
--    change. Every path that ends a job — the run, the start route, the sweep
--    — settles it, and no crash can fall between "failed" and "refunded".
--    A refund for a reservation from an earlier monthly period restores
--    nothing: the reset since then already restored the allowance.
--
-- 3. One reserve and one settlement per job, enforced by unique indexes.
--
-- 4. The refill compares against clock_timestamp(), the actual time, instead
--    of now(), which is when the transaction began; a call that waited on the
--    lock across a refill time now sees the new period.
--
-- ⚠ Apply this together with the backend that passes a price: the code
-- before it calls the old signature, which this drops.
--
-- Safe to re-apply: functions and the trigger are replaced, the old signature
-- is dropped only if present, indexes are created if missing, and the grants
-- restate the same end state.

-- ── 4. The refill, on the actual time ──
-- As in 013, except for v_now.
create or replace function public.apply_credit_refill(
  p_user_id   uuid,
  p_allowance int
)
returns public.credit_accounts
language plpgsql
set search_path = ''
as $$
declare
  v_account public.credit_accounts;
  v_exists  boolean;
  v_anchor  timestamptz;
  v_now     timestamptz := clock_timestamp();
  v_start   timestamptz;
  v_next    timestamptz;
begin
  if p_allowance is null or p_allowance < 1 then
    raise exception 'The credit allowance must be at least 1.'
      using errcode = '22023';  -- invalid_parameter_value
  end if;

  select * into v_account from public.credit_accounts where user_id = p_user_id;
  v_exists := found;

  if v_exists and v_now < v_account.next_refill_at then
    return v_account;
  end if;

  if v_exists then
    v_anchor := v_account.anchor_at;
  else
    v_anchor := public.credit_sign_up_time(p_user_id);
    if v_anchor is null then
      raise exception 'This user has no sign-up time to count credit periods from.'
        using errcode = 'P0002';  -- no_data_found
    end if;
  end if;

  select p.period_start, p.next_refill_at into v_start, v_next
  from public.credit_period(v_anchor, v_now) as p;

  if v_exists then
    insert into public.credit_ledger (user_id, kind, amount, balance_after, period_start)
    values (p_user_id, 'refill', p_allowance - v_account.balance, p_allowance, v_start);

    update public.credit_accounts
    set balance = p_allowance, period_start = v_start, next_refill_at = v_next
    where user_id = p_user_id
    returning * into v_account;
  else
    insert into public.credit_accounts (user_id, balance, anchor_at, period_start, next_refill_at)
    values (p_user_id, p_allowance, v_anchor, v_start, v_next)
    returning * into v_account;

    insert into public.credit_ledger (user_id, kind, amount, balance_after, period_start)
    values (p_user_id, 'refill', p_allowance, p_allowance, v_start);
  end if;

  return v_account;
end;
$$;

-- ── 3. At most one reserve and one settlement per job ──
create unique index if not exists credit_ledger_one_reserve_per_job
  on public.credit_ledger (job_id) where kind = 'reserve';
create unique index if not exists credit_ledger_one_settlement_per_job
  on public.credit_ledger (job_id) where kind in ('keep', 'refund');

-- ── 1. Admission reserves the price ──
drop function if exists public.admit_generation_job(uuid, text, text, uuid, text, int);

create or replace function public.admit_generation_job(
  p_user_id      uuid,
  p_video_id     text,
  p_content_type text,
  p_request_id   uuid,
  p_platform     text,
  p_limit        int,
  p_cost         int,
  p_allowance    int
)
-- A one-row table rather than a bare uuid: the backend's client accepts
-- only a list as a function's result.
returns table (job_id uuid)
language plpgsql
set search_path = ''
as $$
declare
  v_unfinished int;
  v_account    public.credit_accounts;
  v_after      int;
begin
  if p_limit is null or p_limit < 1 then
    raise exception 'The generation limit must be at least 1.'
      using errcode = '22023';  -- invalid_parameter_value
  end if;
  if p_cost is null or p_cost < 1 then
    raise exception 'A generation must cost at least 1 credit.'
      using errcode = '22023';
  end if;

  -- One admission at a time per user, and the lock credit_balance() and the
  -- settlement trigger take, so one user's admissions, balance reads and
  -- settlements run one at a time. Released when the transaction ends.
  perform pg_advisory_xact_lock(
    hashtextextended('generation_jobs:' || p_user_id::text, 0)
  );

  -- A key this user already used is answered as a duplicate before anything
  -- is counted or charged. The backend answers it with the job it made.
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

  v_account := public.apply_credit_refill(p_user_id, p_allowance);

  if v_account.balance < p_cost then
    -- The balance and the next refill travel in DETAIL as JSON, so the
    -- refusal can say what the user has and when more arrives.
    raise exception 'This generation costs % credit(s) and % remain.', p_cost, v_account.balance
      using errcode = 'XN402',
            detail = json_build_object(
              'cost', p_cost,
              'balance', v_account.balance,
              'next_refill_at', v_account.next_refill_at
            )::text;
  end if;

  -- A pending job at progress 0, matching the backend's patch_for_status
  -- ('pending'); a backend test pins the two.
  insert into public.generation_jobs
    (user_id, video_id, content_type, platform, request_id, status, progress)
  values
    (p_user_id, p_video_id, p_content_type, p_platform, p_request_id, 'pending', 0)
  returning id into job_id;

  update public.credit_accounts
  set balance = balance - p_cost
  where user_id = p_user_id
  returning balance into v_after;

  insert into public.credit_ledger (user_id, job_id, kind, amount, balance_after, period_start)
  values (p_user_id, job_id, 'reserve', -p_cost, v_after, v_account.period_start);

  return next;
end;
$$;

comment on function public.admit_generation_job(uuid, text, text, uuid, text, int, int, int) is
  'Creates a pending generation job and reserves p_cost credits if the user '
  'has fewer unfinished jobs than p_limit and at least p_cost credits after '
  'any due refill; returns its id as one row. Otherwise raises XN429 (limit) '
  'or XN402 (credits, with JSON detail). Serialised per user. Backend only.';

-- ── 2. Settling, on the status change ──
create or replace function public.settle_job_credits()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_reserve public.credit_ledger;
  v_account public.credit_accounts;
  v_current timestamptz;
  v_kind    text;
  v_amount  int;
  v_after   int;
begin
  -- Serialised with the user's admissions and balance reads.
  perform pg_advisory_xact_lock(
    hashtextextended('generation_jobs:' || new.user_id::text, 0)
  );

  select * into v_reserve
  from public.credit_ledger
  where job_id = new.id and kind = 'reserve';
  if not found then
    -- Admitted before credits existed: nothing was reserved, nothing settles.
    return new;
  end if;

  if exists (
    select 1 from public.credit_ledger
    where job_id = new.id and kind in ('keep', 'refund')
  ) then
    return new;
  end if;

  select * into v_account from public.credit_accounts where user_id = new.user_id;

  -- The period now, whether or not its refill has been applied yet.
  select p.period_start into v_current
  from public.credit_period(v_account.anchor_at, clock_timestamp()) as p;

  if new.status = 'completed' then
    v_kind := 'keep';
    v_amount := 0;
  elsif v_reserve.period_start < v_current then
    -- Reserved in an earlier period: the reset since has restored the
    -- allowance, so this refund restores nothing.
    v_kind := 'refund';
    v_amount := 0;
  else
    v_kind := 'refund';
    v_amount := -v_reserve.amount;
  end if;

  update public.credit_accounts
  set balance = balance + v_amount
  where user_id = new.user_id
  returning balance into v_after;

  insert into public.credit_ledger (user_id, job_id, kind, amount, balance_after, period_start)
  values (new.user_id, new.id, v_kind, v_amount, v_after, v_current);

  return new;
end;
$$;

comment on function public.settle_job_credits() is
  'Trigger: settles a job''s reserved credits once, when its status first '
  'becomes completed (keep) or failed (refund).';

drop trigger if exists trg_generation_jobs_settle on public.generation_jobs;
create trigger trg_generation_jobs_settle
  after update of status on public.generation_jobs
  for each row
  when (old.status not in ('completed', 'failed')
        and new.status in ('completed', 'failed'))
  execute function public.settle_job_credits();

-- Postgres grants execute on a new function to PUBLIC, and the hosted
-- database also grants it to anon and authenticated. Take all three away.
revoke all on function public.admit_generation_job(uuid, text, text, uuid, text, int, int, int)
  from public, anon, authenticated;
grant execute on function public.admit_generation_job(uuid, text, text, uuid, text, int, int, int)
  to service_role;
revoke all on function public.settle_job_credits() from public, anon, authenticated;
