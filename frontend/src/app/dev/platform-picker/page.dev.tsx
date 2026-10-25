"use client";

// ─────────────────────────────────────────────────────────────
// Social platform picker specimens — TEMPORARY
// ─────────────────────────────────────────────────────────────
// http://localhost:3000/dev/platform-picker
//
// This is the design already decided in the card pass, rebuilt from that
// specimen rather than reinvented: a wrapping row of platform marks,
// monochrome at rest, the brand colour sliding up from below on hover,
// and the platform's name appearing above in a tooltip carrying the same
// brand colour.
//
// It takes its NATURAL width. It is not a grid and it is not stretched to
// the content column — this step exists for one content type out of
// seven, and forcing it to the same 960px as everything else makes the
// page read as a stack of identical bands.
//
// Two things are open and dialable:
//   · size of the mark
//   · shape — the decided specimen used a rounded square (rounded-xn-md);
//     circle is the alternative
//
// What is NOT open: monochrome at rest, one brand colour at a time, and
// glyph and tooltip colours measured rather than chosen.
//
// ⚠ Implementation notes carried over from the decided specimen, both of
// which matter:
//   · Per-platform values ride on CSS custom properties, because a hover
//     colour cannot come from an inline style and a class name built by
//     concatenation never reaches the JIT scanner.
//   · The fill SLIDES up on translate-y rather than growing on scaleY.
//     Height is a layout property, and Instagram's gradient stretched by
//     scaleY would smear.
//
// Nothing here is shipped and no real component is modified.
// ─────────────────────────────────────────────────────────────

import { useState, type CSSProperties } from "react";

import { SocialPlatformPicker } from "@/components/create/social-platform-picker";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { useTheme } from "@/components/shared/theme-provider";
import {
  contentTypeColors,
  THEMES,
  type ContentType,
  type ThemeName,
} from "@/lib/constants/theme";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/content/types";

// ── Brand skins ─────────────────────────────────────────────
// `glyph` is measured, not chosen — whichever of white or ink holds
// against that fill:
//   LinkedIn   #0A66C2 → white 5.69:1
//   YouTube    #FF0000 → white 4.00:1
//   Instagram  gradient → white, 3.89:1 at its red end
//   Newsletter #E3B04B → white is 1.99:1 and fails; ink is 9.14:1
// X's brand IS monochrome, so it rides the theme tokens and inverts.
//
// `tip` exists because a tooltip carries TEXT at 4.5:1 where a mark
// carries an icon at 3:1. Two brands cannot use their true colour there:
//   YouTube   #FF0000 + white = 4.00 → #CC0000 = 5.89
//   Instagram gradient's red end = 3.89 → solid #C13584 = 5.11

interface PlatformSkin {
  fill: string;
  glyph: string;
  tip?: string;
  knock?: string;
}

const PLATFORM_SKIN: Record<SocialPlatform, PlatformSkin> = {
  linkedin: { fill: "#0A66C2", glyph: "#FFFFFF" },
  "x-thread": { fill: "var(--xn-ink)", glyph: "var(--xn-bg)" },
  instagram: {
    fill: "linear-gradient(45deg, #405DE6, #5B51DB, #B33AB4, #C135B4, #E1306C, #FD1F1F)",
    glyph: "#FFFFFF",
    tip: "#C13584",
  },
  "youtube-description": { fill: "#FF0000", glyph: "#FFFFFF", tip: "#CC0000", knock: "#FF0000" },
  newsletter: { fill: "#E3B04B", glyph: "#13161A" },
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
            <path fill="var(--xn-yt-knock, var(--xn-surface))" d="m102.421 128.06l66.328-38.418l-66.328-38.418z" />
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

// ── Dials ───────────────────────────────────────────────────
// Classes written out in full: Tailwind scans source text, so a size
// built by concatenation would never be generated.

type SizeName = "sm" | "md" | "lg" | "xl";

const SIZES: Record<SizeName, { label: string; box: string; glyph: string }> = {
  sm: { label: "40px", box: "h-10 w-10", glyph: "h-5 w-5" },
  md: { label: "48px", box: "h-12 w-12", glyph: "h-6 w-6" },
  lg: { label: "56px", box: "h-14 w-14", glyph: "h-7 w-7" },
  xl: { label: "64px", box: "h-16 w-16", glyph: "h-8 w-8" },
};

const SIZE_ORDER: readonly SizeName[] = ["sm", "md", "lg", "xl"];

type GapName = "g10" | "g12" | "g16" | "g20";

const GAPS: Record<GapName, { label: string; className: string }> = {
  g10: { label: "10px", className: "gap-2.5" },
  g12: { label: "12px", className: "gap-3" },
  g16: { label: "16px", className: "gap-4" },
  g20: { label: "20px", className: "gap-5" },
};

const GAP_ORDER: readonly GapName[] = ["g10", "g12", "g16", "g20"];

// The fill's travel time. `duration-xn` is 200ms and is what the card
// pass used; the rest are here because the motion policy now treats
// duration as a default rather than a cap, so a slower rise is allowed
// if it reads better on a 64px mark.
type SpeedName = "s200" | "s320" | "s450" | "s600";

const SPEEDS: Record<SpeedName, { label: string; ms: number }> = {
  s200: { label: "200ms", ms: 200 },
  s320: { label: "320ms", ms: 320 },
  s450: { label: "450ms", ms: 450 },
  s600: { label: "600ms", ms: 600 },
};

const SPEED_ORDER: readonly SpeedName[] = ["s200", "s320", "s450", "s600"];

// ── Tooltip treatment ───────────────────────────────────────
// Two separate things can make a tooltip read weakly against a vivid
// circle, and they are worth dialling apart.
//
// 1. COLOUR. Two brands currently show a tooltip that is not the colour
//    their circle just turned. Measured:
//      YouTube  #FF0000 + white = 4.00, fails → #CC0000 + white = 5.89
//      Instagram gradient red end + white = 3.89, fails → #C13584 = 5.11
//    But #FF0000 carries INK at 4.54, which passes — so YouTube's tooltip
//    can match its circle exactly if the text goes dark instead of white.
//    Instagram cannot: ink is unusable at the gradient's violet end
//    (#405DE6), so there is no single text colour that works across it.
//
// 2. WEIGHT. Light text on a saturated ground optically thins — halation
//    makes the strokes look narrower than the same weight on a pale
//    ground. Bumping the weight is the ordinary fix and costs nothing.

type TipColour = "deeper" | "match" | "matchWhite";

const TIP_COLOURS: Record<TipColour, { label: string; note: string }> = {
  deeper: {
    label: "Deeper variant",
    note: "As decided. YouTube's tooltip is #CC0000 against a #FF0000 circle, Instagram's is solid #C13584 against a gradient — safest contrast, but the tooltip is visibly not the colour the circle just became.",
  },
  match: {
    label: "Match the circle",
    note: "YouTube's tooltip takes the true #FF0000 with dark text instead of white — 4.54:1, passing but with little margin. Instagram still cannot match: a gradient has no single text colour that survives both ends, so it keeps its solid variant.",
  },
  matchWhite: {
    label: "Match + white text",
    note: "True #FF0000 with white text. This is the combination that reads best and it FAILS contrast: 4.00:1 against the 4.5 a 12px label needs. Shown because it is worth seeing before it is ruled out — a deliberate exception, not an oversight, if it is chosen.",
  },
};

const TIP_COLOUR_ORDER: readonly TipColour[] = ["deeper", "match", "matchWhite"];

type TipWeight = "medium" | "semibold" | "bold";

const TIP_WEIGHTS: Record<TipWeight, { label: string; className: string }> = {
  medium: { label: "Medium", className: "font-medium" },
  semibold: { label: "Semibold", className: "font-semibold" },
  bold: { label: "Bold", className: "font-bold" },
};

const TIP_WEIGHT_ORDER: readonly TipWeight[] = ["medium", "semibold", "bold"];

/** The tooltip ground and text for a platform, under the chosen treatment. */
function tipStyle(platform: SocialPlatform, mode: TipColour) {
  const skin = PLATFORM_SKIN[platform];
  if (platform === "youtube-description") {
    if (mode === "match") return { ground: "#FF0000", text: "#13161A" };
    if (mode === "matchWhite") return { ground: "#FF0000", text: "#FFFFFF" };
  }
  return { ground: skin.tip ?? skin.fill, text: skin.glyph };
}

type ShapeName = "circle" | "squircle";

const SHAPES: Record<ShapeName, { label: string; className: string }> = {
  circle: { label: "Circle", className: "rounded-full" },
  squircle: { label: "Rounded square", className: "rounded-xn-md" },
};

const SHAPE_ORDER: readonly ShapeName[] = ["circle", "squircle"];

// ── The picker ──────────────────────────────────────────────

function PlatformPicker({
  selected,
  onSelect,
  size,
  shape,
  gap,
  speed,
  tipColour,
  tipWeight,
}: {
  selected: SocialPlatform | null;
  onSelect: (p: SocialPlatform) => void;
  size: SizeName;
  shape: ShapeName;
  gap: GapName;
  speed: SpeedName;
  tipColour: TipColour;
  tipWeight: TipWeight;
}) {
  const s = SIZES[size];
  // Duration has to be inline: a Tailwind class built by concatenation
  // would never reach the JIT scanner. The fill, the glyph and the
  // tooltip share it so the whole thing reads as one gesture.
  const timing = { transitionDuration: `${SPEEDS[speed].ms}ms` };

  return (
    // inline-flex, not flex: a block-level flex container would still span
    // its parent's full width even though the marks need a fraction of it,
    // which is the stretched-band feel this step is meant to avoid. This
    // hugs its content and lets the row wrap only when it must.
    //
    // pt-9 leaves room for the tooltip above the first row rather than
    // letting it clip.
    <ul className={`inline-flex max-w-full flex-wrap pt-9 ${GAPS[gap].className}`}>
      {SOCIAL_PLATFORMS.map((p) => {
        const on = selected === p.id;
        const skin = PLATFORM_SKIN[p.id];

        const tip = tipStyle(p.id, tipColour);
        const vars = {
          "--lit": skin.fill,
          "--glyph-lit": skin.glyph,
          "--tip": tip.ground,
          "--tip-ink": tip.text,
          ...(skin.knock && on ? { "--xn-yt-knock": skin.knock } : {}),
        } as CSSProperties;

        return (
          <li key={p.id} className="group relative" style={vars}>
            <span
              className={[
                "pointer-events-none absolute bottom-full left-1/2 z-20 mb-2",
                "-translate-x-1/2 translate-y-1 whitespace-nowrap",
                "rounded-xn-sm px-2.5 py-1.5",
                "bg-[color:var(--tip)] text-xs shadow-xn",
                TIP_WEIGHTS[tipWeight].className,
                "text-[color:var(--tip-ink)]",
                "opacity-0 transition-[opacity,transform] ease-xn",
                "group-hover:translate-y-0 group-hover:opacity-100",
              ].join(" ")}
              style={timing}
              aria-hidden
            >
              {p.label}
            </span>

            <button
              type="button"
              onClick={() => onSelect(p.id)}
              aria-pressed={on}
              aria-label={p.label}
              className={[
                "relative flex items-center justify-center overflow-hidden",
                s.box,
                SHAPES[shape].className,
                "border transition-colors duration-xn ease-xn",
                on ? "border-transparent" : "border-xn-border bg-xn-surface",
                "group-hover:[--xn-yt-knock:var(--lit)]",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xn-ink",
              ].join(" ")}
            >
              {/* Slides up rather than growing: height is a layout property,
                  and a gradient stretched by scaleY would smear. */}
              <span
                aria-hidden
                className={[
                  "absolute inset-0 transition-transform ease-xn",
                  on ? "translate-y-0" : "translate-y-full group-hover:translate-y-0",
                ].join(" ")}
                style={{ background: "var(--lit)", ...timing }}
              />
              <span
                className={[
                  "relative z-10 flex items-center justify-center",
                  s.glyph,
                  "transition-colors ease-xn",
                  on ? "text-[color:var(--glyph-lit)]" : "text-xn-ink-muted",
                  "group-hover:text-[color:var(--glyph-lit)]",
                ].join(" ")}
                style={timing}
              >
                <PlatformMark platform={p.id} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ── Context: the format grid it sits under ──────────────────

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
  "summary", "blog", "notes", "research", "flashcards", "quiz", "social",
];

function FormatGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {TYPE_ORDER.map((type) => {
        const meta = contentTypeColors[type];
        const on = type === "social";
        return (
          <button
            key={type}
            type="button"
            className={[
              "group flex flex-col items-start gap-3 rounded-xn-lg border p-4 text-left",
              "transition-colors duration-xn ease-xn",
              on ? "" : "border-xn-border bg-xn-surface hover:border-xn-border-strong",
            ].join(" ")}
            style={on ? { backgroundColor: meta.bg, borderColor: meta.border } : undefined}
          >
            <span className="inline-block origin-center transform-gpu transition-transform duration-xn ease-xn group-hover:scale-[1.35]">
              <ContentTypeIcon type={type} size="xl" withBackground />
            </span>
            <span className="block">
              <span
                className="block text-ui font-semibold"
                style={{ color: on ? meta.color : "var(--xn-ink)" }}
              >
                {meta.label}
              </span>
              <span className="mt-1 block text-xs leading-[1.45] text-xn-ink-muted">
                {DESCRIPTIONS[type]}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Page chrome ─────────────────────────────────────────────

function Control<T extends string>({
  legend, options, value, onChange, labelFor,
}: {
  legend: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  labelFor: (option: T) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-[70px] shrink-0 text-sm text-xn-ink-soft">{legend}</span>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={[
            "rounded-xn-pill border px-3 py-1 text-xs font-medium transition-colors duration-xn ease-xn",
            value === o
              ? "border-xn-ink bg-xn-ink text-xn-bg"
              : "border-xn-border bg-xn-surface text-xn-ink-muted hover:border-xn-border-strong",
          ].join(" ")}
        >
          {labelFor(o)}
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

export default function PlatformPickerSpecimensPage() {
  const { setTheme } = useTheme();
  const [selected, setSelected] = useState<SocialPlatform | null>("linkedin");
  const [size, setSize] = useState<SizeName>("xl");
  const [shape, setShape] = useState<ShapeName>("circle");
  const [gap, setGap] = useState<GapName>("g20");
  const [speed, setSpeed] = useState<SpeedName>("s320");
  // Opens on the option under evaluation, so rechecking it in different
  // light does not start with hunting for the dial.
  const [tipColour, setTipColour] = useState<TipColour>("matchWhite");
  const [tipWeight, setTipWeight] = useState<TipWeight>("semibold");

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
          <h1 className="text-h3 font-semibold text-xn-ink">The platform picker</h1>
          <p className="mt-3 max-w-[66ch] text-body text-xn-ink-muted">
            The shape decided in the card pass, rebuilt from that specimen. Marks sit
            monochrome until the cursor asks; then the brand slides up from below and
            the name appears above in the same colour. <strong>Hover them</strong> —
            most of this does not survive a screenshot.
          </p>
          <p className="mt-3 max-w-[66ch] text-body text-xn-ink-muted">
            It takes its natural width rather than the content column, because this
            step belongs to one format out of seven.
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

        {/* The SHIPPED component, rendered here only because /create is
            behind auth and cannot be opened in a bare browser. */}
        <section className="border-t border-xn-border py-10">
          <p className="eyebrow mb-4">Shipped · components/create/social-platform-picker.tsx</p>
          <div className="max-w-[960px]" data-shipped>
            <p className="mb-2 text-[13px] font-medium text-xn-ink">Choose a format</p>
            <FormatGrid />
            <div className="mt-5">
              <SocialPlatformPicker visible selected={selected} onSelect={setSelected} />
            </div>
          </div>
        </section>

        <section className="border-t border-xn-border py-10">
          <div className="mb-6 flex flex-col gap-3">
            <Control legend="Size" options={SIZE_ORDER} value={size} onChange={setSize}
              labelFor={(s) => SIZES[s].label} />
            <Control legend="Shape" options={SHAPE_ORDER} value={shape} onChange={setShape}
              labelFor={(s) => SHAPES[s].label} />
            <Control legend="Gap" options={GAP_ORDER} value={gap} onChange={setGap}
              labelFor={(g) => GAPS[g].label} />
            <Control legend="Fill" options={SPEED_ORDER} value={speed} onChange={setSpeed}
              labelFor={(s) => SPEEDS[s].label} />
            <Control legend="Tip colour" options={TIP_COLOUR_ORDER} value={tipColour}
              onChange={setTipColour} labelFor={(t) => TIP_COLOURS[t].label} />
            <Control legend="Tip weight" options={TIP_WEIGHT_ORDER} value={tipWeight}
              onChange={setTipWeight} labelFor={(t) => TIP_WEIGHTS[t].label} />
          </div>
          <p className="mb-6 max-w-[68ch] text-sm text-xn-ink-soft">
            200ms is what the card pass used and what you just saw. The slower steps
            are available because the motion policy now treats duration as a default
            rather than a cap — a 64px mark has further to travel than a 48px one,
            so the same number reads quicker on it.
          </p>

          <div className="max-w-[960px]" data-context>
            <p className="mb-2 text-[13px] font-medium text-xn-ink">Choose a format</p>
            <FormatGrid />

            <p className="mt-5 text-[13px] font-medium text-xn-ink">Which platform?</p>
            <div data-picker>
              <PlatformPicker selected={selected} onSelect={setSelected} size={size}
                shape={shape} gap={gap} speed={speed}
                tipColour={tipColour} tipWeight={tipWeight} />
            </div>
          </div>
        </section>

        {/* Every size at once, so the step can be judged against the grid
            above rather than against the last thing clicked. */}
        <section className="border-t border-xn-border py-10">
          <h2 className="text-h4 font-semibold text-xn-ink">Every size, current shape</h2>
          <p className="mt-1.5 max-w-[64ch] text-ui text-xn-ink-muted">
            Switch themes here too — X inverts on its own because its brand is
            monochrome, and the newsletter glyph goes dark because envelope yellow
            cannot carry white.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {SIZE_ORDER.map((s) => (
              <div key={s} data-size={s}>
                <p className="eyebrow">{SIZES[s].label}</p>
                <PlatformPicker selected={selected} onSelect={setSelected} size={s}
                  shape={shape} gap={gap} speed={speed}
                  tipColour={tipColour} tipWeight={tipWeight} />
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-xn-border py-10">
          <p className="text-sm text-xn-ink-soft">
            Delete this route once size and shape are chosen.
          </p>
        </footer>
      </div>
    </div>
  );
}
