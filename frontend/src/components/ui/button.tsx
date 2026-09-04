import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

// ─────────────────────────────────────────────────────────────
// Button
// ─────────────────────────────────────────────────────────────
// Four variants:
//   default  → Surface + border (most common — "Cancel", "Back")
//   primary  → Ink-filled, inverted label (main action — "Save")
//   ghost    → Transparent until hovered (toolbar icons, subtle actions)
//   danger   → Tinted, for destructive actions ("Delete", "Remove")
//
// Three sizes: sm, md (default), lg — plus a square icon-only mode.
// Pill-shaped throughout.
//
// Optional slots:
//   icon → element rendered before the label
//   kbd  → keyboard shortcut badge after the label (e.g. "⌘↵")
//
// ── How it behaves ──
// Rest sits on the lowest elevation tier. Hover raises the button 2px
// into the next tier and grows a halo of its own tone. Press drops it
// to 1px BELOW rest, removes the elevation entirely, and contracts the
// halo — so it reads as being squeezed into the surface rather than
// simply moving down.
//
// Hover settles over 200ms; press releases in 110ms, because a click
// should feel immediate even when the hover can afford to ease in.
//
// The halo is defined once in globals.css. If controls ever look busy,
// turn --xn-halo down there and every control follows.
// ─────────────────────────────────────────────────────────────

// ── Variant Styles ──────────────────────────────────────────
// Colour and elevation only. Movement and timing are shared by every
// variant and live in the base class list below, so no variant can
// drift into behaving differently from the rest.

const variantClasses = {
  default: [
    "bg-xn-surface border-xn-border-strong text-xn-ink",
    "shadow-xn-1",
    "hover:shadow-xn-lift",
    "active:bg-xn-surface-alt active:shadow-xn-press",
  ].join(" "),

  primary: [
    "bg-xn-ink border-xn-ink text-xn-bg",
    "shadow-xn",
    "hover:shadow-xn-lift-lg",
    "active:shadow-xn-press",
  ].join(" "),

  ghost: [
    "bg-transparent border-transparent text-xn-ink-muted",
    "hover:bg-xn-surface hover:text-xn-ink hover:shadow-xn-lift",
    "active:bg-xn-surface-alt active:shadow-xn-press",
  ].join(" "),

  danger: [
    "bg-xn-danger-soft border-xn-danger/30 text-xn-danger",
    "shadow-xn-1",
    "hover:shadow-xn-lift",
    "active:shadow-xn-press",
  ].join(" "),
} as const;

type ButtonVariant = keyof typeof variantClasses;

// ── Size Styles ─────────────────────────────────────────────
// Recalibrated against the reading-grade type scale. Chrome text sits
// at the ui step; the padding is tuned to that rather than carried
// over from when body text was 14px.

const sizeClasses = {
  sm: "px-3.5 py-2 text-sm gap-1.5",
  md: "px-[18px] py-[11px] text-ui gap-2",
  lg: "px-6 py-3.5 text-body gap-2.5",
} as const;

type ButtonSize = keyof typeof sizeClasses;

// ── Icon-Only Sizes ─────────────────────────────────────────
// Square, and larger than they used to be so they stay in proportion
// with the raised type scale and remain comfortable touch targets.

const iconOnlySizeClasses = {
  sm: "w-8 h-8",
  md: "w-[38px] h-[38px]",
  lg: "w-[46px] h-[46px]",
} as const;

// ── Props ───────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style: default, primary, ghost, danger */
  variant?: ButtonVariant;
  /** Size: sm, md, lg */
  size?: ButtonSize;
  /** Icon element rendered before the label */
  icon?: ReactNode;
  /** Keyboard shortcut badge rendered after the label (e.g. "⌘↵") */
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
    const base = [
      "inline-flex items-center justify-center",
      "rounded-xn-pill font-medium whitespace-nowrap select-none",
      "border cursor-pointer",

      // Only the properties that actually change are transitioned, so
      // the browser is not asked to watch everything.
      "transition-[box-shadow,transform,background-color,color]",
      "duration-xn ease-xn",

      // The movement half of the interaction, shared by every variant.
      "hover:-translate-y-0.5",
      "active:translate-y-px active:duration-xn-fast",

      // Focus is ink rather than an accent — the chrome is monochrome,
      // and there is no brand accent until the mark exists.
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xn-ink",

      // Disabled must not lift, halo, or press.
      "disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none",
      "disabled:shadow-none disabled:translate-y-0",
    ].join(" ");

    const classes = [
      base,
      variantClasses[variant],
      iconOnly ? iconOnlySizeClasses[size] : sizeClasses[size],
      fullWidth ? "w-full" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button ref={ref} className={classes} {...rest}>
        {icon && (
          <span className="inline-flex w-4 h-4 shrink-0 [&>svg]:w-full [&>svg]:h-full">
            {icon}
          </span>
        )}

        {!iconOnly && children}

        {kbdText && (
          <span
            className={[
              "font-mono text-nano",
              "px-1.5 py-px rounded",
              "border border-current opacity-50",
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
