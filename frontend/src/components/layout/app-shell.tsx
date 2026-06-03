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
// Usage:
//   <AppShell activePage="home">
//     <DashboardContent />
//   </AppShell>
//
//   <AppShell activePage="history" topbarChildren={<Button>Export All</Button>}>
//     <HistoryTable />
//   </AppShell>
// ─────────────────────────────────────────────────────────────

import { type ReactNode } from "react";
import { Sidebar, type PageId } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

// ── Props ───────────────────────────────────────────────────

interface AppShellProps {
  /** Which sidebar nav item is highlighted */
  activePage?: PageId;
  /** Called when a sidebar nav item is clicked */
  onNavigate?: (page: PageId) => void;

  /** User's initials for the topbar avatar */
  userInitials?: string;
  /** User's display name */
  userName?: string;
  /** User's profile image URL */
  userImage?: string;

  /** Called when the topbar search trigger is clicked */
  onSearchClick?: () => void;
  /** Extra elements in the topbar's right side (page-specific actions) */
  topbarChildren?: ReactNode;

  /** The page content — rendered in the scrollable content area */
  children: ReactNode;
}

// ── Component ───────────────────────────────────────────────

export function AppShell({
  activePage = "home",
  onNavigate,
  userInitials = "MK",
  userName,
  userImage,
  onSearchClick,
  topbarChildren,
  children,
}: AppShellProps) {
  return (
    // Outer container: full viewport height, flex row.
    // The sidebar sits on the left, everything else on the right.
    <div className="h-screen flex overflow-hidden">

      {/* ── Sidebar ──
          Fixed 232px width. Full height. Scrolls internally
          if the folder list is long. */}
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
      />

      {/* ── Main Area ──
          Takes all remaining horizontal space (flex-1).
          Flex column: topbar on top, content below. */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Topbar ──
            Fixed 56px height. Full width of the main area.
            Stays pinned at the top while content scrolls below. */}
        <Topbar
          userInitials={userInitials}
          userName={userName}
          userImage={userImage}
          onSearchClick={onSearchClick}
        >
          {topbarChildren}
        </Topbar>

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