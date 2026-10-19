// ─────────────────────────────────────────────────────────────
// lib/credits/cost.ts
//
// What a start costs, as far as the create page knows, and whether the
// balance is known to be short of it. The page decides the start button and
// what follows a credits refusal from these.
//
// Imports only types, which plain node drops, so scripts/check-credits.mjs
// can load it.
// ─────────────────────────────────────────────────────────────

import type { GeneratableContentType, SocialPlatform } from "@/lib/content/types";
import type { CreditBalance, CreditQuote } from "./read";

export type CostState = { phase: "loading" } | { phase: "failed" } | { phase: "ready"; credits: number };

export type BalanceState = { phase: "loading" } | { phase: "failed" } | { phase: "ready"; balance: CreditBalance };

/** The page's quote: for one video, loading, failed or read. */
export type QuoteState = {
  videoId: string;
  state: { phase: "loading" } | { phase: "failed" } | { phase: "ready"; quote: CreditQuote };
};

/**
 * What starting `type` on `videoId` costs, from `quote`; null while no
 * format is chosen (or social has no platform). A quote for another video is
 * treated as not yet loaded.
 */
export function costFor(
  quote: QuoteState | null,
  videoId: string,
  type: GeneratableContentType | null,
  platform: SocialPlatform | null,
): CostState | null {
  if (!type || (type === "social" && !platform)) return null;
  if (!quote || quote.videoId !== videoId || quote.state.phase === "loading") return { phase: "loading" };
  if (quote.state.phase === "failed") return { phase: "failed" };
  const price = quote.state.quote.prices[type];
  return price === undefined ? { phase: "failed" } : { phase: "ready", credits: price };
}

/** How many credits the start is short by, or null when it is not known to be short. */
export function shortBy(cost: CostState, balance: BalanceState): number | null {
  if (cost.phase !== "ready" || balance.phase !== "ready") return null;
  const gap = cost.credits - balance.balance.balance;
  return gap > 0 ? gap : null;
}
