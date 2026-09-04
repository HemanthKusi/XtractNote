"use client";

// src/components/layout/menu/menu-shell.tsx
//
// Owns the menu's mode, and the padding that follows from it.
//
// ── Why this is its own component ──
//
// The content's left padding depends on which mode the menu is in, so the two
// have to be held together — and they are needed in two places: the real shell,
// and the component showcase, which assembles the same arrangement inside a
// fixed-height box. Keeping the pairing here means the showcase demonstrates
// the shipped behaviour rather than a copy of it that can drift.
//
// (AppShell is already a Client Component, so this is not a boundary trick.)
//
// ── Why the menu is a sibling of the content, not a parent ──
//
// The menu floats in every mode, so it is never in document flow and the page
// cannot sit beside it as a flex sibling the way the old fixed sidebar did. The
// page gives up a padding-left instead, on the same curve as the morph, so
// content never runs under the panel or the dock. The collapsed button reserves
// nothing — it is small, low, and content flowing past it is the point of
// collapsing.
//
// The menu positions itself absolutely, so whatever renders this must be the
// nearest positioned ancestor.

import { useState, type ReactNode } from "react";

import { AppMenu } from "./app-menu";
import { MORPH_CSS_EASE, MORPH_MS, reservedFor, type MenuMode, type PageId } from "./menu-geometry";

export function MenuShell({
  children,
  activePage,
  onNavigate,
  shellHeight,
}: {
  children: ReactNode;
  /** Preview surfaces only — see AppMenu. */
  activePage?: PageId;
  onNavigate?: (page: PageId) => void;
  shellHeight?: number;
}) {
  // The menu does not remember its mode: it opens as a panel on every load.
  const [mode, setMode] = useState<MenuMode>("expanded");

  return (
    <>
      <div
        className="flex-1 overflow-hidden"
        style={{
          paddingLeft: reservedFor(mode),
          transition: `padding-left ${MORPH_MS}ms ${MORPH_CSS_EASE}`,
        }}
      >
        <main className="h-full overflow-y-auto px-8 py-6">{children}</main>
      </div>

      <AppMenu
        mode={mode}
        onModeChange={setMode}
        activePage={activePage}
        onNavigate={onNavigate}
        shellHeight={shellHeight}
      />
    </>
  );
}
