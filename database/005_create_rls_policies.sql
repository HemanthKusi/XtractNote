-- ──────────────────────────────────────
-- XtractNote — Migration 005: Row Level Security
-- ──────────────────────────────────────
-- Database-level access control. Even with an app bug, users can
-- ONLY access their own rows — PostgreSQL enforces this.
-- Re-runnable: each policy is dropped before being (re)created.

-- Enable RLS on all tables (idempotent — safe to re-run)
alter table public.profiles enable row level security;
alter table public.folders enable row level security;
alter table public.generated_content enable row level security;
alter table public.generation_jobs enable row level security;

-- ── Profiles ──
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- ── Folders ──
drop policy if exists "Users can view own folders" on public.folders;
create policy "Users can view own folders"
  on public.folders for select
  using (user_id = auth.uid());

drop policy if exists "Users can create own folders" on public.folders;
create policy "Users can create own folders"
  on public.folders for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update own folders" on public.folders;
create policy "Users can update own folders"
  on public.folders for update
  using (user_id = auth.uid());

drop policy if exists "Users can delete own folders" on public.folders;
create policy "Users can delete own folders"
  on public.folders for delete
  using (user_id = auth.uid());

-- ── Generated Content ──
drop policy if exists "Users can view own content" on public.generated_content;
create policy "Users can view own content"
  on public.generated_content for select
  using (user_id = auth.uid());

drop policy if exists "Users can create own content" on public.generated_content;
create policy "Users can create own content"
  on public.generated_content for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update own content" on public.generated_content;
create policy "Users can update own content"
  on public.generated_content for update
  using (user_id = auth.uid());

drop policy if exists "Users can delete own content" on public.generated_content;
create policy "Users can delete own content"
  on public.generated_content for delete
  using (user_id = auth.uid());

-- ── Generation Jobs ──
drop policy if exists "Users can view own jobs" on public.generation_jobs;
create policy "Users can view own jobs"
  on public.generation_jobs for select
  using (user_id = auth.uid());

drop policy if exists "Users can create own jobs" on public.generation_jobs;
create policy "Users can create own jobs"
  on public.generation_jobs for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update own jobs" on public.generation_jobs;
create policy "Users can update own jobs"
  on public.generation_jobs for update
  using (user_id = auth.uid());