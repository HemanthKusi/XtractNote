"use client";

// src/app/dev/generating-directions/page.dev.tsx  →  route: /dev/generating-directions
//
// Four directions for the generating screen once it shows only real steps
// (#424). A, Checklist, was chosen and is what the real panel renders; the
// page keeps all four as the record of what was compared.
//
// Rendered inside the real AppShell at the create route's own column, for the
// same reason the other direction specimens are: /create is behind auth, and
// a width chosen for a harness has been wrong before.
//
// The run is simulated — see shared.tsx. "Play" starts from zero and moves
// through the steps the way a real run does; a step holds the run there with
// the clock still going; "Long wait" is drafting past the point where the
// screen explains why a long video takes a while.

import { useState } from "react";

import { AppShell } from "@/components/layout";
import { useTheme } from "@/components/shared/theme-provider";
import type { ContentType } from "@/lib/constants/theme";

import { DirectionChecklist } from "./direction-checklist";
import { DirectionSheet } from "./direction-sheet";
import { DirectionSource } from "./direction-source";
import { DirectionSplit } from "./direction-split";
import { META, SpecimenMotion, useSimulatedRun, type HarnessMode } from "./shared";

const DIRECTIONS = [
  {
    id: "checklist",
    label: "A · Checklist",
    note: "Chosen. One card: source on the left, steps on the right, stacked on a phone. The running row carries its own counter and sweep; finished rows show measured times.",
  },
  {
    id: "sheet",
    label: "B · Sheet",
    note: "Wait where the result will land. A slim strip holds the run; below it, the format's own layout in placeholders. Switch the format to see each shape.",
  },
  {
    id: "split",
    label: "C · Split",
    note: "A's account of the run in a side rail, beside B's sheet. The most to look at. On a phone the rail stacks above.",
  },
  {
    id: "source",
    label: "D · Source",
    note: "Show what it is written from: the video beside its transcript, readable while you wait. The run is one bar underneath.",
  },
] as const;

type DirectionId = (typeof DIRECTIONS)[number]["id"];

const MODES: { id: HarnessMode; label: string }[] = [
  { id: "play", label: "Play" },
  { id: "transcript", label: "Transcript" },
  { id: "starting", label: "Starting" },
  { id: "drafting", label: "Drafting" },
  { id: "long", label: "Long wait" },
];

const FORMATS: ContentType[] = ["notes", "blog", "flashcards", "quiz", "social"];

export default function GeneratingDirectionsPage() {
  const [direction, setDirection] = useState<DirectionId>("checklist");
  const [mode, setMode] = useState<HarnessMode>("play");
  const [restart, setRestart] = useState(0);
  const [type, setType] = useState<ContentType>("notes");
  // Folded to a single button, so a phone-width composition can be seen
  // without the panel covering most of it.
  const [folded, setFolded] = useState(false);
  const { theme, setTheme } = useTheme();

  const run = useSimulatedRun(mode, restart);
  const active = DIRECTIONS.find((entry) => entry.id === direction);

  const chip = (selected: boolean) =>
    [
      "rounded-xn-sm px-2 py-1.5 text-left text-sm transition-colors duration-xn ease-xn",
      selected ? "bg-xn-ink text-xn-bg" : "text-xn-ink-muted hover:bg-xn-surface-alt hover:text-xn-ink",
    ].join(" ");
  const small =
    "rounded-xn-sm px-2 py-1 font-mono text-micro text-xn-ink-muted transition-colors duration-xn ease-xn hover:bg-xn-surface-alt hover:text-xn-ink";

  return (
    <>
      <SpecimenMotion />

      <AppShell>
        <div className="mx-auto max-w-output px-4 py-10 sm:px-6">
          {direction === "checklist" && <DirectionChecklist meta={META} type={type} run={run} />}
          {direction === "sheet" && <DirectionSheet meta={META} type={type} run={run} />}
          {direction === "split" && <DirectionSplit meta={META} type={type} run={run} />}
          {direction === "source" && <DirectionSource meta={META} type={type} run={run} />}
        </div>
      </AppShell>

      {/* ── Harness controls ── fixed, so they take no height from the
          composition being judged. */}
      {folded ? (
        <button
          type="button"
          onClick={() => setFolded(false)}
          className="fixed bottom-4 right-4 z-50 rounded-xn-lg border border-xn-border bg-xn-surface px-3 py-2 font-mono text-micro text-xn-ink-muted shadow-xn-lg"
        >
          Controls
        </button>
      ) : (
        <div className="fixed bottom-4 right-4 z-50 w-[316px] rounded-xn-lg border border-xn-border bg-xn-surface p-3 shadow-xn-lg">
          <div className="flex items-center justify-between">
            <p className="font-mono text-micro uppercase tracking-wide text-xn-ink-soft">Direction</p>
            <span className="flex items-center gap-1">
              <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className={small}>
                {theme === "dark" ? "→ light" : "→ dark"}
              </button>
              <button type="button" onClick={() => setFolded(true)} className={small}>
                hide
              </button>
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1">
            {DIRECTIONS.map((entry) => (
              <button key={entry.id} type="button" onClick={() => setDirection(entry.id)} className={chip(entry.id === direction)}>
                {entry.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-snug text-xn-ink-soft">{active?.note}</p>

          <p className="mt-3 font-mono text-micro uppercase tracking-wide text-xn-ink-soft">Run</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {MODES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setMode(entry.id);
                  setRestart((count) => count + 1);
                }}
                className={chip(entry.id === mode)}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <p className="mt-3 font-mono text-micro uppercase tracking-wide text-xn-ink-soft">Format</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {FORMATS.map((entry) => (
              <button key={entry} type="button" onClick={() => setType(entry)} className={chip(entry === type)}>
                {entry}
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs leading-snug text-xn-ink-soft">
            Simulated: the transcript takes 2.3s, the start 0.7s, and drafting holds until you pick again.
            Times shown are what the page would measure. The transcript text and word count are samples.
          </p>
        </div>
      )}
    </>
  );
}
