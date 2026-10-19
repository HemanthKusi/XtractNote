"use client";

// src/components/layout/menu/credits-foot.tsx
//
// The credit balance at the foot of the menu (#460, chosen as G2c at
// /dev/menu-credits). In the panel, a tile: "CREDITS", the balance over the
// month's allowance, a bar of what is left, and the refill date. In the rail,
// a ring of one cell per credit of the allowance, lit for what is left, the
// number inside.
//
// ── Drawn against the menu, not on top of it ──
//
// Page colour on ink in the rows' own steps; a 14px corner, which is the one
// that stays concentric with the panel's 24 at the body's 10px inset; centred
// on the labels' axis. The panel and rail forms share one grid cell and
// cross-fade on the labels' timing — out in 30% of the morph towards the
// rail, in over the whole morph coming back — and the panel form holds the
// panel's width, so it is clipped rather than reflowed while the menu
// narrows.
//
// ── Motion ──
//
// The bar and the cells fill from empty, the number counting with them, each
// time a form comes into view (useFill); a new balance moves from the one on
// screen. Nothing moves while the menu sits still.
//
// ── Not a control ──
//
// There is no credits page to open yet, so the foot has no hover and no
// focus: a hover would promise an action that is not there.

import { useBalance } from "@/components/credits/balance-provider";
import type { BalanceState } from "@/lib/credits/cost";
import { refillDate } from "@/lib/credits/shortfall";
import { useFill } from "@/lib/hooks/use-fill";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

import { ON_INK, ON_INK_ACTIVE, ON_INK_DIM, ON_INK_HOVER } from "./menu-colors";
import { MORPH_CSS_EASE, MORPH_MS, PAD, PANEL_W, type MenuMode } from "./menu-geometry";

const RADIUS = 14;
const PANEL_FORM_W = PANEL_W - PAD * 2;
const BAR_H = 8;
/** Past the rail's 44px column into the body's padding; centred, inside the ink. */
const RING = 46;
const RING_STROKE = 5;
const RING_TEXT_PX = 14;

function credits(count: number): string {
  return `${count} ${count === 1 ? "credit" : "credits"}`;
}

function spoken(balance: BalanceState): string {
  if (balance.phase === "loading") return "Loading credits";
  if (balance.phase === "failed") return "Credits unavailable";
  const { balance: left, allowance, nextRefillAt } = balance.balance;
  return `${credits(left)} of ${allowance} left, refills on ${refillDate(nextRefillAt)}`;
}

export function CreditsFoot({ mode }: { mode: MenuMode }) {
  const { balance } = useBalance();
  const reduced = useReducedMotion();
  const rail = mode === "rail";
  const fade = (shown: boolean) =>
    reduced ? undefined : `opacity ${shown && !rail ? MORPH_MS : MORPH_MS * 0.3}ms ${MORPH_CSS_EASE}`;

  return (
    // The words are said once, here; the drawing is hidden from assistive
    // technology.
    <div className="grid grid-cols-[minmax(0,1fr)] items-end">
      <span className="sr-only">{spoken(balance)}</span>
      <div
        aria-hidden
        className="pointer-events-none [grid-area:1/1]"
        style={{ width: PANEL_FORM_W, opacity: rail ? 0 : 1, transition: fade(!rail) }}
      >
        <Tile balance={balance} shown={mode === "expanded"} />
      </div>
      <div
        aria-hidden
        className="pointer-events-none w-full [grid-area:1/1]"
        style={{ opacity: rail ? 1 : 0, transition: fade(rail) }}
      >
        <CellRing balance={balance} shown={rail} />
      </div>
    </div>
  );
}

function Tile({ balance, shown }: { balance: BalanceState; shown: boolean }) {
  const ready = balance.phase === "ready" ? balance.balance : null;
  const value = useFill(ready?.balance ?? 0, shown);
  const share = ready ? Math.min(1, value / ready.allowance) : 0;

  return (
    <div
      className="flex flex-col items-center px-3.5 pb-3.5 pt-3 text-center"
      style={{ borderRadius: RADIUS, background: ON_INK_HOVER }}
    >
      <span className="font-mono text-micro uppercase tracking-[0.08em]" style={{ color: ON_INK_DIM }}>
        Credits
      </span>
      {ready && (
        <p className="mt-1.5 text-[28px] leading-none tabular-nums" style={{ color: ON_INK }}>
          {Math.round(value)}
          <span className="text-sm" style={{ color: ON_INK_DIM }}>
            {" "}
            / {ready.allowance}
          </span>
        </p>
      )}
      {balance.phase === "loading" && <Placeholder width={56} height={26} className="mt-1.5" />}
      {balance.phase === "failed" && (
        <p className="mt-2 text-xs" style={{ color: ON_INK_DIM }}>
          Couldn&apos;t load credits
        </p>
      )}
      <span
        className={`mt-3 block w-full overflow-hidden rounded-full ${balance.phase === "loading" ? "animate-pulse" : ""}`}
        style={{ height: BAR_H, background: ON_INK_ACTIVE }}
      >
        <span className="block h-full rounded-full" style={{ width: `${share * 100}%`, background: ON_INK }} />
      </span>
      <p className="mt-2.5 text-xs" style={{ color: ON_INK_DIM }}>
        {ready
          ? ready.balance === 0
            ? `None left · refills ${refillDate(ready.nextRefillAt)}`
            : `Refills on ${refillDate(ready.nextRefillAt)}`
          : " "}
      </p>
    </div>
  );
}

/** One cell per credit of the allowance, lit for what is left. */
function CellRing({ balance, shown }: { balance: BalanceState; shown: boolean }) {
  const ready = balance.phase === "ready" ? balance.balance : null;
  const value = useFill(ready?.balance ?? 0, shown);
  const cells = ready?.allowance ?? 30;
  const lit = Math.round(value);
  const c = RING / 2;
  const r = (RING - RING_STROKE) / 2;
  const length = 2 * Math.PI * r;
  const segment = length / cells;

  return (
    <div className="flex items-center justify-center" style={{ height: RING }}>
      <span className="relative flex shrink-0 items-center justify-center" style={{ width: RING, height: RING }}>
        <svg
          width={RING}
          height={RING}
          viewBox={`0 0 ${RING} ${RING}`}
          className={`absolute inset-0 -rotate-90 ${balance.phase === "loading" ? "animate-pulse" : ""}`}
        >
          {Array.from({ length: cells }, (_, i) => (
            <circle
              key={i}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={i < lit ? ON_INK : ON_INK_ACTIVE}
              strokeWidth={RING_STROKE}
              strokeDasharray={`${segment * 0.62} ${length}`}
              strokeDashoffset={-i * segment}
            />
          ))}
        </svg>
        {balance.phase !== "loading" && (
          <span
            className="relative font-semibold leading-none tabular-nums"
            style={{ fontSize: RING_TEXT_PX, color: ready ? ON_INK : ON_INK_DIM }}
          >
            {ready ? lit : "—"}
          </span>
        )}
      </span>
    </div>
  );
}

function Placeholder({ width, height, className = "" }: { width: number; height: number; className?: string }) {
  return (
    <span
      className={`block animate-pulse rounded-full ${className}`}
      style={{ width, height, background: ON_INK_ACTIVE }}
    />
  );
}
