/**
 * lib/youtube/search-types.ts
 *
 * The frontend contract for a YouTube topic-search result.
 *
 * These shapes mirror the backend's SearchResultItem / SearchResponse models in
 * backend/app/api/youtube.py EXACTLY (same camelCase field names), so the JSON
 * crossing the wire needs no translation on either side. If you change a field
 * here, change it there too — they are one contract in two languages.
 *
 * This file is types only: it disappears at compile time and ships no runtime
 * code. The actual fetching lives in lib/api/search.ts.
 */

/** A single video returned by a topic search, enriched with duration + views. */
export interface SearchResultVideo {
    /** The 11-char YouTube video ID. */
    videoId: string;
  
    /** Video title (already HTML-unescaped by the backend). */
    title: string;
  
    /** Channel name (already HTML-unescaped). */
    channel: string;
  
    /** Link to the channel, or null if the API returned no channelId. */
    channelUrl: string | null;
  
    /** Highest-resolution thumbnail URL the API returned. */
    thumbnailUrl: string;
  
    /** Canonical watch URL, e.g. https://www.youtube.com/watch?v=ID */
    url: string;
  
    /** Short description snippet (HTML-unescaped); may be an empty string. */
    description: string;
  
    /**
     * Raw ISO 8601 publish timestamp, or null. The UI formats it
     * (e.g. "2 months ago") — the backend ships it raw.
     */
    publishedAt: string | null;
  
    /**
     * Video length in seconds, or null. Null when the backend's best-effort
     * videos.list enrichment couldn't supply it. The UI formats it ("12:04").
     */
    durationSeconds: number | null;
  
    /**
     * View count as a raw number, or null when hidden / enrichment failed.
     * The UI formats it ("1.4M views").
     */
    viewCount: number | null;
  }
  
  /**
   * Every reason a topic search can fail, as a closed union.
   *
   * Parallels TranscriptFailReason. The first two come straight from the backend
   * (sent as detail.code); request-failed is client-side only — used whenever the
   * request never reaches a coded response (network down, server unreachable,
   * unparseable body).
   *
   * NOTE: there is deliberately NO "no-results" member. A search that succeeds
   * with zero matches is NOT a failure — the backend returns an empty results
   * array (HTTP 200) and the UI shows its "No videos matched…" empty state. Only
   * genuine breakage is a SearchFailReason.
   *
   * The /create page's ERROR_MESSAGES map must cover every member of this union —
   * TypeScript will flag it if one is ever missing.
   */
  export type SearchFailReason =
    | "quota-exceeded" // daily YouTube quota / rate limit hit — try again later
    | "search-failed" // bad key, upstream 5xx, unreadable body — generic upstream failure
    | "request-failed"; // client-side: the request never reached a coded response