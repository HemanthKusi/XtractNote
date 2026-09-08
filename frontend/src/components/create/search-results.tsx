"use client";

// ─────────────────────────────────────────────────────────────
// components/create/search-results.tsx
//
// The results area for topic search. Given the results array (and a
// `loading` flag), it renders exactly one of:
//
//   1. loading           → skeletons shaped like the real grid items
//   2. results.length 0  → the "No videos matched…" empty state
//   3. results present   → a paginated GRID of VideoGridItem, the same
//                          component the create page uses for its curated
//                          recommendations, because a result and a suggestion
//                          are the same kind of thing
//
// Pagination is COUNT-DRIVEN and client-side: totalPages = ceil(n / PAGE_SIZE),
// so 30 results form 3 pages today and 100 would form 10 pages later with no
// change here. Previous/Next walk the pages; controls disable at the ends.
//
// The /create page (10.4) renders this for both its `searching` and
// `search-results` phases. It should pass key={query} so a fresh search
// remounts and resets pagination to page 1 — cleaner than an effect. As a
// safety net we also clamp the current page to the valid range each render.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonText } from "@/components/ui/loading-skeleton";
import type { SearchResultVideo } from "@/lib/youtube/search-types";
import { formatViewCount } from "@/lib/youtube/format";
import { VideoGridItem } from "./video-grid-item";

// How many results per page. The only place the page size is defined —
// pagination math derives everything else from it and results.length.
//
// ── Why 12 and not 10 ──
//
// Results are a grid now, not a list. At the ~3 columns this content area
// gives, 10 items are three full rows plus a single orphan — a row with one
// tile in it and two columns of empty space, which reads as a rendering
// fault rather than as the end of a page.
//
// 12 divides evenly by 2, 3, 4 and 6, so every column count this container
// can produce ends on a full row. With the 30 results the search returns
// that is 12 / 12 / 6 across three pages: the last is short, which is
// unavoidable and reads as "the end", not as a gap.
const PAGE_SIZE = 12;

// How many skeleton rows to show while a search is in flight. Fewer than a
// full page — enough to signal "loading" without a towering column.
const SKELETON_ROWS = 4;

// ── Search icon for the empty state ─────────────────────────
const SearchIcon = () => (
  <svg viewBox="0 0 48 48" fill="none">
    <circle
      cx="21"
      cy="21"
      r="13"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M31 31l9 9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// ── Props ───────────────────────────────────────────────────
interface SearchResultsProps {
  /** The videos to show. An empty array (with loading=false) => empty state. */
  results: SearchResultVideo[];
  /** The query that produced these results — used in the header + empty copy. */
  query: string;
  /** When true, show skeleton rows instead of results. */
  loading?: boolean;
  /** Called with a video id when the user picks a result. */
  onUse: (videoId: string) => void;
  /** Optional: return to the search input (empty-state action). */
  onEditSearch?: () => void;
  /** Extra classes from the parent. */
  className?: string;
}

// ── Loading skeleton row ────────────────────────────────────
// Mirrors VideoGridItem's shape — thumbnail on top at the same 158px, then
// the title, channel and meta lines beneath — so the swap from loading to
// loaded does not reflow. It used to mirror the wide card this replaced; a
// skeleton shaped like the previous layout is worse than none, because it
// promises a shape the page will not deliver.
//
// Sizes are passed to Skeleton as PROPS, not Tailwind classes, which is how
// Skeleton reads them.
function ResultRowSkeleton() {
  return (
    <div className="flex flex-col">
      <Skeleton width="100%" height={158} />
      <div className="mt-2.5">
        <SkeletonText lines={2} lineHeight={16} gap={6} />
      </div>
      <div className="mt-2">
        <Skeleton width="55%" height={13} />
      </div>
      <div className="mt-1.5">
        <Skeleton width="35%" height={11} />
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────
export function SearchResults({
  results,
  query,
  loading = false,
  onUse,
  onEditSearch,
  className = "",
}: SearchResultsProps) {
  const [page, setPage] = useState(1);

  // 1. Loading — skeleton rows, no pagination.
  if (loading) {
    // Same grid as the loaded state, for the same reason the skeleton matches
    // the item: the two have to occupy the same shape or the swap reflows.
    return (
      <div
        className={`grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-x-5 gap-y-7 ${className}`}
        aria-busy="true"
      >
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <ResultRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  // 2. Empty — the search succeeded but matched nothing (a normal state).
  if (results.length === 0) {
    return (
      <EmptyState
        size="section"
        icon={<SearchIcon />}
        title="No videos matched"
        description={`Nothing came up for “${query}”. Try a broader topic — or paste a YouTube link instead.`}
        action={
          onEditSearch ? (
            <Button variant="default" size="sm" onClick={onEditSearch}>
              Edit search
            </Button>
          ) : undefined
        }
        className={className}
      />
    );
  }

  // 3. Results — count-driven pagination.
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  // Clamp: if results shrank since the last render, snap into range.
  const currentPage = Math.min(page, totalPages);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, results.length);
  const pageItems = results.slice(startIndex, endIndex);

  const goPrev = () => setPage(Math.max(1, currentPage - 1));
  const goNext = () => setPage(Math.min(totalPages, currentPage + 1));

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Summary line — "Showing 1–10 of 30" (all counts derived, not fixed). */}
      <p className="text-xs text-xn-ink-muted">
        Showing {startIndex + 1}–{endIndex} of {results.length} result
        {results.length === 1 ? "" : "s"} for “{query}”
      </p>

      {/* ── The current page of results, as a grid ──
          Was a vertical stack of wide cards. A result and a recommendation
          are the same kind of thing — a video you might pick — and giving
          them different layouts drew a distinction that does not exist, so
          both now use VideoGridItem.

          Container-derived columns, never viewport breakpoints: the app
          shell's menu alone moves this column by 168px, so any `md:` here
          fires at a width the content area never actually has.

          What the swap gives up: the per-result "Watch on YouTube" link that
          SearchResultCard carried. The whole tile is the action now, and the
          source panel offers that link once a video is chosen. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-x-5 gap-y-7">
        {pageItems.map((video) => (
          <VideoGridItem
            key={video.videoId}
            videoId={video.videoId}
            title={video.title}
            channel={video.channel}
            thumbnailUrl={video.thumbnailUrl}
            durationSeconds={video.durationSeconds}
            meta={formatViewCount(video.viewCount)}
            onSelect={() => onUse(video.videoId)}
          />
        ))}
      </div>

      {/* Pagination controls — only when there's more than one page. */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-1">
          <Button
            variant="default"
            size="sm"
            onClick={goPrev}
            disabled={currentPage === 1}
          >
            Previous
          </Button>

          <span className="text-xs text-xn-ink-muted tabular-nums">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="default"
            size="sm"
            onClick={goNext}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}