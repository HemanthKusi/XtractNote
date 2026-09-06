"use client";

// src/app/dev/create-directions/direction-workspace.tsx
//
// DIRECTION B — Workspace
//
// The page holds ONE shape for the whole run. Three zones — source, format,
// result — are present from the first frame and stay present; progress fills
// them in rather than swapping the page for a different page.
//
// ── The argument ──
//
// Every flow-shaped design has the same tell: the layout jumps each time you
// answer something, so you re-find your bearings four times on one task. A
// workspace never moves. You can see the format grid before you have a video,
// which is also the fastest way to learn what the product makes — the seven
// tiles are visible on arrival instead of two clicks deep.
//
// ── The cost ──
//
// Zones you cannot use yet are on screen looking inert, which some people read
// as broken rather than as pending. Direction A hides them until they matter
// and pays for it with a page that changes shape three times.

import { useState } from "react";

import { ContentTypePicker } from "@/components/create/content-type-picker";
import { SocialPlatformPicker } from "@/components/create/social-platform-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { HeroInput } from "@/components/ui/hero-input";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import type {
  GeneratableContentType,
  SocialPlatform,
} from "@/lib/content/types";

import {
  AlertGlyph,
  DRAFTS,
  DraftList,
  ERROR_COPY,
  Indeterminate,
  LinkGlyph,
  PLACEHOLDERS,
  SEARCH_RESULTS,
  VIDEO,
  duration,
  views,
  type Phase,
} from "./shared";

/**
 * A numbered zone.
 *
 * The number is not decoration: these three are strictly ordered and each
 * gates the next, which is the one case the discard list allows for numbered
 * markers. It also does the work the layout deliberately refuses to do —
 * since nothing moves, the number and the dimming are what say where you are.
 */
function Zone({
  step,
  title,
  active,
  children,
  aside,
}: {
  step: number;
  title: string;
  active: boolean;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className={active ? "" : "opacity-45"}>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="flex items-baseline gap-2.5 text-h5 text-xn-ink">
          <span className="font-mono text-micro text-xn-ink-soft">
            {String(step).padStart(2, "0")}
          </span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function DirectionWorkspace({ phase }: { phase: Phase }) {
  const [type, setType] = useState<GeneratableContentType | null>("notes");
  const [platform, setPlatform] = useState<SocialPlatform | null>(null);

  const hasSource =
    phase === "ready" || phase === "picking" || phase === "generating";
  const generating = phase === "generating";

  return (
    <div className="py-10">
      <header className="mb-8">
        <h1 className="text-h3 text-xn-ink">Create</h1>
      </header>

      <div className="flex flex-col gap-10">
        {/* ── 01 · Source ── */}
        <Zone
          step={1}
          title="Source"
          active={!hasSource}
          aside={
            hasSource ? (
              <Button variant="ghost" size="sm">
                Change
              </Button>
            ) : undefined
          }
        >
          {hasSource ? (
            <Card variant="default" padding="none">
              <div className="flex items-center gap-4 p-3">
                <div className="w-[200px] shrink-0">
                  <VideoThumbnail
                    videoId={VIDEO.videoId}
                    duration={duration(VIDEO.durationSeconds ?? null)}
                    label="youtube"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-h5 leading-snug text-xn-ink">
                    {VIDEO.title}
                  </p>
                  <p className="mt-1 text-sm text-xn-ink-muted">
                    {VIDEO.channel} · Transcript ready
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <HeroInput
                placeholders={PLACEHOLDERS}
                prefix={<LinkGlyph />}
                error={phase === "error"}
                suffix={
                  <Button variant="primary" size="md">
                    Convert
                  </Button>
                }
              />

              {phase === "error" && (
                <p className="mt-3 flex items-start gap-2 text-sm text-xn-danger">
                  <AlertGlyph className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{ERROR_COPY}</span>
                </p>
              )}

              {/* Search results live INSIDE the source zone rather than as a
                  separate section, because that is what they are: candidate
                  answers to this step's question.

                  Only real results appear here. The "or start from one of
                  these" grid that used to render on the idle phase was
                  invented — no recommendation source exists — and is cut. */}
              {phase === "results" && (
                <div className="mt-5">
                  <p className="mb-3 text-sm text-xn-ink-soft">
                    Results for “how transformers work”
                  </p>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] gap-3">
                    {SEARCH_RESULTS.map((video) => (
                      <button
                        key={video.videoId}
                        type="button"
                        className="group text-left"
                      >
                        <VideoThumbnail
                          videoId={video.videoId}
                          src={video.thumbnailUrl}
                          duration={duration(video.durationSeconds)}
                          label="youtube"
                        />
                        <span className="mt-2 block line-clamp-2 text-sm font-medium leading-snug text-xn-ink">
                          {video.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-xn-ink-soft">
                          {video.channel} · {views(video.viewCount)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Unfinished work, as an alternative entry to this zone —
                  the other honest way to answer "what am I working on?". */}
              {phase !== "results" && (
                <div className="mt-6">
                  <p className="mb-3 text-sm text-xn-ink-soft">
                    Or pick up where you left off
                  </p>
                  <DraftList drafts={DRAFTS} />
                </div>
              )}
            </>
          )}
        </Zone>

        {/* ── 02 · Format ── visible from the first frame, always */}
        <Zone
          step={2}
          title="Format"
          active={hasSource && !generating}
          aside={
            <span className="text-sm text-xn-ink-soft">
              {hasSource ? "Seven to choose from" : "Available once you pick a source"}
            </span>
          }
        >
          <ContentTypePicker
            selected={hasSource ? type : null}
            onSelect={setType}
            selectedPlatform={platform}
            disabled={!hasSource || generating}
          />
          <SocialPlatformPicker
            visible={hasSource && type === "social"}
            selected={platform}
            onSelect={setPlatform}
            disabled={generating}
            className="mt-4"
          />
        </Zone>

        {/* ── 03 · Result ── */}
        <Zone step={3} title="Result" active={generating}>
          <Card variant="default" padding="md">
            {generating ? (
              <>
                <div className="flex items-center gap-3">
                  <ContentTypeIcon type="notes" size="xl" withBackground />
                  <div>
                    <p className="text-h5 text-xn-ink">
                      Writing your study notes
                    </p>
                    <p className="mt-0.5 text-sm text-xn-ink-muted">
                      About three minutes.
                    </p>
                  </div>
                </div>
                <Indeterminate className="mt-5" />
              </>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <p className="text-ui text-xn-ink-soft">
                  Your content appears here, ready to edit and save.
                </p>
                <Button variant="primary" disabled>
                  Generate
                </Button>
              </div>
            )}
          </Card>
        </Zone>
      </div>
    </div>
  );
}
