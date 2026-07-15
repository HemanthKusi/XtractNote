"use client";

// ─────────────────────────────────────────────────────────────
// components/create/search-result-card.tsx
//
// One topic-search result, rendered YouTube-style: thumbnail + duration
// pill on the left, then title, a "channel · views · time" meta line, a
// short description, and the actions (Use this video / Watch on YouTube).
//
// Presentational + one callback. It takes a SearchResultVideo and an
// onUse(videoId) handler; the results list (File 8) maps over videos and
// renders one of these each, wiring onUse up to the /create handoff (10.4).
//
// A Client Component because it binds an onClick — unlike VideoPreviewCard,
// which had no interactivity and could stay a Server Component. It renders
// inside the client results list anyway, so there's no extra cost.
//
// Composes the Phase 3 Card (padding="none" + inner flex div, the custom-
// layout pattern) with VideoThumbnail and Button. Formatting comes from the
// shared lib/youtube/format.ts helpers (File 6) — the backend ships raw
// seconds / view numbers / ISO dates, and these turn them into display text.
// ─────────────────────────────────────────────────────────────

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import {
  formatDuration,
  formatRelativeTime,
  formatViewCount,
} from "@/lib/youtube/format";
import type { SearchResultVideo } from "@/lib/youtube/search-types";

// ── External-link icon (small, for the "Watch on YouTube" link) ──
const ExternalLinkIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="100%"
    height="100%"
  >
    <path d="M6 3.5H4A1.5 1.5 0 0 0 2.5 5v7A1.5 1.5 0 0 0 4 13.5h7A1.5 1.5 0 0 0 12.5 12v-2" />
    <path d="M9.5 2.5h4v4" />
    <path d="M13.5 2.5 7 9" />
  </svg>
);

// ── Props ───────────────────────────────────────────────────
interface SearchResultCardProps {
  /** The video to display. */
  video: SearchResultVideo;
  /** Called with the video's id when the user picks it. */
  onUse: (videoId: string) => void;
  /** Extra classes from the parent (e.g. list spacing). */
  className?: string;
}

// ── Component ───────────────────────────────────────────────
export function SearchResultCard({
  video,
  onUse,
  className,
}: SearchResultCardProps) {
  // Build "channel · 1.4M views · 2 months ago", dropping any piece the
  // formatters return undefined for (hidden views, missing date, etc.).
  const metaLine = [
    video.channel,
    formatViewCount(video.viewCount),
    formatRelativeTime(video.publishedAt),
  ]
    .filter(Boolean)
    .join("  ·  ");

  const description = video.description.trim();

  return (
    <Card variant="default" padding="none" className={className}>
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:gap-4">
        {/* Thumbnail — full width on mobile, fixed 16:9 column on sm+.
            src uses the backend's chosen thumbnail; videoId is the fallback. */}
        <div className="w-full shrink-0 sm:w-60">
          <VideoThumbnail
            videoId={video.videoId}
            src={video.thumbnailUrl}
            duration={formatDuration(video.durationSeconds)}
            height={135}
            label="youtube"
          />
        </div>

        {/* Text + actions */}
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="font-sans text-h4 font-semibold text-xn-ink line-clamp-2">
            {video.title}
          </h3>

          <p className="mt-1 text-sm text-xn-ink-muted line-clamp-1">
            {metaLine}
          </p>

          {description && (
            <p className="mt-2 text-sm text-xn-ink-soft line-clamp-2">
              {description}
            </p>
          )}

          {/* Actions pinned to the bottom so cards of varying text length
              keep their buttons aligned. */}
          <div className="mt-auto flex items-center gap-3 pt-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onUse(video.videoId)}
            >
              Use this video
            </Button>

            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-xn-ink-muted transition-colors hover:text-xn-ink"
            >
              Watch on YouTube
              <span className="inline-flex h-3 w-3">
                <ExternalLinkIcon />
              </span>
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}