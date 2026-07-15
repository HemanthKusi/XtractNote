/**
 * lib/youtube/format.ts
 *
 * Pure display formatters for raw YouTube data.
 *
 * The backend ships everything raw on purpose — seconds, view counts as
 * numbers, ISO timestamps — and the UI decides presentation. These helpers
 * are that presentation layer, kept in one place so the video preview card
 * and the search result cards format identically.
 *
 * No React, no side effects — safe to call from Server or Client Components.
 * Each returns `undefined` for missing/invalid input so callers can simply
 * omit the piece (cleaner than rendering a "—" placeholder).
 */

/**
 * Seconds → a clock string.
 *   140   -> "2:20"
 *   3792  -> "1:03:12"
 * Returns undefined when there's no duration (so the thumbnail hides its pill).
 *
 * Moved here from video-preview-card.tsx in Phase 10 once the search cards
 * became a second consumer — behavior is unchanged from the original.
 */
export function formatDuration(
    totalSeconds: number | null | undefined
  ): string | undefined {
    if (totalSeconds == null) return undefined;
  
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
  
    // Minutes are zero-padded only when there's an hours segment in front.
    const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
    const ss = String(seconds).padStart(2, "0");
  
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
  }
  
  /**
   * View count → compact, human string.
   *   1_420_000 -> "1.4M views"
   *   12_300    -> "12K views"
   *   342       -> "342 views"
   *   1         -> "1 view"
   * Returns undefined when the count is missing (hidden / enrichment failed).
   *
   * Uses Intl compact notation so rounding and locale are handled correctly
   * (e.g. 999_999 -> "1M views", not "1000K views").
   */
  export function formatViewCount(
    count: number | null | undefined
  ): string | undefined {
    if (count == null || count < 0) return undefined;
  
    const compact = new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(count);
  
    return `${compact} view${count === 1 ? "" : "s"}`;
  }
  
  /**
   * ISO 8601 timestamp → relative time.
   *   (2 months back) -> "2 months ago"
   *   (yesterday)     -> "yesterday"
   * Returns undefined when the input is missing or unparseable.
   *
   * Uses Intl.RelativeTimeFormat with numeric:"auto" so it produces the nicer
   * "yesterday" / "last week" phrasings where they apply. Picks the largest
   * unit that keeps the number small by walking down through the divisions.
   */
  export function formatRelativeTime(
    isoDate: string | null | undefined
  ): string | undefined {
    if (!isoDate) return undefined;
  
    const then = new Date(isoDate).getTime();
    if (Number.isNaN(then)) return undefined;
  
    // Negative = in the past (which is the normal case for a publish date).
    let delta = Math.round((then - Date.now()) / 1000);
  
    const divisions: Array<[number, Intl.RelativeTimeFormatUnit]> = [
      [60, "second"],
      [60, "minute"],
      [24, "hour"],
      [7, "day"],
      [4.34524, "week"],
      [12, "month"],
      [Number.POSITIVE_INFINITY, "year"],
    ];
  
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  
    for (const [amount, unit] of divisions) {
      if (Math.abs(delta) < amount) {
        return rtf.format(Math.round(delta), unit);
      }
      delta /= amount;
    }
  
    return undefined; // unreachable — the last division is Infinity
  }