// ─────────────────────────────────────────────────────────────
// lib/youtube/extract-video-id.ts
//
// Turns ANY YouTube input into a clean 11-character video ID,
// or returns a clear reason why it couldn't.
//
// This file is "pure": it takes a string and returns a value.
// No network calls, no React, no side effects — which means it's
// trivial to test and reuse anywhere (UI, backend client, etc.).
// ─────────────────────────────────────────────────────────────

// A YouTube video ID is always exactly 11 characters from this set:
// letters, numbers, underscore, and hyphen.
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

// The result is a "discriminated union": when ok is true you get a
// videoId; when ok is false you get a machine-readable reason. The UI
// layer maps each reason to a friendly message — we keep wording out
// of here on purpose, so this stays pure logic.
export type ExtractResult =
  | { ok: true; videoId: string }
  | { ok: false; reason: ExtractFailReason };

export type ExtractFailReason =
  | "empty"        // user gave us nothing
  | "not-youtube"  // a URL, but not a YouTube domain
  | "no-id"        // YouTube-ish, but we couldn't find an ID in it
  | "invalid-id";  // found something, but it isn't a valid 11-char ID

// The YouTube hosts we accept (after stripping a leading "www.").
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
]);

// Path prefixes that put the ID in the path instead of a ?v= param,
// e.g. /shorts/ID, /embed/ID, /live/ID, /v/ID.
const PATH_ID_PREFIXES = new Set(["shorts", "embed", "live", "v"]);

/**
 * True if a string is a syntactically valid YouTube video ID.
 * (Doesn't check the video actually exists — that needs the network.)
 */
export function isValidVideoId(id: string): boolean {
  return VIDEO_ID_PATTERN.test(id);
}

/**
 * Extract a video ID from any YouTube input.
 *
 * Handles:
 *   - https://www.youtube.com/watch?v=VIDEO_ID (+ extra params)
 *   - https://youtu.be/VIDEO_ID
 *   - https://youtube.com/shorts/VIDEO_ID
 *   - https://www.youtube.com/embed/VIDEO_ID
 *   - https://www.youtube.com/live/VIDEO_ID
 *   - m.youtube.com / music.youtube.com variants
 *   - a bare 11-char ID ("dQw4w9WgXcQ")
 *   - URLs without a scheme ("youtube.com/watch?v=...")
 */
export function extractVideoId(input: string): ExtractResult {
  const raw = (input ?? "").trim();

  if (!raw) {
    return { ok: false, reason: "empty" };
  }

  // Case 1 — the user pasted a bare ID directly.
  if (isValidVideoId(raw)) {
    return { ok: true, videoId: raw };
  }

  // Case 2 — treat it as a URL. We use the built-in URL parser instead
  // of one giant regex because it's far more reliable. If the string
  // has no scheme (e.g. "youtube.com/..."), we add https:// so it parses.
  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    // Not a bare ID and not a parseable URL.
    return { ok: false, reason: "no-id" };
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) {
    return { ok: false, reason: "not-youtube" };
  }

  // Find the candidate ID depending on the URL shape.
  let candidate: string | null = null;

  if (host === "youtu.be") {
    // Short links keep the ID as the first path segment: youtu.be/VIDEO_ID
    candidate = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (url.searchParams.has("v")) {
    // Standard watch links: /watch?v=VIDEO_ID
    candidate = url.searchParams.get("v");
  } else {
    // Path-based shapes: /shorts/ID, /embed/ID, /live/ID, /v/ID
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && PATH_ID_PREFIXES.has(parts[0])) {
      candidate = parts[1];
    }
  }

  if (!candidate) {
    return { ok: false, reason: "no-id" };
  }

  if (!isValidVideoId(candidate)) {
    return { ok: false, reason: "invalid-id" };
  }

  return { ok: true, videoId: candidate };
}