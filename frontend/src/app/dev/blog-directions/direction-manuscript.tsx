"use client";

// Direction B · Manuscript
//
// Prose down the middle, a margin rail on the right carrying artefacts
// anchored to the section they belong to, numbers down the left.
//
// ── The invention: per-section provenance ──
//
// This text came from somewhere specific. Today the whole post carries one
// "generated from this video" link and the mapping stops there. If a section
// knows its own transcript range, the margin can show WHERE each passage came
// from, and hovering a section can light up its source — which turns the
// output from a thing the model produced into a thing you can check.
//
// The timestamps here are AUTHORED. Nothing maps generated prose back to a
// transcript range today; see the note in shared.tsx. This direction is the
// question "is that worth building?" asked as a layout rather than in words.
//
// ── Why each section is its own grid rather than one big one ──
//
// Artefacts have to sit beside the passage they describe, and stay there as
// prose reflows. Absolute positioning against measured offsets is how you get
// a margin that drifts a paragraph out of alignment the moment a font loads.
// One grid per section makes the alignment structural: the margin cell is a
// sibling of the prose cell, so it cannot fall out of step.
//
// ── On the numbers ──
//
// The discard list warns off numbered markers "as a reflex". They earn their
// place here: a post is read in order, the numbers give the margin a spine to
// hang off, and they are what makes a jump target legible in a rail this
// quiet. They are not decoration on an unordered set.

import { useState } from "react";

import {
  CopyGlyph,
  MarkedText,
  POST,
  READ_MINUTES,
  RegenerateGlyph,
  VIDEO,
  cuesFor,
  scrollToSection,
  timestamp,
  useActiveSection,
  type Block,
  type Section,
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
            return (
              <blockquote key={index} className="my-6 font-serif text-h4 leading-snug text-xn-ink">
                {block.text}
              </blockquote>
            );
          case "code":
            return (
              <pre
                key={index}
                className="mb-4 overflow-x-auto rounded-xn-sm border border-xn-border bg-xn-bg-deep p-3.5 font-mono text-xs leading-relaxed text-xn-ink"
              >
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

/** The margin cell for one section: where it came from, and what you can do to it. */
function Margin({ section, lit }: { section: Section; lit: boolean }) {
  const cues = cuesFor(section);

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-8">
        <a
          href={`${VIDEO.url}&t=${section.from}s`}
          target="_blank"
          rel="noopener noreferrer"
          className={[
            "inline-flex items-center gap-1.5 rounded-xn-sm px-1.5 py-1 font-mono text-micro transition-colors duration-xn ease-xn",
            lit ? "bg-xn-surface-alt text-xn-ink" : "text-xn-ink-soft hover:text-xn-ink-muted",
          ].join(" ")}
        >
          <span
            aria-hidden
            className={[
              "h-1.5 w-1.5 rounded-full transition-colors duration-xn ease-xn",
              lit ? "bg-xn-fmt-blog" : "bg-xn-border-strong",
            ].join(" ")}
          />
          {timestamp(section.from)} – {timestamp(section.to)}
        </a>

        {/* The transcript line this passage sits on. One cue, not the whole
            range: the margin is a reference, not a second document. */}
        {cues[0] && (
          <p className="mt-2 border-l border-xn-border pl-2.5 text-xs leading-snug text-xn-ink-soft">
            “{cues[0].text}”
          </p>
        )}

        {/* Per-section actions. Revealed on hover of the section, because a
            set of buttons beside every heading at rest is six sets of buttons
            on the page. */}
        <div
          className={[
            "mt-3 flex gap-1 transition-opacity duration-xn ease-xn",
            lit ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          <button
            type="button"
            aria-label={`Copy “${section.heading}”`}
            className="rounded-xn-sm p-1.5 text-xn-ink-soft transition-colors duration-xn ease-xn hover:bg-xn-surface-alt hover:text-xn-ink"
          >
            <CopyGlyph className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Regenerate “${section.heading}”`}
            className="rounded-xn-sm p-1.5 text-xn-ink-soft transition-colors duration-xn ease-xn hover:bg-xn-surface-alt hover:text-xn-ink"
          >
            <RegenerateGlyph className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function DirectionManuscript() {
  const active = useActiveSection(IDS);
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-14">
      {/* ── Masthead ── */}
      <header className="grid gap-8 lg:grid-cols-[40px_minmax(0,1fr)_220px]">
        <div aria-hidden className="hidden lg:block" />
        <div className="max-w-measure">
          <h1 className="font-serif text-h1 leading-tight text-xn-ink">{POST.title}</h1>
          <p className="mt-4 text-h5 leading-snug text-xn-ink-muted">{POST.dek}</p>
          <p className="mt-5 font-mono text-micro text-xn-ink-soft">
            Blog post · {READ_MINUTES} min · {POST.sections.length} sections
          </p>
        </div>
        <aside className="hidden lg:block">
          <div className="overflow-hidden rounded-xn-md border border-xn-border">
            <VideoThumbnail videoId={VIDEO.videoId} height={124} label="youtube" />
          </div>
          <p className="mt-2 text-xs leading-snug text-xn-ink-muted">{VIDEO.title}</p>
          <p className="font-mono text-micro text-xn-ink-soft">{VIDEO.channel}</p>
        </aside>
      </header>

      {/* ── Sections ── */}
      <div className="mt-14">
        {POST.sections.map((section, index) => {
          const lit = hovered === section.id || (hovered === null && active === section.id);
          return (
            <div
              key={section.id}
              id={section.id}
              onMouseEnter={() => setHovered(section.id)}
              onMouseLeave={() => setHovered(null)}
              className="grid scroll-mt-8 gap-8 border-t border-xn-border py-10 lg:grid-cols-[40px_minmax(0,1fr)_220px]"
            >
              {/* The number, and the jump target. A button rather than a
                  label: it is the only affordance in this column, and the
                  index in this direction IS the margin. */}
              <div className="hidden lg:block">
                <button
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  aria-label={`Jump to “${section.heading}”`}
                  className={[
                    "font-mono text-sm transition-colors duration-xn ease-xn",
                    lit ? "text-xn-fmt-blog" : "text-xn-ink-faint hover:text-xn-ink-muted",
                  ].join(" ")}
                >
                  {String(index + 1).padStart(2, "0")}
                </button>
              </div>

              <div className="max-w-measure">
                <h2 className="mb-4 font-serif text-h3 leading-tight text-xn-ink">
                  {section.heading}
                </h2>
                <Prose blocks={section.blocks} />
              </div>

              <Margin section={section} lit={lit} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
