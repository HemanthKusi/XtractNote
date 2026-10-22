/**
 * check-rate-limit
 *
 * Fails when reading a `rate-limited` refusal's wait, or saying it, stops
 * doing what it says.
 *
 * ── Why this exists ──
 * A wrong wait renders cleanly: "Try again in 0 minutes" from a zero, or a
 * minute too early from rounding down, and the user's next try is refused
 * again. A wait from a malformed reply shown as if the server had named it.
 *
 * ── Why it imports rather than re-states ──
 * As with check-credits: it imports the real `message.ts`, which imports
 * nothing, so plain node can load it.
 */

import { rateLimitedMessage, retryAfterFrom } from "../src/lib/rate-limit/message.ts";

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

const DETAIL = { code: "rate-limited", message: "limited", retryAfterSeconds: 1187 };

// ── Reading the wait ──
check("the wait is read", retryAfterFrom(DETAIL), 1187);
check("one second is a wait", retryAfterFrom({ ...DETAIL, retryAfterSeconds: 1 }), 1);
check("the whole window is a wait", retryAfterFrom({ ...DETAIL, retryAfterSeconds: 3600 }), 3600);
check("no detail has no wait", retryAfterFrom(null), null);
check("a detail without a wait has none", retryAfterFrom({ code: "rate-limited" }), null);
check("zero is not a wait", retryAfterFrom({ ...DETAIL, retryAfterSeconds: 0 }), null);
check("a negative is not a wait", retryAfterFrom({ ...DETAIL, retryAfterSeconds: -5 }), null);
check("past the window is not a wait", retryAfterFrom({ ...DETAIL, retryAfterSeconds: 3601 }), null);
check("a fraction is not a wait", retryAfterFrom({ ...DETAIL, retryAfterSeconds: 12.5 }), null);
check("a string is not a wait", retryAfterFrom({ ...DETAIL, retryAfterSeconds: "60" }), null);
check("NaN is not a wait", retryAfterFrom({ ...DETAIL, retryAfterSeconds: Number.NaN }), null);
check("Infinity is not a wait", retryAfterFrom({ ...DETAIL, retryAfterSeconds: Number.POSITIVE_INFINITY }), null);

// ── Saying it ──
check(
  "a search names the wait in whole minutes",
  rateLimitedMessage("search", 1187),
  "You've searched a lot in the last hour. Try again in 20 minutes.",
);
check("minutes round up, never down", rateLimitedMessage("search", 61), "You've searched a lot in the last hour. Try again in 2 minutes.");
check("exactly a minute is a minute", rateLimitedMessage("search", 60), "You've searched a lot in the last hour. Try again in a minute.");
check("under a minute is a minute, never zero", rateLimitedMessage("search", 1), "You've searched a lot in the last hour. Try again in a minute.");
check("the whole window is sixty minutes", rateLimitedMessage("search", 3600), "You've searched a lot in the last hour. Try again in 60 minutes.");
check(
  "a lookup says what was limited",
  rateLimitedMessage("lookup", 300),
  "You've opened a lot of videos in the last hour. Try again in 5 minutes.",
);
check(
  "pricing says what was limited",
  rateLimitedMessage("pricing", 300),
  "You've priced or started a lot of videos in the last hour. Try again in 5 minutes.",
);
check(
  "without a wait, later",
  rateLimitedMessage("search", null),
  "You've searched a lot in the last hour. Try again later.",
);

if (failed > 0) {
  console.error(`\ncheck-rate-limit: ${failed} of ${run} checks FAILED.`);
  process.exit(1);
}

console.log(`check-rate-limit: ${run} checks passed.`);
