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
// ─────────────────────────────────────────────────────────────

import type { VideoMeta } from "@/lib/youtube/types";

// The backend's base URL. Only env vars prefixed NEXT_PUBLIC_ are
// exposed to browser code in Next.js — and a backend URL is safe to
// expose (it's not a secret). Falls back to localhost in dev.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Machine-readable failure reasons. The UI maps each to friendly copy
// (we keep wording out of here so a redesign can rewrite messages
// without touching this logic — same rule as File 1).
export type MetaFailReason =
  | "invalid-id"     // backend 400 — id failed server-side validation
  | "not-found"      // backend 404 — private/deleted/region-blocked
  | "server-config"  // backend 500 — e.g. missing API key on the server
  | "upstream"       // backend 502 — YouTube rejected us or was unreachable
  | "network"        // fetch itself failed (backend down, CORS, DNS)
  | "unknown";       // any other status

export type FetchMetaResult =
  | { ok: true; data: VideoMeta }
  | { ok: false; reason: MetaFailReason };

// Translate an HTTP status code into one of our reasons.
function statusToReason(status: number): MetaFailReason {
  switch (status) {
    case 400:
      return "invalid-id";
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
    const response = await fetch(`${API_BASE_URL}/api/youtube/metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    });

    // IMPORTANT: fetch does NOT throw on 404/500 — it only throws on a
    // network-level failure. So we must check response.ok ourselves.
    if (response.ok) {
      const data = (await response.json()) as VideoMeta;
      return { ok: true, data };
    }

    return { ok: false, reason: statusToReason(response.status) };
  } catch {
    // We land here only if the request never got a response at all
    // (server down, blocked by CORS, no internet).
    return { ok: false, reason: "network" };
  }
}