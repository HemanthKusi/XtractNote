-- ──────────────────────────────────────
-- XtractNote — Migration 013: Credits — balances, a ledger, a monthly refill
-- ──────────────────────────────────────
-- Every account holds a credit balance. This migration creates the balance,
-- the ledger that records every change to it, and the monthly refill.
-- Reserving credits for a generation, and keeping or refunding them, are
-- later migrations.
--
-- The allowance refills on the account's sign-up date each month and RESETS
-- the balance to the allowance: unused credits never roll over. A refill is
-- applied when a balance is next read or spent, under the per-user lock that
-- admission takes, so there is no scheduler to miss a run.
--
-- Refill dates are "sign-up + N months", counted from the sign-up time and
-- never from the previous refill. Postgres clamps a month that lacks the day
-- (31 January + 1 month is 28 February); counting on from the clamped date
-- would lose the 31st for good. Month arithmetic runs in UTC.
--
-- Users can neither read nor write either table. A stored balance can be a
-- refill behind until something touches it, so the balance is read through
-- credit_balance(), which applies any due refill first. Only service_role may
-- call the functions.
--
-- Safe to re-apply: tables and the index are created if missing, functions
-- and the trigger are replaced, and the grants restate the same end state.

create table if not exists public.credit_accounts (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  balance         int not null check (balance >= 0),
  -- The sign-up time the monthly periods are counted from.
  anchor_at       timestamptz not null,
  period_start    timestamptz not null,
  next_refill_at  timestamptz not null check (next_refill_at > period_start),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create or replace trigger trg_credit_accounts_updated
  before update on public.credit_accounts
  for each row execute procedure public.touch_updated_at();

create table if not exists public.credit_ledger (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  -- The generation a reserve, keep or refund belongs to; none for a refill.
  job_id         uuid references public.generation_jobs(id) on delete set null,
  kind           text not null check (kind in ('refill', 'reserve', 'keep', 'refund')),
  -- The change to the balance. Negative for a reserve, and for a refill that
  -- drops unused credits above the allowance.
  amount         int not null,
  balance_after  int not null check (balance_after >= 0),
  -- The period the row belongs to, so a refund can tell whether a reset since
  -- its reserve has already restored the credits.
  period_start   timestamptz not null,
  created_at     timestamptz not null default now()
);

create index if not exists credit_ledger_user_time
  on public.credit_ledger (user_id, created_at);

-- Row-level security with no policies refuses every user. Revoking the table
-- privileges as well means a policy added later by mistake still cannot open
-- them.
alter table public.credit_accounts enable row level security;
alter table public.credit_ledger enable row level security;
revoke all on public.credit_accounts from anon, authenticated;
revoke all on public.credit_ledger from anon, authenticated;

-- ── The period an instant falls in ──
-- The period of an account anchored at p_anchor that contains p_at: its start
-- and the next refill. Takes the instant as an argument rather than reading
-- the clock, so any date can be tested.
create or replace function public.credit_period(
  p_anchor timestamptz,
  p_at     timestamptz
)
returns table (period_start timestamptz, next_refill_at timestamptz)
language plpgsql
stable
set search_path = ''
set timezone = 'UTC'
as $$
declare
  v_months int;
begin
  -- age() gives a starting estimate; the two loops settle it against the
  -- same clamped arithmetic the dates use, so the period always contains
  -- p_at, or starts at the anchor when p_at precedes it.
  v_months := greatest(
    0,
    (extract(year from age(p_at, p_anchor)) * 12
      + extract(month from age(p_at, p_anchor)))::int
  );
  while p_anchor + make_interval(months => v_months + 1) <= p_at loop
    v_months := v_months + 1;
  end loop;
  while v_months > 0 and p_anchor + make_interval(months => v_months) > p_at loop
    v_months := v_months - 1;
  end loop;

  period_start := p_anchor + make_interval(months => v_months);
  next_refill_at := p_anchor + make_interval(months => v_months + 1);
  return next;
end;
$$;

comment on function public.credit_period(timestamptz, timestamptz) is
  'The monthly credit period anchored at p_anchor that contains p_at, counted '
  'as anchor + N months in UTC. Backend only.';

-- ── The refill ──
-- Creates the account on first use, or resets it when its refill date has
-- passed, and writes the ledger row for either. Returns the account as it
-- now stands.
--
-- It takes no lock: the caller must hold the per-user lock, as
-- credit_balance() and admission do. Two callers without it could both
-- create the account, and the second would fail on the primary key.
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
  v_now     timestamptz := now();
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
    select created_at into v_anchor from public.profiles where id = p_user_id;
    if v_anchor is null then
      raise exception 'This user has no profile to count credit periods from.'
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

comment on function public.apply_credit_refill(uuid, int) is
  'Creates the credit account on first use, or resets it to p_allowance once '
  'its refill date has passed, writing the ledger row. The caller must hold '
  'the per-user lock. Backend only.';

-- ── Reading a balance ──
create or replace function public.credit_balance(
  p_user_id   uuid,
  p_allowance int
)
-- A one-row table rather than a bare record: the backend's client accepts
-- only a list as a function's result.
returns table (balance int, next_refill_at timestamptz)
language plpgsql
set search_path = ''
as $$
declare
  v_account public.credit_accounts;
begin
  -- The lock admit_generation_job takes, so a balance is never read halfway
  -- through an admission that spends from it.
  perform pg_advisory_xact_lock(
    hashtextextended('generation_jobs:' || p_user_id::text, 0)
  );

  v_account := public.apply_credit_refill(p_user_id, p_allowance);
  balance := v_account.balance;
  next_refill_at := v_account.next_refill_at;
  return next;
end;
$$;

comment on function public.credit_balance(uuid, int) is
  'The user''s credit balance and next refill time, after applying any due '
  'refill, as one row. Serialised per user with admission. Backend only.';

-- Postgres grants execute on a new function to PUBLIC, and the hosted
-- database also grants it to anon and authenticated. Take all three away.
revoke all on function public.credit_period(timestamptz, timestamptz)
  from public, anon, authenticated;
revoke all on function public.apply_credit_refill(uuid, int)
  from public, anon, authenticated;
revoke all on function public.credit_balance(uuid, int)
  from public, anon, authenticated;
grant execute on function public.credit_period(timestamptz, timestamptz) to service_role;
grant execute on function public.apply_credit_refill(uuid, int) to service_role;
grant execute on function public.credit_balance(uuid, int) to service_role;
