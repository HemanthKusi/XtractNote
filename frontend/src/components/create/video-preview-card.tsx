// ─────────────────────────────────────────────────────────────
// components/create/video-preview-card.tsx
//
// Shows a fetched video so the user can confirm "yes, this one"
// before generating. Presentational only — it takes a VideoMeta and
// renders it. The page owns fetching, state, and the action buttons.
//
// Composes the Phase 3 Card + VideoThumbnail. No client hooks here,
// so this stays a Server Component (the interactive page that uses it
// is the Client Component — we push the client boundary down).
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

// NOTE: adjust these two import paths to match where these components
// actually live in your project. Since you use barrel exports, it may
// instead be "@/components/ui" and "@/components/shared".
import { Card } from "@/components/ui/card";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import type { VideoMeta } from "@/lib/youtube/types";

// ── Duration formatter ──────────────────────────────────────
// VideoMeta stores raw seconds; VideoThumbnail wants a string. We
// format here, at display time. Returns undefined when there's no
// duration so the thumbnail simply hides its pill (cleaner than "—").
//
// Co-located for now because this is the only consumer. If a second
// place needs it later, promote it to a shared util (YAGNI until then).
function formatDuration(totalSeconds?: number): string | undefined {
  if (totalSeconds == null) return undefined;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  const ss = String(seconds).padStart(2, "0");

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ── Props ───────────────────────────────────────────────────
interface VideoPreviewCardProps {
  /** The video to display. */
  meta: VideoMeta;
  /** Optional buttons (e.g. Change / Continue) shown in the footer. */
  actions?: ReactNode;
  /** Extra classes from the parent (e.g. width constraints). */
  className?: string;
}

// ── Component ───────────────────────────────────────────────
export function VideoPreviewCard({
  meta,
  actions,
  className,
}: VideoPreviewCardProps) {
  return (
    <Card
      variant="default"
      padding="md"
      className={className}
      // If the page passed actions, render them right-aligned in the
      // Card's footer slot (which adds its own border + padding).
      footer={
        actions ? (
          <div className="flex items-center justify-end gap-2">{actions}</div>
        ) : undefined
      }
    >
      {/* Thumbnail — built from the videoId, pill from formatted seconds */}
      <VideoThumbnail
        videoId={meta.videoId}
        duration={formatDuration(meta.durationSeconds)}
        label="youtube"
      />

      {/* Title + channel */}
      <div className="mt-3">
        <h3 className="font-sans text-h4 font-semibold text-xn-ink line-clamp-2">
          {meta.title}
        </h3>
        <p className="mt-1 text-sm text-xn-ink-muted">{meta.channel}</p>
      </div>
    </Card>
  );
}