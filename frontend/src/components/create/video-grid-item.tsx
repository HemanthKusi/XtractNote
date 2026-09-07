"use client";

// ─────────────────────────────────────────────────────────────
// components/create/video-grid-item.tsx
//
// One browsable video in a grid: thumbnail on top, details beneath, and no
// card around either.
//
// ── Why there is no Card ──
//
// A grid already separates its items. Wrapping each one in a bordered,
// shadowed box draws a second boundary around a boundary, and it makes six
// videos read as six documents rather than as one set to choose from.
// SearchResultCard keeps its Card because it is a wide horizontal row in a
// vertical list, where the border is the only thing separating one result
// from the next.
//
// ── One component for recommendations AND results ──
//
// They are the same kind of thing — a video you might pick — and they afford
// the same action. Giving them different layouts drew a distinction that does
// not exist. This is deliberately the one shape, used by both.
// ─────────────────────────────────────────────────────────────

import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { formatDuration } from "@/lib/youtube/format";

/**
 * The box every thumbnail gets, 16:9.
 *
 * VideoThumbnail is `w-full` with a fixed inline height and has no
 * aspect-ratio prop, so its shape comes from the width it is given plus that
 * height. The height is passed rather than left at the default, which is what
 * keeps every tile in a row the same size regardless of the source video.
 */
const THUMB_H = 158;

interface VideoGridItemProps {
  videoId: string;
  title: string;
  channel: string;
  durationSeconds?: number | null;
  /** Overrides the id-derived thumbnail when the API returned one. */
  thumbnailUrl?: string;
  /** A line under the channel — view count, or anything else the caller has. */
  meta?: string;
  onSelect: () => void;
}

export function VideoGridItem({
  videoId,
  title,
  channel,
  durationSeconds,
  thumbnailUrl,
  meta,
  onSelect,
}: VideoGridItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-xn-ink"
    >
      <VideoThumbnail
        videoId={videoId}
        src={thumbnailUrl}
        duration={formatDuration(durationSeconds ?? undefined)}
        height={THUMB_H}
        label="youtube"
        className="transition-shadow duration-xn ease-xn group-hover:shadow-xn-lift"
      />

      <span className="mt-2.5 line-clamp-2 block text-ui font-medium leading-snug text-xn-ink">
        {title}
      </span>
      <span className="mt-1 block truncate text-sm text-xn-ink-soft">
        {channel}
      </span>
      {meta && (
        <span className="mt-0.5 block text-xs text-xn-ink-soft">{meta}</span>
      )}
    </button>
  );
}
