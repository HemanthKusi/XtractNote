"use client";

// ─────────────────────────────────────────────────────────────
// VideoThumbnail
// ─────────────────────────────────────────────────────────────
// YouTube video thumbnail with play overlay and duration badge.
// Matches HFVideoThumb from hifi-core.jsx.
//
// Three visual states:
//   1. Image loaded — shows the YouTube thumbnail
//   2. Loading — shows a shimmer placeholder
//   3. Error/fallback — shows a striped pattern (like the hi-fi)
//
// YouTube thumbnails come from:
//   https://img.youtube.com/vi/{videoId}/mqdefault.jpg  (320×180)
//   https://img.youtube.com/vi/{videoId}/hqdefault.jpg  (480×360)
//   https://img.youtube.com/vi/{videoId}/maxresdefault.jpg (1280×720)
//
// Usage:
//   <VideoThumbnail videoId="dQw4w9WgXcQ" duration="3:32" />
//   <VideoThumbnail src="/custom-thumb.jpg" duration="12:42" />
//   <VideoThumbnail />  → shows fallback placeholder
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, type HTMLAttributes } from "react";

// ── Props ───────────────────────────────────────────────────

interface VideoThumbnailProps extends HTMLAttributes<HTMLDivElement> {
  /** YouTube video ID — automatically builds the thumbnail URL */
  videoId?: string;
  /** Direct image URL (overrides videoId) */
  src?: string;
  /** Video duration text (e.g., "12:42", "1:03:20") */
  duration?: string;
  /** Thumbnail height in pixels. Width is auto (16:9 ratio from parent). */
  height?: number;
  /** Label text on the fallback placeholder */
  label?: string;
}

// ── Play Icon ───────────────────────────────────────────────

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16">
    <path d="M5 3.5v9l8-4.5-8-4.5z" fill="currentColor" />
  </svg>
);

// ── Component ───────────────────────────────────────────────

export function VideoThumbnail({
  videoId,
  src,
  duration,
  height = 180,
  label = "video",
  className = "",
  ...rest
}: VideoThumbnailProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Build the thumbnail URL: explicit src > YouTube CDN > none
  const thumbnailUrl = src || (videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : null);

  // ── Why this effect exists ──
  // The fade-in is driven by state set from the image's onLoad handler.
  // A cached image finishes decoding *before* React attaches that
  // handler, so onLoad never fires, the state never flips, and the
  // thumbnail sits at opacity 0 for good — the frame, the border and the
  // play badge render over an empty ground. It only shows on a warm
  // cache, which is why it survived: a hard reload looks correct.
  //
  // Reading the element directly covers that case. `complete` means the
  // browser is done either way, and `naturalWidth` is what separates a
  // decoded image from a failed one.
  //
  // Resetting first matters because these two flags describe one
  // specific URL. React reuses this component for the next row in a
  // list, and without the reset a recycled instance would keep the
  // previous image's verdict.
  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);

    const node = imgRef.current;
    if (!node || !node.complete) return;

    if (node.naturalWidth > 0) setImgLoaded(true);
    else setImgError(true);
  }, [thumbnailUrl]);

  // Should we show the real image?
  const showImage = thumbnailUrl && !imgError;

  return (
    <div
      className={[
        "relative w-full overflow-hidden",
        "rounded-xn-md",
        "border border-xn-border",
        className,
      ].join(" ")}
      style={{ height }}
      {...rest}
    >
      {/* ── Background Layer ──
          Always present. Shows either:
          - The striped fallback pattern (when no image or image failed)
          - A neutral background behind the loading image */}
      <div
        className="absolute inset-0"
        style={{
          background: showImage
            ? "var(--xn-bg-deep)"
            : "repeating-linear-gradient(135deg, var(--xn-surface-alt) 0 14px, var(--xn-bg-deep) 14px 15px)",
        }}
      />

      {/* ── Fallback Label ──
          Small text badge in the top-left when showing the placeholder pattern.
          Matches the hi-fi's HFImageSlot label. */}
      {!showImage && (
        <span
          className={[
            "absolute top-2 left-2 z-10",
            "font-mono text-nano",
            "text-xn-ink-soft",
            "bg-xn-surface",
            "px-1.5 py-0.5",
            "rounded border border-xn-border",
          ].join(" ")}
        >
          {label}
        </span>
      )}

      {/* ── Thumbnail Image ──
          Covers the entire container. object-cover ensures it fills
          without stretching (crops edges if aspect ratio differs).

          object-cover is deliberate and measured, not a default: stills
          arrive at 480x360 with 45px letterbox bars top and bottom for
          16:9 source video, and scaled into a 16:9 frame that is exactly
          what cover crops away. object-contain would put those black
          bars back on our own surface. */}
      {showImage && (
        <img
          ref={imgRef}
          src={thumbnailUrl}
          alt={label}
          className={[
            "absolute inset-0 w-full h-full object-cover",
            // Fade in when loaded
            "transition-opacity duration-300",
            imgLoaded ? "opacity-100" : "opacity-0",
          ].join(" ")}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
      )}

      {/* ── Play Button Overlay ──
          Centered circle with a play triangle inside.
          Semi-transparent dark background so it's visible on any thumbnail. */}
      <span
        className={[
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "z-10",
          "w-11 h-11 rounded-full",
          "bg-[rgba(28,24,19,0.85)]",
          "text-white",
          "inline-flex items-center justify-center",
        ].join(" ")}
      >
        <PlayIcon />
      </span>

      {/* ── Duration Badge ──
          Bottom-right pill showing the video length.
          Semi-transparent dark background, mono font. */}
      {duration && (
        <span
          className={[
            "absolute bottom-2 right-2 z-10",
            "font-mono text-micro font-medium",
            "px-1.5 py-0.5 rounded",
            "bg-[rgba(28,24,19,0.85)]",
            "text-white",
          ].join(" ")}
        >
          {duration}
        </span>
      )}
    </div>
  );
}