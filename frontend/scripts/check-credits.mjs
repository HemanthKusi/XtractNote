/**
 * check-credits
 *
 * Fails when reading or saying a credits refusal stops doing what it says.
 *
 * ── Why this exists ──
 * A wrong answer here renders cleanly: a price or balance from a malformed
 * reply shown as if it were real, "1 credits", or a refill date a day off
 * because it was shown in the wrong time zone. The user decides whether to
 * wait on what this says.
 *
 * ── Why it imports rather than re-states ──
 * As with check-stage: it imports the real `shortfall.ts`, which imports
 * nothing, so plain node can load it.
 */

import { shortfallFrom, shortfallMessage } from "../src/lib/credits/shortfall.ts";

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

const REFILL = "2026-10-30T23:30:49.949249+00:00";
const DETAIL = { code: "credits-short", message: "short", cost: 2, balance: 1, nextRefillAt: REFILL };

// ── Reading the refusal ──
check("a refusal with all three numbers is read", shortfallFrom(DETAIL), { cost: 2, balance: 1, nextRefillAt: REFILL });
check("a zero balance is a balance", shortfallFrom({ ...DETAIL, balance: 0 })?.balance, 0);
for (const [name, detail] of [
  ["no detail", null],
  ["not an object", "credits-short"],
  ["no cost", { ...DETAIL, cost: undefined }],
  ["a cost of zero", { ...DETAIL, cost: 0 }],
  ["a fractional cost", { ...DETAIL, cost: 1.5 }],
  ["a cost as text", { ...DETAIL, cost: "2" }],
  ["a negative balance", { ...DETAIL, balance: -1 }],
  ["no refill time", { ...DETAIL, nextRefillAt: undefined }],
  ["a refill time that is not a date", { ...DETAIL, nextRefillAt: "next month" }],
]) {
  check(`${name} is not read as a shortfall`, shortfallFrom(detail), null);
}

// ── Saying it ──
const shortfall = shortfallFrom(DETAIL);
check(
  "the message names the price, the balance and the refill date",
  shortfallMessage(shortfall, { timeZone: "UTC" }),
  "This costs 2 credits and you have 1. Your credits refill on 30 October.",
);
check(
  "one credit is singular",
  shortfallMessage({ ...shortfall, cost: 1, balance: 0 }, { timeZone: "UTC" }),
  "This costs 1 credit and you have 0. Your credits refill on 30 October.",
);
check(
  "the refill date is the viewer's date, not UTC's",
  shortfallMessage(shortfall, { timeZone: "Asia/Tokyo" }),
  "This costs 2 credits and you have 1. Your credits refill on 31 October.",
);

if (failed > 0) {
  console.error(`\ncheck-credits: ${failed} of ${run} checks FAILED.`);
  process.exit(1);
}

console.log(`check-credits: ${run} checks passed.`);
