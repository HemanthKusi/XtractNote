// ─────────────────────────────────────────────────────────────
// lib/api/transcript.ts
//
// Frontend client for the backend transcript endpoint.
//
// The UI calls fetchTranscript(videoId) and gets back either the
// video's transcript or a clear failure reason. All the HTTP details
// (URL, method, status codes, body parsing) live here so components
// stay clean.
//
// Twin of fetchVideoMetadata in lib/api/youtube.ts — same result shape,
// same try/catch structure. The one difference: this reads the backend's
// detail.code, because two failures share HTTP 502 and only the code can
// tell transcript-blocked apart from transcript-failed.
// ─────────────────────────────────────────────────────────────

import type {
    Transcript,
    TranscriptFailReason,
  } from "@/lib/youtube/transcript-types";
  
  // Same backend base URL the metadata client uses. NEXT_PUBLIC_ so it's
  // available in browser code; falls back to localhost in dev.
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  
  export type FetchTranscriptResult =
    | { ok: true; data: Transcript }
    | { ok: false; reason: TranscriptFailReason };
  
  // The codes the backend is allowed to send in detail.code. We check
  // against this before trusting the body, so a malformed/unexpected code
  // can't slip through as a fake reason.
  const BACKEND_REASONS: readonly TranscriptFailReason[] = [
    "no-captions",
    "video-not-found",
    "transcript-blocked",
    "transcript-failed",
  ];
  
  // Fallback when we can't read a code from the body: map the status alone.
  // Note 502 collapses to the generic "transcript-failed" here — the body
  // code is what normally separates blocked from failed.
  function statusToReason(status: number): TranscriptFailReason {
    switch (status) {
      case 404:
        return "video-not-found";
      case 422:
        return "no-captions";
      case 502:
        return "transcript-failed";
      default:
        return "transcript-failed";
    }
  }
  
  // Prefer the backend's machine code (detail.code); fall back to status.
  async function reasonFromResponse(
    response: Response
  ): Promise<TranscriptFailReason> {
    try {
      const body = await response.json();
      const code = body?.detail?.code;
      if (
        typeof code === "string" &&
        (BACKEND_REASONS as readonly string[]).includes(code)
      ) {
        return code as TranscriptFailReason;
      }
    } catch {
      // Body wasn't JSON (e.g. the 400 "Invalid video ID" path, or a proxy
      // error page). Fall through to status-based mapping.
    }
    return statusToReason(response.status);
  }
  
  /**
   * Fetch a video's transcript from the backend.
   *
   * Pass a CLEAN video id — the caller should have run extractVideoId()
   * (and usually fetched metadata) first.
   */
  export async function fetchTranscript(
    videoId: string
  ): Promise<FetchTranscriptResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
  
      // fetch only throws on network-level failures — a 404/422/502 still
      // resolves, so we check response.ok ourselves (same as the metadata client).
      if (response.ok) {
        const data = (await response.json()) as Transcript;
        return { ok: true, data };
      }
  
      return { ok: false, reason: await reasonFromResponse(response) };
    } catch {
      // No response at all: backend down, CORS, DNS, no internet.
      return { ok: false, reason: "request-failed" };
    }
  }