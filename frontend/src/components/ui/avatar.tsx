// ─────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────
// Circular user icon showing initials or a profile image.
// Matches the hi-fi's .hf-avatar and HFAvatar component.
//
// Sizes:
//   sm  (24px) → Compact lists, inline mentions
//   md  (28px) → Topbar (default, matches hi-fi)
//   lg  (36px) → Settings, user cards
//   xl  (48px) → Blog author, profile header
//
// Two display modes:
//   Initials → Deep background with centered text (default)
//   Image    → Profile photo fills the circle, initials as fallback
//
// Usage:
//   <Avatar initials="MK" />
//   <Avatar initials="MK" size="lg" />
//   <Avatar initials="MK" src="/avatar.jpg" />
// ─────────────────────────────────────────────────────────────

import { useState, type HTMLAttributes } from "react";

// ── Size Definitions ────────────────────────────────────────
// Each size defines the pixel dimension and the font size.
// Font size is roughly 40% of the avatar size, matching the
// hi-fi's formula: fontSize: size * 0.4

const sizes = {
  sm: { px: 24, font: 10 },
  md: { px: 28, font: 11 },
  lg: { px: 36, font: 14 },
  xl: { px: 48, font: 18 },
} as const;

type AvatarSize = keyof typeof sizes;

// ── Props ───────────────────────────────────────────────────

interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** User's initials (1-2 characters, e.g., "MK") */
  initials: string;
  /** Visual size: sm, md, lg, xl */
  size?: AvatarSize;
  /** Profile image URL. Falls back to initials if image fails to load. */
  src?: string;
  /** Alt text for the profile image */
  alt?: string;
}

// ── Component ───────────────────────────────────────────────

export function Avatar({
  initials,
  size = "md",
  src,
  alt,
  className = "",
  style,
  ...rest
}: AvatarProps) {
  // Track whether the image failed to load.
  // If it fails, we fall back to showing initials.
  const [imgError, setImgError] = useState(false);

  const s = sizes[size];

  // Show the image only if a src is provided and it hasn't errored
  const showImage = src && !imgError;

  // Base classes — circle shape, centered content, border
  const baseClasses = [
    "inline-flex items-center justify-center",
    "rounded-full",           // Perfect circle
    "shrink-0",               // Never squish in flex layouts
    "border border-xn-border",
    "overflow-hidden",        // Clip image to circle shape
    "select-none",            // Can't select initials text
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={baseClasses}
      style={{
        width: s.px,
        height: s.px,
        fontSize: s.font,
        // Only show background color when displaying initials (not image)
        backgroundColor: showImage ? "transparent" : "var(--xn-bg-deep)",
        color: "var(--xn-ink)",
        fontWeight: 600,
        ...style,
      }}
      {...rest}
    >
      {showImage ? (
        // ── Image Mode ──
        // The image fills the circle. object-cover ensures it covers
        // the entire area without stretching (crops if needed).
        // If the image fails to load, onError sets imgError=true,
        // which hides the image and shows initials instead.
        <img
          src={src}
          alt={alt || initials}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        // ── Initials Mode ──
        // Show the first 2 characters of the initials string.
        // Uppercase to ensure consistency ("mk" becomes "MK").
        initials.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

// Re-export types for external use
export type { AvatarSize };