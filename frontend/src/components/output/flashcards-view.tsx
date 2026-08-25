"use client";

import { useEffect, useRef, useState } from "react";

import { contentTypeColors } from "@/lib/constants/theme";
import type { Flashcard, FlashcardsBody } from "@/lib/content/types";

// ─────────────────────────────────────────────────────────────
// FlashcardsView
//
// Renderer for a structured flashcards body
// ({ kind: "flashcards", cards: [{ front, back }] }).
//
// CONTAINER CONTRACT — this renders BARE content, with no Card wrapper of
// its own. OutputView already provides the Card, the format header, and the
// max-width container; these components slot in where the Markdown renderer
// sits for prose types. Wrapping in a Card here would nest a box inside a
// box with doubled padding and borders.
//
// ── The whole set, and every card opens ──
// It used to print both sides of every card at once, which is a printed
// answer key rather than a flashcard. Now the prompt is a cover hinged at
// its left edge with the answer lying underneath, and clicking swings the
// cover open like a book.
//
// The set stays on screen together rather than becoming a one-at-a-time
// deck: reviewing means moving around a set, and hiding fifteen cards to
// show one turns browsing into navigation.
//
// ── Click, never hover ──
// Opening is a click on every device. A hover reveal cannot be reached on
// a touch screen at all, and a control that behaves one way with a mouse
// and another with a finger is worse than one that behaves the same
// everywhere.
//
// ── The geometry is measured, not chosen ──
// A lid hinged at the spine swings outside its own card, and an open cover
// renders about 12% taller than the card because perspective magnifies
// whatever leans toward the viewer. Three consequences, all load-bearing:
//
//   1. The card is a FIXED 220 wide. Swing scales with width, while a wider
//      card leaves less slack in its cell to swing into — the two work
//      against each other, so widening is punished twice. At 240 the lid
//      needed 86px of room and had 72px, and landed on its neighbour.
//   2. The ROW gap is larger than the column gap, because two vertically
//      stacked open cards overlap otherwise — by 24px at a 12px gap.
//   3. Cards are CENTRED in their cells and step right as they open, so
//      the room for the lid is made by the gesture rather than reserved as
//      permanent dead space beside every card.
//
// ── The keyboard could not reach a long face ──
// It used to be a fixed 300px with both faces scrolling inside it. Nothing
// was clipped, but nothing could be reached either: `overflow-y-auto` on a
// span INSIDE the button made the scroll box a CHILD of the focused
// element, and arrow keys act on the nearest scrollable ANCESTOR. A mouse
// user scrolled with the wheel; a keyboard user could not read a long
// prompt at all. Issue #346, WCAG 2.1.1.
//
// The card is no longer a <button>. It is a div holding two visually
// hidden buttons — one per face, only the visible one reachable — and the
// scroll box is now an ANCESTOR of whichever button has focus, so arrows
// scroll the text. One tab stop per card, and the ring is drawn from
// focus-within because the real control is invisible.
//
// Four things there are load-bearing and each looks removable. They are
// commented at their call sites rather than here, because that is where
// someone will be standing when they consider deleting one:
//
//   - `relative` on each face, or the absolutely positioned button escapes
//     the scroller and arrows scroll the page.
//   - `tabIndex={-1}` on each face, or a scrolling card costs two tab stops
//     while a short one costs one.
//   - `outline` alongside `outline-2`, or the focus ring computes to
//     outline-style:none and nothing is drawn.
//   - focus moved in an EFFECT, not a rAF, or it lands before React has
//     swapped the buttons and stays on the hidden one.
//
// Every one of those was a real defect found by testing the rendered page,
// not by reading the code.
//
// ── Faces grow to a cap, then scroll ──
// A face grows with its content up to MAX_FACE_PX and scrolls past it.
// Both faces share a grid cell, so the card is as tall as its taller face
// and the two never disagree about height.
//
// The cap is what keeps rows tidy, and it also removes a limit that existed
// while cards grew without bound: perspective magnifies an open cover by a
// PROPORTION of its height, so a tall enough card used to reach into the
// row beneath — measured as going negative around 1000px. The cap makes
// that unreachable rather than merely unlikely.
//
// ── The answer must stay hidden from screen readers too ──
// It is in the DOM from the first paint, sitting under the cover. Without
// aria-hidden tied to the open state, a screen reader would read every
// answer before its card was opened, which defeats the whole feature.
//
// Reduced motion needs nothing here: the global rule neutralises the
// transition, so opening becomes an instant swap rather than breaking,
// because the state is a class rather than an animation that must run to
// completion.
// ─────────────────────────────────────────────────────────────

/** How far the cover swings past its spine, and how far the card steps aside. */
const SWING_DEG = -110;
const STEP_PX = 32;

/**
 * The cover's swing. Also the duration of the quiz's explanation reveal —
 * the `unfold` animation in tailwind.config.ts is set to 450ms to match
 * this deliberately.
 *
 * These are the only two places in the app where an interaction reveals
 * content, and a reveal that takes a different length of time in each
 * reads as two unrelated products. If one changes, change both.
 */
const DURATION_MS = 450;

/**
 * The cap a face grows to before it scrolls. Provisional — to be settled
 * from the specimen dial at /dev/flashcards.
 */
const MAX_FACE_PX = 600;

interface FlashcardsViewProps {
  body: FlashcardsBody;
  className?: string;
}

function FlashcardTile({
  card,
  index,
  accent,
}: {
  card: Flashcard;
  index: number;
  accent: string;
}) {
  const [open, setOpen] = useState(false);
  const coverBtn = useRef<HTMLButtonElement>(null);
  const answerBtn = useRef<HTMLButtonElement>(null);
  // Set only when the keyboard drove the turn, so focus follows the control
  // to whichever face becomes visible. A mouse click leaves focus alone
  // rather than yanking it onto an invisible element.
  const chaseFocus = useRef(false);

  const toggle = () => {
    chaseFocus.current =
      document.activeElement === coverBtn.current ||
      document.activeElement === answerBtn.current;
    setOpen((o) => !o);
  };

  // AFTER commit, not from a rAF in the handler. A rAF fires before React has
  // swapped the two buttons' tabIndex, so focus stays on the control that has
  // just become hidden and unreachable — the state this whole design exists
  // to avoid.
  useEffect(() => {
    if (!chaseFocus.current) return;
    chaseFocus.current = false;
    (open ? answerBtn : coverBtn).current?.focus();
  }, [open]);

  const faceBase = [
    // `relative` is load-bearing. The hidden button inside is absolutely
    // positioned (sr-only), and an absolutely positioned element takes its
    // scroll context from its CONTAINING BLOCK, not its DOM parent. A static
    // face establishes none, so the button escapes the scroller and arrow
    // keys scroll the page instead of the text. The cover masked this for a
    // while: its rotateY transform establishes a containing block by
    // accident, so only the OPEN card was ever broken.
    "relative col-start-1 row-start-1 flex flex-col overflow-y-auto",
    "rounded-xn-md border border-xn-border p-4",
  ].join(" ");

  return (
    // Centred rather than pinned: the slack sits either side at rest, and
    // the lid's room is opened by the card stepping across.
    <div className="flex justify-center">
      {/* The click handler here is the MOUSE path only. The keyboard path is
          the hidden button inside the visible face, which is a real <button>,
          and the ring is drawn from focus-within so the card still reads as
          focused even though its control is invisible. */}
      <div
        onClick={toggle}
        className={[
          "grid min-h-[300px] w-full max-w-[220px] cursor-pointer text-left",
          // Perspective belongs on the parent of the rotating element.
          // Without it the cover does not swing, it squashes horizontally.
          "[perspective:2000px]",
          "transition-transform ease-xn hover:scale-[1.03]",
          // `outline` for the STYLE is not optional. `outline-2` sets width
          // only; on :focus-visible the browser supplies the style, but this
          // is :focus-within on a card that is not itself focused, so without
          // it the ring computes to outline-style:none and nothing is drawn —
          // which reads exactly like the keyboard being broken.
          "rounded-xn-md focus-within:outline focus-within:outline-2",
          "focus-within:outline-offset-2 focus-within:outline-xn-ink",
        ].join(" ")}
        style={{
          transitionDuration: `${DURATION_MS}ms`,
          transform: open ? `translateX(${STEP_PX}px)` : undefined,
        }}
      >
        {/* The answer, lying under the cover from the start. */}
        <span
          className={faceBase}
          style={{
            maxHeight: `${MAX_FACE_PX}px`,
            backgroundColor: `color-mix(in srgb, ${accent} 10%, var(--xn-surface))`,
          }}
          // Out of sequential tab order. Browsers make a scrollable region
          // focusable so a keyboard user can reach it, which would give an
          // overflowing card TWO tab stops while a short one has one. The
          // button inside already provides arrow scrolling, so the extra stop
          // is redundant; -1 keeps the region programmatically focusable.
          tabIndex={-1}
          aria-hidden={!open}
        >
          <button
            ref={answerBtn}
            type="button"
            tabIndex={open ? 0 : -1}
            className="sr-only"
            onClick={(e) => {
              // Explicit rather than letting activation bubble to the card: an
              // invisible control whose only route to its own behaviour runs
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

        {/* The cover. transform-origin at the spine is the whole trick —
            about its middle it would read as a flip rather than an opening. */}
        <span
          className={`${faceBase} origin-left bg-xn-surface shadow-xn`}
          style={{
            maxHeight: `${MAX_FACE_PX}px`,
            transform: open ? `rotateY(${SWING_DEG}deg)` : "rotateY(0deg)",
            transitionProperty: "transform",
            transitionDuration: `${DURATION_MS}ms`,
          }}
          tabIndex={-1}
          aria-hidden={open}
        >
          <button
            ref={coverBtn}
            type="button"
            tabIndex={open ? -1 : 0}
            className="sr-only"
            onClick={(e) => {
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

export function FlashcardsView({ body, className = "" }: FlashcardsViewProps) {
  // Flashcards' identity color, so the view reads as belonging to its format
  // the same way the header icon does.
  const accent = contentTypeColors.flashcards.color;
  const cards = body.cards;

  // A validated body always has at least one card (the backend errors when
  // none survive validation), but a hand-edited or imported row might not —
  // and a blank area with no explanation is worse than a sentence.
  if (cards.length === 0) {
    return (
      <div className={className}>
        <p className="text-[14px] text-xn-ink-muted">No flashcards to display.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Count line: tells the user the scale of the set before they scroll. */}
      <p className="mb-4 text-[13px] text-xn-ink-muted">
        {cards.length} {cards.length === 1 ? "card" : "cards"} · tap a card to turn it over
      </p>

      {/* THE COLUMN COUNT IS THE CONTAINER'S DECISION, NOT A BREAKPOINT'S.
          This is `auto-fit`: make as many columns as genuinely fit, each at
          least 310px, and share the remainder between them. The browser
          measures the box this grid is actually in, so the count is right
          on every surface without a single width named here.

          That is deliberate, and it replaced `sm:grid-cols-2`. Tailwind's
          breakpoints measure the VIEWPORT, and on an app-shell surface the
          viewport is not the container — a sidebar and several layers of
          padding sit in between. `sm:` fires at a 640px window, where this
          grid has around 250px to work with, and asks it for two 220px
          columns. Every attempt to fix that by choosing a better window
          number failed the same way, because the two output routes have
          different amounts of furniture and no single number is right for
          both.

          310 is the one real constraint, stated directly: it is the
          narrowest cell in which an open cover still clears the card beside
          it. Measured across every width from 300 to 1300px with all cards
          open — 1 column below 640, 2 at 640, 3 at 960, 4 at 1280, and the
          tightest clearance anywhere is 6.4px. Never negative.

          The `min(310px, 100%)` matters and is not decoration. A bare
          `minmax(310px, 1fr)` treats 310 as a hard floor, so in a container
          narrower than that it still lays a 310px track and the card
          overflows — and the Card around it is `overflow-hidden`, so the
          card is clipped rather than merely tight. Wrapping the floor in
          `min()` lets the track collapse to the container when the
          container is the smaller of the two, which costs nothing at every
          width where 310 fits.

          The row gap is deliberately larger than the column gap for a
          different reason: an open cover renders taller than its card, so
          stacked rows collide at a gap sized only for closed ones. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(310px,100%),1fr))] gap-x-3 gap-y-14">
        {cards.map((card, index) => (
          <FlashcardTile key={index} card={card} index={index} accent={accent} />
        ))}
      </div>
    </div>
  );
}
