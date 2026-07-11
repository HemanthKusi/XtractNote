// src/app/(app)/folders/[id]/page.tsx  →  route: /folders/:id
// One folder's contents. Reads the id from the URL, loads the folder + its
// items in parallel, and lists them with HistoryCard.

"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/layout";
import { HistoryCard } from "@/components/history/history-card";
import { MoveToFolderModal } from "@/components/history/move-to-folder-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { fetchFolderContents, type HistoryItem } from "@/lib/api/history";
import { fetchFolder, type Folder } from "@/lib/api/folders";

type State =
  | { phase: "loading" }
  | { phase: "not-found" }
  | { phase: "error"; message: string }
  | { phase: "loaded"; folder: Folder; items: HistoryItem[] };

export default function FolderDetailPage({
  params,
}: {
  // In the App Router, params is a Promise; unwrap with use() in a client page.
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [state, setState] = useState<State>({ phase: "loading" });
  const [movingItem, setMovingItem] = useState<HistoryItem | null>(null);

  const load = useCallback(async () => {
    setState({ phase: "loading" });

    const [folderResult, contentsResult] = await Promise.all([
      fetchFolder(id),
      fetchFolderContents(id),
    ]);

    // Folder missing / not yours → dedicated not-found state.
    if (!folderResult.ok) {
      if (folderResult.reason === "folder-not-found") {
        setState({ phase: "not-found" });
      } else if (folderResult.reason === "not-authenticated") {
        setState({ phase: "error", message: "Please sign in again to view this folder." });
      } else {
        setState({ phase: "error", message: "We couldn't load this folder. Please try again." });
      }
      return;
    }

    if (!contentsResult.ok) {
      setState({ phase: "error", message: "We couldn't load this folder's content. Please try again." });
      return;
    }

    setState({ phase: "loaded", folder: folderResult.data, items: contentsResult.data });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Open a saved item in the editor at /output/[id].
  const handleOpen = (itemId: string) => {
    router.push(`/output/${itemId}`);
  };

  // Moving an item to a different folder (or None) removes it from this view.
  const handleMoved = (itemId: string, folderId: string | null) => {
    setState((prev) => {
      if (prev.phase !== "loaded") return prev;
      // If it left this folder, drop it; otherwise keep it.
      const stillHere = folderId === prev.folder.id;
      return {
        ...prev,
        items: stillHere ? prev.items : prev.items.filter((it) => it.id !== itemId),
      };
    });
  };

  return (
    <AppShell activePage="folders">
      <div className="mx-auto max-w-content">
        {/* Back link */}
        <Link
          href={ROUTES.FOLDERS}
          className="mb-4 inline-flex items-center gap-1 text-sm text-xn-ink-soft hover:text-xn-ink transition-colors"
        >
          <BackIcon />
          All folders
        </Link>

        {/* ── Loading ── */}
        {state.phase === "loading" && (
          <>
            <div className="mb-6 flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-xn-md" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-4 rounded-xn-lg border border-xn-border p-4">
                  <Skeleton className="h-[68px] w-[120px] shrink-0 rounded-xn-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Not found ── */}
        {state.phase === "not-found" && (
          <EmptyState
            title="Folder not found"
            description="This folder doesn't exist, or it isn't yours."
            action={
              <Link href={ROUTES.FOLDERS}>
                <Button variant="primary">Back to folders</Button>
              </Link>
            }
          />
        )}

        {/* ── Error ── */}
        {state.phase === "error" && (
          <div className="rounded-xn-lg border border-xn-border p-8 text-center">
            <p className="text-sm text-xn-ink-muted">{state.message}</p>
            <div className="mt-4 flex justify-center">
              <Button variant="default" onClick={load}>Try again</Button>
            </div>
          </div>
        )}

        {/* ── Loaded ── */}
        {state.phase === "loaded" && (
          <>
            {/* Header */}
            <header className="mb-6 flex items-center gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xn-md text-2xl"
                style={{ backgroundColor: `${state.folder.color}1A` }}
              >
                {state.folder.emoji}
              </span>
              <div className="min-w-0">
                <h1 className="truncate font-serif text-h2 text-xn-ink">{state.folder.name}</h1>
                <p className="text-sm text-xn-ink-muted">
                  {state.items.length} {state.items.length === 1 ? "item" : "items"}
                </p>
              </div>
            </header>

            {/* Contents */}
            {state.items.length === 0 ? (
              <EmptyState
                title="This folder is empty"
                description="Move saved content into this folder from your history."
                action={
                  <Link href={ROUTES.HISTORY}>
                    <Button variant="primary">Go to history</Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {state.items.map((item) => (
                  <HistoryCard
                    key={item.id}
                    item={item}
                    onOpen={handleOpen}
                    onMove={setMovingItem}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Move picker — lets you move items out of / between folders here too */}
      <MoveToFolderModal
        item={movingItem}
        onClose={() => setMovingItem(null)}
        onMoved={handleMoved}
      />
    </AppShell>
  );
}

// ── Icons ──
function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}