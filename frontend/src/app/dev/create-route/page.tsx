"use client";

// src/app/dev/create-route/page.tsx  →  route: /dev/create-route
//
// Verification harness for the three components the create route now renders.
// Not shipped, and deliberately not a design surface — /dev/create-directions
// is where the design is judged.
//
// /create is behind auth and the browser tooling has no session, so it
// 307s to /login and cannot be looked at. These components can, and this is
// the only way to confirm they render at all rather than merely compile.
//
// Rendered inside the real AppShell so the widths are the route's own.

import { useState } from "react";

import { CreateHero } from "@/components/create/create-hero";
import { GeneratingPanel } from "@/components/create/generating-panel";
import { SourcePanel } from "@/components/create/source-panel";
import { AppShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import type { ContentType } from "@/lib/constants/theme";
import type { VideoMeta } from "@/lib/youtube/types";

const META: VideoMeta = {
  videoId: "wjZofJX0v4M",
  title: "Transformers, the tech behind LLMs | Deep Learning Chapter 5",
  channel: "3Blue1Brown",
  channelUrl: "https://www.youtube.com/@3blue1brown",
  thumbnailUrl: "https://img.youtube.com/vi/wjZofJX0v4M/maxresdefault.jpg",
  url: "https://www.youtube.com/watch?v=wjZofJX0v4M",
  durationSeconds: 1687,
};

const STATES = ["hero", "hero-error", "ready", "transcribing", "generating"] as const;
type State = (typeof STATES)[number];

export default function DevCreateRoutePage() {
  const [state, setState] = useState<State>("hero");
  const [type] = useState<ContentType>("notes");

  return (
    <AppShell>
      <div className="mx-auto max-w-output px-6 py-10">
        <div className="mb-8 flex flex-wrap gap-2 border-b border-xn-border pb-5">
          {STATES.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setState(entry)}
              className={[
                "rounded-xn-sm px-2.5 py-1 font-mono text-micro transition-colors duration-xn ease-xn",
                entry === state
                  ? "bg-xn-ink text-xn-bg"
                  : "text-xn-ink-muted hover:bg-xn-surface-alt hover:text-xn-ink",
              ].join(" ")}
            >
              {entry}
            </button>
          ))}
        </div>

        {(state === "hero" || state === "hero-error") && (
          <CreateHero
            onSubmit={() => {}}
            error={state === "hero-error"}
          >
            {state === "hero-error" && (
              <p className="mt-3 text-sm text-xn-danger">
                That doesn&apos;t look like a YouTube link.
              </p>
            )}
          </CreateHero>
        )}

        {(state === "ready" || state === "transcribing") && (
          <>
            <h2 className="mb-4 text-h5 text-xn-ink">Using this video</h2>
            <SourcePanel
              meta={META}
              onChange={() => {}}
              busy={state === "transcribing"}
              primary={
                <Button variant="primary" disabled={state === "transcribing"}>
                  {state === "transcribing" ? "Preparing…" : "Continue"}
                </Button>
              }
              status={
                state === "transcribing" ? (
                  <span className="text-sm text-xn-ink-muted">
                    Fetching the transcript…
                  </span>
                ) : undefined
              }
            />
          </>
        )}

        {state === "generating" && <GeneratingPanel type={type} />}
      </div>
    </AppShell>
  );
}
