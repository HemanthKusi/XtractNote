"use client";

// ─────────────────────────────────────────────────────────────
// lib/hooks/use-save-draft.ts
//
// Saving a draft from a list of rows — History, a folder. The row calls
// `save(id)`; the page hears `onSaved` when the row is now saved, and
// `onStale` when the list is out of date.
//
// "not-a-draft" is not a failure to retry: the row was saved in another tab,
// or no longer exists. The page is told to reload rather than left showing a
// Save button that can only fail again.
//
// One save per row at a time; a second click on a row already saving does
// nothing. Results that arrive after the page has gone are dropped.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { saveDraft, type SaveFailReason, type SaveResult } from "@/lib/api/content";

const SAVE_ERRORS: Record<SaveFailReason, string> = {
  "not-authenticated": "Please sign in again — your session may have expired.",
  "not-a-draft": "This is already saved, or no longer exists.",
  "save-failed": "We couldn't save this just now. Please try again.",
  network: "We couldn't reach the server. Check your connection and try again.",
};

interface SaveDraftHandlers {
  /** The row with this id is now saved. */
  onSaved: (id: string) => void;
  /** The list no longer matches the database and should be fetched again. */
  onStale: () => void;
}

export function useSaveDraft({ onSaved, onStale }: SaveDraftHandlers) {
  const toast = useToast();
  // The ids being saved. State for rendering, a ref for the guard: a click
  // handler reading state would see the value from its own render.
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set());
  const inFlight = useRef(new Set<string>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const save = useCallback(
    async (id: string) => {
      if (inFlight.current.has(id)) return;
      inFlight.current.add(id);
      setSaving(new Set(inFlight.current));

      // Released in `finally`, so a row is never left saving for good.
      let result: SaveResult;
      try {
        result = await saveDraft(id);
      } finally {
        inFlight.current.delete(id);
        if (mounted.current) setSaving(new Set(inFlight.current));
      }
      if (!mounted.current) return;

      if (result.ok) {
        onSaved(id);
        toast.success("Saved to your library");
        return;
      }
      toast.error(SAVE_ERRORS[result.reason]);
      if (result.reason === "not-a-draft") onStale();
    },
    [onSaved, onStale, toast],
  );

  return { save, isSaving: (id: string) => saving.has(id) };
}
