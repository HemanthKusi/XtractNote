// src/components/history/history-card.tsx
// Presentational card for a single saved item. No data/state — the page
// supplies the HistoryItem and decides what onOpen does.

"use client";

import { Card } from "@/components/ui/card";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { contentTypeColors } from "@/lib/constants/theme";
import type { HistoryItem } from "@/lib/api/history";

// Small, dependency-free relative time ("just now" … "3 days ago").
function formatRelativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.floor((Date.now() - then) / 1000);

  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  // Older than a week → show an actual date.
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface HistoryCardProps {
  item: HistoryItem;
  /** Called with the item id when the card is clicked. */
  onOpen?: (id: string) => void;
}

export function HistoryCard({ item, onOpen }: HistoryCardProps) {
  const meta = contentTypeColors[item.contentType];

  return (
    <Card
      variant="default"
      padding="none"
      interactive
      onClick={() => onOpen?.(item.id)}
    >
      <div className="flex gap-4 p-4">
        {/* Thumbnail — fixed compact size for the list row */}
        <div className="w-[120px] shrink-0">
          <VideoThumbnail
            src={item.thumbnail}
            label={item.title}
            height={68}
          />
        </div>

        {/* Text column */}
        <div className="min-w-0 flex-1">
          {/* Format chip (styled span — Chip internals aren't overridable) */}
          <span
            className="inline-flex items-center gap-1.5 rounded-xn-pill border px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: meta.bg, color: meta.color, borderColor: meta.border }}
          >
            <ContentTypeIcon type={item.contentType} size="sm" />
            {meta.label}
          </span>

          {/* Title */}
          <h3 className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-xn-ink">
            {item.title}
          </h3>

          {/* Channel + meta line */}
          <div className="mt-1 flex items-center gap-2 text-xs text-xn-ink-soft">
            {item.channel && <span className="truncate">{item.channel}</span>}
            {item.channel && <span aria-hidden>·</span>}
            <span className="shrink-0">{formatRelativeDate(item.createdAt)}</span>
            {item.wordCount > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="shrink-0">{item.wordCount.toLocaleString()} words</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}