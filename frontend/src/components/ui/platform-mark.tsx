// src/components/ui/platform-mark.tsx
// The five social platform marks, as inline SVG.
//
// Promoted here from the content-type picker once a second consumer
// existed — the platform picker needs the same five. Kept as raw paths
// rather than an icon dependency because only five are needed and each
// carries a quirk that a generic wrapper would flatten.
//
// ── Colour is the caller's job ──
// Every mark paints with `currentColor`, so a parent sets the colour by
// setting text colour. Nothing here decides what colour a brand is —
// those values are measured against their ground where they are used,
// since a mark carrying an icon needs 3:1 and a label carrying text
// needs 4.5:1, and the same brand can need different values for each.
//
// ── Two marks are not like the others ──
// YouTube's play triangle is KNOCKED OUT of its body rather than drawn
// on top, so it cannot take a colour of its own — it has to be whatever
// sits behind the mark. The caller supplies that through the
// `--xn-yt-knock` custom property, which falls back to the surface.
//
// The newsletter glyph is drawn, not a brand mark: there is no company
// called Newsletter. It is kept at the same weight as the four real
// marks so it does not read as the odd one out.

import type { SocialPlatform } from "@/lib/content/types";

export function PlatformMark({ platform }: { platform: SocialPlatform }) {
  switch (platform) {
    case "linkedin":
      return (
        <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden className="h-full w-full">
          <path d="M8.268 28H2.463V9.306h5.805zM5.362 6.756C3.506 6.756 2 5.218 2 3.362a3.362 3.362 0 0 1 6.724 0c0 1.856-1.506 3.394-3.362 3.394M29.994 28h-5.792v-9.1c0-2.169-.044-4.95-3.018-4.95c-3.018 0-3.481 2.356-3.481 4.794V28h-5.799V9.306h5.567v2.55h.081c.775-1.469 2.668-3.019 5.492-3.019c5.875 0 6.955 3.869 6.955 8.894V28z" />
        </svg>
      );
    case "x-thread":
      return (
        <svg viewBox="0 0 512 512" fill="currentColor" aria-hidden className="h-full w-full">
          <path d="M389.2 48h70.6L305.6 224.2L487 464H345L233.7 318.6L106.5 464H35.8l164.9-188.5L26.8 48h145.6l100.5 132.9zm-24.8 373.8h39.1L151.1 88h-42z" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden className="h-full w-full">
          <path d="M128 23.064c34.177 0 38.225.13 51.722.745c12.48.57 19.258 2.655 23.769 4.408c5.974 2.322 10.238 5.096 14.717 9.575s7.253 8.743 9.575 14.717c1.753 4.511 3.838 11.289 4.408 23.768c.615 13.498.745 17.546.745 51.723s-.13 38.226-.745 51.723c-.57 12.48-2.655 19.257-4.408 23.768c-2.322 5.974-5.096 10.239-9.575 14.718s-8.743 7.253-14.717 9.574c-4.511 1.753-11.289 3.839-23.769 4.408c-13.495.616-17.543.746-51.722.746s-38.228-.13-51.723-.746c-12.48-.57-19.257-2.655-23.768-4.408c-5.974-2.321-10.239-5.095-14.718-9.574c-4.479-4.48-7.253-8.744-9.574-14.718c-1.753-4.51-3.839-11.288-4.408-23.768c-.616-13.497-.746-17.545-.746-51.723s.13-38.225.746-51.722c.57-12.48 2.655-19.258 4.408-23.769c2.321-5.974 5.095-10.238 9.574-14.717c4.48-4.48 8.744-7.253 14.718-9.575c4.51-1.753 11.288-3.838 23.768-4.408c13.497-.615 17.545-.745 51.723-.745M128 0C93.237 0 88.878.147 75.226.77c-13.625.622-22.93 2.786-31.071 5.95c-8.418 3.271-15.556 7.648-22.672 14.764S9.991 35.738 6.72 44.155C3.555 52.297 1.392 61.602.77 75.226C.147 88.878 0 93.237 0 128s.147 39.122.77 52.774c.622 13.625 2.785 22.93 5.95 31.071c3.27 8.417 7.647 15.556 14.763 22.672s14.254 11.492 22.672 14.763c8.142 3.165 17.446 5.328 31.07 5.95c13.653.623 18.012.77 52.775.77s39.122-.147 52.774-.77c13.624-.622 22.929-2.785 31.07-5.95c8.418-3.27 15.556-7.647 22.672-14.763s11.493-14.254 14.764-22.672c3.164-8.142 5.328-17.446 5.95-31.07c.623-13.653.77-18.012.77-52.775s-.147-39.122-.77-52.774c-.622-13.624-2.786-22.929-5.95-31.07c-3.271-8.418-7.648-15.556-14.764-22.672S220.262 9.99 211.845 6.72c-8.142-3.164-17.447-5.328-31.071-5.95C167.122.147 162.763 0 128 0m0 62.27c-36.302 0-65.73 29.43-65.73 65.73s29.428 65.73 65.73 65.73c36.301 0 65.73-29.428 65.73-65.73c0-36.301-29.429-65.73-65.73-65.73m0 108.397c-23.564 0-42.667-19.103-42.667-42.667S104.436 85.333 128 85.333s42.667 19.103 42.667 42.667s-19.103 42.667-42.667 42.667m83.686-110.994c0 8.484-6.876 15.36-15.36 15.36s-15.36-6.876-15.36-15.36s6.877-15.36 15.36-15.36s15.36 6.877 15.36 15.36" />
        </svg>
      );
    case "youtube-description":
      // The play triangle is knocked out of the body rather than drawn on
      // top, so it has to take whatever sits behind the mark — here, the
      // pill's own fill.
      return (
        <svg viewBox="0 0 256 256" fill="none" aria-hidden className="h-full w-full">
          <g transform="translate(0 38)">
            <path
              fill="currentColor"
              d="M250.346 28.075A32.18 32.18 0 0 0 227.69 5.418C207.824 0 127.87 0 127.87 0S47.912.164 28.046 5.582A32.18 32.18 0 0 0 5.39 28.24c-6.009 35.298-8.34 89.084.165 122.97a32.18 32.18 0 0 0 22.656 22.657c19.866 5.418 99.822 5.418 99.822 5.418s79.955 0 99.82-5.418a32.18 32.18 0 0 0 22.657-22.657c6.338-35.348 8.291-89.1-.164-123.134"
            />
            <path fill="var(--xn-yt-knock)" d="m102.421 128.06l66.328-38.418l-66.328-38.418z" />
          </g>
        </svg>
      );
    case "newsletter":
      // No brand exists for this one — it is generic email, so it stays a
      // drawn glyph at the same weight as the four real marks.
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-full w-full">
          <rect x="2.4" y="4.6" width="19.2" height="14.8" rx="2.6" stroke="currentColor" strokeWidth="2" />
          <path
            d="m3.6 6.9 8.4 5.9 8.4-5.9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}
