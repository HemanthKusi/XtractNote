"use client";

// ─────────────────────────────────────────────────────────────
// components/credits/balance-provider.tsx
//
// The signed-in user's credit balance, read once for the whole app and
// shared: the side menu shows it and the create page decides its start
// button from it, so the two can never disagree.
//
// It is read when the app loads, again when the signed-in user changes, and
// again when the tab comes back into view. Anything that knows the balance
// has just moved — the create page, after a start is admitted and its price
// reserved — calls `refresh()`, or `observed()` when a reply stated the new
// balance outright. A balance already on screen stays while it is read again.
// ─────────────────────────────────────────────────────────────

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { fetchBalance } from "@/lib/api/credits";
import type { BalanceState } from "@/lib/credits/cost";
import { createClient } from "@/lib/supabase/client";

interface BalanceContextValue {
  balance: BalanceState;
  /** Read the balance again. A read already in flight is superseded. */
  refresh: () => void;
  /**
   * A server reply has just stated the balance — a start refused for
   * credits, say. It is shown at once, a read in flight is superseded, and
   * the balance is read again to confirm it.
   */
  observed: (balance: number, nextRefillAt: string) => void;
}

const BalanceContext = createContext<BalanceContextValue | null>(null);

export function BalanceProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState<BalanceState>({ phase: "loading" });
  // Bumped by every read and when the provider goes away; a result whose
  // number is no longer current is dropped.
  const run = useRef(0);

  const read = useCallback(async () => {
    const token = ++run.current;
    const result = await fetchBalance();
    if (token !== run.current) return;
    setBalance(result.ok ? { phase: "ready", balance: result.balance } : { phase: "failed" });
  }, []);

  useEffect(() => {
    void read();
    const runs = run;
    return () => {
      runs.current += 1;
    };
  }, [read]);

  // When the signed-in user changes — another tab signing in as someone else
  // — the balance on screen is dropped, any read in flight is ignored, and it
  // is read again for whoever is signed in now. The first report only records
  // who is signed in. The read is deferred out of the callback: Supabase
  // warns that calling its other methods from inside one can deadlock.
  useEffect(() => {
    let signedIn: string | null | undefined;
    let reread: ReturnType<typeof setTimeout> | null = null;
    const runs = run;
    const { data } = createClient().auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null;
      if (signedIn !== undefined && userId !== signedIn) {
        runs.current += 1;
        setBalance({ phase: "loading" });
        if (reread !== null) clearTimeout(reread);
        reread = setTimeout(() => {
          reread = null;
          void read();
        }, 0);
      }
      signedIn = userId;
    });
    return () => {
      if (reread !== null) clearTimeout(reread);
      data.subscription.unsubscribe();
    };
  }, [read]);

  // A generation can finish, or a refill fall due, while the tab is away.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void read();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [read]);

  // Stable, so a page can call them from its own effects without looping.
  const refresh = useCallback(() => void read(), [read]);
  const observed = useCallback(
    (now: number, nextRefillAt: string) => {
      run.current += 1;
      // Only a balance already read carries the allowance; before that, the
      // reread below supplies everything.
      setBalance((previous) =>
        previous.phase === "ready"
          ? { phase: "ready", balance: { ...previous.balance, balance: now, nextRefillAt } }
          : previous,
      );
      void read();
    },
    [read],
  );

  const value = useMemo<BalanceContextValue>(() => ({ balance, refresh, observed }), [balance, refresh, observed]);

  return <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>;
}

/**
 * The shared balance. Outside a BalanceProvider — a page rendered without the
 * app shell — it reads as failed and refresh does nothing, so such a page
 * shows "no balance" rather than breaking.
 */
export function useBalance(): BalanceContextValue {
  return useContext(BalanceContext) ?? OUTSIDE;
}

const OUTSIDE: BalanceContextValue = { balance: { phase: "failed" }, refresh: () => {}, observed: () => {} };
