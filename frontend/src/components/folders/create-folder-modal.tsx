// src/components/folders/create-folder-modal.tsx
// Modal form to create a folder (name + emoji + color). Calls createFolder()
// and hands the new folder back to the page via onCreated.

"use client";

import { useEffect, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/shared/toast-provider";
import { folderColors } from "@/lib/constants/theme";
import { createFolder, type Folder } from "@/lib/api/folders";

// A small preset set — enough variety without an emoji keyboard.
const EMOJI_CHOICES = ["📁", "📚", "🎯", "💡", "🎬", "📝", "🔬", "🚀", "⭐", "🧠"];

interface CreateFolderModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with the newly created folder so the page can add it. */
  onCreated: (folder: Folder) => void;
}

export function CreateFolderModal({ open, onClose, onCreated }: CreateFolderModalProps) {
  const toast = useToast();

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0]);
  const [color, setColor] = useState<string>(folderColors[0]);
  const [saving, setSaving] = useState(false);

  // Reset the form each time the modal opens, so it's fresh.
  useEffect(() => {
    if (open) {
      setName("");
      setEmoji(EMOJI_CHOICES[0]);
      setColor(folderColors[0]);
      setSaving(false);
    }
  }, [open]);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Please give your folder a name.");
      return;
    }

    setSaving(true);
    const result = await createFolder({ name: trimmed, emoji, color });

    if (!result.ok) {
      setSaving(false);
      toast.error("We couldn't create that folder. Please try again.");
      return;
    }

    toast.success("Folder created");
    onCreated(result.data);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New folder"
      description="Group related saved content together."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={saving}>
            {saving ? "Creating…" : "Create folder"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="folder-name" className="block text-sm font-medium text-xn-ink">
            Name
          </label>
          <Input
            id="folder-name"
            size="lg"
            placeholder="e.g. Machine Learning"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
        </div>

        {/* Emoji */}
        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-xn-ink">Icon</span>
          <div className="flex flex-wrap gap-2">
            {EMOJI_CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => setEmoji(choice)}
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-xn-md text-lg",
                  "border transition-colors",
                  emoji === choice
                    ? "border-xn-ink bg-xn-surface-alt"
                    : "border-xn-border hover:bg-xn-surface-alt",
                ].join(" ")}
                aria-label={`Icon ${choice}`}
                aria-pressed={emoji === choice}
              >
                {choice}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-xn-ink">Color</span>
          <div className="flex flex-wrap gap-2">
            {folderColors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={[
                  "h-8 w-8 rounded-full transition-transform",
                  color === c ? "ring-2 ring-offset-2 ring-xn-ink scale-105" : "hover:scale-105",
                ].join(" ")}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
                aria-pressed={color === c}
              />
            ))}
          </div>
        </div>

        {/* Live preview */}
        <div className="flex items-center gap-3 rounded-xn-md border border-xn-border bg-xn-surface-alt p-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xn-md text-xl"
            style={{ backgroundColor: `${color}1A` }}
          >
            {emoji}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-xn-ink">
              {name.trim() || "Folder name"}
            </p>
            <p className="text-xs text-xn-ink-soft">No items yet</p>
          </div>
          <span className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        </div>
      </div>
    </Modal>
  );
}