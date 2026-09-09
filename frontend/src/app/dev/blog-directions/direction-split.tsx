"use client";

// Direction D · Split  — revised
//
// Two panes. The post on the left at reading measure; the source on the right,
// permanently available. A pinned bar across the top carries the post's
// metadata and the section tracker.
//
// ── What changed in this revision, and why ──
//
// 1. The bar is PINNED. It used to scroll away with the content, which made
//    the section tracker useless the moment you were deep enough in the post
//    to want it. It now sticks to the top of the shell's scroller and the
//    content moves underneath it.
//
// 2. The metadata moved INTO that bar. "Blog post · 4 min read" used to sit
//    between the dek and the first heading, where it interrupted the one run
//    of text the page exists to present. It is not content, it is information
//    about the content, so it belongs on the furniture rather than in the
//    prose.
//
// 3. The progress bar is GONE. It reported how far through the video the
//    current section sat, which is a number nobody asked for on a page you
//    read rather than watch — and it was derived from scroll position, so it
//    was measuring the reader and presenting it as if it measured the video.
//
// 4. The transcript is REPLACED by Contents. See the trade below.
//
// ── The trade this revision makes ──
//
// The transcript pane was what made this direction structurally different
// from "the Reader direction with a video beside it": the sync ran both ways,
// so the source followed your reading and a transcript line could jump the
// post. Replacing it with Contents removes that, and with it the only reason
// this layout needed the YouTube iframe API.
//
// That is a real simplification and it costs the direction its invention. It
// also means Contents lives inside the source pane, so hiding the source
// hides the labelled navigation and leaves only the numbers in the bar. Both
// are noted for Hemanth rather than quietly absorbed.

import { useState } from "react";

import {
  MarkedText,
  POST,
  PlayGlyph,
  VIDEO,
  scrollToSection,
  timestamp,
  useActiveSection,
  type Block,
} from "./shared";
import { Chip } from "@/components/ui/chip";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";

const IDS = POST.sections.map((section) => section.id);

function Prose({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "para":
            return (
              <p key={index} className="mb-4 text-body text-xn-ink">
                <MarkedText text={block.text} />
              </p>
            );
          case "list":
            return (
              <ul key={index} className="mb-4 ml-4 list-disc space-y-1.5 text-body text-xn-ink marker:text-xn-ink-soft">
                {block.items.map((item) => (
                  <li key={item} className="pl-1">
                    <MarkedText text={item} />
                  </li>
                ))}
              </ul>
            );
          case "quote":
            // Filled in the FORMAT's colour rather than ruled with it. A 2px
            // rule was a label on the quote; a fill makes the quote itself the
            // coloured object, which is what "this passage is the format
            // speaking" should look like.
            //
            // `--xn-quote-fill` is set per theme in the harness — see the
            // note there. Two things had to change from the first version:
            // the format colour is mixed into the SURFACE rather than into
            // transparent, because a veil over a near-black ground keeps
            // almost none of its hue; and dark takes a heavier mix than light
            // to reach a comparable tint.
            //
            // It reads through a variable rather than being written here so
            // the two strengths sit next to each other in one place instead
            // of a theme conditional appearing inside a renderer.
            //
            // No MarkedText: the block is already the highlight. A second
            // colour struck through it would be two highlighters on one
            // sentence.
            return (
              <blockquote
                key={index}
                className="my-6 rounded-xn-md px-5 py-4 font-serif text-h4 leading-snug text-xn-ink"
                style={{ background: "var(--xn-quote-fill)" }}
              >
                {block.text}
              </blockquote>
            );
          case "code":
            return (
              <pre key={index} className="mb-4 overflow-x-auto rounded-xn-sm border border-xn-border bg-xn-bg-deep p-3.5 font-mono text-xs leading-relaxed text-xn-ink">
                {block.text}
              </pre>
            );
          case "table":
            return (
              <div key={index} className="mb-4 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {block.head.map((cell) => (
                        <th key={cell} className="border-b border-xn-border-strong py-2 pr-4 text-left font-medium text-xn-ink-muted">
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row) => (
                      <tr key={row[0]}>
                        {row.map((cell) => (
                          <td key={cell} className="border-b border-xn-border py-2 pr-4 text-xn-ink">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </>
  );
}

/**
 * Contents, ported from the Reader direction.
 *
 * Same rail-and-marker treatment: the active marker sits ON the hairline so
 * position reads as a point on a line rather than as a highlighted row. It is
 * a list of links, so it stays a <nav> — which is also the labelled
 * table-of-contents landmark the numbers in the bar cannot be.
 */
function Contents({ active }: { active: string }) {
  return (
    <nav aria-label="Contents" className="px-4 py-4">
      <p className="mb-3.5 font-mono text-micro uppercase tracking-widest text-xn-ink-soft">
        Contents
      </p>
      <ul className="border-l border-xn-border">
        {POST.sections.map((section) => {
          const current = section.id === active;
          return (
            <li key={section.id} className="relative">
              <span
                aria-hidden
                className={[
                  "absolute -left-px top-1/2 w-px -translate-y-1/2 transition-all duration-xn ease-xn",
                  current ? "h-7 bg-xn-fmt-blog" : "h-0 bg-transparent",
                ].join(" ")}
              />
              <button
                type="button"
                onClick={() => scrollToSection(section.id)}
                aria-current={current ? "true" : undefined}
                className={[
                  "block w-full py-2.5 pl-4 pr-1 text-left text-sm leading-snug transition-colors duration-xn ease-xn",
                  current ? "text-xn-ink" : "text-xn-ink-soft hover:text-xn-ink-muted",
                ].join(" ")}
              >
                {section.heading}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DirectionSplit() {
  const active = useActiveSection(IDS);
  const [open, setOpen] = useState(true);

  return (
    // Two halves of one fix, both against the shell's `py-6` on <main>.
    //
    // `-mt-6` here pulls the column up so the bar's RESTING position is flush
    // with the top of the scroller. `-top-6` on the bar itself moves its
    // PINNED position to match, because sticky `top: 0` pins to the scroll
    // container's content box, not its padding box — so `top: 0` alone drops
    // the bar 24px the instant it pins, and prose scrolls up through the gap
    // that opens above it. Measured before the fix: a paragraph rendering in
    // a 24px band over the pinned bar.
    //
    // With both, the bar never moves at all, which is what "in place" means.
    //
    // Both numbers are copies of a value the SHELL owns, so they go stale
    // silently if it ever changes its padding. The bar itself stays on the
    // page — see the note at the bottom — so the fix is to read that value
    // from one place, not to move the bar.
    <div className="mx-auto -mt-6 max-w-[1240px] px-6 pb-16 2xl:max-w-[1440px]">
      {/* ── The pinned bar ──
          Sticks to the top of the shell's scroller, so the section tracker is
          reachable from anywhere in the post rather than only from the top.
          The fill is SOLID: every slash-opacity form in this project's token
          namespace compiles to transparent, so a translucent bar would let
          prose show straight through as it scrolled under.

          `-mx-6` lets the fill and the rule span the column's padding, so the
          line reads as a full edge rather than a floating segment. */}
      {/* The sticky element starts at the top of the scroller and carries
          `pt-4` of plain background BEFORE the bar itself. That padding is
          what puts the bar on the menu close button's line — 16px below the
          header — and, because it is part of the sticky box, it is also what
          stops prose rendering in the gap it creates. A margin would have
          left that band transparent and let text scroll through it. */}
      <div className="sticky -top-6 z-30 -mx-6 bg-xn-bg px-6 pt-4">
        {/* `h-11` is 44px, which lands this row on exactly the same 72–116
            band as the menu's close button.

            An EXPLICIT height rather than padding, deliberately. It was
            `py-2`, which made 44 only because the tallest child happened to
            be 27 — so every later change to a control's size moved an
            alignment that has nothing to do with that control. Fixing the
            height means the contents can grow inside it and the bar stays on
            the button's line. It also centres them, which padding did not. */}
        <div className="flex h-11 items-center gap-4 border-b border-xn-border">
          {/* Format identity, off the page and onto the furniture. Chip and
              icon are both shipped components, so this is the same object
              history and the pickers use rather than anything drawn by hand.

              Only the PADDING is overridden. The chip's font size is the
              design system's and belongs to every chip in the app; nudging it
              here would either do nothing or change all of them. */}
          <Chip
            contentType="blog"
            icon={<ContentTypeIcon type="blog" size="sm" />}
            className="shrink-0 px-2.5 py-1"
          />

          {/* Section tracker. Numbers rather than names: it has to survive
              beside the metadata and the toggle at every width, and the
              labelled version of this list is Contents in the pane. */}
          <nav
            aria-label="Sections"
            className="flex min-w-0 flex-1 justify-center gap-1 overflow-x-auto"
          >
            {POST.sections.map((entry, index) => {
              const current = entry.id === active;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => scrollToSection(entry.id)}
                  aria-current={current ? "true" : undefined}
                  aria-label={entry.heading}
                  className={[
                    "shrink-0 rounded-xn-pill px-3 py-1.5 font-mono text-xs transition-colors duration-xn ease-xn",
                    current
                      ? "bg-xn-ink text-xn-bg"
                      : "text-xn-ink-soft hover:bg-xn-surface-alt hover:text-xn-ink-muted",
                  ].join(" ")}
                >
                  {String(index + 1).padStart(2, "0")}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="shrink-0 rounded-xn-pill border border-xn-border px-3.5 py-1.5 text-sm text-xn-ink-muted transition-colors duration-xn ease-xn hover:border-xn-border-strong hover:text-xn-ink"
          >
            {open ? "Hide source" : "Show source"}
          </button>
        </div>
      </div>

      <div
        className={[
          "grid gap-10 pt-10",
          // The pane grows ONLY where there is room to grow into, and the
          // percentage is what makes that true.
          //
          // Measured at 1280 with the menu expanded: the reading column is
          // 532px against a `max-w-measure` of 700 — already 24% under its
          // own token. A flat 400px pane took another 60px off that, so
          // "use the space on the right" came straight out of the prose.
          //
          // Breakpoints could not fix it, and the attempt is worth recording:
          // `xl:` fires on VIEWPORT width, but the menu eats 256px before
          // this container sees any of it, so at a 1280 viewport the grid
          // has only ~976 to divide and a 1280-keyed breakpoint widens the
          // pane exactly when there is least room. Measured: prose 532 → 472.
          //
          // A percentage in a grid track resolves against the GRID, which is
          // the width that actually matters. The pane now holds at its 340
          // floor while the container is tight and grows only once the
          // container itself is wide.
          open
            ? "lg:grid-cols-[minmax(0,1fr)_clamp(340px,32%,450px)]"
            : "lg:grid-cols-1",
        ].join(" ")}
      >
        {/* ── Reading pane ──
            The column does not MOVE when the source is hidden, it widens.

            It used to become `mx-auto max-w-measure`, which re-centred the
            whole post: every line you were reading jumped left, and the space
            the pane gave up turned into two margins instead of being used.
            Hiding a side panel should not relayout the thing you are reading.

            So the left edge is fixed in both states and only the cap changes.
            820 is roughly 75 characters against the 64 the measure token
            specifies — a deliberate, small overshoot, taken because the
            alternative is a third of the width sitting empty. It is nowhere
            near the ~88 that `output-view.tsx` records as a bad trade. */}
        <article className="min-w-0">
          <div className={open ? "max-w-measure" : "max-w-[820px]"}>
            <h1 className="font-serif text-h1 leading-tight text-xn-ink">{POST.title}</h1>
            <p className="mt-4 text-h5 leading-snug text-xn-ink-muted">{POST.dek}</p>

            <div className="mt-10">
              {POST.sections.map((entry) => (
                <section key={entry.id} id={entry.id} className="mb-10 scroll-mt-20">
                  <h2 className="mb-4 font-serif text-h3 leading-tight text-xn-ink">
                    {entry.heading}
                  </h2>
                  <Prose blocks={entry.blocks} />
                </section>
              ))}
            </div>
          </div>
        </article>

        {/* ── Source pane ── */}
        {open && (
          <aside className="hidden lg:block">
            {/* Sticks BELOW the pinned bar, not under it. */}
            <div className="sticky top-[76px]">
              <div className="overflow-hidden rounded-xn-lg border border-xn-border bg-xn-surface">
                <a
                  href={VIDEO.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block"
                  aria-label={`Watch “${VIDEO.title}” on YouTube`}
                >
                  {/* 225 rather than 190: it is 16:9 at the pane's xl width,
                      so the crop is right in the middle of the range the pane
                      now spans rather than correct only at its narrowest. */}
                  <VideoThumbnail videoId={VIDEO.videoId} height={225} label="youtube" />
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-xn-ink text-xn-bg transition-transform duration-xn ease-xn group-hover:scale-105">
                      <PlayGlyph className="ml-0.5 h-4 w-4" />
                    </span>
                  </span>
                </a>

                <div className="border-b border-xn-border px-4 py-3.5">
                  <p className="line-clamp-2 text-sm leading-snug text-xn-ink">{VIDEO.title}</p>
                  <p className="mt-1.5 font-mono text-micro text-xn-ink-soft">
                    {VIDEO.channel} · {timestamp(VIDEO.durationSeconds)}
                  </p>
                </div>

                <Contents active={active} />
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

// ── A note for whoever ports this ──
//
// THE PINNED BAR STAYS ON THE PAGE. Decided by Hemanth, and it settles a
// question this file previously answered the other way.
//
// The argument for moving it was that a bar pinning to the top of the
// scroller is furniture, and the `-mt-6` above — a page cancelling the
// shell's own padding — is a page doing the layout's job. That reasoning was
// sound about the coupling and wrong about the conclusion, because it only
// considered this page. The topbar is dynamic per page and already has more
// claimants than it has room for; this bar's four controls are not competing
// for that space on equal terms with things that have nowhere else to go.
// If the topbar turns out to have room once those are placed, moving these
// controls up is a later question, not a precondition for porting.
//
// So port it as it stands: a strip inside the route.
//
// What DOES need attention, because it is a real coupling either way:
// `-mt-6` and `-top-6` both encode the shell's `py-6` on <main>. They break
// silently the day that padding changes — the bar drops 24px and prose
// scrolls through the gap above it, which is what the measurement in the
// comment beside them found the first time. Read the value from one place
// rather than copying the number into two.
//
// Also: lime is two literals in shared.tsx, not a token. It should become an
// `--xn-mark-lime` pair alongside the five in globals.css, and the stroke
// belongs with the `.mark-*` utilities rather than inline here.
