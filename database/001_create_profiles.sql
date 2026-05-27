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

-- Automatically create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
