// src/lib/api/history.ts
// Browser-side read of the signed-in user's saved content, newest first.
// Maps raw generated_content rows into a tidy HistoryItem shape for the UI.

import { createClient } from "@/lib/supabase/client";
import { contentTypeColors, type ContentType } from "@/lib/constants/theme";

// What the History list actually needs from each saved row.
export interface HistoryItem {
  id: string;
  contentType: ContentType;
  title: string;
  channel: string;
  thumbnail: string;
  wordCount: number;
  createdAt: string; // ISO timestamp
  markdown: string;  // pulled out of content_body → free "open" later
}

export type HistoryFailReason = "not-authenticated" | "fetch-failed" | "network";

export type HistoryResult =
  | { ok: true; data: HistoryItem[] }
  | { ok: false; reason: HistoryFailReason };

// The columns the list needs (lighter than select("*")).
const COLUMNS =
  "id, content_type, content_title, video_title, video_channel, video_thumbnail, word_count, created_at, content_body";

// Valid ContentType keys, taken from the single source of truth.
const VALID_TYPES = Object.keys(contentTypeColors) as ContentType[];

// A DB row is typed loosely (content_type is just string, content_body jsonb),
// so narrow it safely rather than trusting the shape.
function toContentType(value: unknown): ContentType {
  return typeof value === "string" && VALID_TYPES.includes(value as ContentType)
    ? (value as ContentType)
    : "summary"; // safe fallback — never crash the icon/label lookup
}

// Minimal shape of the row we selected (loose, as it comes from the DB).
interface RawRow {
  id: string;
  content_type: string;
  content_title: string | null;
  video_title: string | null;
  video_channel: string | null;
  video_thumbnail: string | null;
  word_count: number | null;
  created_at: string;
  content_body: { markdown?: string } | null;
}

function mapRow(row: RawRow): HistoryItem {
  return {
    id: row.id,
    contentType: toContentType(row.content_type),
    // Prefer the saved content title; fall back to the video title.
    title: row.content_title || row.video_title || "Untitled",
    channel: row.video_channel || "",
    thumbnail: row.video_thumbnail || "",
    wordCount: row.word_count ?? 0,
    createdAt: row.created_at,
    markdown: row.content_body?.markdown ?? "",
  };
}

/** Fetch the signed-in user's saved content, newest first. */
export async function fetchHistory(): Promise<HistoryResult> {
  const supabase = createClient();

  // Confirm there's a user (RLS also enforces this at the DB).
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
      .select(COLUMNS)
      .order("created_at", { ascending: false });

    if (error || !data) {
      return { ok: false, reason: "fetch-failed" };
    }

    return { ok: true, data: (data as unknown as RawRow[]).map(mapRow) };
  } catch {
    return { ok: false, reason: "network" };
  }
}