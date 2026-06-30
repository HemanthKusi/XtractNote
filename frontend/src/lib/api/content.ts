// src/lib/api/content.ts
// Browser-side persistence for generated content. Inserts into
// public.generated_content under RLS (the user owns the row).

import { createClient } from "@/lib/supabase/client";
import type { VideoMeta } from "@/lib/youtube/types";
import type { GeneratedContent } from "@/lib/content/types";

// Discriminated-union result, same pattern as the other lib/api helpers.
export type SaveFailReason = "not-authenticated" | "insert-failed" | "network";

export type SaveResult =
  | { ok: true; data: { id: string } }
  | { ok: false; reason: SaveFailReason };

// Seconds (number) → "M:SS" text for the video_duration text column.
// Returns null when duration is unknown (keyless oEmbed source omits it).
function formatDuration(seconds?: number): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Rough word count from the markdown body (used by History later).
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