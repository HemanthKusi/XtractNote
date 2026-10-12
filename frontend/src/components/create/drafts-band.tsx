"use client";

// ─────────────────────────────────────────────────────────────
// components/create/drafts-band.tsx
//
// "Pick up where you left off" — unfinished work, on the create page's
// idle state.
//
// ── It is always there, in one of four states ──
//
// Loading, your drafts, none, or a failed fetch — each drawn under the same
// heading, in the same box. The create page's own copy sends people here
// ("it will appear in your drafts"), so a failure says so and offers Try
// again rather than looking like an empty list. Chosen at
// /dev/drafts-band-states.
//
// A draft is a finished generation the user has not saved: the backend
// writes every result as one.
//
// ── One list, not a grid of cards ──
//
// Recommendations and search results are browsable videos and share a grid.
// These are your own half-finished work, and the verb is "resume", not
// "choose". A third grid of cards would put a fourth data type into the same
// rectangle, which is the thing the design brief objects to. One container
// with divided rows reads as a short inventory instead.
//
// ── No expiry notice, yet ──
//
// The design says drafts expire after 7 days and that the band says so. The
// expiry is not built, so neither is the notice: a surface may not promise
// what the code does not do. It returns with the expiry.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { DraftBadge } from "@/components/ui/draft-badge";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { contentTypeColors } from "@/lib/constants/theme";
import type { HistoryFailReason, HistoryItem } from "@/lib/api/history";

/** How many rows before the band has to be expanded. */
const COLLAPSED = 3;

/**
 * The row thumbnail, 16:9 at a size that reads as a reference rather than
 * as artwork. Height is passed because VideoThumbnail has no aspect prop —
 * its shape is the width it is given plus this number.
 */
const THUMB = { w: 128, h: 72 } as const;

/** The band's box, shared by every state so none of them changes its shape. */
const BOX =
  "overflow-hidden rounded-xn-lg border border-xn-border bg-xn-surface shadow-xn-1";

export type DraftsState =
  | { phase: "loading" }
  | { phase: "loaded"; drafts: HistoryItem[] }
  | { phase: "failed"; reason: HistoryFailReason };

const FAILED: Record<HistoryFailReason, string> = {
  "not-authenticated": "Please sign in again to see your drafts.",
  "fetch-failed": "We couldn't load your drafts.",
  network: "We couldn't reach the server to load your drafts.",
};

interface DraftsBandProps {
  state: DraftsState;
  /**
   * Called with the draft's id when a row is activated.
   *
   * Required, not optional. HistoryCard makes its equivalent optional and can
   * afford to — it is a card that still reads as content without a handler.
   * These rows are buttons that say "Resume", and a button making a promise
   * it cannot keep is worse than no button: it takes focus, announces itself
   * to a screen reader as actionable, and then does nothing. Making the prop
   * required means the compiler refuses to let that ship.
   */
  onOpen: (id: string) => void;
  /** Fetches the list again, from a failed state's Try again. */
  onRetry: () => void;
}

export function DraftsBand({ state, onOpen, onRetry }: DraftsBandProps) {
  return (
    <section className="mt-10">
      {/* No action on this heading. Refresh belongs to the recommendations
          below — these are your own drafts and there is nothing to re-roll. */}
      <h2 className="mb-4 text-h5 text-xn-ink">Pick up where you left off</h2>

      {state.phase === "loading" && (
        <ul className={BOX} aria-busy="true" aria-label="Loading your drafts">
          {[0, 1, 2].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </ul>
      )}

      {state.phase === "loaded" && state.drafts.length > 0 && (
        <DraftList drafts={state.drafts} onOpen={onOpen} />
      )}

      {state.phase === "loaded" && state.drafts.length === 0 && (
        <p className={`${BOX} px-4 py-5 text-sm text-xn-ink-muted`}>
          No drafts right now. Anything you make and don&apos;t save waits here.
        </p>
      )}

      {state.phase === "failed" && (
        <div
          role="status"
          className={`${BOX} flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4`}
        >
          <span className="flex min-w-0 flex-1 items-start gap-2 text-sm text-xn-ink">
            {/* The only colour in the band: colour is kept for failure. */}
            <span className="mt-px shrink-0 text-xn-danger">
              <AlertGlyph />
            </span>
            {FAILED[state.reason]}
          </span>
          <Button variant="default" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </section>
  );
}

function DraftList({
  drafts,
  onOpen,
}: {
  drafts: HistoryItem[];
  onOpen: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const shown = open ? drafts : drafts.slice(0, COLLAPSED);

  return (
    <>
      <ul className={BOX}>
        {shown.map((draft) => (
          <li key={draft.id} className="border-b border-xn-border last:border-b-0">
            <button
              type="button"
              onClick={() => onOpen(draft.id)}
              className="group flex w-full items-center gap-4 px-3 py-3 text-left transition-colors duration-xn ease-xn hover:bg-xn-surface-alt focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-xn-ink"
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
                  <DraftBadge />
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

      {drafts.length > COLLAPSED && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
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
        </div>
      )}
    </>
  );
}

/** A placeholder at the loaded row's geometry: the 128×72 still and two lines. */
function SkeletonRow() {
  return (
    <li className="flex items-center gap-4 border-b border-xn-border px-3 py-3 last:border-b-0">
      <Skeleton width={THUMB.w} height={THUMB.h} className="shrink-0" />
      <span className="min-w-0 flex-1 space-y-2">
        <Skeleton width="40%" height={14} />
        <Skeleton width="70%" height={12} />
      </span>
    </li>
  );
}

function AlertGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 4.75v3.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11" r="0.85" fill="currentColor" />
    </svg>
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
