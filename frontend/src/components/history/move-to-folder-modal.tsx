// src/components/history/move-to-folder-modal.tsx
// Folder picker for moving a saved item into a folder (or out of one).
// Shown when `item` is non-null; calls moveToFolder and reports via onMoved.

"use client";

import { useEffect, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/shared/toast-provider";
import { fetchFolders, moveToFolder, type Folder } from "@/lib/api/folders";
import type { HistoryItem } from "@/lib/api/history";

// Sentinel for the "no folder" choice (distinct from a real folder id).
const NONE = "__none__";

interface MoveToFolderModalProps {
  /** The item being moved, or null when the modal is closed. */
  item: HistoryItem | null;
  onClose: () => void;
  /** Called after a successful move so the page can update local state. */
  onMoved: (itemId: string, folderId: string | null) => void;
}

type FoldersState =
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "loaded"; folders: Folder[] };

export function MoveToFolderModal({ item, onClose, onMoved }: MoveToFolderModalProps) {
  const toast = useToast();

  const [foldersState, setFoldersState] = useState<FoldersState>({ phase: "loading" });
  const [selected, setSelected] = useState<string>(NONE);
  const [saving, setSaving] = useState(false);

  const open = item !== null;

  // On open: load folders and preselect the item's current folder.
  useEffect(() => {
    if (!item) return;

    setSelected(item.folderId ?? NONE);
    setSaving(false);
    setFoldersState({ phase: "loading" });

    let cancelled = false;
    fetchFolders().then((result) => {
      if (cancelled) return;
      setFoldersState(
        result.ok ? { phase: "loaded", folders: result.data } : { phase: "error" },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [item]);

  async function handleConfirm() {
    if (!item) return;

    const targetFolderId = selected === NONE ? null : selected;

    // No-op guard: selection unchanged from current folder.
    if (targetFolderId === (item.folderId ?? null)) {
      onClose();
      return;
    }

    setSaving(true);
    const result = await moveToFolder(item.id, targetFolderId);

    if (!result.ok) {
      setSaving(false);
      toast.error("We couldn't move that item. Please try again.");
      return;
    }

    toast.success(targetFolderId ? "Moved to folder" : "Removed from folder");
    onMoved(item.id, targetFolderId);
    onClose();
  }

  // Is the current selection different from where the item already is?
  const currentFolderId = item?.folderId ?? null;
  const selectedFolderId = selected === NONE ? null : selected;
  const unchanged = selectedFolderId === currentFolderId;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Move to folder"
      description={item ? `Choose a folder for "${item.title}".` : undefined}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={saving || foldersState.phase !== "loaded" || unchanged}
          >
            {saving ? "Moving…" : "Move"}
          </Button>
        </>
      }
    >
      {/* ── Folder list states ── */}
      {foldersState.phase === "loading" && (
        <p className="py-4 text-center text-sm text-xn-ink-soft">Loading folders…</p>
      )}

      {foldersState.phase === "error" && (
        <p className="py-4 text-center text-sm text-xn-ink-muted">
          Couldn&apos;t load your folders. Close and try again.
        </p>
      )}

      {foldersState.phase === "loaded" && (
        <div className="space-y-1.5">
          {/* None option */}
          <FolderOption
            label="None (no folder)"
            emoji="🚫"
            color="#8e8478"
            selected={selected === NONE}
            onSelect={() => setSelected(NONE)}
          />

          {foldersState.folders.length === 0 ? (
            <p className="px-1 pt-2 text-xs text-xn-ink-soft">
              You don&apos;t have any folders yet. Create one on the Folders page.
            </p>
          ) : (
            foldersState.folders.map((f) => (
              <FolderOption
                key={f.id}
                label={f.name}
                emoji={f.emoji}
                color={f.color}
                selected={selected === f.id}
                onSelect={() => setSelected(f.id)}
              />
            ))
          )}
        </div>
      )}
    </Modal>
  );
}

// ── One selectable folder row ───────────────────────────────
function FolderOption({
  label,
  emoji,
  color,
  selected,
  onSelect,
}: {
  label: string;
  emoji: string;
  color: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "flex w-full items-center gap-3 rounded-xn-md border px-3 py-2 text-left transition-colors",
        selected
          ? "border-xn-ink bg-xn-surface-alt"
          : "border-xn-border hover:bg-xn-surface-alt",
      ].join(" ")}
      aria-pressed={selected}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xn-md text-base"
        style={{ backgroundColor: `${color}1A` }}
      >
        {emoji}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-xn-ink">
        {label}
      </span>
      {/* Selected check */}
      {selected && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-xn-ink">
          <path d="M3 8.5L6.5 12L13 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}