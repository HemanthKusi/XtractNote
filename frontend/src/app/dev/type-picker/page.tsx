"use client";

// ─────────────────────────────────────────────────────────────
// Content-type picker specimens — TEMPORARY
// ─────────────────────────────────────────────────────────────
// http://localhost:3000/dev/type-picker
//
// Settled and not being re-argued: tall tiles, four columns, the icon at
// xl zooming on a spring curve, selection tinting the tile in the
// format's own colour, a 960px column, and the platform hint living as a
// pill on the icon row rather than in the prose.
//
// Open here: what that pill looks like. It is to carry the platform's
// brand mark and name in brand colour, and it exists only once a
// platform has been chosen — there is no prompt state, because the
// platform options appear directly beneath the grid the moment social is
// selected, which is where that step is made.
//
// ⚠ A pill with a name on it is TEXT, and text needs 4.5:1 where an icon
// needs 3:1. That is the same reason the platform tooltips use deeper
// variants for two brands. YouTube's #FF0000 carries white at 4.00 and
// fails; Instagram's gradient reaches 3.89 at its red end and fails.
// Both use their deeper variant here for exactly that reason — the tile
// glyph values would not have been safe.
//
// Nothing here is shipped and no real component is modified. Delete this
// route once the pill treatment is chosen.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";

import { ContentTypePicker } from "@/components/create/content-type-picker";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { useTheme } from "@/components/shared/theme-provider";
import {
  contentTypeColors,
  THEMES,
  type ContentType,
  type ThemeName,
} from "@/lib/constants/theme";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/content/types";

const DESCRIPTIONS: Record<ContentType, string> = {
  summary: "Key points, quick read",
  blog: "Polished article with headings",
  notes: "Structured study notes",
  research: "Abstract, findings, citations",
  flashcards: "Q&A cards for review",
  quiz: "Practice questions",
  social: "Posts for X, LinkedIn & more",
};

const TYPE_ORDER: readonly ContentType[] = [
  "summary",
  "blog",
  "notes",
  "research",
  "flashcards",
  "quiz",
  "social",
];

// The shipped labels read "LinkedIn post", "X / Thread" and so on — the
// format, not the brand. A pill showing a brand mark wants the brand's
// own name beside it, so these are the wordmarks rather than the labels.
const BRAND_NAME: Record<SocialPlatform, string> = {
  linkedin: "LinkedIn",
  "x-thread": "X",
  instagram: "Instagram",
  "youtube-description": "YouTube",
  newsletter: "Newsletter",
};

// ── Brand skins ─────────────────────────────────────────────
// `solid` is the ground when the pill is filled; `ink` is whichever of
// white or dark actually holds against it, measured. `tone` is the
// brand colour used as *text* on a neutral ground, which needs to be the
// deeper variant wherever the true brand colour is too light to read.

interface BrandSkin {
  solid: string;
  ink: string;
  tone: string;
}

const BRAND: Record<SocialPlatform, BrandSkin> = {
  // white on #0A66C2 is 5.69:1 — safe for text as-is.
  linkedin: { solid: "#0A66C2", ink: "#FFFFFF", tone: "#0A66C2" },
  // X's brand is monochrome, so it rides the theme tokens and inverts.
  "x-thread": { solid: "var(--xn-ink)", ink: "var(--xn-bg)", tone: "var(--xn-ink)" },
  // The gradient bottoms out at 3.89:1, so text takes the solid magenta.
  instagram: { solid: "#C13584", ink: "#FFFFFF", tone: "#C13584" },
  // #FF0000 carries white at only 4.00:1; the deeper red reaches 5.89:1.
  "youtube-description": { solid: "#CC0000", ink: "#FFFFFF", tone: "#CC0000" },
  // Envelope yellow is 1.99:1 against white and fails badly; ink is 9.14:1.
  // As *text* on a neutral ground it needs to go darker still.
  newsletter: { solid: "#E3B04B", ink: "#13161A", tone: "#8A6100" },
};

function PlatformMark({ platform }: { platform: SocialPlatform }) {
  switch (platform) {
    case "linkedin":
      return (
        <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden className="h-full w-full">
          <path d="M8.268 28H2.463V9.306h5.805zM5.362 6.756C3.506 6.756 2 5.218 2 3.362a3.362 3.362 0 0 1 6.724 0c0 1.856-1.506 3.394-3.362 3.394M29.994 28h-5.792v-9.1c0-2.169-.044-4.95-3.018-4.95c-3.018 0-3.481 2.356-3.481 4.794V28h-5.799V9.306h5.567v2.55h.081c.775-1.469 2.668-3.019 5.492-3.019c5.875 0 6.955 3.869 6.955 8.894V28z" />
        </svg>
      );
    case "x-thread":
      return (
        <svg viewBox="0 0 512 512" fill="currentColor" aria-hidden className="h-full w-full">
          <path d="M389.2 48h70.6L305.6 224.2L487 464H345L233.7 318.6L106.5 464H35.8l164.9-188.5L26.8 48h145.6l100.5 132.9zm-24.8 373.8h39.1L151.1 88h-42z" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden className="h-full w-full">
          <path d="M128 23.064c34.177 0 38.225.13 51.722.745c12.48.57 19.258 2.655 23.769 4.408c5.974 2.322 10.238 5.096 14.717 9.575s7.253 8.743 9.575 14.717c1.753 4.511 3.838 11.289 4.408 23.768c.615 13.498.745 17.546.745 51.723s-.13 38.226-.745 51.723c-.57 12.48-2.655 19.257-4.408 23.768c-2.322 5.974-5.096 10.239-9.575 14.718s-8.743 7.253-14.717 9.574c-4.511 1.753-11.289 3.839-23.769 4.408c-13.495.616-17.543.746-51.722.746s-38.228-.13-51.723-.746c-12.48-.57-19.257-2.655-23.768-4.408c-5.974-2.321-10.239-5.095-14.718-9.574c-4.479-4.48-7.253-8.744-9.574-14.718c-1.753-4.51-3.839-11.288-4.408-23.768c-.616-13.497-.746-17.545-.746-51.723s.13-38.225.746-51.722c.57-12.48 2.655-19.258 4.408-23.769c2.321-5.974 5.095-10.238 9.574-14.717c4.48-4.48 8.744-7.253 14.718-9.575c4.51-1.753 11.288-3.838 23.768-4.408c13.497-.615 17.545-.745 51.723-.745M128 0C93.237 0 88.878.147 75.226.77c-13.625.622-22.93 2.786-31.071 5.95c-8.418 3.271-15.556 7.648-22.672 14.764S9.991 35.738 6.72 44.155C3.555 52.297 1.392 61.602.77 75.226C.147 88.878 0 93.237 0 128s.147 39.122.77 52.774c.622 13.625 2.785 22.93 5.95 31.071c3.27 8.417 7.647 15.556 14.763 22.672s14.254 11.492 22.672 14.763c8.142 3.165 17.446 5.328 31.07 5.95c13.653.623 18.012.77 52.775.77s39.122-.147 52.774-.77c13.624-.622 22.929-2.785 31.07-5.95c8.418-3.27 15.556-7.647 22.672-14.763s11.493-14.254 14.764-22.672c3.164-8.142 5.328-17.446 5.95-31.07c.623-13.653.77-18.012.77-52.775s-.147-39.122-.77-52.774c-.622-13.624-2.786-22.929-5.95-31.07c-3.271-8.418-7.648-15.556-14.764-22.672S220.262 9.99 211.845 6.72c-8.142-3.164-17.447-5.328-31.071-5.95C167.122.147 162.763 0 128 0m0 62.27c-36.302 0-65.73 29.43-65.73 65.73s29.428 65.73 65.73 65.73c36.301 0 65.73-29.428 65.73-65.73c0-36.301-29.429-65.73-65.73-65.73m0 108.397c-23.564 0-42.667-19.103-42.667-42.667S104.436 85.333 128 85.333s42.667 19.103 42.667 42.667s-19.103 42.667-42.667 42.667m83.686-110.994c0 8.484-6.876 15.36-15.36 15.36s-15.36-6.876-15.36-15.36s6.877-15.36 15.36-15.36s15.36 6.877 15.36 15.36" />
        </svg>
      );
    case "youtube-description":
      return (
        <svg viewBox="0 0 256 256" fill="none" aria-hidden className="h-full w-full">
          <g transform="translate(0 38)">
            <path
              fill="currentColor"
              d="M250.346 28.075A32.18 32.18 0 0 0 227.69 5.418C207.824 0 127.87 0 127.87 0S47.912.164 28.046 5.582A32.18 32.18 0 0 0 5.39 28.24c-6.009 35.298-8.34 89.084.165 122.97a32.18 32.18 0 0 0 22.656 22.657c19.866 5.418 99.822 5.418 99.822 5.418s79.955 0 99.82-5.418a32.18 32.18 0 0 0 22.657-22.657c6.338-35.348 8.291-89.1-.164-123.134"
            />
            <path fill="var(--xn-yt-knock, transparent)" d="m102.421 128.06l66.328-38.418l-66.328-38.418z" />
          </g>
        </svg>
      );
    case "newsletter":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-full w-full">
          <rect x="2.4" y="4.6" width="19.2" height="14.8" rx="2.6" stroke="currentColor" strokeWidth="2" />
          <path d="m3.6 6.9 8.4 5.9 8.4-5.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

// ── Pill treatments ─────────────────────────────────────────

type PillVariant = "solid" | "tint" | "outline" | "mono";

const PILLS: Record<PillVariant, { label: string; note: string }> = {
  solid: {
    label: "1 · Solid brand",
    note: "The brand ground, mark and name in the colour that measured safe against it. Loudest, and unmistakably the platform — but it puts a fully saturated non-format colour permanently inside the format grid.",
  },
  tint: {
    label: "2 · Tinted brand",
    note: "The brand colour at low alpha behind mark and name in the brand's own tone. Reads as the platform without competing with the seven format colours for attention.",
  },
  outline: {
    label: "3 · Outlined brand",
    note: "Surface ground, brand border, brand mark and name. The quietest way to still be the brand's colour.",
  },
  mono: {
    label: "4 · Monochrome",
    note: "The mark and name in ink, no brand colour at all. Keeps the locked rule intact — the seven format colours stay the only saturated things on screen — at the cost of the brand recognition you asked for.",
  },
};

const PILL_ORDER: readonly PillVariant[] = ["solid", "tint", "outline", "mono"];

function BrandPill({ platform, variant }: { platform: SocialPlatform; variant: PillVariant }) {
  const skin = BRAND[platform];
  const isYouTube = platform === "youtube-description";

  const style: React.CSSProperties =
    variant === "solid"
      ? { backgroundColor: skin.solid, color: skin.ink }
      : variant === "tint"
        ? {
            backgroundColor: `color-mix(in srgb, ${skin.tone} 14%, transparent)`,
            color: skin.tone,
          }
        : variant === "outline"
          ? {
              backgroundColor: "var(--xn-surface)",
              color: skin.tone,
              border: `1px solid color-mix(in srgb, ${skin.tone} 55%, transparent)`,
            }
          : { backgroundColor: "var(--xn-surface-alt)", color: "var(--xn-ink-muted)" };

  // YouTube's triangle is knocked out of its body, so it has to take
  // whatever sits behind the mark rather than a colour of its own.
  const knock =
    variant === "solid" ? skin.solid : variant === "outline" ? "var(--xn-surface)" : "var(--xn-bg)";

  return (
    <span
      className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xn-pill px-2 py-1 text-[11px] font-semibold leading-none"
      style={{ ...style, ...(isYouTube ? ({ "--xn-yt-knock": knock } as React.CSSProperties) : {}) }}
    >
      <span className="inline-block h-3 w-3 shrink-0">
        <PlatformMark platform={platform} />
      </span>
      {BRAND_NAME[platform]}
    </span>
  );
}

// ── A tile ──────────────────────────────────────────────────

function TypeTile({
  type,
  selected,
  onSelect,
  pill,
  platform,
}: {
  type: ContentType;
  selected: boolean;
  onSelect: () => void;
  pill: PillVariant;
  platform: SocialPlatform | null;
}) {
  const meta = contentTypeColors[type];
  const showPill = type === "social" && platform !== null;

  // A native button rather than a div with role="button": real focus,
  // real keyboard semantics, no hand-rolled Enter/Space handling.
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        "group flex flex-col items-start gap-3 rounded-xn-lg border p-4 text-left",
        "transition-colors duration-xn ease-xn",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xn-ink",
        selected ? "" : "border-xn-border bg-xn-surface hover:border-xn-border-strong",
      ].join(" ")}
      style={selected ? { backgroundColor: meta.bg, borderColor: meta.border } : undefined}
    >
      <span className="flex w-full items-center gap-2">
        <span className="inline-block origin-center transform-gpu transition-transform duration-xn ease-xn group-hover:scale-[1.22]">
          <ContentTypeIcon type={type} size="xl" withBackground />
        </span>
        {showPill && platform && <BrandPill platform={platform} variant={pill} />}
      </span>

      <span className="block">
        <span
          className="block text-ui font-semibold"
          style={{ color: selected ? meta.color : "var(--xn-ink)" }}
        >
          {meta.label}
        </span>
        <span className="mt-1 block text-xs leading-[1.45] text-xn-ink-muted">
          {DESCRIPTIONS[type]}
        </span>
      </span>
    </button>
  );
}

// ── Page chrome ─────────────────────────────────────────────

function Control<T extends string>({
  legend,
  options,
  value,
  onChange,
  labelFor,
}: {
  legend: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  labelFor: (option: T) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-[88px] shrink-0 text-sm text-xn-ink-soft">{legend}</span>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={[
            "rounded-xn-pill border px-3 py-1 text-xs font-medium transition-colors duration-xn ease-xn",
            value === option
              ? "border-xn-ink bg-xn-ink text-xn-bg"
              : "border-xn-border bg-xn-surface text-xn-ink-muted hover:border-xn-border-strong",
          ].join(" ")}
        >
          {labelFor(option)}
        </button>
      ))}
    </div>
  );
}

const THEME_BUTTON_ACTIVE: Record<ThemeName, string> = {
  light:
    "[html[data-theme=light]_&]:border-xn-ink [html[data-theme=light]_&]:bg-xn-ink [html[data-theme=light]_&]:text-xn-bg [html[data-theme=light]_&]:shadow-xn",
  dark:
    "[html[data-theme=dark]_&]:border-xn-ink [html[data-theme=dark]_&]:bg-xn-ink [html[data-theme=dark]_&]:text-xn-bg [html[data-theme=dark]_&]:shadow-xn",
};

const PLATFORM_IDS = SOCIAL_PLATFORMS.map((p) => p.id);

// Peak values computed by sampling each curve: at a 0.22 delta on a 40px
// icon, "gentle" overshoots by 0.18px and "pronounced" by 0.86px, which
// is why they are indistinguishable at the real setting.
const EASES = [
  {
    key: "a",
    short: "A · Fallback",
    note: "cubic-bezier(.4,0,.2,1). What has been on screen all along. No overshoot.",
    ease: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  {
    key: "b",
    short: "B · Ease-out token",
    note: "The project's own --xn-ease-out. Decelerates harder, still no overshoot.",
    ease: "var(--xn-ease-out)",
  },
  {
    key: "c",
    short: "C · Gentle",
    note: "Overshoots 2% of the travel — 0.18px at the real setting.",
    ease: "cubic-bezier(0.2, 1.25, 0.35, 1)",
  },
  {
    key: "d",
    short: "D · Pronounced",
    note: "Overshoots 10% of the travel — 0.86px at the real setting.",
    ease: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
] as const;

export default function TypePickerSpecimensPage() {
  const { setTheme } = useTheme();
  const [selected, setSelected] = useState<ContentType>("social");
  const [platform, setPlatform] = useState<SocialPlatform>("linkedin");
  const [pill, setPill] = useState<PillVariant>("solid");
  const [zoomMs, setZoomMs] = useState<"200" | "320" | "450">("200");
  const [zoomScale, setZoomScale] = useState<"1.22" | "1.35" | "1.6">("1.22");

  return (
    <div className="flex min-h-screen bg-xn-bg">
      <aside className="hidden w-[232px] shrink-0 border-r border-xn-border bg-xn-surface lg:block">
        <p className="p-6 font-mono text-xs text-xn-ink-faint">
          232px sidebar
          <br />
          (mock — real shell width)
        </p>
      </aside>

      <div className="min-w-0 flex-1 px-8 py-14">
        <header className="pb-8">
          <p className="eyebrow mb-3">Specimens · not shipped</p>
          <h1 className="text-h3 font-semibold text-xn-ink">The content-type picker</h1>
          <p className="mt-3 max-w-[64ch] text-body text-xn-ink-muted">
            Tall tiles, four columns, 960px, pill on the icon row — all settled. What
            is open is the pill&apos;s treatment now that it carries a brand mark and
            wordmark. It appears only once a platform is chosen; there is no prompt
            state, because the platform options open beneath the grid the moment
            social is selected.
          </p>

          <div className="mt-6 inline-flex gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={[
                  "rounded-xn-pill border px-4 py-2 text-ui font-medium",
                  "border-xn-border-strong bg-xn-surface text-xn-ink-muted shadow-xn-1",
                  "transition-[box-shadow,transform,background-color,color,border-color] duration-xn ease-xn",
                  "hover:-translate-y-0.5 hover:shadow-xn-hover",
                  "active:translate-y-px active:duration-xn-fast active:shadow-xn-1",
                  THEME_BUTTON_ACTIVE[t],
                ].join(" ")}
              >
                {t === "dark" ? "Dark" : "Light"}
              </button>
            ))}
          </div>
        </header>

        <section className="border-t border-xn-border py-8">
          <div className="flex flex-col gap-3">
            <Control
              legend="Pill"
              options={PILL_ORDER}
              value={pill}
              onChange={setPill}
              labelFor={(p) => PILLS[p].label.split(" · ")[1]}
            />
            <Control
              legend="Platform"
              options={PLATFORM_IDS}
              value={platform}
              onChange={setPlatform}
              labelFor={(p) => BRAND_NAME[p]}
            />
          </div>
          <p className="mt-4 max-w-[68ch] text-sm text-xn-ink-soft">{PILLS[pill].note}</p>
        </section>

        {/* The SHIPPED component, rendered here only because /create is
            behind auth and cannot be opened in a bare browser. This is the
            thing that actually ships; the benches below are the specimens
            it was decided from. */}
        <section className="border-t border-xn-border py-10">
          <p className="eyebrow mb-4">Shipped · components/create/content-type-picker.tsx</p>
          <div className="max-w-[960px]" data-shipped>
            <ContentTypePicker
              selected={selected === "social" ? "social" : null}
              onSelect={(t) => setSelected(t)}
              selectedPlatform={platform}
            />
          </div>
        </section>

        <section className="border-t border-xn-border py-10">
          <p className="eyebrow mb-4">Specimen · 960px, four columns</p>
          <div className="grid max-w-[960px] grid-cols-2 gap-3 sm:grid-cols-4">
            {TYPE_ORDER.map((type) => (
              <TypeTile
                key={type}
                type={type}
                selected={selected === type}
                onSelect={() => setSelected(type)}
                pill={pill}
                platform={platform}
              />
            ))}
          </div>
        </section>

        {/* Every brand in every treatment. Five marks with five different
            contrast problems is not something one example will show. */}
        <section className="border-t border-xn-border py-10">
          <h2 className="text-h4 font-semibold text-xn-ink">Every brand, every treatment</h2>
          <p className="mt-1.5 max-w-[64ch] text-ui text-xn-ink-muted">
            X inverts with the theme because its brand is monochrome. YouTube and
            Instagram use deeper variants than their true brand colours, because a
            wordmark is text and text needs 4.5:1. Switch themes and check all four.
          </p>
          <div className="mt-6 flex flex-col gap-6">
            {PILL_ORDER.map((variant) => (
              <div key={variant}>
                <p className="eyebrow mb-2">{PILLS[variant].label}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {PLATFORM_IDS.map((id) => (
                    <BrandPill key={id} platform={id} variant={variant} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ⚠ `ease-xn` is used in three files and defined in none.
            Tailwind's timing map has only `xn` and `xn-in-out`, so the
            class generates nothing and the browser falls back to the
            default ease-in-out. Every judgement made about "the spring
            overshoot" so far was made looking at that fallback.

            These are inline styles, so they render the real curves.

            Why they look identical at the default settings: overshoot is
            proportional to the scale DELTA, and the delta is only 0.22.
            Computed peak on a 40px icon — gentle overshoots by 0.18px,
            pronounced by 0.86px. Sub-pixel. The dials are here because
            a bigger delta is what makes overshoot visible at all, and a
            longer duration is what gives the eye time to catch the
            settle-back. */}
        <section className="border-t border-xn-border py-10">
          <h2 className="text-h4 font-semibold text-xn-ink">The icon zoom, on real tiles</h2>
          <p className="mt-1.5 max-w-[66ch] text-ui text-xn-ink-muted">
            Four tiles, four curves, otherwise identical. At 1.22 and 200ms the
            overshoot is under a pixel, so turn the scale and the duration up until
            you can see a difference — then decide whether the difference is one you
            want at the real setting.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Control
              legend="Duration"
              options={["200", "320", "450"] as const}
              value={zoomMs}
              onChange={setZoomMs}
              labelFor={(v) => `${v}ms`}
            />
            <Control
              legend="Scale"
              options={["1.22", "1.35", "1.6"] as const}
              value={zoomScale}
              onChange={setZoomScale}
              labelFor={(v) => `×${v}`}
            />
          </div>

          <div className="mt-6 grid max-w-[960px] grid-cols-2 gap-3 sm:grid-cols-4">
            {EASES.map((c) => (
              <button
                key={c.key}
                type="button"
                className="group flex flex-col items-start gap-3 rounded-xn-lg border border-xn-border bg-xn-surface p-4 text-left transition-colors duration-xn ease-xn hover:border-xn-border-strong"
              >
                <span
                  className="inline-block origin-center transform-gpu transition-transform group-hover:scale-[var(--zoom)]"
                  style={
                    {
                      transitionDuration: `${zoomMs}ms`,
                      transitionTimingFunction: c.ease,
                      "--zoom": zoomScale,
                    } as React.CSSProperties
                  }
                  data-ease={c.key}
                >
                  <ContentTypeIcon type="research" size="xl" withBackground />
                </span>
                <span className="block">
                  <span className="block text-ui font-semibold text-xn-ink">{c.short}</span>
                  <span className="mt-1 block text-xs leading-[1.45] text-xn-ink-muted">
                    {c.note}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <footer className="border-t border-xn-border py-10">
          <p className="text-sm text-xn-ink-soft">
            Delete this route once the pill treatment is chosen.
          </p>
        </footer>
      </div>
    </div>
  );
}
