/**
 * lib/content/types.ts
 *
 * Shared types for the content-generation flow.
 *
 * The canonical ContentType (all 7 formats) lives in lib/constants/theme — it
 * is the single source of truth for every format the app can style. This file
 * does NOT redefine it; it re-exports it, and adds the generation-specific
 * pieces on top:
 *
 *   - GENERATABLE_TYPES: which formats the backend can actually make TODAY.
 *     This is the single source of truth for "available vs. coming soon" and
 *     must stay in parity with the backend ContentType literal in prompts.py.
 *   - GeneratableContentType: the subset type derived from that array.
 *   - GeneratedContent / GenerateFailReason: the result + failure shapes.
 *
 * Pure types and one const array — no logic.
 */

import type { ContentType } from "@/lib/constants/theme";

// Re-export so callers can import ContentType from here too, without needing to
// know it physically lives in the theme tokens file.
export type { ContentType };

/**
 * The formats the MVP backend can generate right now.
 *
 * SINGLE SOURCE OF TRUTH for availability: the picker reads this to decide
 * which cards are live vs. "Coming soon". MUST stay in parity with the backend
 * ContentType literal in prompts.py. Add a format here only once its prompt
 * and generation path exist (Phase 11 adds research, flashcards, quiz, social).
 *
 * Typed `readonly ContentType[]` + `as const` so each value is checked against
 * the canonical list, and the subset type below is derived from it — the array
 * and its type can never drift apart.
 */
export const GENERATABLE_TYPES = ["summary", "blog", "notes"] as const satisfies readonly ContentType[];

/** The three generatable types as a type, derived from the array above. */
export type GeneratableContentType = (typeof GENERATABLE_TYPES)[number];

/**
 * Runtime check: is this content type generatable today?
 * Lets the picker (and any caller) ask without hardcoding the list again.
 */
export function isGeneratable(type: ContentType): type is GeneratableContentType {
  return (GENERATABLE_TYPES as readonly ContentType[]).includes(type);
}

/**
 * A successfully generated piece of content. Mirrors the backend
 * GenerateResponse shape exactly (camelCase matches, no translation).
 * `content` is Markdown; the output view renders it.
 */
export interface GeneratedContent {
  contentType: GeneratableContentType;
  content: string;
}

/**
 * Every reason a generation attempt can fail, as a closed union.
 *
 * The first five mirror the backend GenerationError codes that arrive in the
 * response body as detail.code (File 5's client reads them against an
 * allow-list). The last two are client-side: `network` when fetch itself throws
 * (offline, server down), and `unknown` as the catch-all.
 */
export type GenerateFailReason =
  | "empty-transcript"
  | "transcript-too-long"
  | "unknown-content-type"
  | "provider-misconfigured"
  | "generation-failed"
  | "network"
  | "unknown";