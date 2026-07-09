// src/app/(app)/history/page.tsx  →  route: /history
// Lists the signed-in user's saved content. Client-side fetch (browser + RLS),
// with loading / error / empty / list states.

"use client";

import { useEffect, useState, useCallback } from "react";

import { AppShell } from "@/components/layout";
import { HistoryCard } from "@/components/history/history-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { Button } from "@/components/ui/button";
import { fetchHistory, type HistoryItem, type HistoryFailReason } from "@/lib/api/history";
import { fetchFolders, type Folder } from "@/lib/api/folders";
import { MoveToFolderModal } from "@/components/history/move-to-folder-modal";
import { useToast } from "@/components/shared/toast-provider";
import { ROUTES } from "@/lib/constants/routes";

// Friendly copy for each fetch failure.
const ERROR_MESSAGES: Record<HistoryFailReason, string> = {
  "not-authenticated": "Please sign in again to view your library.",
  "fetch-failed": "We couldn't load your saved content. Please try again.",
  network: "We couldn't reach the server. Check your connection and try again.",
};

type State =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "loaded"; items: HistoryItem[]; folders: Folder[] };

  export default function HistoryPage() {
    const [state, setState] = useState<State>({ phase: "loading" });
    const [movingItem, setMovingItem] = useState<HistoryItem | null>(null);
    const toast = useToast();
  
    const load = useCallback(async () => {
      setState({ phase: "loading" });
      // Fetch history + folders together. History is required; folders enhance
      // (resolve labels) — if only folders fail, we still show history.
      const [historyResult, foldersResult] = await Promise.all([
        fetchHistory(),
        fetchFolders(),
      ]);
  
      if (!historyResult.ok) {
        setState({ phase: "error", message: ERROR_MESSAGES[historyResult.reason] });
        return;
      }
  
      setState({
        phase: "loaded",
        items: historyResult.data,
        folders: foldersResult.ok ? foldersResult.data : [],
      });
    }, []);
  
    useEffect(() => {
      load();
    }, [load]);
  
    // Placeholder until the /output/[id] detail page exists (Phase 9).
    const handleOpen = () => {
      toast.info("Opening saved items comes in the next phase.");
    };
  
    // After a successful move, patch that item's folderId in local state so its
    // chip updates immediately — no refetch.
    const handleMoved = (itemId: string, folderId: string | null) => {
      setState((prev) =>
        prev.phase === "loaded"
          ? {
              ...prev,
              items: prev.items.map((it) =>
                it.id === itemId ? { ...it, folderId } : it,
              ),
            }
          : prev,
      );
    };

  return (
    <AppShell activePage="history">
      <div className="mx-auto max-w-content">
        <header className="mb-6">
          <h1 className="font-serif text-h2 text-xn-ink">History</h1>
          <p className="mt-1 text-body text-xn-ink-muted">
            Everything you&apos;ve saved, newest first.
          </p>
        </header>

        {/* ── Loading ── */}
        {state.phase === "loading" && (
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

        {/* ── Empty ── */}
        {state.phase === "loaded" && state.items.length === 0 && (
          <EmptyState
            title="Nothing saved yet"
            description="Generate content from a YouTube video and save it — it'll show up here."
            action={
              <a href={ROUTES.CREATE}>
                <Button variant="primary">Create your first</Button>
              </a>
            }
          />
        )}

        {/* ── List ── */}
        {state.phase === "loaded" && state.items.length > 0 && (
          <HistoryList
            items={state.items}
            folders={state.folders}
            onOpen={handleOpen}
            onMove={setMovingItem}
          />
        )}
      </div>

      {/* Move-to-folder picker (open when movingItem is set) */}
      <MoveToFolderModal
        item={movingItem}
        onClose={() => setMovingItem(null)}
        onMoved={handleMoved}
      />
    </AppShell>
  );
}

// ── List with folder-label resolution ──────────────────────
// Builds an O(1) folderId → label map once, then renders each card with its
// resolved folder (or null).
function HistoryList({
  items,
  folders,
  onOpen,
  onMove,
}: {
  items: HistoryItem[];
  folders: Folder[];
  onOpen: (id: string) => void;
  onMove: (item: HistoryItem) => void;
}) {
  const folderById = new Map(folders.map((f) => [f.id, f]));

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const folder = item.folderId ? folderById.get(item.folderId) : null;
        const folderLabel = folder
          ? { name: folder.name, emoji: folder.emoji, color: folder.color }
          : null;

        return (
          <HistoryCard
            key={item.id}
            item={item}
            onOpen={onOpen}
            folderLabel={folderLabel}
            onMove={onMove}
          />
        );
      })}
    </div>
  );
}