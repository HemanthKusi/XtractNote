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

/**
 * The content landmark's id, and the skip link's target.
 *
 * Exported rather than written out in both places because a link whose target
 * has drifted fails in total silence — the browser does nothing, and nothing
 * says why. Importing it means the pair can only break by deleting one end,
 * which the compiler reports.
 */
export const MAIN_CONTENT_ID = "main-content";

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
      {/* The menu comes FIRST in the DOM, and that is about the keyboard rather
          than about layout. It is absolutely positioned, so its order here
          costs nothing visually — but DOM order is tab order and reading order,
          and with the content first a keyboard user had to pass through every
          control on the page before reaching the navigation. The sidebar this
          replaced was the first child of the shell and did not have that
          problem; putting the menu back in front restores it. */}
      <AppMenu
        mode={mode}
        onModeChange={setMode}
        activePage={activePage}
        onNavigate={onNavigate}
        shellHeight={shellHeight}
      />

      <div
        className="flex-1 overflow-hidden"
        style={{
          paddingLeft: reservedFor(mode),
          transition: `padding-left ${MORPH_MS}ms ${MORPH_CSS_EASE}`,
        }}
      >
        {/* `tabIndex={-1}` is what makes the skip link work, and it is not
            optional. An id alone moves the browser's reading position without
            moving keyboard focus, so the next Tab resumes from the header and
            the link looks broken while appearing to be wired.

            ── Why this is focusable AND shows a ring ──

            It first shipped with `focus:outline-none`, on the reasoning that
            `tabIndex={-1}` keeps <main> out of the tab sequence so it is never
            navigated TO, which makes suppressing the indicator not a WCAG
            2.4.7 failure. That is true and it answered the wrong question.

            What a sighted keyboard user actually experiences: they Tab, see
            "Skip to content", press Enter — and the link disappears, because
            it goes back to sr-only on blur. Nothing else changes. The one
            control whose whole job is to move them somewhere gives no sign it
            did anything.

            So an indicator stays. Two things decided what it is.

            ── `focus-visible`, not `focus` ──

            It shipped as `focus:` and that was wrong: `tabIndex={-1}` makes
            <main> focusable by CLICK as well as programmatically, so every
            click anywhere in the page content focused it and drew a rectangle
            around the whole scroll container. An indicator meant to confirm
            one deliberate jump was firing on ordinary reading.

            `focus-visible` is exactly this distinction — the browser shows the
            indicator for keyboard-driven focus and suppresses it for a
            pointer.

            ── A LEFT EDGE, not a ring ──

            The ring could not be made to work here, and the reason is
            structural rather than a matter of styling. <main> is the full
            height scroll viewport, and a page pins its own furniture to the
            top of it — the output route's bar is `sticky` at `z-30` with an
            opaque fill. That bar is a DESCENDANT of <main>, and a descendant
            always paints above its ancestor's outline, so it covered the
            ring's top edge completely. Measured: probing just inside each edge
            found the bar at the top and <main> on the other three.

            No inset rescues it — the bar occupies the top ~60px, so -2, -4 and
            -8 all land underneath. And any future page that pins something
            will do the same thing, so this is not one route's problem.

            A left edge cannot be covered by furniture pinned to the top, it
            reads unambiguously as "this region", and it does not trace a
            rectangle around the entire viewport to say so.

            It is an INSET BOX-SHADOW rather than a border, because a border
            would add 3px to the box and shift every page's content sideways
            on focus. */}
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="h-full overflow-y-auto px-8 py-6 focus-visible:shadow-[inset_3px_0_0_0_var(--xn-ink-muted)] focus-visible:outline-none"
        >
          {children}
        </main>
      </div>
    </>
  );
}
