import { useId } from "react";

// ─────────────────────────────────────────────────────────────
// XtractNote Logo — Wave-to-Nib Mark
// ─────────────────────────────────────────────────────────────
// Ported from xn-marks-v4.jsx (the brand package).
//
// The mark: a sound wave on the left flattens into a straight
// line. A pen nib (rotated 30°) sits at the right end of the
// line, as if drawing it. The wave represents video/audio
// content, and the nib represents written output.
//
// Two variants:
//   primary → Landscape (3:2 ratio), for sidebar and navbar
//   square  → Compact (1:1), for favicon and small spaces
//
// The nib has a breather hole and a slit, achieved via SVG mask.
// The mark uses currentColor so it inherits text color from
// its parent — in the sidebar it's xn-ink, on the dark brand
// background it's cream.
//
// Usage:
//   <Logo />                          → 24px primary mark
//   <Logo size={32} />                → larger primary mark
//   <Logo variant="square" size={32}/>→ square favicon mark
//   <Logo showWordmark />             → mark + "XtractNote" text
//   <Logo color="#f3ebd9" />          → cream-colored on dark bg
// ─────────────────────────────────────────────────────────────

// ── Props ───────────────────────────────────────────────────

interface LogoProps {
  /** Height in pixels. Width is calculated from the aspect ratio. */
  size?: number;
  /** Which mark variant to render */
  variant?: "primary" | "square";
  /** Override color. Defaults to "currentColor" (inherits from parent). */
  color?: string;
  /** Show an amber ink drop at the nib tip */
  accent?: boolean;
  /** Accent dot color. Defaults to the brand amber (#e8a955). */
  accentColor?: string;
  /** Show "XtractNote" wordmark text beside the mark */
  showWordmark?: boolean;
  /** Additional CSS class */
  className?: string;
}

// ── Primary Mark (Landscape 3:2) ────────────────────────────
// ViewBox: 120×80. Three-cycle wave flattening into a line.
// Nib at the right end, rotated 30°, tip touching the line.

function PrimaryMark({
  size,
  color,
  accent,
  accentColor,
}: {
  size: number;
  color: string;
  accent: boolean;
  accentColor: string;
}) {
  // useId generates a unique string for this component instance.
  // We strip colons because SVG ID attributes don't allow them.
  const uid = useId().replace(/[:]/g, "");
  const ratio = 120 / 80; // width:height = 1.5

  return (
    <svg
      width={size * ratio}
      height={size}
      viewBox="0 0 120 80"
      aria-label="XtractNote"
    >
      <defs>
        {/* Mask: white = visible, black = cut out.
            The nib silhouette is white. The breather hole (circle)
            and slit (thin rectangle) are black, so the background
            shows through them. */}
        <mask id={`p-${uid}`}>
          <g transform="translate(68 50) rotate(30)">
            {/* Nib body — chunky fountain-pen shape */}
            <path
              d="M -10 -48 L 10 -48 L 16 -18 L 2 0 L -2 0 L -16 -18 Z"
              fill="#fff"
            />
            {/* Breather hole — circular cutout near the top */}
            <circle cx="0" cy="-34" r="3" fill="#000" />
            {/* Slit — thin vertical cutout from hole to tip */}
            <rect x="-1" y="-34" width="2" height="28" fill="#000" />
          </g>
        </mask>
      </defs>

      {/* Wave → line: 3 cycles with decreasing amplitude,
          flattening into a straight horizontal line at y=50 */}
      <path
        d="M 8 50
           Q 11 34 14 50
           Q 17 66 20 50
           Q 23 38 26 50
           Q 29 58 32 50
           L 68 50"
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Nib — fill the masked area with the mark color.
          The rect covers the whole viewBox, but the mask
          only reveals the nib-shaped area. */}
      <rect
        x="0"
        y="0"
        width="120"
        height="80"
        fill={color}
        mask={`url(#p-${uid})`}
      />

      {/* Optional accent ink drop at the nib tip */}
      {accent && <circle cx="68" cy="50" r="3" fill={accentColor} />}
    </svg>
  );
}

// ── Square Mark (1:1 for Favicons) ──────────────────────────
// ViewBox: 64×64. Shorter wave (2 cycles), 0.75× scale nib.

function SquareMark({
  size,
  color,
  accent,
  accentColor,
}: {
  size: number;
  color: string;
  accent: boolean;
  accentColor: string;
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
            {/* Scaled nib — 0.75× of primary proportions */}
            <path
              d="M -7.5 -36 L 7.5 -36 L 12 -14 L 1.5 0 L -1.5 0 L -12 -14 Z"
              fill="#fff"
            />
            <circle cx="0" cy="-25" r="2.4" fill="#000" />
            <rect x="-0.8" y="-25" width="1.6" height="20" fill="#000" />
          </g>
        </mask>
      </defs>

      {/* Two-cycle compact wave + short flat line */}
      <path
        d="M 4 38
           Q 7 28 10 38
           Q 13 48 16 38
           Q 19 33 22 38
           L 38 38"
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <rect
        x="0"
        y="0"
        width="64"
        height="64"
        fill={color}
        mask={`url(#sq-${uid})`}
      />

      {accent && <circle cx="38" cy="38" r="2" fill={accentColor} />}
    </svg>
  );
}

// ── Main Logo Component ─────────────────────────────────────

export function Logo({
  size = 24,
  variant = "primary",
  color = "currentColor",
  accent = false,
  accentColor = "#e8a955",
  showWordmark = false,
  className = "",
}: LogoProps) {
  // Shared props for both mark variants
  const markProps = { size, color, accent, accentColor };

  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
    >
      {/* The SVG mark */}
      {variant === "primary" ? (
        <PrimaryMark {...markProps} />
      ) : (
        <SquareMark {...markProps} />
      )}

      {/* Optional wordmark text beside the mark */}
      {showWordmark && (
        <span
          className="font-serif font-medium"
          style={{
            fontSize: size * 0.85,
            letterSpacing: "-0.01em",
            color: color === "currentColor" ? undefined : color,
          }}
        >
          XtractNote
        </span>
      )}
    </span>
  );
}