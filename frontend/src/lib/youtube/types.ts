// ─────────────────────────────────────────────────────────────
// lib/youtube/types.ts
//
// The shared shape of a YouTube video inside our app.
//
// This is a "contract" type: the backend returns this shape from the
// metadata endpoint, and the frontend (API client, preview card, save
// flow) consumes it. Defining it in one place keeps both sides agreeing
// on the same field names.
// ─────────────────────────────────────────────────────────────

// YouTube auto-generates thumbnails at a few fixed quality levels.
// We'll use this when building or picking a thumbnail URL later.
export type ThumbnailQuality =
  | "default"   // 120x90
  | "medium"    // 320x180
  | "high"      // 480x360
  | "standard"  // 640x480
  | "maxres";   // 1280x720 (not always available)

/**
 * Everything we know about a video after a successful metadata lookup.
 * Maps onto the generated_content DB columns:
 *   videoId -> video_id, title -> video_title, channel -> video_channel,
 *   thumbnailUrl -> video_thumbnail, url -> video_url
 */
export interface VideoMeta {
  /** Canonical 11-character YouTube ID. */
  videoId: string;

  /** The video's title. */
  title: string;

  /** Channel / author display name. */
  channel: string;

  /**
   * Link to the channel. Optional because not every metadata source
   * provides it (oEmbed does; some paths may not).
   */
  channelUrl?: string;

  /** Best available thumbnail URL the backend resolved. */
  thumbnailUrl: string;

  /** Canonical watch URL, e.g. https://www.youtube.com/watch?v=ID */
  url: string;

  /**
   * Length in seconds. Optional on purpose: the keyless oEmbed source
   * does NOT return duration, while the YouTube Data API does. Marking
   * it optional lets the UI render "—" when it's missing instead of
   * breaking. (We settle the oEmbed-vs-Data-API choice in File 3.)
   */
  durationSeconds?: number;
}