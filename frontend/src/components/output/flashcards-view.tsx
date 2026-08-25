"use client";

import { useState } from "react";

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

  return (
    // Centred rather than pinned: the slack sits either side at rest, and
    // the lid's room is opened by the card stepping across.
    <div className="flex justify-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-pressed={open}
        aria-label={`Card ${index + 1}. ${open ? "Showing answer" : "Showing prompt"}. Activate to turn over.`}
        className={[
          "relative block h-[300px] w-full max-w-[220px] text-left",
          // Perspective belongs on the parent of the rotating element.
          // Without it the cover does not swing, it squashes horizontally.
          "[perspective:2000px]",
          "transition-transform ease-xn hover:scale-[1.03]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xn-ink",
        ].join(" ")}
        style={{
          transitionDuration: `${DURATION_MS}ms`,
          transform: open ? `translateX(${STEP_PX}px)` : undefined,
        }}
      >
        {/* The answer, lying under the cover from the start. */}
        <span
          className="absolute inset-0 flex flex-col overflow-y-auto rounded-xn-md border border-xn-border p-4"
          style={{ backgroundColor: `color-mix(in srgb, ${accent} 10%, var(--xn-surface))` }}
          aria-hidden={!open}
        >
          <span className="mb-2 shrink-0 font-mono text-[11px]" style={{ color: accent }}>
            Answer
          </span>
          <span className="text-[14px] leading-[1.6] text-xn-ink">{card.back}</span>
        </span>

        {/* The cover. transform-origin at the spine is the whole trick —
            about its middle it would read as a flip rather than an opening. */}
        <span
          // overflow-y-auto, matching the answer: a long prompt would
          // otherwise be clipped with no way to read the rest of it, and
          // the front is generated text with no length guarantee.
          className="absolute inset-0 flex origin-left flex-col overflow-y-auto rounded-xn-md border border-xn-border bg-xn-surface p-4 shadow-xn"
          style={{
            transform: open ? `rotateY(${SWING_DEG}deg)` : "rotateY(0deg)",
            transitionProperty: "transform",
            transitionDuration: `${DURATION_MS}ms`,
          }}
          aria-hidden={open}
        >
          <span className="mb-2 shrink-0 font-mono text-[11px]" style={{ color: accent }}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-[15px] font-medium leading-[1.55] text-xn-ink">
            {card.front}
          </span>
        </span>
      </button>
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
