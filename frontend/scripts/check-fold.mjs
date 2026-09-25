/**
 * check-fold
 *
 * Fails when `foldAt` stops cutting a post where it says it does.
 *
 * ── Why this exists ──
 * `foldAt` decides two things at once: what the preview SHOWS, and what its
 * readout CLAIMS about where the boundary fell. Both are silent failures. A
 * wrong cut still renders a plausible-looking post, and a wrong readout still
 * prints a confident number — so a change here is invisible until somebody
 * counts characters by hand.
 *
 * ── Why it imports rather than re-states ──
 * It imports the real module. §13 records a verification script that re-typed
 * the copy it was checking and used the same bad index arithmetic to check it,
 * reporting all four tones correct while two were wrong. A test holding its own
 * copy of the logic can only confirm itself. `fold.ts` imports nothing, which
 * is what makes importing it from plain node possible, and node strips its
 * types natively — so this needs no test framework and no dependency.
 *
 * ── Why a script and not a test runner ──
 * The project has no test framework and installing one is a decision, not a
 * detail. `check-design-tokens` established the shape: a plain .mjs that runs
 * inside `npm run lint`. This follows it. If a runner is ever adopted these
 * cases move into it unchanged, because they are ordinary assertions.
 *
 * ── Why relying on native type stripping is safe here ──
 * Review flagged that this needs Node 22.18+, while the README claimed 18+.
 * The claim was already false: Next 16 declares >=20.9, ESLint 10 declares
 * >=20.19, and supabase-js declares >=20 — so `npm run lint` could not run on
 * Node 18 before this file existed, because eslint itself refuses it.
 *
 * Node 18 reached end of life 2025-04-30 and Node 20 on 2026-04-30, so every
 * version still in support runs this. `engines` in package.json and the
 * README now state the real floor rather than an aspirational one. This does
 * raise it from 20.19 to 22.18, and that is a deliberate trade: the
 * alternative is a check that cannot import the function it tests, and a test
 * holding its own copy of the logic can only confirm itself.
 */

import {
  foldAt,
  POST_FOLD,
  POST_FOLD_LINES,
} from "../src/app/dev/social-templates/fold.ts";

const M = POST_FOLD.mobile;
const L = POST_FOLD_LINES;

let failed = 0;
let run = 0;

const show = (s) => JSON.stringify(s.length > 48 ? `${s.slice(0, 45)}...` : s);

function check(name, actual, expected) {
  run++;
  const ok = actual === expected;
  if (!ok) {
    failed++;
    console.error(`  FAIL  ${name}\n          expected ${show(String(expected))}\n          actual   ${show(String(actual))}`);
  }
}

// ── Nothing folds ──────────────────────────────────────────────
{
  const short = "One line, well inside both budgets.";
  const f = foldAt(short, M, L);
  check("short post does not fold", f.cause, null);
  check("short post keeps all its text", f.visible, short);
  check("short post hides nothing", f.hidden, "");

  const exact = "x".repeat(M);
  check("exactly at the character budget does not fold", foldAt(exact, M, L).cause, null);

  const threeLines = "a\nb\nc";
  check("exactly the break budget does not fold", foldAt(threeLines, M, L).cause, null);
}

// ── The character budget ───────────────────────────────────────
{
  const over = "x".repeat(M + 1);
  const f = foldAt(over, M, L);
  check("one character over folds", f.cause, "characters");
  // No break to snap back to, so the hard cut stands rather than collapsing
  // the visible text to nothing.
  check("an unbroken word keeps the hard cut", f.visible.length, M);

  const prose = "word ".repeat(80);
  const p = foldAt(prose, M, L);
  check("prose folds on characters", p.cause, "characters");
  check("visible never exceeds the budget", p.visible.length <= M, true);
  check("nothing is lost between the halves", p.visible + p.hidden, prose);
}

// ── The break budget, and blank lines spending one ─────────────
{
  const fourShort = "a\nb\nc\nd";
  check("a fourth line folds on breaks", foldAt(fourShort, M, L).cause, "lines");

  // The finding this platform exists to demonstrate: an airy opener runs out
  // of breaks long before it runs out of characters.
  const airy = "Short hook.\n\nShorter line.\n\nThe rest of the post goes here.";
  const a = foldAt(airy, M, L);
  check("blank lines spend the budget", a.cause, "lines");
  check("airy opener folds well under the character budget", a.visible.length < M, true);
  check("it stops at the end of the third break", a.visible, "Short hook.\n\nShorter line.");

  const withBlank = "a\n\nb";
  check("three lines including a blank does not fold", foldAt(withBlank, M, L).cause, null);
}

// ── The tie ────────────────────────────────────────────────────
{
  // Both budgets run out at the same index. Characters wins by documented
  // convention, so the readout never has to say "both".
  const line = "y".repeat(M);
  const tie = `${line}\n${line}\n${line}\n${line}`;
  const t = foldAt(tie, M, L);
  check("a tie is attributed to characters", t.cause, "characters");
}

// ── The word-boundary snap ─────────────────────────────────────
{
  // Regression: the first render cut inside "worth" and read
  // "the mechanism is w...more orth understanding".
  const mid = `${"a".repeat(M - 5)} understanding follows here`;
  const f = foldAt(mid, M, L);
  check("the snap does not split a word", /\s$/.test(f.visible) || /^\s/.test(f.hidden), true);
  check("the snap never exceeds the budget", f.visible.length <= M, true);
  check("the snap loses no text", f.visible + f.hidden, mid);

  // A break exactly at the budget should not be walked back past.
  const atBoundary = `${"a".repeat(M)} tail`;
  check("a break at the budget is kept", foldAt(atBoundary, M, L).visible.length, M);
}

// ── The invariant that matters most ────────────────────────────
{
  // Whatever it decides, it must never invent or drop text. A preview that
  // silently loses a sentence is worse than one that folds in the wrong place.
  const samples = [
    "",
    "tiny",
    "a\n\nb\n\nc\n\nd",
    "word ".repeat(200),
    `${"x".repeat(500)}\n\n${"y".repeat(500)}`,
  ];
  for (const s of samples) {
    const f = foldAt(s, M, L);
    check(`round-trips ${show(s)}`, f.visible + f.hidden, s);
  }
}

if (failed > 0) {
  console.error(`\ncheck-fold: ${failed} of ${run} checks FAILED.`);
  process.exit(1);
}

console.log(`check-fold: ${run} checks passed.`);
