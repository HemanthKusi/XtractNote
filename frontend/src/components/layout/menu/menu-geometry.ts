// src/components/layout/menu/menu-geometry.ts
//
// The menu's shape, in numbers. No React, no DOM, no side effects.
//
// The menu FLOATS IN EVERY MODE. It is never attached to the side, so all three
// modes share one anchor — top-left, inset below the header — and only the box
// changes. Expanded is a floating panel, rail is a dock, collapsed is a button.
// Because the anchor never moves, the morph is pure width/height/radius from a
// fixed corner, which is what lets it read as one object changing shape rather
// than one object travelling.
//
// The chain is deliberately shallow at each step:
//   expanded -> rail       changes WIDTH only
//   rail     -> collapsed  changes HEIGHT only, plus radius
// One dimension at a time is why it reads as liquid rather than as scaling.
//
// ── Why this is a separate file ──
//
// Every function here is pure, so the whole definition of the morph can be
// checked without rendering anything. That is not a stylistic preference: the
// browser tooling available to this project has repeatedly failed to run an
// animation at all, and arithmetic that lives outside the component stays
// verifiable when a frame never arrives.

import { ROUTES } from "@/lib/constants/routes";

export type MenuMode = "expanded" | "rail" | "floating";

export type PageId = "home" | "create" | "history" | "folders" | "extension" | "settings";

// ── Sizes ───────────────────────────────────────────────────

export const HEADER_H = 56;
export const INSET = 16;
export const PAD = 10;
export const ROW_GAP = 4;

/**
 * Row and label sizes come from SearchInput, this system's designed chrome
 * control, which already answers them: a 44px control height and a 15px label,
 * the scale's own "nav, buttons, chrome" step. Two attempts to derive these by
 * eye and by ratio were both wrong before the shipped component was consulted.
 *
 * The 24px icon is not SearchInput's 16 — it was reviewed up, because a menu
 * floating over content needs more presence than one welded to the edge.
 */
export const ROW_H = 44;
export const ICON = 24;
export const LABEL_GAP = 12;

export const DOCK_W = ROW_H + PAD * 2; // 64 — a square target plus its padding
export const PANEL_W = 232;
export const BUTTON = DOCK_W; // the dock, squared

/**
 * The detached close. A circle the menu pinches off as it opens, sized to
 * exactly one row so the lid and the list share a rhythm.
 */
export const CLOSE_D = ROW_H;

/**
 * The gap must sit OUTSIDE the goo's reach, and 10 did not.
 *
 * Work the threshold out rather than eyeballing it. After a Gaussian with
 * sigma 7, a straight edge contributes alpha ~= PHI(-d/sigma) at distance d.
 * The matrix maps alpha -> 20a - 10, so anything under a = 0.5 is crushed to
 * nothing and anything over it snaps to solid.
 *
 *   gap 10 -> two edges 5px away  -> 2 * PHI(-0.71) = 0.48   <- 0.48 vs 0.50
 *   gap 20 -> two edges 10px away -> 2 * PHI(-1.43) = 0.15   <- clean
 *
 * At 10 the neck sits within 2% of the threshold: not a bridge, not a clean
 * break, just a smear that distorted the dock's TOP corners while the bottom
 * two — nowhere near the close — stayed true.
 */
export const CLOSE_GAP = 20;

/**
 * Every radius is CONCRETE. There is no 999 sentinel anywhere, and that is the
 * whole point.
 *
 * A sentinel is fine for a static style — the browser clamps it to half the
 * short side and you get a pill. It is poison for a tween on a SPRING. The
 * curve overshoots (that is the 1.38), so eased progress passes 1, and
 * interpolating 999 -> 16 at p = 1.1 computes 999 + (16 - 999) * 1.1 = -82.
 * A negative radius is invalid, the browser falls back to 0, and the shape
 * renders SQUARE for a frame or two before settling.
 *
 * `closeBar` is 16 rather than the panel's 24 because the bar is only ROW_H
 * tall: a 24px corner exceeds half its height, the browser clamps it, and it
 * renders as a pill beside the rectangle the panel wants.
 */
export const RADIUS = { expanded: 24, closeBar: 16 } as const;

export interface MenuGeometry {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
}

const ANCHOR_TOP = HEADER_H + INSET;

/**
 * Where the menu's BODY sits in each mode.
 *
 * Docked modes run the full available height and leave empty space below the
 * rows — a menu that shrink-wraps its list changes height every time the list
 * does, and a nav should be fixed furniture.
 */
export function geometryFor(mode: MenuMode, shellHeight: number): MenuGeometry {
  if (mode === "floating") {
    // A circle, stated as a number: half the button's side.
    return { left: INSET, top: ANCHOR_TOP, width: BUTTON, height: BUTTON, radius: BUTTON / 2 };
  }
  const top = ANCHOR_TOP + CLOSE_D + CLOSE_GAP; // the body starts below the close
  return {
    left: INSET,
    top,
    width: mode === "rail" ? DOCK_W : PANEL_W,
    height: Math.max(shellHeight - INSET - top, 0),
    // The dock is a stadium — fully round on its short axis — and half its
    // width is exactly the radius that produces one. The panel is a rounded
    // rectangle and keeps its own corner.
    radius: mode === "rail" ? DOCK_W / 2 : RADIUS.expanded,
  };
}

/**
 * Where the CLOSE sits. It has three jobs, one per mode, and the shape says
 * which:
 *
 *   expanded   a title bar spanning the panel's exact width — the menu names
 *              itself, the glyph sits at the right
 *   rail       a bare circle; a dock is too narrow for a title
 *   collapsed  concentric with the button, so the two merge into a single blob
 *              rather than stacking
 *
 * Docked, it rides above the body with a gap small enough that the gooey filter
 * still bridges it — it reads as a drop the menu has not quite let go of.
 */
export function closeGeometryFor(mode: MenuMode, shellHeight: number): MenuGeometry {
  const body = geometryFor(mode, shellHeight);
  // Collapsed, the close does not travel — it scales to nothing where it stands
  // while the body slides up past it, so its box is the button's.
  if (mode === "floating") {
    return {
      left: INSET + (BUTTON - CLOSE_D) / 2,
      top: ANCHOR_TOP,
      width: CLOSE_D,
      height: CLOSE_D,
      radius: CLOSE_D / 2,
    };
  }
  if (mode === "expanded") {
    // Flush with the panel it belongs to AND squared off to match it, so the
    // detachment reads as a lid lifting rather than a pill above a rectangle.
    return { left: body.left, top: ANCHOR_TOP, width: body.width, height: CLOSE_D, radius: RADIUS.closeBar };
  }
  return {
    left: INSET + (DOCK_W - CLOSE_D) / 2,
    top: ANCHOR_TOP,
    width: CLOSE_D,
    height: CLOSE_D,
    radius: CLOSE_D / 2,
  };
}

/**
 * How much horizontal room the page gives up so content never runs under the
 * menu. The collapsed button reserves nothing — it is small, low, and content
 * flowing past it is the point of collapsing.
 */
export function reservedFor(mode: MenuMode): number {
  if (mode === "floating") return 0;
  return INSET + (mode === "rail" ? DOCK_W : PANEL_W) + 8;
}

/** Pressing the menu in each mode moves it one step. */
export function stepFrom(mode: MenuMode): MenuMode {
  if (mode === "floating") return "rail"; // the button comes back to icons
  return mode === "expanded" ? "rail" : "expanded";
}

// ── Motion ──────────────────────────────────────────────────

/**
 * SearchInput's own curve. The DURATION is no longer its 460ms; see MORPH_MS.
 *
 * This is what "fluid" actually was, and why nothing here felt like it until
 * the shipped component was read: the curve OVERSHOOTS and settles back.
 * Expo-out does not, and neither does `--xn-ease-out`; both land dead. A
 * control that springs past its mark and returns reads as something with mass.
 *
 * ── Why the numbers still appear below ──
 *
 * CSS gets the variable: this menu builds its transitions as strings with
 * durations computed at runtime, which no utility class can express, so
 * `var(--xn-ease-spring)` is how the curve reaches them.
 *
 * GSAP cannot use that. CustomEase needs the four control points as numbers to
 * build its path, and reading them back out of a computed style at module scope
 * would mean parsing a string that does not exist until a document does. So the
 * numbers survive here for that one consumer, and only that one.
 *
 * They are therefore written twice on purpose — once in globals.css for CSS,
 * once here for GSAP. If the curve ever changes, both move together.
 */
export const MORPH_CUBIC = "0.34, 1.38, 0.5, 1";
export const MORPH_EASE_ID = "xnSpring";
export const MORPH_CSS_EASE = "var(--xn-ease-spring)";

/**
 * 560ms, chosen at review rather than inherited.
 *
 * SearchInput uses 460 because its travel is short, so the overshoot reads as a
 * snap. This menu moves a whole panel, and the same curve over a longer
 * distance wants longer to settle. The CURVE is still SearchInput's; only the
 * duration parts company with it.
 */
export const MORPH_MS = 560;

/**
 * The choreography, as fractions of the morph. Deliberately thin: SearchInput
 * sequences nothing at all — it transitions two properties on one curve and
 * lets the goo do the rest. A staged reveal fights the spring, because a curve
 * that overshoots wants to be the whole event rather than the first of four.
 * All that survives is a short delay before the rows fade up, so they are not
 * arriving while the panel is still overshooting past them.
 */
export const BEAT = {
  rowDelay: 0.3,
  rowStagger: 0.05,
  rowDuration: 0.55,
  rowsOut: 0.25,
} as const;

/** SearchInput's filter values, not approximations of them. */
export const GOO = { blur: 7, alpha: 20, shift: -10 } as const;

/** How far the hovered icon zooms in the DOCK. A transform, so nothing moves. */
export const ICON_ZOOM = 1.4;

/** Short, because it is a response to the pointer, not an event in itself. */
export const ZOOM_MS = 180;

/**
 * Playback rate for every icon loop, applied as a GSAP timeScale rather than
 * baked into each builder — so one number retunes the whole set and no
 * individual timeline has to be rewritten.
 */
export const ICON_SPEED = 0.8;

// ── The panel's hover ───────────────────────────────────────

/**
 * In the panel the glyph zooms and SINKS until the row's own pill crops it, and
 * the title lifts to sit above it. Taken from a reference button's mechanic
 * rather than its looks.
 *
 * That reference does this inside a circle where the icon and the label occupy
 * the SAME space — the icon sinks out of the bottom as the label drops in from
 * above. This row already has the label beside the glyph, so the two were
 * compared side by side: cropping inside the glyph's own 16px box, or letting
 * the glyph travel to the row's centre and be cropped by the pill. The second
 * won. Only it is implemented here; shipping both would be a dead branch, and
 * the specimen keeps the comparison reproducible.
 */
export interface PanelHoverSettings {
  /** "Little zoom" — not the reference's 4.2x. */
  zoom: number;
  /** Fraction of the zoomed glyph pushed below the row's bottom edge. */
  crop: number;
}

/**
 * Crop is a fraction of the zoomed glyph, so what it means in pixels follows
 * the icon size: at 24px and 1.8x the glyph is 43.2px, so 0.4 cuts 17.28px.
 */
export const PANEL_HOVER: PanelHoverSettings = { zoom: 1.8, crop: 0.4 };
export const PANEL_HOVER_MS = 300;

/**
 * How far the glyph travels to reach the row's horizontal centre.
 *
 * Derived, not measured: the row's left padding is exactly the leftover beside
 * the glyph, (ROW_H - ICON) / 2, so the glyph's centre always lands on
 * ROW_H / 2 whatever the icon size. The travel is therefore a constant and
 * needs no ref and no resize observer.
 */
export const HOVER_TO_CENTRE = (PANEL_W - PAD * 2) / 2 - ROW_H / 2;

/**
 * The downward travel that leaves exactly `crop` of the zoomed glyph below the
 * row's bottom edge. Solving
 *
 *     rowH / 2 + glyphH / 2 + sink - rowH = crop * glyphH
 *
 * for sink. Expressing it as a fraction cropped rather than as raw pixels is
 * what let the two candidate designs be compared: their containers were 16px
 * and 44px, and one shared pixel offset would have cropped them by wildly
 * different amounts.
 */
export function hoverSink(containerH: number, glyphH: number, crop: number) {
  return (containerH - glyphH) / 2 + crop * glyphH;
}

/** The title's rendered line box — measured, 15px text on a 22.5px line. */
export const TITLE_H = 19.5;

/**
 * The gap left between the title's line box and the glyph's top edge.
 *
 * Measured against the LINE BOX rather than the ink, so a word with a descender
 * cannot collide with the glyph while a word without one still looks correctly
 * spaced. Two of these labels have descenders and the tighter is not the
 * obvious one: History's `y` clears by 2.03px where Settings' `g` clears 2.86.
 */
export const TITLE_GAP = 1.5;

/**
 * Weight the title takes while its row is hovered. DM Sans is loaded with a
 * 100..1000 axis, so this eases rather than snapping, and the extra width grows
 * symmetrically about the centred text so nothing shifts sideways.
 */
export const TITLE_HOVER_WEIGHT = 600;

/**
 * How far the title lifts so the sinking glyph has room beneath it.
 *
 * Derived from the crop rather than set separately, so the two cannot drift
 * apart: the glyph's visible band starts at `rowH - glyphH * (1 - crop)`, and
 * the title sits a fixed gap above it.
 *
 * ── Why a gap and not a centring ──
 *
 * This used to centre the title in whatever height the glyph left above it,
 * which sounds tidier and looked wrong: centring gives the row's top edge and
 * the glyph an IDENTICAL gap, so the title read as jammed against the top of
 * the row. Anchoring to the glyph spends the spare height upward, where there
 * is a row edge to breathe against rather than a piece of artwork.
 *
 * ── This works in ENVELOPES, deliberately ──
 *
 * TITLE_H is the line box, not the ink, and the glyph's height is its box, not
 * its drawing. Both are bigger than what can actually be seen, so the cap below
 * engages well before anything visible collides.
 *
 * DO NOT "fix" this by switching to ink metrics. The line box carries ~5px of
 * unused descent below most of these words, so an ink-based lift would raise
 * the title a further 2.9px and put the visible text about 1px off the row's
 * top edge — the exact complaint the lift was added to solve. The envelope's
 * conservatism is what leaves 4.05px of optical room above the text.
 *
 * The cap keeps the word whole when the two cannot both fit; the floor stops a
 * negative lift pushing the title DOWN into the glyph when there is room to
 * spare.
 */
export function titleRise(
  rowH: number,
  glyphH: number,
  crop: number,
  titleH = TITLE_H,
  gap = TITLE_GAP,
) {
  const glyphTop = Math.max(0, rowH - glyphH * (1 - crop));
  const ideal = (rowH + titleH) / 2 - glyphTop + gap;
  return Math.max(0, Math.min(ideal, (rowH - titleH) / 2));
}

/**
 * The title is centred on the ROW, not on the space left beside the icon.
 *
 * With the label flex-growing into the remainder, its own centre sits half of
 * (icon + gap) right of the row's centre — so shifting it back by that much
 * lands it on the row's axis, which is where the glyph travels to. Both end up
 * on one vertical line, which is the point of the composition. Independent of
 * the row's width, so nothing needs measuring.
 */
export function titleCentreShift(iconPx: number) {
  return -(iconPx + LABEL_GAP) / 2;
}

/**
 * The bar's own title, beside a close glyph sized `ICON * 1.5`.
 *
 * "Match the close size" has no single right answer, because the glyph is a
 * dashed path that morphs: its geometry box reports the whole hamburger whether
 * or not the dashes are hiding half of it, so there is no honest single number
 * for how big the X looks. 20px was chosen at review from measured candidates.
 */
export const MENU_TITLE_PX = 20;

// ── Destinations ────────────────────────────────────────────

export interface MenuEntry {
  id: PageId;
  label: string;
  /** Present unless the route does not exist yet. */
  href?: string;
  /** Routes that do not exist render inert rather than linking into a 404. */
  unavailable?: boolean;
}

export const MENU_ENTRIES: MenuEntry[] = [
  { id: "home", label: "Home", href: ROUTES.DASHBOARD },
  { id: "create", label: "Create", href: ROUTES.CREATE },
  { id: "history", label: "History", href: ROUTES.HISTORY },
  { id: "folders", label: "Folders", href: ROUTES.FOLDERS },
  { id: "extension", label: "Extension", unavailable: true },
  { id: "settings", label: "Settings", unavailable: true },
];

/**
 * True for a section's own path and anything beneath it, but not for a sibling
 * that merely shares a prefix — "/folders" must not light up on a hypothetical
 * "/folders-archive".
 */
function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Which row the current URL belongs to. Pure, so it can be reasoned about
 * without a router.
 *
 * `/output/[id]` deliberately matches nothing: a saved item is reachable from
 * both History and Folders, and the editor's own back link already says which
 * one you came from.
 */
export function pageForPathname(pathname: string): PageId | null {
  for (const entry of MENU_ENTRIES) {
    if (entry.href && isUnder(pathname, entry.href)) return entry.id;
  }
  return null;
}
