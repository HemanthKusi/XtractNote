"use client";

// ─────────────────────────────────────────────────────────────
// Quiz specimens — TEMPORARY
// ─────────────────────────────────────────────────────────────
// http://localhost:3000/dev/quiz
//
// FIVE WHOLE DESIGNS, not five skins. They differ in composition — how a
// question is presented, whether the set is visible at once, where
// progress lives, what the surface is made of. The reveal treatment is
// held CONSTANT across all of them, so the comparison is about structure
// rather than palette.
//
// E is the chosen one: A's per-question cards with D's score rail. The
// other four are kept for comparison, not as live candidates.
//
// The interaction is settled and identical in each: pick an option and
// that question resolves immediately, the reveal is terminal, a wrong
// pick marks both the wrong choice and the right one, and the explanation
// shows either way. Nothing stores attempts, so it is session-only and a
// reload clears it.
//
// ⚠ Three things are fixed and carry into whichever wins:
//
// 1. NOTHING RELIES ON COLOUR ALONE. Correct and incorrect always carry a
//    glyph and a weight change too. The Paper theme is low contrast and
//    colourblindness is not an edge case.
//
// 2. NO FIXED-HEIGHT SCROLL BOXES. The flashcard lesson: a scrollable
//    region inside a button cannot be reached by keyboard, because arrow
//    keys act on the focused element's nearest scrollable ANCESTOR and
//    the box is its child. Everything here grows to fit instead, which
//    makes the problem impossible rather than handled.
//
// 3. DIMMED TEXT USES --xn-ink-muted. Measured on the deep ground: muted
//    is 6.08:1, --xn-ink-soft is 2.89:1, and --xn-ink-faint is 10% alpha.
//    Only muted clears 4.5:1, so it is the only thing an option may be
//    dimmed to and still be readable.
//
// The container mirrors the real chain exactly — max-w-output with px-6,
// then a panel whose border and p-6 leave its contents 960, which is what
// OutputView actually gives a renderer. A harness at a comfortable width
// is how the flashcard grid shipped a collision that only existed in
// production.
//
// Nothing here is shipped and no real component is modified.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";

import { QuizView } from "@/components/output/quiz-view";
import { useTheme } from "@/components/shared/theme-provider";
import { contentTypeColors, THEMES, type ThemeName } from "@/lib/constants/theme";
import type { QuizQuestion } from "@/lib/content/types";

const QUESTIONS: readonly QuizQuestion[] = [
  {
    question: "What is a transformer's attention mechanism actually doing?",
    options: [
      "Compressing the input into a fixed-length vector",
      "Weighing how much every token should influence every other token",
      "Passing information along the sequence one step at a time",
      "Selecting which layers to skip for a given input",
    ],
    answerIndex: 1,
    explanation:
      "Attention computes a weighting between every pair of positions, in parallel, rather than carrying state forward through the sequence.",
  },
  {
    question: "Why did transformers largely replace recurrent networks for language tasks?",
    options: [
      "They need less training data",
      "They are smaller and cheaper to run",
      "They parallelise across the sequence instead of processing it in order",
      "They do not require positional information",
    ],
    answerIndex: 2,
    explanation:
      "Order-independence is what makes them parallelisable, which is also why position has to be added back explicitly.",
  },
  {
    question: "What is positional encoding for?",
    options: [
      "Attention has no inherent sense of order, so position must be added explicitly",
      "It compresses long sequences into fewer tokens",
      "It marks which tokens are punctuation",
    ],
    answerIndex: 0,
    explanation: null,
  },
  {
    question: "What does the context window describe?",
    options: [
      "How many tokens the model can attend to at once",
      "How long the model takes to respond",
      "The number of layers in the network",
    ],
    answerIndex: 0,
    explanation: "It is a hard limit on input length, not a measure of speed or depth.",
  },
];

const QUIZ = contentTypeColors.quiz;

type Answers = (number | null)[];

function letter(i: number) {
  return String.fromCharCode(65 + i);
}

type OptionState = "idle" | "correct" | "wrongPick" | "other";

function stateOf(q: QuizQuestion, picked: number | null, i: number): OptionState {
  if (picked === null) return "idle";
  if (i === q.answerIndex) return "correct";
  if (i === picked) return "wrongPick";
  return "other";
}

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xn-ink";

interface DesignProps {
  answers: Answers;
  pick: (questionIndex: number, optionIndex: number) => void;
  reset: () => void;
}

// ── Shared pieces ───────────────────────────────────────────

/**
 * One option. `density` changes padding and border treatment only — the
 * marks that carry meaning are identical everywhere, so switching design
 * never changes what "correct" looks like.
 */
function Option({
  q,
  picked,
  index,
  density,
  onPick,
}: {
  q: QuizQuestion;
  picked: number | null;
  index: number;
  density: "boxed" | "ruled" | "large";
  onPick: () => void;
}) {
  const state = stateOf(q, picked, index);
  const resolved = picked !== null;
  const glyph = state === "correct" ? "✓" : state === "wrongPick" ? "✕" : null;

  const shape =
    density === "boxed"
      ? "rounded-xn-sm px-2.5 py-2.5 text-[15px]"
      : density === "large"
        ? "rounded-xn-md px-4 py-3.5 text-[16px]"
        : "rounded-xn-sm px-1.5 py-2 text-[15px]";

  // Right and wrong are the two states people read at a glance, so they get
  // the near-universal pair: green and red. Never on their own — each also
  // carries a glyph and a weight change, because the Paper theme is low
  // contrast and colourblindness is not an edge case.
  const tone =
    state === "correct"
      ? "border-xn-success bg-xn-success-soft text-xn-success font-medium"
      : state === "wrongPick"
        ? "border-xn-danger bg-xn-danger-soft text-xn-danger font-medium"
        : state === "other"
          ? "border-xn-border text-xn-ink-muted"
          : "border-xn-border text-xn-ink";

  return (
    <button
      type="button"
      disabled={resolved}
      onClick={onPick}
      className={[
        "flex w-full items-start gap-2.5 text-left leading-[1.55]",
        "transition-colors duration-xn ease-xn",
        shape,
        density === "ruled" ? "" : "border",
        tone,
        resolved ? "cursor-default" : "hover:bg-xn-surface-alt",
        FOCUS,
      ].join(" ")}
    >
      <span className="shrink-0 font-semibold tabular-nums">{letter(index)}.</span>
      <span className="flex-1">{q.options[index]}</span>
      {glyph && (
        <span
          className="shrink-0 font-semibold"
          aria-label={state === "correct" ? "Correct answer" : "Your answer, incorrect"}
        >
          {glyph}
        </span>
      )}
    </button>
  );
}

/**
 * Verdict and explanation.
 *
 * ── Why this is a block and not a line of text ──
 * It used to be two muted paragraphs, and the review of the specimens was
 * that it did not look like an explanation had appeared at all. It is the
 * payload of the whole interaction — the reason to answer rather than read
 * an answer key — so it is given a surface of its own: the format's tint,
 * a rule down its leading edge in the format's colour, and a label.
 *
 * The verdict keeps the semantic pair (green / red) because that is the
 * fact being reported. The explanation carries the FORMAT colour, because
 * it is quiz content rather than a judgement.
 *
 * ── Motion ──
 * `animate-fade-in` — opacity plus a 4px rise, on the shared duration and
 * easing. It is an animation on mount rather than a transition, which
 * matters: the block is CONDITIONALLY RENDERED, so there is no element to
 * transition from. That is also what keeps it out of the accessibility
 * tree until it exists, avoiding the flashcard problem where an answer sat
 * in the DOM from first paint and had to be hidden by hand.
 *
 * The global reduced-motion rule zeroes animation-duration, so this
 * becomes an instant appearance rather than breaking.
 *
 * The live region is on the always-present wrapper, not the block itself —
 * a region that appears at the same moment as its content may not announce.
 */
function Outcome({
  q,
  picked,
  indent = "",
}: {
  q: QuizQuestion;
  picked: number | null;
  indent?: string;
}) {
  const right = picked === q.answerIndex;

  return (
    <div aria-live="polite" className={indent}>
      {picked !== null && (
        <div className="animate-unfold origin-top">
          <p
            className={`mt-3.5 flex items-center gap-1.5 text-[14px] font-semibold ${
              right ? "text-xn-success" : "text-xn-danger"
            }`}
          >
            <span aria-hidden="true">{right ? "✓" : "✕"}</span>
            {right ? "Correct" : `Not quite — the answer is ${letter(q.answerIndex)}`}
          </p>

          {q.explanation && (
            <div
              className="mt-2 rounded-xn-sm border-l-[3px] px-3.5 py-3"
              style={{ backgroundColor: QUIZ.bg, borderLeftColor: QUIZ.color }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: QUIZ.color }}
              >
                Why
              </p>
              <p className="mt-1.5 text-[14px] leading-[1.65] text-xn-ink">{q.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Tally({ answers }: { answers: Answers }) {
  const answered = answers.filter((a) => a !== null).length;
  const correct = answers.filter((a, i) => a === QUESTIONS[i].answerIndex).length;
  return (
    <p className="mb-4 text-[13px] text-xn-ink-muted">
      {QUESTIONS.length} questions · {answered} answered
      {answered > 0 && ` · ${correct} correct`}
    </p>
  );
}

function Summary({ answers, onReset }: { answers: Answers; onReset: () => void }) {
  const correct = answers.filter((a, i) => a === QUESTIONS[i].answerIndex).length;
  return (
    <div
      className="rounded-xn-md border p-4"
      style={{ backgroundColor: QUIZ.bg, borderColor: QUIZ.border }}
    >
      <p className="text-[15px] font-semibold text-xn-ink">
        {correct} of {QUESTIONS.length} correct
      </p>
      <p className="mt-1 text-[13px] text-xn-ink-muted">
        Answers are not saved — reloading clears them.
      </p>
      <button
        type="button"
        onClick={onReset}
        className={`mt-3 rounded-xn-pill border border-xn-border bg-xn-surface px-3.5 py-1.5 text-[13px] font-medium text-xn-ink transition-colors duration-xn ease-xn hover:bg-xn-surface-alt ${FOCUS}`}
      >
        Try again
      </button>
    </div>
  );
}

// ── A · Stacked cards ───────────────────────────────────────

function DesignCards({ answers, pick, reset }: DesignProps) {
  const done = answers.every((a) => a !== null);
  return (
    <div>
      <Tally answers={answers} />
      <div className="flex flex-col gap-5">
        {QUESTIONS.map((q, qi) => (
          <div key={qi} className="rounded-xn-md border border-xn-border bg-xn-bg-deep p-4">
            <div className="flex items-baseline gap-3">
              <span
                className="w-6 shrink-0 text-right font-mono text-[19px] font-semibold leading-none tabular-nums"
                style={{ color: QUIZ.color }}
                aria-hidden="true"
              >
                {qi + 1}
              </span>
              <p className="text-[16px] font-medium leading-[1.6] text-xn-ink">{q.question}</p>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5 pl-9">
              {q.options.map((_, oi) => (
                <li key={oi}>
                  <Option
                    q={q}
                    picked={answers[qi]}
                    index={oi}
                    density="boxed"
                    onPick={() => pick(qi, oi)}
                  />
                </li>
              ))}
            </ul>
            <Outcome q={q} picked={answers[qi]} indent="pl-9" />
          </div>
        ))}
      </div>
      {done && (
        <div className="mt-5">
          <Summary answers={answers} onReset={reset} />
        </div>
      )}
    </div>
  );
}

// ── B · Exam sheet ──────────────────────────────────────────

function DesignSheet({ answers, pick, reset }: DesignProps) {
  const done = answers.every((a) => a !== null);
  return (
    <div>
      <Tally answers={answers} />
      <div className="border-t border-xn-border">
        {QUESTIONS.map((q, qi) => (
          <div key={qi} className="flex gap-5 border-b border-xn-border py-5">
            <span
              className="w-6 shrink-0 pt-0.5 text-right font-mono text-[15px] font-semibold tabular-nums text-xn-ink-muted"
              aria-hidden="true"
            >
              {qi + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-[19px] leading-[1.35] text-xn-ink">{q.question}</p>
              <ul className="mt-2.5 flex flex-col">
                {q.options.map((_, oi) => (
                  <li key={oi}>
                    <Option
                      q={q}
                      picked={answers[qi]}
                      index={oi}
                      density="ruled"
                      onPick={() => pick(qi, oi)}
                    />
                  </li>
                ))}
              </ul>
              <Outcome q={q} picked={answers[qi]} />
            </div>
          </div>
        ))}
      </div>
      {done && (
        <div className="mt-5">
          <Summary answers={answers} onReset={reset} />
        </div>
      )}
    </div>
  );
}

// ── C · One at a time ───────────────────────────────────────

function DesignSingle({ answers, pick, reset }: DesignProps) {
  const [cursor, setCursor] = useState(0);
  const q = QUESTIONS[cursor];
  const picked = answers[cursor];
  const last = cursor === QUESTIONS.length - 1;
  const done = answers.every((a) => a !== null);

  if (done) {
    return (
      <Summary
        answers={answers}
        onReset={() => {
          reset();
          setCursor(0);
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-5">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-[13px] font-medium text-xn-ink-muted">
            Question {cursor + 1} of {QUESTIONS.length}
          </p>
          <p className="text-[13px] text-xn-ink-muted">
            {answers.filter((a, i) => a === QUESTIONS[i].answerIndex).length} correct
          </p>
        </div>
        {/* Progress as a proportion, not a control. */}
        <div className="h-1 w-full overflow-hidden rounded-xn-pill bg-xn-surface-alt">
          <div
            className="h-full transition-[width] duration-xn ease-xn"
            style={{
              width: `${((cursor + (picked !== null ? 1 : 0)) / QUESTIONS.length) * 100}%`,
              backgroundColor: QUIZ.color,
            }}
          />
        </div>
      </div>

      <p className="font-serif text-[26px] leading-[1.25] text-xn-ink">{q.question}</p>

      <ul className="mt-5 flex flex-col gap-2">
        {q.options.map((_, oi) => (
          <li key={oi}>
            <Option q={q} picked={picked} index={oi} density="large" onPick={() => pick(cursor, oi)} />
          </li>
        ))}
      </ul>

      <Outcome q={q} picked={picked} />

      {picked !== null && !last && (
        <button
          type="button"
          onClick={() => setCursor((c) => c + 1)}
          className={`mt-5 rounded-xn-pill border border-xn-ink bg-xn-ink px-4 py-2 text-[14px] font-medium text-xn-bg transition-opacity duration-xn ease-xn hover:opacity-90 ${FOCUS}`}
        >
          Next question
        </button>
      )}
    </div>
  );
}

// ── D · Questions with a score rail ─────────────────────────

function DesignRail({ answers, pick, reset }: DesignProps) {
  const answered = answers.filter((a) => a !== null).length;
  const correct = answers.filter((a, i) => a === QUESTIONS[i].answerIndex).length;
  const done = answered === QUESTIONS.length;

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-5">
          {QUESTIONS.map((q, qi) => (
            <div key={qi} className="border-l-2 border-xn-border pl-4">
              <p className="text-[15px] font-medium leading-[1.6] text-xn-ink">
                <span className="mr-2 font-mono text-[15px] font-semibold tabular-nums text-xn-ink-muted">
                  {qi + 1}
                </span>
                {q.question}
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {q.options.map((_, oi) => (
                  <li key={oi}>
                    <Option
                      q={q}
                      picked={answers[qi]}
                      index={oi}
                      density="boxed"
                      onPick={() => pick(qi, oi)}
                    />
                  </li>
                ))}
              </ul>
              <Outcome q={q} picked={answers[qi]} />
            </div>
          ))}
        </div>
      </div>

      {/* Sticky, so the whole set's state stays visible while scrolling. */}
      <aside className="w-[168px] shrink-0">
        <div className="sticky top-6 rounded-xn-md border border-xn-border bg-xn-bg-deep p-4">
          <p className="text-[12px] font-medium uppercase tracking-wide text-xn-ink-muted">
            Progress
          </p>
          <p className="mt-1.5 text-[22px] font-semibold tabular-nums text-xn-ink">
            {correct}
            <span className="text-[15px] font-normal text-xn-ink-muted">
              {" / "}
              {QUESTIONS.length}
            </span>
          </p>
          <p className="mt-0.5 text-[12px] text-xn-ink-muted">{answered} answered</p>

          {/* One cell per question. Glyph and weight carry it, never colour
              alone — an unanswered cell shows its number. */}
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {QUESTIONS.map((q, qi) => {
              const a = answers[qi];
              const right = a === q.answerIndex;
              return (
                <li
                  key={qi}
                  className="flex h-6 w-6 items-center justify-center rounded-xn-sm border border-xn-border text-[11px] font-semibold tabular-nums"
                  style={
                    a !== null && right
                      ? { backgroundColor: QUIZ.bg, borderColor: QUIZ.border, color: QUIZ.color }
                      : undefined
                  }
                  aria-label={
                    a === null
                      ? `Question ${qi + 1}, unanswered`
                      : right
                        ? `Question ${qi + 1}, correct`
                        : `Question ${qi + 1}, incorrect`
                  }
                >
                  {a === null ? (
                    <span className="text-xn-ink-muted">{qi + 1}</span>
                  ) : right ? (
                    "✓"
                  ) : (
                    <span className="text-xn-ink-muted">✕</span>
                  )}
                </li>
              );
            })}
          </ul>

          {done && (
            <button
              type="button"
              onClick={reset}
              className={`mt-4 w-full rounded-xn-pill border border-xn-border bg-xn-surface px-3 py-1.5 text-[13px] font-medium text-xn-ink transition-colors duration-xn ease-xn hover:bg-xn-surface-alt ${FOCUS}`}
            >
              Try again
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

// ── E · Cards with a score rail ─────────────────────────────
// The chosen shape: A's per-question cards, D's rail beside them.

/** The rail, shared by D and E. */
function ScoreRail({ answers, reset }: { answers: Answers; reset: () => void }) {
  const answered = answers.filter((a) => a !== null).length;
  const correct = answers.filter((a, i) => a === QUESTIONS[i].answerIndex).length;
  const done = answered === QUESTIONS.length;

  return (
    <aside className="w-[168px] shrink-0">
      <div className="sticky top-6 rounded-xn-md border border-xn-border bg-xn-bg-deep p-4">
        <p className="text-[12px] font-medium uppercase tracking-wide text-xn-ink-muted">
          Progress
        </p>
        <p className="mt-1.5 text-[22px] font-semibold tabular-nums text-xn-ink">
          {correct}
          <span className="text-[15px] font-normal text-xn-ink-muted">
            {" / "}
            {QUESTIONS.length}
          </span>
        </p>
        <p className="mt-0.5 text-[12px] text-xn-ink-muted">{answered} answered</p>

        {/* One cell per question. An unanswered cell shows its number, so
            the glyph is what changes — colour is never the only signal. */}
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {QUESTIONS.map((q, qi) => {
            const a = answers[qi];
            const right = a === q.answerIndex;
            return (
              <li
                key={qi}
                className={[
                  "flex h-6 w-6 items-center justify-center rounded-xn-sm border",
                  "text-[11px] font-semibold tabular-nums",
                  a === null
                    ? "border-xn-border text-xn-ink-muted"
                    : right
                      ? "border-xn-success bg-xn-success-soft text-xn-success"
                      : "border-xn-danger bg-xn-danger-soft text-xn-danger",
                ].join(" ")}
                aria-label={
                  a === null
                    ? `Question ${qi + 1}, unanswered`
                    : right
                      ? `Question ${qi + 1}, correct`
                      : `Question ${qi + 1}, incorrect`
                }
              >
                {a === null ? qi + 1 : right ? "✓" : "✕"}
              </li>
            );
          })}
        </ul>

        {done && (
          <button
            type="button"
            onClick={reset}
            className={`mt-4 w-full rounded-xn-pill border border-xn-border bg-xn-surface px-3 py-1.5 text-[13px] font-medium text-xn-ink transition-colors duration-xn ease-xn hover:bg-xn-surface-alt ${FOCUS}`}
          >
            Try again
          </button>
        )}
      </div>
    </aside>
  );
}

function DesignCardsRail({ answers, pick, reset }: DesignProps) {
  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-4">
          {QUESTIONS.map((q, qi) => (
            <div key={qi} className="rounded-xn-md border border-xn-border bg-xn-bg-deep p-4">
              <div className="flex items-baseline gap-3">
                <span
                  className="w-6 shrink-0 text-right font-mono text-[19px] font-semibold leading-none tabular-nums"
                  style={{ color: QUIZ.color }}
                  aria-hidden="true"
                >
                  {qi + 1}
                </span>
                <p className="text-[16px] font-medium leading-[1.6] text-xn-ink">{q.question}</p>
              </div>
              <ul className="mt-3 flex flex-col gap-1.5 pl-9">
                {q.options.map((_, oi) => (
                  <li key={oi}>
                    <Option
                      q={q}
                      picked={answers[qi]}
                      index={oi}
                      density="boxed"
                      onPick={() => pick(qi, oi)}
                    />
                  </li>
                ))}
              </ul>
              <Outcome q={q} picked={answers[qi]} indent="pl-9" />
            </div>
          ))}
        </div>
      </div>
      <ScoreRail answers={answers} reset={reset} />
    </div>
  );
}

// ── Registry ────────────────────────────────────────────────

type DesignName = "cardsRail" | "cards" | "sheet" | "single" | "rail";

const DESIGNS: Record<
  DesignName,
  { label: string; note: string; render: (p: DesignProps) => React.ReactElement }
> = {
  cardsRail: {
    label: "E · Cards with a rail",
    note:
      "The chosen shape: A's per-question cards, D's rail beside them. Right and wrong now use green and red rather than the format colour — the near-universal pair, and the one the quiz's own crimson could not provide, since it sits 24° from --xn-danger and the two states would have read as nearly the same hue. The explanation is no longer loose text under the options: it is a block on the format's tint with a rule down its leading edge, labelled, and it unfolds into place — dropping in from above while expanding from its top edge, so it reads as opening out of the option just answered rather than simply being there. The dark theme's red and green are pulled back from the light theme's weight, because the same saturation on a near-black ground reads as alarm.",
    render: DesignCardsRail,
  },
  cards: {
    label: "A · Stacked cards",
    note:
      "Each question is its own recessed card in a vertical list, with the whole set visible at once. Closest to what ships today and the safest at any width — a long set simply gets longer. The weakness is sameness: fifteen identical rounded rectangles is the same 'several kinds of data sharing one rectangle' problem the card pass set out to fix, and it leaves the quiz without a silhouette of its own.",
    render: DesignCards,
  },
  sheet: {
    label: "B · Exam sheet",
    note:
      "No per-question cards at all. One continuous ruled surface: hairline dividers, numbers in a left gutter, serif stems, and options as tight lettered rows. Reads like a printed worksheet, which is what a quiz physically is. Densest of the four, so a long set stays manageable — and it gives the format a silhouette nothing else in the app has.",
    render: DesignSheet,
  },
  single: {
    label: "C · One at a time",
    note:
      "One question fills the surface: large serif stem, generous option targets, progress across the top, and a Next control after the reveal. The most test-like and the most focused — nothing competes for attention. It costs the overview: you cannot see how long the set is or move around it, and it is the design where losing your place on reload stings most.",
    render: DesignSingle,
  },
  rail: {
    label: "D · Questions with a score rail",
    note:
      "Questions scroll in the main column while a narrow sticky rail holds progress, the running score, and a cell per question. The only design that genuinely uses the width the output surface was widened to, and the only one where the whole set's state is visible without scrolling. Costs the most horizontal room, so it is the first to feel cramped if the surface ever narrows.",
    render: DesignRail,
  },
};

const DESIGN_ORDER: readonly DesignName[] = ["cardsRail", "cards", "sheet", "single", "rail"];

// ── Page ────────────────────────────────────────────────────

export default function QuizSpecimensPage() {
  const { theme, setTheme } = useTheme();
  const [design, setDesign] = useState<DesignName>("cardsRail");
  // Answers live above the design, so switching composition keeps the same
  // resolved state and the four can be compared like for like.
  const [answers, setAnswers] = useState<Answers>(QUESTIONS.map(() => null));

  const pick = (qi: number, oi: number) =>
    setAnswers((prev) => {
      if (prev[qi] !== null) return prev;
      const next = [...prev];
      next[qi] = oi;
      return next;
    });

  const reset = () => setAnswers(QUESTIONS.map(() => null));
  const Renderer = DESIGNS[design].render;

  return (
    <div className="min-h-screen bg-xn-bg text-xn-ink transition-colors duration-300">
      {/* The real chain: max-w-output + px-6 gives the panel 1010, and the
          panel's border and p-6 leave its contents 960 — what OutputView
          actually provides. Not a comfortable canvas. */}
      <div className="max-w-output mx-auto px-6 py-12">
        <header className="mb-8">
          <p className="eyebrow mb-2">Specimens · quiz</p>
          <h1 className="font-serif text-h2 text-xn-ink">Four designs for the quiz</h1>
          <p className="mt-2 max-w-[70ch] text-sm text-xn-ink-muted">
            Whole compositions, not colour variations. The interaction is settled and
            identical in each — pick to resolve, terminal, explanation either way — and the
            reveal treatment is held constant so the comparison is about structure. Answer a
            few, then switch: the state is shared.
          </p>
        </header>

        {/* The SHIPPED component, rendered here because /output/[id] is behind
            auth and cannot be opened in a bare browser. The panel is the same
            border and p-6 as OutputView's Card and carries no width cap, so its
            contents are exactly the 960 the real renderer gets. */}
        <section className="mb-10">
          <p className="eyebrow mb-3">
            Shipped · components/output/quiz-view.tsx · at OutputView&apos;s real 960px
          </p>
          <div className="rounded-xn-md border border-xn-border bg-xn-surface p-6" data-shipped>
            <QuizView
              body={{ kind: "quiz", questions: [...QUESTIONS] }}
            />
          </div>
        </section>

        <div className="mb-6 flex flex-wrap items-end gap-6">
          <fieldset>
            <legend className="mb-2 text-[12px] font-medium uppercase tracking-wide text-xn-ink-muted">
              Design
            </legend>
            <div className="flex flex-wrap gap-2">
              {DESIGN_ORDER.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDesign(d)}
                  aria-pressed={design === d}
                  className={[
                    "rounded-xn-pill border px-3.5 py-1.5 text-[13px] font-medium",
                    "transition-colors duration-xn ease-xn",
                    FOCUS,
                    design === d
                      ? "border-xn-ink bg-xn-ink text-xn-bg"
                      : "border-xn-border bg-xn-surface text-xn-ink-muted hover:bg-xn-surface-alt",
                  ].join(" ")}
                >
                  {DESIGNS[d].label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[12px] font-medium uppercase tracking-wide text-xn-ink-muted">
              Theme
            </legend>
            <div className="flex gap-2">
              {[...THEMES].map((t: ThemeName) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  aria-pressed={theme === t}
                  className={[
                    "rounded-xn-pill border px-3 py-1.5 text-[12px] font-medium",
                    "transition-colors duration-xn ease-xn",
                    FOCUS,
                    theme === t
                      ? "border-xn-ink bg-xn-ink text-xn-bg"
                      : "border-xn-border bg-xn-surface text-xn-ink-muted hover:bg-xn-surface-alt",
                  ].join(" ")}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={reset}
            className="pb-1.5 text-[13px] text-xn-ink-muted underline underline-offset-2 hover:text-xn-ink"
          >
            Reset answers
          </button>
        </div>

        <p className="mb-6 max-w-[74ch] text-sm text-xn-ink-muted">{DESIGNS[design].note}</p>

        {/* Stands in for OutputView's Card: same border, same p-6, and no
            width cap of its own so it fills the column as the Card does.
            Its contents are therefore exactly 960. */}
        <div className="rounded-xn-md border border-xn-border bg-xn-surface p-6" data-panel>
          <Renderer answers={answers} pick={pick} reset={reset} />
        </div>
      </div>
    </div>
  );
}
