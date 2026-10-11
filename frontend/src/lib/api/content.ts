// src/lib/api/content.ts
// Browser-side changes to generated content: saving a draft, editing, and
// deleting rows in public.generated_content under RLS (the user owns the row).
//
// The rows themselves are written by the backend when a generation finishes,
// as drafts. Saving one changes its status; it does not create anything.
//
// content_body stores the full ContentBody union:
//   - prose types      -> { markdown }
//   - flashcards       -> { kind: "flashcards", cards: [...] }
//   - quiz             -> { kind: "quiz", questions: [...] }

import { createClient } from "@/lib/supabase/client";
import type { ContentType } from "@/lib/content/types";

// Discriminated-union result, same pattern as the other lib/api helpers.
// "not-a-draft" — the row is already saved, or is gone — is the answer to a
// second click or a second tab, and must not be reported as a success.
export type SaveFailReason = "not-authenticated" | "not-a-draft" | "save-failed" | "network";

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

// Rough word count from a text blob (used by History cards).
function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/**
 * Save one of the signed-in user's drafts to their library.
 *
 * **Only a draft matches** — the status is in the update's own filter — so a
 * second click, or a second tab, finds nothing to change and gets
 * "not-a-draft" rather than a second success. RLS limits it to the user's own
 * rows, and `.single()` turns a zero-row result into that answer instead of a
 * silent one.
 *
 * @param id The draft's row id — the job's `resultId`.
 */
export async function saveDraft(id: string): Promise<SaveResult> {
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
      .update({ status: "saved" })
      .eq("id", id)
      .eq("status", "draft")
      .select("id")
      .single();

    if (error) {
      // PGRST116 = .single() got zero rows: not a draft any more, or not there.
      if (error.code === "PGRST116") return { ok: false, reason: "not-a-draft" };
      return { ok: false, reason: "save-failed" };
    }
    if (!data) return { ok: false, reason: "not-a-draft" };

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