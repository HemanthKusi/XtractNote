"use client";

// Direction A · Checklist — the one that came closest, finished.
//
// One card in two columns: the source on the left, the steps on the right, so
// the thing being made and what is happening to it read as one object. Every
// step has its own icon, a finished one shows the time the page measured, and
// the running one carries the activity — its own counter and a sweep under its
// label. The steps take a column rather than the card's full width, so the
// sweep stays the length of a row someone is reading, not a rule across the
// page. The elapsed clock sits with the heading, as the one number that is
// always true. On a phone the columns stack, source first.

import { Card } from "@/components/ui/card";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { contentTypeColors, type ContentType } from "@/lib/constants/theme";
import type { VideoMeta } from "@/lib/youtube/types";

import {
  LEAVE_COPY,
  RunningLabel,
  SAMPLE_WORD_COUNT,
  StepMark,
  StopWaiting,
  SweepBar,
  clock,
  longWaitCopy,
  seconds,
  videoLength,
  type RunView,
} from "./shared";

export function DirectionChecklist({ meta, type, run }: { meta: VideoMeta; type: ContentType; run: RunView }) {
  const format = contentTypeColors[type];
  const length = videoLength(meta.durationSeconds);

  return (
    <div className="w-full">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-h2 text-xn-ink">
            Making your <span style={{ color: format.color }}>{format.label.toLowerCase()}</span>
          </h1>
          <p className="mt-2 text-body text-xn-ink-muted">{LEAVE_COPY}</p>
        </div>
        <p className="font-mono text-h3 tabular-nums text-xn-ink" aria-label={`${clock(run.elapsedMs)} elapsed`}>
          {clock(run.elapsedMs)}
        </p>
      </header>

      <Card variant="default" padding="none" className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          {/* ── The source ── */}
          <div className="border-b border-xn-border p-4 md:border-b-0 md:border-r">
            {/* 16:9 at the column's width. The component takes a fixed height,
                which at a phone's width made the frame nearly square and
                cropped the video's own title off it; the important height
                class outranks that inline value. */}
            <VideoThumbnail
              videoId={meta.videoId}
              src={meta.thumbnailUrl}
              label="youtube"
              className="aspect-video !h-auto"
            />
            <p className="mt-4 line-clamp-2 text-h5 leading-snug text-xn-ink">{meta.title}</p>
            <p className="mt-1 text-sm text-xn-ink-muted">{meta.channel}</p>
            <p className="mt-3 font-mono text-micro text-xn-ink-soft">
              {[length && `${length} video`, `${SAMPLE_WORD_COUNT.toLocaleString("en")}-word transcript`]
                .filter(Boolean)
                .join("   ")}
            </p>
          </div>

          {/* ── The steps ── */}
          <ol className="flex flex-col justify-center p-3">
            {run.steps.map((step) => {
              const running = step.status === "running";
              const done = step.status === "done";
              return (
                <li
                  key={step.id}
                  className={[
                    "flex gap-4 rounded-xn-md px-3 py-4 transition-colors duration-xn-slow ease-xn",
                    running ? "bg-xn-surface-alt" : "",
                  ].join(" ")}
                >
                  <StepMark step={step} color={format.color} />

                  <div className="min-w-0 flex-1 self-center">
                    {running ? (
                      <>
                        <div className="flex items-baseline justify-between gap-4">
                          <RunningLabel run={run} className="text-h5 text-xn-ink" />
                          <span className="shrink-0 font-mono text-micro tabular-nums text-xn-ink-muted">
                            {clock(step.runningForMs ?? 0)}
                          </span>
                        </div>
                        <SweepBar color={format.color} className="mt-3" />
                        {run.longWait && (
                          <p className="mt-3 text-sm text-xn-ink-muted animate-fade-in">{longWaitCopy(meta)}</p>
                        )}
                      </>
                    ) : (
                      <div className="flex items-baseline justify-between gap-4">
                        <span className={["text-h5", done ? "text-xn-ink" : "text-xn-ink-soft"].join(" ")}>
                          {done ? step.done : step.label}
                        </span>
                        {/* Measured, never budgeted. A waiting step says nothing. */}
                        <span className="shrink-0 font-mono text-micro tabular-nums text-xn-ink-muted">
                          {done && step.durationMs !== undefined ? seconds(step.durationMs) : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </Card>

      <StopWaiting />
    </div>
  );
}
