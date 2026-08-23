// src/components/history/history-card.tsx
// Presentational row for a single saved item. No data/state — the page
// supplies the HistoryItem and decides what onOpen does.
//
// ── Why this is not a Card ──
// It used to be a <Card> holding a thumbnail and a text block: the same
// rectangle the folder tiles and the create pickers were using for three
// other kinds of data. A saved item is a document, so it now draws as a
// document strip — a coloured rail down the edge, the still it came
// from, and the text.
//
// ── The rail replaced the chip ──
// The format used to be announced by an inline coloured chip sitting
// above the title. The rail says the same thing along the whole height
// of the row, which lets the chip go away and leaves the text column
// quieter. The rail is also what answers the cursor: widening a 4px bar
// costs the image nothing, where scaling the thumbnail cropped it.
//
// ── Equal heights on purpose ──
// The height is fixed rather than derived, so a row carrying a folder
// pill is exactly as tall as one without and the column reads as a list
// instead of a ragged stack. The title clamps to two lines to hold it.

"use client";

import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { contentTypeColors, folderAmber } from "@/lib/constants/theme";
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

/** Mix a hex with the surface beneath it, so the tint follows the theme. */
function amberTint(percent: number): string {
  return `color-mix(in srgb, ${folderAmber} ${percent}%, transparent)`;
}

/** The display info for the folder an item is in (resolved by the page). */
interface FolderLabel {
  name: string;
  emoji: string;
}

interface HistoryCardProps {
  item: HistoryItem;
  /** Called with the item id when the row is clicked. */
  onOpen?: (id: string) => void;
  /** The folder this item is in (page resolves it from folderId); null = none. */
  folderLabel?: FolderLabel | null;
  /** Called with the full item when the Move button is clicked. */
  onMove?: (item: HistoryItem) => void;
}

export function HistoryCard({ item, onOpen, folderLabel, onMove }: HistoryCardProps) {
  const meta = contentTypeColors[item.contentType];

  return (
    <article
      onClick={() => onOpen?.(item.id)}
      className="group relative flex h-[136px] cursor-pointer overflow-hidden rounded-xn-lg border border-xn-border bg-xn-surface transition-colors duration-xn ease-xn hover:border-xn-border-strong"
    >
      {/* The format, said once, down the whole edge. */}
      <span
        className="w-[4px] shrink-0 transition-[width] duration-xn ease-xn group-hover:w-[7px]"
        style={{ backgroundColor: meta.color }}
        aria-hidden
      />

      {/* 16:9 and fixed. It does not scale on hover — the rail does that
          job instead, because scaling this cropped it.

          It steps out below lg. The still plus the Move gutter reserve
          394px before the title gets anything, and the shell's sidebar
          takes a further 232px at every width, so on a narrower window
          the title was left with almost nothing. The rail still carries
          the format, which is what makes the still the right thing to
          drop rather than the tag. */}
      <div className="hidden shrink-0 items-center p-3.5 lg:flex">
        <div className="w-[192px]">
          <VideoThumbnail src={item.thumbnail} label={item.title} height={108} />
        </div>
      </div>

      {/* The gutter keeps a long title from running under the Move button.
          The left padding only applies once the still is gone, since the
          still's own padding provides it otherwise. */}
      <div className="min-w-0 flex-1 self-center pl-4 pr-[170px] lg:pl-0">
        <div className="flex items-center gap-2">
          <ContentTypeIcon type={item.contentType} size="md" />
          <span className="text-sm font-medium" style={{ color: meta.color }}>
            {meta.label}
          </span>
          <span className="font-mono text-sm text-xn-ink-soft">
            · {formatRelativeDate(item.createdAt)}
          </span>
        </div>

        <h3 className="mt-1.5 line-clamp-2 text-[17px] font-semibold leading-snug text-xn-ink">
          {item.title}
        </h3>

        <div className="mt-1.5 flex items-center gap-2 font-mono text-sm text-xn-ink-soft">
          {item.channel && <span className="truncate">{item.channel}</span>}
          {item.channel && <span aria-hidden>·</span>}
          {item.wordCount > 0 && (
            <span className="shrink-0">{item.wordCount.toLocaleString()} words</span>
          )}

          {/* Outlined rather than filled, so it holds its weight against a
              row that already carries a rail and a format icon. The amber
              is the tile's amber — the two finally agree. */}
          {folderLabel && (
            <span
              className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-xn-pill px-2.5 py-1 font-sans text-sm font-medium"
              style={{
                backgroundColor: amberTint(20),
                color: "var(--xn-ink)",
                border: `1px solid ${folderAmber}`,
              }}
            >
              <span aria-hidden>{folderLabel.emoji}</span>
              <span className="max-w-[140px] truncate">{folderLabel.name}</span>
            </span>
          )}
        </div>
      </div>

      {/* Always visible rather than revealed on hover: a control that
          appears only under a cursor is unreachable by touch and easy to
          miss by keyboard. Focus adds an outline and nothing else. */}
      {onMove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // don't also trigger the row's onOpen
            onMove(item);
          }}
          // The outline is the focus indicator. It used to be
          // `shadow-xn-ring` alongside `outline-none`, which suppressed the
          // browser's own ring and replaced it with nothing: that class
          // reads like a token but is not one — the boxShadow map has only
          // xn-1, xn, xn-lg and xn-hover — so it generated no CSS and a
          // focused button had no indicator at all. Same pattern the
          // folder tile and the format tiles use.
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-xn-md px-2.5 py-1.5 text-sm font-medium text-xn-ink-soft transition-colors duration-xn ease-xn hover:bg-xn-surface-alt hover:text-xn-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xn-ink"
        >
          <MoveIcon />
          {folderLabel ? "Move" : "Add to folder"}
        </button>
      )}
    </article>
  );
}

// Small folder/move icon.
function MoveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.4a1 1 0 0 1 .7.3l.9.9h5A1.5 1.5 0 0 1 14 5.7V11a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11V4.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
