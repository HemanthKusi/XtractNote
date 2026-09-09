"use client";

// ─────────────────────────────────────────────────────────────
// AppShell
// ─────────────────────────────────────────────────────────────
// The main layout wrapper for all in-app screens.
//
// Combines:
//   - a header band (logo left, topbar filling the rest), fixed 56px
//   - the floating menu, which is NOT in flow
//   - a content area that reserves the menu's width and scrolls independently
//
// ── Why this is no longer a flex row ──
//
// The old shell put a fixed 232px sidebar in flow as a flex sibling, and the
// content took whatever was left. The menu that replaced it floats in every
// mode — panel, dock or button — so it is never in flow and nothing can sit
// beside it. The content gives up a padding-left instead, on the same curve as
// the morph, so it never runs underneath. MenuShell owns that pairing.
//
// Structure:
//
//   <relative column, full height>
//     <a>       skip to content              ← first in DOM, hidden until focused
//     <header>  logo | Topbar                ← fixed 56px, full width
//     <MenuShell>                            ← padded content + the floating menu
//       {children}
//     </MenuShell>
//   </column>
//
// The outer element is `relative` because the menu positions itself absolutely
// against it, and the geometry measures its anchor from the top of the shell.
//
// ── Why the logo is here ──
//
// It used to live inside the sidebar. A logo that sits inside a menu would move
// and resize every time the menu changed shape, which is the opposite of what a
// permanent mark should do — so it is pinned to the shell's top-left corner and
// holds still while everything under it changes size.
//
// Rendered once by the (app) route group's layout, so every signed-in route
// gets the same shell and no page assembles its own.
//
// Usage:
//   <AppShell>
//     <DashboardContent />
//   </AppShell>
// ─────────────────────────────────────────────────────────────

import { type ReactNode } from "react";

import { Logo } from "@/components/layout/logo";
import { MAIN_CONTENT_ID, MenuShell } from "@/components/layout/menu";
import { HEADER_H } from "@/components/layout/menu/menu-geometry";
import { Topbar } from "@/components/layout/topbar";

// ── Props ───────────────────────────────────────────────────

interface AppShellProps {
  /** The page content — rendered in the scrollable content area */
  children: ReactNode;
}

// ── Component ───────────────────────────────────────────────

export function AppShell({ children }: AppShellProps) {
  return (
    // Full viewport height, and the positioning context the menu anchors to.
    <div className="relative flex h-screen flex-col overflow-hidden">
      {/* ── Skip to content ──
          First in the DOM because DOM order is tab order, and that is the
          whole mechanism: this has to be reachable before the nine controls
          it exists to bypass — three in the topbar, six in the menu.

          `sr-only` already positions absolutely, so `focus:not-sr-only` alone
          would return it to static and push the header down. `focus:absolute`
          puts it back over the header, which is why both appear. */}
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className={[
          "sr-only",
          "focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50",
          "focus:rounded-xn-md focus:border focus:border-xn-border-strong",
          "focus:bg-xn-surface focus:px-3 focus:py-2",
          "focus:text-ui focus:text-xn-ink focus:no-underline",
          "focus:shadow-xn-ring",
        ].join(" ")}
      >
        Skip to content
      </a>

      {/* ── Header band ──
          The logo keeps the corner; the topbar fills the rest. Both carry the
          same bottom border so the line reads as one continuous rule rather
          than two segments meeting. */}
      <header className="flex shrink-0" style={{ height: HEADER_H }}>
        <div className="flex w-[188px] shrink-0 items-center border-b border-xn-border bg-xn-bg pl-4">
          <Logo size={22} showWordmark />
        </div>
        <div className="min-w-0 flex-1">
          {/* The search trigger has no handler yet — the ⌘K modal is not
              built, so the button is present but does nothing. */}
          <Topbar />
        </div>
      </header>

      {/* ── The menu and the content it makes room for ── */}
      <MenuShell>{children}</MenuShell>
    </div>
  );
}
