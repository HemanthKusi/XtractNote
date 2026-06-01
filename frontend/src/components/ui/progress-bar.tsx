// ─────────────────────────────────────────────────────────────
// ProgressBar
// ─────────────────────────────────────────────────────────────
// Horizontal fill bar showing a percentage value.
// Matches the hi-fi's .hf-progress component.
//
// Two contexts in the hi-fi:
//   1. Sidebar usage: thin bar under "10 / 30 generations"
//   2. Generation progress: taller bar on the progress screen
//
// Sizes:
//   sm (4px)  → Compact indicators, inline usage
//   md (6px)  → Sidebar usage bar (default, matches hi-fi)
//   lg (8px)  → Generation progress screen, prominent indicators
//
// Usage:
//   <ProgressBar value={33} />
//   <ProgressBar value={75} size="lg" />
//   <ProgressBar value={50} color="#3B7AE8" />  → blog-blue fill
//   <ProgressBar value={100} showLabel />        → "100%" text
// ─────────────────────────────────────────────────────────────

import { type HTMLAttributes } from "react";

// ── Size Definitions ────────────────────────────────────────
// Height of the track bar. The fill inherits the same height.

const sizeClasses = {
  sm: "h-1",     // 4px — compact
  md: "h-1.5",   // 6px — standard (matches hi-fi)
  lg: "h-2",     // 8px — prominent
} as const;

type ProgressBarSize = keyof typeof sizeClasses;

// ── Props ───────────────────────────────────────────────────

interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  /** Progress percentage (0–100). Clamped to this range. */
  value: number;
  /** Visual height: sm, md, lg */
  size?: ProgressBarSize;
  /** Custom fill color. Defaults to accent (terracotta). */
  color?: string;
  /** Show percentage label text above the bar */
  showLabel?: boolean;
  /** Custom label text (overrides the auto-generated "X%") */
  label?: string;
  /** Accessible description of what this progress represents */
  "aria-label"?: string;
}

// ── Component ───────────────────────────────────────────────

export function ProgressBar({
  value,
  size = "md",
  color,
  showLabel = false,
  label,
  "aria-label": ariaLabel,
  className = "",
  ...rest
}: ProgressBarProps) {
  // Clamp value between 0 and 100 to prevent overflow or negative widths.
  // Math.min picks the smaller of (value, 100) → caps at 100.
  // Math.max picks the larger of (that result, 0) → floors at 0.
  const clampedValue = Math.max(0, Math.min(100, value));

  // Round to nearest integer for display (no "33.333%" labels)
  const displayValue = Math.round(clampedValue);

  // ── Track classes (the background bar) ──
  const trackClasses = [
    "w-full",
    "bg-xn-bg-deep",        // Recessed background (matches hi-fi)
    "rounded-xn-pill",       // Pill-shaped ends
    "overflow-hidden",       // Clip the fill bar to the track's rounded shape
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      {/* ── Optional label above the bar ── */}
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-xs text-xn-ink-muted">{label}</span>
          )}
          <span className="text-xs font-mono text-xn-ink-soft ml-auto">
            {displayValue}%
          </span>
        </div>
      )}

      {/* ── Track (background) ──
          role="progressbar" tells screen readers this is a progress indicator.
          aria-valuenow is the current value, min is 0, max is 100.
          A screen reader would announce: "Progress: 33%" */}
      <div
        className={trackClasses}
        role="progressbar"
        aria-valuenow={displayValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
        {...rest}
      >
        {/* ── Fill bar ──
            Width is set as a percentage via inline style.
            The transition makes the bar animate smoothly when
            the value changes (e.g., during generation progress).
            
            We use inline style for width because Tailwind can't
            generate classes for arbitrary runtime percentages
            (w-[33%] works but needs to be known at build time). */}
        <div
          className="h-full rounded-xn-pill transition-[width] duration-300 ease-out"
          style={{
            width: `${clampedValue}%`,
            backgroundColor: color || "var(--xn-accent)",
          }}
        />
      </div>
    </div>
  );
}

// Re-export types for external use
export type { ProgressBarSize };