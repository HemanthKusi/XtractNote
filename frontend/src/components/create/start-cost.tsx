"use client";

// ─────────────────────────────────────────────────────────────
// components/create/start-cost.tsx
//
// The create page's start button, with what the start costs inside it
// (#454, revisited once the side menu showed the balance, #460 — chosen as
// "B2 · Final" at /dev/cost-directions).
//
// The button first says only what it makes. A beat later it stretches a
// little past its new size and settles back, as the price slides in behind a
// divider: "Make study notes │ 2 credits". The balance is the menu's to show;
// here it appears only when it is known to be short of the price — the button
// goes off and one line beneath says what you have and when credits refill.
// A price or balance that is loading or failed never turns the button off;
// the start route prices and refuses on its own.
//
// ── Why the width is measured ──
//
// The stretch is the menu's spring, which overshoots. Only an explicit width
// can overshoot: a grid track going 0fr → 1fr stops at the content's width,
// which cut the spring off. So the segment's natural width is measured and
// its width animates to that.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";

import { MORPH_MS } from "@/components/layout/menu/menu-geometry";
import { Button } from "@/components/ui/button";
import { shortBy, type BalanceState, type CostState } from "@/lib/credits/cost";
import { refillDate } from "@/lib/credits/shortfall";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

/** Lets the button be read for what it makes before the price joins it. */
const REVEAL_DELAY_MS = 260;

interface StartCostProps {
  /** What the button says: "Make study notes", "Try again", "Pick a format". */
  label: string;
  /** Null while no format is chosen: the button carries no price. */
  cost: CostState | null;
  balance: BalanceState;
  /** Off for reasons other than credits — no format, or social with no platform. */
  disabled: boolean;
  onStart: () => void;
}

function credits(count: number): string {
  return `${count} ${count === 1 ? "credit" : "credits"}`;
}

export function StartCost({ label, cost, balance, disabled, onStart }: StartCostProps) {
  const reduced = useReducedMotion();
  const short = cost ? shortBy(cost, balance) : null;
  const priceText =
    cost?.phase === "ready" ? credits(cost.credits) : cost?.phase === "failed" ? "Price unavailable" : null;

  // Opens a beat after there is a price to show, and closes with it.
  const [open, setOpen] = useState(false);
  const hasPrice = priceText !== null;
  useEffect(() => {
    if (!hasPrice) {
      setOpen(false);
      return;
    }
    const reveal = setTimeout(() => setOpen(true), reduced ? 0 : REVEAL_DELAY_MS);
    return () => clearTimeout(reveal);
  }, [hasPrice, reduced]);

  // The segment's natural width: the divider and the price, unclipped.
  const segment = useRef<HTMLSpanElement>(null);
  const [segmentWidth, setSegmentWidth] = useState(0);
  useEffect(() => {
    const node = segment.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setSegmentWidth(node.offsetWidth));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="mt-5">
        <Button variant="primary" size="lg" onClick={onStart} disabled={disabled || short !== null}>
          <span className="flex items-center">
            <span>{label}</span>
            <span
              aria-hidden={!open}
              className="block shrink-0 overflow-hidden"
              style={{
                width: open ? segmentWidth : 0,
                transition: reduced ? undefined : `width ${MORPH_MS}ms var(--xn-ease-spring)`,
              }}
            >
              <span
                ref={segment}
                className="flex w-max items-center whitespace-nowrap"
                style={{
                  opacity: open ? 1 : 0,
                  transition: reduced
                    ? undefined
                    : `opacity ${MORPH_MS * 0.5}ms ease-out ${open ? MORPH_MS * 0.2 : 0}ms`,
                }}
              >
                <span className="mx-3 h-5 w-px shrink-0 bg-current opacity-30" />
                <span className="tabular-nums opacity-80">{priceText ?? ""}</span>
              </span>
            </span>
          </span>
        </Button>
      </div>
      {short !== null && balance.phase === "ready" && (
        <p className="mt-3 text-sm">
          <span className="tabular-nums text-xn-danger">You have {balance.balance.balance}.</span>{" "}
          <span className="text-xn-ink-muted">Your credits refill on {refillDate(balance.balance.nextRefillAt)}.</span>
        </p>
      )}
    </>
  );
}
