"use client";

import type { CSSProperties } from "react";

import { PlatformMark } from "@/components/ui/platform-mark";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/content/types";

// ─────────────────────────────────────────────────────────────
// SocialPlatformPicker
//
// The second step of the social flow. Social is one content type with
// five prompt variants, so once "Social" is picked in the
// ContentTypePicker the user chooses which platform to write for. That
// choice travels with the generate request and is stored in the saved
// row's metadata.
//
// Controlled and stateless, like ContentTypePicker: the parent owns
// `selected` and receives changes via `onSelect`. Returns null when
// `visible` is false, so the parent can render it unconditionally — the
// show/hide rule lives with the component that owns it.
//
// The platform list and its copy come from SOCIAL_PLATFORMS
// (lib/content/types.ts); this component holds no content of its own.
//
// ── Why this is not five cards ──
// It used to be five Card rows with a dot standing in for a radio. That
// was the same rectangle the folder tiles, history rows and format tiles
// were all using for different data. A platform is a brand, and a brand
// is recognised by its mark, so the mark is the control.
//
// ── It keeps its own width ──
// This step exists for one content type out of seven. Stretching it to
// the content column the way every other block does would make the page
// read as a stack of identical bands, so the row is inline-flex and
// takes only the width its marks need. A block-level flex container
// would still span the full column even with the same contents.
//
// ── Monochrome until the cursor asks ──
// Nothing saturated is on screen until you hover, and then one platform
// at a time. That is what keeps faith with the rule that the seven
// content-format colours are the only standing colour in the product —
// a wall of brand colours would put a second, louder palette on a page
// whose whole colour system is those seven.
//
// ── Two things here are not stylistic ──
// 1. Per-platform values ride on CSS custom properties. A hover colour
//    cannot come from an inline style, and a class name built by
//    concatenation never reaches Tailwind's scanner.
// 2. The fill SLIDES up on translate-y rather than growing on scaleY.
//    Height is a layout property, and Instagram's gradient stretched
//    vertically would smear.
// ─────────────────────────────────────────────────────────────

// ── Brand skins ─────────────────────────────────────────────
// `glyph` is measured, not chosen — whichever of white or ink actually
// holds against that fill:
//   LinkedIn   #0A66C2 → white 5.69:1
//   YouTube    #FF0000 → white 4.00:1
//   Instagram  gradient → white, 3.89:1 at its red end
//   Newsletter #E3B04B → white is 1.99:1 and fails; ink is 9.14:1
// A mark carries an ICON, which needs 3:1, so those last three pass here.
//
// X's brand IS monochrome, so its fill is the ink token and its glyph the
// background token. That inverts with the theme on its own — black mark
// on white in light, white on black in dark — both of which are the real
// lockup rather than an approximation of it.
//
// `tip` exists because a tooltip carries TEXT, which needs 4.5:1. Two
// brands cannot use their true colour there:
//   YouTube   #FF0000 + white = 4.00, fails → #CC0000 = 5.89
//   Instagram gradient's red end = 3.89, fails → solid #C13584 = 5.11
// True #FF0000 with white was built and looked at before being rejected
// on that number. The tooltip label is bold instead, because light text
// on a saturated ground optically thins and weight is the cheaper fix.

interface PlatformSkin {
  /** The fill that rises on hover. A gradient is legal here. */
  fill: string;
  /** Glyph colour once the fill is up. */
  glyph: string;
  /** Tooltip ground. Defaults to `fill` where that carries text safely. */
  tip?: string;
  /** Only YouTube needs this — the colour its knocked-out triangle takes. */
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
  "youtube-description": {
    fill: "#FF0000",
    glyph: "#FFFFFF",
    tip: "#CC0000",
    knock: "#FF0000",
  },
  newsletter: { fill: "#E3B04B", glyph: "#13161A" },
};

interface SocialPlatformPickerProps {
  /** Whether the step applies — i.e. whether "social" is the chosen type. */
  visible: boolean;
  /** The currently chosen platform, or null if none is picked yet. */
  selected: SocialPlatform | null;
  /** Called with the chosen platform when a mark is activated. */
  onSelect: (platform: SocialPlatform) => void;
  /** Disable all interaction (e.g. while a generation is running). */
  disabled?: boolean;
  className?: string;
}

export function SocialPlatformPicker({
  visible,
  selected,
  onSelect,
  disabled = false,
  className = "",
}: SocialPlatformPickerProps) {
  // Nothing to choose unless social is the active content type.
  if (!visible) return null;

  return (
    <div className={className}>
      <p className="mb-2 text-[13px] font-medium text-xn-ink">Which platform?</p>

      {/* inline-flex, not flex: a block-level flex container would span the
          whole column even though the marks need a fraction of it.
          pt-9 leaves room for the tooltip above rather than letting it clip. */}
      <ul className="inline-flex max-w-full flex-wrap gap-5 pt-9">
        {SOCIAL_PLATFORMS.map((platform) => {
          const skin = PLATFORM_SKIN[platform.id];
          const isSelected = selected === platform.id;

          const vars = {
            "--lit": skin.fill,
            "--glyph-lit": skin.glyph,
            "--tip": skin.tip ?? skin.fill,
            ...(skin.knock && isSelected ? { "--xn-yt-knock": skin.knock } : {}),
          } as CSSProperties;

          return (
            <li key={platform.id} className="group relative" style={vars}>
              {/* Branded like the mark. Its text colour is the same
                  measured choice as the glyph's — white where the ground
                  is dark enough, ink where it is not. */}
              <span
                className={[
                  "pointer-events-none absolute bottom-full left-1/2 z-20 mb-2",
                  "-translate-x-1/2 translate-y-1 whitespace-nowrap",
                  "rounded-xn-sm px-2.5 py-1.5",
                  "bg-[color:var(--tip)] text-xs font-bold shadow-xn",
                  "text-[color:var(--glyph-lit)]",
                  "opacity-0 transition-[opacity,transform] duration-xn-slow ease-xn",
                  "group-hover:translate-y-0 group-hover:opacity-100",
                ].join(" ")}
                aria-hidden
              >
                {platform.label}
              </span>

              <button
                type="button"
                onClick={disabled ? undefined : () => onSelect(platform.id)}
                disabled={disabled}
                aria-pressed={isSelected}
                aria-label={platform.label}
                className={[
                  "relative flex h-16 w-16 items-center justify-center overflow-hidden",
                  "rounded-full border transition-colors duration-xn-slow ease-xn",
                  isSelected ? "border-transparent" : "border-xn-border bg-xn-surface",
                  // The knocked-out triangle follows the fill once it is up.
                  "group-hover:[--xn-yt-knock:var(--lit)]",
                  disabled ? "cursor-not-allowed opacity-60" : "",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xn-ink",
                ].join(" ")}
              >
                {/* Slides up from below rather than growing in height:
                    height is a layout property, and a gradient stretched
                    by scaleY would smear. */}
                <span
                  aria-hidden
                  className={[
                    "absolute inset-0 transition-transform duration-xn-slow ease-xn",
                    isSelected
                      ? "translate-y-0"
                      : "translate-y-full group-hover:translate-y-0",
                  ].join(" ")}
                  style={{ background: "var(--lit)" }}
                />
                <span
                  className={[
                    "relative z-10 flex h-8 w-8 items-center justify-center",
                    "transition-colors duration-xn-slow ease-xn",
                    isSelected ? "text-[color:var(--glyph-lit)]" : "text-xn-ink-muted",
                    "group-hover:text-[color:var(--glyph-lit)]",
                  ].join(" ")}
                >
                  <PlatformMark platform={platform.id} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
