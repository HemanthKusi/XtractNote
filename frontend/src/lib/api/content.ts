// src/lib/api/content.ts
// Browser-side persistence for generated content. Inserts/updates/deletes rows
// in public.generated_content under RLS (the user owns the row).
//
// As of Phase 11, content_body stores the full ContentBody union:
//   - prose types      -> { markdown }
//   - flashcards       -> { kind: "flashcards", cards: [...] }
//   - quiz             -> { kind: "quiz", questions: [...] }
// Prose rows are byte-identical to what was stored before, so every existing
// row stays valid and no migration is needed.

import { createClient } from "@/lib/supabase/client";
import type { VideoMeta } from "@/lib/youtube/types";
import type { ContentBody, ContentType, GeneratedContent } from "@/lib/content/types";
import { getSocialPlatformLabel } from "@/lib/content/types";

// Discriminated-union result, same pattern as the other lib/api helpers.
export type SaveFailReason = "not-authenticated" | "insert-failed" | "network";

export type SaveResult =
  | { ok: true; data: { id: string } }
  | { ok: false; reason: SaveFailReason };

// Update adds "not-found" — the id is missing or RLS filtered it (not yours) —
// and "wrong-body-type", which means the call itself was invalid: this helper
// only writes prose bodies, so it refuses structured content outright.
export type UpdateFailReason =
  | "not-authenticated"
  | "not-found"
  | "wrong-body-type"
  | "update-failed"
  | "network";

export type UpdateResult =
  | { ok: true; data: { id: string; wordCount: number; updatedAt: string } }
  | { ok: false; reason: UpdateFailReason };

export type DeleteFailReason =
  | "not-authenticated"
  | "not-found"
  | "delete-failed"
  | "network";

export type DeleteResult =
  | { ok: true }
  | { ok: false; reason: DeleteFailReason };

// Seconds (number) → "M:SS" text for the video_duration text column.
// Returns null when duration is unknown (keyless oEmbed source omits it).
function formatDuration(seconds?: number): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Rough word count from a text blob (used by History cards).
function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/**
 * Word count across any content body shape.
 *
 * History cards show this, so a structured item reading "0 words" would look
 * broken. For flashcards and quiz we count the visible text of every item.
 * It is a size indicator, not a precise metric — that is all the card needs.
 *
 * Switching on `kind` means adding a body shape later without handling it here
 * becomes a compile error rather than a silently wrong number.
 */
function countBodyWords(body: ContentBody): number {
  switch (body.kind) {
    case "flashcards":
      return body.cards.reduce(
        (total, card) => total + countWords(card.front) + countWords(card.back),
        0,
      );
    case "quiz":
      return body.questions.reduce((total, q) => {
        const options = q.options.reduce((sum, opt) => sum + countWords(opt), 0);
        return total + countWords(q.question) + options + countWords(q.explanation ?? "");
      }, 0);
    default:
      return countWords(body.markdown);
  }
}

/**
 * Save one generated result for the signed-in user.
 *
 * @param meta    The video the content came from.
 * @param content The generated content (contentType + body + optional platform).
 */
export async function saveGeneratedContent(
  meta: VideoMeta,
  content: GeneratedContent,
): Promise<SaveResult> {
  const supabase = createClient();

  // Who's saving — verified against Supabase, not trusted from the client.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, reason: "not-authenticated" };
  }

  const body = content.content;
  const platform = content.contentType === "social" ? content.platform ?? null : null;

  // Social items default their title to "LinkedIn post — Video Title" so five
  // platform variants of one video are distinguishable in History. Every other
  // type keeps the video title as before.
  const contentTitle = platform
    ? `${getSocialPlatformLabel(platform)} — ${meta.title}`
    : meta.title;

  try {
    const { data, error } = await supabase
      .from("generated_content")
      .insert({
        user_id: user.id,
        // Video source
        video_url: meta.url,
        video_id: meta.videoId,
        video_title: meta.title,
        video_channel: meta.channel,
        video_thumbnail: meta.thumbnailUrl,
        video_duration: formatDuration(meta.durationSeconds),
        // Generated content
        content_type: content.contentType,
        content_title: contentTitle,
        // The full body union. Prose bodies are { markdown }, exactly as
        // before — structured bodies keep their kind + items.
        content_body: body,
        // Platform lives in metadata rather than its own column: no migration,
        // and content_type stays "social". null (not {}) for other types so
        // "social posts with a platform" is a clean `is not null` query.
        metadata: platform ? { platform } : null,
        status: "saved",
        word_count: countBodyWords(body),
        // folder_id stays null (8.5); content_html stays null (rendered live)
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, reason: "insert-failed" };
    }

    return { ok: true, data: { id: data.id } };
  } catch {
    // Thrown errors are almost always network/transport failures.
    return { ok: false, reason: "network" };
  }
}

/**
 * Content types whose bodies are structured JSON rather than markdown.
 *
 * Local to this file on purpose: lib/content/types.ts defines the body shapes
 * but has no "which content types are structured" export, and adding one for a
 * single consumer would be premature. Promote it there if a second consumer
 * appears.
 */
const STRUCTURED_TYPES: readonly ContentType[] = ["flashcards", "quiz"];

/**
 * Update one saved item's title + body for the signed-in user.
 *
 * RLS scopes the write to the owner; .select("id, ...").single() forces a
 * one-row result so a missing/RLS-filtered row surfaces as "not-found"
 * (PGRST116) instead of a silent zero-row "success". word_count is recomputed
 * from the new body; updated_at is left to the touch_updated_at trigger and
 * read back so the editor can show "last edited" without a refetch.
 *
 * PROSE ONLY — enforced, not assumed. This writes content_body as { markdown },
 * which would overwrite a flashcards/quiz body and lose every card or question.
 * The caller passes the row's contentType and structured types are rejected
 * with "wrong-body-type" before any write. The editor also hides Edit for those
 * types, but the guard here means a future caller (regenerate, a bulk action)
 * cannot destroy a body by not knowing the rule.
 *
 * The type is a parameter rather than a pre-read: the editor already holds it
 * from fetchContentById, so the guard costs no extra round trip.
 *
 * @param id          The row id to update.
 * @param contentType The row's content type, used to reject structured bodies.
 * @param patch       The edited fields (raw title + markdown body).
 */
export async function updateContent(
  id: string,
  contentType: ContentType,
  patch: { contentTitle: string; markdown: string },
): Promise<UpdateResult> {
  // Refuse before authenticating or writing — this is a caller error, and
  // there is no correct way to apply a markdown patch to a structured body.
  if (STRUCTURED_TYPES.includes(contentType)) {
    return { ok: false, reason: "wrong-body-type" };
  }

  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, reason: "not-authenticated" };
  }

  const markdown = patch.markdown.trim();
  // Empty title → null, so the History list falls back to the video title.
  const title = patch.contentTitle.trim() || null;

  try {
    const { data, error } = await supabase
      .from("generated_content")
      .update({
        content_title: title,
        content_body: { markdown },
        word_count: countWords(markdown),
        // updated_at is set by the touch_updated_at trigger — don't set it here.
      })
      .eq("id", id)
      .select("id, word_count, updated_at")
      .single();

    if (error) {
      // PGRST116 = .single() got zero rows → id missing or RLS-filtered.
      if (error.code === "PGRST116") return { ok: false, reason: "not-found" };
      return { ok: false, reason: "update-failed" };
    }
    if (!data) return { ok: false, reason: "not-found" };

    const row = data as unknown as {
      id: string;
      word_count: number | null;
      updated_at: string;
    };

    return {
      ok: true,
      data: {
        id: row.id,
        wordCount: row.word_count ?? 0,
        updatedAt: row.updated_at,
      },
    };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/**
 * Delete one saved item for the signed-in user.
 *
 * Same affected-row guard: .select("id").single() turns a zero-row delete
 * (already gone, or not yours) into "not-found" rather than a false success.
 *
 * @param id The row id to delete.
 */
export async function deleteContent(id: string): Promise<DeleteResult> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, reason: "not-authenticated" };
  }

  try {
    const { data, error } = await supabase
      .from("generated_content")
      .delete()
      .eq("id", id)
      .select("id")
      .single();

    if (error) {
      if (error.code === "PGRST116") return { ok: false, reason: "not-found" };
      return { ok: false, reason: "delete-failed" };
    }
    if (!data) return { ok: false, reason: "not-found" };

    return { ok: true };
  } catch {
    return { ok: false, reason: "network" };
  }
}