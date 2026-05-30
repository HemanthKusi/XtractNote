import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

// ─────────────────────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────────────────────
// Matches the hi-fi design's .hf-input + HFInput wrapper.
//
// Structure:
//   ┌──────────────────────────────────────────────┐
//   │  [prefix]    input text here...    [suffix]  │
//   └──────────────────────────────────────────────┘
//
// The outer div IS the visual input — it has the border, background,
// and focus ring. The actual <input> inside is invisible (no border,
// no background) and just handles text entry.
//
// Three sizes:
//   sm → Compact (topbar search, small forms)
//   md → Standard (most form fields)
//   lg → Hero (dashboard URL input — taller, more padding)
//
// Slots:
//   prefix → Icon or label on the left (search icon, link icon)
//   suffix → Button or hint on the right (paste button, ⌘K badge)
//
// States:
//   error    → Red border + red focus ring
//   disabled → 50% opacity, not interactive
// ─────────────────────────────────────────────────────────────

// ── Size Definitions ────────────────────────────────────────
// Each size defines classes for the wrapper, input text, and icon.
// Heights: sm=32px, md=40px, lg=48px — matching the hi-fi spacing.

const sizeClasses = {
  sm: {
    wrapper: "h-8 text-xs gap-2 px-2.5",
    input: "text-xs",
    icon: "w-3.5 h-3.5",        // 14px icon
  },
  md: {
    wrapper: "h-10 text-sm gap-2 px-3",
    input: "text-sm",
    icon: "w-4 h-4",            // 16px icon
  },
  lg: {
    wrapper: "h-12 text-body gap-3 px-4",
    input: "text-body",
    icon: "w-4.5 h-4.5",        // 18px icon
  },
} as const;

type InputSize = keyof typeof sizeClasses;

// ── Props ───────────────────────────────────────────────────
// We extend InputHTMLAttributes so this component accepts every
// native <input> prop (placeholder, value, onChange, type, etc.)
// without us listing them manually.
//
// We Omit "size" because HTML inputs have a native `size` attribute
// (number of visible characters) which conflicts with our visual
// size prop. We also Omit "prefix" because it's not a native prop
// but TypeScript complains about the name collision with some types.

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> {
  /** Visual size: sm, md, lg */
  size?: InputSize;
  /** Element rendered before the input (e.g., search icon) */
  prefix?: ReactNode;
  /** Element rendered after the input (e.g., button or ⌘K hint) */
  suffix?: ReactNode;
  /** Show red error border and focus ring */
  error?: boolean;
  /** Additional classes on the outer wrapper div */
  wrapperClassName?: string;
}

// ── Component ───────────────────────────────────────────────

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = "md",
      prefix,
      suffix,
      error = false,
      wrapperClassName = "",
      className = "",
      disabled,
      ...rest
    },
    ref
  ) => {
    // Get the class definitions for the chosen size
    const s = sizeClasses[size];

    // ── Wrapper Classes ──
    // The wrapper is the visual "input" that the user sees.
    // It has the background, border, rounded corners, and focus ring.
    const wrapperClasses = [
      // Layout
      "flex items-center",

      // Background — uses the surface color from the theme
      "bg-xn-surface",

      // Border — switches between error (red) and default
      "border rounded-xn-md",
      error ? "border-[#D44060]" : "border-xn-border",

      // Focus ring — appears on the wrapper when the input inside is focused.
      // focus-within: targets the parent when any child has focus.
      error
        ? "focus-within:outline-2 focus-within:outline-[#D44060] focus-within:outline-offset-[-1px]"
        : "focus-within:outline-2 focus-within:outline-xn-accent focus-within:outline-offset-[-1px]",

      // Smooth border color transition on hover/focus
      "transition-colors duration-150",

      // Disabled state
      disabled ? "opacity-50 cursor-not-allowed" : "",

      // Size-specific height, padding, font size
      s.wrapper,

      // Allow parent to add extra classes
      wrapperClassName,
    ]
      .filter(Boolean)
      .join(" ");

    // ── Input Element Classes ──
    // The actual <input> is stripped of all visual styling.
    // It's transparent — the wrapper provides all the visuals.
    const inputClasses = [
      // Take up all remaining space between prefix and suffix
      "flex-1 min-w-0",

      // Remove all visual styling from the native input
      "bg-transparent",
      "border-none outline-none",

      // Text colors — ink for typed text, ink-soft for placeholder
      "text-xn-ink",
      "placeholder:text-xn-ink-soft",

      // Disabled cursor
      disabled ? "cursor-not-allowed" : "",

      // Size-specific font size
      s.input,

      // Allow parent to add extra classes to the input itself
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={wrapperClasses}>
        {/* ── Prefix Slot ──
            Renders to the left of the input text.
            Typically an icon (search, link, etc.)
            The [&>svg] selector ensures any SVG icon fills the container. */}
        {prefix && (
          <span
            className={`inline-flex shrink-0 text-xn-ink-soft [&>svg]:w-full [&>svg]:h-full ${s.icon}`}
          >
            {prefix}
          </span>
        )}

        {/* ── The Actual Input ──
            ref is forwarded here so parent components can call
            inputRef.current.focus() or read inputRef.current.value */}
        <input
          ref={ref}
          disabled={disabled}
          className={inputClasses}
          {...rest}
        />

        {/* ── Suffix Slot ──
            Renders to the right of the input text.
            Can be a Button, a keyboard hint badge, a clear icon, etc. */}
        {suffix && (
          <span className="inline-flex shrink-0">{suffix}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input, type InputSize };