import { type HTMLAttributes, type ReactNode } from "react";
import {
  contentTypeColors,
  statusColors,
  type ContentType,
  type StatusType,
} from "@/lib/constants/theme";

// ─────────────────────────────────────────────────────────────
// Chip
// ─────────────────────────────────────────────────────────────
// Small inline tag/badge for labeling content types, statuses,
// and categories. Matches the hi-fi's .hf-chip component.
//
// Three modes:
//
// 1. Default — neutral chip with theme colors
//    <Chip>Custom Label</Chip>
//
// 2. Content type — auto-colored based on type
//    <Chip contentType="blog" />       → blue "Blog Post"
//    <Chip contentType="notes" />      → green "Study Notes"
//    <Chip contentType="summary" />    → amber "Summary"
//
// 3. Status — auto-colored based on status
//    <Chip status="saved" />           → green "Saved"
//    <Chip status="draft" />           → amber "Draft"
//
// You can also combine contentType with custom children:
//    <Chip contentType="blog">Article</Chip>  → blue "Article"
//
// Visual variants:
//   default → Light tinted background with colored text
//   solid   → Filled background with white text
//   outline → Transparent background with colored border
// ─────────────────────────────────────────────────────────────

// ── Variants ────────────────────────────────────────────────

type ChipVariant = "default" | "solid" | "outline";

// ── Props ───────────────────────────────────────────────────

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Auto-color by content type. Also sets default label text. */
  contentType?: ContentType;
  /** Auto-color by status. Also sets default label text. */
  status?: StatusType;
  /** Visual variant */
  variant?: ChipVariant;
  /** Optional dot indicator before the label */
  dot?: boolean;
  /** Custom dot color (overrides auto-color) */
  dotColor?: string;
  /** Icon element rendered before the label */
  icon?: ReactNode;
  /** Content inside the chip (overrides auto-generated label) */
  children?: ReactNode;
}

// ── Helper: capitalize first letter ─────────────────────────

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Component ───────────────────────────────────────────────

export function Chip({
  contentType,
  status,
  variant = "default",
  dot = false,
  dotColor,
  icon,
  children,
  className = "",
  style,
  ...rest
}: ChipProps) {
  // ── Determine colors ──
  // Priority: contentType → status → neutral (theme colors)
  let chipColor = "var(--xn-ink-muted)";
  let chipBg = "var(--xn-surface-alt)";
  let chipBorder = "var(--xn-border)";
  let label = children;

  if (contentType && contentTypeColors[contentType]) {
    const ct = contentTypeColors[contentType];
    chipColor = ct.color;
    chipBg = ct.bg;
    chipBorder = ct.border;
    // Use the content type's label as default text if no children provided
    if (!children) label = ct.label;
  } else if (status && statusColors[status]) {
    const st = statusColors[status];
    chipColor = st.text;
    chipBg = st.bg;
    chipBorder = st.border;
    // Capitalize the status name as default text
    if (!children) label = capitalize(status);
  }

  // ── Build variant-specific inline styles ──
  // We use inline styles (not Tailwind classes) for the colors because
  // content-type and status colors are dynamic values from theme.ts,
  // not static Tailwind classes. Tailwind can't generate classes for
  // arbitrary runtime color values.
  let variantStyle: React.CSSProperties = {};

  switch (variant) {
    case "default":
      variantStyle = {
        backgroundColor: chipBg,
        color: chipColor,
        borderColor: chipBorder,
      };
      break;
    case "solid":
      variantStyle = {
        backgroundColor: chipColor,
        color: "#ffffff",
        borderColor: chipColor,
      };
      break;
    case "outline":
      variantStyle = {
        backgroundColor: "transparent",
        color: chipColor,
        borderColor: chipBorder,
      };
      break;
  }

  // ── Base classes ──
  // These match the hi-fi's .hf-chip: pill shape, mono font, tiny size
  const baseClasses = [
    "inline-flex items-center gap-1",
    "px-2 py-0.5",
    "rounded-xn-pill",
    "border",
    "font-mono text-micro",
    "leading-none",
    "whitespace-nowrap",
    "select-none",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={baseClasses}
      style={{ ...variantStyle, ...style }}
      {...rest}
    >
      {/* Optional colored dot — used in folder chips and sidebar items */}
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: dotColor || chipColor }}
        />
      )}

      {/* Optional icon before the label */}
      {icon && (
        <span className="inline-flex w-3 h-3 shrink-0 [&>svg]:w-full [&>svg]:h-full">
          {icon}
        </span>
      )}

      {/* Label text */}
      {label}
    </span>
  );
}

// Re-export types for external use
export type { ChipVariant };