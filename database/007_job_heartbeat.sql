-- ──────────────────────────────────────
-- XtractNote — Migration 007: A heartbeat on every generation job
-- ──────────────────────────────────────
-- A run happens inside a server process. When that process dies mid-run,
-- nothing writes the job's ending, so a sweep has to decide which unfinished
-- jobs are dead.
--
-- It used to decide by age since creation, which guesses how long a run takes.
-- That guess is wrong for a job that waited before it started, and will be
-- wrong for longer runs to come. A heartbeat measures what the sweep actually
-- needs to know — whether anything is still working on the job: the run
-- refreshes `heartbeat_at` while it is alive, and the sweep fails only jobs
-- whose heartbeat has stopped.
--
-- Safe to re-apply: `add column if not exists`.

alter table public.generation_jobs
  add column if not exists heartbeat_at timestamptz not null default now();

comment on column public.generation_jobs.heartbeat_at is
  'Last sign of life from the run working on this job. Set when the job is '
  'created, refreshed when it is claimed and periodically while it runs. An '
  'unfinished job whose heartbeat is older than the sweep threshold is failed '
  'as interrupted.';
