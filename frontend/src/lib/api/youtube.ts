// ─────────────────────────────────────────────────────────────
// lib/api/youtube.ts
//
// Frontend client for the backend metadata endpoint.
//
// The UI calls fetchVideoMetadata(videoId) and gets back either the
// video's metadata or a clear failure reason. All the HTTP details
// (URL, method, status codes) live here so components stay clean.
//
// Mirrors the result shape of extract-video-id.ts so success/failure
// is handled the same way everywhere in the app.
//
// Sends the signed-in user's access token: the route requires sign-in, and
// each lookup takes one use of that user's hourly limit.
// ─────────────────────────────────────────────────────────────

import type { VideoMeta } from "@/lib/youtube/types";
import { API_BASE_URL, REQUEST_TIMEOUT_MS, accessToken, codeOf, detailFrom } from "@/lib/api/backend";
import { retryAfterFrom } from "@/lib/rate-limit/message";

// Machine-readable failure reasons. The UI maps each to friendly copy
// (we keep wording out of here so a redesign can rewrite messages
// without touching this logic — same rule as File 1).
export type MetaFailReason =
  | "invalid-id"             // backend 400 — id failed server-side validation
  | "not-found"              // backend 404 — private/deleted/region-blocked
  | "server-config"          // backend 500 — e.g. missing API key on the server
  | "upstream"               // backend 502 — YouTube rejected us or was unreachable
  | "not-authenticated"      // no session, or the backend refused the token
  | "auth-unavailable"       // the backend could not check the sign-in
  | "rate-limited"           // the user's hourly limit on lookups is used up
  | "rate-limit-unavailable" // the backend could not check that limit
  | "network"                // fetch itself failed (backend down, CORS, DNS)
  | "unknown";               // any other status

/** A refusal for the hourly limit carries how long until the next lookup is allowed, when known. */
export type FetchMetaResult =
  | { ok: true; data: VideoMeta }
  | { ok: false; reason: "rate-limited"; retryAfterSeconds: number | null }
  | { ok: false; reason: Exclude<MetaFailReason, "rate-limited"> };

// The codes the route refuses with in detail.code, checked against this before
// being trusted. The rest of its refusals carry no code and are read by status.
const CODED_REASONS: readonly Exclude<MetaFailReason, "rate-limited">[] = [
  "not-authenticated",
  "auth-unavailable",
  "rate-limit-unavailable",
];

// Translate an HTTP status code into one of our reasons.
function statusToReason(status: number): Exclude<MetaFailReason, "rate-limited"> {
  switch (status) {
    case 400:
      return "invalid-id";
    case 401:
      return "not-authenticated";
    case 404:
      return "not-found";
    case 500:
      return "server-config";
    case 502:
      return "upstream";
    default:
      return "unknown";
  }
}

/**
 * Fetch a video's metadata from the backend.
 *
 * Pass a CLEAN video id — the caller should run extractVideoId() first
 * (that's the gate; this function assumes the id is already valid-shaped).
 */
export async function fetchVideoMetadata(
  videoId: string
): Promise<FetchMetaResult> {
  try {
    const token = await accessToken();
    if (!token) return { ok: false, reason: "not-authenticated" };

    const response = await fetch(`${API_BASE_URL}/api/youtube/metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ videoId }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    // IMPORTANT: fetch does NOT throw on 404/500 — it only throws on a
    // network-level failure. So we must check response.ok ourselves.
    if (response.ok) {
      const data = (await response.json()) as VideoMeta;
      return { ok: true, data };
    }

    const detail = await detailFrom(response);
    const code = codeOf(detail);
    if (code === "rate-limited") {
      return { ok: false, reason: "rate-limited", retryAfterSeconds: retryAfterFrom(detail) };
    }
    const reason = CODED_REASONS.find((known) => known === code);
    return { ok: false, reason: reason ?? statusToReason(response.status) };
  } catch {
    // We land here only if the request never got a response at all
    // (server down, blocked by CORS, no internet, or no answer in time).
    return { ok: false, reason: "network" };
  }
}
