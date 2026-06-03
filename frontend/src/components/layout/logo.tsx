import { useId } from "react";

// ─────────────────────────────────────────────────────────────
// XtractNote Logo — Wave-to-Nib Mark + Wordmark
// ─────────────────────────────────────────────────────────────
// The mark is now theme-aware via CSS variables:
//   --xn-logo-mark  → navy on light themes, cream on dark theme
//   --xn-logo-muted → gray on light, lighter gray on dark
//
// These are defined in globals.css alongside other theme variables.
// The logo reads them automatically — no theme detection needed.
//
// How it works:
//   1. The wrapper <span> sets CSS `color` to var(--xn-logo-mark)
//   2. The SVGs use "currentColor" for stroke and fill
//   3. When the theme changes, the CSS variable updates, and
//      currentColor resolves to the new value automatically
//   4. If you pass an explicit `color` prop, it overrides the variable
//
// Wordmark: Wordmark05 from xn-pages-v4.jsx —
//   "Xtract" → DM Sans Bold, same color as the mark
//   "Note"   → DM Sans Medium, muted color (via --xn-logo-muted)
//   Wave underline under "Note" in amber
// ─────────────────────────────────────────────────────────────

// ── Brand Constants ─────────────────────────────────────────

const BRAND = {
  amber: "#e8a955",
} as const;

// ── Props ───────────────────────────────────────────────────

interface LogoProps {
  /** Height in pixels. Width auto-calculated from aspect ratio. */
  size?: number;
  /** Mark variant: primary (landscape) or square (favicon) */
  variant?: "primary" | "square";
  /** Override mark color. Defaults to var(--xn-logo-mark) which is
      theme-aware: navy on light themes, cream on dark theme. */
  color?: string;
  /** Show amber ink drop at nib tip. Default: true. */
  accent?: boolean;
  /** Accent dot color. Defaults to brand amber (#e8a955). */
  accentColor?: string;
  /** Show "XtractNote" wordmark beside the mark */
  showWordmark?: boolean;
  /** Override "Note" text color. Defaults to var(--xn-logo-muted). */
  mutedColor?: string;
  /** Additional CSS class */
  className?: string;
}

// ── Primary Mark (Landscape 3:2) ────────────────────────────

function PrimaryMark({
  size,
  accentColor,
  accent,
}: {
  size: number;
  accentColor: string;
  accent: boolean;
}) {
  const uid = useId().replace(/[:]/g, "");
  const ratio = 120 / 80;

  return (
    <svg
      width={size * ratio}
      height={size}
      viewBox="0 0 120 80"
      aria-label="XtractNote"
    >
      <defs>
        <mask id={`p-${uid}`}>
          <g transform="translate(68 50) rotate(30)">
            <path
              d="M -10 -48 L 10 -48 L 16 -18 L 2 0 L -2 0 L -16 -18 Z"
              fill="#fff"
            />
            <circle cx="0" cy="-34" r="3" fill="#000" />
            <rect x="-1" y="-34" width="2" height="28" fill="#000" />
          </g>
        </mask>
      </defs>

      {/* Wave → line: uses currentColor which inherits from the parent span */}
      <path
        d="M 8 50
           Q 11 34 14 50
           Q 17 66 20 50
           Q 23 38 26 50
           Q 29 58 32 50
           L 68 50"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Nib — masked rect, also uses currentColor */}
      <rect
        x="0"
        y="0"
        width="120"
        height="80"
        fill="currentColor"
        mask={`url(#p-${uid})`}
      />

      {/* Amber ink drop at the nib tip */}
      {accent && <circle cx="68" cy="50" r="3" fill={accentColor} />}
    </svg>
  );
}

// ── Square Mark (1:1 for Favicons) ──────────────────────────

function SquareMark({
  size,
  accentColor,
  accent,
}: {
  size: number;
  accentColor: string;
  accent: boolean;
}) {
  const uid = useId().replace(/[:]/g, "");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-label="XtractNote"
    >
      <defs>
        <mask id={`sq-${uid}`}>
          <g transform="translate(38 38) rotate(30)">
            <path
              d="M -7.5 -36 L 7.5 -36 L 12 -14 L 1.5 0 L -1.5 0 L -12 -14 Z"
              fill="#fff"
            />
            <circle cx="0" cy="-25" r="2.4" fill="#000" />
            <rect x="-0.8" y="-25" width="1.6" height="20" fill="#000" />
          </g>
        </mask>
      </defs>

      <path
        d="M 4 38
           Q 7 28 10 38
           Q 13 48 16 38
           Q 19 33 22 38
           L 38 38"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <rect
        x="0"
        y="0"
        width="64"
        height="64"
        fill="currentColor"
        mask={`url(#sq-${uid})`}
      />

      {accent && <circle cx="38" cy="38" r="2" fill={accentColor} />}
    </svg>
  );
}

// ── Wave Underline SVG ──────────────────────────────────────

function WaveUnderline({
  width,
  height,
  color,
}: {
  width: string;
  height: number;
  color: string;
}) {
  return (
    <svg
      viewBox="0 0 100 12"
      preserveAspectRatio="none"
      width={width}
      height={height}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: -height * 1.2,
        display: "block",
      }}
    >
      <path
        d="M 2 6 Q 14 0 26 6 T 50 6 T 74 6 T 98 6"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Main Logo Component ─────────────────────────────────────

export function Logo({
  size = 24,
  variant = "primary",
  color,
  accent = true,
  accentColor = BRAND.amber,
  showWordmark = false,
  mutedColor,
  className = "",
}: LogoProps) {
  // If no color prop, use the CSS variable (theme-aware).
  // If color prop is passed, use it (manual override for dark bg sections).
  const resolvedColor = color || "var(--xn-logo-mark)";
  const resolvedMuted = mutedColor || "var(--xn-logo-muted)";

  const wordmarkSize = size * 0.85;

  return (
    // The wrapper span sets CSS `color` which the SVGs inherit
    // via "currentColor" in their stroke and fill attributes.
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      style={{ color: resolvedColor }}
    >
      {/* The SVG mark — uses currentColor, inherits from this span */}
      {variant === "primary" ? (
        <PrimaryMark size={size} accentColor={accentColor} accent={accent} />
      ) : (
        <SquareMark size={size} accentColor={accentColor} accent={accent} />
      )}

      {/* Wordmark — Wordmark05 style */}
      {showWordmark && (
        <span
          className="font-sans"
          style={{
            fontSize: wordmarkSize,
            lineHeight: 1,
            letterSpacing: "-0.025em",
            display: "inline-flex",
            alignItems: "baseline",
            position: "relative",
          }}
        >
          {/* "Xtract" — bold, inherits color from parent (mark color) */}
          <span style={{ fontWeight: 700 }}>Xtract</span>

          {/* "Note" — medium, muted color + wave underline */}
          <span style={{ fontWeight: 500, color: resolvedMuted, position: "relative" }}>
            Note
            <WaveUnderline
              width="100%"
              height={wordmarkSize * 0.18}
              color={accentColor}
            />
          </span>
        </span>
      )}
    </span>
  );
}