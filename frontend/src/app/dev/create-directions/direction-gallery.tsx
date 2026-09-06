"use client";

// src/app/dev/create-directions/direction-gallery.tsx
//
// DIRECTION C — Gallery
//
// Inverts the order every other direction assumes. The format comes FIRST and
// leads the page; the video is the second question.
//
// ── The argument ──
//
// "Paste a link" assumes the user arrived holding one. Often the actual
// intent is "I want flashcards for my exam" or "I need notes on this topic" —
// the artefact is the goal and the video is just the raw material. Leading
// with the seven formats also puts the product's whole range on screen at
// arrival, in colour, which no amount of placeholder copy in a text field
// achieves.
//
// It gives the seven format colours the largest stage they get anywhere in
// the app. That is on-policy: format-bearing elements are exactly where the
// locked decision permits colour, and this page is nothing but format-bearing
// elements until a video is chosen.
//
// ── The cost ──
//
// A user who DID arrive with a link now has one more decision in front of the
// field. Mitigated by keeping the input pinned above the grid, so pasting is
// still the fastest path — but the emphasis genuinely is on the formats, and
// that is the bet.

import { useState } from "react";

import { ContentTypePicker } from "@/components/create/content-type-picker";
import { SocialPlatformPicker } from "@/components/create/social-platform-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { HeroInput } from "@/components/ui/hero-input";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { contentTypeColors } from "@/lib/constants/theme";
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
  SectionHead,
  VIDEO,
  duration,
  views,
  type Phase,
} from "./shared";

export function DirectionGallery({ phase }: { phase: Phase }) {
  const [type, setType] = useState<GeneratableContentType | null>("flashcards");
  const [platform, setPlatform] = useState<SocialPlatform | null>(null);

  const hasSource =
    phase === "ready" || phase === "picking" || phase === "generating";
  const generating = phase === "generating";
  const chosen = type ? contentTypeColors[type] : null;

  return (
    <div className="py-10">
      {/* ── The question the page actually leads with ── */}
      <header className="mb-7">
        <h1 className="text-h2 text-xn-ink">What do you want to make?</h1>
        <p className="mt-2 max-w-[58ch] text-body text-xn-ink-muted">
          Choose a format, then give us a video — or paste a link and we&apos;ll
          ask afterwards.
        </p>
      </header>

      {/* The formats, leading. The shipped picker, at full width. */}
      <ContentTypePicker
        selected={type}
        onSelect={setType}
        selectedPlatform={platform}
        disabled={generating}
      />
      <SocialPlatformPicker
        visible={type === "social"}
        selected={platform}
        onSelect={setPlatform}
        disabled={generating}
        className="mt-4"
      />

      {/* ── The second question ── */}
      <div className="mt-10 border-t border-xn-border pt-8">
        {generating ? (
          <Card variant="default" padding="md">
            <div className="flex flex-wrap items-center gap-4">
              <ContentTypeIcon type={type ?? "notes"} size="xl" withBackground />
              <div className="min-w-[240px] flex-1">
                <p className="text-h5 text-xn-ink">
                  Making {chosen ? chosen.label.toLowerCase() : "your content"}
                </p>
                <p className="mt-0.5 text-sm text-xn-ink-muted">
                  From “{VIDEO.title}”
                </p>
              </div>
              <div className="w-[160px] shrink-0">
                <VideoThumbnail
                  videoId={VIDEO.videoId}
                  duration={duration(VIDEO.durationSeconds ?? null)}
                  label="youtube"
                />
              </div>
            </div>
            <Indeterminate className="mt-5" />
          </Card>
        ) : hasSource ? (
          // A source is chosen: show it, and the way to start.
          <>
            <SectionHead
              action={
                <Button variant="ghost" size="sm">
                  Change video
                </Button>
              }
            >
              Using this video
            </SectionHead>
            <Card variant="default" padding="none">
              <div className="flex flex-wrap items-center gap-4 p-3">
                <div className="w-[240px] shrink-0">
                  <VideoThumbnail
                    videoId={VIDEO.videoId}
                    duration={duration(VIDEO.durationSeconds ?? null)}
                    label="youtube"
                  />
                </div>
                <div className="min-w-[220px] flex-1">
                  <p className="line-clamp-2 text-h5 leading-snug text-xn-ink">
                    {VIDEO.title}
                  </p>
                  <p className="mt-1 text-sm text-xn-ink-muted">
                    {VIDEO.channel} · Transcript ready
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  disabled={!type || (type === "social" && !platform)}
                >
                  Make {chosen ? chosen.label.toLowerCase() : "it"}
                </Button>
              </div>
            </Card>
          </>
        ) : (
          // No source yet: the field, then candidates.
          <>
            <SectionHead>
              {phase === "results" ? "Results" : "Which video?"}
            </SectionHead>

            <HeroInput
              placeholders={PLACEHOLDERS}
              prefix={<LinkGlyph />}
              error={phase === "error"}
              suffix={
                <Button variant="primary" size="md">
                  Use this
                </Button>
              }
            />

            {phase === "error" && (
              <p className="mt-3 flex items-start gap-2 text-sm text-xn-danger">
                <AlertGlyph className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{ERROR_COPY}</span>
              </p>
            )}

            {/* Real search results only. The recommendation grid that used
                to fill this space on the idle phase was invented and is cut;
                this direction survives that better than the others because
                its page is already carried by the format tiles above. */}
            {phase === "results" && (
              <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(min(230px,100%),1fr))] gap-4">
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
            )}

            {/* Unfinished work in the chosen format, when there is any. A
                draft is the one genuinely personal thing this page can offer
                before a video exists. */}
            {phase !== "results" && (
              <div className="mt-8">
                <p className="mb-3 text-sm text-xn-ink-soft">
                  Or pick up where you left off
                </p>
                <DraftList drafts={DRAFTS} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
