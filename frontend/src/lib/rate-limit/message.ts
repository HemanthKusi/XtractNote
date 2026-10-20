// ─────────────────────────────────────────────────────────────
// lib/rate-limit/message.ts
//
// Reading a `rate-limited` refusal's wait, and saying it in a sentence.
//
// Each signed-in user has an hourly limit on the calls that spend the
// project's YouTube quota: searching, looking a video up, and pricing one
// (a start or a quote). A refusal names how long until the next is allowed,
// as `retryAfterSeconds` — read here, because the browser cannot read the
// Retry-After header from another origin.
//
// Imports nothing, so scripts/check-rate-limit.mjs can load it.
// ─────────────────────────────────────────────────────────────

/** The longest wait a refusal can name: the window the limits are counted over. */
const WINDOW_SECONDS = 3600;

/** What the user was doing when they were refused. */
export type LimitedActivity = "search" | "lookup" | "pricing";

const LEAD: Record<LimitedActivity, string> = {
  search: "You've searched a lot in the last hour.",
  lookup: "You've opened a lot of videos in the last hour.",
  pricing: "You've priced or started a lot of videos in the last hour.",
};

/**
 * The refusal's `retryAfterSeconds`: a whole number of seconds from 1 to the
 * window, or null when the detail does not carry one.
 */
export function retryAfterFrom(detail: Record<string, unknown> | null): number | null {
  const seconds = detail?.retryAfterSeconds;
  return typeof seconds === "number" && Number.isInteger(seconds) && seconds >= 1 && seconds <= WINDOW_SECONDS
    ? seconds
    : null;
}

/** "in 12 minutes", rounded up so the user is never told to come back too early. */
function waitPhrase(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "in a minute" : `in ${minutes} minutes`;
}

/**
 * "You've searched a lot in the last hour. Try again in 12 minutes." Without
 * a wait to name, "Try again later."
 */
export function rateLimitedMessage(activity: LimitedActivity, retryAfterSeconds: number | null): string {
  const when = retryAfterSeconds === null ? "later" : waitPhrase(retryAfterSeconds);
  return `${LEAD[activity]} Try again ${when}.`;
}
