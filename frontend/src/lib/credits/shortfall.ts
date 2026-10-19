// ─────────────────────────────────────────────────────────────
// lib/credits/shortfall.ts
//
// A start refused for credits ("credits-short") carries what it would have
// cost, what the user has, and when their credits refill. This reads those
// from the refusal and says them in one sentence.
//
// Imports nothing, so scripts/check-credits.mjs can load it in plain node.
// ─────────────────────────────────────────────────────────────

export interface CreditShortfall {
  cost: number;
  balance: number;
  /** ISO 8601 with an offset, as the backend sends it. */
  nextRefillAt: string;
}

function isCount(value: unknown, minimum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum;
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
  if (typeof detail !== "object" || detail === null) return null;
  const d = detail as Record<string, unknown>;
  const refill = d.nextRefillAt;
  if (!isCount(d.cost, 1) || !isCount(d.balance, 0)) return null;
  if (!isZonedTime(refill)) return null;
  return { cost: d.cost, balance: d.balance, nextRefillAt: refill };
}

function credits(count: number): string {
  return `${count} ${count === 1 ? "credit" : "credits"}`;
}

/**
 * "This costs 2 credits and you have 1. Your credits refill on 30 October."
 *
 * The date is shown in `timeZone` (the viewer's own when omitted), so a refill
 * late on the 30th in UTC can read as the 31st where the viewer is.
 */
export function shortfallMessage(
  shortfall: CreditShortfall,
  options: { locale?: string; timeZone?: string } = {},
): string {
  const date = new Intl.DateTimeFormat(options.locale ?? "en-GB", {
    day: "numeric",
    month: "long",
    timeZone: options.timeZone,
  }).format(new Date(shortfall.nextRefillAt));
  return (
    `This costs ${credits(shortfall.cost)} and you have ${shortfall.balance}. ` +
    `Your credits refill on ${date}.`
  );
}
