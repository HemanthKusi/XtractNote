"use client";

import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { PlatformMark } from "@/components/ui/platform-mark";
import { contentTypeColors, type ContentType } from "@/lib/constants/theme";
import {
  isGeneratable,
  type GeneratableContentType,
  type SocialPlatform,
} from "@/lib/content/types";

// ─────────────────────────────────────────────────────────────
// ContentTypePicker
//
// The format-selection grid for the create flow. Shows all 7 content
// types. Availability is read from isGeneratable() (backed by
// GENERATABLE_TYPES), so a tile flips live the moment its type is added
// there — no edit needed here. All seven are generatable today, so no
// tile renders as "Coming soon"; the branch is kept because
// GeneratableContentType narrows again if a format is added to the theme
// registry before its generation path exists.
//
// Controlled component — it owns no state. The parent passes the current
// `selected` value and an `onSelect` callback; the parent decides what a
// selection does (e.g. enable a Generate button). Disable all interaction
// via `disabled` while a generation is in flight.
//
// ── Why these are not Cards ──
// Seven formats used to be seven identical rectangles, the same shape the
// folder tiles and history rows were using for different data entirely.
// A format is a choice, so it draws as a tall tile where the icon is the
// biggest thing and does the identifying — the label underneath confirms
// it rather than carrying it.
//
// ── The icon swells, the tile holds still ──
// Hover zooms the icon in place rather than lifting the tile.
//
// The curve is the project's own ease-out, not a spring. An earlier note
// claimed this zoom overshot by a few percent, which was never true: it
// named a class that does not exist, so it silently fell back to
// Tailwind's default ease. Once real overshoot curves were rendered and
// measured, there was nothing to choose between them — the overshoot is
// proportional to the scale delta, so at 1.35 on a 40px icon even a
// pronounced spring peaks 1.37px past its target, and a gentle one
// 0.29px. Adding a token to the design system for a sub-pixel effect
// nobody can see is cost without return, so this uses the ease every
// other transition in the app already uses.
//
// No curve is prescribed or banned. If overshoot is wanted later it can
// be added deliberately, on something large enough to show it.
//
// ── SOCIAL IS A TWO-STEP CHOICE ──
// Every other type is terminal: pick it and you can generate. Social also
// needs a platform, which is chosen in the picker that opens directly
// beneath this grid. The tile shows the chosen platform as a brand pill
// so the current answer is visible without looking away — it is a
// readout, never a control, and it is absent until a platform exists.
// ─────────────────────────────────────────────────────────────

// Short, picker-specific descriptions (one line each). Display copy, kept
// next to the picker rather than in the shared token registry.
const DESCRIPTIONS: Record<ContentType, string> = {
  summary: "Key points, quick read",
  blog: "Polished article with headings",
  notes: "Structured study notes",
  research: "Abstract, findings, citations",
  flashcards: "Q&A cards for review",
  quiz: "Practice questions",
  social: "Posts for X, LinkedIn & more",
};

// Display order. This is purely presentational — enabled-ness still comes
// from isGeneratable(), so the two can't disagree.
const DISPLAY_ORDER: ContentType[] = [
  "summary",
  "blog",
  "notes",
  "research",
  "flashcards",
  "quiz",
  "social",
];

// ── Brand pill ──────────────────────────────────────────────
// The shipped platform labels read "LinkedIn post", "X / Thread" — the
// format, not the brand. A pill carrying a brand mark wants the brand's
// own name beside it, so these are wordmarks rather than labels.
const BRAND_NAME: Record<SocialPlatform, string> = {
  linkedin: "LinkedIn",
  "x-thread": "X",
  instagram: "Instagram",
  "youtube-description": "YouTube",
  newsletter: "Newsletter",
};

// `ink` is not a style choice. A wordmark is text, and text needs 4.5:1
// where an icon only needs 3:1 — so three of these cannot use the value
// their tile glyph uses, measured:
//   LinkedIn   #0A66C2 + white = 5.69, safe as-is
//   YouTube    #FF0000 + white = 4.00, fails → #CC0000 = 5.89
//   Instagram  gradient bottoms out at 3.89, fails → #C13584 = 5.11
//   Newsletter #E3B04B + white = 1.99, fails badly → dark ink = 9.14
// X's brand is monochrome, so it rides the theme tokens and inverts on
// its own rather than approximating a colour it does not have.
const BRAND_FILL: Record<SocialPlatform, { fill: string; ink: string }> = {
  linkedin: { fill: "#0A66C2", ink: "#FFFFFF" },
  "x-thread": { fill: "var(--xn-ink)", ink: "var(--xn-bg)" },
  instagram: { fill: "#C13584", ink: "#FFFFFF" },
  "youtube-description": { fill: "#CC0000", ink: "#FFFFFF" },
  newsletter: { fill: "#E3B04B", ink: "#13161A" },
};


/**
 * The chosen platform, shown on the social tile. A readout of a choice
 * made elsewhere — deliberately not a button, so there is exactly one
 * place that changes the platform.
 */
function BrandPill({ platform }: { platform: SocialPlatform }) {
  const { fill, ink } = BRAND_FILL[platform];

  return (
    <span
      className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xn-pill px-2 py-1 text-[11px] font-semibold leading-none"
      style={
        {
          backgroundColor: fill,
          color: ink,
          // Only YouTube reads this, for its knocked-out triangle.
          "--xn-yt-knock": fill,
        } as React.CSSProperties
      }
    >
      <span className="inline-block h-3 w-3 shrink-0">
        <PlatformMark platform={platform} />
      </span>
      {/* The wordmark is hidden below xl but not removed. Measured across
          all five names inside the real create column: at 1024 a tile's
          icon row is 127px, and the icon plus gap plus a named pill wants
          126px for LinkedIn but 135px for Instagram and 140px for
          Newsletter — so the two longest overflowed. xl is the first
          breakpoint where every name has room. Below it the mark alone
          identifies the platform.
          sr-only rather than hidden, because the mark itself is
          aria-hidden: display:none would take the platform's name out of
          the accessibility tree and leave the pill silent. */}
      <span className="sr-only xl:not-sr-only">{BRAND_NAME[platform]}</span>
    </span>
  );
}

interface ContentTypePickerProps {
  /** The currently selected type, or null if nothing is picked yet. */
  selected: GeneratableContentType | null;
  /** Called with the chosen type when a live tile is activated. */
  onSelect: (type: GeneratableContentType) => void;
  /**
   * The chosen social platform, when social is selected. Displayed on the
   * social tile so the current choice is visible without opening the
   * platform picker. Ignored for every other type.
   */
  selectedPlatform?: SocialPlatform | null;
  /** Disable all interaction (e.g. while a generation is running). */
  disabled?: boolean;
  className?: string;
}

export function ContentTypePicker({
  selected,
  onSelect,
  selectedPlatform = null,
  disabled = false,
  className = "",
}: ContentTypePickerProps) {
  return (
    // The column ramp stops at four rather than starting there: the shell
    // keeps a 232px sidebar at every width with no collapsed state, so a
    // narrow viewport leaves very little for any page's content and a
    // multi-column grid there renders unusable tiles.
    <div
      className={`grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 ${className}`}
    >
      {DISPLAY_ORDER.map((type) => {
        const meta = contentTypeColors[type];

        // A tile is live only if its type is generatable AND the picker
        // isn't globally disabled. isGeneratable() also narrows `type` to
        // the generatable subset inside the handler below.
        const live = !disabled && isGeneratable(type);
        const isSelected = selected === type;

        // Social's readout. Absent until a platform has been chosen —
        // the prompt to choose one is the picker that opens below.
        const showPill = type === "social" && selectedPlatform !== null;

        const activate = () => {
          if (!disabled && isGeneratable(type)) {
            onSelect(type);
          }
        };

        return (
          // A real button rather than a div with role="button": genuine
          // focus, genuine keyboard semantics, and no hand-rolled
          // Enter/Space handling to keep correct.
          <button
            key={type}
            type="button"
            onClick={live ? activate : undefined}
            disabled={!live}
            aria-pressed={isSelected}
            className={[
              "group flex flex-col items-start gap-3 rounded-xn-lg border p-4 text-left",
              "transition-colors duration-xn ease-xn",
              // A real outline rather than a ring shadow. `shadow-xn-ring`
              // reads like a token but is not one — the boxShadow map has
              // only xn-1, xn, xn-lg and xn-hover — so it generated no CSS
              // and, with the native outline suppressed alongside it, a
              // focused tile had no indicator at all. This is the pattern
              // the folder tile already uses, and it resolves.
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xn-ink",
              isSelected ? "" : "border-xn-border bg-xn-surface",
              live ? "hover:border-xn-border-strong" : "cursor-not-allowed opacity-60",
            ].join(" ")}
            style={
              isSelected ? { backgroundColor: meta.bg, borderColor: meta.border } : undefined
            }
          >
            <span className="flex w-full items-center gap-2">
              {/* The icon swells in place; the tile itself holds still. */}
              <span className="inline-block origin-center transform-gpu transition-transform duration-xn ease-xn group-hover:scale-[1.35]">
                <ContentTypeIcon type={type} size="xl" withBackground />
              </span>

              {showPill && selectedPlatform && <BrandPill platform={selectedPlatform} />}

              {!isGeneratable(type) && (
                <span className="ml-auto shrink-0 rounded-xn-pill border border-xn-border bg-xn-bg-deep px-2 py-0.5 text-[11px] font-medium text-xn-ink-soft">
                  Coming soon
                </span>
              )}
            </span>

            <span className="block">
              <span
                className="block text-ui font-semibold"
                style={{ color: isSelected ? meta.color : "var(--xn-ink)" }}
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
