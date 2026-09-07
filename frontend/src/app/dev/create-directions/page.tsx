"use client";

// src/app/dev/create-directions/page.tsx  →  route: /dev/create-directions
//
// Four directions for the create route, rendered side by side in time: pick a
// direction, pick a phase, compare. Not shipped.
//
// ── Why this renders inside the REAL AppShell ──
//
// The bible records three separate rounds of confident arithmetic about how
// wide this content area is, each one wrong, because the harness was a chosen
// number rather than the real container. So there is no number here at all.
// The shipped shell is rendered around the specimen and the menu is left
// live — collapse it and every direction reflows, which is the only honest way
// to see whether a layout survives the 168px the menu moves.
//
// /create is behind auth and the browser tooling has no session, so this is
// also the only way these compositions can be looked at at all.
//
// ── The controls are FIXED, not in the column ──
//
// A control bar inside the content would take vertical space from the thing
// being judged and shift every composition down by its own height. Pinning it
// to the viewport leaves the content column exactly as the real route has it.

import { useState } from "react";

import { AppShell } from "@/components/layout";
import { useTheme } from "@/components/shared/theme-provider";

import { DirectionGallery } from "./direction-gallery";
import { DirectionLaunchpad } from "./direction-launchpad";
import { DirectionMarquee } from "./direction-marquee";
import { DirectionWorkspace } from "./direction-workspace";
import { PHASES, PHASE_LABELS, type Phase } from "./shared";

const DIRECTIONS = [
  {
    id: "launchpad",
    label: "A · Launchpad",
    note: "Sectioned. Idle carries recent work and recommendations; the source and the format grid share the working page.",
  },
  {
    id: "workspace",
    label: "B · Workspace",
    note: "One shape for the whole run. All three zones present from the first frame, including the format grid.",
  },
  {
    id: "gallery",
    label: "C · Gallery",
    note: "Format first, video second. Leads with the seven formats rather than with a text field.",
  },
  {
    id: "marquee",
    label: "D · Marquee",
    note: "A featured video leads the page, and the resolved source plays as a wide cinematic band.",
  },
] as const;

type DirectionId = (typeof DIRECTIONS)[number]["id"];

export default function CreateDirectionsPage() {
  const [direction, setDirection] = useState<DirectionId>("launchpad");
  const [phase, setPhase] = useState<Phase>("idle");
  const { theme, setTheme } = useTheme();

  const active = DIRECTIONS.find((entry) => entry.id === direction);

  return (
    <>
      <AppShell>
        {/* The column /create actually declares. Copied verbatim rather than
            approximated, so the directions are judged at the width they would
            really have. */}
        <div className="mx-auto max-w-output px-6">
          {direction === "launchpad" && <DirectionLaunchpad phase={phase} />}
          {direction === "workspace" && <DirectionWorkspace phase={phase} />}
          {direction === "gallery" && <DirectionGallery phase={phase} />}
          {direction === "marquee" && <DirectionMarquee phase={phase} />}
        </div>
      </AppShell>

      {/* ── Harness controls ── */}
      <div className="fixed bottom-4 right-4 z-50 w-[300px] rounded-xn-lg border border-xn-border bg-xn-surface p-3 shadow-xn-lg">
        <div className="flex items-center justify-between">
          <p className="font-mono text-micro uppercase tracking-wide text-xn-ink-soft">
            Direction
          </p>
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-xn-sm px-2 py-1 font-mono text-micro text-xn-ink-muted transition-colors duration-xn ease-xn hover:bg-xn-surface-alt hover:text-xn-ink"
          >
            {theme === "dark" ? "→ light" : "→ dark"}
          </button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1">
          {DIRECTIONS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setDirection(entry.id)}
              className={[
                "rounded-xn-sm px-2 py-1.5 text-left text-sm transition-colors duration-xn ease-xn",
                entry.id === direction
                  ? "bg-xn-ink text-xn-bg"
                  : "text-xn-ink-muted hover:bg-xn-surface-alt hover:text-xn-ink",
              ].join(" ")}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <p className="mt-2 text-xs leading-snug text-xn-ink-soft">
          {active?.note}
        </p>

        <p className="mt-3 font-mono text-micro uppercase tracking-wide text-xn-ink-soft">
          Phase
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {PHASES.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setPhase(entry)}
              className={[
                "rounded-xn-sm px-2 py-1 text-xs transition-colors duration-xn ease-xn",
                entry === phase
                  ? "bg-xn-ink text-xn-bg"
                  : "text-xn-ink-muted hover:bg-xn-surface-alt hover:text-xn-ink",
              ].join(" ")}
            >
              {PHASE_LABELS[entry]}
            </button>
          ))}
        </div>

        {/* The one thing about these specimens that is not a matter of taste. */}
        {direction === "marquee" && phase === "generating" && (
          <p className="mt-3 rounded-xn-sm border border-xn-danger/30 bg-xn-danger-soft p-2 text-xs leading-snug text-xn-danger">
            Ahead of the backend. This staged list needs per-stage progress
            events; generate.py is a single call that reports nothing in
            between. A, B and C show an indeterminate wait instead.
          </p>
        )}
      </div>
    </>
  );
}
