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
  currentStep,
  isLongWait,
  markStep,
  stepForStatus,
  stepViews,
} from "../src/lib/generation/stage.ts";
import { JOB_STATUSES } from "../src/lib/content/types.ts";

let failed = 0;
let run = 0;

// Equal by value, comparing numbers directly. Through JSON, NaN and Infinity
// both become null, so a check expecting null could not fail on them.
function same(a, b) {
  if (typeof a === "number" || typeof b === "number") {
    return a === b || (Number.isNaN(a) && Number.isNaN(b));
  }
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key) && same(a[key], b[key]));
}

function shown(value) {
  return typeof value === "number" ? String(value) : JSON.stringify(value);
}

function check(name, actual, expected) {
  run++;
  const ok = same(actual, expected);
  if (!ok) {
    failed++;
    console.error(`  FAIL  ${name}\n          expected ${shown(expected)}\n          got      ${shown(actual)}`);
  }
}

// ── The order ──
check("the steps run starting, then the transcript, then drafting", GENERATION_STEPS, [
  "starting",
  "transcript",
  "drafting",
]);

// ── Statuses ──
check("pending is still starting", stepForStatus("pending"), "starting");
for (const status of ["fetching", "reading", "understanding"]) {
  check(`${status} is the job working on its transcript, never drafting`, stepForStatus(status), "transcript");
}
check("drafting is drafting", stepForStatus("drafting"), "drafting");
check("polishing, which nothing writes yet, sits under drafting", stepForStatus("polishing"), "drafting");
for (const status of JOB_STATUSES) {
  check(`${status} maps to a step that exists`, GENERATION_STEPS.includes(stepForStatus(status)), true);
}

// ── The page's own progress ──
check("preparing the request is starting", currentStep("not-sent", null), "starting");
check("an unanswered start is starting", currentStep("sent", null), "starting");
check("an accepted job no check has reported is still starting", currentStep("accepted", null), "starting");
check("an accepted job reported pending is still starting", currentStep("accepted", "pending"), "starting");
check("an accepted job reported fetching is reading its transcript", currentStep("accepted", "fetching"), "transcript");
check("an accepted job reported understanding is still on its transcript", currentStep("accepted", "understanding"), "transcript");
check("an accepted job reported drafting is drafting", currentStep("accepted", "drafting"), "drafting");

// ── Marking steps ──
{
  const once = markStep({}, "transcript", 1000);
  check("a step's start is recorded", once, { transcript: 1000 });
  check("a repeated report does not restart a step's clock", markStep(once, "transcript", 5000), once);
  check("nothing changed returns the same object", markStep(once, "transcript", 5000) === once, true);
}

// ── What each step shows ──
const starts = { starting: 0, transcript: 700, drafting: 3000 };
check("a finished step shows the time the page measured", stepViews(starts, "drafting", 9000), [
  { step: "starting", status: "done", durationMs: 700 },
  { step: "transcript", status: "done", durationMs: 2300 },
  { step: "drafting", status: "running", runningForMs: 6000 },
]);
check("steps after the running one are waiting, with no numbers", stepViews({ starting: 0 }, "starting", 1500), [
  { step: "starting", status: "running", runningForMs: 1500 },
  { step: "transcript", status: "waiting" },
  { step: "drafting", status: "waiting" },
]);
{
  // Starting began at 0, but the step after it was never recorded — a reused
  // transcript can be read between two checks, so fetching is never reported.
  // Checked field by field rather than by JSON comparison: JSON drops an
  // undefined field, so that comparison cannot tell a missing number apart
  // from a field that was never there.
  const views = stepViews({ starting: 0, drafting: 3000 }, "drafting", 4000);
  check("a finished step whose end was never recorded is done", views[0].status, "done");
  check(
    "a finished step whose end was never recorded has no number, not a guess",
    views[0].durationMs === undefined,
    true,
  );
  check("a step the page never saw running is still done", views[1].status, "done");
  check("a step the page never saw running has no number", views[1].durationMs === undefined, true);
}

// ── The long wait ──
check("drafting short of the threshold is not a long wait", isLongWait(starts, 3000 + LONG_WAIT_MS - 1), false);
check("drafting at the threshold is a long wait", isLongWait(starts, 3000 + LONG_WAIT_MS), true);
check("a run that has not reached drafting is never a long wait", isLongWait({ transcript: 0 }, LONG_WAIT_MS * 2), false);

if (failed > 0) {
  console.error(`\ncheck-stage: ${failed} of ${run} checks FAILED.`);
  process.exit(1);
}

console.log(`check-stage: ${run} checks passed.`);
