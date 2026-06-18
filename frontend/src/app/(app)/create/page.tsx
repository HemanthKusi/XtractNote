"use client";

// ─────────────────────────────────────────────────────────────
// app/(app)/create/page.tsx  →  route: /create
//
// The first interactive screen. The Phase 5 + 6 flow lives here:
//   input -> extractVideoId -> fetchVideoMetadata -> VideoPreviewCard
//         -> (Continue) -> fetchTranscript -> done / transcript-error
//
// It's a Client Component because it holds state and handles events.
// This is also the ONE place that turns machine-readable failure
// reasons (from extract, metadata, and transcript) into friendly,
// human messages.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";

import {
  extractVideoId,
  type ExtractFailReason,
} from "@/lib/youtube/extract-video-id";
import { fetchVideoMetadata, type MetaFailReason } from "@/lib/api/youtube";
import { fetchTranscript } from "@/lib/api/transcript";
import type { VideoMeta } from "@/lib/youtube/types";
import type {
  Transcript,
  TranscriptFailReason,
} from "@/lib/youtube/transcript-types";
import { VideoPreviewCard } from "@/components/create/video-preview-card";

// ASSUMED APIs — adjust paths/props to match your Phase 3 components.
// Button: children + onClick + variant + disabled.
// Input:  value + onChange + placeholder + standard input attrs.
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Friendly copy for every failure reason ──────────────────
// One map covering extract, metadata, AND transcript reasons.
// Change wording here without touching any logic.
// Union of every failure reason the three layers can produce.
type FailReason = ExtractFailReason | MetaFailReason | TranscriptFailReason;

const ERROR_MESSAGES: Record<FailReason, string> = {
  // From extractVideoId
  empty: "Paste a YouTube link to get started.",
  "not-youtube":
    "That doesn't look like a YouTube link. Try a youtube.com or youtu.be URL.",
  "no-id": "We couldn't find a video in that link. Double-check it and try again.",
  "invalid-id":
    "That link looks off — we couldn't read a valid video ID from it.",
  // From fetchVideoMetadata
  "not-found":
    "We couldn't load that video. It may be private, deleted, or unavailable in your region.",
  "server-config": "Something's misconfigured on our end. Please try again shortly.",
  upstream: "YouTube isn't responding right now. Please try again in a moment.",
  network:
    "We couldn't reach the server. Check your connection and that the app is running.",
  unknown: "Something went wrong. Please try again.",
  // From fetchTranscript
  "no-captions":
    "This video doesn't have captions we can read. Try another video with captions or subtitles turned on.",
  "video-not-found":
    "We couldn't load this video's transcript — it may be private, deleted, or unavailable.",
  "transcript-blocked":
    "YouTube is temporarily blocking transcript requests. Please try again in a moment.",
  "transcript-failed":
    "We couldn't get the transcript for this video. Please try again.",
  "request-failed":
    "We couldn't reach the server. Check your connection and that the app is running.",
};

// ── A small, explicit state machine ─────────────────────────
// Phases for the metadata stage (idle/loading/ready/error) plus the
// transcript stage (transcribing/transcript-error/done). Every
// transcript-stage phase carries `meta`, so the video preview stays
// on screen while we fetch — and a transcript error never throws the
// loaded video away.
type Status =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; meta: VideoMeta }
  | { phase: "error"; message: string }
  | { phase: "transcribing"; meta: VideoMeta }
  | { phase: "transcript-error"; meta: VideoMeta; message: string }
  | { phase: "done"; meta: VideoMeta; transcript: Transcript };

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

    // Step 3 — metadata loaded; show the preview.
    setStatus({ phase: "ready", meta: result.data });
  }

  function handleChange() {
    // Back to the input (keep the text so they can edit it).
    setStatus({ phase: "idle" });
  }

  async function handleContinue() {
    // Valid from "ready" (first try) or "transcript-error" (retry).
    const current = status;
    const meta =
      current.phase === "ready" || current.phase === "transcript-error"
        ? current.meta
        : null;
    if (!meta) return;

    // Fetch the transcript — preview stays visible, Continue shows a spinner.
    setStatus({ phase: "transcribing", meta });
    const result = await fetchTranscript(meta.videoId);
    if (!result.ok) {
      setStatus({
        phase: "transcript-error",
        meta,
        message: ERROR_MESSAGES[result.reason],
      });
      return;
    }

    // Success — we have everything we need to generate content.
    setStatus({ phase: "done", meta, transcript: result.data });
    // TODO (next phase): navigate to content-type selection, passing
    // meta + transcript along.
    console.log(
      "Transcript ready:",
      result.data.segmentCount,
      "lines,",
      result.data.language
    );
  }

  const isLoading = status.phase === "loading";
  const showInput =
    status.phase === "idle" ||
    status.phase === "loading" ||
    status.phase === "error";

  // The video preview is shown for every transcript-stage phase. Pulling
  // meta out this way lets TypeScript narrow it to VideoMeta below.
  const meta =
    status.phase === "ready" ||
    status.phase === "transcribing" ||
    status.phase === "transcript-error" ||
    status.phase === "done"
      ? status.meta
      : null;

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

      {/* Preview + transcript stage (shown once metadata loads) */}
      {meta && (
        <>
          <VideoPreviewCard
            meta={meta}
            actions={
              <>
                <Button
                  variant="ghost"
                  onClick={handleChange}
                  disabled={status.phase === "transcribing"}
                >
                  Change
                </Button>
                {status.phase === "done" ? (
                  // Next screen (content-type selection) is a later phase.
                  <Button variant="primary" disabled>
                    Continue
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleContinue}
                    disabled={status.phase === "transcribing"}
                  >
                    {status.phase === "transcribing"
                      ? "Preparing…"
                      : status.phase === "transcript-error"
                        ? "Try again"
                        : "Continue"}
                  </Button>
                )}
              </>
            }
          />

          {/* Transcript loading row */}
          {status.phase === "transcribing" && (
            <div className="mt-3 flex items-center gap-2 text-sm text-xn-ink-muted">
              <Spinner />
              <span>Fetching the transcript…</span>
            </div>
          )}

          {/* Transcript error row (preview stays put above) */}
          {status.phase === "transcript-error" && (
            <div className="mt-3 flex items-start gap-2 text-sm text-xn-accent">
              <AlertIcon />
              <span>{status.message}</span>
            </div>
          )}

          {/* Success row */}
          {status.phase === "done" && (
            <div className="mt-3 flex items-start gap-2 text-sm text-xn-ink-muted">
              <CheckIcon />
              <span>
                Transcript ready — {status.transcript.segmentCount} lines ·{" "}
                {status.transcript.language}
                {status.transcript.isGenerated ? " (auto-generated)" : ""}.
                Content type selection is next.
              </span>
            </div>
          )}
        </>
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

function CheckIcon() {
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
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}