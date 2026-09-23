"use client";

// src/app/dev/social-templates/youtube-description.tsx
//
// The video-description template: the generated copy shown the way its
// destination will show it.
//
// ── The one design decision this file makes ──
//
// The mock uses the DESTINATION'S STRUCTURE and THIS APP'S SURFACES. Layout,
// proportion and ordering are the destination's; every colour is an `-xn-`
// token, so the preview themes with the rest of the product instead of
// pinning one platform's palette into our stylesheet.
//
// That turned out to cost nothing. A video page reads as itself through
// geometry — 16:9, then title, then a channel row with a high-contrast pill,
// then a filled description box that folds — and the pill is `bg-xn-ink`,
// which is already black on light and white on dark. Nothing here needed a
// raw colour value to be recognisable.
//
// ── Two things deliberately do NOT work ──
//
// 1. The engagement row is scenery. Like, dislike, share and save have no
//    destination in this product and they are part of the mock rather than
//    controls we are offering. They are spans inside an `aria-hidden`
//    wrapper — not buttons, not focusable, not in the tab order, not
//    announced. A control that looks actionable and does nothing has shipped
//    three times in this project already (§13); this one is inert BY
//    CONSTRUCTION rather than by intention.
//
// 2. Counts are blank on purpose. Subscriber count, view count and upload
//    date are not data this product has. Rendering a plausible "1.2M views"
//    would be the create route's estimated-percentage mistake in a new place,
//    so they render as marked blanks — visibly absent, never invented.
//
// The fold IS real, because folding is the thing worth judging.

import { useState } from "react";
import { Bookmark, Share2, ThumbsDown, ThumbsUp } from "lucide-react";

import { VideoThumbnail } from "@/components/ui/video-thumbnail";

import { VIDEO, type DescriptionCopy } from "./content";

/**
 * A value the destination shows and this product does not have.
 *
 * Dotted rather than blank so it reads as deliberately absent rather than as
 * a loading state that never resolved. The label goes to assistive tech,
 * where a bare dash would say nothing useful.
 */
function Blank({ label }: { label: string }) {
  return (
    <span
      className="border-b border-dashed border-xn-ink-faint text-xn-ink-faint"
      aria-label={`${label} — not available`}
    >
      &mdash;&mdash;
    </span>
  );
}

/** One piece of inert scenery in the engagement row. */
function FakeAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xn-pill bg-xn-surface-alt px-3.5 py-2 text-sm text-xn-ink-muted">
      {icon}
      {label}
    </span>
  );
}

export function YoutubeDescription({ copy }: { copy: DescriptionCopy }) {
  const [expanded, setExpanded] = useState(false);

  // Rendered into both the collapsed button and the expanded panel, so it is
  // a span rather than a paragraph — valid in either parent.
  const meta = (
    <span className="block text-sm font-semibold text-xn-ink">
      <Blank label="View count" /> views <Blank label="Upload date" />
    </span>
  );

  return (
    <div className="mx-auto w-full max-w-[720px]">
      {/* ── The player ──
          16:9 is the one proportion that makes this page recognisable before
          a single word is read, so it is the frame everything else hangs off.
          VideoThumbnail already owns the fallback and the duration badge.

          THE RATIO HAS TO SURVIVE THE WIDTH, not be asserted at one of them.
          VideoThumbnail takes a pixel height and fills its parent's width, so
          a fixed 405 is 16:9 only at exactly 720 wide — at 360 it rendered
          taller than it was wide. The wrapper owns the ratio instead, and
          `!h-full` is what overrides the component's INLINE height, which an
          ordinary class cannot do. */}
      <div className="aspect-video">
        <VideoThumbnail
          videoId={VIDEO.videoId}
          duration={VIDEO.duration}
          label="video"
          className="!h-full rounded-xn-lg"
        />
      </div>

      {/* ── Title ──
          Real data: the app fetches this today. */}
      <h2 className="mt-3.5 text-xl font-semibold leading-snug text-xn-ink">
        {VIDEO.title}
      </h2>

      {/* ── Channel row + engagement row ──
          Side by side when they fit, stacked when they do not.

          `sm:flex-wrap` is doing real work here and is not decoration. The
          breakpoint reads the VIEWPORT; what actually constrains this row is
          its CONTAINER, and the app shell takes a fixed 368px for the sidebar.
          At a 768px viewport the column is therefore 400px while the two
          groups need 572 — `sm:` had engaged and the engagement row ran 172px
          past the edge, clipped rather than scrolled.

          Wrapping fixes it at every width instead of moving the breakpoint to
          a number that happens to work for one sidebar. The groups keep
          `shrink-0` so they wrap intact rather than squashing. */}
      <div className="mt-3.5 flex flex-col gap-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* No avatar data exists, so the circle stays empty and dotted for
              the same reason the counts do. */}
          <span
            className="h-10 w-10 shrink-0 rounded-full border border-dashed border-xn-ink-faint"
            aria-label="Channel avatar — not available"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-xn-ink">{VIDEO.channel}</p>
            <p className="text-micro text-xn-ink-soft">
              <Blank label="Subscriber count" /> subscribers
            </p>
          </div>
          {/* The one high-contrast control on the page. `bg-xn-ink` is already
              black on light and white on dark, which is exactly the
              destination's treatment — no raw value needed. Inert like the
              rest of the scenery. */}
          <span
            className="ml-2 shrink-0 rounded-xn-pill bg-xn-ink px-4 py-2 text-sm font-medium text-xn-bg"
            aria-hidden="true"
          >
            Subscribe
          </span>
        </div>

        {/* ── Scenery ──
            `aria-hidden` on the wrapper takes the whole row out of the
            accessibility tree, and spans keep it out of the tab order. Both,
            not either: hiding it from a screen reader while leaving it
            tabbable would strand a keyboard user on an unlabelled stop. */}
        <div className="flex shrink-0 flex-wrap items-center gap-2" aria-hidden="true">
          <span className="inline-flex items-center overflow-hidden rounded-xn-pill bg-xn-surface-alt">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm text-xn-ink-muted">
              <ThumbsUp size={16} strokeWidth={1.75} />
              <Blank label="Like count" />
            </span>
            <span className="h-5 w-px bg-xn-border" />
            <span className="px-3.5 py-2 text-xn-ink-muted">
              <ThumbsDown size={16} strokeWidth={1.75} />
            </span>
          </span>
          <FakeAction icon={<Share2 size={16} strokeWidth={1.75} />} label="Share" />
          <FakeAction icon={<Bookmark size={16} strokeWidth={1.75} />} label="Save" />
        </div>
      </div>

      {/* ── The description box, and its fold ──
          The filled block that folds is the second thing that makes this page
          recognisable, after the 16:9.

          COLLAPSED, THE WHOLE BLOCK IS THE CONTROL. At the destination you do
          not aim for the word "more" — anywhere in the block opens it, and
          the block lights on hover to say so. That is most of why the first
          version read as a paragraph with a link under it rather than as the
          thing it is copying.

          Expanded it is ordinary content with one control at the end, because
          a block that contains its own controls cannot itself be a button.
          Two renderings rather than one wrapper with a conditional role: a
          `role` that changes under the user is worse than two honest states.

          The clamp is TWO LINES, which is what the destination shows — not
          the end of the opening paragraph. The prompt writes 2-3 sentences
          "above the fold" and two lines is reliably less, so what gets cut is
          visible here rather than after publishing.

          Everything inside the collapsed button is a span: `<p>` is not
          phrasing content and is invalid inside a button, even though React
          will happily render it. */}
      <div className="mt-4">
        {expanded ? (
          <div className="rounded-xn-md bg-xn-surface-alt p-3">
            {meta}
            <div className="mt-1.5 text-sm leading-relaxed text-xn-ink">
              <p>{copy.opening}</p>
              <p className="mt-4 font-semibold">In this video:</p>
              <ul className="mt-1.5 space-y-1">
                {copy.points.map((point) => (
                  <li key={point}>— {point}</li>
                ))}
              </ul>
              <p className="mt-4">{copy.closing}</p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-expanded={true}
              className="mt-3 rounded-xn-sm text-sm font-semibold text-xn-ink transition-colors duration-xn ease-xn hover:text-xn-ink-muted"
            >
              Show less
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-expanded={false}
            className="block w-full rounded-xn-md bg-xn-surface-alt p-3 text-left transition-colors duration-xn ease-xn hover:bg-xn-bg-deep"
          >
            {meta}
            {/* NO `block` HERE. `line-clamp-2` works by setting
                `display: -webkit-box`, and a `block` utility beside it
                overrides that display and silently disables the clamp — the
                class still emits `-webkit-line-clamp: 2`, which then governs
                nothing. It cost the fold on this very box during a rework and
                looked fine, because three unclamped lines still read as a
                folded description. Joins `outline-2` on the list of classes
                that resolve individually and fail together. */}
            <span className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-xn-ink">
              {copy.opening}
            </span>
            <span className="mt-1 block text-sm font-semibold text-xn-ink">...more</span>
          </button>
        )}
      </div>
    </div>
  );
}
