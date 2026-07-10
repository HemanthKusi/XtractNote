// src/lib/api/history.ts
// Browser-side read of the signed-in user's saved content, newest first.
// Maps raw generated_content rows into a tidy HistoryItem shape for the UI.
// Also provides a single-item detail read (fetchContentById) for the editor.

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
  createdAt: string;      // ISO timestamp
  markdown: string;       // pulled out of content_body → free "open" later
  folderId: string | null; // which folder it's in (null = none)
}

// What the single-item editor needs. Richer than HistoryItem, and crucially
// keeps contentTitle RAW (never collapsed to a fallback) so editing + saving
// the title never accidentally writes the video title into content_title.
export interface ContentDetail {
  id: string;
  contentType: ContentType;
  contentTitle: string;    // raw content_title ("" if null) — this is editable
  videoTitle: string;      // shown as source context, not editable
  channel: string;
  thumbnail: string;
  videoUrl: string;        // "watch source" link
  markdown: string;        // editable body
  wordCount: number;
  folderId: string | null;
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp — powers "last edited"
}

export type HistoryFailReason = "not-authenticated" | "fetch-failed" | "network";

export type HistoryResult =
  | { ok: true; data: HistoryItem[] }
  | { ok: false; reason: HistoryFailReason };

// Single-item read adds "not-found" — a legitimate outcome (bad id, or RLS
// silently filtered a row that isn't yours), distinct from a real failure.
export type ContentDetailFailReason =
  | "not-authenticated"
  | "not-found"
  | "fetch-failed"
  | "network";

export type ContentDetailResult =
  | { ok: true; data: ContentDetail }
  | { ok: false; reason: ContentDetailFailReason };

// The columns the list needs (lighter than select("*")).
const COLUMNS =
  "id, content_type, content_title, video_title, video_channel, video_thumbnail, word_count, created_at, content_body, folder_id";

// The detail read needs a few more: video_url + updated_at for the editor.
const DETAIL_COLUMNS =
  "id, content_type, content_title, video_title, video_channel, video_thumbnail, video_url, word_count, folder_id, created_at, updated_at, content_body";

// Valid ContentType keys, taken from the single source of truth.
const VALID_TYPES = Object.keys(contentTypeColors) as ContentType[];

// A DB row is typed loosely (content_type is just string, content_body jsonb),
// so narrow it safely rather than trusting the shape.
function toContentType(value: unknown): ContentType {
  return typeof value === "string" && VALID_TYPES.includes(value as ContentType)
    ? (value as ContentType)
    : "summary"; // safe fallback — never crash the icon/label lookup
}

// Minimal shape of the row the list selected (loose, as it comes from the DB).
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
  folder_id: string | null;
}

// Detail row = list row + the two extra columns the editor needs.
interface RawDetailRow extends RawRow {
  video_url: string | null;
  updated_at: string;
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
    folderId: row.folder_id,
  };
}

function mapDetail(row: RawDetailRow): ContentDetail {
  return {
    id: row.id,
    contentType: toContentType(row.content_type),
    // RAW title — no "Untitled"/video fallback here. The editor decides how to
    // *display* an empty title; the data stays honest so saving is correct.
    contentTitle: row.content_title ?? "",
    videoTitle: row.video_title ?? "",
    channel: row.video_channel ?? "",
    thumbnail: row.video_thumbnail ?? "",
    videoUrl: row.video_url ?? "",
    markdown: row.content_body?.markdown ?? "",
    wordCount: row.word_count ?? 0,
    folderId: row.folder_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Fetch the signed-in user's saved content, newest first. */
export async function fetchHistory(): Promise<HistoryResult> {
  return runHistoryQuery(); // no folder filter → all content
}

/** Fetch the saved content inside one folder, newest first. */
export async function fetchFolderContents(folderId: string): Promise<HistoryResult> {
  return runHistoryQuery(folderId);
}

/**
 * Fetch ONE saved item by id for the editor. Uses maybeSingle() so a missing
 * row (bad id, or RLS silently filtered it because it isn't yours) comes back
 * as data:null — mapped to "not-found" — instead of throwing like single().
 */
export async function fetchContentById(id: string): Promise<ContentDetailResult> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, reason: "not-authenticated" };

  try {
    const { data, error } = await supabase
      .from("generated_content")
      .select(DETAIL_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) return { ok: false, reason: "fetch-failed" };
    if (!data) return { ok: false, reason: "not-found" };

    return { ok: true, data: mapDetail(data as unknown as RawDetailRow) };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/**
 * Shared reader for history-shaped queries. With no folderId, returns all of
 * the user's content; with one, filters to that folder. Same columns, same
 * HistoryItem mapping, so callers (history page + folder detail) reuse
 * HistoryCard unchanged. RLS scopes results to the user either way.
 */
async function runHistoryQuery(folderId?: string): Promise<HistoryResult> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, reason: "not-authenticated" };

  try {
    let query = supabase
      .from("generated_content")
      .select(COLUMNS)
      .order("created_at", { ascending: false });

    if (folderId) query = query.eq("folder_id", folderId);

    const { data, error } = await query;
    if (error || !data) return { ok: false, reason: "fetch-failed" };

    return { ok: true, data: (data as unknown as RawRow[]).map(mapRow) };
  } catch {
    return { ok: false, reason: "network" };
  }
}