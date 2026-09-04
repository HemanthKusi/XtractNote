import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

// ─────────────────────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────────────────────
// The wrapper is the visual field: it owns the background, border,
// and focus ring. The <input> inside is stripped bare and only
// handles text entry. That split is what lets a prefix icon and a
// suffix button sit inside the same shape as the text.
//
// ── How it behaves ──
// A field does not lift the way a button does. A button rises because
// you press it; a field is a container you put something into, and a
// floating text box reads as draggable. So the resting state is flat —
// surface fill, one clear border — and focus does the work: the border
// goes to full ink and the halo appears around it.
//
// The halo is the same token the button uses on hover, so the two
// agree without the field pretending to float.
//
// Four sizes, because not every field carries the same weight:
//   sm   → dense rows and toolbars
//   md   → the workhorse (default)
//   lg   → a primary form field
//   hero → leads a page; see hero-input.tsx for the animated version
// ─────────────────────────────────────────────────────────────

const sizeClasses = {
  sm: {
    wrapper: "h-9 gap-2 px-2.5 rounded-xn-sm",
    input: "text-sm",
    icon: "w-4 h-4",
  },
  md: {
    wrapper: "h-11 gap-2.5 px-3.5 rounded-xn-md",
    input: "text-ui",
    icon: "w-[17px] h-[17px]",
  },
  lg: {
    wrapper: "h-14 gap-3 pl-[18px] pr-2 rounded-xn-lg",
    input: "text-body",
    icon: "w-5 h-5",
  },
  hero: {
    wrapper: "h-[68px] gap-3.5 pl-[22px] pr-2.5 rounded-xn-xl",
    input: "text-h5",
    icon: "w-[22px] h-[22px]",
  },
} as const;

type InputSize = keyof typeof sizeClasses;

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> {
  /** Visual size: sm, md, lg, hero */
  size?: InputSize;
  /** Element rendered before the input (e.g. a search icon) */
  prefix?: ReactNode;
  /** Element rendered after the input (e.g. a button or a hint) */
  suffix?: ReactNode;
  /** Show the error border and error focus ring */
  error?: boolean;
  /** Additional classes on the outer wrapper */
  wrapperClassName?: string;
}

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
    const s = sizeClasses[size];

    const wrapperClasses = [
      "flex items-center w-full",
      "bg-xn-surface border",

      // Only the properties that change are transitioned.
      "transition-[border-color,box-shadow] duration-xn ease-xn",

      error
        ? [
            "border-xn-danger",
            "focus-within:shadow-[0_0_0_4px_var(--xn-danger-soft)]",
          ].join(" ")
        : [
            "border-xn-border-strong hover:border-xn-ink-soft",
            "focus-within:border-xn-ink focus-within:shadow-xn-ring",
          ].join(" "),

      disabled ? "opacity-45 cursor-not-allowed" : "",
      s.wrapper,
      wrapperClassName,
    ]
      .filter(Boolean)
      .join(" ");

    const inputClasses = [
      "flex-1 min-w-0",
      "bg-transparent border-none outline-none",
      "text-xn-ink placeholder:text-xn-ink-soft",
      disabled ? "cursor-not-allowed" : "",
      s.input,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={wrapperClasses}>
        {prefix && (
          <span
            className={`inline-flex shrink-0 text-xn-ink-soft [&>svg]:w-full [&>svg]:h-full ${s.icon}`}
          >
            {prefix}
          </span>
        )}

        <input ref={ref} disabled={disabled} className={inputClasses} {...rest} />

        {suffix && <span className="inline-flex shrink-0">{suffix}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input, type InputSize };
