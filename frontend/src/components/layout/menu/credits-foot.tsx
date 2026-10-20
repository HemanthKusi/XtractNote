"use client";

// src/components/layout/menu/credits-foot.tsx
//
// The credit balance at the foot of the menu (#460, chosen as G2c at
// /dev/menu-credits). In the panel, a tile: "CREDITS", the balance over the
// month's allowance, a bar of what is left, and the refill date. In the rail,
// a ring of cells for the allowance, lit for what is left, the number
// inside.
//
// ── When it does not fit ──
//
// The menu says how much room is left below its rows. The full form is
// shown when it fits; otherwise a compact one held to a row's height (K3 at
// /dev/menu-credits: an outlined card, "CREDITS" and the count on one line,
// a thin bar; in the rail, the count in a small card); otherwise nothing.
// Each form's height is measured, so the choice holds whatever the type
// renders at.
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
// screen.
//
// ── Not a control ──
//
// There is no credits page to open yet, so the foot has no hover and no
// focus: a hover would promise an action that is not there.

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

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
/** Beyond this the cells stop being legible at 46px; the ring then shares them out. */
const MAX_CELLS = 60;

function credits(count: number): string {
  return `${count} ${count === 1 ? "credit" : "credits"}`;
}

function spoken(balance: BalanceState): string {
  if (balance.phase === "loading") return "Loading credits";
  if (balance.phase === "failed") return "Credits unavailable";
  const { balance: left, allowance, nextRefillAt } = balance.balance;
  return `${credits(left)} of ${allowance} left, refills on ${refillDate(nextRefillAt)}`;
}

type Form = "tile" | "slim" | "ring" | "count";

const NO_HEIGHTS: Record<Form, number> = { tile: 0, slim: 0, ring: 0, count: 0 };

/** The form to show: the full one if it fits in `room`, the compact one if that does, else none. */
function formFor(mode: MenuMode, room: number, heights: Record<Form, number>): Form | null {
  // `room` starts below the rows' own padding, which is the gap above the
  // foot; the foot adds its bottom padding under the form.
  const fits = (form: Form) => heights[form] > 0 && heights[form] + PAD <= room;
  if (mode === "expanded") return fits("tile") ? "tile" : fits("slim") ? "slim" : null;
  if (mode === "rail") return fits("ring") ? "ring" : fits("count") ? "count" : null;
  return null;
}

export function CreditsFoot({ mode, room }: { mode: MenuMode; room: number }) {
  const { balance } = useBalance();
  const reduced = useReducedMotion();

  const tile = useRef<HTMLDivElement>(null);
  const slim = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState(NO_HEIGHTS);
  useEffect(() => {
    const layers = { tile, slim, ring, count };
    const observer = new ResizeObserver(() =>
      setHeights({
        tile: layers.tile.current?.offsetHeight ?? 0,
        slim: layers.slim.current?.offsetHeight ?? 0,
        ring: layers.ring.current?.offsetHeight ?? 0,
        count: layers.count.current?.offsetHeight ?? 0,
      }),
    );
    for (const layer of Object.values(layers)) if (layer.current) observer.observe(layer.current);
    return () => observer.disconnect();
  }, []);

  const shown = formFor(mode, room, heights);
  const fade = (form: Form) =>
    reduced
      ? undefined
      : `opacity ${shown === form && mode === "expanded" ? MORPH_MS : MORPH_MS * 0.3}ms ${MORPH_CSS_EASE}`;
  const layer = (form: Form, ref: RefObject<HTMLDivElement>, panelWide: boolean, node: ReactNode) => (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none [grid-area:1/1] ${panelWide ? "" : "w-full"}`}
      style={{ width: panelWide ? PANEL_FORM_W : undefined, opacity: shown === form ? 1 : 0, transition: fade(form) }}
    >
      {node}
    </div>
  );

  return (
    // Every form shares one grid cell, so none moves while another fades.
    // The words are said once, here, and only while a form is shown; the
    // drawing is hidden from assistive technology.
    <div className="grid grid-cols-[minmax(0,1fr)] items-end">
      <span className="sr-only">{shown ? spoken(balance) : ""}</span>
      {layer("tile", tile, true, <Tile balance={balance} shown={shown === "tile"} />)}
      {layer("slim", slim, true, <Slim balance={balance} shown={shown === "slim"} />)}
      {layer("ring", ring, false, <CellRing balance={balance} shown={shown === "ring"} />)}
      {layer("count", count, false, <Count balance={balance} shown={shown === "count"} />)}
    </div>
  );
}

/** The compact panel form: an outlined card at row height. */
function Slim({ balance, shown }: { balance: BalanceState; shown: boolean }) {
  const ready = balance.phase === "ready" ? balance.balance : null;
  const value = useFill(ready?.balance ?? 0, shown);
  const share = ready ? Math.min(1, value / ready.allowance) : 0;
  return (
    <div
      className="flex h-11 flex-col justify-center px-3"
      style={{ borderRadius: RADIUS, boxShadow: `inset 0 0 0 1px ${ON_INK_ACTIVE}` }}
    >
      <div className="flex items-baseline justify-between text-sm leading-none">
        <span className="font-mono text-micro uppercase tracking-[0.08em]" style={{ color: ON_INK_DIM }}>
          Credits
        </span>
        {ready && (
          <span className="tabular-nums" style={{ color: ON_INK }}>
            {Math.round(value)}
            <span style={{ color: ON_INK_DIM }}> / {ready.allowance}</span>
          </span>
        )}
        {balance.phase === "loading" && <Placeholder width={48} height={12} />}
        {balance.phase === "failed" && <span style={{ color: ON_INK_DIM }}>Unavailable</span>}
      </div>
      <span
        className={`mt-2 block overflow-hidden rounded-full ${balance.phase === "loading" ? "animate-pulse" : ""}`}
        style={{ height: 4, background: ON_INK_ACTIVE }}
      >
        <span className="block h-full rounded-full" style={{ width: `${share * 100}%`, background: ON_INK }} />
      </span>
    </div>
  );
}

/** The compact rail form: the count in a small card. */
function Count({ balance, shown }: { balance: BalanceState; shown: boolean }) {
  const value = useFill(balance.phase === "ready" ? balance.balance.balance : 0, shown);
  return (
    <div className="flex h-8 items-center justify-center" style={{ borderRadius: RADIUS, background: ON_INK_HOVER }}>
      {balance.phase === "loading" ? (
        <Placeholder width={18} height={12} />
      ) : (
        <span
          className="text-sm font-semibold leading-none tabular-nums"
          style={{ color: balance.phase === "ready" ? ON_INK : ON_INK_DIM }}
        >
          {balance.phase === "ready" ? Math.round(value) : "—"}
        </span>
      )}
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

/**
 * One cell per credit of the allowance, lit for what is left — up to
 * MAX_CELLS; a larger allowance is shared out across that many.
 */
function CellRing({ balance, shown }: { balance: BalanceState; shown: boolean }) {
  const ready = balance.phase === "ready" ? balance.balance : null;
  const value = useFill(ready?.balance ?? 0, shown);
  const allowance = ready?.allowance ?? 30;
  const cells = Math.min(allowance, MAX_CELLS);
  const lit = Math.round((value / allowance) * cells);
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
            {ready ? Math.round(value) : "—"}
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
