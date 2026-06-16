"use client";

// ─────────────────────────────────────────────────────────────
// app/(app)/create/page.tsx  →  route: /create
//
// The first interactive screen. The whole Phase 5 flow lives here:
//   input -> extractVideoId -> fetchVideoMetadata -> VideoPreviewCard
//
// It's a Client Component because it holds state and handles events.
// This is also the ONE place that turns machine-readable failure
// reasons (from File 1 and File 4) into friendly, human messages.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";

import {
  extractVideoId,
  type ExtractFailReason,
} from "@/lib/youtube/extract-video-id";
import { fetchVideoMetadata, type MetaFailReason } from "@/lib/api/youtube";
import type { VideoMeta } from "@/lib/youtube/types";
import { VideoPreviewCard } from "@/components/create/video-preview-card";

// ASSUMED APIs — adjust paths/props to match your Phase 3 components.
// Button: children + onClick + variant + disabled.
// Input:  value + onChange + placeholder + standard input attrs.
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Friendly copy for every failure reason ──────────────────
// One map covering both File 1's reasons and File 4's reasons.
// Change wording here without touching any logic.
const ERROR_MESSAGES: Record<ExtractFailReason | MetaFailReason, string> = {
  // From extractVideoId (File 1)
  empty: "Paste a YouTube link to get started.",
  "not-youtube":
    "That doesn't look like a YouTube link. Try a youtube.com or youtu.be URL.",
  "no-id": "We couldn't find a video in that link. Double-check it and try again.",
  "invalid-id":
    "That link looks off — we couldn't read a valid video ID from it.",
  // From fetchVideoMetadata (File 4)
  "not-found":
    "We couldn't load that video. It may be private, deleted, or unavailable in your region.",
  "server-config": "Something's misconfigured on our end. Please try again shortly.",
  upstream: "YouTube isn't responding right now. Please try again in a moment.",
  network:
    "We couldn't reach the server. Check your connection and that the app is running.",
  unknown: "Something went wrong. Please try again.",
};

// ── A small, explicit state machine ─────────────────────────
// Modeling the screen as one of four phases (instead of scattered
// booleans) makes the render logic obvious and bug-resistant.
type Status =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; meta: VideoMeta }
  | { phase: "error"; message: string };

export default function CreatePage() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>({ phase: "idle" });

  async function handleSubmit() {
    // Step 1 — extract the ID on the client (instant, no network).
    const extracted = extractVideoId(input);
    if (!extracted.ok) {
      setStatus({ phase: "error", message: ERROR_MESSAGES[extracted.reason] });
      return;
    }

    // Step 2 — fetch metadata from the backend (shows loading).
    setStatus({ phase: "loading" });
    const result = await fetchVideoMetadata(extracted.videoId);
    if (!result.ok) {
      setStatus({ phase: "error", message: ERROR_MESSAGES[result.reason] });
      return;
    }

    // Step 3 — success.
    setStatus({ phase: "ready", meta: result.data });
  }

  function handleChange() {
    // Go back to the input (keep the text so they can edit it).
    setStatus({ phase: "idle" });
  }

  function handleContinue() {
    // TODO (Phase 6): navigate to content-type selection with this video.
    // For now this just confirms we have the id to hand off.
    if (status.phase === "ready") {
      console.log("Continue with video:", status.meta.videoId);
    }
  }

  const isLoading = status.phase === "loading";
  const showInput = status.phase !== "ready";

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      {/* Heading */}
      <header className="mb-6">
        <h1 className="font-serif text-h2 text-xn-ink">Create</h1>
        <p className="mt-1 text-body text-xn-ink-muted">
          Paste a YouTube link to turn it into something you can keep.
        </p>
      </header>

      {/* Input + submit (hidden once a video is loaded) */}
      {showInput && (
        <>
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="https://www.youtube.com/watch?v=…"
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? "Fetching…" : "Fetch"}
            </Button>
          </div>

          {/* Loading row */}
          {isLoading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-xn-ink-muted">
              <Spinner />
              <span>Looking up that video…</span>
            </div>
          )}

          {/* Error message — accent-colored attention treatment.
              (Design system has no dedicated danger token yet; using
              accent keeps this token-clean until the redesign adds one.) */}
          {status.phase === "error" && (
            <div className="mt-3 flex items-start gap-2 text-sm text-xn-accent">
              <AlertIcon />
              <span>{status.message}</span>
            </div>
          )}
        </>
      )}

      {/* Preview (shown once metadata loads) */}
      {status.phase === "ready" && (
        <VideoPreviewCard
          meta={status.meta}
          actions={
            <>
              <Button variant="ghost" onClick={handleChange}>
                Change
              </Button>
              <Button variant="primary" onClick={handleContinue}>
                Continue
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}

// ── Tiny inline icons (token-colored via currentColor) ──────
function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
    >
      <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="mt-0.5 shrink-0"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.01" strokeLinecap="round" />
    </svg>
  );
}