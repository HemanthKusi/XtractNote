"use client";

// src/app/dev/menu-credits/page.dev.tsx  →  route: /dev/menu-credits
//
// The credit balance at the foot of the side menu (#460): the directions to
// choose from, kept as the record. **G2c · Cells was chosen**: in the panel,
// the tile with an 8px bar; in the rail, the ring as thirty cells, 46px with
// a 14px number; both filling as they come into view. When the menu is too
// short for those, K3 · Slim (round 5) takes over. Round 4 (G2a–c)
// refined round 3's G2; round 3 (G1–G3) joined C's tile to round 1's ring;
// round 2 (C–F) is cards, C being the reference Hemanth gave; round 1 (A, B)
// is where it started. Built from the real shell's parts — the header, the logo, the
// topbar and MenuShell — with only the menu's foot changing. The menu's own
// controls switch between the panel, the rail and the button, so each
// direction is seen in every mode and with the menu's own motion.
//
// The balance is set from the controls; nothing here reads the account.

import { useState } from "react";

import { Logo } from "@/components/layout/logo";
import { MenuShell } from "@/components/layout/menu";
import { HEADER_H } from "@/components/layout/menu/menu-geometry";
import { Topbar } from "@/components/layout/topbar";
import { useTheme } from "@/components/shared/theme-provider";

import { FitFoot, Foot, type CompactLook, type FootBalance, type FootDirection } from "./foot-directions";

/** Round 5: G2c with a compact card for when the full one would cover a row. */
type FitDirection = "fitLine" | "fitRow" | "fitSlim";
type Direction = FootDirection | FitDirection;

const COMPACT: Record<FitDirection, CompactLook> = { fitLine: "line", fitRow: "row", fitSlim: "slim" };

function isFit(direction: Direction): direction is FitDirection {
  return direction in COMPACT;
}

type LoadPhase = "ready" | "loading" | "failed";

interface Choice<T extends string> {
  id: T;
  label: string;
  note: string;
}

const DIRECTIONS: Choice<Direction>[] = [
  {
    id: "today",
    label: "Today",
    note: "Nothing below the rows. For reference.",
  },
  {
    id: "fitLine",
    label: "K1 · Line",
    note: "Round 5 — G2c, plus a compact card for short screens. Lower the menu height below: when the tile would cover a row, a 44px card takes over — \"28 / 30\" with a bar of what is left beside it. In the rail, the count in a small card. Hidden only when neither fits.",
  },
  {
    id: "fitRow",
    label: "K2 · Row",
    note: "Round 5. The compact card drawn as one of the menu's own rows: a small cell ring in the icons' column, \"28 / 30\" on the labels' axis.",
  },
  {
    id: "fitSlim",
    label: "K3 · Slim",
    note: "Chosen. Round 5. An outlined card at row height: \"CREDITS\" and \"28 / 30\" on one line, a thin bar beneath. In the rail, the count in a small card.",
  },
  {
    id: "dial",
    label: "G2a · Dial",
    note: "Round 4 — G2 refined. Panel: the tile with an 8px bar. Rail: the ring with a faint disc inside the track, the number on it, so it reads as a dial. Both fill from empty, the number counting up, each time the form comes into view.",
  },
  {
    id: "head",
    label: "G2b · Head",
    note: "Round 4. Same panel. Rail: a knob at the arc's end marks where the balance stands; at zero it rests at twelve o'clock on the empty track. Fills and counts as G2a.",
  },
  {
    id: "cells",
    label: "G2c · Cells",
    note: "Chosen. Round 4. Same panel. Rail: the ring as thirty segments, one per credit, lit for what is left — they light one by one as it fills. 46px, with a 14px number.",
  },
  {
    id: "ringCard",
    label: "G1 · Ring in a card",
    note: "Round 3. Panel: C's tile with \"/ 30\" and a thicker bar of the month's allowance. Rail: round 1's ring, thicker and round-ended from twelve o'clock, inside a small card shaped like the tile — so the two forms read as one object.",
  },
  {
    id: "ringBold",
    label: "G2 · Bolder ring",
    note: "Round 3. Same panel tile. Rail: no card — a larger ring alone, as round 1's B was, but thicker and round-ended.",
  },
  {
    id: "ringDate",
    label: "G3 · Ring and date",
    note: "Round 3. Same panel tile. Rail: G1's ring in its card, with the refill day (\"30 OCT\") beneath it.",
  },
  {
    id: "tile",
    label: "C · Tile",
    note: "The reference. A filled card one step lighter than the menu, a large centred number, the refill date beneath. Rail: the number in a small card.",
  },
  {
    id: "ledger",
    label: "D · Ledger",
    note: "A credit glyph in the rows' own icon column, \"Credits\" in the rows' type and the balance on the right like a row's value; the refill date under a hairline. Rail: the glyph over the number. The one that reads as part of the menu.",
  },
  {
    id: "units",
    label: "E · Units",
    note: "An outlined card, not a filled one. \"28 / 30\" and the month's thirty credits as cells, lit for what is left. Rail: the number over a short bar.",
  },
  {
    id: "date",
    label: "F · Date",
    note: "What you have on the left, when more arrives on the right as a small calendar leaf (\"OCT 30\"). Rail: the number over the date. Puts the refill on equal footing with the balance.",
  },
  {
    id: "line",
    label: "Round 1 · A · Line",
    note: "First round, kept as the record. Plain text, no card.",
  },
  {
    id: "meter",
    label: "Round 1 · B · Meter",
    note: "First round, kept as the record. A bar, no card.",
  },
];

const BALANCES = [30, 28, 3, 0];

/** The shell height the menu is laid out for — full is the window. */
const MENU_HEIGHTS: { id: string; label: string; px: number | null }[] = [
  { id: "full", label: "Full", px: null },
  { id: "640", label: "640", px: 640 },
  { id: "560", label: "560", px: 560 },
  { id: "480", label: "480", px: 480 },
];

const PHASES: { id: LoadPhase; label: string }[] = [
  { id: "ready", label: "Loaded" },
  { id: "loading", label: "Loading" },
  { id: "failed", label: "Failed" },
];

const REFILLS_AT = "2026-10-30T19:30:49+00:00";

export default function MenuCreditsPage() {
  const [direction, setDirection] = useState<Direction>("fitSlim");
  const [menuHeight, setMenuHeight] = useState("full");
  const [credits, setCredits] = useState(28);
  const [phase, setPhase] = useState<LoadPhase>("ready");
  const [folded, setFolded] = useState(false);
  const { theme, setTheme } = useTheme();

  const balance: FootBalance =
    phase === "ready" ? { phase, credits, refillsAt: REFILLS_AT } : { phase };

  const small =
    "rounded-xn-sm px-2 py-1 font-mono text-micro text-xn-ink-muted transition-colors duration-xn ease-xn hover:bg-xn-surface-alt hover:text-xn-ink";

  return (
    <>
      <div className="relative flex h-screen flex-col overflow-hidden">
        <header className="flex shrink-0" style={{ height: HEADER_H }}>
          <div className="flex w-[188px] shrink-0 items-center border-b border-xn-border bg-xn-bg pl-4">
            <Logo size={22} showWordmark />
          </div>
          <div className="min-w-0 flex-1">
            <Topbar />
          </div>
        </header>

        <MenuShell
          shellHeight={MENU_HEIGHTS.find((h) => h.id === menuHeight)?.px ?? undefined}
          foot={
            direction === "today"
              ? undefined
              : isFit(direction)
                ? (mode, room) => <FitFoot compact={COMPACT[direction]} mode={mode} room={room} balance={balance} />
                : (mode) => <Foot direction={direction} mode={mode} balance={balance} />
          }
        >
          <div className="mx-auto max-w-output">
            <h1 className="text-h3 text-xn-ink">Credits in the menu</h1>
            <p className="mt-3 max-w-prose text-xn-ink-muted">
              The balance sits at the foot of the menu. Use the menu&apos;s own arrow and button to see it in
              the panel, in the rail, and gone while the menu is the round button.
            </p>
          </div>
        </MenuShell>
      </div>

      {folded ? (
        <button
          type="button"
          onClick={() => setFolded(false)}
          className="fixed bottom-4 right-4 z-50 rounded-xn-lg border border-xn-border bg-xn-surface px-3 py-2 font-mono text-micro text-xn-ink-muted shadow-xn-lg"
        >
          Controls
        </button>
      ) : (
        <div className="fixed bottom-4 right-4 z-50 max-h-[calc(100vh-2rem)] w-[332px] overflow-y-auto rounded-xn-lg border border-xn-border bg-xn-surface p-3 shadow-xn-lg">
          <div className="flex items-center justify-between">
            <p className="font-mono text-micro uppercase tracking-wide text-xn-ink-soft">Menu credits</p>
            <span className="flex items-center gap-1">
              <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className={small}>
                {theme === "dark" ? "→ light" : "→ dark"}
              </button>
              <button type="button" onClick={() => setFolded(true)} className={small}>
                hide
              </button>
            </span>
          </div>

          <Directions title="Direction" options={DIRECTIONS} value={direction} onChange={setDirection} />
          <Picker
            title="Balance"
            options={BALANCES.map((n) => ({ id: String(n), label: String(n) }))}
            value={String(credits)}
            onChange={(id) => setCredits(Number(id))}
          />
          <Picker title="Balance load" options={PHASES} value={phase} onChange={setPhase} />
          <Picker title="Menu height" options={MENU_HEIGHTS} value={menuHeight} onChange={setMenuHeight} />

          <p className="mt-3 text-xs leading-snug text-xn-ink-soft">
            The menu&apos;s mode is changed with the menu itself — its arrow for the rail, its button to
            collapse. The balance is set here; nothing reads the account.
          </p>
        </div>
      )}
    </>
  );
}

function Picker<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <>
      <p className="mt-3 font-mono text-micro uppercase tracking-wide text-xn-ink-soft">{title}</p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={[
              "rounded-xn-sm px-2 py-1.5 text-left text-sm transition-colors duration-xn ease-xn",
              option.id === value
                ? "bg-xn-ink text-xn-bg"
                : "text-xn-ink-muted hover:bg-xn-surface-alt hover:text-xn-ink",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </>
  );
}

function Directions<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Choice<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  const active = options.find((option) => option.id === value);
  return (
    <>
      <Picker title={title} options={options} value={value} onChange={onChange} />
      <p className="mt-1.5 text-xs leading-snug text-xn-ink-soft">{active?.note}</p>
    </>
  );
}
