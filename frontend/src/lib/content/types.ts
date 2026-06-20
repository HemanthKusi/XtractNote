/**
 * lib/content/types.ts
 *
 * Shared types for the content-generation flow.
 *
 * These mirror the backend contract in backend/app/api/generate.py and
 * backend/app/services/prompts.py. The two sides are kept in parity by hand —
 * the same arrangement as VideoMeta / Transcript across the boundary. If you
 * add a content type or error code on the backend, update it here too.
 *
 * Pure types only — no logic, no values.
 */

/**
 * The content formats the MVP can generate.
 *
 * MUST stay in exact parity with the backend `ContentType` literal in
 * prompts.py. Research / Flashcards / Quiz / Social arrive in Phase 11.
 */
export type ContentType = "summary" | "blog" | "notes";

/**
 * A successfully generated piece of content.
 *
 * Mirrors the backend `GenerateResponse` shape exactly (camelCase already
 * matches, so no translation). `content` is Markdown; the output view renders
 * it. In Phase 8 this gets enriched into a saved record (id, video, timestamps,
 * folder) — that is a separate persistence concern, not this in-memory result.
 */
export interface GeneratedContent {
  contentType: ContentType;
  content: string;
}

/**
 * Every reason a generation attempt can fail, as a closed union.
 *
 * The first five mirror the backend `GenerationError` codes that arrive in the
 * response body as `detail.code` (File 5's client reads them against this
 * allow-list). The last two are client-side: `network` when fetch itself throws
 * (offline, server down), and `unknown` as the catch-all for any status or
 * shape we did not anticipate.
 *
 * Naming follows the existing `TranscriptFailReason` / `MetaFailReason`
 * convention.
 */
export type GenerateFailReason =
  | "empty-transcript"
  | "transcript-too-long"
  | "unknown-content-type"
  | "provider-misconfigured"
  | "generation-failed"
  | "network"
  | "unknown";