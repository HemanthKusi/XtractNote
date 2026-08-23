"use client";

import { ContentTypeIcon } from "@/components/ui/content-type-icon";
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

// Inlined rather than promoted to a shared module: this is the only
// consumer today. The platform picker is the next deliverable and will
// need the same five marks — that is the point to lift them out, once a
// second consumer actually exists.
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
      // The play triangle is knocked out of the body rather than drawn on
      // top, so it has to take whatever sits behind the mark — here, the
      // pill's own fill.
      return (
        <svg viewBox="0 0 256 256" fill="none" aria-hidden className="h-full w-full">
          <g transform="translate(0 38)">
            <path
              fill="currentColor"
              d="M250.346 28.075A32.18 32.18 0 0 0 227.69 5.418C207.824 0 127.87 0 127.87 0S47.912.164 28.046 5.582A32.18 32.18 0 0 0 5.39 28.24c-6.009 35.298-8.34 89.084.165 122.97a32.18 32.18 0 0 0 22.656 22.657c19.866 5.418 99.822 5.418 99.822 5.418s79.955 0 99.82-5.418a32.18 32.18 0 0 0 22.657-22.657c6.338-35.348 8.291-89.1-.164-123.134"
            />
            <path fill="var(--xn-yt-knock)" d="m102.421 128.06l66.328-38.418l-66.328-38.418z" />
          </g>
        </svg>
      );
    case "newsletter":
      // No brand exists for this one — it is generic email, so it stays a
      // drawn glyph at the same weight as the four real marks.
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-full w-full">
          <rect x="2.4" y="4.6" width="19.2" height="14.8" rx="2.6" stroke="currentColor" strokeWidth="2" />
          <path
            d="m3.6 6.9 8.4 5.9 8.4-5.9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

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
      {BRAND_NAME[platform]}
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
              "focus-visible:outline-none focus-visible:shadow-xn-ring",
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
