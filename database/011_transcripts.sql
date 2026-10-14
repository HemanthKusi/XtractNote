-- ──────────────────────────────────────
-- XtractNote — Migration 011: The backend keeps the transcript
-- ──────────────────────────────────────
-- Generation used to take the transcript's text from the browser and throw
-- its timestamps away. The backend now fetches the transcript itself and
-- keeps it here, one row per fetch, with every caption line's position in
-- the video.
--
-- **Shared across users, and holding none.** Captions are public, so one
-- fetch serves everyone who picks that video; nothing here says who did.
--
-- **The segments are the truth.** `segments` is the caption lines as
-- `[{text, start, duration}]`, already cleaned. The text a generation reads
-- is derived from them by the backend, so it is not stored a second time.
-- `word_count` is derived too, but kept: the generating screen asks for it on
-- every poll, and the segments can run to a megabyte.
--
-- **A row is never changed.** A generation records which row it read, so
-- rewriting a row would change what that record means. The trigger refuses
-- every update; a refetch inserts a new row instead. A row a job or a piece of
-- content points at cannot be deleted either, by the foreign keys below.
--
-- **Backend only.** Row-level security is on with no policies, and the
-- client roles hold no privileges on the table at all.
--
-- Safe to re-apply: `if not exists` throughout, the trigger function is
-- replaced, and the trigger is dropped before it is created.

create table if not exists public.transcripts (
  id             uuid primary key default gen_random_uuid(),
  video_id       text not null,
  language       text not null,
  language_code  text not null,
  is_generated   boolean not null,
  segments       jsonb not null check (jsonb_typeof(segments) = 'array'),
  word_count     int not null check (word_count >= 0),
  fetched_at     timestamptz not null default now()
);

-- The reuse lookup: the newest row for a video.
create index if not exists transcripts_video_fetched_idx
  on public.transcripts (video_id, fetched_at desc);

alter table public.transcripts enable row level security;
revoke all on public.transcripts from anon, authenticated;

create or replace function public.transcripts_refuse_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'A transcript row is never changed; insert a new one.'
    using errcode = '55000';  -- object_not_in_prerequisite_state
end;
$$;

revoke all on function public.transcripts_refuse_update() from public, anon, authenticated;

drop trigger if exists transcripts_refuse_update on public.transcripts;
create trigger transcripts_refuse_update
  before update on public.transcripts
  for each row execute function public.transcripts_refuse_update();

-- What each job, and each piece of content, was made from. NULL for
-- everything from before this migration.
alter table public.generation_jobs
  add column if not exists transcript_id uuid references public.transcripts (id);

alter table public.generated_content
  add column if not exists transcript_id uuid references public.transcripts (id);

comment on table public.transcripts is
  'One fetched transcript, never changed. Shared across users; backend only.';
comment on column public.transcripts.segments is
  'Cleaned caption lines as [{text, start, duration}], seconds. The text '
  'generation reads is derived from these.';
comment on column public.generation_jobs.transcript_id is
  'The transcript row this job generated from.';
comment on column public.generated_content.transcript_id is
  'The transcript row this content was generated from.';
