-- ──────────────────────────────────────
-- XtractNote — Migration 004: Generation Jobs
-- ──────────────────────────────────────
-- Tracks the status of each generation request so the
-- frontend can poll for progress updates.

create table if not exists public.generation_jobs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  video_id        text not null,
  content_type    text not null,
  status          text default 'pending'
                  check (status in (
                    'pending', 'fetching', 'reading', 'understanding',
                    'drafting', 'polishing', 'completed', 'failed'
                  )),
  progress        int default 0,
  error_message   text,
  result_id       uuid references public.generated_content(id),
  created_at      timestamptz default now(),
  completed_at    timestamptz
);

-- Index for polling (user looks up their active jobs)
create index if not exists idx_jobs_user_status
  on public.generation_jobs(user_id, status);
