// src/components/folders/folder-card.tsx
// Presentational tile for a single folder. No data/state — the folders page
// supplies the Folder and decides what onOpen does.
//
// ── Why this is not a Card ──
// It used to be a <Card> holding an emoji chip, a name and a count: the same
// rectangle the history rows and the type picker were using for three other
// kinds of data. A folder is not a document and not a control, so it now
// draws as a folder — a back panel, the sheets it holds, and a front panel
// that folds open under the cursor.
//
// ── One colour for every folder ──
// The tint used to come from folder.color, which meant a wall of folders was
// a wall of different colours competing with the seven content-format
// colours — the only saturated things that are supposed to mean anything
// here. Every folder is now the same amber, and identity comes from the
// emoji and the name. folder.color is still stored and still used elsewhere;
// this tile just stops reading it.
//
// The amber is fixed in both themes rather than inverting: manila is a
// physical colour, the same reasoning that keeps a paper sheet white on a
// dark ground.

"use client";

import type { CSSProperties } from "react";

import type { Folder } from "@/lib/api/folders";

// ── Motion ──────────────────────────────────────────────────
// A plain ease-out with no overshoot. That is a choice about how a
// folder should open, not a rule being obeyed: no curve is prescribed
// and none is banned, so overshoot was available here and simply did
// not suit a paper fold.
//
// 320ms (--xn-dur-slow) where the reference used 450ms. The shortening
// was originally required by a hard cap on app motion; that cap is now
// a default rather than a limit, so the slower original is available if
// this ever reads too brisk on a real page.

const FOLDER_EASE = "cubic-bezier(0.22,0.61,0.36,1)";

// ── Colour ──────────────────────────────────────────────────

const SKIN = {
  back1: "#E5AE3C",
  back2: "#D08F21",
  front1: "#F5C65C",
  front2: "#E7AF3A",
  edge: "#B87A14",
} as const;

// ── Sheets ──────────────────────────────────────────────────
// The newest item is widest, sits on top, and rises straight up. The two
// behind it splay outward so the fan reads back in time from the centre.

interface Paper {
  width: string;
  height: string;
  fill: string;
  /** Where it travels when the folder opens. */
  lift: string;
}

const PAPER_NEWEST: Paper = {
  width: "86%",
  height: "78%",
  fill: "#FDFDFB",
  lift: "translateY(-26%)",
};
const PAPER_SECOND: Paper = {
  width: "78%",
  height: "70%",
  fill: "#F6F4EE",
  lift: "translate(-26%, -18%) rotate(-7deg)",
};
const PAPER_THIRD: Paper = {
  width: "82%",
  height: "74%",
  fill: "#FBFAF6",
  lift: "translate(22%, -22%) rotate(6deg)",
};

/**
 * Which sheets a folder draws, given how many items it holds.
 *
 * A folder with one item should not show three sheets — the art would be
 * claiming contents that are not there. Array order is paint order, so the
 * newest is last and lands on top.
 *
 * The sheets are blank rather than showing real content: the folders query
 * fetches a count and nothing else, so there is no per-item data on this
 * page to draw from. Showing real previews needs that query to return rows,
 * which is a data change rather than a visual one.
 */
function papersFor(itemCount: number): readonly Paper[] {
  if (itemCount <= 0) return [];
  if (itemCount === 1) return [PAPER_NEWEST];
  if (itemCount === 2) return [PAPER_SECOND, PAPER_NEWEST];
  return [PAPER_SECOND, PAPER_THIRD, PAPER_NEWEST];
}

// "No items yet" / "1 item" / "5 items"
function itemCountLabel(n: number): string {
  if (n === 0) return "No items yet";
  return `${n} item${n === 1 ? "" : "s"}`;
}

// ── The drawing ─────────────────────────────────────────────
// Kept beside its only caller rather than promoted to a shared file; it
// moves when something else needs it.

function FolderArt({ itemCount }: { itemCount: number }) {
  return (
    <span
      className={[
        "relative block aspect-[5/4] w-full transform-gpu",
        "transition-transform duration-xn-slow",
        "group-hover:-translate-y-1",
        "group-active:-translate-y-0.5 group-active:scale-[0.99]",
      ].join(" ")}
      style={{ transitionTimingFunction: FOLDER_EASE }}
      aria-hidden
    >
      {/* Back panel, with the tab. The tab's right edge is angled by the
          clip-path rather than cut square — that angle is most of what
          makes the silhouette read as a folder at small sizes. */}
      <span
        className="absolute inset-x-0 bottom-0 top-[14%] rounded-[4px_10px_10px_10px]"
        style={{
          background: `linear-gradient(135deg, ${SKIN.back1}, ${SKIN.back2})`,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)",
        }}
      >
        <span
          className="absolute left-0 top-[-13%] h-[16%] w-[46%] rounded-t-[5px]"
          style={{
            background: `linear-gradient(135deg, ${SKIN.back1}, ${SKIN.back2})`,
            clipPath: "polygon(0 0, 82% 0, 100% 100%, 0 100%)",
          }}
        />
      </span>

      {/* The sheets. An empty folder draws none, and still opens — onto
          nothing, which is the empty state. */}
      <span className="absolute bottom-[12%] left-[8%] right-[8%] top-[6%] z-[2] block">
        {papersFor(itemCount).map((paper, index) => (
          <span
            key={index}
            className={[
              "absolute bottom-0 left-1/2 block overflow-hidden rounded-[5px]",
              "transform-gpu transition-transform duration-xn-slow",
              "group-hover:[transform:var(--lift)]",
            ].join(" ")}
            style={
              {
                width: paper.width,
                height: paper.height,
                background: paper.fill,
                // Centring uses the standalone translate property so the
                // transform above stays free for the motion.
                translate: "-50% 0",
                boxShadow: "0 3px 9px rgba(60,40,10,0.12)",
                transitionTimingFunction: FOLDER_EASE,
                "--lift": paper.lift,
              } as CSSProperties
            }
          >
            <span className="absolute left-[14%] right-[24%] top-[22%] h-[6%] rounded-[2px] bg-[#F1F0EA]" />
            <span className="absolute left-[14%] right-[40%] top-[40%] h-[6%] rounded-[2px] bg-[#F1F0EA]" />
          </span>
        ))}
      </span>

      {/* Front panel. Rotating it about its bottom edge is what opens the
          folder; the sheets are responding to that, not leading it. */}
      <span
        className={[
          "absolute inset-x-0 bottom-0 top-[38%] z-[3] origin-bottom rounded-[10px]",
          "transform-gpu transition-transform duration-xn-slow",
          "group-hover:[transform:rotateX(-32deg)]",
        ].join(" ")}
        style={{
          background: `linear-gradient(150deg, ${SKIN.front1}, ${SKIN.front2})`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.55), 0 -1px 0 ${SKIN.edge}, 0 9px 14px -8px rgba(120,80,10,0.35)`,
          transitionTimingFunction: FOLDER_EASE,
        }}
      >
        <span
          className="pointer-events-none absolute inset-0 rounded-[10px]"
          style={{
            background:
              "linear-gradient(120deg, rgba(255,255,255,0.35) 0%, transparent 45%)",
          }}
        />
      </span>
    </span>
  );
}

// ── Component ───────────────────────────────────────────────

interface FolderCardProps {
  folder: Folder;
  /** Called with the folder id when clicked. */
  onOpen?: (id: string) => void;
}

export function FolderCard({ folder, onOpen }: FolderCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(folder.id)}
      className={[
        "group block w-full rounded-xn-lg p-1.5 text-left",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xn-ink",
      ].join(" ")}
    >
      <span className="relative block">
        <FolderArt itemCount={folder.itemCount} />

        {/* The emoji rides on the front panel. With every folder the same
            colour, it and the name are what tell one from another. */}
        <span className="pointer-events-none absolute bottom-[9%] left-[10%] z-[4] text-[19px] leading-none">
          {folder.emoji}
        </span>
      </span>

      <span className="mt-2.5 block truncate text-center text-sm font-semibold text-xn-ink">
        {folder.name}
      </span>
      <span className="mt-0.5 block text-center font-mono text-xs text-xn-ink-soft">
        {itemCountLabel(folder.itemCount)}
      </span>
    </button>
  );
}
