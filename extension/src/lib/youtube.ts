// Detect and parse the YouTube video on the user's active tab.
//
// Two layers:
//   1. extractYouTubeVideoId() — pure URL parsing, no chrome.* dependency.
//   2. detectActiveTabVideo()  — reads the active tab, then uses layer 1.
//
// This is a self-contained port of the web app's link-shape logic; the
// extension intentionally does not import from the frontend package.

/** A valid YouTube video ID: exactly 11 chars of [A-Za-z0-9_-]. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Return the candidate only if it's a well-formed video ID, else null. */
function validId(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  return YOUTUBE_ID.test(candidate) ? candidate : null;
}

/**
 * Extract the video ID from any supported YouTube URL shape, or null.
 *
 * Supported:
 *   https://www.youtube.com/watch?v=ID       (+ m. / music. subdomains)
 *   https://youtu.be/ID
 *   https://www.youtube.com/shorts/ID
 *   https://www.youtube.com/embed/ID         (+ youtube-nocookie.com)
 *   https://www.youtube.com/live/ID
 *   https://www.youtube.com/v/ID
 * Extra query params (t, list, feature, …) are ignored.
 */
export function extractYouTubeVideoId(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null; // not a parseable URL (e.g. chrome://, about:blank)
  }

  // Strip the subdomain so www./m./music. all collapse to the bare host.
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");

  // Short links: youtu.be/ID
  if (host === "youtu.be") {
    return validId(url.pathname.split("/").filter(Boolean)[0]);
  }

  // Full site + no-cookie embed host
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    // /watch?v=ID
    if (url.pathname === "/watch") {
      return validId(url.searchParams.get("v"));
    }
    // /shorts/ID, /embed/ID, /live/ID, /v/ID
    const [first, second] = url.pathname.split("/").filter(Boolean);
    if (["shorts", "embed", "live", "v"].includes(first)) {
      return validId(second);
    }
  }

  return null;
}

/** Why detection failed. */
export type DetectReason = "no-active-tab" | "not-youtube";

/** Result of inspecting the active tab. */
export type ActiveVideo =
  | { ok: true; videoId: string; url: string; title?: string }
  | { ok: false; reason: DetectReason };

/**
 * Read the active tab in the current window and, if it's a YouTube video,
 * return its ID and URL. Relies on the `activeTab` grant that opening the
 * popup provides, so no host permission is requested.
 */
export async function detectActiveTabVideo(): Promise<ActiveVideo> {
  let tab: chrome.tabs.Tab | undefined;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    return { ok: false, reason: "no-active-tab" };
  }

  // With only `activeTab`, tab.url is populated because opening the popup is
  // the invoking gesture. If it's ever empty, we're missing that grant.
  const url = tab?.url;
  if (!url) {
    return { ok: false, reason: "no-active-tab" };
  }

  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return { ok: false, reason: "not-youtube" };
  }

  return { ok: true, videoId, url, title: tab.title };
}