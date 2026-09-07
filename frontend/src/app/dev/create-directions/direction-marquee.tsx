"use client";

// src/app/dev/create-directions/direction-marquee.tsx
//
// DIRECTION D — Marquee
//
// The loud one. Type carries the page: the seven formats run down the idle
// screen as a masthead at heading size in their own colours, and the resolved
// video plays as a wide cinematic band rather than a card.
//
// ── The argument ──
//
// The other three are all, structurally, "form plus grid". This one gives the
// page a hierarchy: something is BIG, and the size does the pointing. It is
// the only direction where arriving at /create feels like arriving somewhere
// with a front page rather than at a tool with an empty field.
//
// ── This direction was rebuilt after the recommendation cut ──
//
// It originally led with a large FEATURED video, which was the strongest
// version of the idea and also the least honest: nothing in the product can
// pick a video worth featuring. With recommendations cut, the focal point had
// to come from data that genuinely exists — so it comes from the seven
// formats, which are always true and need no backend at all.
//
// The masthead is a display, not a control. Choosing still happens in the
// shipped ContentTypePicker on the phase where a video exists, so this does
// not fork the format-selection UI into two implementations.
//
// ── The generating phase here is AHEAD OF THE BACKEND ──
//
// The staged list depicts a pipeline reporting its progress.
// backend/app/services/generate.py is a single LangChain call: no LangGraph,
// no per-stage events, no stream, and the agents package is a stub.
// Directions A, B and C show an indeterminate wait, which is the honest
// rendering of what ships today. Choosing this means also building that
// reporting — a fake staged list is a lie about what the product is doing.

import { useState } from "react";

import { ContentTypePicker } from "@/components/create/content-type-picker";
import { SocialPlatformPicker } from "@/components/create/social-platform-picker";
import { Button } from "@/components/ui/button";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { HeroInput } from "@/components/ui/hero-input";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { contentTypeColors, type ContentType } from "@/lib/constants/theme";
import type {
  GeneratableContentType,
  SocialPlatform,
} from "@/lib/content/types";

import {
  AlertGlyph,
  DRAFTS,
  DraftList,
  ERROR_COPY,
  LinkGlyph,
  PIPELINE_STAGES,
  PLACEHOLDERS,
  SEARCH_RESULTS,
  SectionHead,
  VIDEO,
  duration,
  views,
  type Phase,
} from "./shared";

/** Which stage the specimen freezes on, so the composition can be judged. */
const CURRENT_STAGE = 1;

/**
 * One line per format, for the masthead.
 *
 * Local rather than pulled from a registry on purpose. `contentTypeColors`
 * (theme.ts) carries label and colours but no copy; CONTENT_TYPES
 * (constants/content-types.ts) carries copy but also a second, older set of
 * hex colours that predate the redesigned seven. Importing the latter here
 * just to read one string would drag that stale palette into the file's
 * dependencies. If this direction ships, the two registries should be
 * reconciled — that is a real piece of debt, not something to paper over.
 */
const BLURB: Record<ContentType, string> = {
  summary: "The short version, with timestamps",
  blog: "A structured article with headings",
  notes: "Highlights and key points, for revision",
  research: "Deep analysis with citations",
  flashcards: "Question and answer pairs",
  quiz: "Multiple choice that tests recall",
  social: "Posts sized for five different places",
};

export function DirectionMarquee({ phase }: { phase: Phase }) {
  const [type, setType] = useState<GeneratableContentType | null>("blog");
  const [platform, setPlatform] = useState<SocialPlatform | null>(null);

  const chosen = type ? contentTypeColors[type] : null;

  // ── idle / error / results ──
  if (phase === "idle" || phase === "error" || phase === "results") {
    return (
      <div className="py-10">
        <h1 className="max-w-[16ch] text-h2 leading-tight text-xn-ink">
          Watch less. Read more.
        </h1>

        <div className="mt-7">
          <HeroInput
            placeholders={PLACEHOLDERS}
            prefix={<LinkGlyph />}
            error={phase === "error"}
            suffix={
              <Button variant="primary" size="lg">
                Convert
              </Button>
            }
          />
        </div>

        {phase === "error" && (
          <p className="mt-3 flex items-start gap-2 text-sm text-xn-danger">
            <AlertGlyph className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{ERROR_COPY}</span>
          </p>
        )}

        {/* ── Search results, when there are any ── */}
        {phase === "results" && (
          <section className="mt-10">
            <SectionHead>Results</SectionHead>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(230px,100%),1fr))] gap-4">
              {SEARCH_RESULTS.map((video) => (
                <button key={video.videoId} type="button" className="group text-left">
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
          </section>
        )}

        {/* ── The seven, as a masthead ──
            What replaced the featured video. This is a DISPLAY, not the
            picker: it says what the product makes, at a size nothing else on
            the page competes with, using the one dataset that is always
            true and needs no backend. The actual choosing still happens in
            the shipped ContentTypePicker, on the phase where a video exists.

            Set in each format's own colour, which the locked decision
            permits precisely here — these are format-bearing elements. It is
            the largest stage the seven colours get anywhere in the app, and
            it is what gives this direction a focal point now that the
            invented featured slot is gone. */}
        {phase !== "results" && (
          <section className="mt-12">
            <ul className="flex flex-col">
              {(Object.keys(contentTypeColors) as ContentType[]).map((id) => (
                <li
                  key={id}
                  className="border-b border-xn-border last:border-b-0"
                >
                  <button
                    type="button"
                    className="group flex w-full items-baseline gap-5 py-3.5 text-left"
                  >
                    <span className="inline-flex shrink-0 translate-y-1">
                      <ContentTypeIcon type={id} size="md" />
                    </span>
                    <span
                      className="text-h4 transition-transform duration-xn ease-xn group-hover:translate-x-1.5"
                      style={{ color: contentTypeColors[id].color }}
                    >
                      {contentTypeColors[id].label}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-xn-ink-soft">
                      {BLURB[id]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Unfinished work ── */}
        {phase !== "results" && (
          <section className="mt-12">
            <SectionHead>Pick up where you left off</SectionHead>
            <DraftList drafts={DRAFTS} />
          </section>
        )}
      </div>
    );
  }

  // ── generating ── the aspirational one; see the header warning
  if (phase === "generating") {
    return (
      <div className="py-10">
        <div className="flex flex-wrap items-start gap-8">
          <div className="min-w-[300px] flex-1">
            <div className="flex items-center gap-2.5">
              <ContentTypeIcon type={type ?? "blog"} size="md" withBackground />
              <p className="text-ui text-xn-ink-muted">
                {chosen ? chosen.label : "Blog post"}
              </p>
            </div>
            <h1 className="mt-4 max-w-[18ch] text-h3 leading-tight text-xn-ink">
              Reading twenty-eight minutes so you don&apos;t have to.
            </h1>

            <ol className="mt-8 flex flex-col gap-1">
              {PIPELINE_STAGES.map((stage, index) => {
                const done = index < CURRENT_STAGE;
                const active = index === CURRENT_STAGE;
                return (
                  <li
                    key={stage}
                    className={[
                      "flex items-center gap-4 rounded-xn-md px-3 py-3 transition-colors duration-xn ease-xn",
                      active ? "bg-xn-surface-alt" : "",
                    ].join(" ")}
                  >
                    {/* A character slot: a circle today, a drawn agent later.
                        The row's height comes from this box, so artwork drops
                        in without changing anything around it. */}
                    <span
                      className={[
                        "grid h-9 w-9 shrink-0 place-items-center rounded-xn-pill border",
                        done
                          ? "border-xn-ink bg-xn-ink"
                          : active
                            ? "border-xn-ink"
                            : "border-xn-border",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      {done && <span className="h-2 w-2 rounded-xn-pill bg-xn-bg" />}
                      {active && (
                        <span className="h-2 w-2 rounded-xn-pill bg-xn-ink animate-shimmer motion-reduce:animate-none" />
                      )}
                    </span>
                    <span
                      className={[
                        "text-h5",
                        done
                          ? "text-xn-ink-soft"
                          : active
                            ? "text-xn-ink"
                            : "text-xn-ink-faint",
                      ].join(" ")}
                    >
                      {stage}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="w-[380px] min-w-[280px] shrink-0">
            <VideoThumbnail
              videoId={VIDEO.videoId}
              duration={duration(VIDEO.durationSeconds ?? null)}
              label="youtube"
            />
            <p className="mt-3 line-clamp-2 text-ui leading-snug text-xn-ink">
              {VIDEO.title}
            </p>
            <p className="mt-1 text-sm text-xn-ink-soft">{VIDEO.channel}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── ready / picking ── the video as a wide cinematic band
  return (
    <div className="py-10">
      <VideoThumbnail
        videoId={VIDEO.videoId}
        duration={duration(VIDEO.durationSeconds ?? null)}
        label="youtube"
      />

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-[300px] flex-1">
          <h1 className="max-w-[24ch] text-h3 leading-tight text-xn-ink">
            {VIDEO.title}
          </h1>
          <p className="mt-2 text-body text-xn-ink-muted">
            {VIDEO.channel} · {duration(VIDEO.durationSeconds ?? null)} ·
            Transcript ready
          </p>
        </div>
        <Button variant="ghost">Use a different video</Button>
      </div>

      <div className="mt-10 border-t border-xn-border pt-8">
        <SectionHead>What should it become?</SectionHead>
        <ContentTypePicker
          selected={type}
          onSelect={setType}
          selectedPlatform={platform}
        />
        <SocialPlatformPicker
          visible={type === "social"}
          selected={platform}
          onSelect={setPlatform}
          className="mt-4"
        />
        <div className="mt-7">
          <Button
            variant="primary"
            size="lg"
            disabled={!type || (type === "social" && !platform)}
          >
            Make {chosen ? chosen.label.toLowerCase() : "it"}
          </Button>
        </div>
      </div>
    </div>
  );
}
