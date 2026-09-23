"use client";

// src/app/dev/social-templates/page.tsx  →  route: /dev/social-templates
//
// Destination-faithful templates for the social format. Not shipped.
//
// ── What this route is for ──
//
// Social output is the one format whose destination is not this product.
// Every other type is read here; a video description is pasted somewhere
// else, into a page whose presentation is already fixed. So the surface that
// makes sense for it is not a reading view — it is a preview of where the
// text lands.
//
// ── The split, which is the whole idea ──
//
// The page has two halves and they are judged separately:
//
//   BELOW THE RULE — the destination's half. Fixed, because the destination
//   already decided it. Not a variable and not up for direction work.
//
//   ABOVE THE RULE — ours. How this product offers four tones next to
//   someone else's page. Genuinely open, so it gets four directions
//   (`directions.tsx`), meant to be mixed rather than ranked.
//
// One platform per route pass. This is the video description; post, thread,
// caption and newsletter each get their own, and each will want its own
// directions rather than inheriting these.
//
// ── Nothing here is generated ──
//
// All four tones are hand-written (`content.ts`). Generation returns ONE
// output per platform today; four tone variants is a prompt change plus a
// body shape, recorded in §16. The harness says so on screen, because a
// specimen that looks like working output is how a faked surface gets
// described as shipped.

import { useState } from "react";

import { AppShell } from "@/components/layout";
import { PlatformMark } from "@/components/ui/platform-mark";
import { useTheme } from "@/components/shared/theme-provider";

import { YOUTUBE_DESCRIPTION, type Tone } from "./content";
import {
  DIRECTION_META,
  DIRECTION_ORDER,
  DIRECTION_VIEWS,
  type DirectionId,
} from "./directions";
import { YoutubeDescription } from "./youtube-description";

export default function SocialTemplatesPage() {
  const { theme, setTheme } = useTheme();
  const [tone, setTone] = useState<Tone>("professional");
  const [directionId, setDirectionId] = useState<DirectionId>("bar");

  // Both lookups are total — `DirectionId` is the record's own key type, so
  // neither needs an assertion to convince the compiler it found something.
  const Direction = DIRECTION_VIEWS[directionId];
  const direction = DIRECTION_META[directionId];

  return (
    <>
      <AppShell>
        {/* `-mt-6` is the partner of the pinned bar's `-top-6` in the
            directions that have one: it cancels the shell's own `py-6` so a
            pinned bar lands flush rather than 24px low. The output specimens
            carry the same pair, and §13 records the round spent discovering
            that applying only one of them drops the bar. */}
        <div className="mx-auto -mt-6 max-w-[1100px] px-6 pb-24">
          <Direction tone={tone} setTone={setTone}>
            <YoutubeDescription copy={YOUTUBE_DESCRIPTION[tone]} />
          </Direction>
        </div>
      </AppShell>

      {/* ── Harness controls ── */}
      <div className="fixed bottom-4 right-4 z-50 w-[300px] rounded-xn-lg border border-xn-border bg-xn-surface p-3 shadow-xn-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 text-xn-fmt-social">
              <PlatformMark platform="youtube-description" />
            </span>
            <p className="font-mono text-micro uppercase tracking-wide text-xn-ink-soft">
              Direction
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-xn-sm px-2 py-1 font-mono text-micro text-xn-ink-muted transition-colors duration-xn ease-xn hover:bg-xn-surface-alt hover:text-xn-ink"
          >
            {theme === "dark" ? "→ light" : "→ dark"}
          </button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1">
          {DIRECTION_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setDirectionId(id)}
              className={[
                "rounded-xn-sm px-2 py-1.5 text-xs transition-colors duration-xn ease-xn",
                id === directionId
                  ? "bg-xn-ink text-xn-bg"
                  : "text-xn-ink-muted hover:bg-xn-surface-alt hover:text-xn-ink",
              ].join(" ")}
            >
              {DIRECTION_META[id].name}
            </button>
          ))}
        </div>

        <p className="mt-2 text-xs leading-snug text-xn-ink-soft">{direction.note}</p>

        <p className="mt-3 rounded-xn-sm border border-xn-danger bg-xn-danger-soft p-2 text-xs leading-snug text-xn-danger">
          All four tones are hand-written. Generation returns one output per
          platform and no tone option exists — see §16. Counts and avatar are
          blank because this product does not have that data.
        </p>
      </div>
    </>
  );
}
