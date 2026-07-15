// ─────────────────────────────────────────────────────────────
// lib/api/search.ts
//
// Frontend client for the backend topic-search endpoint.
//
// The UI calls searchVideos(query) and gets back either the list of
// matching videos or a clear failure reason. All the HTTP details
// (URL, method, status codes, envelope parsing) live here so components
// stay clean.
//
// Twin of fetchTranscript in lib/api/transcript.ts — same result shape,
// same try/catch structure, same detail.code-then-status fallback. Two
// search-specific differences, both noted inline below:
//   1. Success unwraps the { results } ENVELOPE the backend returns.
//   2. An empty results array is a SUCCESS ({ ok: true, data: [] }), not a
//      failure — the caller shows its "No videos matched…" empty state.
// ─────────────────────────────────────────────────────────────

import type {
    SearchResultVideo,
    SearchFailReason,
  } from "@/lib/youtube/search-types";
  
  // Same backend base URL the other clients use. NEXT_PUBLIC_ so it's
  // available in browser code; falls back to localhost in dev.
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  
  export type SearchVideosResult =
    | { ok: true; data: SearchResultVideo[] }
    | { ok: false; reason: SearchFailReason };
  
  // Shape of the backend's success envelope (SearchResponse in api/youtube.py).
  // Kept local — it's an implementation detail; callers only ever see the
  // unwrapped SearchResultVideo[] via `data`.
  interface SearchResponseEnvelope {
    results: SearchResultVideo[];
  }
  
  // The codes the backend is allowed to send in detail.code. We check against
  // this before trusting the body, so a malformed/unexpected code can't slip
  // through as a fake reason. (No "no-results" here — empty is a success.)
  const BACKEND_REASONS: readonly SearchFailReason[] = [
    "quota-exceeded",
    "search-failed",
  ];
  
  // Fallback when we can't read a code from the body: map the status alone.
  // Mirrors the backend's _SEARCH_ERROR_STATUS (429 quota, 502 upstream).
  function statusToReason(status: number): SearchFailReason {
    switch (status) {
      case 429:
        return "quota-exceeded";
      case 502:
        return "search-failed";
      default:
        return "search-failed";
    }
  }
  
  // Prefer the backend's machine code (detail.code); fall back to status.
  async function reasonFromResponse(
    response: Response
  ): Promise<SearchFailReason> {
    try {
      const body = await response.json();
      const code = body?.detail?.code;
      if (
        typeof code === "string" &&
        (BACKEND_REASONS as readonly string[]).includes(code)
      ) {
        return code as SearchFailReason;
      }
    } catch {
      // Body wasn't JSON (e.g. the 400 "Search query is required" path, or a
      // proxy error page). Fall through to status-based mapping.
    }
    return statusToReason(response.status);
  }
  
  /**
   * Search YouTube for videos matching a topic query.
   *
   * Pass a NON-URL query string — the /create page only routes here after
   * extractVideoId() fails to find a video ID in the input (a real URL takes
   * the metadata path instead).
   *
   * On success, `data` is the results array — which may be EMPTY. An empty
   * array is a valid success, not a failure: the caller renders the
   * "No videos matched…" empty state when data.length === 0.
   */
  export async function searchVideos(
    query: string
  ): Promise<SearchVideosResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
  
      // fetch only throws on network-level failures — a 400/429/502 still
      // resolves, so we check response.ok ourselves (same as the other clients).
      if (response.ok) {
        // Unwrap the envelope: the backend returns { results: [...] }, and
        // callers want just the array.
        const body = (await response.json()) as SearchResponseEnvelope;
        return { ok: true, data: body.results };
      }
  
      return { ok: false, reason: await reasonFromResponse(response) };
    } catch {
      // No response at all: backend down, CORS, DNS, no internet.
      return { ok: false, reason: "request-failed" };
    }
  }