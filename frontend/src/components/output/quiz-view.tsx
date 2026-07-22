"use client";

import { contentTypeColors } from "@/lib/constants/theme";
import type { QuizBody } from "@/lib/content/types";

// ─────────────────────────────────────────────────────────────
// QuizView
//
// Read-only renderer for a structured quiz body
// ({ kind: "quiz", questions: [{ question, options, answerIndex, explanation }] }).
//
// CONTAINER CONTRACT — renders BARE content, no Card wrapper. OutputView
// provides the Card, format header, and max-width container; this slots in
// where the Markdown renderer sits for prose types. (Same contract as
// FlashcardsView.)
//
// STATIC BY DESIGN (Phase 11). The correct answer is marked inline rather
// than hidden — there is no interaction here to preserve a surprise for, so
// showing the answer beside each question is the honest presentation. The
// alternative (a separate answer key the reader scrolls between) is worse to
// use and pretends at interactivity this view does not have.
//
// Because the body is stored as JSON, the interactive click-to-answer version
// later replaces THIS FILE only: no prompt rewrite, no storage change, no
// migration.
// ─────────────────────────────────────────────────────────────

// Option index → letter label (0 → "A", 1 → "B", ...). Derived from index so
// any option count labels cleanly; the backend tolerates counts other than 4.
function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

interface QuizViewProps {
  body: QuizBody;
  className?: string;
}

export function QuizView({ body, className = "" }: QuizViewProps) {
  // Quiz's identity color, so numbering and answer marks read as belonging to
  // the format the same way the header icon does.
  const accent = contentTypeColors.quiz.color;
  const questions = body.questions;

  // A validated body always has at least one question, but a hand-edited or
  // imported row might not. Wrap the fallback in a root div so a caller's
  // className survives the empty branch (File 9 review).
  if (questions.length === 0) {
    return (
      <div className={className}>
        <p className="text-[14px] text-xn-ink-muted">
          No quiz questions to display.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Count line: scale of the quiz before the reader scrolls. */}
      <p className="mb-4 text-[13px] text-xn-ink-muted">
        {questions.length} {questions.length === 1 ? "question" : "questions"}
      </p>

      <div className="flex flex-col gap-5">
        {questions.map((q, qIndex) => (
          <div
            key={qIndex}
            className="rounded-xn-md border border-xn-border bg-xn-bg-deep p-4"
          >
            {/* Question stem, numbered in the format's identity color. */}
            <div className="flex gap-3">
              <span
                className="shrink-0 font-mono text-[12px] leading-[1.7]"
                style={{ color: accent }}
                aria-hidden="true"
              >
                {qIndex + 1}
              </span>
              <p className="text-[15px] font-medium leading-[1.6] text-xn-ink">
                {q.question}
              </p>
            </div>

            {/* Options. The correct one is marked by color AND a check glyph —
                never color alone, so the meaning survives colorblindness and
                the low-contrast Paper theme. */}
            <ul className="mt-3 flex flex-col gap-1.5 pl-[calc(0.75rem+1ch)]">
              {q.options.map((option, oIndex) => {
                const isCorrect = oIndex === q.answerIndex;
                return (
                  <li
                    key={oIndex}
                    className="flex items-start gap-2 text-[14px] leading-[1.55]"
                    style={isCorrect ? { color: accent } : undefined}
                  >
                    <span
                      className={
                        isCorrect
                          ? "shrink-0 font-semibold"
                          : "shrink-0 text-xn-ink-soft"
                      }
                    >
                      {optionLetter(oIndex)}.
                    </span>
                    <span
                      className={isCorrect ? "font-medium" : "text-xn-ink"}
                    >
                      {option}
                    </span>
                    {isCorrect && (
                      <span
                        className="shrink-0 font-semibold"
                        aria-label="Correct answer"
                      >
                        {"\u2713"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Explanation — supporting detail, so it is subordinate: muted,
                offset, and only rendered when the model supplied one (the
                backend stores null otherwise, so no empty gap appears). */}
            {q.explanation && (
              <p className="mt-3 border-t border-xn-border pl-[calc(0.75rem+1ch)] pt-3 text-[13px] leading-[1.6] text-xn-ink-muted">
                <span className="font-medium text-xn-ink-soft">Why: </span>
                {q.explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}