// ─────────────────────────────────────────────────────────────
// lib/credits/shortfall.ts
//
// Saying a credits refusal in one sentence, and the refill date it names.
// Reading the refusal is lib/credits/read.ts.
//
// Imports only a type, which plain node drops, so scripts/check-credits.mjs
// can load it.
// ─────────────────────────────────────────────────────────────

import type { CreditShortfall } from "./read";

interface DateOptions {
  locale?: string;
  timeZone?: string;
}

function credits(count: number): string {
  return `${count} ${count === 1 ? "credit" : "credits"}`;
}

/**
 * "30 October": the day `iso` falls on in `timeZone` (the viewer's own when
 * omitted), so a refill late on the 30th in UTC can read as the 31st.
 */
export function refillDate(iso: string, options: DateOptions = {}): string {
  return new Intl.DateTimeFormat(options.locale ?? "en-GB", {
    day: "numeric",
    month: "long",
    timeZone: options.timeZone,
  }).format(new Date(iso));
}

/** "This costs 2 credits and you have 1. Your credits refill on 30 October." */
export function shortfallMessage(shortfall: CreditShortfall, options: DateOptions = {}): string {
  return (
    `This costs ${credits(shortfall.cost)} and you have ${shortfall.balance}. ` +
    `Your credits refill on ${refillDate(shortfall.nextRefillAt, options)}.`
  );
}
