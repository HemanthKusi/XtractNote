// src/app/(app)/folders/page.tsx  →  route: /folders
// Lists the user's folders in a grid. Client-side fetch (browser + RLS),
// with loading / error / empty / grid states. "New folder" opens the create
// modal (wired in File 22).

"use client";

import { useCallback, useEffect, useState } from "react";

import { CreateFolderModal } from "@/components/folders/create-folder-modal";
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
    <>
      {/* The same wider column the history list uses. The old 680px reading
          column left each folder about 95px wide at six tiles across. */}
      <div className="mx-auto max-w-wide">
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

        {/* ── Loading ──
            Shaped like the tile it becomes — a 5:4 block for the folder
            and two lines under it — so nothing jumps when the real folders
            arrive. Same grid as the loaded state below, for the same
            reason. */}
        {state.phase === "loading" && (
          <div className="grid justify-items-center gap-4 grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-full max-w-[128px] p-1.5">
                <Skeleton className="aspect-[5/4] w-full rounded-xn-lg" />
                <Skeleton className="mx-auto mt-2.5 h-4 w-2/3" />
                <Skeleton className="mx-auto mt-1 h-3 w-1/3" />
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

        {/* ── Grid ──
            Denser than it was from sm upward. The tile is a drawn folder now
            rather than a horizontal row, and at three columns each one
            rendered around 320px wide — a great deal of amber for an index
            page. This is a shelf of folders instead.

            The base stays at one column, which looks over-cautious and is
            not: the app shell holds a 232px sidebar at every width with no
            mobile behaviour, and the content area adds 32px of padding each
            side. At a 375px viewport that leaves 79px for this grid, so
            three columns would render 21px tiles. One column keeps the
            narrow case legible until the shell learns to collapse.

            The tile has no size of its own — it draws at aspect-[5/4] w-full,
            so the column decides everything. Six columns in the old 680px
            container gave it about 95px. Widening the container alone
            overshot, so the cell is capped and centred instead: that lands
            the drawn folder near 116px, larger than it was without becoming
            the loudest thing on the page. The cap lives here rather than in
            folder-card.tsx, which stays exactly as it was reviewed. */}
        {state.phase === "loaded" && state.folders.length > 0 && (
          <div className="grid justify-items-center gap-4 grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {state.folders.map((folder) => (
              <div key={folder.id} className="w-full max-w-[128px]">
                <FolderCard folder={folder} onOpen={handleOpen} />
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateFolderModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}