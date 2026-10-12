"use client";

// src/app/dev/drafts-band-states/band-states.tsx
//
// The drafts band's three unbuilt states, each in the directions on offer.
// The loaded band is not here: it is the real DraftsBand, unchanged.

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/loading-skeleton";

export type LoadingDirection = "today" | "rows" | "delayed" | "line";
export type EmptyDirection = "today" | "line" | "row";
export type ErrorDirection = "today" | "row" | "line" | "line-history";

/** How long a load runs before the delayed direction shows anything. */
const DELAY_MS = 400;

const HEADING = "Pick up where you left off";

/** The band's own section and heading, so every state starts where the loaded band does. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-h5 text-xn-ink">{HEADING}</h2>
      {children}
    </section>
  );
}

/** The loaded band's container: one bordered surface with divided rows. */
const LIST =
  "overflow-hidden rounded-xn-lg border border-xn-border bg-xn-surface shadow-xn-1";

/** One placeholder row, at the loaded row's geometry: 128×72 still, two lines. */
function SkeletonRow() {
  return (
    <li className="flex items-center gap-4 border-b border-xn-border px-3 py-3 last:border-b-0">
      <Skeleton width={128} height={72} className="shrink-0" />
      <span className="min-w-0 flex-1 space-y-2">
        <Skeleton width="40%" height={14} />
        <Skeleton width="70%" height={12} />
      </span>
    </li>
  );
}

function SkeletonRows() {
  return (
    <Frame>
      <ul className={LIST} aria-busy="true" aria-label="Loading drafts">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </ul>
    </Frame>
  );
}

export function LoadingBand({ direction }: { direction: LoadingDirection }) {
  // Only the delayed direction reads the clock; it restarts with each load
  // because the page remounts this state for every one.
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    if (direction !== "delayed") return;
    const timer = setTimeout(() => setWaited(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, [direction]);

  if (direction === "today") return null;
  if (direction === "rows") return <SkeletonRows />;
  if (direction === "delayed") return waited ? <SkeletonRows /> : null;

  return (
    <Frame>
      <p className="font-mono text-micro uppercase tracking-wide text-xn-ink-soft" aria-live="polite">
        Checking for drafts…
      </p>
    </Frame>
  );
}

export function EmptyBand({ direction }: { direction: EmptyDirection }) {
  if (direction === "today") return null;

  if (direction === "line") {
    return (
      <p className="mt-10 text-sm text-xn-ink-muted">
        Nothing unfinished. Anything you make and don&apos;t save waits here.
      </p>
    );
  }

  return (
    <Frame>
      <div className={`${LIST} px-4 py-5 text-sm text-xn-ink-muted`}>
        No drafts right now. Anything you make and don&apos;t save waits here.
      </div>
    </Frame>
  );
}

interface ErrorBandProps {
  direction: ErrorDirection;
  onRetry: () => void;
}

export function ErrorBand({ direction, onRetry }: ErrorBandProps) {
  if (direction === "today") return null;

  if (direction === "row") {
    return (
      <Frame>
        <div className={`${LIST} flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4`}>
          <span className="flex min-w-0 flex-1 items-start gap-2 text-sm text-xn-ink">
            <span className="mt-px shrink-0 text-xn-danger">
              <AlertGlyph />
            </span>
            We couldn&apos;t load your drafts.
          </span>
          <Button variant="default" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </Frame>
    );
  }

  const link =
    "font-medium text-xn-ink underline underline-offset-2 transition-colors duration-xn ease-xn hover:text-xn-ink-muted";

  return (
    <p className="mt-10 text-sm text-xn-ink-muted" role="status">
      Your drafts didn&apos;t load.{" "}
      <button type="button" onClick={onRetry} className={link}>
        Try again
      </button>
      {direction === "line-history" && (
        <>
          {" "}
          <span aria-hidden>·</span>{" "}
          <a href="/history" className={link}>
            Find them in History
          </a>
        </>
      )}
    </p>
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
