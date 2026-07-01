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
  | { phase: "loaded"; items: HistoryItem[] };

export default function HistoryPage() {
  const [state, setState] = useState<State>({ phase: "loading" });
  const toast = useToast();

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    const result = await fetchHistory();
    if (!result.ok) {
      setState({ phase: "error", message: ERROR_MESSAGES[result.reason] });
      return;
    }
    setState({ phase: "loaded", items: result.data });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Placeholder until the /output/[id] detail page exists (Phase 9).
  const handleOpen = () => {
    toast.info("Opening saved items comes in the next phase.");
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
          <div className="space-y-3">
            {state.items.map((item) => (
              <HistoryCard key={item.id} item={item} onOpen={handleOpen} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}