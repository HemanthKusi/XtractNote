"use client";

// ─────────────────────────────────────────────────────────────
// app/(app)/create/page.tsx  →  route: /create
//
// The full create flow lives here:
//   input -> extractVideoId -> fetchVideoMetadata -> VideoPreviewCard
//         -> (Continue) -> fetchTranscript
//         -> (pick a type) -> generateContent -> OutputView
//
// It's a Client Component because it holds state and handles events.
// This is also the ONE place that turns machine-readable failure
// reasons (from extract, metadata, transcript, AND generation) into
// friendly, human messages.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";

import {
  extractVideoId,
  type ExtractFailReason,
} from "@/lib/youtube/extract-video-id";
import { fetchVideoMetadata, type MetaFailReason } from "@/lib/api/youtube";
import { fetchTranscript } from "@/lib/api/transcript";
import { generateContent } from "@/lib/api/generate";
import { saveGeneratedContent, type SaveFailReason } from "@/lib/api/content";
import type { VideoMeta } from "@/lib/youtube/types";
import type {
  Transcript,
  TranscriptFailReason,
} from "@/lib/youtube/transcript-types";
import type {
  GeneratableContentType,
  GeneratedContent,
  GenerateFailReason,
} from "@/lib/content/types";
import { VideoPreviewCard } from "@/components/create/video-preview-card";
import { ContentTypePicker } from "@/components/create/content-type-picker";
import { OutputView } from "@/components/output/output-view";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/shared/toast-provider";

// ── Friendly copy for every failure reason ──────────────────
// One map covering extract, metadata, transcript, AND generate reasons.
// Change wording here without touching any logic.
// Note: "network" and "unknown" are shared across metadata and generate —
// they appear once, not twice.
type FailReason =
  | ExtractFailReason
  | MetaFailReason
  | TranscriptFailReason
  | GenerateFailReason
  | SaveFailReason;

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
  // From generateContent
  "empty-transcript":
    "There's no transcript text to work from. Try fetching the video again.",
  "transcript-too-long":
    "This video's transcript is too long to process in one pass. Try a shorter video for now.",
  "unknown-content-type":
    "That content type isn't available yet. Pick another format.",
  "provider-misconfigured":
    "The AI service isn't configured correctly on our end. Please try again shortly.",
  "generation-failed":
    "We couldn't generate the content this time. Please try again.",
  // From saveGeneratedContent
  "not-authenticated":
    "Please sign in again to save this — your session may have expired.",
  "insert-failed":
    "We couldn't save this just now. Please try again.",
  // Note: "network" is already defined above (shared with metadata) — not repeated.
};

// ── A small, explicit state machine ─────────────────────────
// Metadata stage (idle/loading/ready/error) + transcript stage
// (transcribing/transcript-error) + generation stage
// (picking/generating/output). Every stage past metadata carries `meta`,
// and every stage past transcript also carries `transcript`, so nothing
// loaded is ever thrown away by a later error.
type Status =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; meta: VideoMeta }
  | { phase: "error"; message: string }
  | { phase: "transcribing"; meta: VideoMeta }
  | { phase: "transcript-error"; meta: VideoMeta; message: string }
  | { phase: "picking"; meta: VideoMeta; transcript: Transcript }
  | {
      phase: "generating";
      meta: VideoMeta;
      transcript: Transcript;
      contentType: GeneratableContentType;
    }
  | {
      phase: "generate-error";
      meta: VideoMeta;
      transcript: Transcript;
      message: string;
    }
  | {
      phase: "output";
      meta: VideoMeta;
      transcript: Transcript;
      result: GeneratedContent;
    };

  export default function CreatePage() {
      const toast = useToast();
      const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>({ phase: "idle" });
  // Transient UI choice in the picker — not a flow phase, so it lives apart.
  const [selectedType, setSelectedType] =
    useState<GeneratableContentType | null>(null);


  // Save state for the output stage. Transient UI, so it lives apart from the
  // flow machine (like selectedType). Reset whenever a new result appears.
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState("");

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
    setSelectedType(null);
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

    // Success — transcript ready; move to format selection.
    setStatus({ phase: "picking", meta, transcript: result.data });
  }

  async function handleGenerate() {
    // Valid from "picking" or "generate-error" (retry), and needs a selection.
    const current = status;
    const base =
      current.phase === "picking" || current.phase === "generate-error"
        ? current
        : null;
    if (!base || !selectedType) return;

    const { meta, transcript } = base;
    setStatus({ phase: "generating", meta, transcript, contentType: selectedType });

    const result = await generateContent(transcript.fullText, selectedType);
    if (!result.ok) {
      setStatus({
        phase: "generate-error",
        meta,
        transcript,
        message: ERROR_MESSAGES[result.reason],
      });
      return;
    }

    setSaveState("idle");
    setSaveError("");
    setStatus({ phase: "output", meta, transcript, result: result.data });
  }

  async function handleSave() {
    const current = status;
    if (current.phase !== "output") return;
    // Guard: don't double-save the same result.
    if (saveState === "saving" || saveState === "saved") return;

    setSaveState("saving");
    setSaveError("");

    const result = await saveGeneratedContent(current.meta, current.result);
    if (!result.ok) {
      setSaveState("idle");
      setSaveError(ERROR_MESSAGES[result.reason]);
      toast.error(ERROR_MESSAGES[result.reason]);
      return;
    }

    setSaveState("saved");
    toast.success("Saved to your library");
  }

  function handleGenerateAnother() {
    // Reuse the transcript — back to the picker, no re-fetch.
    const current = status;
    if (current.phase !== "output") return;
    setSelectedType(null);
    setStatus({
      phase: "picking",
      meta: current.meta,
      transcript: current.transcript,
    });
  }

  const isLoading = status.phase === "loading";
  const showInput =
    status.phase === "idle" ||
    status.phase === "loading" ||
    status.phase === "error";

  // The video preview is shown for every stage past metadata.
  const meta =
    status.phase === "ready" ||
    status.phase === "transcribing" ||
    status.phase === "transcript-error" ||
    status.phase === "picking" ||
    status.phase === "generating" ||
    status.phase === "generate-error" ||
    status.phase === "output"
      ? status.meta
      : null;

  // Stages where the format picker / generation UI should appear.
  const inGenerationStage =
    status.phase === "picking" ||
    status.phase === "generating" ||
    status.phase === "generate-error" ||
    status.phase === "output";

  const isGenerating = status.phase === "generating";

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
            <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Fetching…" : "Fetch"}
            </Button>
          </div>

          {isLoading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-xn-ink-muted">
              <Spinner />
              <span>Looking up that video…</span>
            </div>
          )}

          {status.phase === "error" && (
            <div className="mt-3 flex items-start gap-2 text-sm text-xn-accent">
              <AlertIcon />
              <span>{status.message}</span>
            </div>
          )}
        </>
      )}

      {/* Preview + transcript/generation stages (shown once metadata loads) */}
      {meta && (
        <>
          <VideoPreviewCard
            meta={meta}
            actions={
              <>
                <Button
                  variant="ghost"
                  onClick={handleChange}
                  disabled={status.phase === "transcribing" || isGenerating}
                >
                  Change
                </Button>

                {/* The right-hand action depends on the stage. Once we're past
                    transcript fetch (generation stages), the preview's primary
                    action is retired — the Generate button lives by the picker. */}
                {!inGenerationStage && (
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

          {/* ── Generation stage ── */}
          {inGenerationStage && (
            <div className="mt-8">
              {/* Picker is hidden once output is shown, to keep focus on result */}
              {status.phase !== "output" && (
                <>
                  <h2 className="mb-1 font-serif text-h3 text-xn-ink">
                    Choose a format
                  </h2>
                  <p className="mb-4 text-sm text-xn-ink-muted">
                    Transcript ready — {status.transcript.segmentCount} lines ·{" "}
                    {status.transcript.language}
                    {status.transcript.isGenerated ? " (auto-generated)" : ""}.
                  </p>

                  <ContentTypePicker
                    selected={selectedType}
                    onSelect={setSelectedType}
                    disabled={isGenerating}
                  />

                  <div className="mt-5 flex items-center gap-3">
                    <Button
                      variant="primary"
                      onClick={handleGenerate}
                      disabled={!selectedType || isGenerating}
                    >
                      {isGenerating
                        ? "Generating…"
                        : status.phase === "generate-error"
                          ? "Try again"
                          : "Generate"}
                    </Button>

                    {isGenerating && (
                      <div className="flex items-center gap-2 text-sm text-xn-ink-muted">
                        <Spinner />
                        <span>Working through the transcript…</span>
                      </div>
                    )}
                  </div>

                  {status.phase === "generate-error" && (
                    <div className="mt-3 flex items-start gap-2 text-sm text-xn-accent">
                      <AlertIcon />
                      <span>{status.message}</span>
                    </div>
                  )}
                </>
              )}

              {/* ── Output ── */}
              {status.phase === "output" && (
                <>
                  <OutputView content={status.result} />
                  <div className="mt-5 flex items-center gap-3">
                    <Button
                      variant="primary"
                      onClick={handleSave}
                      disabled={saveState === "saving" || saveState === "saved"}
                    >
                      {saveState === "saving"
                        ? "Saving…"
                        : saveState === "saved"
                          ? "Saved ✓"
                          : "Save"}
                    </Button>
                    <Button variant="ghost" onClick={handleGenerateAnother}>
                      Generate another
                    </Button>
                    <Button variant="ghost" onClick={handleChange}>
                      Start over
                    </Button>
                  </div>

                  {saveError && (
                    <div className="mt-3 flex items-start gap-2 text-sm text-xn-accent">
                      <AlertIcon />
                      <span>{saveError}</span>
                    </div>
                  )}
                </>
              )}
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