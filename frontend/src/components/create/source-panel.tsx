"use client";

// ─────────────────────────────────────────────────────────────
// components/create/source-panel.tsx
//
// The resolved video, once there is one, with the actions that act on it.
//
// ── Why the actions are inside the card ──
//
// They used to sit in the Card's footer slot, below a divider. Both act on
// the card's subject rather than on the page, and once a second
// video-shaped thing can appear on screen — a search result, a thumbnail in
// a draft row — "Change" floating in a page header stops saying which video
// it changes.
//
// ── Why "Open in YouTube" is an anchor and not a Button ──
//
// It is a navigation, so it has to be a real <a href>: a <button onClick>
// would lose middle-click, open-in-new-tab and the status-bar URL. Button
// renders a <button> and has no href or `as` prop, so its ghost classes are
// repeated here. That duplication is tracked — see the Button link-mode
// issue — and this block is what gets deleted when it lands.
// ─────────────────────────────────────────────────────────────

import { type ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import type { VideoMeta } from "@/lib/youtube/types";

/**
 * Seconds to "27:14". Duplicated from video-preview-card rather than
 * promoted: that component is still the one the output routes use, and a
 * shared helper wants a second real consumer before it earns a file.
 */
function formatDuration(totalSeconds?: number): string | undefined {
  if (totalSeconds == null) return undefined;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * The thumbnail box, sized by the caller.
 *
 * VideoThumbnail is `w-full` with a fixed inline height, so its shape comes
 * from whatever width it is given plus that height — there is no
 * aspect-ratio prop. 280x158 is 16:9.
 */
const THUMB = { w: 280, h: 158 } as const;

interface SourcePanelProps {
  meta: VideoMeta;
  /** A line under the channel — transcript state, or an error. */
  status?: ReactNode;
  /** The primary action for the current phase, if there is one. */
  primary?: ReactNode;
  /** Called when the user wants a different video. */
  onChange: () => void;
  /** Hides Change while a fetch or a generation is in flight. */
  busy?: boolean;
}

export function SourcePanel({
  meta,
  status,
  primary,
  onChange,
  busy = false,
}: SourcePanelProps) {
  return (
    <Card variant="default" padding="none">
      <div className="flex flex-wrap items-center gap-4 p-3">
        <div style={{ width: THUMB.w }} className="shrink-0">
          <VideoThumbnail
            videoId={meta.videoId}
            src={meta.thumbnailUrl}
            duration={formatDuration(meta.durationSeconds)}
            height={THUMB.h}
            label="youtube"
          />
        </div>

        <div className="min-w-[220px] flex-1">
          <h2 className="line-clamp-2 text-h5 leading-snug text-xn-ink">
            {meta.title}
          </h2>
          <p className="mt-1.5 text-sm text-xn-ink-muted">{meta.channel}</p>

          {status && <div className="mt-2">{status}</div>}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {primary}

            <button
              type="button"
              onClick={onChange}
              disabled={busy}
              className={[
                "inline-flex items-center justify-center",
                "rounded-xn-pill font-medium whitespace-nowrap select-none",
                "border cursor-pointer px-3.5 py-2 text-sm",
                "bg-xn-surface border-xn-border-strong text-xn-ink shadow-xn-1",
                "transition-[box-shadow,transform,background-color,color] duration-xn ease-xn",
                "hover:-translate-y-0.5 hover:shadow-xn-lift",
                "active:translate-y-px active:bg-xn-surface-alt active:shadow-xn-press",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xn-ink",
                "disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none",
                "disabled:shadow-none disabled:translate-y-0",
              ].join(" ")}
            >
              Change video
            </button>

            <a
              href={meta.url}
              target="_blank"
              rel="noopener noreferrer"
              className={[
                "inline-flex items-center justify-center gap-1.5",
                "rounded-xn-pill font-medium whitespace-nowrap select-none",
                "border cursor-pointer px-3.5 py-2 text-sm",
                "bg-transparent border-transparent text-xn-ink-muted",
                "transition-[box-shadow,transform,background-color,color] duration-xn ease-xn",
                "hover:-translate-y-0.5 hover:bg-xn-surface hover:text-xn-ink hover:shadow-xn-lift",
                "active:translate-y-px active:bg-xn-surface-alt active:shadow-xn-press",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xn-ink",
              ].join(" ")}
            >
              Open in YouTube
              <ExternalGlyph />
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ExternalGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path d="M6 3.5H4A1.5 1.5 0 0 0 2.5 5v7A1.5 1.5 0 0 0 4 13.5h7A1.5 1.5 0 0 0 12.5 12v-2" />
      <path d="M9.5 2.5h4v4" />
      <path d="M13.5 2.5 7 9" />
    </svg>
  );
}
