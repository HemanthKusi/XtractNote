// ─────────────────────────────────────────────────────────────
// Loading Skeleton
// ─────────────────────────────────────────────────────────────
// Animated shimmer placeholders for loading states.
//
// Three components:
//
//   Skeleton     → The base building block. A single shimmer shape.
//                  Can be a line, circle, or rectangle.
//
//   SkeletonText → Multiple text lines with natural width variation.
//                  Simulates a paragraph loading.
//
//   SkeletonCard → A pre-built card skeleton with a thumbnail area,
//                  a title line, and description lines.
//
// Usage:
//   <Skeleton width="100%" height={20} />       → single line
//   <Skeleton width={40} height={40} circle />  → avatar placeholder
//   <SkeletonText lines={3} />                  → paragraph
//   <SkeletonCard />                            → full card placeholder
// ─────────────────────────────────────────────────────────────

// ── Base Skeleton ───────────────────────────────────────────
// A single animated rectangle or circle. The shimmer animation
// is defined in tailwind.config.ts (animate-shimmer).

interface SkeletonProps {
    /** Width — number (px) or string ("100%", "80%") */
    width?: number | string;
    /** Height in pixels */
    height?: number;
    /** Render as a circle instead of a rectangle */
    circle?: boolean;
    /** Border radius override. Defaults to xn-md for rectangles, full for circles. */
    rounded?: string;
    /** Additional CSS class */
    className?: string;
  }
  
  export function Skeleton({
    width = "100%",
    height = 16,
    circle = false,
    rounded,
    className = "",
  }: SkeletonProps) {
    // Convert numeric width to pixel string
    const widthValue = typeof width === "number" ? `${width}px` : width;
  
    // If circle, force equal width and height
    const circleSize = circle ? height : undefined;
  
    // Determine border radius
    const borderRadius = rounded
      ? rounded
      : circle
        ? "9999px"
        : "var(--xn-radius-md)";
  
    return (
      <div
        className={[
          "shrink-0",
          // The shimmer effect: a moving gradient over a neutral base.
          // bg-xn-bg-deep is the base color (recessed layer).
          // The gradient creates a lighter stripe that sweeps across.
          "bg-xn-bg-deep",
          className,
        ].join(" ")}
        style={{
          width: circleSize ? `${circleSize}px` : widthValue,
          height: `${height}px`,
          borderRadius,
          // The shimmer gradient: base color → lighter → base color.
          // The background-size is 200% so the gradient is wider than
          // the element, and animate-shimmer moves it left to right.
          backgroundImage:
            "linear-gradient(90deg, transparent 0%, var(--xn-surface-alt) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite linear",
        }}
        // Accessibility: tell screen readers this is a loading placeholder,
        // not actual content they should try to read.
        role="status"
        aria-label="Loading"
      />
    );
  }
  
  // ── SkeletonText ────────────────────────────────────────────
  // Multiple text lines simulating a loading paragraph.
  // Each line has a slightly different width to look natural —
  // real paragraphs don't have uniform line lengths.
  
  interface SkeletonTextProps {
    /** Number of lines to render */
    lines?: number;
    /** Height of each line in pixels */
    lineHeight?: number;
    /** Gap between lines in pixels */
    gap?: number;
    /** Additional CSS class */
    className?: string;
  }
  
  // Width patterns for lines — the last line is always shorter
  // to mimic how real paragraphs end mid-line.
  const lineWidths = ["100%", "95%", "88%", "100%", "72%", "90%", "60%"];
  
  export function SkeletonText({
    lines = 3,
    lineHeight = 14,
    gap = 10,
    className = "",
  }: SkeletonTextProps) {
    return (
      <div
        className={`flex flex-col ${className}`}
        style={{ gap: `${gap}px` }}
        role="status"
        aria-label="Loading text"
      >
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            // Cycle through the width patterns.
            // Last line is always shorter (index wraps with modulo).
            width={i === lines - 1 && lines > 1 ? "60%" : lineWidths[i % lineWidths.length]}
            height={lineHeight}
            // Smaller radius for text lines — they're thin
            rounded="var(--xn-radius-sm)"
          />
        ))}
      </div>
    );
  }
  
  // ── SkeletonCard ────────────────────────────────────────────
  // Pre-built card skeleton matching the common card layout:
  // thumbnail area at top, title line, two description lines.
  
  interface SkeletonCardProps {
    /** Show a thumbnail area at the top */
    showThumbnail?: boolean;
    /** Height of the thumbnail area */
    thumbnailHeight?: number;
    /** Number of text lines below the title */
    descriptionLines?: number;
    /** Additional CSS class */
    className?: string;
  }
  
  export function SkeletonCard({
    showThumbnail = true,
    thumbnailHeight = 140,
    descriptionLines = 2,
    className = "",
  }: SkeletonCardProps) {
    return (
      <div
        className={[
          "bg-xn-surface",
          "border border-xn-border",
          "rounded-xn-lg",
          "overflow-hidden",
          className,
        ].join(" ")}
        role="status"
        aria-label="Loading card"
      >
        {/* Thumbnail placeholder */}
        {showThumbnail && (
          <Skeleton
            width="100%"
            height={thumbnailHeight}
            rounded="0"
          />
        )}
  
        {/* Text content area */}
        <div className="p-4 flex flex-col gap-3">
          {/* Title line — wider and taller than description */}
          <Skeleton width="70%" height={18} rounded="var(--xn-radius-sm)" />
  
          {/* Description lines */}
          <SkeletonText lines={descriptionLines} lineHeight={12} gap={8} />
  
          {/* Meta line — short, like a date or status */}
          <Skeleton width="40%" height={10} rounded="var(--xn-radius-sm)" />
        </div>
      </div>
    );
  }