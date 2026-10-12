"use client";

// src/app/dev/generating-directions/shared.tsx
//
// What the generating-screen directions have in common: the steps that
// actually happen, a simulated run that moves through them, and the pieces
// more than one direction draws.
//
// ── Only steps that happen ──
//
// Three, and each is something real: the page fetching the transcript, the
// start request until the server accepts it, and the job drafting. The job's
// `pending` status is real too but lasts milliseconds — the server starts the
// work as it accepts — so it is folded into "Starting". Fetching, understanding
// and polishing are not steps until the pipeline's nodes exist, so no
// direction draws them.
//
// ── What there is to show while drafting ──
//
// Drafting is most of the wait and nothing inside it is measured. Two things
// on the page are real during it, and the directions use them instead of an
// invented percentage: the transcript the page already fetched, and the
// format, which fixes the SHAPE the result will take. A skeleton in that
// shape claims the shape, not progress.
//
// ── The simulated run ──
//
// The durations stand in for what the page would MEASURE: on the real screen
// each is a timestamp recorded when a step ends. The transcript text and its
// word count are samples, written for this specimen; the real page has both
// from the transcript it fetched.

import { useEffect, useState } from "react";
import { Check, FileText, PenLine, Send, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { contentTypeColors, type ContentType } from "@/lib/constants/theme";
import type { VideoMeta } from "@/lib/youtube/types";

export const META: VideoMeta = {
  videoId: "wjZofJX0v4M",
  title: "Transformers, the tech behind LLMs | Deep Learning Chapter 5",
  channel: "3Blue1Brown",
  channelUrl: "https://www.youtube.com/@3blue1brown",
  thumbnailUrl: "https://img.youtube.com/vi/wjZofJX0v4M/maxresdefault.jpg",
  url: "https://www.youtube.com/watch?v=wjZofJX0v4M",
  durationSeconds: 1687,
};

/** Sample: the real page counts the words of the transcript it fetched. */
export const SAMPLE_WORD_COUNT = 4312;

/** Sample transcript lines, written for this specimen. */
export const SAMPLE_TRANSCRIPT: { at: number; text: string }[] = [
  { at: 0, text: "A language model is, at heart, a machine for guessing the next word." },
  { at: 14, text: "Give it some text, and it hands back a spread of possibilities for what comes after." },
  { at: 31, text: "The trick is turning words into lists of numbers, so that meaning has a direction." },
  { at: 52, text: "Words that are used alike end up near each other in that space." },
  { at: 74, text: "But a word alone is ambiguous. Its neighbours decide what it means here." },
  { at: 97, text: "That is the job of attention: letting each word look at the others and adjust." },
  { at: 121, text: "Stack many of these layers and the numbers carry richer and richer context." },
  { at: 148, text: "At the end, the last vector is read off as a guess about what follows." },
  { at: 170, text: "Sample one word from that guess, add it to the text, and run it all again." },
  { at: 192, text: "Repeat that enough times, and you get paragraphs." },
];

export type StepId = "transcript" | "starting" | "drafting";

export const STEPS: { id: StepId; label: string; done: string; icon: LucideIcon }[] = [
  { id: "transcript", label: "Reading the transcript", done: "Transcript read", icon: FileText },
  { id: "starting", label: "Starting the generation", done: "Started", icon: Send },
  { id: "drafting", label: "Drafting your content", done: "Drafted", icon: PenLine },
];

/** How long the simulated transcript fetch and start take, in ms. */
const SIMULATED_MS: Record<Exclude<StepId, "drafting">, number> = {
  transcript: 2300,
  starting: 700,
};

/** After this long drafting, the screen says why a long video takes a while. */
export const LONG_WAIT_MS = 60_000;

export type StepStatus = "done" | "running" | "waiting";

export interface StepView {
  id: StepId;
  label: string;
  done: string;
  icon: LucideIcon;
  status: StepStatus;
  /** When the step began, from the start of the run. Absent while waiting. */
  startedAtMs?: number;
  /** How long a finished step took. */
  durationMs?: number;
  /** How long a running step has been going. */
  runningForMs?: number;
}

export interface RunView {
  elapsedMs: number;
  active: StepId;
  steps: StepView[];
  /** The running step, always present while the run is on screen. */
  running: StepView;
  /** Drafting has gone past LONG_WAIT_MS. */
  longWait: boolean;
}

const ORDER: StepId[] = ["transcript", "starting", "drafting"];

function viewAt(elapsedMs: number, holdAt: StepId): RunView {
  const transcriptEnd = SIMULATED_MS.transcript;
  const startingEnd = transcriptEnd + SIMULATED_MS.starting;
  const reached: StepId =
    elapsedMs < transcriptEnd ? "transcript" : elapsedMs < startingEnd ? "starting" : "drafting";
  const activeIndex = Math.min(ORDER.indexOf(reached), ORDER.indexOf(holdAt));
  const starts = [0, transcriptEnd, startingEnd];

  const steps = STEPS.map((step, index): StepView => {
    if (index < activeIndex) {
      return {
        ...step,
        status: "done",
        startedAtMs: starts[index],
        durationMs: starts[index + 1] - starts[index],
      };
    }
    if (index === activeIndex) {
      return {
        ...step,
        status: "running",
        startedAtMs: starts[index],
        runningForMs: Math.max(0, elapsedMs - starts[index]),
      };
    }
    return { ...step, status: "waiting" };
  });

  const running = steps[activeIndex];
  return {
    elapsedMs,
    active: ORDER[activeIndex],
    steps,
    running,
    longWait: running.id === "drafting" && (running.runningForMs ?? 0) >= LONG_WAIT_MS,
  };
}

export type HarnessMode = "play" | StepId | "long";

/**
 * A run that ticks. `play` starts from zero; a step name starts the clock as
 * if the run had already reached that step, and holds it there; `long` is
 * drafting past the point the long-wait line appears.
 */
export function useSimulatedRun(mode: HarnessMode, restartKey: number): RunView {
  const holdAt: StepId = mode === "play" || mode === "long" ? "drafting" : mode;
  const draftingStart = SIMULATED_MS.transcript + SIMULATED_MS.starting;
  const offset =
    mode === "starting"
      ? SIMULATED_MS.transcript
      : mode === "drafting"
        ? draftingStart + 24_000
        : mode === "long"
          ? draftingStart + LONG_WAIT_MS + 34_000
          : 0;

  const [startedAt, setStartedAt] = useState(() => Date.now() - offset);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const reset = Date.now();
    setStartedAt(reset - offset);
    setNow(reset);
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [offset, restartKey]);

  return viewAt(Math.max(0, now - startedAt), holdAt);
}

/** 0:42, 3:07 — a clock reading. */
export function clock(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** 2.3s — a measured duration for a short step. */
export function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

/** 28 min — a video's length, rounded the way people say it. */
export function videoLength(durationSeconds: number | null | undefined): string | null {
  if (!durationSeconds) return null;
  const minutes = Math.round(durationSeconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}

// ── Copy ──────────────────────────────────────────────────────

/**
 * The line under the heading. Until the start is accepted, closing the tab can
 * stop it. The simulated run has no separate accepted state, so it shows the
 * earlier line until drafting begins; the shipped panel switches on acceptance.
 */
export function leaveCopy(run: RunView): string {
  return run.active === "drafting"
    ? "Closing this tab won't stop it. If it finishes, you'll find it in your drafts."
    : "Keep this tab open until it starts. Once it has, closing the tab won't stop it.";
}

/** Shown once drafting has run long. Uses the video's real length, no estimate. */
export function longWaitCopy(meta: VideoMeta): string {
  const length = videoLength(meta.durationSeconds);
  return length
    ? `Longer videos take longer to write up. This one runs ${length}.`
    : "Longer videos take longer to write up.";
}

// ── Pieces ────────────────────────────────────────────────────

export function StopWaiting({ align = "center" }: { align?: "center" | "start" }) {
  return (
    <div className={`mt-6 flex ${align === "center" ? "justify-center" : "justify-start"}`}>
      <Button variant="danger">Stop waiting</Button>
    </div>
  );
}

/**
 * The step's own icon in a ring. A finished step trades it for a check; the
 * running step's ring takes the format's colour.
 */
export function StepMark({ step, color, size = "md" }: { step: StepView; color: string; size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const glyph = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const Icon = step.icon;

  if (step.status === "done") {
    return (
      <span className={`grid ${box} shrink-0 place-items-center rounded-xn-pill bg-xn-ink animate-scale-in`}>
        <Check className={`${glyph} text-xn-bg`} strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }
  if (step.status === "running") {
    return (
      <span
        className={`relative grid ${box} shrink-0 place-items-center rounded-xn-pill border-2`}
        style={{ borderColor: color, color }}
      >
        <span
          className="absolute inset-0 rounded-xn-pill animate-ring motion-reduce:hidden"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <Icon className={`relative ${glyph}`} strokeWidth={2.25} aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className={`grid ${box} shrink-0 place-items-center rounded-xn-pill border border-xn-border text-xn-ink-soft`}>
      <Icon className={glyph} strokeWidth={2} aria-hidden="true" />
    </span>
  );
}

/**
 * The running step's label. Keyed on the step, so a change of step rises in
 * with the app's existing cycling-label motion rather than swapping in place.
 */
export function RunningLabel({ run, className = "" }: { run: RunView; className?: string }) {
  return (
    <span className={`relative block overflow-hidden ${className}`} aria-live="polite">
      <span key={run.running.id} className="block animate-rise-in motion-reduce:animate-none">
        {run.running.label}
      </span>
    </span>
  );
}

/**
 * A bar that says "working" without a number to fill to. With reduced motion
 * it does not move; it becomes a full, faint track in the format's colour.
 */
export function SweepBar({ color, className = "" }: { color: string; className?: string }) {
  return (
    <div
      className={`relative h-1 w-full overflow-hidden rounded-xn-pill bg-xn-ink-faint ${className}`}
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

// ── The result's shape ───────────────────────────────────────

const PROSE: ContentType[] = ["summary", "blog", "notes", "research"];

function Bar({ w, h = "h-3", className = "" }: { w: string; h?: string; className?: string }) {
  return <span className={`gd-skel block ${h} rounded-xn-sm ${className}`} style={{ width: w }} aria-hidden="true" />;
}

/**
 * The layout the result will land in, as placeholders: a reading column for
 * prose, cards for flashcards, questions with options for a quiz, a post for
 * social. It shows the shape the format always has, and nothing about how
 * far through the writing is.
 */
export function FormatSkeleton({ type }: { type: ContentType }) {
  const format = contentTypeColors[type];

  if (PROSE.includes(type)) {
    const bulleted = type === "notes";
    return (
      <div className="mx-auto w-full max-w-[640px]">
        <Bar w="72%" h="h-7" />
        <Bar w="38%" className="mt-3" />
        {[0, 1, 2].map((section) => (
          <div key={section} className="mt-8">
            <span className="mb-4 flex items-center gap-3">
              <span className="h-4 w-1 rounded-xn-pill" style={{ backgroundColor: format.color, opacity: 0.55 }} />
              <Bar w={["44%", "52%", "36%"][section]} h="h-5" />
            </span>
            {(bulleted ? ["88%", "74%", "81%"] : ["100%", "96%", "91%", "62%"]).map((width, line) => (
              <span key={line} className="mt-2.5 flex items-center gap-3">
                {bulleted && <span className="gd-skel h-1.5 w-1.5 shrink-0 rounded-xn-pill" />}
                <Bar w={width} />
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (type === "flashcards") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((card) => (
          <div key={card} className="flex h-40 flex-col justify-between rounded-xn-lg border border-xn-border p-4">
            <div>
              <Bar w="86%" />
              <Bar w="58%" className="mt-2.5" />
            </div>
            <span className="h-1 w-8 rounded-xn-pill" style={{ backgroundColor: format.color, opacity: 0.5 }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === "quiz") {
    return (
      <div className="mx-auto w-full max-w-[640px] space-y-8">
        {[0, 1, 2].map((question) => (
          <div key={question}>
            <Bar w={["78%", "64%", "84%"][question]} h="h-5" />
            <div className="mt-4 grid gap-2">
              {[0, 1, 2, 3].map((option) => (
                <span key={option} className="flex items-center gap-3 rounded-xn-md border border-xn-border px-3 py-3">
                  <span className="h-4 w-4 shrink-0 rounded-xn-pill border border-xn-border" />
                  <Bar w={["52%", "66%", "44%", "58%"][option]} />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Social: one post, in the frame a feed draws.
  return (
    <div className="mx-auto w-full max-w-[520px] rounded-xn-lg border border-xn-border p-5">
      <span className="flex items-center gap-3">
        <span className="gd-skel h-10 w-10 shrink-0 rounded-xn-pill" />
        <span className="flex-1">
          <Bar w="40%" />
          <Bar w="24%" className="mt-2" />
        </span>
      </span>
      {["100%", "94%", "97%", "58%"].map((width, line) => (
        <Bar key={line} w={width} className={line === 0 ? "mt-5" : "mt-3"} />
      ))}
      <span className="gd-skel mt-5 block aspect-[1.91/1] w-full rounded-xn-md" aria-hidden="true" />
    </div>
  );
}

/**
 * The skeleton shimmer and the transcript's faded edges, which only the
 * unchosen directions use. The sweep and the ring are the app's own
 * `animate-sweep` and `animate-ring`, so the specimen moves as the shipped
 * panel does.
 */
export function SpecimenMotion() {
  return (
    <style>{`
      @keyframes gd-skel {
        0%   { background-position: 100% 0; }
        100% { background-position: -100% 0; }
      }
      .gd-skel {
        background: linear-gradient(
          90deg,
          var(--xn-ink-faint) 0%,
          color-mix(in srgb, var(--xn-ink-faint) 45%, var(--xn-surface)) 50%,
          var(--xn-ink-faint) 100%
        );
        background-size: 200% 100%;
        animation: gd-skel 1.8s linear infinite;
      }

      .gd-fade-y {
        mask-image: linear-gradient(to bottom, transparent 0, black 1.25rem, black calc(100% - 2.5rem), transparent 100%);
      }

      @media (prefers-reduced-motion: reduce) {
        .gd-skel { animation: none; background: var(--xn-ink-faint); }
      }
    `}</style>
  );
}
