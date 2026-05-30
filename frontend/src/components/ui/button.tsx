import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

// ─────────────────────────────────────────────────────────────
// Button
// ─────────────────────────────────────────────────────────────
// Matches the hi-fi design's .hf-btn component.
//
// Five variants:
//   default  → Surface bg + border (most common — "Cancel", "Back")
//   primary  → Ink-filled, inverted text (main CTA — "Save", "Continue")
//   accent   → Terracotta filled (generation actions — "Generate", "Extract")
//   ghost    → Transparent, no border (toolbar icons, subtle actions)
//   danger   → Red tint (destructive — "Delete", "Remove")
//
// Three sizes: sm, md (default), lg
// Pill-shaped (border-radius: 999px) matching the hi-fi
//
// Optional slots:
//   icon → SVG element rendered before the label
//   kbd  → Keyboard shortcut badge after the label (e.g., "⌘N")
//
// Modes:
//   iconOnly  → Square button with just an icon (topbar bell, search)
//   fullWidth → Stretches to fill container (sidebar "Upgrade →")
//   disabled  → Greyed out, not clickable
// ─────────────────────────────────────────────────────────────

// ── Variant Styles ──────────────────────────────────────────
// Each variant defines its background, border, text color, and hover state.
// These use the xn- Tailwind classes we set up in tailwind.config.ts,
// which read from the CSS variables in globals.css.

const variantClasses = {
  default: [
    "bg-xn-surface border-xn-border text-xn-ink",
    "hover:bg-xn-surface-alt",
  ].join(" "),

  primary: [
    "bg-xn-ink border-xn-ink text-xn-bg",
    "hover:brightness-90",
  ].join(" "),

  accent: [
    "bg-xn-accent border-xn-accent text-white",
    "hover:brightness-95",
  ].join(" "),

  ghost: [
    "bg-transparent border-transparent text-xn-ink-muted",
    "hover:bg-xn-surface-alt hover:text-xn-ink",
  ].join(" "),

  danger: [
    "bg-[#FEECEF] border-[#F9C3CC] text-[#D44060]",
    "hover:bg-[#FDE0E4]",
  ].join(" "),
} as const;

type ButtonVariant = keyof typeof variantClasses;

// ── Size Styles ─────────────────────────────────────────────
// Padding, font size, and gap between icon and text.
// These match the hi-fi's .hf-btn, .hf-btn.sm, .hf-btn.lg exactly.

const sizeClasses = {
  sm: "px-2.5 py-1 text-xs gap-1.5",       // 12px font, tight padding
  md: "px-3.5 py-2 text-sm gap-1.5",       // 13px font, standard padding
  lg: "px-4.5 py-2.5 text-body gap-2",     // 14px font, roomy padding
} as const;

type ButtonSize = keyof typeof sizeClasses;

// ── Icon-Only Sizes ─────────────────────────────────────────
// Square dimensions for icon-only buttons (no text label).
// Used for topbar icons (bell, search) and toolbar actions.

const iconOnlySizeClasses = {
  sm: "w-7 h-7",     // 28px — small toolbar icons
  md: "w-8 h-8",     // 32px — topbar icons
  lg: "w-10 h-10",   // 40px — prominent icon buttons
} as const;

// ── Props ───────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style: default, primary, accent, ghost, danger */
  variant?: ButtonVariant;
  /** Size: sm, md, lg */
  size?: ButtonSize;
  /** Icon element rendered before the label */
  icon?: ReactNode;
  /** Keyboard shortcut badge rendered after the label (e.g., "⌘N") */
  kbd?: string;
  /** Render as a square icon-only button (no text label) */
  iconOnly?: boolean;
  /** Stretch to fill the container width */
  fullWidth?: boolean;
}

// ── Component ───────────────────────────────────────────────

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "default",
      size = "md",
      icon,
      kbd: kbdText,
      iconOnly = false,
      fullWidth = false,
      className = "",
      children,
      ...rest
    },
    ref
  ) => {
    // Base classes applied to every button regardless of variant/size
    const base = [
      "inline-flex items-center justify-center",
      "rounded-xn-pill",                    // Pill shape from hi-fi
      "font-medium",
      "border",                              // All buttons have a border
      "cursor-pointer",
      "transition-all duration-150",         // Smooth hover transitions
      "whitespace-nowrap",                   // Prevent text wrapping
      "select-none",                         // Can't select button text
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
    ].join(" ");

    // Combine all class groups
    const classes = [
      base,
      variantClasses[variant],
      iconOnly ? iconOnlySizeClasses[size] : sizeClasses[size],
      fullWidth ? "w-full" : "",
      className,
    ]
      .filter(Boolean)  // Remove empty strings
      .join(" ");

    return (
      <button ref={ref} className={classes} {...rest}>
        {/* Icon — sized to 14×14px matching hi-fi's .ico */}
        {icon && (
          <span className="inline-flex w-3.5 h-3.5 shrink-0 [&>svg]:w-full [&>svg]:h-full">
            {icon}
          </span>
        )}

        {/* Text label — hidden in iconOnly mode */}
        {!iconOnly && children}

        {/* Keyboard shortcut badge — mono font, subtle border */}
        {kbdText && (
          <span
            className={[
              "font-mono text-nano",
              "px-1.5 py-px",
              "border border-xn-border rounded",
              "text-xn-ink-soft bg-xn-bg",
            ].join(" ")}
          >
            {kbdText}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button, type ButtonVariant, type ButtonSize };