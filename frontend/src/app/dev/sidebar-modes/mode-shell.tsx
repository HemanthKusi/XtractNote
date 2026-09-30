"use client";

// src/app/dev/sidebar-modes/mode-shell.tsx
//
// The shell around the one floating menu. Specimen only; never ships.
//
// ── Two structural consequences, both forced rather than chosen ──
//
// 1. The logo is pinned to the shell's top-left corner, so the shell is an L:
//    one full-width header across the top with the logo at its far left, and
//    the menu floating below it. A logo that lived in the menu would move
//    every time the menu changed shape, which is the opposite of permanent.
//
// 2. The menu floats in EVERY mode, so it is never in document flow and the
//    page cannot sit beside it as a sibling column. The page gives up a
//    padding-left instead, on the same curve, so content never runs under the
//    panel or the dock. The collapsed button reserves nothing — it is small
//    and content flowing past it is the point of collapsing.

import { useEffect, useRef, useState } from "react";

import { Logo } from "@/components/layout/logo";
import {
  HEADER_H,
  MORPH_CSS_EASE,
  reservedFor,
  type MenuMode,
  type PanelHoverSettings,
} from "./menu-modes";
import { MENU_ICONS } from "./menu-icons";
import { MorphingMenu } from "./morphing-menu";

export function ModeShell({
  mode,
  onModeChange,
  railWidth,
  morphMs,
  iconPx,
  iconZoom,
  iconSpeed,
  menuTitlePx,
  panelHover,
  enableAll,
  shellWidth,
  height = 620,
}: {
  mode: MenuMode;
  onModeChange: (m: MenuMode) => void;
  railWidth: number;
  morphMs: number;
  iconPx: number;
  iconZoom: number;
  iconSpeed: number;
  menuTitlePx: number;
  panelHover: PanelHoverSettings;
  enableAll: boolean;
  /** Simulated viewport. See the note in page.tsx on why this dial exists. */
  shellWidth: number;
  height?: number;
}) {
  const [activeId, setActiveId] = useState("history");
  const [contentWidth, setContentWidth] = useState(0);
  const [columnCap, setColumnCap] = useState(0);
  const columnRef = useRef<HTMLDivElement>(null);

  // Measured, not computed. The number under the specimen is what the browser
  // actually laid out — the one habit this project keeps relearning.
  useEffect(() => {
    const el = columnRef.current;
    if (!el) return;
    setColumnCap(Math.round(parseFloat(getComputedStyle(el).maxWidth) || 0));
    const ro = new ResizeObserver(([entry]) => setContentWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const reserved = reservedFor(mode, railWidth);
  const capThreshold = columnCap ? columnCap + 64 + reserved : 0;
  const capped = columnCap > 0 && contentWidth >= columnCap;

  return (
    <div
      className="relative mx-auto overflow-hidden rounded-xn-lg border border-xn-border bg-xn-bg"
      style={{ height, width: shellWidth, maxWidth: "100%" }}
    >
      {/* ── Top row: logo pinned at the corner, then the topbar ── */}
      <header
        className="relative z-40 flex items-center border-b border-xn-border bg-xn-bg"
        style={{ height: HEADER_H }}
      >
        <div className="flex w-[188px] shrink-0 items-center pl-4">
          <Logo size={22} showWordmark />
        </div>
        <div className="flex flex-1 items-center gap-3 px-4">
          <div className="flex w-full max-w-[420px] items-center gap-2 rounded-xn-md bg-xn-surface-alt px-3 py-1.5">
            <span className="text-xn-ink-soft">
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </span>
            <span className="flex-1 text-sm text-xn-ink-soft">Search your library…</span>
            <span className="rounded border border-xn-border px-1.5 py-px font-mono text-micro text-xn-ink-soft">⌘K</span>
          </div>
          <div className="ml-auto h-7 w-7 rounded-full bg-xn-surface-alt" />
        </div>
      </header>

      {/* ── The page. Reserves the menu's room rather than sitting beside it. ── */}
      <div
        style={{
          height: height - HEADER_H,
          paddingLeft: reserved,
          transition: `padding-left ${morphMs}ms ${MORPH_CSS_EASE}`,
        }}
      >
        <main className="h-full overflow-y-auto px-8 py-6">
          <div ref={columnRef} className="mx-auto w-full max-w-output">
            <header className="mb-5">
              <h1 className="font-serif text-h2 text-xn-ink">History</h1>
              <p className="mt-1 text-body text-xn-ink-muted">
                Content column measures <span className="font-mono text-xn-ink">{contentWidth}px</span> in this mode.
              </p>
              {/* The finding this specimen nearly hid: above a threshold the
                  column is capped, so collapsing the menu moves the margins
                  and gives the content nothing. */}
              <p className={["mt-1 font-mono text-micro", capped ? "text-xn-danger" : "text-xn-ink-soft"].join(" ")}>
                {capped
                  ? `CAPPED at ${columnCap} — this mode buys the content nothing here; only the margins move. Drop the shell below ${capThreshold}px to see it matter.`
                  : `Uncapped — ${columnCap - contentWidth}px short of the ${columnCap} ceiling, so width won here.`}
              </p>
            </header>

            {/* The flashcard grid's own rule, verbatim. Columns are derived
                from this container, so a mode that gives back width genuinely
                buys a column — it is the same CSS, not a claim. */}
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(310px,100%),1fr))]">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-xn-lg border border-xn-border bg-xn-surface p-4 shadow-xn-1">
                  <div className="mb-3 h-20 rounded-xn-md bg-xn-surface-alt" />
                  <div className="mb-2 h-2.5 w-4/5 rounded-full bg-xn-surface-alt" />
                  <div className="h-2.5 w-3/5 rounded-full bg-xn-surface-alt" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* ── The menu. One element, floating in every mode. ── */}
      <MorphingMenu
        mode={mode}
        onModeChange={onModeChange}
        activeId={activeId}
        onSelect={setActiveId}
        railWidth={railWidth}
        shellHeight={height}
        morphMs={morphMs}
        iconPx={iconPx}
        iconZoom={iconZoom}
        iconSpeed={iconSpeed}
        menuTitlePx={menuTitlePx}
        panelHover={panelHover}
        enableAll={enableAll}
        icons={MENU_ICONS}
      />
    </div>
  );
}
