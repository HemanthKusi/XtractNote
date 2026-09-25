// src/app/dev/social-templates/fold.ts
//
// Where a LinkedIn post stops being shown, and the two budgets that decide it.
//
// ── Why this is its own module ──
//
// It was inside `content.ts`, which is sample copy. This is not copy: it is the
// only real logic on the social surface besides the thread's budget split, it
// decides both what the preview shows AND what its readout claims, and it is
// the part anything that eventually VALIDATES generation output will want.
//
// Splitting it out also makes it testable, which it was not before. `content.ts`
// imports through the `@/` alias, and a plain node script cannot resolve that.
// This file imports NOTHING, so `scripts/check-fold.mjs` can import it directly
// and exercise the real function rather than a copy of it pasted into a test —
// which matters here, because §13 already records a verification script that
// re-stated the thing it was checking and so confirmed its own bug.
//
// Keep it importing nothing.

/** The hard ceiling. Reached far less often than the fold below it. */
export const POST_LIMIT = 3000;

/**
 * Where the feed stops showing a post, per device.
 *
 * Cross-checked against two independent sources 2026-09-25 rather than
 * recalled. Both give the same pair and both say plainly that the figures are
 * approximate and drift across app versions — the platform tests variations —
 * so these are what a writer can act on rather than a constant the destination
 * guarantees.
 *
 * MOBILE IS THE ONE THAT MATTERS, for the same reason the newsletter's mobile
 * subject limit is: it is where the reading happens, and a hook that only
 * survives on desktop is a hook most readers never finish.
 */
export const POST_FOLD = {
  mobile: 140,
  desktop: 210,
} as const;

/**
 * The other half of the fold, and the half no previous platform had.
 *
 * Three lines, and BLANK LINES COUNT — an empty line spends one of the three,
 * so an airy opener is cut earlier than its character count predicts. This is
 * the budget the prompt's "generous line breaks" instruction burns.
 */
export const POST_FOLD_LINES = 3;

/** Which budget ran out first. */
export type FoldCause = "characters" | "lines";

export interface Fold {
  /** What the feed shows before "…more". */
  visible: string;
  /** What it hides. Empty when the whole post fits. */
  hidden: string;
  /** Which budget cut it, or `null` when nothing folds. */
  cause: FoldCause | null;
}

/**
 * Cut a post at whichever of its two budgets runs out first.
 *
 * ── WHAT THIS MODELS, AND WHAT IT DOES NOT ──
 *
 * `maxLines` counts HARD line breaks. It does not count rendered ones, and the
 * distinction is not academic: the destination truncates by rendered line box,
 * so a long opening paragraph that wraps to three lines is folded by the real
 * feed while this function still sees one line and lets the character budget
 * decide.
 *
 * It cannot be fixed in here. Rendered wrapping is layout — it depends on the
 * card's width, the font and the text itself — and a pure function has no font
 * metrics. Measuring line boxes in the component was considered and rejected
 * for a sharper reason than difficulty: the card renders at the DESKTOP column
 * width while this deliberately marks the MOBILE fold, so counting rendered
 * lines there would faithfully measure the wrong device.
 *
 * So the two budgets divide the work. The character budget is the proxy for
 * wrapping — ~140 characters is roughly three wrapped lines of ordinary prose
 * on a phone — and the hard-break budget catches the airy opener that spends
 * its lines long before its characters. Neither catches both cases alone,
 * which is exactly why the destination applies both.
 *
 * WHAT FOLLOWS FROM THAT, and it is a requirement on the surface rather than a
 * caveat: anything displaying this result must describe the line budget as
 * PARAGRAPH BREAKS, not as rendered lines. Calling it a three-line fold claims
 * a fidelity this does not have, and the reader of a specimen has no way to
 * know the difference. A comment asserting a property the code lacks is the
 * failure §13 calls worse than the bug itself; on-screen copy asserting one is
 * the same failure with a wider audience.
 *
 * ── The character cut snaps back to a word boundary ──
 *
 * Slicing at exactly `chars` splits whatever word straddles it, and the first
 * render of this template showed why that is not merely untidy: the marker
 * landed inside "worth" and the line read "the mechanism is w…more orth
 * understanding". A mangled word reads as breakage, which is the same mistake
 * as a row of blanks — the surface looked broken where it was only truncated.
 *
 * The destination breaks at a word, so this does too. A line cut needs no
 * snapping: the end of a line is already a boundary.
 */
export function foldAt(text: string, chars: number, maxLines: number): Fold {
  const lines = text.split("\n");

  // Blank lines are included deliberately: the destination counts them.
  const lineCut =
    lines.length > maxLines ? lines.slice(0, maxLines).join("\n").length : Infinity;
  const charCut = text.length > chars ? chars : Infinity;

  if (lineCut === Infinity && charCut === Infinity) {
    return { visible: text, hidden: "", cause: null };
  }

  // A tie is attributed to characters. Both are true at that index, and naming
  // one keeps the readout from having to say "both".
  const cause: FoldCause = charCut <= lineCut ? "characters" : "lines";
  let cut = Math.min(lineCut, charCut);

  if (cause === "characters") {
    // Back up to the last break at or before the budget. `lastIndexOf` on the
    // slice finds it without a regex scan, and a word longer than the whole
    // budget — no break to find — keeps the hard cut rather than collapsing
    // the visible text to nothing.
    const boundary = Math.max(
      text.lastIndexOf(" ", cut),
      text.lastIndexOf("\n", cut),
    );
    if (boundary > 0) cut = boundary;
  }

  return {
    visible: text.slice(0, cut),
    hidden: text.slice(cut),
    cause,
  };
}
