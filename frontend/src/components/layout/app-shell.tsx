"use client";

// ─────────────────────────────────────────────────────────────
// AppShell
// ─────────────────────────────────────────────────────────────
// The main layout wrapper for all in-app screens.
// Matches HFShell from hifi-core.jsx.
//
// Combines:
//   - Sidebar (left, fixed 232px)
//   - Topbar (top, fixed 56px)
//   - Content area (fills remaining space, scrolls independently)
//
// The content area scrolls while sidebar and topbar stay fixed.
// This is achieved with a nested flex layout:
//
//   <flex row, full height>
//     <Sidebar />                       ← fixed width, full height
//     <flex column, flex-1>
//       <Topbar />                      ← fixed height, full width
//       <scrollable content, flex-1>    ← fills remaining space
//         {children}
//       </scrollable content>
//     </flex column>
//   </flex row>
//
// Rendered once by the (app) route group's layout, so every signed-in
// route gets the same shell and no page assembles its own.
//
// It takes only its content. The sidebar reads the current route to
// highlight itself, and the topbar's user menu fetches the signed-in
// user, so neither needs anything passed down.
//
// Usage:
//   <AppShell>
//     <DashboardContent />
//   </AppShell>
// ─────────────────────────────────────────────────────────────

import { type ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

// ── Props ───────────────────────────────────────────────────

interface AppShellProps {
  /** The page content — rendered in the scrollable content area */
  children: ReactNode;
}

// ── Component ───────────────────────────────────────────────

export function AppShell({ children }: AppShellProps) {
  return (
    // Outer container: full viewport height, flex row.
    // The sidebar sits on the left, everything else on the right.
    <div className="h-screen flex overflow-hidden">

      {/* ── Sidebar ──
          Fixed 232px width. Full height. Scrolls internally
          if the folder list is long. Highlights itself from the URL. */}
      <Sidebar />

      {/* ── Main Area ──
          Takes all remaining horizontal space (flex-1).
          Flex column: topbar on top, content below. */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Topbar ──
            Fixed 56px height. Full width of the main area.
            Stays pinned at the top while content scrolls below.
            The search trigger has no handler yet — the ⌘K modal
            is not built, so the button is present but does nothing. */}
        <Topbar />

        {/* ── Content Area ──
            Fills all remaining vertical space (flex-1).
            Scrolls independently — sidebar and topbar stay fixed.
            Padding matches the hi-fi's content area: 24px vertical, 32px horizontal. */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}