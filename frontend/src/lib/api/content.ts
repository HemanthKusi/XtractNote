// src/lib/api/content.ts
// Browser-side persistence for generated content. Inserts/updates/deletes rows
// in public.generated_content under RLS (the user owns the row).

import { createClient } from "@/lib/supabase/client";
import type { VideoMeta } from "@/lib/youtube/types";
import type { GeneratedContent } from "@/lib/content/types";

// Discriminated-union result, same pattern as the other lib/api helpers.
export type SaveFailReason = "not-authenticated" | "insert-failed" | "network";

export type SaveResult =
  | { ok: true; data: { id: string } }
  | { ok: false; reason: SaveFailReason };

// Update adds "not-found" — the id is missing or RLS filtered it (not yours).
export type UpdateFailReason =
  | "not-authenticated"
  | "not-found"
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

// Rough word count from the markdown body (used by History cards).
function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/**
 * Save one generated result for the signed-in user.
 *
 * @param meta    The video the content came from.
 * @param content The generated content (contentType + markdown string).
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

  const markdown = content.content.trim();

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
        content_title: meta.title, // default the title to the video's
        content_body: { markdown }, // object form → room for annotations later
        status: "saved",
        word_count: countWords(markdown),
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
 * Update one saved item's title + body for the signed-in user.
 *
 * RLS scopes the write to the owner; .select("id, ...").single() forces a
 * one-row result so a missing/RLS-filtered row surfaces as "not-found"
 * (PGRST116) instead of a silent zero-row "success". word_count is recomputed
 * from the new body; updated_at is left to the touch_updated_at trigger and
 * read back so the editor can show "last edited" without a refetch.
 *
 * @param id    The row id to update.
 * @param patch The edited fields (raw title + markdown body).
 */
export async function updateContent(
  id: string,
  patch: { contentTitle: string; markdown: string },
): Promise<UpdateResult> {
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