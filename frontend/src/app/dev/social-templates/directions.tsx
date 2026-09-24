"use client";

// src/app/dev/social-templates/directions.tsx
//
// Five treatments of OUR side of the surface — the part above the rule.
// `E · Bar` is the one currently chosen.
//
// ── What is being judged, and what is not ──
//
// The destination's half is settled: the 16:9, the title, the channel row,
// the folding description block. It is not a variable, because the
// destination already decided it and we do not get a vote.
//
// What is genuinely open is how THIS PRODUCT presents a choice of four
// tones next to that. Each direction below answers the same three questions
// differently:
//
//   1. Do you choose by LABEL ("funny") or by READING the thing itself?
//   2. How much does our chrome cost the preview in room and attention?
//   3. Is the choice a setting you make once, or something you browse?
//
// They are meant to be mixed. B's read-it-first cards with C's restraint is a
// real answer and not a compromise.
//
// ── The one rule every direction keeps ──
//
// Nothing of ours is painted onto the mock. A toolbar floating over the
// destination's chrome would make the preview a liar at exactly the moment it
// is supposed to be trustworthy.

import type { ReactNode } from "react";

import { Loader2 } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { PlatformMark } from "@/components/ui/platform-mark";

import {
  openingFor,
  PLATFORM_LABEL,
  TONES,
  TONE_NOTE,
  type BuiltPlatform,
  type Tone,
} from "./content";

/**
 * The platform's true colour.
 *
 * COPIED from `PLATFORM_SKIN` in the create route's platform picker, where
 * it is module-private. It is a measured value, not a picked one — the
 * picker records `#FF0000` against white at 4.00:1, which clears the 3:1 a
 * mark carrying an icon needs, and notes that the same red FAILS for text at
 * 4.5:1 and drops to `#CC0000` there. This lockup only ever paints the mark,
 * never the label, so it takes the true brand value.
 *
 * Duplicated rather than imported because the picker is shipped code and
 * this is a specimen. When this ports, the skin table wants promoting to a
 * shared module — one table, two consumers — rather than a third copy.
 */
const PLATFORM_MARK_COLOR: Record<BuiltPlatform, string> = {
  // Measured against white at 4.00:1 — clears the 3:1 a mark needs, and
  // fails the 4.5:1 text would, which is why only the mark takes it.
  "youtube-description": "#FF0000",
  // NOT a compromise, and not this file being conservative: X's brand IS
  // monochrome. The picker records its fill as the ink token and its glyph
  // as the background, which inverts with the theme on its own — dark mark
  // on light, light on dark — and both are the real lockup rather than an
  // approximation of one.
  "x-thread": "var(--xn-ink)",
  // Amber, but NOT the picker's #E3B04B. That value is a FILL, chosen to sit
  // behind a dark glyph, and as ink it measures 1.99:1 on a light bar —
  // under the 3:1 a mark needs. YouTube's red survives being used as ink at
  // 4.00:1; an amber that light does not.
  //
  // So the hue is kept and the value darkened until it carries: #A87526 is
  // 4.01:1 on light and 4.42:1 on dark, the most balanced of the candidates
  // measured. The first version of this reasoned from "there is no company
  // called Newsletter" and went to ink, which answered a question about
  // branding when the actual problem was luminance.
  newsletter: "#A87526",
};

/**
 * Identity, in two parts, because two different things are true at once.
 *
 * ── The chip is the CONTENT TYPE, not the platform ──
 *
 * This is social. Notes, blog and research announce themselves with this
 * exact chip in their own format colour, and social has had a colour token
 * waiting the whole time — so the chip carries the format's own label and
 * the surface takes its place beside the other six rather than looking like
 * a page that wandered in from somewhere else. Reusing the component rather
 * than restyling a lookalike is what stops it drifting from them later.
 *
 * ── The platform is a LOCKUP, and it carries the brand ──
 *
 * The first version of this kept the mark monochrome, reasoning from the
 * picker's "monochrome until the cursor asks". That rule is about a WALL of
 * five marks competing at once on a page whose only standing colour is the
 * seven format hues. This is one mark, identifying one destination, and a
 * grey mark on a page whose whole job is to look like that destination was
 * arguing with the point of the surface. Hemanth's call, and the right one.
 *
 * The label stays ink: the red fails text contrast, and the picker already
 * measured exactly that.
 *
 * ── No knockout override any more, and that is the interesting part ──
 *
 * YouTube's play triangle is cut OUT of its body, so it takes whatever sits
 * behind the mark, and `PlatformMark` falls back to `--xn-surface`. When the
 * bar was a bare rule on the page ground that fallback was wrong and this
 * component had to override it. Now the bar is a raised surface — so the
 * component's own default is already correct, and the override is deleted
 * rather than left in place agreeing with itself by coincidence.
 */
function Identity({ platform }: { platform: BuiltPlatform }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <Chip
        contentType="social"
        icon={<ContentTypeIcon type="social" size="sm" />}
        className="shrink-0 px-2.5 py-1"
      />

      <span className="inline-flex shrink-0 items-center gap-1.5">
        <span className="h-4 w-4 shrink-0" style={{ color: PLATFORM_MARK_COLOR[platform] }}>
          <PlatformMark platform={platform} />
        </span>
        <span className="whitespace-nowrap text-sm text-xn-ink">
          {PLATFORM_LABEL[platform]}
        </span>
      </span>
    </div>
  );
}

/**
 * The mark a tone carries when it has not been generated yet.
 *
 * Every direction shows this, not just the chosen one. A tone control that
 * does not say a click costs a model call is a control that misrepresents
 * its own price, and an alternative kept for the record should not be a
 * worse-behaved version of the thing that beat it.
 */
function Pending({ generating }: { generating: boolean }) {
  if (generating) {
    return <Loader2 size={13} className="shrink-0 animate-spin" aria-hidden="true" />;
  }
  return (
    <span
      className="h-1 w-1 shrink-0 rounded-full bg-xn-ink-faint"
      aria-label="not generated yet"
    />
  );
}

/**
 * The tone switch, compact enough to live inside a bar.
 *
 * ── Tone is on demand now, like length ──
 *
 * It used to assume all four existed. Hemanth moved every variant axis to
 * the same model on 2026-09-23: one generated by default, the rest when
 * asked for. That takes a social run from 4x tokens to 1x plus whatever the
 * user actually wants.
 *
 * So a tone that has not been generated carries a dot, and the one being
 * generated carries a spinner — the user learns a click costs a model call
 * BEFORE clicking rather than after waiting.
 */
function ToneSwitch({
  tone,
  setTone,
  ready,
  generating,
}: {
  tone: Tone;
  setTone: (t: Tone) => void;
  ready: ReadonlySet<Tone>;
  generating: Tone | null;
}) {
  return (
    // Inset rather than raised: this sits INSIDE a bar that is already a
    // raised surface with its own edge, and a bordered control on a bordered
    // bar reads as a box in a box. `surface-alt` with no border makes it a
    // well in the bar instead.
    <div
      className="inline-flex shrink-0 rounded-xn-pill bg-xn-surface-alt p-1"
      role="group"
      aria-label="Description tone"
    >
      {TONES.map((t) => {
        const isGenerating = generating === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => setTone(t)}
            aria-pressed={tone === t}
            aria-busy={isGenerating || undefined}
            className={[
              "inline-flex items-center gap-1.5 rounded-xn-pill px-3 py-1.5 text-sm capitalize transition-colors duration-xn ease-xn",
              tone === t && !generating
                ? "bg-xn-ink text-xn-bg"
                : "text-xn-ink-soft hover:text-xn-ink",
            ].join(" ")}
          >
            {t}
            {(!ready.has(t) || isGenerating) && <Pending generating={isGenerating} />}
          </button>
        );
      })}
    </div>
  );
}

export interface DirectionProps {
  tone: Tone;
  setTone: (tone: Tone) => void;
  /** Which platform's identity the bar announces. */
  platform: BuiltPlatform;
  /** Tones already generated. The rest cost a model call. */
  toneReady: ReadonlySet<Tone>;
  /** The tone being generated right now, if any. */
  toneGenerating: Tone | null;
  /** The destination mock. Fixed across all five. */
  children: ReactNode;
}

/**
 * The five directions.
 *
 * A RECORD rather than an array, so looking one up by id is total — the
 * compiler knows every key exists and no caller needs a non-null assertion
 * to get at the current one. The order the switcher renders them in is a
 * separate list below, because order is presentation and this is data.
 */
export const DIRECTION_META = {
  bar: {
    name: "E · Bar",
    note: "Labelled's identity and caption, Bare's switch, in the pinned bar the output surfaces already use.",
  },
  labelled: {
    name: "A · Labelled",
    note: "Heading, a line of explanation, four pills. Everything named, nothing implied.",
  },
  specimens: {
    name: "B · Specimens",
    note: "Choose by reading, not by label. Each card shows the tone's real opening line.",
  },
  bare: {
    name: "C · Bare",
    note: "One compact switch and nothing else. The preview does all the explaining.",
  },
  rail: {
    name: "D · Rail",
    note: "A filmstrip beside the preview. Browsing rather than setting.",
  },
} as const satisfies Record<string, { name: string; note: string }>;

export type DirectionId = keyof typeof DIRECTION_META;

/** The order the switcher shows them in. */
export const DIRECTION_ORDER = [
  "bar",
  "rail",
  "labelled",
  "specimens",
  "bare",
] as const satisfies readonly DirectionId[];

// ─────────────────────────────────────────────────────────────
// A · Labelled
// ─────────────────────────────────────────────────────────────
// The conventional answer, tightened. A heading tells you what the page is,
// a line tells you what the choice does, pills make the choice, a caption
// says what the current one is for.
//
// Its cost is vertical: four stacked pieces of chrome before the preview
// starts, which on a short viewport pushes the thing you came to see below
// the fold. That is the trade the other three are arguing with.

function Labelled({ tone, setTone, toneReady, toneGenerating, children }: DirectionProps) {
  return (
    <>
      <div className="border-b border-xn-border pb-6">
        <h1 className="text-lg font-semibold text-xn-ink">Video description</h1>

        <p className="mt-1.5 max-w-measure text-sm leading-relaxed text-xn-ink-muted">
          Four tones of the same description. The frame below is fixed — it is how
          the destination will present whichever one you pick.
        </p>

        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Description tone">
          {TONES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              aria-pressed={tone === t}
              aria-busy={toneGenerating === t || undefined}
              className={[
                "inline-flex items-center gap-1.5 rounded-xn-pill border px-4 py-2 text-sm capitalize transition-colors duration-xn ease-xn",
                tone === t
                  ? "border-xn-ink bg-xn-ink text-xn-bg"
                  : "border-xn-border text-xn-ink-muted hover:border-xn-border-strong hover:text-xn-ink",
              ].join(" ")}
            >
              {t}
              {(!toneReady.has(t) || toneGenerating === t) && (
                <Pending generating={toneGenerating === t} />
              )}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs leading-snug text-xn-ink-soft">{TONE_NOTE[tone]}</p>
      </div>

      <div className="pt-10">{children}</div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// B · Specimens
// ─────────────────────────────────────────────────────────────
// The argument: "funny" is a label, and a label is a promise the copy might
// not keep. Reading two lines of the actual thing tells you more than the
// word ever will, and it is the same two lines the destination will show —
// so the card is a preview of the preview.
//
// Deliberately clamped to two lines for the same reason the mock is: if a
// tone only works in its third line, it does not work.

function Specimens({ tone, setTone, platform, toneReady, toneGenerating, children }: DirectionProps) {
  return (
    <>
      <div className="border-b border-xn-border pb-6">
        <h1 className="text-lg font-semibold text-xn-ink">Video description</h1>
        <p className="mt-1.5 text-sm text-xn-ink-muted">
          Four tones. Each card shows what the destination would put above its fold.
        </p>

        <div
          className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          role="group"
          aria-label="Description tone"
        >
          {TONES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              aria-pressed={tone === t}
              className={[
                "rounded-xn-md border p-3 text-left transition-colors duration-xn ease-xn",
                tone === t
                  ? "border-xn-ink bg-xn-surface-alt"
                  : "border-xn-border hover:border-xn-border-strong hover:bg-xn-surface-alt",
              ].join(" ")}
            >
              <span
                className={[
                  "flex items-center gap-1.5 font-mono text-micro uppercase tracking-widest",
                  tone === t ? "text-xn-ink" : "text-xn-ink-soft",
                ].join(" ")}
              >
                {t}
                {(!toneReady.has(t) || toneGenerating === t) && (
                  <Pending generating={toneGenerating === t} />
                )}
              </span>
              <span className="mt-2 line-clamp-2 text-xs leading-relaxed text-xn-ink-muted">
                {openingFor(platform, t)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-10">{children}</div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// C · Bare
// ─────────────────────────────────────────────────────────────
// The argument: everything A says in prose, the preview says better by
// existing. A segmented switch is self-evident, so the heading, the
// explanation and the caption are all deleted and the preview starts
// immediately.
//
// The risk is that a first-time user meets four words with no frame around
// them. Worth seeing before deciding whether that risk is real.

function Bare({ tone, setTone, toneReady, toneGenerating, children }: DirectionProps) {
  return (
    <>
      <div className="flex justify-center pb-2">
        <div
          className="inline-flex rounded-xn-pill border border-xn-border bg-xn-surface p-1"
          role="group"
          aria-label="Description tone"
        >
          {TONES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              aria-pressed={tone === t}
              aria-busy={toneGenerating === t || undefined}
              className={[
                "inline-flex items-center gap-1.5 rounded-xn-pill px-3.5 py-1.5 text-xs capitalize transition-colors duration-xn ease-xn",
                tone === t
                  ? "bg-xn-ink text-xn-bg"
                  : "text-xn-ink-soft hover:text-xn-ink",
              ].join(" ")}
            >
              {t}
              {(!toneReady.has(t) || toneGenerating === t) && (
                <Pending generating={toneGenerating === t} />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6">{children}</div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// D · Rail
// ─────────────────────────────────────────────────────────────
// The argument: picking a tone is closer to choosing a photo than to setting
// a preference, and a filmstrip beside the thing makes switching feel like
// browsing rather than committing.
//
// The rail sits BELOW the preview under `xl`, not beside it. A 240px rail
// against a preview that is already sharing the row with the app sidebar
// leaves the mock too narrow to judge, which is the one thing this route
// must not do.

function Rail({ tone, setTone, platform, toneReady, toneGenerating, children }: DirectionProps) {
  return (
    <>
      {/* Same bar and same chip as E, so the two can be compared on the one
          thing that actually differs between them — whether the options live
          in the bar or in a rail beside the preview. */}
      {/* Same centred bar as E, carrying identity only — the tone options
          are this direction's whole argument and they live in the rail. */}
      <div className="sticky -top-6 z-30 -mx-6 bg-xn-bg px-6 pb-3 pt-4">
        <div className="mx-auto flex w-full max-w-[720px] items-center rounded-xn-pill border border-xn-border bg-xn-surface px-5 py-2.5 shadow-xn">
          <Identity platform={platform} />
        </div>
      </div>

      <div className="grid gap-8 pt-8 xl:grid-cols-[220px_minmax(0,1fr)]">
        <div className="order-2 xl:order-1">
          <p className="font-mono text-micro uppercase tracking-widest text-xn-ink-soft">
            Tone
          </p>

          <div
            className="mt-3 flex flex-col border-l border-xn-border"
            role="group"
            aria-label="Description tone"
          >
            {TONES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTone(t)}
                aria-pressed={tone === t}
                className={[
                  "-ml-px border-l-2 py-3 pl-4 pr-2 text-left transition-colors duration-xn ease-xn",
                  tone === t
                    ? "border-xn-ink"
                    : "border-transparent hover:border-xn-border-strong",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex items-center gap-1.5 text-sm capitalize",
                    tone === t ? "font-semibold text-xn-ink" : "text-xn-ink-muted",
                  ].join(" ")}
                >
                  {t}
                  {(!toneReady.has(t) || toneGenerating === t) && (
                    <Pending generating={toneGenerating === t} />
                  )}
                </span>
                <span className="mt-1 line-clamp-2 text-xs leading-snug text-xn-ink-soft">
                  {TONE_NOTE[t]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="order-1 min-w-0 xl:order-2">{children}</div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// E · Bar  —  Labelled × Bare, in the product's own furniture
// ─────────────────────────────────────────────────────────────
// What each parent contributed, and what got dropped:
//
//   from LABELLED — the identity and the caption. A surface should say what
//     it is, and the caption is the one thing a switch cannot say for
//     itself: what the tone is FOR. Its heading and paragraph are gone;
//     the chip says "Video description" more compactly than an <h1> and a
//     line of prose did.
//
//   from BARE — the switch, and the refusal to explain what the preview
//     already demonstrates. Four words in a segmented control, no more.
//
// The identity is the CHIP the output surfaces already use, in social's own
// format colour, inside the pinned bar those surfaces already use. That is
// the difference between a page that matches the product and a page that
// merely does not clash with it.

function Bar({ tone, setTone, platform, toneReady, toneGenerating, children }: DirectionProps) {
  return (
    <>
      {/* Both offsets are load-bearing and copied deliberately from the
          output specimens: `-mx-6` against the container's `px-6` lets the
          bar's background span the full column, and `-top-6` cancels the
          shell's own `py-6` so the bar lands flush when it pins rather than
          24px low. The page container carries the matching `-mt-6`; §13
          records what happens when only one of the pair is applied. */}
      {/* ── The BAR is centred, not its contents ──
          The difference matters and the first version got it wrong. A
          full-width rule with centred contents is still a full-width rule:
          it reads as a page header, and the centring only shows up as text
          floating in a wide empty band.

          This is a self-contained bar that takes the width its contents
          need and sits centred in the column — a raised surface with its own
          edge, which is why it can carry a brand colour without that colour
          leaking onto the page ground.

          Inside it, the layout is ordinary: identity left, switch right,
          separated by a rule. Nothing is centred within the bar, because
          there is no longer any slack for centring to act on.

          The outer element keeps the sticky background so content scrolling
          underneath is masked rather than showing through the gap beside the
          bar. */}
      <div className="sticky -top-6 z-30 -mx-6 bg-xn-bg px-6 pb-3 pt-4">
        {/* Identity left, switch right, the full width of the video card
            below — so the bar, the card and the caption share three edges
            rather than each finding its own.

            The paddings are measured, not picked. At the card's 720 the two
            groups need 638 of 680 and sit on one row comfortably. In a
            narrower column — the app shell takes a fixed sidebar, so the
            content column is regularly ~656 — the same contents came to 638
            against 614 and wrapped, which with `justify-between` drops the
            switch onto a second row aligned left and looks like a mistake.
            Trimming the bar's own padding and the switch's buttons buys the
            24px back without touching the type size. */}
        <div className="mx-auto flex w-full max-w-[720px] flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xn-pill border border-xn-border bg-xn-surface px-4 py-2.5 shadow-xn">
          <Identity platform={platform} />
          <ToneSwitch tone={tone} setTone={setTone} ready={toneReady} generating={toneGenerating} />
        </div>
      </div>

      {/* ── The caption sits UNDER the bar ──
          Outside the sticky element on purpose: inside, it would pin too and
          the bar would grow a second row that follows you down the page.

          It is a plain block. The previous version made this `<p>` a flex
          container with a reserved height purely to centre one line of text,
          which rendered as a small boxed region that read like a scroll area
          — a centring technique that drew attention to itself instead of
          doing its job quietly. `text-center` needs no flex.

          It takes the SAME 720 as the bar and the video card, so all three
          edges line up. A caption on its own narrower measure was the thing
          making the group look unaligned.

          The height floor is kept and resized for the larger type: two lines
          of `text-sm` at `leading-relaxed` is 45.5px, so 48 clears it.
          Measured earlier: all four notes are two lines at every width
          tested, so this reserves against future copy rather than fixing an
          observed jump. */}
      <p className="mx-auto mt-4 min-h-[3rem] max-w-[720px] text-center text-sm leading-relaxed text-xn-ink-muted">
        {TONE_NOTE[tone]}
      </p>

      <div className="pt-2">{children}</div>
    </>
  );
}

/** Every direction, by id. */
export const DIRECTION_VIEWS: Record<DirectionId, (p: DirectionProps) => ReactNode> = {
  bar: Bar,
  labelled: Labelled,
  specimens: Specimens,
  bare: Bare,
  rail: Rail,
};
