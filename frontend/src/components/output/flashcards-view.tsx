"use client";

import { contentTypeColors } from "@/lib/constants/theme";
import type { FlashcardsBody } from "@/lib/content/types";

// ─────────────────────────────────────────────────────────────
// FlashcardsView
//
// Read-only renderer for a structured flashcards body
// ({ kind: "flashcards", cards: [{ front, back }] }).
//
// CONTAINER CONTRACT — this renders BARE content, with no Card wrapper of
// its own. OutputView already provides the Card, the format header, and the
// max-width container; these components slot in where the Markdown renderer
// sits for prose types. Wrapping in a Card here would nest a box inside a
// box with doubled padding and borders.
//
// STATIC BY DESIGN (Phase 11). Every card shows its front and back at once —
// no flip animation, no click-to-reveal. Because the body is stored as
// structured JSON rather than flattened to Markdown, adding interactivity
// later replaces THIS FILE only: no prompt rewrite, no storage change, no
// migration. That is the whole point of storing the shape now.
// ─────────────────────────────────────────────────────────────

interface FlashcardsViewProps {
  body: FlashcardsBody;
  className?: string;
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
      <p className="text-[14px] text-xn-ink-muted">No flashcards to display.</p>
    );
  }

  return (
    <div className={className}>
      {/* Count line: tells the user the scale of the set before they scroll. */}
      <p className="mb-4 text-[13px] text-xn-ink-muted">
        {cards.length} {cards.length === 1 ? "card" : "cards"}
      </p>

      <div className="flex flex-col gap-3">
        {cards.map((card, index) => (
          <div
            key={index}
            className="rounded-xn-md border border-xn-border bg-xn-bg-deep p-4"
          >
            {/* FRONT — the prompt side. Heavier weight, full ink color, with
                the card number in the format's identity color. */}
            <div className="flex gap-3">
              <span
                className="shrink-0 font-mono text-[12px] leading-[1.6]"
                style={{ color: accent }}
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <p className="text-[15px] font-medium leading-[1.6] text-xn-ink">
                {card.front}
              </p>
            </div>

            {/* Hairline divider: the front/back split is the whole structure
                of a flashcard, so it needs to be visible at a glance rather
                than inferred from two stacked paragraphs. */}
            <div className="my-3 border-t border-xn-border" />

            {/* BACK — the answer side. Lighter and muted so the pair reads as
                prompt-then-answer rather than two equal statements. Indented
                to align with the front's text, past the number column. */}
            <p className="pl-[calc(0.75rem+1ch)] text-[14px] leading-[1.65] text-xn-ink-muted">
              {card.back}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}