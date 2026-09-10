"use client";

// src/app/dev/output-blocks/blocks.tsx
//
// The block vocabulary: nine renderers and the inline parser they share.
// Not shipped.
//
// ── Why maths is rendered directly rather than through the markdown pipeline ──
//
// The shipped renderer pipes one markdown string through react-markdown, which
// is why the usual answer to maths is `remark-math` + `rehype-katex`. This
// specimen renders a TYPED BLOCK UNION instead, which is the contract §16 says
// the backend should produce — so a `math` block already carries its LaTeX as
// data and there is no markdown to walk. `katex.renderToString` is enough, and
// two packages that exist to bridge markdown are not needed.
//
// ── Two KaTeX options that are not defaults for style reasons ──
//
//   trust: false        blocks \href, \includegraphics and friends. It is
//                       KaTeX's default and it stays, because this LaTeX will
//                       be MODEL-GENERATED and is therefore untrusted input.
//   throwOnError: false a malformed formula renders in red, in place, rather
//                       than throwing. A model will eventually emit broken
//                       LaTeX; the page must survive it and show which formula
//                       is wrong.

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

import type { Block, Doc, Reference } from "./content";

// ── Equation numbering ──────────────────────────────────────

/**
 * Assign equation numbers in document order.
 *
 * Numbering has to be a whole-document pass rather than a per-block decision,
 * because a derivation in section three needs to know how many equations came
 * before it. Only equations that can be REFERRED to get a number: a display
 * formula gets one when it carries an id, and every derivation step gets one,
 * since a step nobody can cite is a step nobody can check.
 */
export function numberEquations(doc: Doc): Map<string, number> {
  const numbers = new Map<string, number>();
  let n = 0;

  const walk = (blocks: Block[]) => {
    for (const block of blocks) {
      if (block.kind === "math" && block.id) numbers.set(block.id, ++n);
      else if (block.kind === "derivation") {
        for (const step of block.steps) numbers.set(step.id, ++n);
      } else if (block.kind === "example") walk(block.blocks);
    }
  };

  for (const section of doc.sections) walk(section.blocks);
  return numbers;
}

// ── The equation number ─────────────────────────────────────
//
// A right-aligned number on its own was not findable. It sat in the same
// margin as everything else and nothing connected it to the formula it
// belonged to, so at a glance the formula looked unnumbered.
//
// A leader line with an arrowhead fixes that by making the relationship
// explicit rather than positional: the eye follows the rule out of the
// formula and lands on the number.
//
// ── The arrow alone did not fix it, and the reason is the layout ──
//
// The first version drew the arrow but left the number in a `flex-1` row, so
// it stayed pinned to the block's RIGHT EDGE. The arrow then spanned whatever
// distance happened to be left over — wide on a short formula, narrow on a
// long one, and moving whenever the column resized. An arrow across a gap
// that large reads as pointing at the margin, not at a number.
//
// The number now sits directly after the formula at a FIXED distance, so the
// relationship is stable at any width.
//
// ── But the formula still centres, and the second attempt broke that ──
//
// Centring the formula and its number together as one flex group did hold the
// gap — and it also stopped the formula being centred, because the group was
// centred instead, offsetting the maths left by half the number's width. The
// formula should keep behaving exactly as it did: centred in the block, free
// to move as the column resizes.
//
// So the number is positioned against the formula's own right edge rather
// than laid out beside it. The formula centres on its own, unaware of the
// number, and the number follows at a constant distance.

function EqNumber({ n }: { n: number | undefined }) {
  if (!n) return null;
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xn-ink-soft">
      <svg viewBox="0 0 76 8" className="h-2 w-[76px]" aria-hidden="true">
        <path d="M0 4h69" stroke="currentColor" strokeWidth="1" />
        <path d="M69 1.5 74.5 4 69 6.5z" fill="currentColor" />
      </svg>
      <span className="font-mono text-sm tabular-nums">({n})</span>
    </span>
  );
}

/**
 * The label on a derivation or a worked example.
 *
 * Both boxes had `text-micro` in `ink-soft`, which is the treatment used for
 * ambient metadata — a timestamp, a channel name. That was wrong here: this
 * label says what the box IS, and a reader who cannot find it does not know
 * whether they are looking at an example or an aside. One step up in size and
 * two in contrast, and it is one component so the two boxes cannot drift.
 */
function BoxTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3.5 font-mono text-xs uppercase tracking-wide text-xn-ink-muted">
      {children}
    </p>
  );
}

// ── Rendering context ───────────────────────────────────────

// ── Two settled decisions, 2026-09-09 ──
//
// Both were dials in the harness and both are now Hemanth's answer, so they
// are hardcoded. A control that offers a choice already made is a question the
// next reader has to re-ask.
//
// CITATIONS are square brackets around a lowercase roman numeral — `[iii]`.
// Chosen over a raised superscript, which went too quiet to read or click, and
// over `(Vaswani 2017)`, which is self-describing but repeats badly when one
// paragraph cites four times. Brackets sit on the baseline at near-reading
// size, so they are legible and clickable without magnifying.
//
// TABLES sit on `--xn-surface`, the same ground as the derivation and worked
// example boxes. The question that dial existed to answer was whether all
// three containers sharing a surface reads as consistent or as heavy; on the
// research document, where a table sits a few blocks from a derivation, it
// reads as consistent.

export interface RenderCtx {
  eq: Map<string, number>;
  refs: Reference[];
  activeCite: string | null;
  onCite: (id: string) => void;
}

/**
 * Citations are numbered in ROMAN, equations in Arabic.
 *
 * Both were Arabic and both appear in the same paragraph, so "(3)" beside a
 * formula and "[3]" in the sentence above it looked like the same reference
 * twice. They are not even the same KIND of thing — one points into the
 * document, the other out of it — and nothing in the type said so.
 *
 * Different numeral systems separate them at a glance, before reading, which
 * is the only point at which the confusion happens. Lowercase, because that
 * is the convention for a citation or footnote marker and because uppercase
 * roman is heavy enough to compete with the prose.
 */
export function toRoman(n: number): string {
  const table: [number, string][] = [
    [1000, "m"], [900, "cm"], [500, "d"], [400, "cd"],
    [100, "c"], [90, "xc"], [50, "l"], [40, "xl"],
    [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
  ];
  let out = "";
  let rest = n;
  for (const [value, numeral] of table) {
    while (rest >= value) {
      out += numeral;
      rest -= value;
    }
  }
  return out;
}

// ── Maths ───────────────────────────────────────────────────

function Tex({ tex, display }: { tex: string; display?: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        displayMode: !!display,
        throwOnError: false,
        trust: false,
        strict: false,
      });
    } catch {
      // renderToString should not throw with throwOnError false, but a
      // catastrophic input should still not take the page down.
      return "";
    }
  }, [tex, display]);

  if (!html) {
    return (
      <code className="rounded-xn-sm bg-xn-danger-soft px-1.5 py-0.5 font-mono text-xs text-xn-danger">
        {tex}
      </code>
    );
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

// ── Inline parsing ──────────────────────────────────────────
//
// Four markers, each resolving against something different, which is why they
// are four markers and not one escape:
//
//   ==phrase==     a highlight — resolves against nothing, it is presentation
//   $x^2$          maths       — resolves against KaTeX
//   [@vaswani17]   citation    — resolves against the document's references
//   [#eq-scaling]  equation    — resolves against the numbering pass
//
// A single alternation keeps them in one pass so a citation inside a
// highlighted phrase still renders as a citation.

const INLINE = /(==[^=]+==|\$[^$\n]+\$|\[@[A-Za-z0-9_-]+\]|\[#[A-Za-z0-9_-]+\])/g;

/** Copied from the blog specimen deliberately — see the note at the bottom. */
const MARK_STYLE = {
  backgroundColor: "var(--xn-hl)",
  color: "var(--xn-hl-ink)",
  maskImage: `url("data:image/svg+xml,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 24' preserveAspectRatio='none'><path d='M0,3.4 C14,5.2 30,1.9 43,3.4 C57,4.9 74,1.6 88,3.1 C94,3.8 97,2.1 100,3.6 L100,21.0 C87,23.2 69,20.2 54,21.7 C39,23.1 21,20.4 8,22.2 C4,22.7 2,21.2 0,22.0 Z' fill='#000'/></svg>",
  )}")`,
  maskSize: "100% 100%",
  WebkitMaskSize: "100% 100%",
  maskRepeat: "no-repeat",
  padding: "0.16em 0.3em",
  margin: "0 -0.16em",
  boxDecorationBreak: "clone",
  WebkitBoxDecorationBreak: "clone",
} as const;

export function Inline({ text, ctx }: { text: string; ctx: RenderCtx }) {
  const parts = text.split(INLINE);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("==") && part.endsWith("==") && part.length > 4) {
          return (
            <mark key={i} className="bg-transparent" style={MARK_STYLE}>
              <Inline text={part.slice(2, -2)} ctx={ctx} />
            </mark>
          );
        }
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          return <Tex key={i} tex={part.slice(1, -1)} />;
        }
        if (part.startsWith("[@")) {
          const id = part.slice(2, -1);
          const index = ctx.refs.findIndex((r) => r.id === id);
          if (index < 0) return part;
          const ref = ctx.refs[index];
          const current = ctx.activeCite === id;

          // Baseline, near-reading size, monospace. It occupies real space in
          // the line instead of hovering above it, which is what makes it both
          // readable and clickable without magnifying. See the settled-decision
          // note above for what this was chosen over.
          //
          // The accessible name stays Arabic: a screen reader announcing
          // "source eye eye eye" helps nobody.
          return (
            <button
              key={i}
              type="button"
              onClick={() => ctx.onCite(id)}
              aria-label={`Source ${index + 1}: ${ref.title}`}
              className={[
                "mx-px cursor-pointer rounded-[3px] px-[2px] font-mono text-[0.85em]",
                "transition-colors duration-xn ease-xn",
                current ? "bg-xn-ink text-xn-bg" : "text-xn-ink-muted hover:text-xn-ink",
              ].join(" ")}
            >
              [{toRoman(index + 1)}]
            </button>
          );
        }
        if (part.startsWith("[#")) {
          const n = ctx.eq.get(part.slice(2, -1));
          // An unresolved reference renders as a visible gap rather than a
          // number, so a broken link is obvious instead of plausible.
          return (
            <span key={i} className="font-mono text-xn-ink-muted">
              {n ? `(${n})` : "(?)"}
            </span>
          );
        }
        // Minimal bold, so list items can emphasise a term without a parser.
        if (part.includes("**")) {
          return (
            <span key={i}>
              {part.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
                seg.startsWith("**") && seg.endsWith("**") ? (
                  <strong key={j} className="font-semibold text-xn-ink">
                    {seg.slice(2, -2)}
                  </strong>
                ) : (
                  seg
                ),
              )}
            </span>
          );
        }
        return part;
      })}
    </>
  );
}

// ── Per-block width ─────────────────────────────────────────

/**
 * How wide each block wants to be — direction C's rule, folded in.
 *
 * Prose holds the reading measure. Everything you PARSE rather than read gets
 * more room: a derivation with a note column, a four-column table, a code
 * block. Squeezing those to 64ch is what makes technical output unreadable,
 * and it is the specific reason C's idea survived C being set aside.
 *
 * ── Why this depends on whether the source pane is open ──
 *
 * It did not, and that was wrong in a way only visible with the pane hidden.
 * Closing it gave the column ~440px more room; the wide blocks took it and
 * the prose did not, so paragraphs sat at 700 beside tables at 960 with a
 * 260px shelf of empty page beside every one of them. The prose read as left
 * behind rather than as deliberately narrower.
 *
 * The step between prose and wide blocks is the point and it stays — a
 * reading measure is not a layout accident. But it should be a step, not a
 * gulf, so with the pane closed prose goes to 820 and the gap halves.
 */
export function widthFor(block: Block, sourceOpen: boolean): string {
  switch (block.kind) {
    case "para":
    case "list":
    case "definition":
      return sourceOpen ? "max-w-measure" : "max-w-[820px]";
    case "quote":
    case "example":
      return sourceOpen ? "max-w-[760px]" : "max-w-[900px]";
    case "math":
    case "derivation":
    case "table":
    case "code":
      return "max-w-wide";
  }
}

// ── Blocks ──────────────────────────────────────────────────

export function BlockView({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  switch (block.kind) {
    case "para":
      return (
        <p className="text-body text-xn-ink">
          <Inline text={block.text} ctx={ctx} />
        </p>
      );

    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag
          className={[
            "space-y-2 text-body text-xn-ink",
            block.ordered ? "ml-5 list-decimal marker:text-xn-ink-soft" : "",
          ].join(" ")}
        >
          {block.items.map((item) => (
            <li key={item} className={block.ordered ? "pl-1" : "flex gap-3"}>
              {!block.ordered && (
                <span aria-hidden className="mt-[0.7em] h-px w-4 shrink-0 bg-xn-border-strong" />
              )}
              <span>
                <Inline text={item} ctx={ctx} />
              </span>
            </li>
          ))}
        </Tag>
      );
    }

    case "quote":
      return (
        <blockquote
          className="rounded-xn-md px-5 py-4 font-serif text-h4 leading-snug text-xn-ink"
          style={{ background: "var(--xn-quote-fill)" }}
        >
          {block.text}
        </blockquote>
      );

    case "definition":
      // A rule down the left rather than a filled card. Notes carry several in
      // a row, and three filled boxes stacked read as three separate asides
      // rather than as one glossary.
      return (
        <div className="border-l-2 border-xn-border-strong pl-4">
          <p className="text-body font-semibold text-xn-ink">
            <Inline text={block.term} ctx={ctx} />
          </p>
          <p className="mt-0.5 text-body text-xn-ink-muted">
            <Inline text={block.meaning} ctx={ctx} />
          </p>
        </div>
      );

    case "math":
      // The wrapper shrinks to the formula and centres; the number hangs off
      // its right edge absolutely. That is what keeps the formula centred in
      // the block while the gap to the number stays fixed.
      return (
        <div className="flex justify-center">
          <div className="relative min-w-0">
            <div className="overflow-x-auto py-1">
              <Tex tex={block.tex} display />
            </div>
            {block.id && (
              <span className="absolute left-full top-1/2 -translate-y-1/2 pl-3">
                <EqNumber n={ctx.eq.get(block.id)} />
              </span>
            )}
          </div>
        </div>
      );

    case "derivation":
      // Numbered, with the reason for each step beside it. The number is what
      // makes a step citable from prose; the note is what makes it teachable.
      // Raise the MATHS relative to the prose inside the box: the formula is
      // the subject and the note beside it is the annotation, so the type
      // should say so.
      //
      // Target `.katex-display`, NOT `.katex`. KaTeX sets `.katex` to 1.21em
      // itself for display maths, so setting that class directly REPLACES its
      // sizing instead of scaling it — measured at 18.4px inside the box
      // against 21.2px in prose, the opposite of the intent. Sizing the
      // wrapper lets the 1.21 multiply against it.
      return (
        <div className="rounded-xn-md border border-xn-ink-soft bg-xn-surface px-5 py-4 [&_.katex-display]:text-[1.1em]">
          {block.title && <BoxTitle>{block.title}</BoxTitle>}
          <ol className="space-y-4">
            {block.steps.map((step) => (
              <li key={step.id}>
                {/* The number rides beside its own formula rather than in a
                    right-hand column. Numbers no longer line up with each
                    other, and that is the trade: a column of numbers aligns
                    with the margin, which is precisely what made them hard to
                    associate with the formula they belong to. */}
                <div className="flex justify-center">
                  <div className="relative min-w-0">
                    <div className="overflow-x-auto py-0.5">
                      <Tex tex={step.tex} display />
                    </div>
                    <span className="absolute left-full top-1/2 -translate-y-1/2 pl-3">
                      <EqNumber n={ctx.eq.get(step.id)} />
                    </span>
                  </div>
                </div>
                {step.note && (
                  <p className="mt-1.5 text-ui leading-snug text-xn-ink-muted">
                    <Inline text={step.note} ctx={ctx} />
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      );

    case "example":
      // Nests blocks, because a worked example is prose AND maths — flattening
      // it to a string would have made the example the one block that cannot
      // contain what it is demonstrating.
      // ── One family, two kinds ──
      //
      // This box and the derivation now share a surface and a border colour,
      // and differ only in that this one's border is DASHED. That is the
      // distinction carrying meaning: same kind of container, different kind
      // of content.
      //
      // The example previously had no background at all, so it sat on the page
      // while the derivation sat on a surface. That was not a decision — it
      // was one box getting a fill and the other never being given one, which
      // read as two unrelated treatments.
      //
      // The border colour is measured, not named. Against the page: `border`
      // is 1.19:1, `border-strong` 1.43:1, `ink-faint` lower still once its
      // 10% alpha counts. At those values a dash cannot be seen as a dash.
      // `ink-soft` is 3.14:1, the threshold for a non-text element.
      return (
        <div className="rounded-xn-md border-2 border-dashed border-xn-ink-soft bg-xn-surface px-5 py-4 [&_.katex-display]:text-[1.1em]">
          <BoxTitle>{block.title}</BoxTitle>
          <div className="space-y-3.5">
            {block.blocks.map((inner, i) => (
              <BlockView key={i} block={inner} ctx={ctx} />
            ))}
          </div>
        </div>
      );

    case "code":
      return (
        <pre className="overflow-x-auto rounded-xn-md border border-xn-border bg-xn-bg-deep p-4 font-mono text-xs leading-relaxed text-xn-ink">
          {block.text}
        </pre>
      );

    case "table":
      return (
        <figure>
          {/* Same surface and border as the derivation and example boxes —
              the third container joins the family. The header sits on
              `bg-deep` so it still separates from the rows now that the rows
              are no longer transparent. */}
          <div className="overflow-x-auto rounded-xn-md border border-xn-ink-soft bg-xn-surface">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-xn-bg-deep">
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
                    {row.map((cell, i) => (
                      <td key={i} className="px-4 py-2.5 align-top text-xn-ink">
                        <Inline text={cell} ctx={ctx} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Same fault as the box titles: a caption in `ink-soft` at `xs`
              was not readable as a caption, it was readable as noise under
              the table. It carries what the table means, so it gets prose
              weight rather than metadata weight. */}
          {block.caption && (
            <figcaption className="mt-2.5 text-sm leading-snug text-xn-ink-muted">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
  }
}

// ── A note for whoever ports this ──
//
// `MARK_STYLE` above is a DELIBERATE COPY of the highlighter from the blog
// specimen, reduced to a single stroke. Two specimens importing from each other
// is worse than a copy that is labelled: the blog route is a settled artefact
// and this one should be readable without it.
//
// That is a reason for a copy in a specimen, not a reason for two in the
// product. §16 already says where both belong at port time — the stroke joins
// the `.mark-*` utilities in globals.css and lime becomes an `--xn-mark-lime`
// token pair. Unify them there, not here.
