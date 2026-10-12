/**
 * check-stage
 *
 * Fails when the rules for which generation step is running, and what each
 * step shows, stop doing what they say.
 *
 * ── Why this exists ──
 * Every wrong answer here renders cleanly: a step shown as done before it
 * happened, a duration that is a guess, a clock that restarts on every report,
 * or a status the screen silently never lights. The screen exists to show
 * only what happened, so these are the claims it must not get wrong.
 *
 * ── Why it imports rather than re-states ──
 * As with check-poll: it imports the real `stage.ts`, whose imports are
 * type-only, so plain node can load it.
 */

import {
  GENERATION_STEPS,
  LONG_WAIT_MS,
  countWords,
  currentStep,
  isLongWait,
  markStep,
  stepForStatus,
  stepViews,
} from "../src/lib/generation/stage.ts";
import { JOB_STATUSES } from "../src/lib/content/types.ts";

let failed = 0;
let run = 0;

function check(name, actual, expected) {
  run++;
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failed++;
    console.error(`  FAIL  ${name}\n          expected ${JSON.stringify(expected)}\n          got      ${JSON.stringify(actual)}`);
  }
}

// ── Statuses ──
check("pending is still starting", stepForStatus("pending"), "starting");
check("drafting is drafting", stepForStatus("drafting"), "drafting");
for (const status of ["fetching", "reading", "understanding", "polishing"]) {
  check(`${status}, which nothing writes yet, sits under drafting`, stepForStatus(status), "drafting");
}
for (const status of JOB_STATUSES) {
  check(`${status} maps to a step that exists`, GENERATION_STEPS.includes(stepForStatus(status)), true);
}

// ── The page's own progress ──
check("fetching the transcript is the transcript step", currentStep("not-sent", false, null), "transcript");
check(
  "the work between the transcript and the request counts as starting, not as the transcript",
  currentStep("not-sent", true, null),
  "starting",
);
check("an unanswered start is starting", currentStep("sent", true, null), "starting");
check("an accepted job no check has reported is still starting", currentStep("accepted", true, null), "starting");
check("an accepted job reported pending is still starting", currentStep("accepted", true, "pending"), "starting");
check("an accepted job reported drafting is drafting", currentStep("accepted", true, "drafting"), "drafting");

// ── Marking steps ──
{
  const once = markStep({}, "transcript", 1000);
  check("a step's start is recorded", once, { transcript: 1000 });
  check("a repeated report does not restart a step's clock", markStep(once, "transcript", 5000), once);
  check("nothing changed returns the same object", markStep(once, "transcript", 5000) === once, true);
}

// ── What each step shows ──
const starts = { transcript: 0, starting: 2300, drafting: 3000 };
check("a finished step shows the time the page measured", stepViews(starts, "drafting", 9000), [
  { step: "transcript", status: "done", durationMs: 2300 },
  { step: "starting", status: "done", durationMs: 700 },
  { step: "drafting", status: "running", runningForMs: 6000 },
]);
check("steps after the running one are waiting, with no numbers", stepViews({ transcript: 0 }, "transcript", 1500), [
  { step: "transcript", status: "running", runningForMs: 1500 },
  { step: "starting", status: "waiting" },
  { step: "drafting", status: "waiting" },
]);
{
  // The transcript started at 0, but the step after it was never recorded.
  // Checked field by field rather than by JSON comparison: JSON drops an
  // undefined field, so that comparison cannot tell a missing number apart
  // from a field that was never there.
  const transcript = stepViews({ transcript: 0, drafting: 3000 }, "drafting", 4000)[0];
  check("a finished step whose end was never recorded is done", transcript.status, "done");
  check(
    "a finished step whose end was never recorded has no number, not a guess",
    transcript.durationMs === undefined,
    true,
  );
}

// ── The long wait ──
check("drafting short of the threshold is not a long wait", isLongWait(starts, 3000 + LONG_WAIT_MS - 1), false);
check("drafting at the threshold is a long wait", isLongWait(starts, 3000 + LONG_WAIT_MS), true);
check("a run that has not reached drafting is never a long wait", isLongWait({ transcript: 0 }, LONG_WAIT_MS * 2), false);

// ── Words ──
check("words are counted across any whitespace", countWords("  one two\nthree\tfour  "), 4);
check("an empty transcript has no words", countWords("   "), 0);

if (failed > 0) {
  console.error(`\ncheck-stage: ${failed} of ${run} checks FAILED.`);
  process.exit(1);
}

console.log(`check-stage: ${run} checks passed.`);
