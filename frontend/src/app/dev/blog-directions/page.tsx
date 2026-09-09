"use client";

// src/app/dev/blog-directions/page.tsx  →  route: /dev/blog-directions
//
// Four directions for the blog output surface. Not shipped.
//
// ── Why this renders inside the REAL AppShell ──
//
// Same reason the create directions do. /output/[id] is behind auth and the
// browser tooling has no session, so this is the only way these compositions
// can be looked at at all — and the bible records three rounds of confident
// arithmetic about how wide the content area is, each one wrong, because the
// harness was a chosen number rather than the real container.
//
// The menu is left LIVE. Collapse it and every direction reflows across the
// 168px it moves, which is the only honest way to see whether a two-pane or
// three-column layout survives contact with the shell.
//
// ── One deviation from the create harness ──
//
// That one wraps its directions in `max-w-output`, because every create
// direction shares the route's column. These do NOT get a shared container:
// how wide the content is, and whether there is one column width at all, is
// the substance of what is being chosen here. Direction C has no single
// column by design. Imposing one would decide the question the specimens
// exist to ask.

import { useState } from "react";

import { AppShell } from "@/components/layout";
import { useTheme } from "@/components/shared/theme-provider";

import { DirectionBlocks } from "./direction-blocks";
import { DirectionManuscript } from "./direction-manuscript";
import { DirectionReader } from "./direction-reader";
import { DirectionSplit } from "./direction-split";
import { HIGHLIGHTERS } from "./shared";

const DIRECTIONS = [
  {
    id: "reader",
    label: "A · Reader",
    note: "No card. One 64ch column on the page's own background, with a scroll-tracking index in the left margin.",
  },
  {
    id: "manuscript",
    label: "B · Manuscript",
    note: "Prose down the middle, numbers left, a margin rail right carrying each section's source timestamp, transcript line and actions.",
  },
  {
    id: "blocks",
    label: "C · Blocks",
    note: "Hoverable blocks with per-block actions. The measure is per block: prose at 64ch, quotes wider, tables at full 960.",
  },
  {
    id: "split",
    label: "D · Split",
    note: "Reading pane plus a source pane carrying the video and Contents. A pinned bar holds the metadata and the section tracker. Collapsible.",
  },
] as const;

type DirectionId = (typeof DIRECTIONS)[number]["id"];

/** What each direction assumes that the backend does not currently provide. */
const AHEAD_OF_BACKEND: Partial<Record<DirectionId, string>> = {
  manuscript:
    "Needs per-section provenance. Generation returns one prose blob; nothing maps a paragraph to a transcript range. The timestamps shown are authored.",
  blocks:
    "Per-block regenerate needs generation to address a block. Today the smallest unit it can produce is the whole post.",
  split:
    "The thumbnail links out; there is no embedded player. Contents and the tracker need the post to have addressable sections — generation returns one markdown blob, so porting means deriving sections from its headings. Feasible in the frontend, but it is work.",
};

export default function BlogDirectionsPage() {
  const [direction, setDirection] = useState<DirectionId>("reader");
  const [highlighter, setHighlighter] = useState(HIGHLIGHTERS[0].id);
  const { theme, setTheme } = useTheme();

  const active = DIRECTIONS.find((entry) => entry.id === direction);
  const warning = AHEAD_OF_BACKEND[direction];
  const mark = HIGHLIGHTERS.find((entry) => entry.id === highlighter) ?? HIGHLIGHTERS[0];

  return (
    <>
      <AppShell>
        {/* One wrapper sets `--xn-hl` for everything under it, so switching
            the highlighter is a single variable rather than a prop threaded
            through four directions and every text renderer inside them.

            The value is picked per theme HERE because the five system marks
            are already theme-aware variables and the lime proposal is not —
            it needs a different colour on dark to stay under light ink. */}
        <div
          style={
            {
              "--xn-hl": (theme === "dark" ? mark.dark : mark.light).bg,
              "--xn-hl-ink": (theme === "dark" ? mark.dark : mark.light).ink,

              // The quote fill needs a different STRENGTH per theme, not a
              // different colour. Both mix the format colour into the surface,
              // but on dark the surface is nearly black, so the same 13% that
              // reads as a soft blue panel on light loses almost all its hue.
              //
              // The dark figure has been wrong in both directions. 13% into
              // transparent measured chroma 17 and read as grey. 30% measured
              // 39 and read as a coloured panel competing with the prose. 22%
              // was closer; 20% is where Hemanth settled it — chroma ~26,
              // present enough to be a colour, quiet enough to stay a
              // background.
              //
              // Light keeps 13%, which is `formatTints`' chip strength and has
              // not been the problem in any round.
              "--xn-quote-fill":
                theme === "dark"
                  ? "color-mix(in srgb, var(--xn-fmt-blog) 20%, var(--xn-surface))"
                  : "color-mix(in srgb, var(--xn-fmt-blog) 13%, var(--xn-surface))",
            } as React.CSSProperties
          }
        >
          {direction === "reader" && <DirectionReader />}
          {direction === "manuscript" && <DirectionManuscript />}
          {direction === "blocks" && <DirectionBlocks />}
          {direction === "split" && <DirectionSplit />}
        </div>
      </AppShell>

      {/* ── Harness controls ──
          Fixed, not in the column: a control bar inside the content would take
          vertical space from the thing being judged and shift every
          composition down by its own height. */}
      <div className="fixed bottom-4 right-4 z-50 w-[300px] rounded-xn-lg border border-xn-border bg-xn-surface p-3 shadow-xn-lg">
        <div className="flex items-center justify-between">
          <p className="font-mono text-micro uppercase tracking-wide text-xn-ink-soft">
            Direction
          </p>
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-xn-sm px-2 py-1 font-mono text-micro text-xn-ink-muted transition-colors duration-xn ease-xn hover:bg-xn-surface-alt hover:text-xn-ink"
          >
            {theme === "dark" ? "→ light" : "→ dark"}
          </button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1">
          {DIRECTIONS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setDirection(entry.id)}
              className={[
                "rounded-xn-sm px-2 py-1.5 text-left text-sm transition-colors duration-xn ease-xn",
                entry.id === direction
                  ? "bg-xn-ink text-xn-bg"
                  : "text-xn-ink-muted hover:bg-xn-surface-alt hover:text-xn-ink",
              ].join(" ")}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <p className="mt-2 text-xs leading-snug text-xn-ink-soft">{active?.note}</p>

        {/* ── Highlighter ──
            Quotes are always the CONTENT TYPE's colour; this picks the one
            standard colour used for key phrases across every format. Each
            swatch shows the actual value, so the choice is made by looking
            rather than by reading a hex. */}
        <p className="mt-3 font-mono text-micro uppercase tracking-wide text-xn-ink-soft">
          Key-phrase highlight
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {HIGHLIGHTERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setHighlighter(entry.id)}
              className={[
                "flex items-center gap-1.5 rounded-xn-sm px-2 py-1 text-xs transition-colors duration-xn ease-xn",
                entry.id === highlighter
                  ? "bg-xn-ink text-xn-bg"
                  : "text-xn-ink-muted hover:bg-xn-surface-alt hover:text-xn-ink",
              ].join(" ")}
            >
              <span
                aria-hidden
                className="h-3 w-3 rounded-full border border-xn-border"
                style={{ background: (theme === "dark" ? entry.dark : entry.light).bg }}
              />
              {entry.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs leading-snug text-xn-ink-soft">{mark.note}</p>

        {/* The one thing about these specimens that is not a matter of taste. */}
        {warning && (
          <p className="mt-3 rounded-xn-sm border border-xn-danger bg-xn-danger-soft p-2 text-xs leading-snug text-xn-danger">
            {warning}
          </p>
        )}
      </div>
    </>
  );
}
