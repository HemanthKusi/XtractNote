-- ──────────────────────────────────────
-- XtractNote — Migration 002: Folders
-- ──────────────────────────────────────

create table if not exists public.folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  emoji       text default '📁',
  color       text default '#3B7AE8',
  description text,
  item_count  int default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Index for fast lookups by user
create index if not exists idx_folders_user_id on public.folders(user_id);

-- Keep updated_at current on changes
create or replace trigger trg_folders_updated
  before update on public.folders
  for each row execute procedure public.touch_updated_at();