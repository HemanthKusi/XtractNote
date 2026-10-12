"use client";

// Direction B · Sheet — wait where the result will land.
//
// The screen is the output page before it has its words: a slim strip with
// the source and the run, and under it the layout this format always takes,
// as placeholders. Notes get a reading column with headed sections, flashcards
// get cards, a quiz gets questions with options. When the draft arrives it
// fills the shape the eye has already been reading, instead of replacing a
// progress screen with a page it has never seen.
//
// The placeholders are the format's shape, not its progress: none of them
// fills in as time passes.

import { Card } from "@/components/ui/card";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { contentTypeColors, type ContentType } from "@/lib/constants/theme";
import type { VideoMeta } from "@/lib/youtube/types";

import {
  leaveCopy,
  FormatSkeleton,
  RunningLabel,
  StepMark,
  StopWaiting,
  SweepBar,
  clock,
  longWaitCopy,
  seconds,
  type RunView,
} from "./shared";

export function DirectionSheet({ meta, type, run }: { meta: VideoMeta; type: ContentType; run: RunView }) {
  const format = contentTypeColors[type];
  const finished = run.steps.filter((step) => step.status === "done");

  return (
    <div>
      {/* ── The strip ── */}
      <Card variant="default" padding="none" className="overflow-hidden">
        <div className="flex items-center gap-4 p-3">
          <div className="hidden w-[120px] shrink-0 sm:block">
            <VideoThumbnail videoId={meta.videoId} src={meta.thumbnailUrl} height={68} label="youtube" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-xn-ink-muted">
              {meta.title}
            </p>
            <div className="mt-1 flex items-center gap-2.5">
              <StepMark step={run.running} color={format.color} size="sm" />
              <RunningLabel run={run} className="text-h5 text-xn-ink" />
            </div>
            <p className="mt-1 hidden font-mono text-micro text-xn-ink-soft sm:block">
              {finished.map((step) => `${step.done} in ${seconds(step.durationMs ?? 0)}`).join("   ")}
            </p>
          </div>

          <p className="shrink-0 font-mono text-h4 tabular-nums text-xn-ink">{clock(run.elapsedMs)}</p>
        </div>
        <SweepBar color={format.color} className="rounded-none" />
      </Card>

      <p className="mt-3 text-sm text-xn-ink-muted">
        {run.longWait ? longWaitCopy(meta) : leaveCopy(run)}
      </p>

      {/* ── The sheet ── */}
      <Card variant="default" padding="none" className="mt-6 px-6 py-8 sm:px-10 sm:py-10">
        <p className="mb-8 text-sm text-xn-ink-soft">
          Your{" "}
          <span className="font-semibold" style={{ color: format.color }}>
            {format.label.toLowerCase()}
          </span>{" "}
          will appear here.
        </p>
        <FormatSkeleton type={type} />
      </Card>

      <StopWaiting />
    </div>
  );
}
