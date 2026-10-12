"use client";

// Direction D · Source — what it is being written from.
//
// The page fetched the transcript before it started, so the wait can show the
// material itself: the video beside its transcript, readable and scrollable,
// with each line's timestamp. Under them, the run is a single bar with the
// three steps inline and the clock at the end.
//
// The transcript does not scroll by itself and no line is highlighted. Either
// would say the model is "on" that part, and nothing reports where it is.

import { Card } from "@/components/ui/card";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { contentTypeColors, type ContentType } from "@/lib/constants/theme";
import type { VideoMeta } from "@/lib/youtube/types";

import {
  leaveCopy,
  SAMPLE_TRANSCRIPT,
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

export function DirectionSource({ meta, type, run }: { meta: VideoMeta; type: ContentType; run: RunView }) {
  const format = contentTypeColors[type];
  const length = videoLength(meta.durationSeconds);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-h2 text-xn-ink">
          Making your <span style={{ color: format.color }}>{format.label.toLowerCase()}</span>
        </h1>
        <p className="mt-2 text-body text-xn-ink-muted">{run.longWait ? longWaitCopy(meta) : leaveCopy(run)}</p>
      </header>

      <Card variant="default" padding="none" className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          {/* ── The video ── */}
          <div className="border-b border-xn-border p-4 md:border-b-0 md:border-r">
            <VideoThumbnail videoId={meta.videoId} src={meta.thumbnailUrl} height={210} label="youtube" />
            <p className="mt-4 line-clamp-2 text-h5 leading-snug text-xn-ink">{meta.title}</p>
            <p className="mt-1 text-sm text-xn-ink-muted">{meta.channel}</p>
            <p className="mt-3 font-mono text-micro text-xn-ink-soft">
              {[length && `${length} video`, `${SAMPLE_WORD_COUNT.toLocaleString("en")} words`]
                .filter(Boolean)
                .join("   ")}
            </p>
          </div>

          {/* ── The transcript ── a fixed-height window that fades at both
              edges, so it reads as a passage of something longer. */}
          <div className="relative">
            <p className="px-5 pt-4 text-sm font-semibold text-xn-ink">Transcript</p>
            <div className="gd-fade-y h-[300px] overflow-y-auto px-5 pb-6 pt-3">
              {SAMPLE_TRANSCRIPT.map((line) => (
                <p key={line.at} className="grid grid-cols-[3rem_1fr] gap-3 py-1.5">
                  <span className="pt-0.5 font-mono text-micro tabular-nums text-xn-ink-soft">{clock(line.at * 1000)}</span>
                  <span className="text-body leading-relaxed text-xn-ink">{line.text}</span>
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* ── The run ── */}
        <div className="border-t border-xn-border">
          <SweepBar color={format.color} className="rounded-none" />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5">
            {run.steps.map((step) => (
              <span key={step.id} className="flex items-center gap-2">
                <StepMark step={step} color={format.color} size="sm" />
                <span
                  className={[
                    "text-sm",
                    step.status === "waiting" ? "text-xn-ink-soft" : "text-xn-ink",
                  ].join(" ")}
                >
                  {step.status === "done" ? step.done : step.label}
                </span>
                {step.status === "done" && (
                  <span className="font-mono text-micro tabular-nums text-xn-ink-muted">
                    {seconds(step.durationMs ?? 0)}
                  </span>
                )}
              </span>
            ))}
            <span className="ml-auto font-mono text-h5 tabular-nums text-xn-ink">{clock(run.elapsedMs)}</span>
          </div>
        </div>
      </Card>

      <StopWaiting />
    </div>
  );
}
