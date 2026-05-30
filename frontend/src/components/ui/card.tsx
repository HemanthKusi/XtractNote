import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

// ─────────────────────────────────────────────────────────────
// Card (Surface)
// ─────────────────────────────────────────────────────────────
// The primary container in XtractNote's three-layer depth system.
//
// Four variants:
//   default  → White surface + border + shadow (most cards)
//   flat     → White surface + border, no shadow (dense layouts)
//   ghost    → Transparent, no border (logical grouping only)
//   recessed → Deep background, inset look (sidebar panels, settings)
//
// Optional slots:
//   header → Full-width top section, separated by a border line
//   footer → Full-width bottom section, separated by a border line
//
// Example layouts from the hi-fi:
//
//   Default card (dashboard quick action):
//   ┌─────────────────────┐
//   │  Blog Post          │  ← padding="md"
//   │  Generate a blog... │
//   └─────────────────────┘
//
//   Card with header + footer (video preview):
//   ┌─────────────────────┐
//   │ Video Preview  12:42│  ← header slot
//   ├─────────────────────┤
//   │                     │
//   │   [thumbnail]       │  ← children (main content)
//   │                     │
//   ├─────────────────────┤
//   │ TechChannel  [Gen]  │  ← footer slot
//   └─────────────────────┘
// ─────────────────────────────────────────────────────────────

// ── Variant Styles ──────────────────────────────────────────
// Each variant sets the background, border, and shadow.

const variantClasses = {
  // The workhorse — white card floating above the page
  default: "bg-xn-surface border border-xn-border shadow-xn",

  // Same as default but without shadow — for tighter layouts
  // where many cards sit side by side and shadows would be noisy
  flat: "bg-xn-surface border border-xn-border",

  // Invisible container — only used for logical grouping.
  // No visual presence. Children appear directly on the page.
  ghost: "bg-transparent",

  // Sunken/inset look — the deep background color.
  // Used for panels inside the sidebar, settings sections,
  // or any area that should feel recessed into the page.
  recessed: "bg-xn-bg-deep border border-xn-border",
} as const;

type CardVariant = keyof typeof variantClasses;

// ── Padding Sizes ───────────────────────────────────────────
// How much internal spacing the card has.
// "none" is useful when header/footer handle their own padding,
// or when the card contains an image that should touch the edges.

const paddingClasses = {
  none: "",
  sm:   "p-3",     // 12px — compact cards
  md:   "p-4",     // 16px — standard (default)
  lg:   "p-6",     // 24px — spacious content cards
  xl:   "p-8",     // 32px — hero cards, prominent content
} as const;

type CardPadding = keyof typeof paddingClasses;

// ── Elevation Styles ────────────────────────────────────────
// Override the shadow independently of the variant.
// Useful when you want a flat variant's look but with a shadow,
// or a default card with a larger shadow for emphasis.

const elevationClasses = {
  none: "shadow-none",
  sm:   "shadow-xn",
  lg:   "shadow-xn-lg",
} as const;

type CardElevation = keyof typeof elevationClasses;

// ── Props ───────────────────────────────────────────────────
// Extends HTMLAttributes<HTMLDivElement> so the card accepts
// standard div props like onClick, onMouseEnter, id, aria-*, etc.

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual style: default, flat, ghost, recessed */
  variant?: CardVariant;
  /** Internal padding: none, sm, md, lg, xl */
  padding?: CardPadding;
  /** Override shadow level independently of variant */
  elevate?: CardElevation;
  /** Add hover shadow + pointer cursor for clickable cards */
  interactive?: boolean;
  /** Content rendered at the top, separated by a horizontal line */
  header?: ReactNode;
  /** Content rendered at the bottom, separated by a horizontal line */
  footer?: ReactNode;
}

// ── Component ───────────────────────────────────────────────

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "default",
      padding = "md",
      elevate,
      interactive = false,
      header,
      footer,
      className = "",
      children,
      ...rest
    },
    ref
  ) => {
    // Build the class string from all the options
    const classes = [
      // Rounded corners — 14px from the hi-fi's radius.lg
      "rounded-xn-lg",

      // Prevent content from leaking outside rounded corners
      // (important when cards contain images or colored backgrounds)
      "overflow-hidden",

      // Variant-specific background, border, shadow
      variantClasses[variant],

      // If elevate is specified, it overrides the variant's shadow.
      // This lets you do things like: flat card + large shadow
      elevate ? elevationClasses[elevate] : "",

      // Interactive cards grow their shadow on hover and show
      // a pointer cursor, signaling "you can click this."
      // Used for content-type selection cards, folder cards, etc.
      interactive
        ? "cursor-pointer transition-shadow duration-150 hover:shadow-xn-lg"
        : "",

      // Allow parent to add extra classes
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div ref={ref} className={classes} {...rest}>

        {/* ── Header Slot ──
            Full-width section at the top of the card.
            Has its own padding and a bottom border separating
            it from the main content.
            
            Example: "Video Preview" title + "12:42" duration */}
        {header && (
          <div className="px-4 py-3 border-b border-xn-border">
            {header}
          </div>
        )}

        {/* ── Main Content ──
            The primary content area. Padding is controlled by
            the padding prop. If the card has a header or footer,
            this is the middle section. */}
        <div className={paddingClasses[padding]}>
          {children}
        </div>

        {/* ── Footer Slot ──
            Full-width section at the bottom of the card.
            Has its own padding and a top border separating
            it from the main content.
            
            Example: channel name + "Generate" button */}
        {footer && (
          <div className="px-4 py-3 border-t border-xn-border">
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = "Card";
export { Card, type CardVariant, type CardPadding, type CardElevation };