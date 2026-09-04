"use client";

// ─────────────────────────────────────────────────────────────
// Topbar
// ─────────────────────────────────────────────────────────────
// Horizontal bar at the top of every in-app screen.
// Matches HFTopbar from hifi-core.jsx exactly.
//
// Structure:
//   ┌──────────────────────────────────────────────────────┐
//   │  [🔍 Search your library...  ⌘K]    [🔔]  [Avatar] │
//   └──────────────────────────────────────────────────────┘
//
// Left side:  Search trigger (clickable, opens search modal later)
// Right side: Optional extra actions, notification bell, user avatar
//
// The search trigger is NOT an <input> — it's a <button> styled
// like an input. Clicking it (or pressing ⌘K) will open a search
// modal in a later phase. This is the command palette pattern
// used by Notion, Linear, and Vercel.
//
// The avatar takes nothing: UserMenu fetches the signed-in user itself.
//
// Usage:
//   <Topbar />
//   <Topbar onSearchClick={openSearch}>
//     <Button size="sm">Extra Action</Button>
//   </Topbar>
// ─────────────────────────────────────────────────────────────

import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/user-menu";

// ── Icons ───────────────────────────────────────────────────

const SearchIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
    <path d="M4 7a4 4 0 0 1 8 0v3l1 1.5H3L4 10V7z"
      stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M6.5 13a1.5 1.5 0 0 0 3 0"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

// ── Props ───────────────────────────────────────────────────

interface TopbarProps {
  /** Called when the search trigger is clicked */
  onSearchClick?: () => void;
  /** Extra elements rendered before the bell icon (e.g., action buttons) */
  children?: ReactNode;
}

// ── Component ───────────────────────────────────────────────

export function Topbar({
  onSearchClick,
  children,
}: TopbarProps) {
  return (
    <div
      className={[
        "h-[56px] shrink-0",
        "px-6",
        "border-b border-xn-border",
        "bg-xn-bg",
        "flex items-center gap-3",
      ].join(" ")}
    >
      {/* ── Left Side: Search Trigger ──
          Max-width 480px matching the hi-fi.
          Styled like an input but it's a <button>.
          Clicking opens the ⌘K search modal (later). */}
      <div className="flex-1 max-w-[480px]">
        <button
          onClick={onSearchClick}
          className={[
            "w-full flex items-center gap-2",
            "px-3 py-1.5",
            "bg-xn-surface-alt",
            "rounded-xn-md",
            "border border-transparent",
            "cursor-pointer",
            "transition-colors duration-150",
            "hover:border-xn-border",
          ].join(" ")}
        >
          {/* Search icon */}
          <span className="text-xn-ink-soft">
            <SearchIcon />
          </span>

          {/* Placeholder text */}
          <span className="flex-1 text-left text-sm text-xn-ink-soft">
            Search your library…
          </span>

          {/* ⌘K keyboard shortcut badge */}
          <span
            className={[
              "font-mono text-micro text-xn-ink-soft",
              "border border-xn-border rounded",
              "px-1.5 py-px",
            ].join(" ")}
          >
            ⌘K
          </span>
        </button>
      </div>

      {/* ── Right Side: Actions + Bell + Avatar ── */}
      <div className="flex-1 flex items-center justify-end gap-2">
        {/* Optional extra elements passed as children */}
        {children}

        {/* Notification bell */}
        <Button
          iconOnly
          size="md"
          variant="ghost"
          icon={<BellIcon />}
          aria-label="Notifications"
        />

        {/* User menu (avatar + sign-out dropdown) */}
        <UserMenu />
      </div>
    </div>
  );
}