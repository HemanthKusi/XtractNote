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

/**
 * The shortfall in a refusal's detail, or null when any part is missing or
 * out of shape — the refusal is then shown without numbers.
 */
export function shortfallFrom(detail: unknown): CreditShortfall | null {
  if (typeof detail !== "object" || detail === null) return null;
  const d = detail as Record<string, unknown>;
  const refill = d.nextRefillAt;
  if (!isCount(d.cost, 1) || !isCount(d.balance, 0)) return null;
  if (typeof refill !== "string" || Number.isNaN(Date.parse(refill))) return null;
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
