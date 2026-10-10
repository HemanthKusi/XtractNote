// ─────────────────────────────────────────────────────────────
// lib/generation/poll.ts
//
// The rules for watching a generation job: given the latest report on it,
// whether to keep polling, and if not, how the wait ended.
//
// Pure — no fetching, no timers. The page owns the loop that waits and asks;
// this decides what each answer means, so the rules can be checked without a
// browser (scripts/check-poll.mjs).
//
// Imports are type-only on purpose: node strips them, which is what lets the
// check script import this file directly.
// ─────────────────────────────────────────────────────────────

import type { FetchJobResult } from "@/lib/api/generate";
import type { GenerateFailReason, JobStatus } from "@/lib/content/types";

/** How often the page asks for the job's state. */
export const POLL_EVERY_MS = 2_000;

/**
 * How many checks in a row may fail for a passing reason — the network, the
 * server briefly unable to check — before the page stops waiting.
 */
export const MAX_FAILURES_IN_A_ROW = 5;

/**
 * How long the page waits before it stops. Well past the backend's sweep, which
 * fails a lost run a few minutes after its heartbeat goes quiet, so a dead job
 * normally reports as failed before this is reached.
 */
export const STOP_WAITING_AFTER_MS = 10 * 60_000;

export interface PollState {
  failuresInARow: number;
}

export const INITIAL_POLL_STATE: PollState = { failuresInARow: 0 };

/**
 * How a check ended. `stopped-waiting` is not a failure: the run may still
 * finish, and its result then lands in drafts.
 */
export type PollDecision =
  | { kind: "keep-polling"; state: PollState }
  | { kind: "completed"; resultId: string }
  | { kind: "failed"; reason: GenerateFailReason }
  | { kind: "stopped-waiting" };

/** Whether a job in `status` is finished. A new status fails to compile here until it is placed. */
export function isTerminal(status: JobStatus): boolean {
  switch (status) {
    case "completed":
    case "failed":
      return true;
    case "pending":
    case "fetching":
    case "reading":
    case "understanding":
    case "drafting":
    case "polishing":
      return false;
    default: {
      const unhandled: never = status;
      return unhandled;
    }
  }
}

// The codes a failed job records that the create page has copy for. The
// backend's set is open, so anything else is `unknown`.
const JOB_FAILURE_REASONS: readonly GenerateFailReason[] = [
  "empty-transcript",
  "transcript-too-long",
  "unknown-content-type",
  "provider-misconfigured",
  "generation-failed",
  "invalid-structured-output",
  "draft-not-saved",
  "unexpected",
  "interrupted",
];

/** The reason to show for a failed job's errorCode. */
export function reasonFromJobCode(code: string | null): GenerateFailReason {
  return code !== null && (JOB_FAILURE_REASONS as readonly string[]).includes(code)
    ? (code as GenerateFailReason)
    : "unknown";
}

/**
 * What the latest check means.
 *
 * A finished job is reported even past the waiting limit — a result that has
 * arrived is shown, not discarded for being late.
 */
export function nextPollDecision(
  result: FetchJobResult,
  state: PollState,
  waitedMs: number,
): PollDecision {
  const outOfTime = waitedMs >= STOP_WAITING_AFTER_MS;

  if (result.ok) {
    const { job } = result;
    if (job.status === "completed") {
      // A completed job always carries its result; one that does not is a
      // contract break, not a success.
      return job.resultId
        ? { kind: "completed", resultId: job.resultId }
        : { kind: "failed", reason: "unknown" };
    }
    if (job.status === "failed") {
      return { kind: "failed", reason: reasonFromJobCode(job.errorCode) };
    }
    return outOfTime
      ? { kind: "stopped-waiting" }
      : { kind: "keep-polling", state: INITIAL_POLL_STATE };
  }

  if (!result.transient) {
    return { kind: "failed", reason: result.reason };
  }

  const failuresInARow = state.failuresInARow + 1;
  return failuresInARow >= MAX_FAILURES_IN_A_ROW || outOfTime
    ? { kind: "stopped-waiting" }
    : { kind: "keep-polling", state: { failuresInARow } };
}
