"use client";

// src/app/dev/drafts-band-states/page.dev.tsx  →  route: /dev/drafts-band-states
//
// The create page's drafts band while it loads, when there are no drafts,
// and when the fetch fails (#423): the directions each state was chosen
// from, kept as the record. The choices shipped in DraftsBand.
//
// Each load is simulated: it waits the chosen time, then lands on the chosen
// outcome, so a direction is judged in motion — including how the
// suggestions below move when the band appears or goes. 150 ms is what the
// real fetch measured on the dev server, and the choices stop at 600 ms;
// "Hold" stops on the loading state.
//
// Rendered inside the real AppShell, in create's own column, with the real
// CreateHero, DraftsBand and suggestion grid.

import { useCallback, useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/layout";
import { CreateHero } from "@/components/create/create-hero";
import { DraftsBand } from "@/components/create/drafts-band";
import { VideoGridItem } from "@/components/create/video-grid-item";
import { useTheme } from "@/components/shared/theme-provider";
import type { HistoryItem } from "@/lib/api/history";
import { RECOMMENDED_VIDEOS } from "@/lib/constants/recommended-videos";

import {
  EmptyBand,
  ErrorBand,
  LoadingBand,
  type EmptyDirection,
  type ErrorDirection,
  type LoadingDirection,
} from "./band-states";

type Outcome = "drafts" | "none" | "fails";
type Phase = "loading" | Outcome;

interface Choice<T extends string> {
  id: T;
  label: string;
  note: string;
}

const LOADING: Choice<LoadingDirection>[] = [
  {
    id: "today",
    label: "Today",
    note: "Nothing until the list lands, then the band appears and pushes the suggestions down. For reference.",
  },
  {
    id: "rows",
    label: "A · Rows",
    note: "Placeholder rows at the real row's size from the first frame. Nothing jumps when drafts arrive — but with no drafts, the placeholder vanishes and the suggestions jump UP instead.",
  },
  {
    id: "delayed",
    label: "B · Wait, then rows",
    note: "Nothing for the first 400 ms; placeholder rows only if the list is still not back. A load like the measured 150 ms looks exactly like today; a slow one is not left blank.",
  },
  {
    id: "line",
    label: "C · Line",
    note: "The heading and one quiet line, a much smaller box to hold. Drafts grow it, no drafts remove it — both moves are small.",
  },
];

const EMPTY: Choice<EmptyDirection>[] = [
  {
    id: "today",
    label: "Today",
    note: "Nothing. The band's own reasoning: telling a first-time user they have no drafts answers a question nobody asked.",
  },
  {
    id: "line",
    label: "A · One line",
    note: "No heading and no box — one sentence that says where unsaved work will appear.",
  },
  {
    id: "row",
    label: "B · Empty band",
    note: "The band's heading and box, holding one sentence. The same shape as when it has drafts.",
  },
];

const ERROR: Choice<ErrorDirection>[] = [
  {
    id: "today",
    label: "Today",
    note: "Nothing — indistinguishable from having no drafts. This is the bug: \"it will appear in your drafts\" then points at nothing.",
  },
  {
    id: "row",
    label: "A · In the band",
    note: "The band's heading and box, holding the failure and Try again. The failure icon is the only colour: colour is kept for failure.",
  },
  {
    id: "line",
    label: "B · One line",
    note: "No box. One muted sentence and Try again as a link — the failure does not take over the page you came to create on.",
  },
  {
    id: "line-history",
    label: "C · Line + History",
    note: "B, plus a way round it: History lists drafts too, so a retry that keeps failing is not a dead end.",
  },
];

const LOAD_TIMES: { ms: number | null; label: string }[] = [
  { ms: 150, label: "150 ms" },
  { ms: 250, label: "250 ms" },
  { ms: 350, label: "350 ms" },
  { ms: 450, label: "450 ms" },
  { ms: 600, label: "600 ms" },
  { ms: null, label: "Hold" },
];

const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: "drafts", label: "Has drafts" },
  { id: "none", label: "No drafts" },
  { id: "fails", label: "Fails" },
];

const HOUR = 3600_000;

function draft(
  id: string,
  contentType: HistoryItem["contentType"],
  title: string,
  videoId: string,
  wordCount: number,
  hoursAgo: number,
): HistoryItem {
  return {
    id,
    contentType,
    title,
    channel: "3Blue1Brown",
    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    wordCount,
    createdAt: new Date(Date.now() - hoursAgo * HOUR).toISOString(),
    markdown: "",
    body: { markdown: "" },
    folderId: null,
    status: "draft",
  };
}

const DRAFTS: HistoryItem[] = [
  draft("d1", "summary", "Transformers, the tech behind LLMs | Deep Learning Chapter 5", "wjZofJX0v4M", 261, 1),
  draft("d2", "blog", "But what is a neural network? | Deep learning chapter 1", "aircAruvnKk", 1184, 16),
  draft("d3", "notes", "Gradient descent, how neural networks learn | Deep Learning Chapter 2", "IHZwWFHWa-w", 912, 52),
  draft("d4", "quiz", "Attention in transformers, step-by-step | Deep Learning Chapter 6", "eMlx5fFNoYc", 640, 70),
];

export default function DraftsBandStatesPage() {
  const [loading, setLoading] = useState<LoadingDirection>("rows");
  const [empty, setEmpty] = useState<EmptyDirection>("row");
  const [failure, setFailure] = useState<ErrorDirection>("row");
  const [outcome, setOutcome] = useState<Outcome>("drafts");
  const [loadMs, setLoadMs] = useState<number | null>(450);
  const [phase, setPhase] = useState<Phase>("loading");
  // Bumped by every load, so a remount restarts the delayed direction's clock.
  const [loadKey, setLoadKey] = useState(0);
  const [folded, setFolded] = useState(false);
  const { theme, setTheme } = useTheme();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    (lands: Outcome) => {
      if (timer.current) clearTimeout(timer.current);
      setLoadKey((k) => k + 1);
      setPhase("loading");
      if (loadMs === null) return;
      timer.current = setTimeout(() => setPhase(lands), loadMs);
    },
    [loadMs],
  );

  // Every change of outcome or load time replays the load, so what is on
  // screen always matches the controls.
  useEffect(() => {
    load(outcome);
  }, [load, outcome]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const small =
    "rounded-xn-sm px-2 py-1 font-mono text-micro text-xn-ink-muted transition-colors duration-xn ease-xn hover:bg-xn-surface-alt hover:text-xn-ink";

  return (
    <>
      <AppShell>
        <div className="mx-auto max-w-output px-6 py-10">
          <CreateHero onSubmit={() => {}}>
            {phase === "loading" && <LoadingBand key={loadKey} direction={loading} />}
            {phase === "drafts" && (
              <DraftsBand state={{ phase: "loaded", drafts: DRAFTS }} onOpen={() => {}} onRetry={() => {}} />
            )}
            {phase === "none" && <EmptyBand direction={empty} />}
            {/* A retry that works: it loads again and lands on drafts. */}
            {phase === "fails" && <ErrorBand direction={failure} onRetry={() => load("drafts")} />}

            <section className="mt-10">
              <h2 className="mb-4 text-h5 text-xn-ink">Worth converting</h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-x-5 gap-y-7">
                {RECOMMENDED_VIDEOS.slice(0, 3).map((video) => (
                  <VideoGridItem
                    key={video.videoId}
                    videoId={video.videoId}
                    title={video.title}
                    channel={video.channel}
                    durationSeconds={video.durationSeconds}
                    onSelect={() => {}}
                  />
                ))}
              </div>
            </section>
          </CreateHero>
        </div>
      </AppShell>

      {folded ? (
        <button
          type="button"
          onClick={() => setFolded(false)}
          className="fixed bottom-4 right-4 z-50 rounded-xn-lg border border-xn-border bg-xn-surface px-3 py-2 font-mono text-micro text-xn-ink-muted shadow-xn-lg"
        >
          Controls
        </button>
      ) : (
        <div className="fixed bottom-4 right-4 z-50 max-h-[calc(100vh-2rem)] w-[332px] overflow-y-auto rounded-xn-lg border border-xn-border bg-xn-surface p-3 shadow-xn-lg">
          <div className="flex items-center justify-between">
            <p className="font-mono text-micro uppercase tracking-wide text-xn-ink-soft">Drafts band</p>
            <span className="flex items-center gap-1">
              <button type="button" onClick={() => load(outcome)} className={small}>
                replay
              </button>
              <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className={small}>
                {theme === "dark" ? "→ light" : "→ dark"}
              </button>
              <button type="button" onClick={() => setFolded(true)} className={small}>
                hide
              </button>
            </span>
          </div>

          <Picker title="The load ends in" options={OUTCOMES} value={outcome} onChange={setOutcome} />
          <Picker
            title="It takes"
            options={LOAD_TIMES.map((t) => ({ id: t.label, label: t.label }))}
            value={LOAD_TIMES.find((t) => t.ms === loadMs)?.label ?? ""}
            onChange={(label) => setLoadMs(LOAD_TIMES.find((t) => t.label === label)?.ms ?? null)}
          />

          <Directions title="Loading" options={LOADING} value={loading} onChange={setLoading} />
          <Directions title="No drafts" options={EMPTY} value={empty} onChange={setEmpty} />
          <Directions title="Failed" options={ERROR} value={failure} onChange={setFailure} />

          <p className="mt-3 text-xs leading-snug text-xn-ink-soft">
            Try again on a failure loads again and lands on drafts. The band with drafts is the real DraftsBand.
          </p>
        </div>
      )}
    </>
  );
}

function Picker<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <>
      <p className="mt-3 font-mono text-micro uppercase tracking-wide text-xn-ink-soft">{title}</p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={[
              "rounded-xn-sm px-2 py-1.5 text-left text-sm transition-colors duration-xn ease-xn",
              option.id === value
                ? "bg-xn-ink text-xn-bg"
                : "text-xn-ink-muted hover:bg-xn-surface-alt hover:text-xn-ink",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </>
  );
}

function Directions<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Choice<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  const active = options.find((option) => option.id === value);
  return (
    <>
      <Picker title={title} options={options} value={value} onChange={onChange} />
      <p className="mt-1.5 text-xs leading-snug text-xn-ink-soft">{active?.note}</p>
    </>
  );
}
