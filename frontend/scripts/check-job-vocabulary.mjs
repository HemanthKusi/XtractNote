/**
 * check-job-vocabulary
 *
 * Fails when the frontend's list of generation-job statuses stops matching the
 * statuses the database allows.
 *
 * ── Why this exists ──
 * The statuses are written three times, by hand, in three places: the CHECK
 * constraint in migration 004, `LEGAL_STATUSES` in the backend (pinned to the
 * migration by its own test), and `JOB_STATUSES` here. The frontend reads a
 * job's status off the wire and stops polling at a terminal one. A status added
 * to the database and not here would fail quietly — a job the page never
 * recognises, polled until it gives up.
 *
 * ── Why it imports rather than re-states ──
 * As with check-fold: it imports the real `JOB_STATUSES`. `types.ts` has only
 * type imports, which node's type stripping removes, so plain node can load it.
 */

import { readFileSync } from "node:fs";

import {
  JOB_STATUSES,
  TERMINAL_JOB_STATUSES,
} from "../src/lib/content/types.ts";

const MIGRATION = new URL("../../database/004_create_jobs.sql", import.meta.url);

let failed = 0;
let run = 0;

function check(name, ok, detail) {
  run++;
  if (!ok) {
    failed++;
    console.error(`  FAIL  ${name}${detail ? `\n          ${detail}` : ""}`);
  }
}

const sql = readFileSync(MIGRATION, "utf8");
const constraint = sql.match(/check\s*\(\s*status\s+in\s*\(([\s\S]*?)\)\s*\)/i);
check("migration 004 has a status CHECK constraint", constraint !== null);

if (constraint) {
  const allowed = [...constraint[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  const listed = [...JOB_STATUSES];

  const missing = allowed.filter((s) => !listed.includes(s));
  const extra = listed.filter((s) => !allowed.includes(s));

  check("every status the database allows is in JOB_STATUSES", missing.length === 0, `missing: ${missing.join(", ")}`);
  check("JOB_STATUSES names nothing the database refuses", extra.length === 0, `extra: ${extra.join(", ")}`);
  check("JOB_STATUSES has no duplicates", new Set(listed).size === listed.length);
}

check(
  "the terminal statuses are completed and failed, and both are statuses",
  TERMINAL_JOB_STATUSES.length === 2 &&
    TERMINAL_JOB_STATUSES.every((s) => JOB_STATUSES.includes(s)) &&
    TERMINAL_JOB_STATUSES.includes("completed") &&
    TERMINAL_JOB_STATUSES.includes("failed"),
);

if (failed > 0) {
  console.error(`\ncheck-job-vocabulary: ${failed} of ${run} checks FAILED.`);
  process.exit(1);
}

console.log(`check-job-vocabulary: ${run} checks passed.`);
