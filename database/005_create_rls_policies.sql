-- ──────────────────────────────────────
-- XtractNote — Migration 005: Row Level Security
-- ──────────────────────────────────────
-- Layer 7: Database-level access control.
-- Even if the application code has a bug, users can
-- ONLY access their own data. PostgreSQL enforces this.

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.folders enable row level security;
alter table public.generated_content enable row level security;
alter table public.generation_jobs enable row level security;

-- ── Profiles: users can read/update their own profile ──
create policy "Users can view own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- ── Folders: users can CRUD their own folders ──
create policy "Users can view own folders"
  on public.folders for select
  using (user_id = auth.uid());

create policy "Users can create own folders"
  on public.folders for insert
  with check (user_id = auth.uid());

create policy "Users can update own folders"
  on public.folders for update
  using (user_id = auth.uid());

create policy "Users can delete own folders"
  on public.folders for delete
  using (user_id = auth.uid());

-- ── Generated Content: users can CRUD their own content ──
create policy "Users can view own content"
  on public.generated_content for select
  using (user_id = auth.uid());

create policy "Users can create own content"
  on public.generated_content for insert
  with check (user_id = auth.uid());

create policy "Users can update own content"
  on public.generated_content for update
  using (user_id = auth.uid());

create policy "Users can delete own content"
  on public.generated_content for delete
  using (user_id = auth.uid());

-- ── Generation Jobs: users can view/create their own jobs ──
create policy "Users can view own jobs"
  on public.generation_jobs for select
  using (user_id = auth.uid());

create policy "Users can create own jobs"
  on public.generation_jobs for insert
  with check (user_id = auth.uid());

create policy "Users can update own jobs"
  on public.generation_jobs for update
  using (user_id = auth.uid());
