"use client";

// src/app/dev/menu-credits/foot-directions.tsx
//
// The balance at the foot of the side menu (#460), as a card, in each
// direction and every state. Drawn against the menu's own system:
//
//   - ink in every mode, so everything here is the page colour on ink, in the
//     rows' own three steps: full, 66% (dim) and 15% (faint), with 8% for a
//     filled surface — the rows' hover fill.
//   - a 14px corner on every card: inset 10px inside the panel's 24px corner,
//     14 is the radius that stays concentric with it.
//   - the rows' labels and the MENU title are centred, and their icons sit in
//     a column 10px inside the body's padding; a card either centres or lines
//     up with that column.
//   - the panel and rail forms cross-fade on the labels' own timing: out in
//     30% of the morph going to the rail, in over the whole morph coming back.
//
// Nothing here is interactive — there is no credits page to go to yet — so
// no card has a hover state; a hover would promise an action that is not
// there.

import { useEffect, useRef, useState, type ReactNode } from "react";

import { ON_INK, ON_INK_ACTIVE, ON_INK_DIM, ON_INK_HOVER } from "@/components/layout/menu/menu-colors";
import {
  ICON,
  MORPH_CSS_EASE,
  MORPH_MS,
  PAD,
  PANEL_W,
  ROW_H,
  titleCentreShift,
  type MenuMode,
} from "@/components/layout/menu/menu-geometry";
import { useFill } from "@/lib/hooks/use-fill";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { refillDate } from "@/lib/credits/shortfall";

export type FootDirection =
  | "today"
  | "dial"
  | "head"
  | "cells"
  | "ringCard"
  | "ringBold"
  | "ringDate"
  | "tile"
  | "ledger"
  | "units"
  | "date"
  | "line"
  | "meter";

export type FootBalance =
  | { phase: "loading" }
  | { phase: "failed" }
  | { phase: "ready"; credits: number; refillsAt: string };

type Ready = Extract<FootBalance, { phase: "ready" }>;

/** A fixed allowance for the previews; the app reads the real one from the balance route. */
export const ALLOWANCE = 30;

// The menu's own steps, under the names these previews were drawn with.
const ON_INK_FAINT = ON_INK_ACTIVE;
const ON_INK_FILL = ON_INK_HOVER;

const RADIUS = 14;
const ICON_COLUMN = 10;
/** The panel's width inside the body's padding, which the foot shares. */
const PANEL_FORM_W = PANEL_W - PAD * 2;

function credits(count: number): string {
  return `${count} ${count === 1 ? "credit" : "credits"}`;
}

function spoken(balance: FootBalance): string {
  if (balance.phase === "loading") return "Loading credits";
  if (balance.phase === "failed") return "Credits unavailable";
  return `${credits(balance.credits)} left, refills on ${refillDate(balance.refillsAt)}`;
}

function refillLine(balance: Ready): string {
  const day = refillDate(balance.refillsAt);
  return balance.credits === 0 ? `None left · refills ${day}` : `Refills on ${day}`;
}

/** "30" and "Oct", in the viewer's own zone. */
function refillParts(iso: string): { day: string; month: string } {
  const parts = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).formatToParts(new Date(iso));
  return {
    day: parts.find((part) => part.type === "day")?.value ?? "",
    month: parts.find((part) => part.type === "month")?.value ?? "",
  };
}

// ── The foot: both forms, cross-faded on the labels' timing ──

export function Foot({
  direction,
  mode,
  balance,
}: {
  direction: Exclude<FootDirection, "today">;
  mode: MenuMode;
  balance: FootBalance;
}) {
  const reduced = useReducedMotion();
  const forms = FORMS[direction];
  const rail = mode === "rail";
  // Which form is in view: neither while the menu is the button, so each
  // fills again when the menu reopens.
  const panelShown = mode === "expanded";
  const fade = (shown: boolean) =>
    reduced ? undefined : `opacity ${shown && !rail ? MORPH_MS : MORPH_MS * 0.3}ms ${MORPH_CSS_EASE}`;

  return (
    // Both forms share one grid cell, so the foot is as tall as the taller
    // one and neither moves when the other fades. The column follows the
    // menu's width; the panel form keeps the panel's, so it is clipped rather
    // than reflowed while the menu narrows. The words are said once, here;
    // the drawing is hidden from assistive technology.
    <div className="grid grid-cols-[minmax(0,1fr)] items-end">
      <span className="sr-only">{spoken(balance)}</span>
      <div
        aria-hidden
        className="[grid-area:1/1]"
        style={{ width: PANEL_FORM_W, opacity: rail ? 0 : 1, transition: fade(!rail), pointerEvents: "none" }}
      >
        {forms.panel(balance, panelShown)}
      </div>
      <div
        aria-hidden
        className="[grid-area:1/1] w-full"
        style={{ opacity: rail ? 1 : 0, transition: fade(rail), pointerEvents: "none" }}
      >
        {forms.rail(balance, rail)}
      </div>
    </div>
  );
}

/** A form, and whether it is the one in view — the gauges fill when it comes into view. */
type Form = (balance: FootBalance, shown: boolean) => ReactNode;

const FORMS: Record<Exclude<FootDirection, "today">, { panel: Form; rail: Form }> = {
  dial: { panel: (b, s) => <GaugeTile balance={b} shown={s} />, rail: (b, s) => <GaugeRing balance={b} shown={s} look="dial" /> },
  head: { panel: (b, s) => <GaugeTile balance={b} shown={s} />, rail: (b, s) => <GaugeRing balance={b} shown={s} look="head" /> },
  cells: { panel: (b, s) => <GaugeTile balance={b} shown={s} />, rail: (b, s) => <GaugeRing balance={b} shown={s} look="cells" /> },
  ringCard: { panel: (b) => <TileBarPanel balance={b} />, rail: (b) => <RingCardRail balance={b} /> },
  ringBold: { panel: (b) => <TileBarPanel balance={b} />, rail: (b) => <RingBoldRail balance={b} /> },
  ringDate: { panel: (b) => <TileBarPanel balance={b} />, rail: (b) => <RingCardRail balance={b} withDate /> },
  tile: { panel: (b) => <TilePanel balance={b} />, rail: (b) => <TileRail balance={b} /> },
  ledger: { panel: (b) => <LedgerPanel balance={b} />, rail: (b) => <LedgerRail balance={b} /> },
  units: { panel: (b) => <UnitsPanel balance={b} />, rail: (b) => <UnitsRail balance={b} /> },
  date: { panel: (b) => <DatePanel balance={b} />, rail: (b) => <DateRail balance={b} /> },
  line: { panel: (b) => <LinePanel balance={b} />, rail: (b) => <NumberRail balance={b} /> },
  meter: { panel: (b) => <MeterPanel balance={b} />, rail: (b) => <RingRail balance={b} /> },
};

// ── G2 refined: the tile's bar and the rail's ring, filling (round 4) ──
//
// The panel keeps the tile with a thicker bar. The rail keeps G2's ring on
// its own, in three looks. Both FILL: from empty to the balance, with the
// number counting up beside them, each time the form comes into view —
// opening the menu, or switching between panel and rail. A new balance moves
// from the old value to the new one instead. Reduced motion shows the value
// at once.

const BAR_H = 8;
/**
 * The ring's size and its number's, per look. Dial and cells run a little
 * past the rail's 44px column, into the body's padding; centred, they stay
 * well inside the ink.
 */
const RING_SIZE = { dial: 46, head: 40, cells: 46 } as const;
const RING_TEXT_PX = { dial: 14, head: 12, cells: 14 } as const;
const RING_STROKE = 5;
function GaugeTile({ balance, shown }: { balance: FootBalance; shown: boolean }) {
  const value = useFill(balance.phase === "ready" ? balance.credits : 0, shown);
  return (
    <Card fill className="flex flex-col items-center px-3.5 pb-3.5 pt-3 text-center">
      <Eyebrow>Credits</Eyebrow>
      {balance.phase === "ready" && (
        <p className="mt-1.5 text-[28px] leading-none tabular-nums" style={{ color: ON_INK }}>
          {Math.round(value)}
          <span className="text-sm" style={{ color: ON_INK_DIM }}>
            {" "}
            / {ALLOWANCE}
          </span>
        </p>
      )}
      {balance.phase === "loading" && <Bar width={56} height={26} className="mt-1.5" />}
      {balance.phase === "failed" && <Unavailable className="mt-2" />}
      <span
        className={`mt-3 block w-full overflow-hidden rounded-full ${balance.phase === "loading" ? "animate-pulse" : ""}`}
        style={{ height: BAR_H, background: ON_INK_FAINT }}
      >
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.min(1, value / ALLOWANCE) * 100}%`, background: ON_INK }}
        />
      </span>
      <p className="mt-2.5 text-xs" style={{ color: ON_INK_DIM }}>
        {balance.phase === "ready" ? refillLine(balance) : " "}
      </p>
    </Card>
  );
}

/**
 * G2's ring, in one of three looks, sized to the rail's 44px column:
 *   dial   a faint disc inside the track, the number on it
 *   head   a knob at the arc's end, marking where the balance stands
 *   cells  the month's thirty credits as segments, lit for what is left
 */
function GaugeRing({ balance, shown, look }: { balance: FootBalance; shown: boolean; look: "dial" | "head" | "cells" }) {
  const value = useFill(balance.phase === "ready" ? balance.credits : 0, shown);
  const RING = RING_SIZE[look];
  const c = RING / 2;
  const r = (RING - RING_STROKE) / 2 - (look === "head" ? 1.5 : 0);
  const length = 2 * Math.PI * r;
  const share = Math.min(1, value / ALLOWANCE);
  const angle = share * 2 * Math.PI;
  const segment = length / ALLOWANCE;

  return (
    <div className="flex items-center justify-center" style={{ height: Math.max(44, RING) }}>
      <span className="relative flex shrink-0 items-center justify-center" style={{ width: RING, height: RING }}>
        <svg
          width={RING}
          height={RING}
          viewBox={`0 0 ${RING} ${RING}`}
          className={`absolute inset-0 -rotate-90 overflow-visible ${balance.phase === "loading" ? "animate-pulse" : ""}`}
        >
          {look === "dial" && <circle cx={c} cy={c} r={r - RING_STROKE / 2 - 2} fill={ON_INK_FILL} />}

          {look === "cells" ? (
            Array.from({ length: ALLOWANCE }, (_, i) => (
              <circle
                key={i}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={i < Math.round(value) ? ON_INK : ON_INK_FAINT}
                strokeWidth={RING_STROKE}
                strokeDasharray={`${segment * 0.62} ${length}`}
                strokeDashoffset={-i * segment}
              />
            ))
          ) : (
            <>
              <circle cx={c} cy={c} r={r} fill="none" stroke={ON_INK_FAINT} strokeWidth={RING_STROKE} />
              {share > 0 && (
                <circle
                  cx={c}
                  cy={c}
                  r={r}
                  fill="none"
                  stroke={ON_INK}
                  strokeWidth={RING_STROKE}
                  strokeLinecap="round"
                  strokeDasharray={`${share * length} ${length}`}
                />
              )}
            </>
          )}

          {look === "head" && balance.phase === "ready" && (
            <circle
              cx={c + r * Math.cos(angle)}
              cy={c + r * Math.sin(angle)}
              r={RING_STROKE / 2 + 1.5}
              fill={ON_INK}
              stroke="var(--xn-ink)"
              strokeWidth={1.5}
            />
          )}
        </svg>
        {balance.phase !== "loading" && (
          <span
            className="relative font-semibold leading-none tabular-nums"
            style={{ fontSize: RING_TEXT_PX[look], color: balance.phase === "ready" ? ON_INK : ON_INK_DIM }}
          >
            {balance.phase === "ready" ? Math.round(value) : "—"}
          </span>
        )}
      </span>
    </div>
  );
}

// ── G2c that fits: a compact card when the full one would cover a row (round 5) ──
//
// The menu tells the foot how much room is left below its rows. The full
// tile and ring are used when they fit; a compact card when only that fits;
// nothing when neither does. Each form's height is measured, not assumed.

export type CompactLook = "line" | "row" | "slim";

type FitForm = "tile" | "compactPanel" | "ring" | "compactRail";

export function FitFoot({
  compact,
  mode,
  room,
  balance,
}: {
  compact: CompactLook;
  mode: MenuMode;
  room: number;
  balance: FootBalance;
}) {
  const reduced = useReducedMotion();
  const refs = {
    tile: useRef<HTMLDivElement>(null),
    compactPanel: useRef<HTMLDivElement>(null),
    ring: useRef<HTMLDivElement>(null),
    compactRail: useRef<HTMLDivElement>(null),
  };
  const [heights, setHeights] = useState<Record<FitForm, number>>({ tile: 0, compactPanel: 0, ring: 0, compactRail: 0 });

  useEffect(() => {
    const observer = new ResizeObserver(() =>
      setHeights({
        tile: refs.tile.current?.offsetHeight ?? 0,
        compactPanel: refs.compactPanel.current?.offsetHeight ?? 0,
        ring: refs.ring.current?.offsetHeight ?? 0,
        compactRail: refs.compactRail.current?.offsetHeight ?? 0,
      }),
    );
    for (const ref of Object.values(refs)) if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
    // The refs are stable; the forms they point at are always rendered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `room` is measured from the bottom of the rows' own padding, which is
  // the gap above the foot; the foot adds its bottom padding under the form.
  const fits = (form: FitForm) => heights[form] > 0 && heights[form] + PAD <= room;
  const active: FitForm | null =
    mode === "expanded"
      ? fits("tile")
        ? "tile"
        : fits("compactPanel")
          ? "compactPanel"
          : null
      : mode === "rail"
        ? fits("ring")
          ? "ring"
          : fits("compactRail")
            ? "compactRail"
            : null
        : null;

  const layer = (form: FitForm, node: ReactNode, wide: boolean) => (
    <div
      ref={refs[form]}
      aria-hidden
      className={`pointer-events-none [grid-area:1/1] ${wide ? "" : "w-full"}`}
      style={{
        width: wide ? PANEL_FORM_W : undefined,
        opacity: active === form ? 1 : 0,
        transition: reduced
          ? undefined
          : `opacity ${active === form && mode === "expanded" ? MORPH_MS : MORPH_MS * 0.3}ms ${MORPH_CSS_EASE}`,
      }}
    >
      {node}
    </div>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-end">
      <span className="sr-only">{active ? spoken(balance) : ""}</span>
      {layer("tile", <GaugeTile balance={balance} shown={active === "tile"} />, true)}
      {layer("compactPanel", <CompactPanel balance={balance} shown={active === "compactPanel"} look={compact} />, true)}
      {layer("ring", <GaugeRing balance={balance} shown={active === "ring"} look="cells" />, false)}
      {layer("compactRail", <CompactRail balance={balance} shown={active === "compactRail"} />, false)}
    </div>
  );
}

function CompactPanel({ balance, shown, look }: { balance: FootBalance; shown: boolean; look: CompactLook }) {
  const value = useFill(balance.phase === "ready" ? balance.credits : 0, shown);
  const share = Math.min(1, value / ALLOWANCE);
  const count =
    balance.phase === "ready" ? (
      <span className="tabular-nums" style={{ color: ON_INK }}>
        {Math.round(value)}
        <span style={{ color: ON_INK_DIM }}> / {ALLOWANCE}</span>
      </span>
    ) : balance.phase === "loading" ? (
      <Bar width={48} height={14} />
    ) : (
      <span style={{ color: ON_INK_DIM }}>Unavailable</span>
    );
  const bar = (height: number, className = "") => (
    <span
      className={`block overflow-hidden rounded-full ${balance.phase === "loading" ? "animate-pulse" : ""} ${className}`}
      style={{ height, background: ON_INK_FAINT }}
    >
      <span className="block h-full rounded-full" style={{ width: `${share * 100}%`, background: ON_INK }} />
    </span>
  );

  // K1 · Line: one card at row height, the count and a bar beside it.
  if (look === "line") {
    return (
      <Card fill className="flex h-11 items-center gap-3 px-3.5 text-ui font-medium">
        {count}
        {bar(6, "flex-1")}
      </Card>
    );
  }

  // K2 · Row: drawn as one of the menu's own rows — a small cell ring in the
  // icons' column, the count on the labels' axis.
  if (look === "row") {
    return (
      <div
        className="flex h-11 items-center gap-3 text-ui font-medium"
        style={{ borderRadius: ROW_H / 2, background: ON_INK_FILL, paddingLeft: (ROW_H - ICON) / 2, paddingRight: (ROW_H - ICON) / 2 }}
      >
        <MiniCells balance={balance} value={value} />
        <span className="flex-1 text-center" style={{ transform: `translateX(${titleCentreShift(ICON)}px)` }}>
          {count}
        </span>
      </div>
    );
  }

  // K3 · Slim: an outlined card, the eyebrow and count on one line, a thin
  // bar — held to row height, like the other two.
  return (
    <Card className="flex h-11 flex-col justify-center px-3">
      <div className="flex items-baseline justify-between text-sm leading-none">
        <Eyebrow>Credits</Eyebrow>
        {count}
      </div>
      {bar(4, "mt-2")}
    </Card>
  );
}

/** The rail's compact form, for every look: the count in a small card. */
function CompactRail({ balance, shown }: { balance: FootBalance; shown: boolean }) {
  const value = useFill(balance.phase === "ready" ? balance.credits : 0, shown);
  return (
    <Card fill className="flex h-8 items-center justify-center">
      {balance.phase === "loading" ? (
        <Bar width={18} height={12} />
      ) : (
        <span
          className="text-sm font-semibold leading-none tabular-nums"
          style={{ color: balance.phase === "ready" ? ON_INK : ON_INK_DIM }}
        >
          {balance.phase === "ready" ? Math.round(value) : "—"}
        </span>
      )}
    </Card>
  );
}

/** The rail's cell ring at icon size, for K2's icon column. */
function MiniCells({ balance, value }: { balance: FootBalance; value: number }) {
  const size = ICON;
  const stroke = 3;
  const c = size / 2;
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const segment = length / ALLOWANCE;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`shrink-0 -rotate-90 ${balance.phase === "loading" ? "animate-pulse" : ""}`}
    >
      {Array.from({ length: ALLOWANCE }, (_, i) => (
        <circle
          key={i}
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={i < Math.round(value) ? ON_INK : ON_INK_FAINT}
          strokeWidth={stroke}
          strokeDasharray={`${segment * 0.55} ${length}`}
          strokeDashoffset={-i * segment}
        />
      ))}
    </svg>
  );
}

// ── G · Tile and bar, with a ring in the rail (round 3) ──
//
// C's tile with the month's allowance as a bar under the number; in the rail,
// round 1's ring, refined. The bar and the ring are one thickness, so the two
// forms read as one gauge. A new balance eases them along the menu's own
// spring; nothing moves on arrival, only when the number changes.

/** One thickness for the bar and the ring's stroke. */
const GAUGE = 5;

function share(balance: FootBalance): number {
  return balance.phase === "ready" ? Math.max(0, Math.min(1, balance.credits / ALLOWANCE)) : 0;
}

function TileBarPanel({ balance }: { balance: FootBalance }) {
  const reduced = useReducedMotion();
  return (
    <Card fill className="flex flex-col items-center px-3.5 pb-3.5 pt-3 text-center">
      <Eyebrow>Credits</Eyebrow>
      {balance.phase === "ready" && (
        <p className="mt-1.5 text-[28px] leading-none tabular-nums" style={{ color: ON_INK }}>
          {balance.credits}
          <span className="text-sm" style={{ color: ON_INK_DIM }}>
            {" "}
            / {ALLOWANCE}
          </span>
        </p>
      )}
      {balance.phase === "loading" && <Bar width={56} height={26} className="mt-1.5" />}
      {balance.phase === "failed" && <Unavailable className="mt-2" />}
      <span
        className={`mt-3 block w-full overflow-hidden rounded-full ${balance.phase === "loading" ? "animate-pulse" : ""}`}
        style={{ height: GAUGE, background: ON_INK_FAINT }}
      >
        <span
          className="block h-full rounded-full"
          style={{
            width: `${share(balance) * 100}%`,
            background: ON_INK,
            transition: reduced ? undefined : `width ${MORPH_MS}ms ${MORPH_CSS_EASE}`,
          }}
        />
      </span>
      <p className="mt-2.5 text-xs" style={{ color: ON_INK_DIM }}>
        {balance.phase === "ready" ? refillLine(balance) : " "}
      </p>
    </Card>
  );
}

/**
 * The ring: the month's allowance as an arc from twelve o'clock, round-ended,
 * on a faint track, the number inside.
 */
function Ring({ balance, size }: { balance: FootBalance; size: number }) {
  const reduced = useReducedMotion();
  const r = (size - GAUGE) / 2;
  const length = 2 * Math.PI * r;
  const lit = share(balance) * length;
  return (
    <span className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={`absolute inset-0 -rotate-90 ${balance.phase === "loading" ? "animate-pulse" : ""}`}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ON_INK_FAINT} strokeWidth={GAUGE} />
        {lit > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ON_INK}
            strokeWidth={GAUGE}
            strokeLinecap="round"
            strokeDasharray={`${lit} ${length}`}
            style={{ transition: reduced ? undefined : `stroke-dasharray ${MORPH_MS}ms ${MORPH_CSS_EASE}` }}
          />
        )}
      </svg>
      {balance.phase !== "loading" && (
        <span
          className="relative text-[11px] font-semibold leading-none tabular-nums"
          style={{ color: balance.phase === "ready" ? ON_INK : ON_INK_DIM }}
        >
          {balance.phase === "ready" ? balance.credits : "—"}
        </span>
      )}
    </span>
  );
}

/** G1 and G3: the ring in a card shaped like the panel's tile. */
function RingCardRail({ balance, withDate = false }: { balance: FootBalance; withDate?: boolean }) {
  const parts = balance.phase === "ready" ? refillParts(balance.refillsAt) : null;
  return (
    <Card fill className="flex flex-col items-center gap-1.5 py-2">
      <Ring balance={balance} size={34} />
      {withDate && (
        <span className="font-mono text-[9px] uppercase leading-none tracking-[0.06em]" style={{ color: ON_INK_DIM }}>
          {parts ? `${parts.day} ${parts.month}` : "···"}
        </span>
      )}
    </Card>
  );
}

/** G2: no card — a larger ring alone, sized to the rows' icon targets. */
function RingBoldRail({ balance }: { balance: FootBalance }) {
  return (
    <div className="flex h-11 items-center justify-center">
      <Ring balance={balance} size={40} />
    </div>
  );
}

// ── C · Tile (the reference) ── a filled card, a large centred number.
function TilePanel({ balance }: { balance: FootBalance }) {
  return (
    <Card fill className="flex flex-col items-center p-3 text-center">
      <Eyebrow>Credits</Eyebrow>
      {balance.phase === "ready" && (
        <>
          <p className="mt-1.5 text-[28px] leading-none tabular-nums" style={{ color: ON_INK }}>
            {balance.credits}
          </p>
          <p className="mt-2 text-xs" style={{ color: ON_INK_DIM }}>
            {refillLine(balance)}
          </p>
        </>
      )}
      {balance.phase === "loading" && (
        <>
          <Bar width={36} height={26} className="mt-1.5" />
          <Bar width={110} height={10} className="mt-2.5" />
        </>
      )}
      {balance.phase === "failed" && <Unavailable className="mt-2" />}
    </Card>
  );
}

function TileRail({ balance }: { balance: FootBalance }) {
  return (
    <Card fill className="flex h-11 items-center justify-center">
      <RailNumber balance={balance} />
    </Card>
  );
}

// ── D · Ledger ── a credit glyph in the rows' icon column, the balance on
// the right as a row's value would be, and the refill beneath a hairline.
function LedgerPanel({ balance }: { balance: FootBalance }) {
  return (
    <Card fill className="py-2.5" style={{ paddingLeft: ICON_COLUMN, paddingRight: 14 }}>
      <div className="flex h-6 items-center gap-3">
        <CreditGlyph />
        <span className="flex-1 text-ui font-medium" style={{ color: ON_INK_DIM }}>
          Credits
        </span>
        {balance.phase === "ready" && (
          <span className="text-ui font-medium tabular-nums" style={{ color: ON_INK }}>
            {balance.credits}
          </span>
        )}
        {balance.phase === "loading" && <Bar width={20} height={14} />}
        {balance.phase === "failed" && <span style={{ color: ON_INK_DIM }}>—</span>}
      </div>
      <div className="my-2.5 h-px" style={{ background: ON_INK_FAINT, marginLeft: 36 }} />
      <div className="flex items-center justify-between text-xs" style={{ paddingLeft: 36 }}>
        {balance.phase === "ready" && (
          <>
            <span style={{ color: ON_INK_DIM }}>{balance.credits === 0 ? "None left" : "Refills"}</span>
            <span style={{ color: balance.credits === 0 ? ON_INK : ON_INK_DIM }}>
              {balance.credits === 0 ? `on ${refillDate(balance.refillsAt)}` : refillDate(balance.refillsAt)}
            </span>
          </>
        )}
        {balance.phase === "loading" && <Bar width={120} height={10} />}
        {balance.phase === "failed" && <span style={{ color: ON_INK_DIM }}>Couldn&apos;t load</span>}
      </div>
    </Card>
  );
}

function LedgerRail({ balance }: { balance: FootBalance }) {
  return (
    <Card fill className="flex flex-col items-center gap-1 py-2">
      <CreditGlyph size={20} />
      <RailNumber balance={balance} small />
    </Card>
  );
}

// ── E · Units ── an outlined card; the month's credits as thirty cells,
// lit for what is left. Credits are whole units, so the drawing counts them.
function UnitsPanel({ balance }: { balance: FootBalance }) {
  const lit = balance.phase === "ready" ? balance.credits : 0;
  return (
    <Card className="p-3">
      <div className="flex items-baseline justify-between">
        {balance.phase === "ready" ? (
          <span className="tabular-nums" style={{ color: ON_INK }}>
            <span className="text-[22px] leading-none">{balance.credits}</span>
            <span className="text-sm" style={{ color: ON_INK_DIM }}>
              {" "}
              / {ALLOWANCE}
            </span>
          </span>
        ) : balance.phase === "loading" ? (
          <Bar width={48} height={18} />
        ) : (
          <span className="text-sm" style={{ color: ON_INK_DIM }}>
            —
          </span>
        )}
        <Eyebrow>Credits</Eyebrow>
      </div>
      <div className="mt-3 grid gap-[3px]" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
        {Array.from({ length: ALLOWANCE }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-[2px] ${balance.phase === "loading" ? "animate-pulse" : ""}`}
            style={{ background: i < lit ? ON_INK : ON_INK_FAINT }}
          />
        ))}
      </div>
      <p className="mt-2.5 text-xs" style={{ color: ON_INK_DIM }}>
        {balance.phase === "ready" ? refillLine(balance) : balance.phase === "failed" ? "Couldn't load credits" : " "}
      </p>
    </Card>
  );
}

function UnitsRail({ balance }: { balance: FootBalance }) {
  const share = balance.phase === "ready" ? Math.min(1, balance.credits / ALLOWANCE) : 0;
  return (
    <Card className="flex flex-col items-center gap-1.5 py-2.5">
      <RailNumber balance={balance} small />
      <span className="h-1 w-6 overflow-hidden rounded-full" style={{ background: ON_INK_FAINT }}>
        <span className="block h-full rounded-full" style={{ width: `${share * 100}%`, background: ON_INK }} />
      </span>
    </Card>
  );
}

// ── F · Date ── what you have on the left, when more arrives on the right,
// as a small calendar leaf.
function DatePanel({ balance }: { balance: FootBalance }) {
  const parts = balance.phase === "ready" ? refillParts(balance.refillsAt) : null;
  return (
    <Card fill className="flex items-center justify-between gap-3 py-2.5 pl-3.5 pr-2.5">
      <div>
        {balance.phase === "ready" && (
          <>
            <p className="text-[26px] leading-none tabular-nums" style={{ color: ON_INK }}>
              {balance.credits}
            </p>
            <p className="mt-1.5 text-xs" style={{ color: ON_INK_DIM }}>
              {balance.credits === 0 ? "none left" : balance.credits === 1 ? "credit left" : "credits left"}
            </p>
          </>
        )}
        {balance.phase === "loading" && (
          <>
            <Bar width={32} height={24} />
            <Bar width={70} height={10} className="mt-2" />
          </>
        )}
        {balance.phase === "failed" && <Unavailable />}
      </div>
      <div
        className="flex w-11 shrink-0 flex-col items-center rounded-[10px] py-1.5"
        style={{ background: ON_INK_FILL, boxShadow: `inset 0 0 0 1px ${ON_INK_FAINT}` }}
      >
        <span className="font-mono text-[10px] uppercase leading-none tracking-[0.08em]" style={{ color: ON_INK_DIM }}>
          {parts ? parts.month : "···"}
        </span>
        <span className="mt-1 text-ui font-medium leading-none tabular-nums" style={{ color: parts ? ON_INK : ON_INK_DIM }}>
          {parts ? parts.day : "—"}
        </span>
      </div>
    </Card>
  );
}

function DateRail({ balance }: { balance: FootBalance }) {
  const parts = balance.phase === "ready" ? refillParts(balance.refillsAt) : null;
  return (
    <Card fill className="flex flex-col items-center gap-1 py-2">
      <RailNumber balance={balance} small />
      <span className="font-mono text-[9px] uppercase leading-none tracking-[0.06em]" style={{ color: ON_INK_DIM }}>
        {parts ? `${parts.day} ${parts.month}` : "···"}
      </span>
    </Card>
  );
}

// ── Round 1, kept as the record ──
function LinePanel({ balance }: { balance: FootBalance }) {
  return (
    <div className="flex flex-col items-center pb-1.5 text-center">
      {balance.phase === "ready" && (
        <>
          <p className="text-ui tabular-nums" style={{ color: ON_INK }}>
            {credits(balance.credits)}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: ON_INK_DIM }}>
            {refillLine(balance)}
          </p>
        </>
      )}
      {balance.phase === "loading" && <Bar width={84} height={14} />}
      {balance.phase === "failed" && <Unavailable />}
    </div>
  );
}

function MeterPanel({ balance }: { balance: FootBalance }) {
  const share = balance.phase === "ready" ? Math.min(1, balance.credits / ALLOWANCE) : 0;
  return (
    <div className="flex flex-col items-center px-2.5 pb-1.5 text-center">
      <span className="text-sm tabular-nums" style={{ color: ON_INK }}>
        {balance.phase === "ready" ? `${balance.credits} / ${ALLOWANCE}` : "—"}
      </span>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full" style={{ background: ON_INK_FAINT }}>
        <div className="h-full rounded-full" style={{ width: `${share * 100}%`, background: ON_INK }} />
      </div>
    </div>
  );
}

function NumberRail({ balance }: { balance: FootBalance }) {
  return (
    <div className="flex h-11 items-center justify-center">
      <RailNumber balance={balance} />
    </div>
  );
}

function RingRail({ balance }: { balance: FootBalance }) {
  const share = balance.phase === "ready" ? Math.min(1, balance.credits / ALLOWANCE) : 0;
  const r = 16;
  const length = 2 * Math.PI * r;
  return (
    <div className="flex h-11 items-center justify-center">
      <span className="relative flex h-10 w-10 items-center justify-center">
        <svg width={40} height={40} viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
          <circle cx={20} cy={20} r={r} fill="none" stroke={ON_INK_FAINT} strokeWidth={3} />
          <circle
            cx={20}
            cy={20}
            r={r}
            fill="none"
            stroke={ON_INK}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={`${share * length} ${length}`}
          />
        </svg>
        <RailNumber balance={balance} small />
      </span>
    </div>
  );
}

// ── Parts ──

function Card({
  fill = false,
  className = "",
  style,
  children,
}: {
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={className}
      style={{
        borderRadius: RADIUS,
        background: fill ? ON_INK_FILL : undefined,
        boxShadow: fill ? undefined : `inset 0 0 0 1px ${ON_INK_FAINT}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function RailNumber({ balance, small = false }: { balance: FootBalance; small?: boolean }) {
  const size = small ? "text-sm" : "text-ui";
  if (balance.phase === "loading") return <Bar width={20} height={small ? 12 : 14} />;
  return (
    <span
      className={`relative ${size} font-medium leading-none tabular-nums`}
      style={{ color: balance.phase === "ready" ? ON_INK : ON_INK_DIM }}
    >
      {balance.phase === "ready" ? balance.credits : "—"}
    </span>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-micro uppercase tracking-[0.08em]" style={{ color: ON_INK_DIM }}>
      {children}
    </span>
  );
}

function Unavailable({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs ${className}`} style={{ color: ON_INK_DIM }}>
      Couldn&apos;t load credits
    </p>
  );
}

/**
 * A credit: a coin seen face on, on the rows' 24 grid in currentColor, so it
 * reads as one of the menu's own glyphs. Static — the card is not a control,
 * and the menu's glyphs move only under the pointer.
 */
function CreditGlyph({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="shrink-0"
      style={{ color: ON_INK_DIM }}
    >
      <circle cx={12} cy={12} r={8.5} />
      <circle cx={12} cy={12} r={4.5} />
    </svg>
  );
}

function Bar({ width, height, className = "" }: { width: number; height: number; className?: string }) {
  return (
    <span
      className={`block animate-pulse rounded-full ${className}`}
      style={{ width, height, background: ON_INK_FAINT }}
    />
  );
}
