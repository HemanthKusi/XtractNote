/**
 * check-poll
 *
 * Fails when the rules for watching a generation job stop deciding what they
 * say they decide.
 *
 * ── Why this exists ──
 * Every outcome here renders cleanly, which is what makes a wrong one easy to
 * miss: a job reported failed while it is still running, a wait that never
 * ends, a passing network blip treated as the end of a run, or a finished
 * result thrown away for arriving after the waiting limit.
 *
 * ── Why it imports rather than re-states ──
 * As with check-fold: it imports the real `poll.ts`. That file's imports are
 * type-only, which node's type stripping removes, so plain node can load it.
 */

import {
  INITIAL_POLL_STATE,
  MAX_FAILURES_IN_A_ROW,
  STOP_WAITING_AFTER_MS,
  isTerminal,
  nextPollDecision,
  reasonFromJobCode,
} from "../src/lib/generation/poll.ts";

let failed = 0;
let run = 0;

function check(name, actual, expected) {
  run++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failed++;
    console.error(`  FAIL  ${name}\n          expected ${e}\n          actual   ${a}`);
  }
}

const job = (status, extra = {}) => ({
  ok: true,
  job: {
    jobId: "j",
    status,
    progress: null,
    resultId: null,
    errorCode: null,
    createdAt: "2026-10-09T12:00:00+00:00",
    completedAt: null,
    ...extra,
  },
});
const passing = (reason = "network") => ({ ok: false, reason, transient: true });
const final = (reason) => ({ ok: false, reason, transient: false });
const fresh = INITIAL_POLL_STATE;
const LATE = STOP_WAITING_AFTER_MS;

// ── A running job ──
for (const status of ["pending", "fetching", "reading", "understanding", "drafting", "polishing"]) {
  check(`${status} keeps polling`, nextPollDecision(job(status), fresh, 0).kind, "keep-polling");
  check(`${status} is not terminal`, isTerminal(status), false);
}
check("a good report clears earlier failures",
  nextPollDecision(job("drafting"), { failuresInARow: 3 }, 0),
  { kind: "keep-polling", state: { failuresInARow: 0 } });

// ── A finished job ──
check("completed carries its result",
  nextPollDecision(job("completed", { resultId: "r1" }), fresh, 0),
  { kind: "completed", resultId: "r1" });
check("completed with no result is a failure, not a success",
  nextPollDecision(job("completed"), fresh, 0),
  { kind: "failed", reason: "unknown" });
check("failed carries the job's reason",
  nextPollDecision(job("failed", { errorCode: "interrupted" }), fresh, 0),
  { kind: "failed", reason: "interrupted" });
check("a failed job with a code the page has no copy for is unknown",
  nextPollDecision(job("failed", { errorCode: "some-future-node-failed" }), fresh, 0),
  { kind: "failed", reason: "unknown" });
check("completed and failed are terminal", [isTerminal("completed"), isTerminal("failed")], [true, true]);

// ── The waiting limit ──
check("a running job past the limit stops the wait",
  nextPollDecision(job("drafting"), fresh, LATE).kind, "stopped-waiting");
check("just under the limit keeps polling",
  nextPollDecision(job("drafting"), fresh, LATE - 1).kind, "keep-polling");
check("a result that arrives after the limit is still shown",
  nextPollDecision(job("completed", { resultId: "r1" }), fresh, LATE * 2),
  { kind: "completed", resultId: "r1" });
check("a failure that arrives after the limit is still shown",
  nextPollDecision(job("failed", { errorCode: "generation-failed" }), fresh, LATE * 2).kind, "failed");

// ── Checks that failed ──
check("one passing failure keeps polling, counted",
  nextPollDecision(passing(), fresh, 0),
  { kind: "keep-polling", state: { failuresInARow: 1 } });
check("passing failures up to the limit keep polling",
  nextPollDecision(passing(), { failuresInARow: MAX_FAILURES_IN_A_ROW - 2 }, 0).kind, "keep-polling");
check("the limit of passing failures stops the wait — not a failure",
  nextPollDecision(passing(), { failuresInARow: MAX_FAILURES_IN_A_ROW - 1 }, 0),
  { kind: "stopped-waiting" });
check("a passing failure past the time limit stops the wait",
  nextPollDecision(passing("auth-unavailable"), fresh, LATE).kind, "stopped-waiting");
check("a final failure ends the run with its reason at once",
  nextPollDecision(final("not-authenticated"), fresh, 0),
  { kind: "failed", reason: "not-authenticated" });
check("a missing job ends the run",
  nextPollDecision(final("job-not-found"), { failuresInARow: 4 }, 0),
  { kind: "failed", reason: "job-not-found" });

// ── Reasons ──
check("no code is unknown", reasonFromJobCode(null), "unknown");
for (const code of ["provider-misconfigured", "generation-failed", "invalid-structured-output",
                    "draft-not-saved", "unexpected", "interrupted"]) {
  check(`${code} is shown as itself`, reasonFromJobCode(code), code);
}
check("a request-time code on a job is not trusted blindly", reasonFromJobCode("generation-busy"), "unknown");

if (failed > 0) {
  console.error(`\ncheck-poll: ${failed} of ${run} checks FAILED.`);
  process.exit(1);
}

console.log(`check-poll: ${run} checks passed.`);
