// ─────────────────────────────────────────────────────────────
// lib/api/credits.ts
//
// Frontend client for the credits endpoints: the signed-in user's balance,
// and what each format costs on a video.
//
// Both send the signed-in user's access token. The backend decides who the
// user is from that token alone.
//
// Every response is checked rather than cast: a body this client does not
// recognise is a failure, never data.
// ─────────────────────────────────────────────────────────────

import { API_BASE_URL, REQUEST_TIMEOUT_MS, accessToken, codeOf, detailFrom } from "@/lib/api/backend";
import { balanceFrom, quoteFrom, type CreditBalance, type CreditQuote } from "@/lib/credits/read";

export type BalanceFailReason =
  | "not-authenticated"
  | "auth-unavailable"
  | "balance-unavailable"
  | "network"
  | "unknown";

export type QuoteFailReason =
  | "not-authenticated"
  | "auth-unavailable"
  | "video-not-found"
  | "video-has-no-length"
  | "length-unavailable"
  | "youtube-misconfigured"
  | "rate-limited"
  | "rate-limit-unavailable"
  | "network"
  | "unknown";

export type FetchBalanceResult = { ok: true; balance: CreditBalance } | { ok: false; reason: BalanceFailReason };

export type FetchQuoteResult = { ok: true; quote: CreditQuote } | { ok: false; reason: QuoteFailReason };

// The codes each route refuses with, in detail.code. Checked against these
// before being trusted, so an unexpected string cannot pass as a reason.
const BALANCE_REASONS: readonly BalanceFailReason[] = ["not-authenticated", "auth-unavailable", "balance-unavailable"];
const QUOTE_REASONS: readonly QuoteFailReason[] = [
  "not-authenticated",
  "auth-unavailable",
  "video-not-found",
  "video-has-no-length",
  "length-unavailable",
  "youtube-misconfigured",
  "rate-limited",
  "rate-limit-unavailable",
];

async function refusal<R extends string>(response: Response, known: readonly R[]): Promise<R | "not-authenticated" | "unknown"> {
  const code = codeOf(await detailFrom(response));
  const reason = known.find((candidate) => candidate === code);
  if (reason !== undefined) return reason;
  return response.status === 401 ? "not-authenticated" : "unknown";
}

/** The signed-in user's balance and when it next refills. */
export async function fetchBalance(): Promise<FetchBalanceResult> {
  try {
    const token = await accessToken();
    if (!token) return { ok: false, reason: "not-authenticated" };

    const response = await fetch(`${API_BASE_URL}/api/credits`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.ok) {
      const balance = balanceFrom(await response.json().catch(() => null));
      return balance ? { ok: true, balance } : { ok: false, reason: "unknown" };
    }
    return { ok: false, reason: await refusal(response, BALANCE_REASONS) };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/**
 * Every format's price on `videoId`. A quote for a different video than the
 * one asked about is refused, so a late answer cannot price the wrong video.
 */
export async function fetchQuote(videoId: string): Promise<FetchQuoteResult> {
  try {
    const token = await accessToken();
    if (!token) return { ok: false, reason: "not-authenticated" };

    const response = await fetch(`${API_BASE_URL}/api/credits/quote?videoId=${encodeURIComponent(videoId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.ok) {
      const quote = quoteFrom(await response.json().catch(() => null));
      return quote && quote.videoId === videoId ? { ok: true, quote } : { ok: false, reason: "unknown" };
    }
    return { ok: false, reason: await refusal(response, QUOTE_REASONS) };
  } catch {
    return { ok: false, reason: "network" };
  }
}
