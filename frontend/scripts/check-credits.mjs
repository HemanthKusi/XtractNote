/**
 * check-credits
 *
 * Fails when reading the balance, a quote or a credits refusal, or saying a
 * refusal, stops doing what it says.
 *
 * ── Why this exists ──
 * A wrong answer here renders cleanly: a price or balance from a malformed
 * reply shown as if it were real, "1 credits", or a refill date a day off
 * because it was shown in the wrong time zone. The user decides whether to
 * start, or wait, on what this says.
 *
 * ── Why it imports rather than re-states ──
 * As with check-stage: it imports the real `read.ts`, `shortfall.ts` and
 * `cost.ts`, which plain node can load — the first imports nothing, the
 * others only types, which node drops.
 */

import { costFor, shortBy } from "../src/lib/credits/cost.ts";
import { balanceFrom, quoteFrom, shortfallFrom } from "../src/lib/credits/read.ts";
import { refillDate, shortfallMessage } from "../src/lib/credits/shortfall.ts";

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
  // A hole in an array has no key, so comparing keys alone would miss it.
  if (Array.isArray(a) && a.length !== b.length) return false;
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

const REFILL = "2026-10-30T23:30:49.949249+00:00";
const DETAIL = { code: "credits-short", message: "short", cost: 2, balance: 1, nextRefillAt: REFILL };

// ── Reading the refusal ──
check("a refusal with all three numbers is read", shortfallFrom(DETAIL), { cost: 2, balance: 1, nextRefillAt: REFILL });
check("a zero balance is a balance", shortfallFrom({ ...DETAIL, balance: 0 })?.balance, 0);
check(
  "a refill time in Z form is read",
  shortfallFrom({ ...DETAIL, nextRefillAt: "2026-10-30T23:30:49Z" })?.nextRefillAt,
  "2026-10-30T23:30:49Z",
);
check(
  "29 February in a leap year is read",
  shortfallFrom({ ...DETAIL, nextRefillAt: "2028-02-29T00:00:00+05:30" })?.nextRefillAt,
  "2028-02-29T00:00:00+05:30",
);
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
  ["a refill date with no time", { ...DETAIL, nextRefillAt: "2026-10-30" }],
  ["a refill time with no offset", { ...DETAIL, nextRefillAt: "2026-10-30T23:30:49" }],
  ["a refill time that is not a real date", { ...DETAIL, nextRefillAt: "2026-13-40T00:00:00Z" }],
  ["a day February does not have", { ...DETAIL, nextRefillAt: "2026-02-30T00:00:00Z" }],
  ["29 February outside a leap year", { ...DETAIL, nextRefillAt: "2026-02-29T00:00:00Z" }],
  ["a 31st in a 30-day month", { ...DETAIL, nextRefillAt: "2026-04-31T00:00:00Z" }],
  ["the hour 24", { ...DETAIL, nextRefillAt: "2026-10-30T24:00:00Z" }],
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
check("the refill date alone is the viewer's date", refillDate(REFILL, { timeZone: "Asia/Tokyo" }), "31 October");

// ── Reading the balance ──
const BALANCE = { balance: 28, allowance: 30, nextRefillAt: REFILL };
check("a balance with its allowance and refill time is read", balanceFrom(BALANCE), BALANCE);
check("a zero balance is read", balanceFrom({ ...BALANCE, balance: 0 })?.balance, 0);
for (const [name, body] of [
  ["no body", null],
  ["a list", [BALANCE]],
  ["a negative balance", { ...BALANCE, balance: -1 }],
  ["a balance as text", { ...BALANCE, balance: "28" }],
  ["a refill time with no offset", { ...BALANCE, nextRefillAt: "2026-10-30T23:30:49" }],
  ["no allowance", { ...BALANCE, allowance: undefined }],
  ["an allowance of zero", { ...BALANCE, allowance: 0 }],
]) {
  check(`${name} is not read as a balance`, balanceFrom(body), null);
}

// ── Reading a quote ──
const PRICES = { summary: 2, flashcards: 2, quiz: 2, social: 2, notes: 3, research: 3, blog: 3 };
const QUOTE = { videoId: "dQw4w9WgXcQ", lengthSeconds: 4800, prices: PRICES };
check("a quote with every price is read", quoteFrom(QUOTE), QUOTE);
for (const [name, body] of [
  ["no body", null],
  ["no prices", { ...QUOTE, prices: undefined }],
  ["empty prices", { ...QUOTE, prices: {} }],
  ["a price of zero", { ...QUOTE, prices: { ...PRICES, quiz: 0 } }],
  ["a fractional price", { ...QUOTE, prices: { ...PRICES, notes: 2.5 } }],
  ["a price as text", { ...QUOTE, prices: { ...PRICES, blog: "3" } }],
  ["a length of zero", { ...QUOTE, lengthSeconds: 0 }],
  ["no video id", { ...QUOTE, videoId: undefined }],
]) {
  check(`${name} is not read as a quote`, quoteFrom(body), null);
}

// ── What a start costs ──
const VIDEO = QUOTE.videoId;
const READY = { videoId: VIDEO, state: { phase: "ready", quote: QUOTE } };
check("the chosen format's price is the cost", costFor(READY, VIDEO, "notes", null), { phase: "ready", credits: 3 });
check("no format chosen is no cost", costFor(READY, VIDEO, null, null), null);
check("social with no platform is no cost", costFor(READY, VIDEO, "social", null), null);
check("social with a platform is priced", costFor(READY, VIDEO, "social", "linkedin"), { phase: "ready", credits: 2 });
check("no quote yet is loading", costFor(null, VIDEO, "quiz", null), { phase: "loading" });
check("another video's quote is loading", costFor(READY, "aaaaaaaaaaa", "quiz", null), { phase: "loading" });
check("a failed quote is a failed cost", costFor({ videoId: VIDEO, state: { phase: "failed" } }, VIDEO, "quiz", null), { phase: "failed" });
check(
  "a format missing from the quote is a failed cost",
  costFor({ videoId: VIDEO, state: { phase: "ready", quote: { ...QUOTE, prices: { summary: 1 } } } }, VIDEO, "notes", null),
  { phase: "failed" },
);

// ── Known to be short ──
const HAS = (n) => ({ phase: "ready", balance: { balance: n, allowance: 30, nextRefillAt: REFILL } });
const COSTS = (n) => ({ phase: "ready", credits: n });
check("short by the difference", shortBy(COSTS(3), HAS(1)), 2);
check("exactly enough is not short", shortBy(COSTS(3), HAS(3)), null);
check("a loading cost is not known to be short", shortBy({ phase: "loading" }, HAS(0)), null);
check("a failed balance is not known to be short", shortBy(COSTS(3), { phase: "failed" }), null);

if (failed > 0) {
  console.error(`\ncheck-credits: ${failed} of ${run} checks FAILED.`);
  process.exit(1);
}

console.log(`check-credits: ${run} checks passed.`);
