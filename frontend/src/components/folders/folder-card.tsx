// src/components/folders/folder-card.tsx
// Presentational tile for a single folder. No data/state — the folders page
// supplies the Folder and decides what onOpen does.

"use client";

import { Card } from "@/components/ui/card";
import type { Folder } from "@/lib/api/folders";

// "No items yet" / "1 item" / "5 items"
function itemCountLabel(n: number): string {
  if (n === 0) return "No items yet";
  return `${n} item${n === 1 ? "" : "s"}`;
}

interface FolderCardProps {
  folder: Folder;
  /** Called with the folder id when clicked. */
  onOpen?: (id: string) => void;
}

export function FolderCard({ folder, onOpen }: FolderCardProps) {
  return (
    <Card
      variant="default"
      padding="none"
      interactive
      onClick={() => onOpen?.(folder.id)}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Emoji chip, tinted with the folder's own color */}
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xn-md text-xl"
          style={{ backgroundColor: `${folder.color}1A` }} // ~10% alpha tint
        >
          {folder.emoji}
        </span>

        {/* Name + count */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-xn-ink">
            {folder.name}
          </h3>
          <p className="mt-0.5 text-xs text-xn-ink-soft">
            {itemCountLabel(folder.itemCount)}
          </p>
        </div>

        {/* Small color dot as a subtle identity marker */}
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: folder.color }}
          aria-hidden
        />
      </div>
    </Card>
  );
}