-- ──────────────────────────────────────
-- XtractNote — Migration 001: Profiles
-- ──────────────────────────────────────
-- Extends Supabase's built-in auth.users table with
-- app-specific user data (name, avatar, preferences).

create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  name                 text,
  avatar_url           text,
  default_folder_id    uuid,
  default_content_type text default 'notes',
  theme                text default 'light' check (theme in ('light', 'dark')),
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- Automatically create a profile when a new user signs up.
-- security definer = runs as the table owner, bypassing RLS so the insert
-- succeeds during the auth flow. search_path pinned for safety.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Shared trigger: keep updated_at current on any row update.
-- Defined here (first migration) so later tables can reuse it.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_profiles_updated
  before update on public.profiles
  for each row execute procedure public.touch_updated_at();