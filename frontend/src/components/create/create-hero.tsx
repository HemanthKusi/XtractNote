"use client";

// ─────────────────────────────────────────────────────────────
// components/create/create-hero.tsx
//
// The head of the create route: the title, the one line under it, and
// the field itself.
//
// ── Why this is HeroInput and not Input ──
//
// The route used <Input> with a Button beside it — the same control a
// toolbar uses, on the screen the whole product exists for. HeroInput was
// built for exactly this placement: it cycles suggestions while the field
// is idle and dissolves the typed text on submit.
//
// ── What this component does NOT do ──
//
// It owns no state and makes no calls. The page keeps the value and the
// submit handler, because the phase machine decides what a submit means —
// a link goes to metadata, anything else goes to search.
//
// ── The idle page is deliberately sparse ──
//
// The design has two more bands under this: unfinished drafts, and videos
// worth converting. Neither can be built yet. Nothing writes a draft —
// every insert hardcodes 'saved' — and there is no recommendation source
// of any kind. Both were left out rather than filled with invented data.
// See the create-route issue for what unblocks them.
// ─────────────────────────────────────────────────────────────

import { HeroInput } from "@/components/ui/hero-input";

// Cycled while the field is idle and empty. Two link shapes and two topic
// prompts, so the field teaches both things it accepts without a label
// saying so.
const PLACEHOLDERS = [
  "Paste a YouTube link…",
  "Or search a topic — “how sleep affects memory”",
  "youtube.com/watch?v=…",
  "Anything you'd rather read than watch",
];

interface CreateHeroProps {
  /** Called with the field's value on submit. */
  onSubmit: (value: string) => void;
  /** Mirrors the field's value up to the page on every keystroke. */
  onValueChange: (value: string) => void;
  /** Draws the error border and ring. */
  error?: boolean;
  /** Blocks input while a lookup or a search is in flight. */
  disabled?: boolean;
  /** Rendered after the field — the error line, results, whatever the phase wants. */
  children?: React.ReactNode;
}

export function CreateHero({
  onSubmit,
  onValueChange,
  error = false,
  disabled = false,
  children,
}: CreateHeroProps) {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-h3 text-xn-ink">Create</h1>
        <p className="mt-2 text-body text-xn-ink-muted">
          Paste a link, or search a topic.
        </p>
      </header>

      <HeroInput
        placeholders={PLACEHOLDERS}
        prefix={<LinkGlyph />}
        onSubmit={onSubmit}
        onValueChange={onValueChange}
        error={error}
        disabled={disabled}
      />

      {children}
    </>
  );
}

function LinkGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </svg>
  );
}
