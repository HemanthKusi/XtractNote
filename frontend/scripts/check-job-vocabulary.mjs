/**
 * check-job-vocabulary
 *
 * Fails when a status list in the frontend stops matching the statuses the
 * database allows: generation jobs against migration 004, and generated
 * content against migration 003.
 *
 * ── Why this exists ──
 * Each list is written by hand in more than one place: a CHECK constraint in a
 * migration, and a list here the frontend checks every status it reads against
 * (the job statuses also live in the backend, pinned to their migration by its
 * own test). A status added to the database and not here is read as unknown —
 * a job's report becomes unreadable, and a content row's status is dropped.
 *
 * ── Why it imports rather than re-states ──
 * As with check-fold: it imports the real lists. `types.ts` has only type
 * imports, which node's type stripping removes, so plain node can load it.
 */

import { readFileSync } from "node:fs";

import { CONTENT_STATUSES, JOB_STATUSES } from "../src/lib/content/types.ts";

let failed = 0;
let run = 0;

function check(name, ok, detail) {
  run++;
  if (!ok) {
    failed++;
    console.error(`  FAIL  ${name}${detail ? `\n          ${detail}` : ""}`);
  }
}

/** Check one list against the status CHECK constraint in one migration. */
function checkAgainstMigration(listName, listed, migration) {
  const sql = readFileSync(new URL(`../../database/${migration}`, import.meta.url), "utf8");
  const constraint = sql.match(/check\s*\(\s*status\s+in\s*\(([\s\S]*?)\)\s*\)/i);
  check(`${migration} has a status CHECK constraint`, constraint !== null);
  if (!constraint) return;

  const allowed = [...constraint[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  const missing = allowed.filter((s) => !listed.includes(s));
  const extra = listed.filter((s) => !allowed.includes(s));

  check(`every status ${migration} allows is in ${listName}`, missing.length === 0, `missing: ${missing.join(", ")}`);
  check(`${listName} names nothing ${migration} refuses`, extra.length === 0, `extra: ${extra.join(", ")}`);
  check(`${listName} has no duplicates`, new Set(listed).size === listed.length);
}

checkAgainstMigration("JOB_STATUSES", [...JOB_STATUSES], "004_create_jobs.sql");
checkAgainstMigration("CONTENT_STATUSES", [...CONTENT_STATUSES], "003_create_content.sql");

if (failed > 0) {
  console.error(`\ncheck-job-vocabulary: ${failed} of ${run} checks FAILED.`);
  process.exit(1);
}

console.log(`check-job-vocabulary: ${run} checks passed.`);
