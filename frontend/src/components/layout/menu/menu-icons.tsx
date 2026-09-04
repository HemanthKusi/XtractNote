"use client";

// src/components/layout/menu/menu-icons.tsx
//
// Animated nav icons.
//
// ── The contract ──
//
// Static at rest. While the pointer is on the row the icon loops; when it
// leaves, the loop finishes its current cycle and stops at rest. It never
// snaps mid-pose and it never plays unprompted — which is the motion policy's
// one behavioural rule, the one about control rather than looks.
//
// ── Why the animation lives INSIDE the svg ──
//
// The dock zoom already writes `transform` on the glyph wrapper. If an icon
// animation also wrote `transform` on that same element the two would
// overwrite each other every frame — the same ownership clash that made the
// menu morph look broken.
//
// So the split is strict:
//
//   wrapper  transform: scale()   owned by React, the zoom
//   inside   parts of the svg     owned by GSAP, the loop
//
// They compose rather than compete, and moving the parts is what an icon
// animation is supposed to do anyway.
//
// ── The set ──
//
// All six are real: Home, Create, History, Folders and Settings are drawn from
// supplied artwork, and Extension is drawn to a written brief. No placeholders
// remain. Every one is on the 24 grid and inherits currentColor,
// so they take the row's active, dim and hover states for free.
//
// The panel arrow at the foot of this file is a seventh animated icon but NOT
// a nav destination, so it stays out of MENU_ICONS and is exported on its own.
// It is the only one that takes a direction, because it is the only one whose
// drawing changes with the menu's state.
//
// ── The one rule they all obey ──
//
// A cycle MUST end where it began, or stopping on pointer-leave jumps. Each
// icon satisfies it differently, and the difference is the interesting part:
//
//   Home       swings the door back
//   Create     four-fold symmetry — 90 degrees is indistinguishable from 0
//   History    whole revolutions, 2:1, so both hands land together
//   Folders    the leaves unfold and refold
//   Extension  each edge re-forms into the ideal arrangement
//   Settings   whole revolutions of the gear
//
// ── Adding another ──
//
// Each icon is a component with a `build` function returning its timeline.
// A new one means new paths plus that builder; no other file changes.

import { useEffect, useId, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export interface AnimatedIconProps {
  /** True while the pointer is on this row. */
  playing: boolean;
  size: number;
  /** Reduced motion holds every icon at rest. */
  reduced?: boolean;
  /** Playback rate for the loop. Below 1 is slower. */
  speed?: number;
}

type Build = (root: SVGSVGElement) => gsap.core.Timeline;

/**
 * Starts the loop on hover and lets it LAND on leave.
 *
 * Two bugs lived here, and both are worth spelling out because neither is
 * obvious from reading the happy path.
 *
 * 1. `play()` on a FINISHED timeline does nothing. Once the loop had stopped,
 *    the playhead sat at the end, so the first hover animated and every hover
 *    afterwards was silently dead. A timeline that has run to completion has to
 *    be sent back to the start, not merely told to play.
 *
 * 2. `repeat(0)` alone does not "finish the current cycle". It shortens the
 *    total duration to a single iteration — so a playhead on iteration 3 is
 *    suddenly past the end and GSAP clamps it there, snapping the icon to rest
 *    instead of walking it home. Keeping the position WITHIN the cycle
 *    (`totalTime(time())`) is what actually makes it land.
 */
function useIconLoop(build: Build, playing: boolean, reduced?: boolean, speed = 1) {
  const ref = useRef<SVGSVGElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      if (!ref.current || reduced) return;
      if (!tl.current) tl.current = build(ref.current).pause();
      const t = tl.current;
      // Retunes an existing loop in place — no rebuild, and it takes effect
      // mid-cycle if the dial moves while the pointer is down.
      t.timeScale(speed);

      if (playing) {
        // play(0) — not play(). The argument is the whole fix: it sends the
        // playhead back to the start, where a bare play() on a finished
        // timeline just sits at the end doing nothing.
        //
        // Unconditional on purpose. An earlier version guarded this with
        // `if (!isActive())` to avoid restarting mid-landing, and that guard
        // put the second hover straight back on the broken path. Restarting
        // from the cycle's start is harmless anyway: the start IS the rest
        // pose, which is where a landing was heading.
        t.repeat(-1);
        t.play(0);
      } else if (t.isActive()) {
        const withinCycle = t.time(); // 0..duration, ignoring repeats
        t.repeat(0);
        t.totalTime(withinCycle); // stay put, then run out the rest of the cycle
        t.play();
      }
    },
    { dependencies: [playing, reduced, speed] },
  );

  return ref;
}

function Svg({
  innerRef,
  size,
  children,
  box = 20,
}: {
  innerRef: React.Ref<SVGSVGElement>;
  size: number;
  children: React.ReactNode;
  /** Supplied icons are drawn on a 24 grid; the stroked placeholders on 20. */
  box?: number;
}) {
  return (
    <svg
      ref={innerRef}
      viewBox={`0 0 ${box} ${box}`}
      width={size}
      height={size}
      fill="currentColor"
      style={{ overflow: "visible" }}
    >
      {children}
    </svg>
  );
}

// ── Home — the door swings, the frame does not ─────────────
//
// The supplied path for the doorway is a COMPOUND path: an outer rounded rect
// and an inner one, so it fills as a hollow ring. That ring is the door FRAME,
// and it is part of the house — swinging it swung the wall with it, which is
// exactly what it looked like.
//
// The artwork has no separate door leaf, so the fix is to give it one. The
// frame stays put, verbatim, and a leaf fills the opening it describes:
//
//   frame  the supplied ring, untouched, static
//   leaf   the ring's INNER contour, now filled in its own right
//   handle a knockout in the leaf, via fill-rule evenodd, so it travels with
//          the door and reads as a hole rather than a floating mark
//
// The handle sits at x=10, left of the leaf's centre at x=12, so the hinge is
// the leaf's RIGHT edge at x=16.25. scaleX about that edge turns the door
// without needing perspective, and now nothing but the door moves.
//
// NOTE: this changes the icon at REST. The doorway used to be hollow; it is
// now a solid leaf with a handle cut out of it. That is the price of a door
// that can move independently of its frame — there was nothing else in the
// drawing that could be the door.
const DOOR_HINGE_X = 16.25;

const HOUSE_GROUND =
  "M22 22.75H2C1.59 22.75 1.25 22.41 1.25 22C1.25 21.59 1.59 21.25 2 21.25H22C22.41 21.25 22.75 21.59 22.75 22C22.75 22.41 22.41 22.75 22 22.75Z";
const HOUSE_WALLS =
  "M3.7002 22.0007H2.2002L2.2502 9.97069C2.2502 9.12069 2.6402 8.33072 3.3102 7.81072L10.3102 2.3607C11.3002 1.5907 12.6902 1.5907 13.6902 2.3607L20.6902 7.80071C21.3502 8.32071 21.7502 9.13069 21.7502 9.97069V22.0007H20.2502V9.9807C20.2502 9.6007 20.0702 9.23071 19.7702 8.99071L12.7702 3.55071C12.3202 3.20071 11.6902 3.20071 11.2302 3.55071L4.2302 9.00072C3.9302 9.23072 3.7502 9.6007 3.7502 9.9807L3.7002 22.0007Z";
const HOUSE_VENT =
  "M13.5 8.25H10.5C10.09 8.25 9.75 7.91 9.75 7.5C9.75 7.09 10.09 6.75 10.5 6.75H13.5C13.91 6.75 14.25 7.09 14.25 7.5C14.25 7.91 13.91 8.25 13.5 8.25Z";
// The supplied compound path, unchanged — outer contour then inner contour.
const DOOR_FRAME =
  "M17 22.75H7C6.59 22.75 6.25 22.41 6.25 22V12.5C6.25 11.26 7.26 10.25 8.5 10.25H15.5C16.74 10.25 17.75 11.26 17.75 12.5V22C17.75 22.41 17.41 22.75 17 22.75ZM7.75 21.25H16.25V12.5C16.25 12.09 15.91 11.75 15.5 11.75H8.5C8.09 11.75 7.75 12.09 7.75 12.5V21.25Z";
// The frame's inner contour, reused as the leaf so the two agree exactly.
const DOOR_LEAF =
  "M7.75 21.25H16.25V12.5C16.25 12.09 15.91 11.75 15.5 11.75H8.5C8.09 11.75 7.75 12.09 7.75 12.5V21.25Z";
const DOOR_HANDLE =
  "M10 18.5C9.59 18.5 9.25 18.16 9.25 17.75V16.25C9.25 15.84 9.59 15.5 10 15.5C10.41 15.5 10.75 15.84 10.75 16.25V17.75C10.75 18.16 10.41 18.5 10 18.5Z";

export function HomeIcon({ playing, size, reduced, speed }: AnimatedIconProps) {
  const ref = useIconLoop(
    (root) =>
      gsap
        .timeline()
        .to(root.querySelector("[data-door]"), {
          scaleX: 0.14,
          svgOrigin: `${DOOR_HINGE_X} 16.5`,
          duration: 0.55,
          ease: "power2.inOut",
        })
        .to(root.querySelector("[data-door]"), {
          scaleX: 1,
          svgOrigin: `${DOOR_HINGE_X} 16.5`,
          duration: 0.55,
          ease: "power2.inOut",
          // A held beat at full open. A door that turns straight back the
          // instant it arrives reads as flapping rather than opening.
          delay: 0.12,
        }),
    playing,
    reduced,
    speed,
  );
  return (
    <Svg innerRef={ref} size={size} box={24}>
      <path d={HOUSE_GROUND} />
      <path d={HOUSE_WALLS} />
      <path d={HOUSE_VENT} />
      <path d={DOOR_FRAME} />
      <g data-door>
        <path fillRule="evenodd" d={`${DOOR_LEAF} ${DOOR_HANDLE}`} />
      </g>
    </Svg>
  );
}

// ── Create — the plus pulls in, then turns back out ────────
//
// Supplied icon. The backdrop keeps its 0.4 opacity; only the hardcoded white
// becomes currentColor, exactly as the home icon does.
//
// The cycle: the plus shrinks away, then grows back WHILE turning a quarter,
// and the box turns with it and arrives square again.
//
// Both shapes have four-fold symmetry — a plus at 90 degrees and a rounded
// square at 90 degrees are indistinguishable from their rest pose. So the
// timeline can end a quarter turn from where it started and the loop's reset
// to zero is invisible. That is what lets this run continuously without a
// return leg: the return is free.
const CREATE_BOX =
  "M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2Z";
const CREATE_PLUS =
  "M18 11.25H12.75V6C12.75 5.59 12.41 5.25 12 5.25C11.59 5.25 11.25 5.59 11.25 6V11.25H6C5.59 11.25 5.25 11.59 5.25 12C5.25 12.41 5.59 12.75 6 12.75H11.25V18C11.25 18.41 11.59 18.75 12 18.75C12.41 18.75 12.75 18.41 12.75 18V12.75H18C18.41 12.75 18.75 12.41 18.75 12C18.75 11.59 18.41 11.25 18 11.25Z";

// Both paths are centred on 12,12, so one origin serves the whole icon.
const CREATE_ORIGIN = "12 12";

export function CreateIcon({ playing, size, reduced, speed }: AnimatedIconProps) {
  const ref = useIconLoop(
    (root) => {
      const plus = root.querySelector("[data-plus]");
      const box = root.querySelector("[data-box]");
      return gsap
        .timeline()
        // Pull in first, so the turn has something to unwind from.
        .to(plus, { scale: 0.4, svgOrigin: CREATE_ORIGIN, duration: 0.34, ease: "power2.in" })
        // Grow back and turn in the same movement, not one after the other.
        .to(plus, {
          scale: 1,
          rotate: 90,
          svgOrigin: CREATE_ORIGIN,
          duration: 0.62,
          ease: "back.out(1.5)",
        })
        // The box turns on the same beat and lands square. "<" starts it with
        // the tween above rather than after it.
        .to(box, { rotate: 90, svgOrigin: CREATE_ORIGIN, duration: 0.62, ease: "power2.inOut" }, "<");
    },
    playing,
    reduced,
    speed,
  );
  return (
    <Svg innerRef={ref} size={size} box={24}>
      <path data-box opacity={0.4} d={CREATE_BOX} />
      <path data-plus d={CREATE_PLUS} />
    </Svg>
  );
}

// ── History — two hands, two speeds, one meeting point ─────
//
// Supplied icon. The dial is kept verbatim; the hands are not, because they
// cannot be.
//
// The supplied artwork draws BOTH hands as a single filled path — one L-shaped
// outline joined at the pivot. Two hands that turn at different rates cannot
// be one shape, so they are split into a short hand and a long one, drawn as
// round-capped strokes. A stroke with a round cap renders exactly the capsule
// the original outline describes, so the split costs nothing visually.
//
// They also now pivot on the dial's true centre (12,12) rather than the
// original's joint at roughly (11.64, 11.61). Half a unit, and it is the
// difference between hands that turn and hands that wobble.
//
// The rates are 2:1 — the long hand goes round twice while the short goes
// round once. That satisfies all three requirements at once: they start
// together, they visibly differ in speed, and because both counts are whole
// turns they arrive back at their starting angles on the same frame. Whole
// turns are also what lets the loop reset invisibly.
const CLOCK_DIAL =
  "M12 22.75C6.07 22.75 1.25 17.93 1.25 12C1.25 6.07 6.07 1.25 12 1.25C17.93 1.25 22.75 6.07 22.75 12C22.75 17.93 17.93 22.75 12 22.75ZM12 2.75C6.9 2.75 2.75 6.9 2.75 12C2.75 17.1 6.9 21.25 12 21.25C17.1 21.25 21.25 17.1 21.25 12C21.25 6.9 17.1 2.75 12 2.75Z";
const CLOCK_PIVOT = "12 12";
/** Stroke width taken from the original outline: 12.39 - 10.89. */
const HAND_W = 1.5;

export function HistoryIcon({ playing, size, reduced, speed }: AnimatedIconProps) {
  const ref = useIconLoop(
    (root) => {
      const short = root.querySelector("[data-hand-short]");
      const long = root.querySelector("[data-hand-long]");
      const spin = { svgOrigin: CLOCK_PIVOT, duration: 1.8, ease: "none" };
      return gsap
        .timeline()
        .to(short, { rotate: 360, ...spin }, 0)
        .to(long, { rotate: 720, ...spin }, 0); // same start, twice the rate
    },
    playing,
    reduced,
    speed,
  );
  return (
    <Svg innerRef={ref} size={size} box={24}>
      <path d={CLOCK_DIAL} />
      {/* short hand — up to twelve, the original's vertical arm */}
      <line
        data-hand-short
        x1="12"
        y1="12"
        x2="12"
        y2="7.5"
        stroke="currentColor"
        strokeWidth={HAND_W}
        strokeLinecap="round"
      />
      {/* long hand — the original's diagonal arm */}
      <line
        data-hand-long
        x1="12"
        y1="12"
        x2="16.1"
        y2="14.53"
        stroke="currentColor"
        strokeWidth={HAND_W}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ── Folders — the leaves fold down off the back ────────────
//
// Built from BOTH supplied states, and the open one settled every question.
//
// The open artwork turned out to be three STROKED outlines, not filled
// layers — which is the monochrome answer: outlines separate by their own
// gaps, where same-hue fills merge into a blob however far they fan.
//
// And its three layers are the SAME folder, scaled vertically about its bottom
// edge. Read straight off the supplied path data:
//
//   main   top -10.00, bottom 10  ->  height 20.00  ->  1.000
//   leaf   top  -7.96, bottom 10  ->  height 17.96  ->  0.898   = cos(26deg)
//   leaf   top  -4.84, bottom 10  ->  height 14.84  ->  0.742   = cos(42deg)
//
// So it is the fold after all, and the earlier scaleY(cos theta) reasoning was
// right — it was applied to the wrong kind of shape. One path, drawn three
// times, scaled about its base. At rest all three sit exactly on top of one
// another and read as the single closed folder.
//
// The supplied open path is centred on 13.75,13.75 in a 25 box and spans
// -10..10, so translating it by +12 lands it exactly on this project's 24 grid
// at 2..22 — the same 20x20 the closed icon occupies. The two states are the
// same drawing, which is why no reconciliation was needed.
const FOLDER_OUTLINE =
  "M22 11C22 11 22 17 22 17C22 21 21 22 17 22C17 22 7 22 7 22C3 22 2 21 2 17C2 17 2 7 2 7C2 3 3 2 7 2C7 2 8.5 2 8.5 2C10 2 10.33 2.44 10.9 3.2C10.9 3.2 12.4 5.2 12.4 5.2C12.78 5.7 13 6 14 6C14 6 17 6 17 6C21 6 22 7 22 11Z";

/** Its bottom edge — the hinge every leaf turns about. */
const FOLDER_BASE = "12 22";
/** Taken from the supplied open state, not chosen. */
const LEAF_FOLD = [0.898, 0.742];

export function FoldersIcon({ playing, size, reduced, speed }: AnimatedIconProps) {
  const ref = useIconLoop(
    (root) => {
      const leaves = [...root.querySelectorAll<SVGElement>("[data-leaf]")];
      const tl = gsap.timeline();
      leaves.forEach((leaf, i) => {
        tl.to(
          leaf,
          {
            scaleY: LEAF_FOLD[i],
            // The frontmost leaf splays very slightly wider in the artwork
            // (its edges reach 10.4 and -10.68 rather than +/-10).
            scaleX: i === LEAF_FOLD.length - 1 ? 1.04 : 1,
            svgOrigin: FOLDER_BASE,
            duration: 0.5,
            ease: "power3.out",
          },
          i * 0.06,
        );
      });
      // Shut again, front leaf first, so the stack closes in order.
      tl.to(
        [...leaves].reverse(),
        { scaleY: 1, scaleX: 1, svgOrigin: FOLDER_BASE, duration: 0.42, stagger: 0.05, ease: "power2.inOut" },
        1.15,
      );
      return tl;
    },
    playing,
    reduced,
    speed,
  );
  return (
    <Svg innerRef={ref} size={size} box={24}>
      {/* the back of the folder, which never folds */}
      <path d={FOLDER_OUTLINE} fill="none" stroke="currentColor" strokeWidth={1.5} />
      {/* two leaves, identical to it, parting only by how far they fold */}
      {LEAF_FOLD.map((_, i) => (
        <path key={i} data-leaf d={FOLDER_OUTLINE} fill="none" stroke="currentColor" strokeWidth={1} />
      ))}
    </Svg>
  );
}

// ── Extension — the piece turns, each edge re-forms ────────
//
// Two wrong readings preceded this one, and the difference is worth stating.
//
//   1. Rotating the whole piece. The silhouette changed every quarter turn,
//      because an asymmetric piece does.
//   2. Orbiting the features around a fixed body. The hinges travelled around
//      the perimeter, which is not what happens either.
//
// What actually happens: the WHOLE PIECE turns, and every edge MORPHS its own
// feature during the turn so that the arrangement lands back on the ideal one.
// The hinges do not slide anywhere. Each edge re-forms in place.
//
//   the edge leaving the left    arrives at the top    notch  -> tab
//   the edge leaving the top     arrives at the right   tab   -> tab (no change)
//   the edge leaving the right   arrives at the bottom  tab   -> flat
//   the edge leaving the bottom  arrives at the left    flat  -> notch
//
// So after 90 degrees the piece is INDISTINGUISHABLE from where it started —
// which is what "maintain the ideal shape for every rotation" means, and it is
// also why a single quarter turn is a whole cycle here. The loop resets to zero
// with nothing to see, where the earlier versions needed four turns to close.
//
// ── How an edge changes shape ──
//
// Each feature is one cubic whose control points are pushed along the edge's
// OUTWARD NORMAL by a signed amount:
//
//   p = +1  full outward tab
//   p =  0  dead flat — the control points land on the edge itself
//   p = -1  full inward notch
//
// One number per edge, and it passes through flat on its way between the two,
// so a notch becomes a tab without ever cutting or redrawing anything. Arcs
// could not do this: an arc's bulge direction is a discrete flag, not a value
// you can animate through zero.
//
// The control points are also spread 1.3 ALONG the edge, past its endpoints.
// That overshoot is what gives a tab its neck; without it the bump is a plain
// dome and stops reading as a puzzle piece.
const BODY_MIN = 5;
const BODY_MAX = 19;
const FEATURE_FROM = 10.2;
const FEATURE_TO = 13.8;
const NECK = 1.3; // spread along the edge, which makes the neck
const REACH = 4.5; // control-point throw along the normal at p = 1

/** Clockwise: top, right, bottom, left. Each carries its outward normal. */
const PUZZLE_EDGES = [
  { sx: FEATURE_FROM, sy: BODY_MIN, ex: FEATURE_TO, ey: BODY_MIN, nx: 0, ny: -1 },
  { sx: BODY_MAX, sy: FEATURE_FROM, ex: BODY_MAX, ey: FEATURE_TO, nx: 1, ny: 0 },
  { sx: FEATURE_TO, sy: BODY_MAX, ex: FEATURE_FROM, ey: BODY_MAX, nx: 0, ny: 1 },
  { sx: BODY_MIN, sy: FEATURE_TO, ex: BODY_MIN, ey: FEATURE_FROM, nx: -1, ny: 0 },
];

/** The cubic for one edge at protrusion p. */
function featureCurve(e: (typeof PUZZLE_EDGES)[number], p: number) {
  const len = Math.hypot(e.ex - e.sx, e.ey - e.sy);
  const tx = (e.ex - e.sx) / len;
  const ty = (e.ey - e.sy) / len;
  const ox = e.nx * REACH * p;
  const oy = e.ny * REACH * p;
  const c1x = e.sx - tx * NECK + ox;
  const c1y = e.sy - ty * NECK + oy;
  const c2x = e.ex + tx * NECK + ox;
  const c2y = e.ey + ty * NECK + oy;
  return `C${c1x.toFixed(3)} ${c1y.toFixed(3)} ${c2x.toFixed(3)} ${c2y.toFixed(3)} ${e.ex} ${e.ey}`;
}

/** The whole outline, corners and all, for the four current protrusions. */
function puzzleOutline(p: number[]) {
  const [t, r, b, l] = PUZZLE_EDGES;
  return [
    `M7 ${BODY_MIN}`,
    `L${t.sx} ${t.sy}`, featureCurve(t, p[0]), `L17 ${BODY_MIN}`,
    `A2 2 0 0 1 ${BODY_MAX} 7`,
    `L${r.sx} ${r.sy}`, featureCurve(r, p[1]), `L${BODY_MAX} 17`,
    `A2 2 0 0 1 17 ${BODY_MAX}`,
    `L${b.sx} ${b.sy}`, featureCurve(b, p[2]), `L7 ${BODY_MAX}`,
    `A2 2 0 0 1 ${BODY_MIN} 17`,
    `L${l.sx} ${l.sy}`, featureCurve(l, p[3]), `L${BODY_MIN} 7`,
    `A2 2 0 0 1 7 ${BODY_MIN}`,
    "Z",
  ].join(" ");
}

/** Just the bump, closed by its chord, so only an OUTWARD tab gets filled. */
function featureFill(e: (typeof PUZZLE_EDGES)[number], p: number) {
  return `M${e.sx} ${e.sy} ${featureCurve(e, p)} Z`;
}

/** Ideal arrangement: tab, tab, flat, notch — clockwise from the top. */
const IDEAL = [1, 1, 0, -1];
/** Where each edge must arrive after one clockwise quarter turn. */
const AFTER_TURN = [1, 0, -1, 1];

export function ExtensionIcon({ playing, size, reduced, speed }: AnimatedIconProps) {
  const ref = useIconLoop(
    (root) => {
      const group = root.querySelector("[data-piece]");
      const outline = root.querySelector("[data-outline]");
      const fills = [...root.querySelectorAll<SVGPathElement>("[data-fill]")];
      const state = { p: [...IDEAL] };

      const redraw = () => {
        outline?.setAttribute("d", puzzleOutline(state.p));
        fills.forEach((el, i) => {
          el.setAttribute("d", featureFill(PUZZLE_EDGES[i], state.p[i]));
          // A tab is solid; a notch is hollow. Fade the fill out as the
          // protrusion crosses zero so the change reads as re-forming rather
          // than as ink appearing.
          el.setAttribute("opacity", String(Math.max(0, state.p[i])));
        });
      };

      return gsap
        .timeline()
        .to(group, { rotate: 90, svgOrigin: "12 12", duration: 0.9, ease: "power2.inOut" }, 0)
        // Tween the array's indices by name. Spreading the array instead pulls
        // its methods in as tween properties, and GSAP tries to animate them.
        .to(
          state.p,
          {
            0: AFTER_TURN[0],
            1: AFTER_TURN[1],
            2: AFTER_TURN[2],
            3: AFTER_TURN[3],
            duration: 0.9,
            ease: "power2.inOut",
            onUpdate: redraw,
          },
          0,
        )
        .to({}, { duration: 0.35 }); // a beat before it goes round again
    },
    playing,
    reduced,
    speed,
  );
  return (
    <Svg innerRef={ref} size={size} box={24}>
      <g data-piece>
        <path
          data-outline
          d={puzzleOutline(IDEAL)}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        {PUZZLE_EDGES.map((e, i) => (
          <path key={i} data-fill d={featureFill(e, IDEAL[i])} opacity={Math.max(0, IDEAL[i])} />
        ))}
      </g>
    </Svg>
  );
}

// ── Settings — the cog turns a quarter at a time ───────────
//
// Supplied icon, verbatim. Hardcoded white becomes currentColor and the
// no-op clip path is dropped, as with the others.
//
// Same rhythm as the puzzle piece: a quarter turn, a beat, round again.
//
// Whether that can be ONE step or needs four depends on the gear's own
// symmetry, which is measured rather than assumed — see COG_STEPS below.
const COG_HOLE =
  "M12 15.75C9.93 15.75 8.25 14.07 8.25 12C8.25 9.93 9.93 8.25 12 8.25C14.07 8.25 15.75 9.93 15.75 12C15.75 14.07 14.07 15.75 12 15.75ZM12 9.75C10.76 9.75 9.75 10.76 9.75 12C9.75 13.24 10.76 14.25 12 14.25C13.24 14.25 14.25 13.24 14.25 12C14.25 10.76 13.24 9.75 12 9.75Z";
const COG_BODY =
  "M15.21 22.1903C15 22.1903 14.79 22.1603 14.58 22.1103C13.96 21.9403 13.44 21.5503 13.11 21.0003L12.99 20.8003C12.4 19.7803 11.59 19.7803 11 20.8003L10.89 20.9903C10.56 21.5503 10.04 21.9503 9.42 22.1103C8.79 22.2803 8.14 22.1903 7.59 21.8603L5.87 20.8703C5.26 20.5203 4.82 19.9503 4.63 19.2603C4.45 18.5703 4.54 17.8603 4.89 17.2503C5.18 16.7403 5.26 16.2803 5.09 15.9903C4.92 15.7003 4.49 15.5303 3.9 15.5303C2.44 15.5303 1.25 14.3403 1.25 12.8803V11.1203C1.25 9.66029 2.44 8.47029 3.9 8.47029C4.49 8.47029 4.92 8.30029 5.09 8.01029C5.26 7.72029 5.19 7.26029 4.89 6.75029C4.54 6.14029 4.45 5.42029 4.63 4.74029C4.81 4.05029 5.25 3.48029 5.87 3.13029L7.6 2.14029C8.73 1.47029 10.22 1.86029 10.9 3.01029L11.02 3.21029C11.61 4.23029 12.42 4.23029 13.01 3.21029L13.12 3.02029C13.8 1.86029 15.29 1.47029 16.43 2.15029L18.15 3.14029C18.76 3.49029 19.2 4.06029 19.39 4.75029C19.57 5.44029 19.48 6.15029 19.13 6.76029C18.84 7.27029 18.76 7.73029 18.93 8.02029C19.1 8.31029 19.53 8.48029 20.12 8.48029C21.58 8.48029 22.77 9.67029 22.77 11.1303V12.8903C22.77 14.3503 21.58 15.5403 20.12 15.5403C19.53 15.5403 19.1 15.7103 18.93 16.0003C18.76 16.2903 18.83 16.7503 19.13 17.2603C19.48 17.8703 19.58 18.5903 19.39 19.2703C19.21 19.9603 18.77 20.5303 18.15 20.8803L16.42 21.8703C16.04 22.0803 15.63 22.1903 15.21 22.1903ZM12 18.4903C12.89 18.4903 13.72 19.0503 14.29 20.0403L14.4 20.2303C14.52 20.4403 14.72 20.5903 14.96 20.6503C15.2 20.7103 15.44 20.6803 15.64 20.5603L17.37 19.5603C17.63 19.4103 17.83 19.1603 17.91 18.8603C17.99 18.5603 17.95 18.2503 17.8 17.9903C17.23 17.0103 17.16 16.0003 17.6 15.2303C18.04 14.4603 18.95 14.0203 20.09 14.0203C20.73 14.0203 21.24 13.5103 21.24 12.8703V11.1103C21.24 10.4803 20.73 9.96029 20.09 9.96029C18.95 9.96029 18.04 9.52029 17.6 8.75029C17.16 7.98029 17.23 6.97029 17.8 5.99029C17.95 5.73029 17.99 5.42029 17.91 5.12029C17.83 4.82029 17.64 4.58029 17.38 4.42029L15.65 3.43029C15.22 3.17029 14.65 3.32029 14.39 3.76029L14.28 3.95029C13.71 4.94029 12.88 5.50029 11.99 5.50029C11.1 5.50029 10.27 4.94029 9.7 3.95029L9.59 3.75029C9.34 3.33029 8.78 3.18029 8.35 3.43029L6.62 4.43029C6.36 4.58029 6.16 4.83029 6.08 5.13029C6 5.43029 6.04 5.74029 6.19 6.00029C6.76 6.98029 6.83 7.99029 6.39 8.76029C5.95 9.53029 5.04 9.97029 3.9 9.97029C3.26 9.97029 2.75 10.4803 2.75 11.1203V12.8803C2.75 13.5103 3.26 14.0303 3.9 14.0303C5.04 14.0303 5.95 14.4703 6.39 15.2403C6.83 16.0103 6.76 17.0203 6.19 18.0003C6.04 18.2603 6 18.5703 6.08 18.8703C6.16 19.1703 6.35 19.4103 6.61 19.5703L8.34 20.5603C8.55 20.6903 8.8 20.7203 9.03 20.6603C9.27 20.6003 9.47 20.4403 9.6 20.2303L9.71 20.0403C10.28 19.0603 11.11 18.4903 12 18.4903Z";

/**
 * One THIRD of a turn per cycle — and one step is the whole cycle.
 *
 * Re-measured off this gear's own outline before the step was changed, rather
 * than trusting the note that was already here: the OUTER radius sampled
 * against angle about (12,12), then compared with rotations of itself. Mean
 * radius 9.953, mean absolute difference per rotation:
 *
 *    60  0.037     120  0.041     180  0.017     240  0.041     300  0.037
 *    30  1.557      37  1.481      45  1.192      72  1.017      90  1.558
 *   144  1.501
 *
 * The top row is every multiple of 60 and nothing else comes within twenty-five
 * times the error, so it is a SIX-lobed gear. 144 rules out five-fold, 90 rules
 * out four.
 *
 * That is what makes a single step sufficient, and it is why 120 is as valid as
 * the 60 this used to turn: at any multiple of 60 the gear is indistinguishable
 * from where it started, so the loop's reset to zero has nothing to show — the
 * same trick the puzzle piece uses, and the reason every pause lands on an
 * identical pose. 120 simply steps two lobes instead of one.
 *
 * At 90 it could not do this. A quarter turn is as far from this gear's
 * symmetry as any arbitrary angle, so it took four steps to reach 360 just to
 * close the loop, and each pause landed on teeth that did not line up.
 *
 * (An earlier, coarser pass over the same outline recorded 0.156 / 0.152 for
 * the matching angles against a mean radius of 9.885. Different sampling, same
 * conclusion about which angles match — only the contrast is sharper here.)
 *
 * The step doubled and the duration below did not, so the gear now turns at
 * twice the angular speed. That is the intent — a longer sweep on the same
 * beat — and the duration is the one number to change if it reads fast.
 */
const COG_STEPS = [120];

export function SettingsIcon({ playing, size, reduced, speed }: AnimatedIconProps) {
  const ref = useIconLoop(
    (root) => {
      const cog = root.querySelector("[data-cog]");
      const tl = gsap.timeline();
      // Same beat as the puzzle: turn, hold, turn — and like the puzzle,
      // one step returns the identical pose, so the cycle is a single move.
      COG_STEPS.forEach((rotate, i) => {
        tl.to(
          cog,
          { rotate, svgOrigin: "12 12", duration: 0.9, ease: "power2.inOut" },
          i === 0 ? 0 : "+=0.35",
        );
      });
      return tl;
    },
    playing,
    reduced,
    speed,
  );
  return (
    <Svg innerRef={ref} size={size} box={24}>
      <g data-cog>
        <path d={COG_BODY} />
        <path d={COG_HOLE} />
      </g>
    </Svg>
  );
}

// ── Panel arrow — the chevron leaves, is swallowed, comes round ────
//
// A rounded panel with the menu's own rail down its left side and a chevron in
// the open channel beside it. The chevron travels the way it points, slides out
// of sight behind one boundary, and re-enters from behind the opposite one
// still travelling the same way. A conveyor, not a there-and-back — which makes
// it the only icon here whose cycle closes by going all the way round rather
// than by turning back.
//
// ── The divider does not move; only the arrow turns ──
//
// The two supplied icons put the divider on opposite sides, and taking that
// literally was wrong. The divider is the menu's RAIL, and the rail is anchored
// at the left in every mode — so an icon that moves it to the right says the
// menu is already wide, which is exactly what the dock is not.
//
// Both directions therefore draw the same panel with the same divider on the
// left, and differ only in which way the chevron points:
//
//   collapse   arrow left, toward the rail    fold the panel into the dock
//   expand     arrow right, away from it      grow the dock back into a panel
//
// The right-pointing artwork has to be MOVED into this icon's channel, because
// it was drawn for a channel on the other side of the panel.
//
// ── Why it is translated rather than mirrored ──
//
// Two reasons, and the second is the one that bites.
//
// 1. The supplied icons are not clean mirrors. Measured with getBBox rather
//    than read off the path data by eye:
//
//      divider   A 14.220..15.720   B  7.220..8.720    mirror about 11.470
//      chevron   A  7.222..11.277   B 11.663..15.728   mirror about 11.473
//      panel     1.220..22.720, the same path in both  centre        11.970
//
//    The internals mirror about 11.47; the panel they sit in is centred on
//    11.97. The contents sit half a unit left of their own frame, the same way
//    in both. That is the gear's lesson a second time: measure the symmetry, do
//    not assume it.
//
// 2. A scale(-1) anywhere above the chevron would invert the sign of the x that
//    GSAP animates on it, and the arrow would travel backwards against its own
//    point. A plain translation composes with the animation without touching
//    its direction.
//
// ── Why a clip reads as occlusion rather than as a cut ──
//
// The chevron runs in a channel bounded by the divider's near face at one end
// and the panel's inner wall at the other. Both of those edges sit flush
// against opaque artwork of the SAME colour, so the clipped edge never shows:
// the chevron looks swallowed, then reissued from behind the other side. A fade
// would have said "it stopped existing". This says "it went behind something",
// which is what the drawing is about.
//
// The clip is on a wrapping <g> and the movement on the path inside it. The
// other way round the clip would travel with the chevron and never cut it.
const PANEL_FRAME =
  "M14.97 22.75H8.96997C3.53997 22.75 1.21997 20.43 1.21997 15V9C1.21997 3.57 3.53997 1.25 8.96997 1.25H14.97C20.4 1.25 22.72 3.57 22.72 9V15C22.72 20.43 20.41 22.75 14.97 22.75ZM8.96997 2.75C4.35997 2.75 2.71997 4.39 2.71997 9V15C2.71997 19.61 4.35997 21.25 8.96997 21.25H14.97C19.58 21.25 21.22 19.61 21.22 15V9C21.22 4.39 19.58 2.75 14.97 2.75H8.96997Z";
/** The rail. It sits on the left in both icons, because the menu does. */
const PANEL_DIVIDER =
  "M7.96997 22.75C7.55997 22.75 7.21997 22.41 7.21997 22V2C7.21997 1.59 7.55997 1.25 7.96997 1.25C8.37997 1.25 8.71997 1.59 8.71997 2V22C8.71997 22.41 8.38997 22.75 7.96997 22.75Z";
const CHEVRON_RIGHT =
  "M7.96991 15.3109C7.77991 15.3109 7.58991 15.2409 7.43991 15.0909C7.14991 14.8009 7.14991 14.3209 7.43991 14.0309L9.46991 12.0009L7.43991 9.97086C7.14991 9.68086 7.14991 9.20086 7.43991 8.91086C7.72991 8.62086 8.20991 8.62086 8.49991 8.91086L11.0599 11.4709C11.3499 11.7609 11.3499 12.2409 11.0599 12.5309L8.49991 15.0909C8.35991 15.2409 8.16991 15.3109 7.96991 15.3109Z";
const CHEVRON_LEFT =
  "M14.9701 15.3109C14.7801 15.3109 14.5901 15.2409 14.4401 15.0909L11.8801 12.5309C11.5901 12.2409 11.5901 11.7609 11.8801 11.4709L14.4401 8.91086C14.7301 8.62086 15.2101 8.62086 15.5001 8.91086C15.7901 9.20086 15.7901 9.68086 15.5001 9.97086L13.4801 12.0009L15.5101 14.0309C15.8001 14.3209 15.8001 14.8009 15.5101 15.0909C15.3601 15.2409 15.1701 15.3109 14.9701 15.3109Z";

/** The frame's INNER contour — the second half of that compound path. */
const PANEL_INNER = { left: 2.72, right: 21.22, top: 2.75, bottom: 21.25 };

/**
 * The one channel both arrows run in: the rail's near face to the panel's inner
 * right wall. Shared, now that the divider no longer moves between the two.
 */
const CHANNEL = { left: 8.72, right: PANEL_INNER.right };

/** Where each supplied chevron was drawn, measured with getBBox. */
const CHEVRON_LEFT_AS_DRAWN = { left: 11.663, right: 15.728 };
const CHEVRON_RIGHT_AS_DRAWN = { left: 7.222, right: 11.277 };

/**
 * The right chevron was drawn for the other icon's channel, so it is shifted to
 * start exactly where the left one does. The two icons then differ by one thing
 * only — which way the glyph points — which is what makes the pair read as one
 * icon in two states rather than as two icons.
 */
const RIGHT_PLACEMENT = CHEVRON_LEFT_AS_DRAWN.left - CHEVRON_RIGHT_AS_DRAWN.left;

interface PanelArrow {
  chevron: string;
  /** Which way it points, and therefore which way it travels. */
  dir: 1 | -1;
  /** Static shift that lands the artwork in the shared channel. */
  placement: number;
  /** Signed offset at which the chevron is entirely behind the boundary ahead. */
  exit: number;
  /** Signed offset at which it is entirely behind the one behind, about to re-enter. */
  enter: number;
}

/**
 * Both ends of the journey, from the chevron's PLACED span.
 *
 * Which boundary it vanishes behind depends on which way it travels: the
 * left-pointing arrow is swallowed by the rail and returns from the far wall,
 * and the right-pointing one is swallowed by the wall and returns from behind
 * the rail. Calling them downstream and upstream rather than divider and wall
 * is what lets one expression serve both.
 *
 * `exit` and `enter` are the EXACT thresholds rather than a comfortable margin
 * past them, because that is what makes the wrap invisible: the chevron's
 * trailing edge clears one boundary on the same frame its leading edge lands
 * behind the other, so the jump happens with nothing on screen to see jumping.
 * A margin either way would show an empty channel or a chevron at both ends.
 */
function panelArrow(
  chevron: string,
  drawn: { left: number; right: number },
  placement: number,
  dir: 1 | -1,
): PanelArrow {
  const span = { left: drawn.left + placement, right: drawn.right + placement };
  const downstream = dir === 1 ? CHANNEL.right : CHANNEL.left;
  const upstream = dir === 1 ? CHANNEL.left : CHANNEL.right;
  return {
    chevron,
    dir,
    placement,
    exit: downstream - (dir === 1 ? span.left : span.right),
    enter: upstream - (dir === 1 ? span.right : span.left),
  };
}

const PANEL_ARROWS: Record<PanelArrowDirection, PanelArrow> = {
  // Away from the rail: the dock grows back into a panel.
  expand: panelArrow(CHEVRON_RIGHT, CHEVRON_RIGHT_AS_DRAWN, RIGHT_PLACEMENT, 1),
  // Toward the rail: the panel folds into the dock.
  collapse: panelArrow(CHEVRON_LEFT, CHEVRON_LEFT_AS_DRAWN, 0, -1),
};

/**
 * One eased scalar for the whole trip, and the position derived from it.
 *
 * The obvious build is two tweens — out to the divider, then in from the wall.
 * This is one, and the difference is not tidiness:
 *
 * 1. SPEED STAYS CONTINUOUS ACROSS THE WRAP. A single eased scalar cannot jump,
 *    so the chevron is at its fastest around the middle of the journey — which
 *    is where the wrap falls — and eases to rest at both ends. Two tweens would
 *    have to be given durations proportional to their two legs to avoid a
 *    visible kick at the join, and those legs are lopsided: 9.557 against
 *    6.998, so equal halves are audibly wrong.
 *
 * 2. THE GEOMETRY CAN CHANGE UNDER A RUNNING TIMELINE. The arrow flips
 *    direction the moment it is clicked, and the pointer is still on the row,
 *    so the loop is mid-cycle. Reading the geometry on each update rather than
 *    baking distances into tweens means the flip re-poses into the new drawing
 *    and keeps going, instead of animating towards a target that no longer
 *    exists. useIconLoop builds its timeline exactly once and never rebuilds
 *    it, so nothing else here could have absorbed that.
 *
 * Sharing one channel makes the two journeys 16.565 and 16.555 — a 0.06%
 * difference, from the artwork's own 0.01 of asymmetry rather than from
 * anything here. At a shared duration they run at visibly the same speed, which
 * the earlier two-channel version did not.
 */
const ARROW_TRAVEL = 0.9;
/** A beat at rest before it goes round again — the puzzle piece's rhythm. */
const ARROW_BEAT = 0.35;

export type PanelArrowDirection = "expand" | "collapse";

export function PanelArrowIcon({
  direction,
  playing,
  size,
  reduced,
  speed,
}: AnimatedIconProps & { direction: PanelArrowDirection }) {
  // Read on each animation frame, so a direction change lands on the running
  // timeline. Frames only happen after effects have flushed, so an effect is
  // early enough and avoids writing a ref during render.
  const geo = useRef(PANEL_ARROWS[direction]);
  useEffect(() => {
    geo.current = PANEL_ARROWS[direction];
  }, [direction]);

  const ref = useIconLoop(
    (root) => {
      const chevron = root.querySelector("[data-chevron]");
      const journey = { s: 0 };
      const place = () => {
        const { exit, enter, dir } = geo.current;
        const out = Math.abs(exit);
        const travelled = journey.s * (out + Math.abs(enter));
        gsap.set(chevron, {
          x: travelled <= out ? dir * travelled : enter + dir * (travelled - out),
        });
      };
      return gsap
        .timeline()
        .to(journey, { s: 1, duration: ARROW_TRAVEL, ease: "power2.inOut", onUpdate: place })
        .to({}, { duration: ARROW_BEAT });
    },
    playing,
    reduced,
    speed,
  );

  // Only one arrow is on screen today, so a fixed id would work — and would be
  // a trap for whoever puts a second menu on a page, because SVG ids are
  // document-global and the duplicate would silently resolve to whichever
  // rendered first. The colon strip is for React 18's `:r0:` id format, which
  // is legal in an id attribute but awkward in a url() reference; React 19
  // emits underscores and the strip is a no-op there.
  const clipId = `panel-arrow-${useId().replace(/:/g, "")}`;
  const g = PANEL_ARROWS[direction];

  return (
    <Svg innerRef={ref} size={size} box={24}>
      <defs>
        <clipPath id={clipId}>
          <rect
            x={CHANNEL.left}
            y={PANEL_INNER.top}
            width={CHANNEL.right - CHANNEL.left}
            height={PANEL_INNER.bottom - PANEL_INNER.top}
          />
        </clipPath>
      </defs>
      <path d={PANEL_FRAME} />
      <path d={PANEL_DIVIDER} />
      {/* Three levels, and each owns exactly one thing. The clip cannot sit on
          a transformed element or it would travel with the chevron; the static
          placement cannot sit on the chevron itself or GSAP would overwrite it
          on the first frame. Both directions render this same shape so that a
          flip updates attributes rather than remounting the path GSAP holds. */}
      <g clipPath={`url(#${clipId})`}>
        <g transform={`translate(${g.placement} 0)`}>
          <path data-chevron d={g.chevron} />
        </g>
      </g>
    </Svg>
  );
}

export const MENU_ICONS: Record<string, React.ComponentType<AnimatedIconProps>> = {
  home: HomeIcon,
  create: CreateIcon,
  history: HistoryIcon,
  folders: FoldersIcon,
  extension: ExtensionIcon,
  settings: SettingsIcon,
};
