"use client";

// ─────────────────────────────────────────────────────────────
// components/create/generating-panel.tsx
//
// The generation screen: the source, the steps the run has taken, and a way
// out.
//
// ── What it shows ──
//
// Only steps that happen: starting the generation, reading the transcript,
// drafting. Which one is running comes from the page — its start request,
// then the job's status (lib/generation/stage.ts). A finished step
// shows how long it took, measured by the page; the running one shows its own
// time so far and a sweep. There is no percentage: nothing reports how far
// through drafting a run is, so the screen does not say.
//
// The elapsed clock is the time since the run began, by the same clock as the
// steps.
//
// ── Why no "time remaining" ──
//
// Remaining would be invention with nothing behind it, and it is the number
// people trust most.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Check, FileText, PenLine, Send, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import {
  GENERATION_STEPS,
  isLongWait,
  stepViews,
  type GenerationRunState,
  type GenerationStep,
  type StepStarts,
  type StepView,
} from "@/lib/generation/stage";
import { contentTypeColors, type ContentType } from "@/lib/constants/theme";
import type { VideoMeta } from "@/lib/youtube/types";

/** What each step is called while it runs and once it is done. */
const STEP_COPY: Record<GenerationStep, { running: string; done: string; icon: LucideIcon }> = {
  transcript: { running: "Reading the transcript", done: "Transcript read", icon: FileText },
  starting: { running: "Starting the generation", done: "Started", icon: Send },
  drafting: { running: "Drafting your content", done: "Drafted", icon: PenLine },
};

/**
 * The line under the heading, for each state of the run. Until the start is
 * accepted, closing the tab can stop it: the request may not have been sent,
 * or may not have arrived.
 */
const LEAVE_COPY: Record<GenerationRunState, string> = {
  "not-sent": "Keep this tab open until it starts. Once it has, closing the tab won't stop it.",
  sent: "Keep this tab open until it starts. Once it has, closing the tab won't stop it.",
  accepted: "Closing this tab won't stop it. If it finishes, you'll find it in your drafts.",
};

/** What the stop-waiting confirmation says, for each state of the run. */
const STOP_COPY: Record<GenerationRunState, string> = {
  "not-sent":
    "Nothing has started yet, so nothing has been spent. You can pick a format and start again.",
  sent: "It may already have started in the background — it can't be stopped yet. If it did, it will appear in your drafts.",
  accepted:
    "It keeps going in the background — it can't be stopped yet, and its credits are spent either way. If it finishes, you'll find it in your drafts.",
};

/** How often the clocks on the screen move. */
const TICK_MS = 500;

/** 0:42, 3:07: a clock reading for elapsed time. */
function clock(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** 2.3s: a measured duration for a short step. */
function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

/** 28 min, 1 h 3 min: a video's length as it is said, rather than as a clock. */
function spokenLength(durationSeconds: number | null | undefined): string | null {
  if (!durationSeconds) return null;
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}

interface GeneratingPanelProps {
  meta: VideoMeta;
  type: ContentType;
  /** How far the start has got. The stop-waiting confirmation depends on it. */
  run: GenerationRunState;
  /** The step running now. */
  step: GenerationStep;
  /** When each step started, by the page's clock. */
  starts: StepStarts;
  /** Words in the fetched transcript, or null before it has arrived. */
  wordCount: number | null;
  /** Stop waiting. The panel asks first. */
  onCancel: () => void;
}

export function GeneratingPanel({ meta, type, run, step, starts, wordCount, onCancel }: GeneratingPanelProps) {
  const format = contentTypeColors[type];
  const [now, setNow] = useState(() => Date.now());
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const views = stepViews(starts, step, now);
  // From the first step's start: when the run began, by the steps' own clock.
  const began = starts[GENERATION_STEPS[0]];
  const elapsed = began === undefined ? 0 : Math.max(0, now - began);
  const longWait = isLongWait(starts, now);
  const length = spokenLength(meta.durationSeconds);
  const facts = [
    length && `${length} video`,
    wordCount !== null && `${wordCount.toLocaleString("en")}-word transcript`,
  ].filter(Boolean);

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-h2 text-xn-ink">
            Making your <span style={{ color: format.color }}>{format.label.toLowerCase()}</span>
          </h1>
          <p className="mt-2 text-body text-xn-ink-muted">{LEAVE_COPY[run]}</p>
        </div>
        <p className="font-mono text-h3 tabular-nums text-xn-ink">
          <span className="sr-only">Elapsed </span>
          {clock(elapsed)}
        </p>
      </header>

      <Card variant="default" padding="none" className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          {/* ── The source ── */}
          <div className="border-b border-xn-border p-4 md:border-b-0 md:border-r">
            {/* 16:9 at the column's width. The thumbnail takes a fixed
                height, which at a phone's width overran its card; the
                important height class outranks that inline value. */}
            <VideoThumbnail
              videoId={meta.videoId}
              src={meta.thumbnailUrl}
              label="youtube"
              className="aspect-video !h-auto"
            />
            <p className="mt-4 line-clamp-2 text-h5 leading-snug text-xn-ink">{meta.title}</p>
            <p className="mt-1 text-sm text-xn-ink-muted">{meta.channel}</p>
            {facts.length > 0 && (
              <p className="mt-3 font-mono text-micro text-xn-ink-soft">{facts.join("   ")}</p>
            )}
          </div>

          {/* ── The steps ── */}
          <ol className="flex flex-col justify-center p-3">
            {views.map((view) => (
              <StepRow
                key={view.step}
                view={view}
                color={format.color}
                note={view.status === "running" && longWait ? longWaitCopy(length) : null}
              />
            ))}
          </ol>
        </div>
      </Card>

      <div className="mt-6 flex items-center justify-center">
        <Button variant="danger" onClick={() => setConfirmCancel(true)}>
          Stop waiting
        </Button>
      </div>

      {/* Not `persistent`: dismissing this means "keep waiting", which is the
          safe outcome, so backdrop and Escape should both mean no. Leaving
          sits second so staying is what the eye and the keyboard reach
          first. */}
      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Stop waiting?"
        description={STOP_COPY[run]}
        size="lg"
        footer={
          <>
            <Button variant="primary" onClick={() => setConfirmCancel(false)}>
              Keep waiting
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmCancel(false);
                onCancel();
              }}
            >
              Stop waiting
            </Button>
          </>
        }
      />
    </div>
  );
}

/** Shown under the running step once drafting has run long. Uses the video's real length. */
function longWaitCopy(length: string | null): string {
  return length
    ? `Longer videos take longer to write up. This one runs ${length}.`
    : "Longer videos take longer to write up.";
}

function StepRow({ view, color, note }: { view: StepView; color: string; note: string | null }) {
  const copy = STEP_COPY[view.step];
  const running = view.status === "running";
  const done = view.status === "done";

  return (
    <li
      className={[
        "flex gap-4 rounded-xn-md px-3 py-4 transition-colors duration-xn-slow ease-xn",
        running ? "bg-xn-surface-alt" : "",
      ].join(" ")}
      aria-current={running ? "step" : undefined}
    >
      <StepMark view={view} color={color} icon={copy.icon} />

      <div className="min-w-0 flex-1 self-center">
        {running ? (
          <>
            <div className="flex items-baseline justify-between gap-4">
              {/* Keyed on the step, so a new step rises in with the app's
                  cycling-label motion rather than swapping in place. */}
              <span className="relative block overflow-hidden" aria-live="polite">
                <span key={view.step} className="block text-h5 text-xn-ink animate-rise-in motion-reduce:animate-none">
                  {copy.running}
                </span>
              </span>
              {view.runningForMs !== undefined && (
                <span className="shrink-0 font-mono text-micro tabular-nums text-xn-ink-muted">
                  {clock(view.runningForMs)}
                </span>
              )}
            </div>
            <SweepBar color={color} />
            {note && <p className="mt-3 text-sm text-xn-ink-muted animate-fade-in">{note}</p>}
          </>
        ) : (
          <div className="flex items-baseline justify-between gap-4">
            <span className={["text-h5", done ? "text-xn-ink" : "text-xn-ink-soft"].join(" ")}>
              {done ? copy.done : copy.running}
            </span>
            {/* Measured, never budgeted. A waiting step, or a finished one
                whose end the page did not see, says nothing. */}
            <span className="shrink-0 font-mono text-micro tabular-nums text-xn-ink-muted">
              {done && view.durationMs !== undefined ? seconds(view.durationMs) : ""}
            </span>
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * A step's own icon in a ring. A finished step trades it for a check; the
 * running step's ring takes the format's colour and sends out a pulse, which
 * is hidden under reduced motion: at rest the pulse is an opaque disc in the
 * icon's own colour, and the icon would vanish into it.
 */
function StepMark({ view, color, icon: Icon }: { view: StepView; color: string; icon: LucideIcon }) {
  if (view.status === "done") {
    return (
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xn-pill bg-xn-ink animate-scale-in">
        <Check className="h-3.5 w-3.5 text-xn-bg" strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }
  if (view.status === "running") {
    return (
      <span
        className="relative grid h-8 w-8 shrink-0 place-items-center rounded-xn-pill border-2"
        style={{ borderColor: color, color }}
      >
        <span
          className="absolute inset-0 rounded-xn-pill animate-ring motion-reduce:hidden"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <Icon className="relative h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xn-pill border border-xn-border text-xn-ink-soft">
      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
    </span>
  );
}

/**
 * Work under way with nothing to measure it by: a segment crossing the track.
 * The bar takes the format's colour; the content-type registry lists the
 * generation progress bar as one of that colour's own uses. Under reduced
 * motion the segment fills the track at low strength and stays still.
 */
function SweepBar({ color }: { color: string }) {
  return (
    <div
      className="relative mt-3 h-1 w-full overflow-hidden rounded-xn-pill bg-xn-ink-faint"
      role="progressbar"
      aria-label="Working"
      aria-busy="true"
    >
      <span
        className="absolute inset-y-0 left-0 w-1/3 rounded-xn-pill animate-sweep motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-40"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
