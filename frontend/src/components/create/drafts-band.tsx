"use client";

// ─────────────────────────────────────────────────────────────
// components/create/drafts-band.tsx
//
// "Pick up where you left off" — unfinished work, on the create page's
// idle state.
//
// ── It hides itself when there is nothing ──
//
// Renders null on an empty list rather than an empty state. A create page
// telling a first-time user they have no drafts is answering a question
// nobody asked, in the most valuable space on the screen. The band earns
// its place only when it has something.
//
// Nothing writes a draft yet — every insert hardcodes 'saved' — so today
// this is always null in practice. That is why it is wired to the real
// query rather than to a mock: it is correct and quiet now, and correct and
// visible the moment generation starts writing 'draft'.
//
// ── One list, not a grid of cards ──
//
// Recommendations and search results are browsable videos and share a grid.
// These are your own half-finished work: the list is short by construction
// (a 7-day window caps it), and the verb is "resume", not "choose". A third
// grid of cards would put a fourth data type into the same rectangle, which
// is the thing the design brief objects to. One container with divided rows
// reads as a short inventory instead.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { contentTypeColors } from "@/lib/constants/theme";
import type { HistoryItem } from "@/lib/api/history";

/** How many rows before the band has to be expanded. */
const COLLAPSED = 3;

/**
 * The row thumbnail, 16:9 at a size that reads as a reference rather than
 * as artwork. Height is passed because VideoThumbnail has no aspect prop —
 * its shape is the width it is given plus this number.
 */
const THUMB = { w: 128, h: 72 } as const;

export function DraftsBand({ drafts }: { drafts: HistoryItem[] }) {
  const [open, setOpen] = useState(false);

  // The whole point: no drafts, no band.
  if (drafts.length === 0) return null;

  const shown = open ? drafts : drafts.slice(0, COLLAPSED);

  return (
    <section className="mt-10">
      {/* No action on this heading. Refresh belongs to the recommendations
          below — these are your own drafts and there is nothing to re-roll. */}
      <h2 className="mb-4 text-h5 text-xn-ink">Pick up where you left off</h2>

      <ul className="overflow-hidden rounded-xn-lg border border-xn-border bg-xn-surface shadow-xn-1">
        {shown.map((draft) => (
          <li key={draft.id} className="border-b border-xn-border last:border-b-0">
            <button
              type="button"
              className="group flex w-full items-center gap-4 px-3 py-3 text-left transition-colors duration-xn ease-xn hover:bg-xn-surface-alt"
            >
              <div style={{ width: THUMB.w }} className="shrink-0">
                <VideoThumbnail
                  src={draft.thumbnail}
                  height={THUMB.h}
                  label="youtube"
                />
              </div>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <ContentTypeIcon type={draft.contentType} size="sm" />
                  <span className="truncate text-ui font-medium text-xn-ink">
                    {contentTypeColors[draft.contentType].label}
                  </span>
                  <Chip status="draft" />
                </span>
                {/* The video it came from, because that is what a person
                    recognises — not the title the generator wrote. */}
                <span className="mt-1 block truncate text-sm text-xn-ink-muted">
                  {draft.title}
                </span>
              </span>

              <span className="hidden shrink-0 text-right sm:block">
                <span className="block font-mono text-micro text-xn-ink-soft">
                  {draft.wordCount.toLocaleString()} words
                </span>
              </span>

              <span className="shrink-0 text-sm text-xn-ink-muted transition-colors duration-xn ease-xn group-hover:text-xn-ink">
                Resume
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* The expiry notice sits BESIDE the control, not pushed to the far
          edge. At the margin it reads as a corner stamp — the kind of small
          text the eye files as chrome and skips. It is not chrome: it is the
          only warning anyone gets before a row disappears on its own. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {drafts.length > COLLAPSED && (
          <Button
            variant="default"
            size="sm"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            icon={
              <ChevronGlyph
                className={[
                  "h-3.5 w-3.5 transition-transform duration-xn ease-xn",
                  open ? "rotate-180" : "",
                ].join(" ")}
              />
            }
          >
            {open ? "Show fewer" : `Show all drafts (${drafts.length})`}
          </Button>
        )}
        <p className="text-sm text-xn-ink-muted">Drafts are kept for 7 days.</p>
      </div>
    </section>
  );
}

function ChevronGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 9.5 12 15.5 18 9.5" />
    </svg>
  );
}
