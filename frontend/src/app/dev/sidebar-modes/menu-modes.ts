// src/app/dev/sidebar-modes/menu-modes.ts
//
// Shared vocabulary for the one menu. Specimen support; never ships.
//
// The menu FLOATS IN EVERY MODE. It is never attached to the side, so all
// three modes share one anchor — top-left, inset below the header — and only
// the box changes. Expanded is a floating panel, rail is a dock, collapsed is
// a button. Because the anchor never moves, the morph is pure width/height/
// radius from a fixed corner, which is what lets it read as one object
// changing shape rather than one object travelling.
//
// The chain is deliberately shallow at each step:
//   expanded -> rail       changes WIDTH only  (232 -> 64)
//   rail     -> collapsed  changes HEIGHT only (352 -> 64) + radius
// One dimension at a time is why it feels liquid rather than scaled.

export type MenuMode = "expanded" | "rail" | "floating";

export const MENU_MODES: MenuMode[] = ["expanded", "rail", "floating"];

export const MODE_LABEL: Record<MenuMode, string> = {
  expanded: "Expanded — panel",
  rail: "Rail — dock",
  floating: "Collapsed — button",
};

// ── Sizes ───────────────────────────────────────────────────
// Sized up from the docked sidebar's 16px icons and 36px rows: a floating
// object over content needs more presence than one welded to the edge, and
// a 20px icon in a 44px target is the smallest that still reads as a dock.

export const HEADER_H = 56;
export const INSET = 16;
export const PAD = 10;
export const ROW_GAP = 4;

/**
 * Sizes taken from SearchInput, which is this system's designed chrome
 * control and already answers every one of these questions:
 *
 *   h-11      44px control height
 *   text-ui   15px label — the scale's own "nav, buttons, chrome" step
 *   w-4       16px glyph
 *   gap-3     12px between glyph and label
 *
 * Derived guesses were wrong twice here — a 20px icon by eye, then an 18px
 * icon reasoned from a 1.2x ratio. The component that shipped pairs 16 with
 * 15, so that is the pairing.
 */
export const ROW_H = 44;
export const ICON = 24;
export const LABEL_GAP = 12;

/** Six destinations plus the collapse arrow, which now leads the list. */
export const ROW_COUNT = 7;

export const DOCK_W = ROW_H + PAD * 2; // 64 — a square target plus its padding
export const PANEL_W = 232;
export const BUTTON = DOCK_W; // 64 — the dock, squared

/**
 * The detached close. A circle that the menu pinches off as it opens, sized to
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
 * break, just a smear that distorts the dock's TOP corners while the bottom
 * two — nowhere near the close — stay true. That is the asymmetry where one
 * end of a stadium looks sharper than the other, and it is also the "shadow
 * kinda thing" between the two shapes.
 *
 * 20 clears it outright. The two shapes are properly separate at rest and only
 * merge when the body actually travels up to the anchor on collapse — which is
 * when the liquid moment is supposed to happen anyway.
 */
export const CLOSE_GAP = 20;

/**
 * Every radius is CONCRETE. There is no 999 sentinel anywhere, and that is the
 * whole point.
 *
 * A sentinel is fine for a static style — the browser clamps it to half the
 * short side and you get a pill. It is poison for a tween on a SPRING. The
 * curve overshoots (that is the 1.38), so eased progress passes 1, and
 * interpolating 999 -> 16 at p=1.1 computes:
 *
 *     999 + (16 - 999) * 1.1  =  -82
 *
 * A negative border-radius is invalid, the browser falls back to 0, and the
 * shape renders SQUARE for a frame or two before settling. That is exactly the
 * boxy flash on floating -> dock and on dock -> title bar.
 *
 * With real values the range is 16..32 and even a 38% overshoot stays positive
 * and sane, so the corner can never go invalid.
 *
 * `closeBar` is 16 rather than the panel's 24 because the bar is only ROW_H
 * tall: a 24px corner exceeds half its height, the browser clamps it, and it
 * renders as a pill instead of the rectangle the panel wants beside it.
 */
export const RADIUS = { expanded: 24, closeBar: 16 } as const;

export interface MenuGeometry {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
}

const ANCHOR_TOP = HEADER_H + INSET; // 72

/**
 * Where the menu's BODY sits in each mode.
 *
 * Docked modes run the full available height and simply leave empty space
 * below the rows — a menu that shrink-wraps its list changes height every time
 * the list does, and a nav should be a fixed piece of furniture.
 *
 * Pure and kept out of the component on purpose: it is the entire definition
 * of the morph, and a pure function can be checked without a browser — which
 * matters here, because the browser tooling cannot be relied on to run an
 * animation at all.
 */
export function geometryFor(mode: MenuMode, railWidth: number, shellHeight: number): MenuGeometry {
  if (mode === "floating") {
    // A circle, stated as a number: half the button's side.
    return { left: INSET, top: ANCHOR_TOP, width: BUTTON, height: BUTTON, radius: BUTTON / 2 };
  }
  const top = ANCHOR_TOP + CLOSE_D + CLOSE_GAP; // the body starts below the close
  return {
    left: INSET,
    top,
    width: mode === "rail" ? railWidth : PANEL_W,
    height: Math.max(shellHeight - INSET - top, 0),
    // The dock is a stadium — fully round on its short axis at any dial width,
    // and half that width is exactly the radius that produces it. The panel is
    // a rounded rectangle and keeps its own corner.
    radius: mode === "rail" ? railWidth / 2 : RADIUS.expanded,
  };
}

/**
 * Where the CLOSE sits.
 *
 * It has three jobs, one per mode, and the shape says which:
 *
 *   expanded   a title bar spanning the panel's exact width — the menu names
 *              itself on the left, the × sits at the right
 *   rail       a bare circle; a dock is too narrow for a title and does not
 *              need one
 *   collapsed  concentric with the button, so the two merge into a single
 *              blob rather than stacking
 *
 * Docked, it rides above the body with a gap small enough that the gooey
 * filter still bridges it — it reads as a drop the menu has not quite let go
 * of, which is the point.
 */
export function closeGeometryFor(
  mode: MenuMode,
  railWidth: number,
  shellHeight: number,
): MenuGeometry {
  const body = geometryFor(mode, railWidth, shellHeight);
  // Collapsed, the close does not move anywhere — it scales to nothing where
  // it stands while the body slides up past it. So its box is the dock's.
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
    // detachment reads as a lid lifting off rather than a pill floating above
    // a rectangle.
    return { left: body.left, top: ANCHOR_TOP, width: body.width, height: CLOSE_D, radius: RADIUS.closeBar };
  }
  return {
    // Centred on the DOCK, not on the button. These are the same number at the
    // default 64, which is why it looked fine — but the dock width is a dial,
    // and at any other value the close drifted off the dock's centre line
    // while the button stayed put.
    left: INSET + (railWidth - CLOSE_D) / 2,
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
export function reservedFor(mode: MenuMode, railWidth: number): number {
  if (mode === "floating") return 0;
  return INSET + (mode === "rail" ? railWidth : PANEL_W) + 8;
}

/** Pressing the menu in each mode moves it one step. */
export function stepFrom(mode: MenuMode): MenuMode {
  if (mode === "floating") return "rail"; // the button comes back to icons
  return mode === "expanded" ? "rail" : "expanded";
}

// ── Motion ──────────────────────────────────────────────────

/**
 * SearchInput's own curve — `ease-xn-spring`. The DURATION is no longer its
 * 460ms; see MORPH_MS below.
 *
 * This is what "fluid" actually was, and why nothing here felt like it: the
 * curve OVERSHOOTS and settles back. Expo-out does not, and neither does
 * `--xn-ease-out`; both land dead. A control that springs past its mark and
 * returns reads as something with mass, which is the whole impression.
 *
 * The token lives in tailwind.config on the component branch as
 * `ease-xn-spring`, with its own note: "Overshoots slightly before settling.
 * It stands in for a spring on properties CSS can transition." It is inlined
 * here as a literal because the token is not on main yet — the design-token
 * guard would fail a class naming it, correctly.
 */
export const MORPH_CUBIC = "0.34, 1.38, 0.5, 1";
export const MORPH_EASE_ID = "xnSpring";
export const MORPH_CSS_EASE = `cubic-bezier(${MORPH_CUBIC})`;

/**
 * 560ms, chosen at review rather than inherited.
 *
 * SearchInput uses 460 because its travel is short, so the overshoot reads as
 * a snap. This menu moves a whole panel, and the same curve over a longer
 * distance wants longer to settle. The CURVE is still SearchInput's; only the
 * duration parts company with it, so the provenance note above no longer
 * claims otherwise.
 */
export const MORPH_MS = 560;

// ── Icon zoom ───────────────────────────────────────────────
//
// One icon at a time, not a wave.
//
// The macOS-style magnification was tried and dropped: it grows several rows
// at once by pushing their heights, which on a seven-item vertical dock reads
// as the whole list breathing rather than as a response to the pointer. A dock
// with dozens of icons can carry that; a nav cannot.
//
// So the hovered glyph scales and nothing else moves. It is a transform, which
// means no layout, no neighbour displacement, and no chance of two rows
// overlapping at any zoom.

/** How far the hovered icon zooms. */
export const ICON_ZOOM = 1.4;

/** Short, because it is a response to the pointer, not an event in itself. */
export const ZOOM_MS = 180;

/**
 * Playback rate for every icon loop, applied as a GSAP timeScale rather than
 * baked into each builder — so one dial slows the whole set and no individual
 * timeline has to be rewritten to retune it.
 *
 * Below 1 is slower. A door that swings at full rate reads as flapping.
 */
export const ICON_SPEED = 0.8;

/**
 * The choreography, as fractions of the morph.
 *
 * Deliberately thin. SearchInput sequences nothing at all — it transitions two
 * properties on one curve and lets the goo do the rest. The staged reveal that
 * was here (ground at an eighth, rows at halfway, a separate fast height snap)
 * came from the outside reference and was fighting the spring: a curve that
 * overshoots wants to be the whole event, not the first of four.
 *
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

export interface MenuEntry {
  id: string;
  label: string;
  /** Destinations that do not exist yet render inert, as they do in the app. */
  unavailable?: boolean;
}

export const MENU_ENTRIES: MenuEntry[] = [
  { id: "home", label: "Home" },
  { id: "create", label: "Create" },
  { id: "history", label: "History" },
  { id: "folders", label: "Folders" },
  { id: "extension", label: "Extension", unavailable: true },
  { id: "settings", label: "Settings", unavailable: true },
];

/**
 * The panel's hover, taken from the reference button's mechanic rather than its
 * looks: zoom the glyph and sink it so its container crops it, and the whole
 * icon is never shown.
 *
 * The reference does this inside a circle where the icon and the label occupy
 * the SAME space — the icon sinks out of the bottom as the label drops in from
 * above. Our panel row already has the label beside the glyph, so "which box
 * crops it" is a real fork, and both answers are built:
 *
 *   slot  the glyph's own 16px box crops it. Nothing else in the row moves.
 *   row   the glyph travels to the row's centre and the row's pill crops it,
 *         with the title lifting to sit above it. The chosen one.
 *
 * ── Where the loops went ──
 *
 * Every nav row now follows one rule: the in-glyph loop belongs to the DOCK,
 * and the panel gets this crop instead. Those loops turn, spin and unfold in
 * place — motion that reads as a small mechanism, which suits an icon standing
 * alone in a 44px square but competes with the label beside it in the panel.
 *
 * Folders was the exception for a while, on the argument that unfolding
 * survives sitting next to a word where spinning does not. It now follows the
 * same rule as the rest, which is why there is no longer a set of ids to keep
 * in step with the entries. The only glyph still looping in both modes is the
 * panel arrow, and that is not a nav entry at all.
 */
export type ExpandedHover = "slot" | "row";

export const EXPANDED_HOVERS: ExpandedHover[] = ["slot", "row"];
export const EXPANDED_HOVER_LABEL: Record<ExpandedHover, string> = {
  slot: "Cut by the slot",
  row: "Cut by the row",
};

export interface PanelHoverSettings {
  variant: ExpandedHover;
  /** "Little zoom", per the brief — not the reference's 4.2x. */
  zoom: number;
  /** Fraction of the zoomed glyph pushed below the container's bottom edge. */
  crop: number;
}

/**
 * Crop is a fraction of the zoomed glyph, so what it means in pixels depends on
 * the icon and zoom dials. At the shipped 16px icon and 1.9x zoom the glyph is
 * 30.4px, so 0.4 cuts 12.16px — 1.52px more than the 0.35 it replaced.
 */
export const PANEL_HOVER: PanelHoverSettings = { variant: "row", zoom: 1.8, crop: 0.4 };
export const PANEL_HOVER_MS = 300;

/**
 * How far the glyph travels to reach the row's horizontal centre.
 *
 * Derived, not measured: the row's left padding is exactly the leftover beside
 * the glyph, (ROW_H - iconPx) / 2, so the glyph's centre always lands on
 * ROW_H / 2 whatever the icon dial is set to. The travel is therefore a
 * constant and does not need a ref or a resize observer.
 */
export const HOVER_TO_CENTRE = (PANEL_W - PAD * 2) / 2 - ROW_H / 2;

/**
 * The downward travel that leaves exactly `crop` of the zoomed glyph below the
 * container's bottom edge.
 *
 * Solving `containerH / 2 + glyphH / 2 + sink - containerH = crop * glyphH`
 * for sink. Expressing it as a fraction cropped rather than as raw pixels is
 * what makes the two variants comparable: the slot is 16px tall and the row is
 * 44px, so one shared pixel offset would crop them by wildly different amounts
 * and the comparison would be about the number rather than about the idea.
 */
export function hoverSink(containerH: number, glyphH: number, crop: number) {
  return (containerH - glyphH) / 2 + crop * glyphH;
}

/** The title's rendered line box — measured, 15px text on a 22.5px line. */
export const TITLE_H = 19.5;

/**
 * The panel bar's own title, beside a close glyph sized `iconPx * 1.5` = 24.
 *
 * "Match the close size" has no single right answer, because the glyph is a
 * dashed path that morphs: getBBox reports the hamburger's whole geometry
 * (17.25 x 23.25px) whether or not the dashes are currently hiding half of it,
 * so there is no honest single number for how big the X *looks*. Measured
 * candidates, all against this face's 0.73 cap-height ratio:
 *
 *   15   the row titles' own step, so the bar and the rows read as one scale
 *   19   the label's line box (15.5px at 12px) matches the glyph's 24px box
 *   24   literally the number the glyph is sized with
 *   28   cap height equals the X's visual extent — optically equal, and large
 *
 * 19 is the default: the closest thing to "the same size" that is
 * typographically meaningful rather than arithmetically coincidental.
 */
export const MENU_TITLE_PX = 20;

/**
 * The gap left between the title's line box and the glyph's top edge.
 *
 * Measured against the LINE BOX rather than the ink, so a word with a
 * descender — Settings has one — cannot collide with the glyph while a word
 * without one looks correctly spaced.
 */
export const TITLE_GAP = 1.5;

/** Weight the title takes while its row is hovered. DM Sans is variable, so
 *  this eases rather than snapping, and the extra width grows symmetrically
 *  about the centred text so nothing shifts. */
export const TITLE_HOVER_WEIGHT = 600;

/**
 * How far the title lifts so the sinking glyph has room beneath it.
 *
 * Derived from the crop rather than dialled separately, so the two cannot drift
 * apart: the glyph's visible band starts at `rowH - glyphH * (1 - crop)`, and
 * the title sits a fixed gap above it. Turn the zoom or crop dial and the lift
 * follows on its own.
 *
 * ── Why a gap and not a centring ──
 *
 * This used to centre the title in whatever height the glyph left above it,
 * which sounds tidier and looked wrong: centring gives the row's top edge and
 * the glyph an IDENTICAL gap, so at the default crop the title had 3.13px above
 * and 3.13px below and read as jammed against the top of the row. Anchoring to
 * the glyph instead spends the spare height upward, where there is a whole row
 * edge to breathe against rather than a piece of artwork.
 *
 * The cap is not decoration. Past a certain zoom the glyph leaves less room
 * than the title needs, and the ideal lift would carry the word out through the
 * top of the row. When the two cannot both fit, this stops lifting rather than
 * clipping the word: the title stays whole and the glyph is allowed to come
 * closer. Readable beats tidy.
 *
 * ── This works in ENVELOPES, and that is deliberate ──
 *
 * TITLE_H is the line box, not the ink, and the glyph's height is its box, not
 * its drawing. Both are bigger than what you can actually see, so this reports
 * a collision well before one is visible: at icon 24, zoom 1.8, crop 0.4 the
 * envelopes overlap by 1.42px while the real ink still clears by 2.03px at the
 * worst word. That was called a bug on 2026-09-03 and is not one — Hemanth was
 * looking at the render and was right.
 *
 * DO NOT "fix" this by switching to ink metrics. The line box carries ~5px of
 * unused descent below most of these words, so an ink-based lift would raise
 * the title a further 2.9px and put the visible text about 1px off the row's
 * top edge — the exact complaint the lift was added to solve. The envelope's
 * conservatism is what leaves 4.05px of optical breathing room above the text.
 *
 * The two words that actually get close are the descenders, and the tighter one
 * is not the obvious one: History's `y` clears by 2.03px where Settings' `g`
 * clears by 2.86px.
 *
 * The floor matters at the other end: with a small glyph and a deep crop there
 * is already room to spare, and the title should stay where it is rather than
 * be pushed DOWN into the glyph by a negative lift.
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
 * (icon + gap) to the right of the row's centre — so shifting it back by that
 * much lands it on the row's axis, which is where the glyph travels to. Both
 * end up on one vertical line, which is the whole point of the composition.
 * Independent of the row's width, so no measuring.
 */
export function titleCentreShift(iconPx: number) {
  return -(iconPx + LABEL_GAP) / 2;
}
