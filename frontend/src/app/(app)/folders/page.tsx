// src/app/(app)/folders/page.tsx  →  route: /folders
// Lists the user's folders in a grid. Client-side fetch (browser + RLS),
// with loading / error / empty / grid states. "New folder" opens the create
// modal (wired in File 22).

"use client";

import { useCallback, useEffect, useState } from "react";

import { CreateFolderModal } from "@/components/folders/create-folder-modal";
import { AppShell } from "@/components/layout";
import { FolderCard } from "@/components/folders/folder-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/shared/toast-provider";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import {
  fetchFolders,
  type Folder,
  type FolderFailReason,
} from "@/lib/api/folders";

const ERROR_MESSAGES: Record<FolderFailReason, string> = {
  "not-authenticated": "Please sign in again to view your folders.",
  "fetch-failed": "We couldn't load your folders. Please try again.",
  "create-failed": "We couldn't create that folder. Please try again.",
  network: "We couldn't reach the server. Check your connection and try again.",
};

type State =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "loaded"; folders: Folder[] };

export default function FoldersPage() {
  const [state, setState] = useState<State>({ phase: "loading" });
  const [createOpen, setCreateOpen] = useState(false);
  const _toast = useToast();

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    const result = await fetchFolders();
    if (!result.ok) {
      setState({ phase: "error", message: ERROR_MESSAGES[result.reason] });
      return;
    }
    setState({ phase: "loaded", folders: result.data });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Prepend a freshly created folder without refetching (File 22 calls this).
  const handleCreated = useCallback((folder: Folder) => {
    setState((prev) =>
      prev.phase === "loaded"
        ? { phase: "loaded", folders: [folder, ...prev.folders] }
        : prev,
    );
  }, []);

  const router = useRouter();

  const handleOpen = (id: string) => {
    router.push(ROUTES.folder(id));
  };

  return (
    <AppShell activePage="folders">
      <div className="mx-auto max-w-content">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-h2 text-xn-ink">Folders</h1>
            <p className="mt-1 text-body text-xn-ink-muted">
              Organize your saved content.
            </p>
          </div>

          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            New folder
          </Button>
        </header>

        {/* ── Loading ── */}
        {state.phase === "loading" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xn-lg border border-xn-border p-4"
              >
                <Skeleton className="h-10 w-10 shrink-0 rounded-xn-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
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
        {state.phase === "loaded" && state.folders.length === 0 && (
          <EmptyState
            title="No folders yet"
            description="Create a folder to group related saved content together."
            action={
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                Create your first folder
              </Button>
            }
          />
        )}

        {/* ── Grid ── */}
        {state.phase === "loaded" && state.folders.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.folders.map((folder) => (
              <FolderCard key={folder.id} folder={folder} onOpen={handleOpen} />
            ))}
          </div>
        )}
      </div>

      <CreateFolderModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </AppShell>
  );
}