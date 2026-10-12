"use client";

// Direction C · Split — the run beside the result.
//
// A narrow column carries everything about the run: the source, the elapsed
// clock, and the steps as a rail with the time each one took. The wide column
// is the result's layout in placeholders, as in B. It keeps A's full account
// of the steps and B's preview of the shape, at the cost of being the most to
// look at. On a phone the column sits above the sheet.

import { Card } from "@/components/ui/card";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { contentTypeColors, type ContentType } from "@/lib/constants/theme";
import type { VideoMeta } from "@/lib/youtube/types";

import {
  FormatSkeleton,
  LEAVE_COPY,
  StepMark,
  StopWaiting,
  SweepBar,
  clock,
  longWaitCopy,
  seconds,
  type RunView,
} from "./shared";

export function DirectionSplit({ meta, type, run }: { meta: VideoMeta; type: ContentType; run: RunView }) {
  const format = contentTypeColors[type];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[272px_1fr] lg:items-start">
      {/* ── The run ── */}
      <aside className="lg:sticky lg:top-24">
        <VideoThumbnail videoId={meta.videoId} src={meta.thumbnailUrl} height={153} label="youtube" />
        <p className="mt-3 line-clamp-2 text-sm leading-snug text-xn-ink">{meta.title}</p>
        <p className="mt-0.5 text-sm text-xn-ink-muted">{meta.channel}</p>

        <div className="mt-6 border-t border-xn-border pt-5">
          <p className="text-sm text-xn-ink-muted">
            Making your{" "}
            <span className="font-semibold" style={{ color: format.color }}>
              {format.label.toLowerCase()}
            </span>
          </p>
          <p className="mt-1 font-mono text-h2 tabular-nums text-xn-ink">{clock(run.elapsedMs)}</p>
        </div>

        <ol className="mt-5">
          {run.steps.map((step, index) => {
            const running = step.status === "running";
            const last = index === run.steps.length - 1;
            return (
              <li key={step.id} className="grid grid-cols-[1.5rem_1fr] gap-x-3">
                <span className="flex flex-col items-center">
                  <StepMark step={step} color={format.color} size="sm" />
                  {!last && (
                    <span
                      className={["w-px flex-1", step.status === "done" ? "bg-xn-ink" : "bg-xn-border"].join(" ")}
                      aria-hidden="true"
                    />
                  )}
                </span>
                <div className={last ? "pb-0" : "pb-5"}>
                  <p
                    className={[
                      "text-sm leading-6",
                      step.status === "waiting" ? "text-xn-ink-soft" : "text-xn-ink",
                    ].join(" ")}
                  >
                    {step.status === "done" ? step.done : step.label}
                  </p>
                  <p className="font-mono text-micro tabular-nums text-xn-ink-muted">
                    {step.status === "done" && seconds(step.durationMs ?? 0)}
                    {running && `${clock(step.runningForMs ?? 0)} so far`}
                    {step.status === "waiting" && " "}
                  </p>
                  {running && <SweepBar color={format.color} className="mt-2" />}
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mt-5 text-sm leading-snug text-xn-ink-muted">
          {run.longWait ? longWaitCopy(meta) : LEAVE_COPY}
        </p>
        <StopWaiting align="start" />
      </aside>

      {/* ── The sheet ── */}
      <Card variant="default" padding="none" className="px-6 py-8 sm:px-10 sm:py-10">
        <FormatSkeleton type={type} />
      </Card>
    </div>
  );
}
