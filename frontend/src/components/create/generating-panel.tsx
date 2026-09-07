"use client";

// ─────────────────────────────────────────────────────────────
// components/create/generating-panel.tsx
//
// The wait, while a format is being written.
//
// ── This is the INDETERMINATE version, and that is deliberate ──
//
// The design for this screen has a staged pipeline: each step ticking off
// with the time it took, a percentage, a remaining estimate, a cancel, and
// a promise that the work continues while the tab sits in the background.
// None of it can be built yet, and the reasons are separate rather than one
// missing feature:
//
//   per-stage events   nothing writes to the jobs table
//   elapsed / remaining  no stage is timed
//   percentage         the progress column exists and is never set
//   cancel             a synchronous call has no handle to cancel
//   "keeps running"    only true once generation is server-side and async
//
// A bar that fills to a number nobody measured is a lie about what the
// product is doing, so this reports the one honest thing: something is
// happening, and we cannot say how far along it is. The sliding bar says
// exactly that — it never claims a fraction.
//
// The staged version is designed and waiting in the create-route specimen.
// It ships when async generation does.
// ─────────────────────────────────────────────────────────────

import { Card } from "@/components/ui/card";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { contentTypeColors, type ContentType } from "@/lib/constants/theme";

interface GeneratingPanelProps {
  /** The format being written — names the wait and colours the bar. */
  type: ContentType;
}

export function GeneratingPanel({ type }: GeneratingPanelProps) {
  const meta = contentTypeColors[type];

  return (
    <Card variant="default" padding="md">
      <div className="flex items-center gap-3">
        <ContentTypeIcon type={type} size="xl" withBackground />
        <div className="min-w-0">
          <p className="text-h5 text-xn-ink">
            Writing your {meta.label.toLowerCase()}
          </p>
          <p className="mt-0.5 text-sm text-xn-ink-muted">
            You can leave this tab open in the background.
          </p>
        </div>
      </div>

      {/* A short bar sliding through a track, not a fill.
          The content-type registry lists the generation progress bar as one
          of the identity colour's own uses, so the format's colour belongs
          here. Held to the reduced-motion setting like everything else. */}
      <div
        className="relative mt-5 h-1.5 w-full overflow-hidden rounded-xn-pill bg-xn-ink-faint"
        role="progressbar"
        aria-label={`Writing your ${meta.label.toLowerCase()}`}
      >
        <div
          className="absolute inset-y-0 w-1/3 rounded-xn-pill animate-shimmer motion-reduce:animate-none"
          style={{ backgroundColor: meta.color }}
        />
      </div>

      {/* A drawn stand-in for the document taking shape. Not a list
          skeleton borrowed from elsewhere — the thing it settles into is a
          document, so that is what it suggests. */}
      <div className="mt-6 flex flex-col gap-2.5" aria-hidden="true">
        {[94, 100, 78, 100, 86, 40].map((width, index) => (
          <span
            key={index}
            className="h-2.5 rounded-xn-pill bg-xn-ink-faint"
            style={{ width: `${width}%` }}
          />
        ))}
      </div>
    </Card>
  );
}
