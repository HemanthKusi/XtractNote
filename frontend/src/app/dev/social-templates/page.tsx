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
//   someone else's page. Genuinely open, so it gets five directions
//   (`directions.tsx`), meant to be mixed rather than ranked. `E · Bar` is
//   the one currently chosen; the other four stay because the alternatives
//   are the reasoning, and keeping only the winner leaves the record saying
//   what won but not what it beat.
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

import { useCallback, useState } from "react";

import { AppShell } from "@/components/layout";
import { PlatformMark } from "@/components/ui/platform-mark";
import { useTheme } from "@/components/shared/theme-provider";

import {
  BUILT_PLATFORMS,
  DEFAULT_LENGTH,
  DEFAULT_TONE,
  LENGTHS,
  PLATFORM_LABEL,
  TONES,
  X_THREAD,
  YOUTUBE_DESCRIPTION,
  type BuiltPlatform,
  type ThreadLength,
  type Tone,
} from "./content";
import {
  DIRECTION_META,
  DIRECTION_ORDER,
  DIRECTION_VIEWS,
  type DirectionId,
} from "./directions";
import { useOnDemand } from "./use-on-demand";
import { XThread } from "./x-thread";
import { YoutubeDescription } from "./youtube-description";

export default function SocialTemplatesPage() {
  const { theme, setTheme } = useTheme();
  // Declared before the grid below, which reads it. It used to sit after,
  // and the closure that read it ran immediately inside a `.filter` — a
  // temporal-dead-zone crash that TYPECHECKED, because TypeScript cannot
  // prove a callback runs synchronously. The browser caught it; tsc did not.
  const [platform, setPlatform] = useState<BuiltPlatform>("youtube-description");

  // ── One grid of artefacts, two selectors over it ──
  //
  // A generation produces one (tone, length) artefact, so readiness is keyed
  // by the pair. Tone and length are then just two ways of moving around that
  // grid, and returning to something already generated costs nothing — which
  // is precisely what the earlier per-axis version got wrong.
  //
  // The description has no length axis, so its keys carry tone alone. Giving
  // it a length in the key would invent a variant the user cannot ask for.
  const [tone, setTone] = useState<Tone>("professional");
  const [length, setLength] = useState<ThreadLength>(DEFAULT_LENGTH);

  const keyFor = useCallback(
    (p: BuiltPlatform, t: Tone, l: ThreadLength) =>
      p === "x-thread" ? `x:${t}:${l}` : `yt:${t}`,
    [],
  );

  // Each platform's default artefact is what a run produces, so both are
  // seeded. Switching platform in this harness is a specimen convenience,
  // not a user action that should appear to cost a generation.
  const { ready, generating, request, cancel } = useOnDemand([
    `yt:professional`,
    `x:professional:${DEFAULT_LENGTH}`,
  ]);

  // Per-axis views, derived rather than stored, so the two can never disagree
  // about what has been paid for.
  const toneReady = new Set(TONES.filter((t) => ready.has(keyFor(platform, t, length))));
  const toneGenerating =
    TONES.find((t) => keyFor(platform, t, length) === generating) ?? null;

  const lengthReady = new Set(
    LENGTHS.filter((l) => ready.has(keyFor(platform, tone, l))),
  );
  const lengthGenerating =
    LENGTHS.find((l) => keyFor(platform, tone, l) === generating) ?? null;

  /**
   * Switching platform lands on that platform's OWN default artefact.
   *
   * Two defects, one cause. Review caught the race: a generation in flight
   * when the platform changes would commit its selection afterwards, leaving
   * a tone selected on X that was only ever generated for the description.
   *
   * Reproducing it turned up the larger half — the same contradiction with
   * NO race at all. Generate a tone on the description, let it finish, switch
   * calmly, and that tone carries over to a platform where the artefact was
   * never generated: selected and marked ungenerated at once. Cancelling the
   * pending run alone would have fixed the race and left this untouched.
   *
   * Both come from treating tone and length as global when an artefact is
   * per platform. A real user never does this — the platform is chosen at
   * generation time and there is no switch — so the honest behaviour for a
   * harness affordance is to land on the default the platform actually has,
   * which is seeded ready. Every displayed variant is then one that exists.
   */
  const switchPlatform = (next: BuiltPlatform) => {
    cancel();
    setPlatform(next);
    setTone(DEFAULT_TONE);
    setLength(DEFAULT_LENGTH);
  };

  const requestTone = (next: Tone) =>
    request(keyFor(platform, next, length), () => setTone(next));
  const requestLength = (next: ThreadLength) =>
    request(keyFor(platform, tone, next), () => setLength(next));
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
          <Direction
            tone={tone}
            setTone={requestTone}
            platform={platform}
            toneReady={toneReady}
            toneGenerating={toneGenerating}
          >
            {platform === "x-thread" ? (
              <XThread
                threads={X_THREAD[tone]}
                length={length}
                onRequestLength={requestLength}
                lengthReady={lengthReady}
                lengthGenerating={lengthGenerating}
              />
            ) : (
              <YoutubeDescription copy={YOUTUBE_DESCRIPTION[tone]} />
            )}
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
          {BUILT_PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => switchPlatform(p)}
              className={[
                "rounded-xn-sm px-2 py-1.5 text-xs transition-colors duration-xn ease-xn",
                p === platform
                  ? "bg-xn-fmt-social text-xn-bg"
                  : "text-xn-ink-muted hover:bg-xn-surface-alt hover:text-xn-ink",
              ].join(" ")}
            >
              {PLATFORM_LABEL[p]}
            </button>
          ))}
        </div>

        <p className="mt-2 font-mono text-micro uppercase tracking-wide text-xn-ink-soft">
          Direction
        </p>

        <div className="mt-1 grid grid-cols-2 gap-1">
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
