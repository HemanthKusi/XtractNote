"use client";

// Direction A · Reader
//
// The card is gone and the page IS the document.
//
// ── The argument ──
//
// A blog post is the one output people actually READ, start to finish. Every
// other surface in the app is something you scan — history rows, folder
// shelves, format tiles. Putting long prose in the same bordered rectangle as
// those says it is another thing to scan, and it inherits their width, which
// is how the column ended up at 960 with ~88 characters a line.
//
// So: no border, no fill, no header strip. The prose sits at `max-w-measure`
// (64ch, the token literally named "generated content") on the page's own
// background, and the only furniture is an index in the left margin.
//
// ── Why the index is a margin rail rather than a box ──
//
// It is a wayfinding aid, not content. Given a border and a fill it becomes a
// second column competing with the thing it indexes; as marks in the margin
// it reads as an annotation on the page. The active marker is the only solid
// element, which is what makes position legible at a glance.

import {
  CopyGlyph,
  MarkedText,
  POST,
  READ_MINUTES,
  VIDEO,
  WORD_COUNT,
  scrollToSection,
  timestamp,
  useActiveSection,
  type Block,
} from "./shared";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";

const IDS = POST.sections.map((section) => section.id);

function Prose({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "para":
            return (
              <p key={index} className="mb-5 text-body text-xn-ink">
                <MarkedText text={block.text} />
              </p>
            );
          case "list":
            return (
              <ul key={index} className="mb-5 space-y-2 text-body text-xn-ink">
                {block.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    {/* A rule rather than a bullet: at this measure a disc
                        pulls the eye to the left edge on every line. */}
                    <span aria-hidden className="mt-[0.7em] h-px w-4 shrink-0 bg-xn-border-strong" />
                    <span>
                      <MarkedText text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote
                key={index}
                className="my-8 border-l-2 border-xn-fmt-blog pl-5 font-serif text-h4 leading-snug text-xn-ink"
              >
                {block.text}
              </blockquote>
            );
          case "code":
            return (
              <pre
                key={index}
                className="mb-5 overflow-x-auto rounded-xn-md bg-xn-bg-deep p-4 font-mono text-xs leading-relaxed text-xn-ink"
              >
                {block.text}
              </pre>
            );
          case "table":
            return (
              <div key={index} className="mb-5 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {block.head.map((cell) => (
                        <th
                          key={cell}
                          className="border-b border-xn-border-strong py-2 pr-4 text-left font-medium text-xn-ink-muted"
                        >
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

export function DirectionReader() {
  const active = useActiveSection(IDS);

  return (
    <div className="mx-auto max-w-[1080px] px-6 py-14">
      <div className="grid gap-14 lg:grid-cols-[168px_minmax(0,1fr)]">
        {/* ── The margin index ──
            Sticky, so it stays with the reader. Hidden below lg, where the
            column it sits beside has already given up its margins. */}
        <nav aria-label="Sections" className="hidden lg:block">
          <div className="sticky top-8">
            <p className="mb-4 font-mono text-nano uppercase tracking-widest text-xn-ink-soft">
              Contents
            </p>
            <ul className="space-y-1 border-l border-xn-border">
              {POST.sections.map((section) => {
                const current = section.id === active;
                return (
                  <li key={section.id} className="relative">
                    {/* The active marker sits ON the rail, overlapping it, so
                        position reads as a point on a line rather than as a
                        highlighted row. */}
                    <span
                      aria-hidden
                      className={[
                        "absolute -left-px top-1/2 w-px -translate-y-1/2 transition-all duration-xn ease-xn",
                        current ? "h-5 bg-xn-fmt-blog" : "h-0 bg-transparent",
                      ].join(" ")}
                    />
                    <button
                      type="button"
                      onClick={() => scrollToSection(section.id)}
                      aria-current={current ? "true" : undefined}
                      className={[
                        "block w-full py-1.5 pl-4 pr-1 text-left text-xs leading-snug transition-colors duration-xn ease-xn",
                        current
                          ? "text-xn-ink"
                          : "text-xn-ink-soft hover:text-xn-ink-muted",
                      ].join(" ")}
                    >
                      {section.heading}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* ── The document ── */}
        <article className="max-w-measure">
          <h1 className="font-serif text-display leading-tight text-xn-ink">
            {POST.title}
          </h1>
          <p className="mt-5 text-h5 leading-snug text-xn-ink-muted">{POST.dek}</p>

          {/* Metadata as one quiet line, not a strip of chips. A dot in the
              format's own colour is the entire per-format identity here —
              enough to place it, not enough to decorate it. */}
          <p className="mt-6 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-micro text-xn-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-xn-fmt-blog" />
              Blog post
            </span>
            <span aria-hidden>·</span>
            <span>{READ_MINUTES} min read</span>
            <span aria-hidden>·</span>
            <span>{WORD_COUNT.toLocaleString()} words</span>
          </p>

          {/* The source, as a rule with a thumbnail on it. It has to be here —
              this text did not come from nowhere — but it is not the subject,
              so it gets a hairline and no box. */}
          <a
            href={VIDEO.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-8 flex items-center gap-3 border-y border-xn-border py-3 transition-colors duration-xn ease-xn hover:border-xn-border-strong"
          >
            <div className="w-[72px] shrink-0">
              <VideoThumbnail videoId={VIDEO.videoId} height={40} label="youtube" />
            </div>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-xn-ink group-hover:underline">
                {VIDEO.title}
              </span>
              <span className="block font-mono text-micro text-xn-ink-soft">
                {VIDEO.channel} · {timestamp(VIDEO.durationSeconds)}
              </span>
            </span>
          </a>

          <div className="mt-12">
            {POST.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-8">
                <h2 className="mb-4 mt-12 font-serif text-h3 leading-tight text-xn-ink first:mt-0">
                  {section.heading}
                </h2>
                <Prose blocks={section.blocks} />
              </section>
            ))}
          </div>

          {/* One action, at the end, where someone who has finished reading
              is. The full action set lives in the topbar on the real route. */}
          <div className="mt-14 border-t border-xn-border pt-6">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xn-pill border border-xn-border px-4 py-2 text-sm text-xn-ink-muted transition-colors duration-xn ease-xn hover:border-xn-border-strong hover:text-xn-ink"
            >
              <CopyGlyph className="h-3.5 w-3.5" />
              Copy post
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
