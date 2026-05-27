-- ──────────────────────────────────────
-- XtractNote — Migration 003: Generated Content
-- ──────────────────────────────────────

create table if not exists public.generated_content (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  folder_id       uuid references public.folders(id) on delete set null,

  -- Video source info
  video_url       text not null,
  video_id        text not null,
  video_title     text,
  video_channel   text,
  video_duration  text,
  video_thumbnail text,

  -- Generated content
  content_type    text not null,
  content_title   text,
  content_body    jsonb not null,
  content_html    text,

  -- Meta
  status          text default 'draft'
                  check (status in ('draft', 'saved', 'archived', 'exported')),
  word_count      int,
  metadata        jsonb default '{}',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Indexes for common queries
create index if not exists idx_content_user_id on public.generated_content(user_id);
create index if not exists idx_content_folder_id on public.generated_content(folder_id);
create index if not exists idx_content_type on public.generated_content(content_type);
create index if not exists idx_content_created on public.generated_content(created_at desc);
