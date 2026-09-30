"use client";

// ─────────────────────────────────────────────────────────────
// Folder shelf specimens — TEMPORARY
// ─────────────────────────────────────────────────────────────
// http://localhost:3000/dev/folder-shelf
//
// The tile itself was judged good. What is being sized here is the
// shelf around it, because the tile has no size of its own: FolderArt is
// `aspect-[5/4] w-full`, so the column width decides everything.
//
// Where the smallness comes from, at lg and above:
//   (680 - 5 gaps × 8px) / 6 columns ≈ 107px per column
//   minus the tile's own 6px padding each side ≈ 95px of drawn folder
//
// 680px is `max-w-content`, the shared "legacy reading column" that the
// history list has just moved off. So part of this is the same container
// problem rather than the tile.
//
// The base stays at one column whatever else changes: the shell holds a
// fixed 232px sidebar with no responsive behaviour, so a 375px viewport
// leaves roughly 79px for any page's content, and a multi-column grid
// there renders unusable tiles. That was a review finding once already.
//
// Nothing here is shipped and no real component is modified. Delete this
// route once the shelf size is chosen.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";

import { FolderCard } from "@/components/folders/folder-card";
import { HistoryCard } from "@/components/history/history-card";
import { useTheme } from "@/components/shared/theme-provider";
import { THEMES, type ThemeName } from "@/lib/constants/theme";

// ── Sample data ─────────────────────────────────────────────
// Counts chosen to exercise every branch of the sheet logic: many, then
// exactly two, exactly one, and empty.

const FOLDERS = [
  { id: "f1", name: "Machine Learning", emoji: "🧠", itemCount: 12 },
  { id: "f2", name: "Client work", emoji: "💼", itemCount: 2 },
  { id: "f3", name: "Interviews", emoji: "🎙️", itemCount: 1 },
  { id: "f4", name: "Reading queue", emoji: "📚", itemCount: 0 },
  { id: "f5", name: "Conference talks", emoji: "🎤", itemCount: 7 },
  { id: "f6", name: "Papers", emoji: "📄", itemCount: 3 },
] as const;

const CREATED_AT = "2026-08-01T00:00:00Z";

// ── Dials ───────────────────────────────────────────────────

type WidthName = "legacy" | "wide" | "fluid";

const WIDTHS: Record<WidthName, { label: string; className: string }> = {
  legacy: { label: "680px · as it ships", className: "max-w-[680px]" },
  wide: { label: "960px · matches history", className: "max-w-[960px]" },
  fluid: { label: "Fluid", className: "max-w-none" },
};

const WIDTH_ORDER: readonly WidthName[] = ["legacy", "wide", "fluid"];

type ColumnsName = "six" | "five" | "four" | "three";

// Written out in full rather than built from a template, because
// Tailwind scans source text and would not generate a class it never
// literally sees.
const COLUMNS: Record<ColumnsName, { label: string; className: string }> = {
  six: { label: "6 · as it ships", className: "grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" },
  five: { label: "5", className: "grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" },
  four: { label: "4", className: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" },
  three: { label: "3", className: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3" },
};

const COLUMNS_ORDER: readonly ColumnsName[] = ["six", "five", "four", "three"];

type GapName = "tight" | "roomy";

const GAPS: Record<GapName, { label: string; className: string }> = {
  tight: { label: "8px · as it ships", className: "gap-2" },
  roomy: { label: "16px", className: "gap-4" },
};

const GAP_ORDER: readonly GapName[] = ["tight", "roomy"];

// ── Folder size within its cell ─────────────────────────────
// The tile is `w-full`, so left alone it is exactly as wide as its grid
// column. Capping the cell and centring it is what lets the drawn folder
// come down a little while the column count and the container stay put —
// and it does it from the shelf, leaving the merged component alone.
//
// At 6 columns in 960px with a 16px gap the cell is ~147px, so these are
// small steps down from there rather than a resize.

type TileName = "fill" | "s136" | "s128" | "s120";

const TILES: Record<TileName, { label: string; className: string }> = {
  fill: { label: "Fill the cell", className: "max-w-none" },
  s136: { label: "136px", className: "max-w-[136px]" },
  s128: { label: "128px", className: "max-w-[128px]" },
  s120: { label: "120px", className: "max-w-[120px]" },
};

const TILE_ORDER: readonly TileName[] = ["fill", "s136", "s128", "s120"];

// ── Page chrome ─────────────────────────────────────────────

function Control<T extends string>({
  legend,
  options,
  value,
  onChange,
  labelFor,
}: {
  legend: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  labelFor: (option: T) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-[80px] shrink-0 text-sm text-xn-ink-soft">{legend}</span>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={[
            "rounded-xn-pill border px-3 py-1 text-xs font-medium transition-colors duration-xn ease-xn",
            value === option
              ? "border-xn-ink bg-xn-ink text-xn-bg"
              : "border-xn-border bg-xn-surface text-xn-ink-muted hover:border-xn-border-strong",
          ].join(" ")}
        >
          {labelFor(option)}
        </button>
      ))}
    </div>
  );
}

const THEME_BUTTON_ACTIVE: Record<ThemeName, string> = {
  light:
    "[html[data-theme=light]_&]:border-xn-ink [html[data-theme=light]_&]:bg-xn-ink [html[data-theme=light]_&]:text-xn-bg [html[data-theme=light]_&]:shadow-xn",
  dark:
    "[html[data-theme=dark]_&]:border-xn-ink [html[data-theme=dark]_&]:bg-xn-ink [html[data-theme=dark]_&]:text-xn-bg [html[data-theme=dark]_&]:shadow-xn",
};

export default function FolderShelfSpecimensPage() {
  const { setTheme } = useTheme();
  const [width, setWidth] = useState<WidthName>("wide");
  const [columns, setColumns] = useState<ColumnsName>("six");
  const [gap, setGap] = useState<GapName>("roomy");
  const [tile, setTile] = useState<TileName>("s136");

  // The tile has no intrinsic size, so the only honest way to judge one
  // is to read what it actually came out as.
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [drawnWidth, setDrawnWidth] = useState<number | null>(null);

  const measure = useCallback(() => {
    const art = gridRef.current?.querySelector("span[aria-hidden]");
    if (art) setDrawnWidth(Math.round(art.getBoundingClientRect().width));
  }, []);

  useEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (gridRef.current) observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, [measure, width, columns, gap, tile]);

  return (
    <div className="flex min-h-screen bg-xn-bg">
      <aside className="hidden w-[232px] shrink-0 border-r border-xn-border bg-xn-surface lg:block">
        <p className="p-6 font-mono text-xs text-xn-ink-faint">
          232px sidebar
          <br />
          (mock — real shell width)
        </p>
      </aside>

      <div className="min-w-0 flex-1 px-8 py-14">
        <header className="pb-10">
          <p className="eyebrow mb-3">Specimens · not shipped</p>
          <h1 className="text-h3 font-semibold text-xn-ink">The folder shelf</h1>
          <p className="mt-3 max-w-[62ch] text-body text-xn-ink-muted">
            The tile is the shipped component, untouched. Only the shelf around
            it changes — column count, container width, and the gap. The tile is
            <code className="mx-1 font-mono text-sm">aspect-[5/4] w-full</code>,
            so those three numbers are the whole of its size.
          </p>

          <div className="mt-6 inline-flex gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={[
                  "rounded-xn-pill border px-4 py-2 text-ui font-medium",
                  "border-xn-border-strong bg-xn-surface text-xn-ink-muted shadow-xn-1",
                  "transition-[box-shadow,transform,background-color,color,border-color] duration-xn ease-xn",
                  "hover:-translate-y-0.5 hover:shadow-xn-hover",
                  "active:translate-y-px active:duration-xn-fast active:shadow-xn-1",
                  THEME_BUTTON_ACTIVE[t],
                ].join(" ")}
              >
                {t === "dark" ? "Dark" : "Light"}
              </button>
            ))}
          </div>
        </header>

        <section className="border-t border-xn-border py-10">
          <div className="flex flex-col gap-3">
            <Control legend="Columns" options={COLUMNS_ORDER} value={columns}
              onChange={setColumns} labelFor={(c) => COLUMNS[c].label} />
            <Control legend="Width" options={WIDTH_ORDER} value={width}
              onChange={setWidth} labelFor={(w) => WIDTHS[w].label} />
            <Control legend="Gap" options={GAP_ORDER} value={gap}
              onChange={setGap} labelFor={(g) => GAPS[g].label} />
            <Control legend="Folder" options={TILE_ORDER} value={tile}
              onChange={setTile} labelFor={(t) => TILES[t].label} />
          </div>

          <p className="mt-5 font-mono text-xs text-xn-ink-soft">
            Drawn folder: {drawnWidth === null ? "measuring…" : `${drawnWidth}px wide`}
            {" · "}
            {COLUMNS[columns].label.split(" · ")[0]} columns at{" "}
            {WIDTHS[width].label.split(" · ")[0]}, {GAPS[gap].label.split(" · ")[0]} gap,
            cell capped at {TILES[tile].label.toLowerCase()}
          </p>

          <div
            ref={gridRef}
            className={`mt-6 grid justify-items-center ${COLUMNS[columns].className} ${GAPS[gap].className} ${WIDTHS[width].className}`}
          >
            {FOLDERS.map((folder) => (
              <div key={folder.id} className={`w-full ${TILES[tile].className}`}>
                <FolderCard
                  folder={{
                    id: folder.id,
                    name: folder.name,
                    emoji: folder.emoji,
                    color: "#3B7AE8",
                    itemCount: folder.itemCount,
                    createdAt: CREATED_AT,
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* "Match the size" is only answerable by putting them together. */}
        <section className="border-t border-xn-border py-10">
          <h2 className="text-h4 font-semibold text-xn-ink">Against a history row</h2>
          <p className="mt-1.5 max-w-[62ch] text-ui text-xn-ink-muted">
            Both surfaces at the settings above, so the tile can be sized against
            the row rather than against a memory of it. The row is 136px tall
            with a 192×108 still.
          </p>

          <div className={`mt-6 ${WIDTHS[width].className}`}>
            <div
              className={`grid justify-items-center ${COLUMNS[columns].className} ${GAPS[gap].className}`}
            >
              {FOLDERS.map((folder) => (
                <div key={folder.id} className={`w-full ${TILES[tile].className}`}>
                  <FolderCard
                    folder={{
                      id: folder.id,
                      name: folder.name,
                      emoji: folder.emoji,
                      color: "#3B7AE8",
                      itemCount: folder.itemCount,
                      createdAt: CREATED_AT,
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6">
              <HistoryCard
                item={{
                  id: "i1",
                  contentType: "research",
                  title: "Attention Is All You Need — the transformer paper explained end to end",
                  channel: "Yannic Kilcher",
                  thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
                  wordCount: 1840,
                  createdAt: CREATED_AT,
                  markdown: "",
                  body: { markdown: "" },
                  folderId: "f1",
                }}
                folderLabel={{ name: "Machine Learning", emoji: "🧠" }}
                onMove={() => {}}
              />
            </div>
          </div>
        </section>

        <footer className="border-t border-xn-border py-10">
          <p className="text-sm text-xn-ink-soft">
            Delete this route once the shelf size is chosen.
          </p>
        </footer>
      </div>
    </div>
  );
}
