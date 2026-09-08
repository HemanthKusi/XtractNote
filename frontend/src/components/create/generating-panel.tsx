"use client";

// ─────────────────────────────────────────────────────────────
// components/create/generating-panel.tsx
//
// The generation screen: the source, a staged pipeline, and a way out.
//
// ── What is real here and what is not ──
//
// REAL — the elapsed clock. It ticks from the moment generation started, and
// it is the only number on this screen that is measured rather than guessed.
//
// ESTIMATED — which stage is active, and the percentage. The backend runs one
// blocking call and reports nothing in between: `generation_jobs` has status
// and progress columns and is never written to, and nothing times a stage. So
// the progression here is a clock-driven approximation of a pipeline that
// does not announce itself.
//
// That is a deliberate, temporary choice and it must not be forgotten. The
// stage list is the SHAPE the real thing will take — when generation becomes
// async and writes to the jobs table, `stageFromElapsed` is deleted and the
// active index comes from the server. Nothing else on this screen changes.
//
// ── Why estimate rather than freeze ──
//
// A static mock frozen at one stage looks broken across a three-minute wait —
// it claims a precise fraction and then never moves, which reads as a hang
// rather than as progress. Advancing on a clock is equally unmeasured but
// behaves like something working. Neither is the truth; one of them is not
// also confusing.
//
// ── Why no "time remaining" ──
//
// Elapsed is measured, so it is shown. Remaining would be pure invention with
// nothing behind it, and it is the number people trust most.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { contentTypeColors, type ContentType } from "@/lib/constants/theme";
import type { VideoMeta } from "@/lib/youtube/types";

/**
 * The pipeline, and how long each step is expected to take.
 *
 * The durations are what drives the display today. They are estimates, not
 * measurements — see the header. "Reading the transcript" is a genuine step
 * now that the fetch happens inside generation rather than before the format
 * is chosen.
 */
const STAGES: { label: string; seconds: number }[] = [
  { label: "Fetching the video", seconds: 6 },
  { label: "Reading the transcript", seconds: 14 },
  { label: "Understanding the topic", seconds: 20 },
  { label: "Drafting your content", seconds: 40 },
  { label: "Polishing and saving", seconds: 10 },
];

const TOTAL = STAGES.reduce((sum, stage) => sum + stage.seconds, 0);

/**
 * Which stage an elapsed time falls in, and how far through the run it is.
 *
 * DELETE THIS when the backend reports stages. It is the whole of the
 * pretence, kept in one function so removing it is a single edit.
 *
 * The percentage is capped below 100 so a long run never sits at "100%" while
 * still working — the bar filling completely and then nothing happening is
 * the exact impression this screen must avoid.
 */
function stageFromElapsed(elapsed: number) {
  let cursor = 0;
  for (let index = 0; index < STAGES.length; index++) {
    cursor += STAGES[index].seconds;
    if (elapsed < cursor) {
      return { active: index, percent: Math.min(96, (elapsed / TOTAL) * 100) };
    }
  }
  // Past every estimate and still running: hold on the last stage.
  return { active: STAGES.length - 1, percent: 96 };
}

/**
 * 280x158 — the same 16:9 box the specimen uses here, and the same one the
 * source panel and the video grid use. I had shrunk this to 200 for no reason
 * the design supports, which made the generating screen's source card read
 * smaller than the identical card one step earlier in the flow.
 */
const THUMB = { w: 280, h: 158 } as const;

interface GeneratingPanelProps {
  meta: VideoMeta;
  type: ContentType;
  /** Abandon the run. The panel asks first. */
  onCancel: () => void;
}

export function GeneratingPanel({ meta, type, onCancel }: GeneratingPanelProps) {
  const format = contentTypeColors[type];
  const [elapsed, setElapsed] = useState(0);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // The one measured thing on the screen.
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { active, percent } = stageFromElapsed(elapsed);

  return (
    <div>
      <header className="mb-8 text-center">
        <h1 className="text-h3 text-xn-ink">
          Reading the video, making your {format.label.toLowerCase()}…
        </h1>
        <p className="mt-2 text-body text-xn-ink-muted">
          You can leave this tab open in the background — we&apos;ll keep going.
        </p>
      </header>

      {/* ── The source, with progress in place of actions ── */}
      <Card variant="default" padding="none">
        <div className="flex flex-wrap items-center gap-4 p-3">
          <div style={{ width: THUMB.w }} className="shrink-0">
            <VideoThumbnail
              videoId={meta.videoId}
              src={meta.thumbnailUrl}
              height={THUMB.h}
              label="youtube"
            />
          </div>

          <div className="min-w-[260px] flex-1">
            <p className="line-clamp-2 text-h5 leading-snug text-xn-ink">
              {meta.title}
            </p>
            <p className="mt-1.5 text-sm text-xn-ink-muted">
              {meta.channel} · creating{" "}
              <span className="font-semibold" style={{ color: format.color }}>
                {format.label}
              </span>
            </p>

            {/* The bar takes the format's colour: the content-type registry
                lists the generation progress bar as one of that colour's own
                uses, so it is on-policy rather than a liberty. */}
            <div
              className="mt-3 h-1.5 w-full overflow-hidden rounded-xn-pill bg-xn-ink-faint"
              role="progressbar"
              aria-valuenow={Math.round(percent)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-xn-pill transition-[width] duration-xn-slow ease-xn"
                style={{ width: `${percent}%`, backgroundColor: format.color }}
              />
            </div>
            <p className="mt-2 font-mono text-micro text-xn-ink-soft">
              {elapsed} sec elapsed
            </p>
          </div>
        </div>
      </Card>

      {/* ── The pipeline ── */}
      <Card variant="default" padding="none" className="mt-4">
        <ol className="flex flex-col">
          {STAGES.map((stage, index) => {
            const done = index < active;
            const running = index === active;

            return (
              <li
                key={stage.label}
                className="flex items-center gap-4 border-b border-xn-border px-4 py-3.5 last:border-b-0"
              >
                <span
                  className={[
                    "grid h-7 w-7 shrink-0 place-items-center rounded-xn-pill border-2",
                    done ? "border-xn-ink bg-xn-ink" : "",
                    !done && !running ? "border-xn-border" : "",
                  ].join(" ")}
                  style={running ? { borderColor: format.color } : undefined}
                  aria-hidden="true"
                >
                  {done && <CheckGlyph />}
                  {running && (
                    <span
                      className="h-2.5 w-2.5 rounded-xn-pill"
                      style={{ backgroundColor: format.color }}
                    />
                  )}
                </span>

                <span
                  className={[
                    "flex-1 text-h5",
                    done || running ? "text-xn-ink" : "text-xn-ink-soft",
                  ].join(" ")}
                >
                  {stage.label}
                </span>

                {running && (
                  <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="h-1 w-1 rounded-xn-pill animate-shimmer motion-reduce:animate-none"
                        style={{
                          backgroundColor: format.color,
                          animationDelay: `${dot * 160}ms`,
                        }}
                      />
                    ))}
                  </span>
                )}

                {/* Only completed stages carry a number, and it is the
                    estimate they were budgeted rather than a measurement.
                    Pending stages say nothing — a countdown on work that has
                    not started is the least defensible number here. */}
                <span className="w-12 shrink-0 text-right font-mono text-micro text-xn-ink-muted">
                  {done ? `${stage.seconds}s` : ""}
                </span>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="mt-6 flex items-center justify-center">
        <Button variant="danger" onClick={() => setConfirmCancel(true)}>
          Cancel generation
        </Button>
      </div>

      {/* Not `persistent`: dismissing this means "keep generating", which is
          the safe outcome, so backdrop and Escape should both mean no. Only
          the destructive choice gets weight, and it sits second so the
          harmless option is what the eye and the keyboard reach first. */}
      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Stop generating?"
        description="This run will be discarded, and the credits it used are not refunded. The video stays in your drafts, so you can start again whenever you like."
        size="lg"
        footer={
          <>
            <Button variant="primary" onClick={() => setConfirmCancel(false)}>
              Keep generating
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmCancel(false);
                onCancel();
              }}
            >
              Stop and discard
            </Button>
          </>
        }
      />
    </div>
  );
}

function CheckGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 text-xn-bg"
      aria-hidden="true"
    >
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}
