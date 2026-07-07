// src/lib/api/folders.ts
// Folders data layer: list folders (with live item counts) and create folders.
// Browser + RLS, matching content.ts / history.ts.

import { createClient } from "@/lib/supabase/client";

// Clean shape the UI consumes (raw row + nested count flattened away).
export interface Folder {
  id: string;
  name: string;
  emoji: string;
  color: string;
  itemCount: number;
  createdAt: string;
}

export type FolderFailReason =
  | "not-authenticated"
  | "fetch-failed"
  | "create-failed"
  | "network";

export type FoldersResult =
  | { ok: true; data: Folder[] }
  | { ok: false; reason: FolderFailReason };

export type CreateFolderResult =
  | { ok: true; data: Folder }
  | { ok: false; reason: FolderFailReason };

// Columns + the embedded related count. "generated_content(count)" tells
// Supabase to count related content rows (via folder_id FK) per folder,
// in the same query, under RLS.
const SELECT = "id, name, emoji, color, created_at, generated_content(count)";

// The row shape as it comes back (loose; count is a nested array).
interface RawFolderRow {
  id: string;
  name: string;
  emoji: string | null;
  color: string | null;
  created_at: string;
  generated_content: { count: number }[] | null;
}

function mapFolder(row: RawFolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji || "📁",
    color: row.color || "#3B7AE8",
    // The embed returns e.g. [{ count: 5 }]; default to 0 for empty folders.
    itemCount: row.generated_content?.[0]?.count ?? 0,
    createdAt: row.created_at,
  };
}

/** List the signed-in user's folders, newest first, with live item counts. */
export async function fetchFolders(): Promise<FoldersResult> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, reason: "not-authenticated" };

  try {
    const { data, error } = await supabase
      .from("folders")
      .select(SELECT)
      .order("created_at", { ascending: false });

    if (error || !data) return { ok: false, reason: "fetch-failed" };

    return { ok: true, data: (data as unknown as RawFolderRow[]).map(mapFolder) };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** Create a folder for the signed-in user. */
export async function createFolder(input: {
  name: string;
  emoji: string;
  color: string;
}): Promise<CreateFolderResult> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, reason: "not-authenticated" };

  const name = input.name.trim();
  if (!name) return { ok: false, reason: "create-failed" };

  try {
    const { data, error } = await supabase
      .from("folders")
      .insert({
        user_id: user.id,
        name,
        emoji: input.emoji,
        color: input.color,
      })
      .select(SELECT)
      .single();

    if (error || !data) return { ok: false, reason: "create-failed" };

    return { ok: true, data: mapFolder(data as unknown as RawFolderRow) };
  } catch {
    return { ok: false, reason: "network" };
  }
}