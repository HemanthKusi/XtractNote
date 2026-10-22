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
// Sends the signed-in user's access token: the route requires sign-in, and
// each search takes one use of that user's hourly limit.
//
// A detail.code-then-status fallback for failures, and two search-specific
// behaviours, both noted inline below:
//   1. Success unwraps the { results } ENVELOPE the backend returns.
//   2. An empty results array is a SUCCESS ({ ok: true, data: [] }), not a
//      failure — the caller shows its "No videos matched…" empty state.
// ─────────────────────────────────────────────────────────────

import type {
    SearchResultVideo,
    SearchFailReason,
  } from "@/lib/youtube/search-types";
  import { API_BASE_URL, REQUEST_TIMEOUT_MS, accessToken, codeOf, detailFrom } from "@/lib/api/backend";
  import { retryAfterFrom } from "@/lib/rate-limit/message";

  /** A refusal for the hourly limit carries how long until the next search is allowed, when known. */
  export type SearchVideosResult =
    | { ok: true; data: SearchResultVideo[] }
    | { ok: false; reason: "rate-limited"; retryAfterSeconds: number | null }
    | { ok: false; reason: Exclude<SearchFailReason, "rate-limited"> };

  // Shape of the backend's success envelope (SearchResponse in api/youtube.py).
  // Kept local — it's an implementation detail; callers only ever see the
  // unwrapped SearchResultVideo[] via `data`.
  interface SearchResponseEnvelope {
    results: SearchResultVideo[];
  }

  // The codes the backend is allowed to send in detail.code. We check against
  // this before trusting the body, so a malformed/unexpected code can't slip
  // through as a fake reason. (No "no-results" here — empty is a success.)
  // "rate-limited" is read separately, with the wait it carries.
  const BACKEND_REASONS: readonly Exclude<SearchFailReason, "rate-limited">[] = [
    "quota-exceeded",
    "search-failed",
    "rate-limit-unavailable",
    "not-authenticated",
    "auth-unavailable",
  ];

  // Fallback when we can't read a code from the body: map the status alone.
  // A bare 429 — from a proxy, say — is read as the shared quota, as before.
  function statusToReason(status: number): Exclude<SearchFailReason, "rate-limited"> {
    switch (status) {
      case 401:
        return "not-authenticated";
      case 429:
        return "quota-exceeded";
      default:
        return "search-failed";
    }
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
      const token = await accessToken();
      if (!token) return { ok: false, reason: "not-authenticated" };

      const response = await fetch(`${API_BASE_URL}/api/youtube/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      // fetch only throws on network-level failures — a 400/429/502 still
      // resolves, so we check response.ok ourselves (same as the other clients).
      if (response.ok) {
        // Unwrap the envelope: the backend returns { results: [...] }, and
        // callers want just the array.
        const body = (await response.json()) as SearchResponseEnvelope;
        return { ok: true, data: body.results };
      }

      // Prefer the backend's machine code (detail.code); fall back to status.
      // Some refusals carry no code: the 400 for a blank query, whose detail
      // is a plain string, or a proxy's error page.
      const detail = await detailFrom(response);
      const code = codeOf(detail);
      if (code === "rate-limited") {
        return { ok: false, reason: "rate-limited", retryAfterSeconds: retryAfterFrom(detail) };
      }
      const reason = BACKEND_REASONS.find((known) => known === code);
      return { ok: false, reason: reason ?? statusToReason(response.status) };
    } catch {
      // No response at all (backend down, CORS, DNS, no internet, or no answer
      // in time), or a successful response whose body was not JSON.
      return { ok: false, reason: "request-failed" };
    }
  }
