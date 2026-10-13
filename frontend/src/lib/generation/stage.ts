// ─────────────────────────────────────────────────────────────
// lib/generation/stage.ts
//
// Which step of a generation is running, and what each step on the generating
// screen shows: done with the time it took, running for how long, or waiting.
//
// Only steps that happen are steps. Three today: starting, until the job is
// under way; the job reading its transcript; and the job drafting. Nothing
// reports anything finer while drafting runs, so nothing finer is shown.
//
// Times are the page's own: a step starts when the page learns it has, so a
// finished step's duration is something the page measured, never a budget.
//
// Pure. Imports are type-only so node strips them, which lets
// scripts/check-stage.mjs import this file directly.
// ─────────────────────────────────────────────────────────────

import type { JobStatus } from "@/lib/content/types";

export type GenerationStep = "transcript" | "starting" | "drafting";

/** The steps, in the order they run. */
export const GENERATION_STEPS: readonly GenerationStep[] = ["starting", "transcript", "drafting"];

/**
 * How far the start has got: `not-sent` while the page prepares the request,
 * `sent` while it is unanswered — the backend may already have accepted it —
 * and `accepted` once it has.
 */
export type GenerationRunState = "not-sent" | "sent" | "accepted";

/** After this long drafting, the screen says why a long video takes a while. */
export const LONG_WAIT_MS = 60_000;

/**
 * The step a job's status belongs to. A status added to the vocabulary fails
 * to compile here until it is placed.
 *
 * `fetching` is the job reading its transcript. Reading, understanding and
 * polishing sit under drafting: nothing writes them today, and each becomes a
 * step of its own when the work behind it exists. The two terminal statuses
 * also map to drafting, the last step; the page leaves this screen when it
 * sees either.
 */
export function stepForStatus(status: JobStatus): GenerationStep {
  switch (status) {
    case "pending":
      return "starting";
    case "fetching":
      return "transcript";
    case "reading":
    case "understanding":
    case "drafting":
    case "polishing":
    case "completed":
    case "failed":
      return "drafting";
    default: {
      const unhandled: never = status;
      return unhandled;
    }
  }
}

/**
 * The running step, from what the page knows: how far the start has got, and
 * the job's status from the latest check, null until a check has answered.
 *
 * Everything before the job is under way is starting — the sign-in lookup,
 * the request key and the request itself. An accepted job counts as starting
 * until a check says it has left pending.
 */
export function currentStep(run: GenerationRunState, jobStatus: JobStatus | null): GenerationStep {
  switch (run) {
    case "not-sent":
    case "sent":
      return "starting";
    case "accepted":
      return jobStatus === null ? "starting" : stepForStatus(jobStatus);
    default: {
      const unhandled: never = run;
      return unhandled;
    }
  }
}

/** When each step started, in ms by the page's clock. */
export type StepStarts = Partial<Record<GenerationStep, number>>;

/**
 * Record that `step` is running as of `now`. A step that already has a start
 * keeps it, so a repeated report does not restart its clock. Returns the same
 * object when nothing changed, so a caller can skip a re-render.
 */
export function markStep(starts: StepStarts, step: GenerationStep, now: number): StepStarts {
  if (starts[step] !== undefined) return starts;
  return { ...starts, [step]: now };
}

export type StepStatus = "done" | "running" | "waiting";

export interface StepView {
  step: GenerationStep;
  status: StepStatus;
  /** A finished step's duration: from its start to the next step's start. */
  durationMs?: number;
  /** A running step's time so far. */
  runningForMs?: number;
}

/**
 * What each step shows at `now`, with `current` running. A step before it is
 * done, and its duration is measured only when both its start and the next
 * step's start were recorded; otherwise it is done with no number.
 */
export function stepViews(starts: StepStarts, current: GenerationStep, now: number): StepView[] {
  const currentIndex = GENERATION_STEPS.indexOf(current);
  return GENERATION_STEPS.map((step, index): StepView => {
    if (index > currentIndex) return { step, status: "waiting" };
    const start = starts[step];
    if (index === currentIndex) {
      return {
        step,
        status: "running",
        runningForMs: start === undefined ? undefined : Math.max(0, now - start),
      };
    }
    const end = starts[GENERATION_STEPS[index + 1]];
    return {
      step,
      status: "done",
      durationMs: start !== undefined && end !== undefined ? Math.max(0, end - start) : undefined,
    };
  });
}

/** Whether drafting has run for LONG_WAIT_MS or more by `now`. */
export function isLongWait(starts: StepStarts, now: number): boolean {
  const drafting = starts.drafting;
  return drafting !== undefined && now - drafting >= LONG_WAIT_MS;
}
