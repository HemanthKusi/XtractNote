"use client";

// src/app/dev/history-drafts/draft-row.tsx
//
// A draft, as the History row could show it under each treatment. The markup
// is HistoryCard's, copied so the treatments can differ without touching the
// shipped component; a saved row on the specimen is the real HistoryCard, so
// anything that drifts here shows up as a difference beside it.
//
// Every treatment is monochrome. Status is chrome, not identity — the design
// system keeps it near-monochrome and gives colour only to failure — so the
// format colour stays the rail's alone.
//
// Two kinds of unsaved row:
//   · draft      — generated, waiting to be saved. Exists today.
//   · generating — a run still going, with no content yet. Does NOT exist in
//                  History today: a content row is written only when a run
//                  finishes, so showing these needs History to read the
//                  user's unfinished jobs as well. Drawn here to be judged.

import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { Chip } from "@/components/ui/chip";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { contentTypeColors } from "@/lib/constants/theme";
import type { HistoryItem } from "@/lib/api/history";

export type Treatment = "today" | "word" | "chip" | "outline" | "action" | "combined";

/** How strongly the status chip is drawn, all monochrome. */
export type ChipStrength = "soft" | "ink" | "solid";

export type UnsavedKind = "draft" | "generating";

function relative(iso: string): string {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} hour${hours === 1 ? "" : "s"} ago` : `${Math.round(hours / 24)} days ago`;
}

/**
 * The status chip at three strengths. "soft" is the design system's own
 * draft chip; "ink" outlines it in the ink colour; "solid" fills it with ink.
 * A generating chip carries a small pulse so it reads as live.
 */
function StatusChip({ kind, strength }: { kind: UnsavedKind; strength: ChipStrength }) {
  const label = kind === "draft" ? "Draft" : "Generating";
  const look =
    strength === "solid"
      ? "border-xn-ink bg-xn-ink text-xn-bg"
      : strength === "ink"
        ? "border-xn-ink bg-xn-surface text-xn-ink"
        : "border-xn-border bg-xn-surface-alt text-xn-ink-muted";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xn-pill border px-2 py-0.5 text-xs font-semibold leading-tight ${look}`}
    >
      {kind === "generating" && (
        <span className="relative flex h-1.5 w-1.5" aria-hidden>
          <span className="absolute inset-0 rounded-xn-pill bg-current opacity-60 animate-ring motion-reduce:hidden" />
          <span className="relative h-1.5 w-1.5 rounded-xn-pill bg-current" />
        </span>
      )}
      {label}
    </span>
  );
}

export function DraftRow({
  item,
  treatment,
  kind = "draft",
  strength = "soft",
}: {
  item: HistoryItem;
  treatment: Treatment;
  kind?: UnsavedKind;
  strength?: ChipStrength;
}) {
  const meta = contentTypeColors[item.contentType];
  const outline = treatment === "outline";
  const generating = kind === "generating";

  return (
    <article
      className={[
        "group relative flex h-[136px] cursor-pointer overflow-hidden rounded-xn-lg border transition-colors duration-xn ease-xn",
        outline
          ? "border-dashed border-xn-border-strong bg-transparent hover:bg-xn-surface"
          : "border-xn-border bg-xn-surface hover:border-xn-border-strong",
      ].join(" ")}
    >
      {/* The rail: the format, as on every row. Under "outline" it is drawn
          as a dashed edge, the same colour, so the row reads as not yet
          kept without the format losing its place. */}
      {outline ? (
        <span
          className="w-[4px] shrink-0"
          style={{
            backgroundImage: `repeating-linear-gradient(to bottom, ${meta.color} 0 8px, transparent 8px 13px)`,
          }}
          aria-hidden
        />
      ) : (
        <span
          className="w-[4px] shrink-0 transition-[width] duration-xn ease-xn group-hover:w-[7px]"
          style={{ backgroundColor: meta.color }}
          aria-hidden
        />
      )}

      <div className="hidden shrink-0 items-center p-3.5 lg:flex">
        <div className={["w-[192px]", outline ? "opacity-80" : "", generating ? "opacity-70 saturate-50" : ""].join(" ")}>
          <VideoThumbnail src={item.thumbnail} label={item.title} height={108} />
        </div>
      </div>

      <div className="min-w-0 flex-1 self-center pl-4 pr-[170px] lg:pl-0">
        <div className="flex items-center gap-2">
          <ContentTypeIcon type={item.contentType} size="md" />
          <span className="text-sm font-medium" style={{ color: meta.color }}>
            {meta.label}
          </span>

          {/* "word": the status said in the line that already carries the
              format and the date, at the format label's weight, in ink. */}
          {(treatment === "word" || treatment === "outline" || treatment === "action") && (
            <span className="text-sm font-medium text-xn-ink">· Draft</span>
          )}

          <span className="font-mono text-sm text-xn-ink-soft">
            · {generating ? `started ${relative(item.createdAt)}` : relative(item.createdAt)}
          </span>

          {treatment === "chip" && <Chip status="draft" />}
          {treatment === "combined" && <StatusChip kind={kind} strength={strength} />}
        </div>

        <h3 className="mt-1.5 line-clamp-2 text-[17px] font-semibold leading-snug text-xn-ink">{item.title}</h3>

        <div className="mt-1.5 flex items-center gap-2 font-mono text-sm text-xn-ink-soft">
          {item.channel && <span className="truncate">{item.channel}</span>}
          {item.channel && <span aria-hidden>·</span>}
          {generating ? (
            <span className="shrink-0">Drafting your content</span>
          ) : (
            item.wordCount > 0 && <span className="shrink-0">{item.wordCount.toLocaleString()} words</span>
          )}
        </div>
      </div>

      {/* Top right. Under "action" and "combined", an unsaved row offers its
          way forward where a saved row offers Add to folder — a draft cannot
          be filed until it is kept. */}
      {treatment === "action" || treatment === "combined" ? (
        generating ? (
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-xn-md border border-xn-border bg-xn-surface px-2.5 py-1.5 text-sm font-medium text-xn-ink-muted transition-colors duration-xn ease-xn hover:bg-xn-surface-alt hover:text-xn-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xn-ink"
          >
            View progress
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-xn-md border border-xn-border-strong bg-xn-surface px-2.5 py-1.5 text-sm font-medium text-xn-ink shadow-xn-1 transition-colors duration-xn ease-xn hover:bg-xn-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xn-ink"
          >
            Save draft
          </button>
        )
      ) : (
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-xn-md px-2.5 py-1.5 text-sm font-medium text-xn-ink-soft transition-colors duration-xn ease-xn hover:bg-xn-surface-alt hover:text-xn-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xn-ink"
        >
          <MoveIcon />
          Add to folder
        </button>
      )}
    </article>
  );
}

// HistoryCard's own icon, copied with the markup.
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
