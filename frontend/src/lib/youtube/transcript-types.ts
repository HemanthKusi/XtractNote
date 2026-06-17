/**
 * lib/youtube/transcript-types.ts
 *
 * The frontend contract for a video transcript.
 *
 * These shapes mirror the backend's TranscriptResponse model in
 * backend/app/api/youtube.py EXACTLY (same camelCase field names), so the
 * JSON crossing the wire needs no translation on either side. If you change
 * a field here, change it there too — they are one contract in two languages.
 *
 * This file is types only: it disappears at compile time and ships no runtime
 * code. The actual fetching lives in lib/api/transcript.ts.
 */

/** A cleaned transcript for a single YouTube video. */
export interface Transcript {
    /** The 11-char YouTube video ID this transcript belongs to. */
    videoId: string;
  
    /** Human-readable language name, e.g. "English". */
    language: string;
  
    /** Language code, e.g. "en" / "en-US". */
    languageCode: string;
  
    /** True = YouTube auto-generated captions; false = human-written. */
    isGenerated: boolean;
  
    /** How many caption lines the transcript was built from. */
    segmentCount: number;
  
    /** The full transcript as one cleaned string — what the AI step consumes. */
    fullText: string;
  }
  
  /**
   * Every reason fetching a transcript can fail, as a closed union.
   *
   * The first four come straight from the backend (it sends them as
   * `detail.code`). The last one is client-side only: the API client uses it
   * whenever the request itself fails before we ever get a coded response
   * (network down, server unreachable, unparseable body).
   *
   * The /create page's ERROR_MESSAGES map must cover every member of this
   * union — TypeScript will flag it if one is ever missing.
   */
  export type TranscriptErrorCode =
    | "no-captions" // captions are off / none exist / transcript is empty
    | "video-not-found" // invalid, private, or removed video
    | "transcript-blocked" // YouTube blocked our server's request (try again)
    | "transcript-failed" // some other upstream retrieval failure
    | "request-failed"; // client-side: the request never reached a coded response