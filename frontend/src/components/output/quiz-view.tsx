"use client";

import { useState } from "react";

import { contentTypeColors } from "@/lib/constants/theme";
import type { QuizBody, QuizQuestion } from "@/lib/content/types";

// ─────────────────────────────────────────────────────────────
// QuizView
//
// Renderer for a structured quiz body
// ({ kind: "quiz", questions: [{ question, options, answerIndex, explanation }] }).
//
// CONTAINER CONTRACT — renders BARE content, no Card wrapper. OutputView
// provides the Card, the format header, and the content column; this slots
// in where the Markdown renderer sits for prose types. Same contract as
// FlashcardsView.
//
// ── It used to be an answer key ──
// Every question printed with its correct option already marked. That was
// the honest presentation for a static view, but it meant the quiz format
// could not be used as a quiz: there was nothing to attempt. Picking an
// option now resolves that question.
//
// ── The reveal is terminal ──
// Once a question is answered its options stop responding. Anything else
// lets the set be walked to green one click at a time, which makes the
// score meaningless and the explanation unnecessary.
//
// ── Nothing is stored ──
// There is no attempts table, so every answer is session-only and a reload
// clears the lot. Persisting them is schema work. The summary says so in
// as many words rather than implying progress was saved.
//
// ── Colour is never the only signal ──
// Right and wrong use the semantic green/red pair, and each also carries a
// glyph and a weight change. The Paper theme is low contrast and
// colourblindness is not an edge case. The explanation carries the FORMAT
// colour instead, because it is quiz content rather than a judgement.
//
// ── No fixed-height scrolling anywhere ──
// Deliberate, and the reason issue #346 was folded into this work. A
// scrollable region inside a button cannot be reached by keyboard: arrow
// keys act on the focused element's nearest scrollable ANCESTOR, and such
// a box is its child. Questions and options grow to fit, which makes the
// problem impossible rather than handled.
// ─────────────────────────────────────────────────────────────

const QUIZ = contentTypeColors.quiz;

/** Option index → letter label. Derived, so any option count labels cleanly. */
function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

/** One answer per question; null until it is picked. */
type Answers = readonly (number | null)[];

type OptionState = "idle" | "correct" | "wrongPick" | "other";

function optionState(q: QuizQuestion, picked: number | null, index: number): OptionState {
  if (picked === null) return "idle";
  if (index === q.answerIndex) return "correct";
  if (index === picked) return "wrongPick";
  return "other";
}

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xn-ink";

// ── One option ──────────────────────────────────────────────

function Option({
  q,
  picked,
  index,
  onPick,
}: {
  q: QuizQuestion;
  picked: number | null;
  index: number;
  onPick: () => void;
}) {
  const state = optionState(q, picked, index);
  const resolved = picked !== null;
  const glyph = state === "correct" ? "✓" : state === "wrongPick" ? "✕" : null;

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
      // Terminal: a resolved question's options stop responding.
      disabled={resolved}
      onClick={onPick}
      className={[
        "flex w-full items-start gap-2.5 rounded-xn-sm border px-2.5 py-2.5",
        "text-left text-[15px] leading-[1.55]",
        "transition-colors duration-xn ease-xn",
        tone,
        resolved ? "cursor-default" : "hover:bg-xn-surface-alt",
        FOCUS,
      ].join(" ")}
    >
      <span className="shrink-0 font-semibold tabular-nums">{optionLetter(index)}.</span>
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

// ── Verdict and explanation ─────────────────────────────────

/**
 * Appears BELOW the button that was pressed, so without a live region a
 * screen reader user would click and hear nothing. The region is on the
 * always-present wrapper rather than the block itself: a region that
 * appears at the same moment as its content may not announce.
 *
 * `animate-unfold` is an animation on mount, not a transition, because the
 * block is conditionally rendered and there is no element to transition
 * from. That is also what keeps the explanation out of the accessibility
 * tree until it is revealed — the flashcards had to hide an always-present
 * answer by hand, and this avoids the problem rather than managing it.
 *
 * The global reduced-motion rule zeroes animation-duration, so the block
 * simply appears instead of breaking.
 */
function Outcome({ q, picked }: { q: QuizQuestion; picked: number | null }) {
  const right = picked === q.answerIndex;

  return (
    <div aria-live="polite" className="pl-9">
      {picked !== null && (
        <div className="animate-unfold origin-top">
          <p
            className={`mt-3.5 flex items-center gap-1.5 text-[14px] font-semibold ${
              right ? "text-xn-success" : "text-xn-danger"
            }`}
          >
            <span aria-hidden="true">{right ? "✓" : "✕"}</span>
            {right
              ? "Correct"
              : `Not quite — the answer is ${optionLetter(q.answerIndex)}`}
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

// ── The score rail ──────────────────────────────────────────

function ScoreRail({
  questions,
  answers,
  onReset,
}: {
  questions: readonly QuizQuestion[];
  answers: Answers;
  onReset: () => void;
}) {
  const answered = answers.filter((a) => a !== null).length;
  const correct = answers.filter((a, i) => a === questions[i].answerIndex).length;
  const done = answered === questions.length;

  return (
    <aside className="w-[160px] shrink-0">
      <div className="sticky top-6 rounded-xn-md border border-xn-border bg-xn-bg-deep p-4">
        <p className="text-[12px] font-medium uppercase tracking-wide text-xn-ink-muted">
          Progress
        </p>
        <p className="mt-1.5 text-[22px] font-semibold tabular-nums text-xn-ink">
          {correct}
          <span className="text-[15px] font-normal text-xn-ink-muted">
            {" / "}
            {questions.length}
          </span>
        </p>
        <p className="mt-0.5 text-[12px] text-xn-ink-muted">{answered} answered</p>

        {/* One cell per question. An unanswered cell shows its number, so what
            changes is the glyph — colour is never carrying it alone. */}
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {questions.map((q, i) => {
            const a = answers[i];
            const right = a === q.answerIndex;
            return (
              <li
                key={i}
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
                    ? `Question ${i + 1}, unanswered`
                    : right
                      ? `Question ${i + 1}, correct`
                      : `Question ${i + 1}, incorrect`
                }
              >
                {a === null ? i + 1 : right ? "✓" : "✕"}
              </li>
            );
          })}
        </ul>

        <div aria-live="polite">
          {done && (
            <div className="animate-unfold origin-top">
              <p className="mt-3 border-t border-xn-border pt-3 text-[12px] leading-[1.5] text-xn-ink-muted">
                Answers are not saved — reloading clears them.
              </p>
              <button
                type="button"
                onClick={onReset}
                className={`mt-2.5 w-full rounded-xn-pill border border-xn-border bg-xn-surface px-3 py-1.5 text-[13px] font-medium text-xn-ink transition-colors duration-xn ease-xn hover:bg-xn-surface-alt ${FOCUS}`}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ── The view ────────────────────────────────────────────────

interface QuizViewProps {
  body: QuizBody;
  className?: string;
}

/**
 * Identifies a body well enough to know it has been replaced. Length alone
 * is not enough — two different four-question quizzes would look identical
 * and the previous answers would carry over onto the new one.
 */
function signatureOf(questions: readonly QuizQuestion[]): string {
  return `${questions.length}|${questions[0]?.question ?? ""}`;
}

const blankAnswers = (n: number): Answers => Array.from({ length: n }, () => null);

export function QuizView({ body, className = "" }: QuizViewProps) {
  const questions = body.questions;
  const signature = signatureOf(questions);

  const [state, setState] = useState<{ signature: string; answers: Answers }>(() => ({
    signature,
    answers: blankAnswers(questions.length),
  }));

  // Adjusting state during render, which is React's documented way to reset
  // when a prop changes — cheaper and less error-prone than an effect, and it
  // avoids rendering one frame with the previous quiz's answers. Matters
  // because the saved-content route swaps bodies in and out of this view.
  if (state.signature !== signature) {
    setState({ signature, answers: blankAnswers(questions.length) });
  }

  const answers = state.answers;

  const pick = (questionIndex: number, optionIndex: number) =>
    setState((prev) => {
      if (prev.answers[questionIndex] !== null) return prev;
      const next = [...prev.answers];
      next[questionIndex] = optionIndex;
      return { ...prev, answers: next };
    });

  const reset = () =>
    setState({ signature, answers: blankAnswers(questions.length) });

  // A validated body always has at least one question, but a hand-edited or
  // imported row might not — and a blank area with no explanation is worse
  // than a sentence. Wrapped so a caller's className survives this branch.
  if (questions.length === 0) {
    return (
      <div className={className}>
        <p className="text-[14px] text-xn-ink-muted">No quiz questions to display.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* `flex-wrap` with a minimum on the question column is what makes the
          rail behave when the surface is narrow: below roughly 544px of
          content there is no room for both, and the rail wraps underneath
          instead of crushing the questions.

          Deliberately NOT a viewport breakpoint. This renderer sits behind a
          sidebar and several layers of padding, so the viewport says nothing
          useful about the width it actually gets — the same mistake that put
          three findings on the flashcard grid. Wrapping is driven by the real
          container, needs no plugin, and stays correct if the chrome changes. */}
      <div className="flex flex-wrap gap-6">
        <div className="min-w-[360px] flex-1">
          <div className="flex flex-col gap-4">
            {questions.map((q, qi) => (
              <div key={qi} className="rounded-xn-md border border-xn-border bg-xn-bg-deep p-4">
                {/* items-baseline, not the default: the number is larger than
                    the stem, and aligning boxes rather than type leaves it
                    sitting visibly high. The fixed-width gutter keeps every
                    stem on the same edge once the count reaches double
                    digits. */}
                <div className="flex items-baseline gap-3">
                  <span
                    className="w-6 shrink-0 text-right font-mono text-[19px] font-semibold leading-none tabular-nums"
                    style={{ color: QUIZ.color }}
                    aria-hidden="true"
                  >
                    {qi + 1}
                  </span>
                  <p className="text-[16px] font-medium leading-[1.6] text-xn-ink">
                    {q.question}
                  </p>
                </div>

                {/* pl-9 is the gutter plus the gap, so options hang off the
                    question text rather than off the number. */}
                <ul className="mt-3 flex flex-col gap-1.5 pl-9">
                  {q.options.map((_, oi) => (
                    <li key={oi}>
                      <Option
                        q={q}
                        picked={answers[qi]}
                        index={oi}
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

        <ScoreRail questions={questions} answers={answers} onReset={reset} />
      </div>
    </div>
  );
}
