"use client";

// src/app/dev/app-shell/page.tsx  →  route: /dev/app-shell
//
// Verification harness for the shared app shell. Not shipped.
//
// Every route in the (app) group is behind auth and the browser tooling has
// no session, so /create and /output/[id] cannot be seen rendered. This route
// renders the SHIPPED <AppShell> unauthenticated instead.
//
// It carries both inner columns verbatim, because the claim under test is
// that /create and /output/[id] now measure the same:
//
//   /create                  mx-auto max-w-output px-6 py-10
//   SavedContentEditor       mx-auto w-full max-w-output px-6 py-10
//
// They differ by `w-full`, which should be a no-op on a block-level child.
// "Should be" is how the overhang constant got to be 26% wrong, so both are
// rendered here and measured rather than reasoned about.
//
// This path is not under /dashboard, /create, /history or /folders, so the
// sidebar should highlight NOTHING here — which is also the /output/[id] case.

import { AppShell } from "@/components/layout";

function Ruler({ label, id }: { label: string; id: string }) {
  return (
    <div
      id={id}
      className="rounded-xn-md border border-dashed border-xn-border bg-xn-surface-alt p-4"
    >
      <p className="font-mono text-micro text-xn-ink-soft">{label}</p>
      <p className="mt-1 text-sm text-xn-ink-muted">
        Measure this box&apos;s content width, not the page width.
      </p>
    </div>
  );
}

export default function DevAppShellPage() {
  return (
    <AppShell>
      {/* Exactly the column /create declares */}
      <div className="mx-auto max-w-output px-6 py-10">
        <Ruler id="create-column" label="/create — mx-auto max-w-output px-6 py-10" />
      </div>

      {/* Exactly the column SavedContentEditor declares */}
      <div className="mx-auto w-full max-w-output px-6 py-10">
        <Ruler
          id="output-column"
          label="/output/[id] — mx-auto w-full max-w-output px-6 py-10"
        />
      </div>
    </AppShell>
  );
}
