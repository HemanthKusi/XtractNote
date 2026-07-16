"use client";

// ─────────────────────────────────────────────────────────────
// components/create/search-results.tsx
//
// The results area for topic search. Given the results array (and a
// `loading` flag), it renders exactly one of:
//
//   1. loading           → a few skeleton rows shaped like the real cards
//   2. results.length 0  → the "No videos matched…" empty state
//   3. results present   → a paginated list of SearchResultCard
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
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonText } from "@/components/ui/loading-skeleton";
import type { SearchResultVideo } from "@/lib/youtube/search-types";
import { SearchResultCard } from "./search-result-card";

// How many results per page. The only place the page size is defined —
// pagination math derives everything else from it and results.length.
const PAGE_SIZE = 10;

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
// Mirrors SearchResultCard's shape (same Card shell, same horizontal layout)
// so the swap from loading to loaded doesn't reflow. Sizes are passed to
// Skeleton as PROPS (not Tailwind classes), which is how Skeleton reads them.
function ResultRowSkeleton() {
  return (
    <Card variant="default" padding="none">
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:gap-4">
        {/* Thumbnail block — wrapper controls responsive width, Skeleton fills it */}
        <div className="w-full shrink-0 sm:w-60">
          <Skeleton width="100%" height={135} />
        </div>

        {/* Text lines */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton width="80%" height={18} />
          <Skeleton width="45%" height={13} />
          <div className="mt-1">
            <SkeletonText lines={2} lineHeight={12} gap={8} />
          </div>
          <div className="mt-auto pt-3">
            <Skeleton width={120} height={30} rounded="9999px" />
          </div>
        </div>
      </div>
    </Card>
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
    return (
      <div className={`flex flex-col gap-3 ${className}`} aria-busy="true">
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

      {/* The current page of cards. */}
      <div className="flex flex-col gap-3">
        {pageItems.map((video) => (
          <SearchResultCard
            key={video.videoId}
            video={video}
            onUse={onUse}
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