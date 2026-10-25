"use client";

// ─────────────────────────────────────────────────────────────
// Flashcard specimens — TEMPORARY
// ─────────────────────────────────────────────────────────────
// http://localhost:3000/dev/flashcards
//
// Brief: every card in the set is on screen at once — no one-at-a-time
// deck — and the flip is on CLICK, the same on desktop as on a phone.
// Hover does nothing here on purpose: a hover flip is unreachable on
// touch, and a control that behaves differently by device is worse than
// one that behaves the same everywhere.
//
// Four characters to choose between. All four flip the same way from the
// user's side — click to turn, click to turn back — and differ only in
// how the turn reads.
//
// ⚠ Three things that are not stylistic and carry into whichever wins:
//
// 1. BOTH FACES ARE ALWAYS IN THE DOM. A 3D flip needs both sides
//    present, so the hidden one has to be hidden from assistive
//    technology too — otherwise every card reads its answer aloud
//    immediately, which defeats the point. Each face carries aria-hidden
//    tied to the flip state, and the button reports aria-pressed.
//
// 2. THE CARD IS A FIXED HEIGHT. A flip between two faces of different
//    heights would resize the grid mid-turn. Fixed height means long
//    answers need somewhere to go, so each face scrolls internally
//    rather than being clipped.
//
// 3. REDUCED MOTION IS ALREADY HANDLED. The global rule in globals.css
//    forces transition-duration to ~0, so the flip becomes an instant
//    swap rather than breaking — the state change is a class, not an
//    animation that has to complete.
//
// Nothing here is shipped and no real component is modified.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";

import { FlashcardsView } from "@/components/output/flashcards-view";
import { useTheme } from "@/components/shared/theme-provider";
import { contentTypeColors, THEMES, type ThemeName } from "@/lib/constants/theme";
import type { Flashcard } from "@/lib/content/types";

// Real-shaped sample data: the stored type is exactly { front, back },
// so nothing here is invented. Lengths deliberately uneven — a set where
// every answer is one line would hide the height problem.
const CARDS: readonly Flashcard[] = [
  {
    front: "What is a transformer's attention mechanism actually doing?",
    back: "Weighing how much every token should influence every other token, in parallel, rather than passing information along a sequence one step at a time.",
  },
  { front: "What does 'context window' mean?", back: "The maximum number of tokens a model can consider at once." },
  {
    front: "Why did transformers replace RNNs for most language tasks?",
    back: "They parallelise across the sequence instead of processing it in order, which makes training dramatically faster on modern hardware — and they hold long-range relationships better.",
  },
  { front: "What is a token?", back: "A chunk of text — often a word piece rather than a whole word." },
  {
    front: "What is positional encoding for?",
    back: "Attention has no inherent sense of order, so position has to be added to the input explicitly or the model sees a bag of tokens.",
  },
  { front: "What is fine-tuning?", back: "Continuing training on a narrower dataset to specialise a general model." },
];

// ── The four characters ─────────────────────────────────────

type FlipName = "y" | "x" | "lift" | "fade" | "cover";

const FLIPS: Record<FlipName, { label: string; note: string }> = {
  y: {
    label: "A · Turn on its side",
    note: "The classic. Rotates about the vertical axis, like turning a card over in your hand. Reads unmistakably as a flashcard and needs no explaining.",
  },
  x: {
    label: "B · Turn top over bottom",
    note: "The same rotation about the horizontal axis. Slightly less familiar as a card gesture, but in a grid it keeps each card's turn visually separate from its neighbours, which read left-to-right.",
  },
  lift: {
    label: "C · Lift and turn",
    note: "A Y-axis turn with the card rising toward you through the middle of the motion. More physical — it reads as picked up rather than pivoted in place. The most expensive of the four in feel; worth checking it does not become tiring across a set of twenty.",
  },
  cover: {
    label: "E · Cover opens",
    note: "Not a flip. The prompt is a cover hinged at its left edge, and the answer lies underneath the whole time — clicking swings the cover open like a book. Two departures from the reference on purpose: it opens on click rather than hover, because a hover-only reveal is unreachable on touch; and it uses the project's elevation rather than the reference's hard black shadow, which would fight the four-layer stack.",
  },
  fade: {
    label: "D · Dissolve",
    note: "No 3D at all. The front dissolves as the back arrives, with a small settle. Quietest, and the only one that cannot go wrong on a device with poor 3D rendering — but it loses the sense that a card has two sides.",
  },
};

const FLIP_ORDER: readonly FlipName[] = ["y", "x", "lift", "fade", "cover"];

// ── Portrait, and narrower than its cell ────────────────────
// Two things at once, both to keep an opening cover off its neighbour.
//
// A cover hinged at the spine swings out to roughly a quarter of the
// card's WIDTH past that spine, so a narrower card swings less. Portrait
// costs nothing here — a flashcard is a card, and 220x300 is the shape
// the reference used.
//
// The card is then right-aligned in its grid cell and capped below the
// cell's width, so the space left over on the left IS the swing gutter.
// That is cheaper and more robust than widening the column gap, because
// the gutter scales with the cell instead of being a number that has to
// be re-tuned whenever the column count changes.

type SizeName = "sm" | "md" | "lg";
// WIDTH IS FIXED ACROSS THE PRESETS, and that is not laziness.
// The swing is a function of width — a wider cover reaches further past
// its spine — while a wider card simultaneously leaves LESS slack in its
// cell to swing into. The two move against each other, so widening is
// doubly punished: at 240 the lid needed 86px and had only 72px, and
// escaped its cell. Holding width at the reference's 220 solves the
// horizontal case once, and height then varies freely, because height
// costs only vertical gap and that is cheap.
const SIZES: Record<SizeName, { label: string; className: string }> = {
  sm: { label: "220 x 280", className: "h-[280px] max-w-[220px]" },
  md: { label: "220 x 300", className: "h-[300px] max-w-[220px]" },
  lg: { label: "220 x 340", className: "h-[340px] max-w-[220px]" },
};
const SIZE_ORDER: readonly SizeName[] = ["sm", "md", "lg"];

type ColsName = "two" | "three";
const COLS: Record<ColsName, { label: string; className: string }> = {
  two: { label: "2", className: "grid-cols-1 sm:grid-cols-2" },
  three: { label: "3", className: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" },
};
const COLS_ORDER: readonly ColsName[] = ["two", "three"];

// How far the cover swings. The reference used -80; further tucks the lid
// further back but magnifies it more, because perspective scales whatever
// leans toward the viewer.
type AngleName = "a80" | "a95" | "a105" | "a110" | "a115" | "a120";
const ANGLES: Record<AngleName, { label: string; deg: number }> = {
  a80: { label: "80° (reference)", deg: -80 },
  a95: { label: "95°", deg: -95 },
  a105: { label: "105°", deg: -105 },
  a110: { label: "110°", deg: -110 },
  a115: { label: "115°", deg: -115 },
  a120: { label: "120°", deg: -120 },
};
const ANGLE_ORDER: readonly AngleName[] =
  ["a80", "a95", "a105", "a110", "a115", "a120"];

// How far the book slides right as it opens.
// At rest the card is CENTRED in its cell rather than pinned right, so the
// slack is not dead space sitting there permanently. The gutter is then
// created by the gesture: the book steps right while the cover swings
// left, and the two together open the room the lid needs.
type ShiftName = "s0" | "s24" | "s32" | "s40" | "s48";
const SHIFTS: Record<ShiftName, { label: string; px: number }> = {
  s0: { label: "None", px: 0 },
  s24: { label: "24px", px: 24 },
  s32: { label: "32px", px: 32 },
  s40: { label: "40px", px: 40 },
  s48: { label: "48px", px: 48 },
};
const SHIFT_ORDER: readonly ShiftName[] = ["s0", "s24", "s32", "s40", "s48"];

type ZoomName = "off" | "on";
const ZOOMS: Record<ZoomName, { label: string }> = {
  off: { label: "No zoom" },
  on: { label: "Zoom on hover" },
};
const ZOOM_ORDER: readonly ZoomName[] = ["off", "on"];

type SpeedName = "s320" | "s450" | "s600";
const SPEEDS: Record<SpeedName, { label: string; ms: number }> = {
  s320: { label: "320ms", ms: 320 },
  s450: { label: "450ms", ms: 450 },
  s600: { label: "600ms", ms: 600 },
};
const SPEED_ORDER: readonly SpeedName[] = ["s320", "s450", "s600"];

// ── Proposed: cap the stretch, scroll beyond it ─────────────
// The dial for that cap. "None" is what ships today — the card grows to
// its taller face and rows stretch with it.
type CapName = "none" | "c400" | "c500" | "c600" | "c700";
const CAPS: Record<CapName, { label: string; px: number | null }> = {
  none:  { label: "None (stretch)", px: null },
  c400:  { label: "400", px: 400 },
  c500:  { label: "500", px: 500 },
  c600:  { label: "600", px: 600 },
  c700:  { label: "700", px: 700 },
};
const CAP_ORDER: readonly CapName[] = ["none", "c400", "c500", "c600", "c700"];

// Width, which the earlier pass fixed at 220 on the grounds that widening is
// punished twice: the swing scales WITH width, while a wider card leaves LESS
// slack in its cell to swing into. This dial exists to test that against a
// two-column layout, where the cell is far wider and the second effect may no
// longer bite. Watch the covers, not the cards.
type WidthName = "w220" | "w260" | "w280" | "w300" | "w340" | "w400";
const WIDTHS: Record<WidthName, { label: string; px: number }> = {
  w220: { label: "220 (old)", px: 220 },
  w260: { label: "260", px: 260 },
  w280: { label: "280", px: 280 },
  w300: { label: "300", px: 300 },
  w340: { label: "340", px: 340 },
  w400: { label: "400", px: 400 },
};
const WIDTH_ORDER: readonly WidthName[] = ["w220", "w260", "w280", "w300", "w340", "w400"];

// How many columns the proposed grid is asked for. "Auto" is what ships —
// the container decides via auto-fit. The fixed counts are for testing a
// deliberate two-column layout against a wider card.
type ColsProposedName = "auto" | "two" | "three";
const PROPOSED_COLS: Record<ColsProposedName, { label: string; template: (trackMin: number) => string }> = {
  auto:  { label: "Auto (ships)", template: (min) => `repeat(auto-fit,minmax(min(${min}px,100%),1fr))` },
  two:   { label: "2", template: () => "repeat(2,minmax(0,1fr))" },
  three: { label: "3", template: () => "repeat(3,minmax(0,1fr))" },
};
const PROPOSED_COLS_ORDER: readonly ColsProposedName[] = ["auto", "two", "three"];

// Deliberately overlong, because a cap and a scrollbar are invisible on
// content that fits. Card 2 is short on purpose, so the row shows both.
const LONG_CARDS: readonly Flashcard[] = [
  {
    front:
      "Walk through what a transformer's attention mechanism is actually computing, and why that differs from how a recurrent network carries information along a sequence.",
    back:
      "Attention computes a weighting between every pair of positions in the input, all at once. Each token's new representation is a weighted sum of every other token's, where the weights come from how much the model judges one position should influence another. A recurrent network instead threads a single hidden state through the sequence one step at a time, so information from early tokens has to survive every intervening step to reach the end. That is why long-range dependencies degrade in an RNN and why transformers parallelise: there is no ordering constraint in the computation itself, which is also why position has to be injected explicitly.",
  },
  { front: "What is a token?", back: "A chunk of text, often a word piece rather than a whole word." },
  {
    front: "Why does positional encoding exist at all?",
    back:
      "Because attention is permutation-invariant. Shuffle the input and the raw mechanism produces the same set of pairwise weightings, so word order carries no meaning unless it is added back. Positional encoding adds a signal that varies with index, so the model can tell 'dog bites man' from 'man bites dog'. It is the price of the parallelism that made transformers fast in the first place.",
  },
];

// ── A card ──────────────────────────────────────────────────

function FlipCard({
  card,
  index,
  flip,
  size,
  ms,
  zoom,
  angle,
  shift,
}: {
  card: Flashcard;
  index: number;
  flip: FlipName;
  size: SizeName;
  ms: number;
  zoom: boolean;
  angle: number;
  shift: number;
}) {
  const [turned, setTurned] = useState(false);
  const accent = contentTypeColors.flashcards.color;

  // ── The cover, hinged at its spine ──
  // A different mechanism from the other four, not a variation on them.
  // The answer sits underneath the whole time and the prompt is a lid
  // swinging off the left edge, so there is no back face and no
  // backface-visibility involved.
  //
  // It still needs both halves hidden from assistive technology at the
  // right moments: the answer is in the DOM from the start, so without
  // aria-hidden a screen reader would read it before the cover moves.
  if (flip === "cover") {
    return (
      <button
        type="button"
        onClick={() => setTurned((t) => !t)}
        aria-pressed={turned}
        aria-label={`Card ${index + 1}. ${turned ? "Showing answer" : "Showing prompt"}. Click to open.`}
        className={[
          "relative block w-full text-left [perspective:2000px]",
          SIZES[size].className,
          "transition-transform ease-xn",
          zoom ? "hover:scale-[1.03]" : "",
        ].join(" ")}
        style={{
          transitionDuration: `${ms}ms`,
          transform: turned && shift ? `translateX(${shift}px)` : undefined,
        }}
      >
        {/* The answer, lying underneath from the start. */}
        <span
          className="absolute inset-0 flex flex-col overflow-y-auto rounded-xn-md border border-xn-border p-4"
          style={{ backgroundColor: `color-mix(in srgb, ${accent} 10%, var(--xn-surface))` }}
          aria-hidden={!turned}
        >
          <span className="mb-2 shrink-0 font-mono text-[11px]" style={{ color: accent }}>
            Answer
          </span>
          <span className="text-[14px] leading-[1.6] text-xn-ink">{card.back}</span>
        </span>

        {/* The cover. transform-origin at the spine is the whole trick —
            without it the lid rotates about its middle and reads as a
            flip rather than an opening. */}
        <span
          className="absolute inset-0 flex origin-left flex-col overflow-hidden rounded-xn-md border border-xn-border bg-xn-surface p-4 shadow-xn"
          style={{
            transform: turned ? `rotateY(${angle}deg)` : "rotateY(0deg)",
            transitionProperty: "transform",
            transitionDuration: `${ms}ms`,
          }}
          aria-hidden={turned}
        >
          <span className="mb-2 shrink-0 font-mono text-[11px]" style={{ color: accent }}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-[15px] font-medium leading-[1.55] text-xn-ink">
            {card.front}
          </span>
        </span>
      </button>
    );
  }

  const is3D = flip !== "fade";
  const axis = flip === "x" ? "rotateX" : "rotateY";

  // The turn itself. For the 3D characters the inner element rotates and
  // each face is placed with backface-visibility; for the dissolve the
  // faces cross-fade in place.
  const innerStyle: React.CSSProperties = is3D
    ? {
        transformStyle: "preserve-3d",
        transform: turned
          ? `${axis}(180deg)${flip === "lift" ? " scale(1)" : ""}`
          : `${axis}(0deg)`,
        transitionProperty: "transform",
        transitionDuration: `${ms}ms`,
      }
    : { transitionProperty: "opacity", transitionDuration: `${ms}ms` };

  const faceBase =
    "absolute inset-0 flex flex-col overflow-y-auto rounded-xn-md border p-4 text-left";

  return (
    <button
      type="button"
      onClick={() => setTurned((t) => !t)}
      aria-pressed={turned}
      aria-label={`Card ${index + 1}. ${turned ? "Showing answer" : "Showing prompt"}. Click to turn.`}
      className={[
        "group relative block w-full",
        SIZES[size].className,
        // Perspective belongs on the parent of the rotating element, and
        // without it a rotateY is just a horizontal squash.
        is3D ? "[perspective:1200px]" : "",
        // The lift needs the card to rise toward the viewer mid-turn, which
        // is a scale on the wrapper rather than on the rotating face.
        flip === "lift"
          ? "transition-transform ease-xn hover:scale-[1.02] active:scale-[0.99]"
          : zoom
            ? "transition-transform ease-xn hover:scale-[1.03]"
            : "",
      ].join(" ")}
      style={flip === "lift" || zoom ? { transitionDuration: `${ms}ms` } : undefined}
    >
      <span className="relative block h-full w-full ease-xn" style={innerStyle}>
        {/* FRONT — the prompt. */}
        <span
          className={[
            faceBase,
            "border-xn-border bg-xn-surface",
            is3D ? "[backface-visibility:hidden]" : "transition-opacity ease-xn",
            !is3D && turned ? "opacity-0" : "opacity-100",
          ].join(" ")}
          style={!is3D ? { transitionDuration: `${ms}ms` } : undefined}
          aria-hidden={turned}
        >
          <span
            className="mb-2 shrink-0 font-mono text-[11px]"
            style={{ color: accent }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-[15px] font-medium leading-[1.55] text-xn-ink">
            {card.front}
          </span>
        </span>

        {/* BACK — the answer. Pre-rotated so it faces away until the turn. */}
        <span
          className={[
            faceBase,
            "border-transparent",
            is3D ? "[backface-visibility:hidden]" : "transition-opacity ease-xn",
            !is3D && turned ? "opacity-100" : !is3D ? "opacity-0" : "",
          ].join(" ")}
          style={{
            backgroundColor: `color-mix(in srgb, ${accent} 10%, var(--xn-surface))`,
            ...(is3D ? { transform: `${axis}(180deg)` } : { transitionDuration: `${ms}ms` }),
          }}
          aria-hidden={!turned}
        >
          <span className="mb-2 shrink-0 font-mono text-[11px]" style={{ color: accent }}>
            Answer
          </span>
          <span className="text-[14px] leading-[1.6] text-xn-ink">{card.back}</span>
        </span>
      </span>
    </button>
  );
}

// ── Page chrome ─────────────────────────────────────────────

/**
 * How far an open cover reaches past its card's left edge.
 *
 * The 1.404 is MEASURED, not derived. The obvious model — width x |cos| x
 * 1.115, the 1.115 being perspective magnifying whatever leans toward the
 * viewer — gives 114px for a 300px card at 110 degrees. Read off the
 * rendered cover it is 144.1. The model was 26% light, and two attempts at
 * spacing this grid went the wrong way before that got checked.
 */
const SWING_MAGNIFICATION = 1.404;

function overhangFor(widthPx: number, swingDeg: number) {
  return widthPx * Math.abs(Math.cos((swingDeg * Math.PI) / 180)) * SWING_MAGNIFICATION;
}

/** The narrowest cell that holds an open card plus the room its cover needs. */
function trackMinFor(widthPx: number, swingDeg: number) {
  return Math.round(widthPx + overhangFor(widthPx, swingDeg));
}

/**
 * The grid's left inset, solved so the FIRST card in a row has the same room
 * to open as the ones after it.
 *
 * Not simply "add the difference": the inset also shrinks every cell, which
 * shrinks the between-card gap, so the two converge at different rates.
 * Solving both together gives
 *
 *   inset = (W + (n+1)G - n*w - 2n*step) / (2n + 1)
 *
 * Checked against measurement — for a 300px card it returns 41, the value
 * arrived at by hand, which produced 21.7px against 21.4px.
 */
function leftInsetFor(
  totalPx: number, columns: number, widthPx: number, stepPx: number, gapPx: number,
) {
  const n = Math.max(1, columns);
  return Math.max(
    0,
    Math.round((totalPx + (n + 1) * gapPx - n * widthPx - 2 * n * stepPx) / (2 * n + 1)),
  );
}

/**
 * PROPOSED tile — the card is a div, the faces scroll, and one visually
 * hidden button per face carries the tab stop.
 *
 * ── Why the button sits INSIDE the face ──
 * Arrow keys scroll the nearest scrollable ANCESTOR of the focused
 * element. That is exactly what the shipped version got wrong: its scroll
 * box was a CHILD of the focused button, so the keypress scrolled the page
 * and long content was unreachable. Put the button inside the scroll
 * container and the relationship inverts — the box is now an ancestor, and
 * arrows scroll it.
 *
 * ── Why overflow here does not clip the swing ──
 * `overflow` clips an element's CHILDREN, not its own transform. The cover
 * is the rotating element, so capping and scrolling it leaves the swing
 * untouched. Measured: a cover with overflow-y:auto still escapes the card
 * box by 97px. It would clip if the overflow were on an ANCESTOR of the
 * cover, which is why the cap lives on the faces and not on the card.
 *
 * ── One tab stop, not two ──
 * Both faces hold a hidden button, but only the visible face's is
 * reachable; the other is tabIndex -1 and inside an aria-hidden subtree.
 * They swap on turn, and focus follows, or a keyboard user loses their
 * place mid-set. The buttons carry no onClick of their own: activating one
 * fires a click that bubbles to the card, so there is a single toggle path
 * rather than two that can disagree.
 */
function CappedTile({
  card, index, accent, maxH, ms, widthPx, swingDeg, stepPx,
}: {
  card: Flashcard;
  index: number;
  accent: string;
  maxH: number | null;
  ms: number;
  widthPx: number;
  swingDeg: number;
  stepPx: number;
}) {
  const [open, setOpen] = useState(false);
  const coverBtn = useRef<HTMLButtonElement>(null);
  const answerBtn = useRef<HTMLButtonElement>(null);
  // Set when the keyboard drove the turn, so focus follows the control to
  // the face that becomes visible. A mouse click leaves focus alone.
  const chaseFocus = useRef(false);

  const toggle = () => {
    chaseFocus.current =
      document.activeElement === coverBtn.current ||
      document.activeElement === answerBtn.current;
    setOpen((o) => !o);
  };

  // AFTER commit, not in a rAF from the handler. The first attempt used
  // requestAnimationFrame and the focus call landed before React had
  // swapped the two buttons' tabIndex, so focus stayed on the control that
  // had just become hidden and unreachable — the exact state this design
  // exists to avoid. An effect on `open` runs once the DOM is settled.
  useEffect(() => {
    if (!chaseFocus.current) return;
    chaseFocus.current = false;
    (open ? answerBtn : coverBtn).current?.focus();
  }, [open]);

  const faceStyle = maxH === null ? undefined : { maxHeight: `${maxH}px` };

  return (
    <div className="flex justify-center">
      {/* The click handler here is the MOUSE path only. The keyboard path is
          the hidden button inside the active face, which is a real <button>,
          and the ring is drawn from focus-within so the card still reads as
          focused even though the control is invisible. */}
      <div
        onClick={toggle}
        className={[
          "grid min-h-[300px] w-full cursor-pointer text-left",
          "[perspective:2000px]",
          "transition-transform ease-xn hover:scale-[1.03]",
          // `outline` for the STYLE is not optional here. `outline-2` sets width
          // only; on :focus-visible the browser supplies the style, but this is
          // :focus-within on a card that is not itself focused, so without it the
          // ring computes to outline-style:none and nothing is drawn — which reads
          // exactly like the keyboard not working.
          "rounded-xn-md focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-xn-ink",
        ].join(" ")}
        style={{
          maxWidth: `${widthPx}px`,
          transitionDuration: `${ms}ms`,
          transform: open ? `translateX(${stepPx}px)` : undefined,
        }}
      >
        {/* Answer — lies flat, never rotates. */}
        <span
          className="relative col-start-1 row-start-1 flex flex-col overflow-y-auto rounded-xn-md border border-xn-border p-4"
          // `relative` is load-bearing. The hidden button inside is absolutely
          // positioned (sr-only), and an absolutely positioned element takes
          // its scroll context from its CONTAINING BLOCK, not its DOM parent.
          // A static face establishes none, so the button escaped the scroller
          // and arrow keys scrolled the page instead of the text — the exact
          // failure this design exists to fix. The cover masked it: its
          // rotateY transform establishes a containing block by accident, so
          // only the open card was broken.
          //
          // tabIndex -1 keeps this OUT of sequential tab order. Browsers make
          // a scrollable region focusable on its own so a keyboard user can
          // reach it — which is normally right, but here it means a face that
          // overflows adds a SECOND stop on top of the hidden button, and the
          // card costs two tabs while a non-overflowing one costs one.
          // The button inside already gives arrow-key scrolling, so the extra
          // stop is redundant. -1 keeps the region programmatically focusable
          // and still scrollable when focus is within it.
          tabIndex={-1}
          style={{ ...faceStyle, backgroundColor: `color-mix(in srgb, ${accent} 10%, var(--xn-surface))` }}
          aria-hidden={!open}
        >
          <button
            ref={answerBtn}
            type="button"
            tabIndex={open ? 0 : -1}
            className="sr-only"
            onClick={(e) => {
              // Explicit rather than letting the activation bubble to the card:
              // an invisible control whose only route to its own behaviour runs
              // through a parent is too easy to break silently.
              e.stopPropagation();
              toggle();
            }}
          >
            {`Card ${index + 1}. Showing answer. Activate to turn back.`}
          </button>
          <span className="mb-2 shrink-0 font-mono text-[11px]" style={{ color: accent }}>
            Answer
          </span>
          <span className="text-[14px] leading-[1.6] text-xn-ink">{card.back}</span>
        </span>

        {/* Cover — the rotating element. Capping it is safe; see above. */}
        <span
          className="relative col-start-1 row-start-1 flex origin-left flex-col overflow-y-auto rounded-xn-md border border-xn-border bg-xn-surface p-4 shadow-xn"
          // `relative` is load-bearing. The hidden button inside is absolutely
          // positioned (sr-only), and an absolutely positioned element takes
          // its scroll context from its CONTAINING BLOCK, not its DOM parent.
          // A static face establishes none, so the button escaped the scroller
          // and arrow keys scrolled the page instead of the text — the exact
          // failure this design exists to fix. The cover masked it: its
          // rotateY transform establishes a containing block by accident, so
          // only the open card was broken.
          //
          // tabIndex -1 keeps this OUT of sequential tab order. Browsers make
          // a scrollable region focusable on its own so a keyboard user can
          // reach it — which is normally right, but here it means a face that
          // overflows adds a SECOND stop on top of the hidden button, and the
          // card costs two tabs while a non-overflowing one costs one.
          // The button inside already gives arrow-key scrolling, so the extra
          // stop is redundant. -1 keeps the region programmatically focusable
          // and still scrollable when focus is within it.
          tabIndex={-1}
          style={{
            ...faceStyle,
            transform: open ? `rotateY(${swingDeg}deg)` : "rotateY(0deg)",
            transitionProperty: "transform",
            transitionDuration: `${ms}ms`,
          }}
          aria-hidden={open}
        >
          <button
            ref={coverBtn}
            type="button"
            tabIndex={open ? -1 : 0}
            className="sr-only"
            onClick={(e) => {
              // Explicit rather than letting the activation bubble to the card:
              // an invisible control whose only route to its own behaviour runs
              // through a parent is too easy to break silently.
              e.stopPropagation();
              toggle();
            }}
          >
            {`Card ${index + 1}. Showing prompt. Activate to turn over.`}
          </button>
          <span className="mb-2 shrink-0 font-mono text-[11px]" style={{ color: accent }}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-[15px] font-medium leading-[1.55] text-xn-ink">
            {card.front}
          </span>
        </span>
      </div>
    </div>
  );
}

function Control<T extends string>({
  legend, options, value, onChange, labelFor,
}: {
  legend: string;
  options: readonly T[];
  value: T;
  onChange: (n: T) => void;
  labelFor: (o: T) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-[74px] shrink-0 text-sm text-xn-ink-soft">{legend}</span>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={[
            "rounded-xn-pill border px-3 py-1 text-xs font-medium transition-colors duration-xn ease-xn",
            value === o
              ? "border-xn-ink bg-xn-ink text-xn-bg"
              : "border-xn-border bg-xn-surface text-xn-ink-muted hover:border-xn-border-strong",
          ].join(" ")}
        >
          {labelFor(o)}
        </button>
      ))}
    </div>
  );
}

const THEME_BUTTON_ACTIVE: Record<ThemeName, string> = {
  light:
    "[html[data-theme=light]_&]:border-xn-ink [html[data-theme=light]_&]:bg-xn-ink [html[data-theme=light]_&]:text-xn-bg [html[data-theme=light]_&]:shadow-xn",
  dark:
    "[html[data-theme=dark]_&]:border-xn-ink [html[data-theme=dark]_&]:bg-xn-ink [html[data-theme=dark]_&]:text-xn-bg [html[data-theme=dark]_&]:shadow-xn",
};

export default function FlashcardSpecimensPage() {
  const [cap, setCap] = useState<CapName>("c600");
  const [cardWidth, setCardWidth] = useState<WidthName>("w220");
  const [propCols, setPropCols] = useState<ColsProposedName>("auto");
  const [propAngle, setPropAngle] = useState<AngleName>("a110");
  const [propShift, setPropShift] = useState<ShiftName>("s32");
  const { setTheme } = useTheme();
  const [flip, setFlip] = useState<FlipName>("y");
  const [size, setSize] = useState<SizeName>("md");
  const [cols, setCols] = useState<ColsName>("three");
  const [speed, setSpeed] = useState<SpeedName>("s450");
  const [zoom, setZoom] = useState<ZoomName>("on");
  const [angle, setAngle] = useState<AngleName>("a105");
  const [shift, setShift] = useState<ShiftName>("s24");

  return (
    <div className="flex min-h-screen bg-xn-bg">
      <aside className="hidden w-[232px] shrink-0 border-r border-xn-border bg-xn-surface lg:block">
        <p className="p-6 font-mono text-xs text-xn-ink-faint">
          232px sidebar
          <br />
          (mock — real shell width)
        </p>
      </aside>

      <div className="min-w-0 flex-1 px-8 py-14">
        <header className="pb-8">
          <p className="eyebrow mb-3">Specimens · not shipped</p>
          <h1 className="text-h3 font-semibold text-xn-ink">Flashcards that turn</h1>
          <p className="mt-3 max-w-[66ch] text-body text-xn-ink-muted">
            The whole set on screen, and a click turns a card — the same on a phone
            as on a desktop. <strong>Click the cards.</strong> None of this reads
            from a screenshot.
          </p>

          <div className="mt-6 inline-flex gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={[
                  "rounded-xn-pill border px-4 py-2 text-ui font-medium",
                  "border-xn-border-strong bg-xn-surface text-xn-ink-muted shadow-xn-1",
                  "transition-[box-shadow,transform,background-color,color,border-color] duration-xn ease-xn",
                  "hover:-translate-y-0.5 hover:shadow-xn-hover",
                  "active:translate-y-px active:duration-xn-fast active:shadow-xn-1",
                  THEME_BUTTON_ACTIVE[t],
                ].join(" ")}
              >
                {t === "dark" ? "Dark" : "Light"}
              </button>
            ))}
          </div>
        </header>

        <section className="border-t border-xn-border py-8">
          <div className="flex flex-col gap-3">
            <Control legend="Turn" options={FLIP_ORDER} value={flip} onChange={setFlip}
              labelFor={(f) => FLIPS[f].label.split(" · ")[1]} />
            <Control legend="Height" options={SIZE_ORDER} value={size} onChange={setSize}
              labelFor={(s) => SIZES[s].label} />
            <Control legend="Columns" options={COLS_ORDER} value={cols} onChange={setCols}
              labelFor={(c) => COLS[c].label} />
            <Control legend="Speed" options={SPEED_ORDER} value={speed} onChange={setSpeed}
              labelFor={(s) => SPEEDS[s].label} />
            <Control legend="Hover" options={ZOOM_ORDER} value={zoom} onChange={setZoom}
              labelFor={(z) => ZOOMS[z].label} />
            <Control legend="Swing" options={ANGLE_ORDER} value={angle} onChange={setAngle}
              labelFor={(a) => ANGLES[a].label} />
            <Control legend="Step right" options={SHIFT_ORDER} value={shift} onChange={setShift}
              labelFor={(x) => SHIFTS[x].label} />
          </div>
          <p className="mt-4 max-w-[70ch] text-sm text-xn-ink-soft">{FLIPS[flip].note}</p>
        </section>

        {/* The SHIPPED component, rendered here only because /output/[id] is
            behind auth and cannot be opened in a bare browser. */}
        {/* PROPOSED — capped and scrollable, one tab stop per card. */}
        <section className="border-t border-xn-border py-10">
          <p className="eyebrow mb-3">
            Proposed · card capped, faces scroll, one tab stop each · at the real 960px
          </p>
          <p className="mb-4 max-w-[74ch] text-sm text-xn-ink-soft">
            The card is a div; each face is its own scroll container; a visually hidden
            button inside the visible face carries the tab stop. Arrow keys scroll because
            that button is INSIDE the scrollable box rather than a child of it — the
            inversion the shipped version got wrong.
          </p>
          <div className="mb-5 flex flex-col gap-2.5">
            <Control
              legend="Max height"
              options={CAP_ORDER}
              value={cap}
              onChange={setCap}
              labelFor={(c) => CAPS[c].label}
            />
            <Control
              legend="Card width"
              options={WIDTH_ORDER}
              value={cardWidth}
              onChange={setCardWidth}
              labelFor={(w) => WIDTHS[w].label}
            />
            <Control
              legend="Columns"
              options={PROPOSED_COLS_ORDER}
              value={propCols}
              onChange={setPropCols}
              labelFor={(c) => PROPOSED_COLS[c].label}
            />
            <Control
              legend="Swing"
              options={ANGLE_ORDER}
              value={propAngle}
              onChange={setPropAngle}
              labelFor={(a) => ANGLES[a].label}
            />
            <Control
              legend="Step right"
              options={SHIFT_ORDER}
              value={propShift}
              onChange={setPropShift}
              labelFor={(x) => SHIFTS[x].label}
            />
          </div>
          <p className="mb-5 max-w-[74ch] text-sm text-xn-ink-soft">
            <strong className="font-semibold text-xn-ink">To trace the keyboard:</strong>{" "}
            click once outside a card, then Tab. Each card should take exactly ONE stop.
            Space or Enter turns it, and focus should stay on the same card rather than
            jumping to the top. With a cap set, arrow keys should scroll the visible face;
            the ring is drawn on the card because the real control is invisible.
          </p>
          {/* The track minimum follows the card width — the swing needs slack
              beside the card, and that slack is the cell minus the card. A
              fixed 310 only ever suited a 220 card. */}
          <div
            className="grid max-w-wide gap-x-3 gap-y-[72px] pb-12 pt-12"
            style={{
              gridTemplateColumns: PROPOSED_COLS[propCols].template(
                trackMinFor(WIDTHS[cardWidth].px, ANGLES[propAngle].deg),
              ),
              // Solved live from the dials, so the first card's room to open
              // matches every other card's as the settings change.
              paddingLeft: `${leftInsetFor(
                960,
                propCols === "three" ? 3 : 2,
                WIDTHS[cardWidth].px,
                SHIFTS[propShift].px,
                12,
              )}px`,
            }}
            data-proposed
          >
            {LONG_CARDS.map((card, i) => (
              <CappedTile
                key={`${cap}-${cardWidth}-${propCols}-${propAngle}-${propShift}-${i}`}
                card={card}
                index={i}
                accent={contentTypeColors.flashcards.color}
                maxH={CAPS[cap].px}
                ms={SPEEDS[speed].ms}
                widthPx={WIDTHS[cardWidth].px}
                swingDeg={ANGLES[propAngle].deg}
                stepPx={SHIFTS[propShift].px}
              />
            ))}
          </div>
        </section>

        <section className="border-t border-xn-border py-10">
          <p className="eyebrow mb-4">
            Shipped · components/output/flashcards-view.tsx · at OutputView&apos;s real 960px
          </p>
          {/* 960px is derived, not chosen. OutputView caps its content at
              max-w-wide, and the two routes that render it size their page
              column at max-w-output — which is exactly that 960 plus the
              card's padding and border. So this is the width the component
              genuinely renders at.

              It said 680 before, and 960 before that. The 680 was correct
              for the container as it stood; the original 960 was not, and
              hid a collision that only appeared in the real column. This
              960 is a different number with the same digits — the container
              moved to meet it. Re-derive it here if the token changes
              rather than assuming this line is still true. */}
          <div className="max-w-wide" data-shipped>
            <FlashcardsView body={{ kind: "flashcards", cards: [...CARDS] }} />
          </div>
        </section>

        <section className="border-t border-xn-border py-10">
          <p className="eyebrow mb-1.5">Specimens · {CARDS.length} cards</p>
          <p className="mb-5 max-w-[64ch] text-sm text-xn-ink-soft">
            Answers are deliberately uneven in length. Each face scrolls inside a
            fixed-height card rather than resizing the grid mid-turn.
          </p>
          <div
            className={`grid max-w-wide gap-x-3 gap-y-14 ${COLS[cols].className}`}
            data-deck
          >
            {CARDS.map((card, i) => (
              // Centred, not pinned right: the slack is shared either side at
              // rest, and the room for the cover is opened by the gesture.
              <div key={`cell-${i}`} className="flex justify-center">
              <FlipCard
                key={`${flip}-${size}-${speed}-${zoom}-${angle}-${shift}-${i}`}
                card={card}
                index={i}
                flip={flip}
                size={size}
                ms={SPEEDS[speed].ms}
                zoom={zoom === "on"}
                angle={ANGLES[angle].deg}
                shift={SHIFTS[shift].px}
              />
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-xn-border py-10">
          <p className="text-sm text-xn-ink-soft">
            Delete this route once the turn is chosen.
          </p>
        </footer>
      </div>
    </div>
  );
}
