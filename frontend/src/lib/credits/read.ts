// ─────────────────────────────────────────────────────────────
// lib/credits/read.ts
//
// What the backend says about credits, read and checked: the balance, a
// quote for a video, and a start refused for credits. Anything out of shape
// is null, never data.
//
// Imports nothing, so scripts/check-credits.mjs can load it in plain node.
// ─────────────────────────────────────────────────────────────

export interface CreditShortfall {
  cost: number;
  balance: number;
  /** ISO 8601 with an offset, as the backend sends it. */
  nextRefillAt: string;
}

export interface CreditBalance {
  balance: number;
  /** What each refill resets the balance to. */
  allowance: number;
  /** ISO 8601 with an offset, as the backend sends it. */
  nextRefillAt: string;
}

export interface CreditQuote {
  videoId: string;
  lengthSeconds: number;
  /** Each format's price on this video, keyed by content type. */
  prices: Readonly<Record<string, number>>;
}

function isCount(value: unknown, minimum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

// A date and time with its offset, each field in range. `Date.parse` alone
// would also take a bare date, a time with no offset, and a day the month does
// not have — rolling 30 February into March — and any of those can name a day
// the server did not send.
const ZONED_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function daysIn(year: number, month: number): number {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return month === 2 && leap ? 29 : DAYS_IN_MONTH[month - 1];
}

function isZonedTime(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ZONED_TIME.exec(value);
  if (match === null) return false;
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
  const [offsetHour, offsetMinute] = [match[8], match[9]].map((part) => Number(part ?? 0));
  return (
    month >= 1 && month <= 12 &&
    day >= 1 && day <= daysIn(year, month) &&
    hour <= 23 && minute <= 59 && second <= 59 &&
    offsetHour <= 23 && offsetMinute <= 59
  );
}

/**
 * The shortfall in a refusal's detail, or null when any part is missing or
 * out of shape — the refusal is then shown without numbers.
 */
export function shortfallFrom(detail: unknown): CreditShortfall | null {
  const d = asRecord(detail);
  if (d === null) return null;
  const refill = d.nextRefillAt;
  if (!isCount(d.cost, 1) || !isCount(d.balance, 0)) return null;
  if (!isZonedTime(refill)) return null;
  return { cost: d.cost, balance: d.balance, nextRefillAt: refill };
}

/** The balance in GET /api/credits's body, or null. */
export function balanceFrom(body: unknown): CreditBalance | null {
  const b = asRecord(body);
  if (b === null || !isCount(b.balance, 0) || !isCount(b.allowance, 1) || !isZonedTime(b.nextRefillAt)) return null;
  return { balance: b.balance, allowance: b.allowance, nextRefillAt: b.nextRefillAt };
}

/**
 * The quote in GET /api/credits/quote's body, or null. Every price must be a
 * whole number of credits, at least one; a single bad one refuses the quote
 * rather than showing the rest.
 */
export function quoteFrom(body: unknown): CreditQuote | null {
  const q = asRecord(body);
  if (q === null || typeof q.videoId !== "string" || !isCount(q.lengthSeconds, 1)) return null;
  const prices = asRecord(q.prices);
  if (prices === null) return null;
  const entries = Object.entries(prices);
  if (entries.length === 0 || !entries.every(([, price]) => isCount(price, 1))) return null;
  return { videoId: q.videoId, lengthSeconds: q.lengthSeconds, prices: prices as Record<string, number> };
}
