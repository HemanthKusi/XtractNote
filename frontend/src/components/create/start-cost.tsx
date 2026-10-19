"use client";

// ─────────────────────────────────────────────────────────────
// components/create/start-cost.tsx
//
// The create page's start button with what the start costs and what the user
// has beside it (#454, direction A at /dev/cost-directions — chosen
// provisionally, to be revisited once the side menu shows the balance, #460).
//
// The button is passed in as children; this lays out the line around it.
// A price or balance that is loading or failed never turns the button off —
// the start route prices and refuses on its own. Only a balance known to be
// short does, and `shortBy` is how the page knows.
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

import type { CreditBalance } from "@/lib/credits/read";
import { refillDate } from "@/lib/credits/shortfall";

export type CostState = { phase: "loading" } | { phase: "failed" } | { phase: "ready"; credits: number };

export type BalanceState = { phase: "loading" } | { phase: "failed" } | { phase: "ready"; balance: CreditBalance };

/** How many credits the start is short by, or null when it is not known to be short. */
export function shortBy(cost: CostState, balance: BalanceState): number | null {
  if (cost.phase !== "ready" || balance.phase !== "ready") return null;
  const gap = cost.credits - balance.balance.balance;
  return gap > 0 ? gap : null;
}

interface StartCostProps {
  /** The start button. */
  children: ReactNode;
  /** Null while no format is chosen: nothing is shown beside the button. */
  cost: CostState | null;
  balance: BalanceState;
}

function credits(count: number): string {
  return `${count} ${count === 1 ? "credit" : "credits"}`;
}

export function StartCost({ children, cost, balance }: StartCostProps) {
  const short = cost ? shortBy(cost, balance) : null;

  return (
    <>
      {/* Wraps below the button when the column is too narrow for both. */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        {children}
        {cost && (
          <div className="flex flex-col gap-1 whitespace-nowrap text-sm leading-tight">
            {cost.phase === "ready" && (
              <span className="font-medium tabular-nums text-xn-ink">{credits(cost.credits)}</span>
            )}
            {cost.phase === "loading" && <Placeholder width="w-16" />}
            {cost.phase === "failed" && <span className="text-xn-ink-soft">Price unavailable</span>}

            {balance.phase === "ready" && (
              <span className={`tabular-nums ${short !== null ? "text-xn-danger" : "text-xn-ink-soft"}`}>
                You have {balance.balance.balance}
              </span>
            )}
            {balance.phase === "loading" && <Placeholder width="w-20" />}
          </div>
        )}
      </div>
      {short !== null && balance.phase === "ready" && (
        <p className="mt-3 text-sm text-xn-ink-muted">
          Not enough credits. Yours refill on {refillDate(balance.balance.nextRefillAt)}.
        </p>
      )}
    </>
  );
}

function Placeholder({ width }: { width: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-3.5 animate-pulse rounded-xn-sm bg-xn-surface-alt align-middle ${width}`}
    />
  );
}
