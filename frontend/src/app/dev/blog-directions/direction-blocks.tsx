"use client";

// Direction C · Blocks
//
// The post is a stack of blocks. It reads as a document and behaves as an
// editor: hover a block and it offers what you can do to that block.
//
// ── The invention: the measure is PER BLOCK, not per page ──
//
// output-view.tsx records an unresolved trade — the column is 960 so the card
// matches history and folders, which puts prose at ~88 characters a line
// against a scale specifying 64. The file itself names the fix: "cap the
// prose renderer alone rather than narrow the card".
//
// This direction takes that literally and goes one step further. There is no
// single column width. Body copy sits at 64ch because that is what prose
// wants. A table gets the full 960 because a table squeezed to 64ch wraps
// every cell. A pull-quote goes wider still because it is a graphic element,
// not something you read a paragraph of. The page has a spine, and blocks
// break out of it when their content earns the width.
//
// The trade is that the left edge is no longer constant, so the eye has more
// work to do. Everything is centred on one axis to keep that cost down.
//
// ── Why the index is a sticky bar rather than a margin ──
//
// This layout has no margin to put it in — blocks use the full width. A bar
// that sticks to the top of the scroller is the honest answer, and it doubles
// as the thing that tells you the page is still a sequence of sections when
// the blocks themselves are visually independent.

import { useState } from "react";

import {
  CopyGlyph,
  MarkedText,
  POST,
  READ_MINUTES,
  RegenerateGlyph,
  VIDEO,
  WORD_COUNT,
  scrollToSection,
  useActiveSection,
  type Block,
} from "./shared";

const IDS = POST.sections.map((section) => section.id);

/** How wide each kind of block wants to be. This is the whole direction. */
function widthFor(block: Block): string {
  switch (block.kind) {
    case "para":
    case "list":
      return "max-w-measure";
    case "quote":
      // Wider than prose and narrower than a table: it is read, but it is
      // read as a display element rather than as body copy.
      return "max-w-[760px]";
    case "table":
    case "code":
      return "max-w-wide";
  }
}

function BlockBody({ block }: { block: Block }) {
  switch (block.kind) {
    case "para":
      return (
        <p className="text-body text-xn-ink">
          <MarkedText text={block.text} />
        </p>
      );
    case "list":
      return (
        <ul className="space-y-2 text-body text-xn-ink">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3">
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
        <p className="text-center font-serif text-h2 leading-tight text-xn-ink">
          “{block.text}”
        </p>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-xn-md border border-xn-border bg-xn-bg-deep p-4 font-mono text-xs leading-relaxed text-xn-ink">
          {block.text}
        </pre>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-xn-md border border-xn-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-xn-surface-alt">
                {block.head.map((cell) => (
                  <th key={cell} className="px-4 py-2.5 text-left font-medium text-xn-ink-muted">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row[0]} className="border-t border-xn-border">
                  {row.map((cell) => (
                    <td key={cell} className="px-4 py-2.5 text-xn-ink">
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
}

export function DirectionBlocks() {
  const active = useActiveSection(IDS);
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="pb-20">
      {/* ── The sticky index ──
          Sits at the top of the scroller, with a SOLID fill. A translucent
          one was the first instinct, but every slash-opacity form in this
          project's token namespace compiles to transparent: the colours are
          bare CSS variables declared without Tailwind's alpha placeholder, so
          the alpha variant is never generated and the class silently does
          nothing. Solid is what these tokens can actually express. */}
      <div className="sticky top-0 z-20 -mx-8 border-b border-xn-border bg-xn-bg px-8">
        <nav aria-label="Sections" className="flex gap-1 overflow-x-auto py-2.5">
          {POST.sections.map((section, index) => {
            const current = section.id === active;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                aria-current={current ? "true" : undefined}
                className={[
                  "shrink-0 rounded-xn-pill px-3 py-1.5 text-xs transition-colors duration-xn ease-xn",
                  current
                    ? "bg-xn-ink text-xn-bg"
                    : "text-xn-ink-soft hover:bg-xn-surface-alt hover:text-xn-ink",
                ].join(" ")}
              >
                <span className="mr-1.5 font-mono opacity-60">{String(index + 1).padStart(2, "0")}</span>
                {section.heading}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Masthead ── */}
      <header className="mx-auto max-w-measure pb-4 pt-14">
        <h1 className="font-serif text-display leading-tight text-xn-ink">{POST.title}</h1>
        <p className="mt-5 text-h5 leading-snug text-xn-ink-muted">{POST.dek}</p>
        <p className="mt-6 font-mono text-micro text-xn-ink-soft">
          <span className="text-xn-fmt-blog">Blog post</span> · {READ_MINUTES} min ·{" "}
          {WORD_COUNT.toLocaleString()} words · from {VIDEO.channel}
        </p>
      </header>

      {/* ── The blocks ── */}
      {POST.sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-16">
          <h2 className="mx-auto mb-6 mt-14 max-w-measure font-serif text-h3 leading-tight text-xn-ink">
            {section.heading}
          </h2>

          {section.blocks.map((block, index) => {
            const key = `${section.id}-${index}`;
            const lit = hovered === key;
            return (
              <div
                key={key}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
                className="group relative mb-6"
              >
                <div
                  className={[
                    "mx-auto rounded-xn-md px-4 py-3 transition-colors duration-xn ease-xn",
                    widthFor(block),
                    lit ? "bg-xn-surface-alt" : "bg-transparent",
                  ].join(" ")}
                >
                  <BlockBody block={block} />
                </div>

                {/* Actions ride outside the block's own width, pinned to the
                    page rather than to the block, so they land in the same
                    place whatever width the block chose. */}
                <div
                  className={[
                    "pointer-events-none absolute right-0 top-2 hidden gap-1 transition-opacity duration-xn ease-xn xl:flex",
                    lit ? "pointer-events-auto opacity-100" : "opacity-0",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    aria-label="Copy block"
                    className="rounded-xn-sm border border-xn-border bg-xn-surface p-1.5 text-xn-ink-soft shadow-xn-1 transition-colors duration-xn ease-xn hover:text-xn-ink"
                  >
                    <CopyGlyph className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Regenerate block"
                    className="rounded-xn-sm border border-xn-border bg-xn-surface p-1.5 text-xn-ink-soft shadow-xn-1 transition-colors duration-xn ease-xn hover:text-xn-ink"
                  >
                    <RegenerateGlyph className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
