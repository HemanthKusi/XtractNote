"use client";

// ─────────────────────────────────────────────────────────────
// Editor — TEMPORARY
// ─────────────────────────────────────────────────────────────
// http://localhost:3000/dev/editor
//
// Today `/output/[id]` offers one edit mode: a raw-markdown textarea, prose
// types only. Hemanth's brief, 2026-09-29 — that is editing the SOURCE, not
// the document. Editing happens on the rendered content and covers styling.
//
// ── THE FORM, from a reference Hemanth supplied 2026-09-29 ──
//
// **One card. A full-width toolbar across its top, the document inside it.**
// Not an app-level strip above a narrower document — the bar belongs to the
// editor, spans the card, and is divided from the document by the card's own
// rule.
//
// Three directions were built before that reference arrived: a page-level bar,
// a floating toolbar at the selection, and a side rail. The reference settles
// it, so they are gone rather than kept as dead alternatives.
//
// ── THE MODEL ──
//
// **Clicking Edit hands over the WHOLE DOCUMENT.** The caret goes anywhere,
// selection crosses blocks, the toolbar acts on whatever is selected. An
// earlier version made you select one block at a time; that is a structured
// content editor, and this is a document.
//
// ── SCOPE, set by Hemanth ──
//
// The four READING formats only — notes, blog, summary, research. Social is a
// preview of somewhere else; quiz and flashcards are interactive. The shipped
// code does not agree yet: STRUCTURED_TYPES is ["flashcards", "quiz"], so
// social still gets a textarea.
//
// **Images and diagrams are DEFERRED**, in a stated order: frames already in
// the source video, then web-searched images, then uploads.
//
// ── NO READING TIME, deliberately ──
//
// The reference shows "8 min read" beside the word count. §13 records reading
// time as designed, measured with a dwell model, and then DROPPED — "the dwell
// model was sound and measured the wrong thing". Word count stays, because it
// is editor chrome and a fact about the document. The minutes do not come back
// silently on the strength of a reference image.
//
// ── What saves today ──
//
// The four inline markers are TEXT SYNTAX — `==highlight==`, `$math$`,
// `[@cite]`, `[#eq-ref]` — so they round-trip through the existing
// `{ markdown: string }` body with no backend change. The typed BLOCKS do not:
// derivation, example, definition and a captioned table have no markdown
// spelling and need §16.5's change 2. The Block menu marks those.
//
// ── Why the document is uncontrolled ──
//
// Rendered once, then owned by the DOM. A controlled contentEditable fights
// the browser: re-render per keystroke, caret jumps to the end, undo history
// lost. So the toolbar mutates the DOM and React never re-renders the document
// while editing. That is why `dangerouslySetInnerHTML` appears with no state
// behind it.
//
// NOTHING PERSISTS. There is no save; reloading resets.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Highlighter,
  Link2,
  Eraser,
  Rows3,
  Columns3,
  Trash2,
  Undo2,
  Redo2,
} from "lucide-react";

import katex from "katex";
import "katex/dist/katex.min.css";

import { useTheme } from "@/components/shared/theme-provider";
import {
  NOTES_DOC,
  REFERENCES,
  RESEARCH_DOC,
  type Block,
  type Reference,
} from "@/app/dev/output-blocks/content";
import { numberEquations } from "@/app/dev/output-blocks/blocks";
import {
  HIGHLIGHT_LIME,
  HIGHLIGHT_MASK,
  parseInline,
  toRoman,
  type InlineSeg,
} from "@/app/dev/output-blocks/inline";
import { VIDEO } from "@/app/dev/social-templates/content";

/**
 * The highlighter's colours, default first.
 *
 * ── Lime is not one of six, it is THE one, plus five ──
 *
 * Hemanth, 2026-09-29, and not negotiable: the lime stroke is what generation
 * produces. `==phrase==` carries no colour, so every highlight in created
 * content is this one. The other five exist so a reader can mark different
 * things differently AFTERWARDS — they are an editing affordance, never an
 * output of the model.
 *
 * That ordering is the whole reason lime sits first here rather than being
 * filed alphabetically among the rest.
 */
const MARKS = ["lime", "yellow", "green", "blue", "pink", "purple"] as const;
type MarkId = (typeof MARKS)[number];

/** The default a highlight takes when nothing says otherwise. */
const DEFAULT_MARK: MarkId = "lime";

/**
 * Where each mark's colour comes from.
 *
 * Lime reads `--xn-hl`, which this page sets from the shared constant, because
 * it is not a `--xn-mark-*` token yet. §16 is where it becomes one — the note
 * at the bottom of `blocks.tsx` says to unify at port time, not in a specimen,
 * and a token invented here would be the second definition of a colour the
 * reading surface already owns.
 */
const MARK_VAR: Record<MarkId, string> = {
  lime: "var(--xn-hl)",
  yellow: "var(--xn-mark-yellow)",
  green: "var(--xn-mark-green)",
  blue: "var(--xn-mark-blue)",
  pink: "var(--xn-mark-pink)",
  purple: "var(--xn-mark-purple)",
};

/**
 * What the toolbar can turn the current block into.
 *
 * ── These are EDITING VERBS, not storage names ──
 *
 * The first version of this toolbar exposed the block vocabulary's own
 * identifiers — a dropdown reading "para", "list", "definition", and buttons
 * labelled `$x$`, `[@]`, `[#]`. Hemanth could not read it, correctly: nobody
 * thinks "convert this block to kind:quote", they press a quote button. The
 * storage vocabulary is an implementation detail and had no business on a
 * surface a person uses.
 *
 * So the bar now offers what a document editor offers — headings, bold,
 * italic, lists, quote, code, a highlighter, a link — and the mapping back to
 * `Block` kinds happens here, out of sight.
 */
const BLOCK_ACTIONS = [
  { id: "para", label: "Normal text", title: "Body text" },
  { id: "h1", label: "Heading 1", title: "Heading 1" },
  { id: "h2", label: "Heading 2", title: "Heading 2" },
  { id: "h3", label: "Heading 3", title: "Heading 3" },
  { id: "quote", label: "Quote", title: "Quote" },
  { id: "code", label: "Code", title: "Code block" },
  { id: "ul", label: "Bulleted list", title: "Bulleted list" },
  { id: "ol", label: "Numbered list", title: "Numbered list" },
] as const;
type BlockAction = (typeof BLOCK_ACTIONS)[number]["id"];

/**
 * What the style dropdown offers.
 *
 * Lists are NOT in it, and that is the point of the split. A word processor
 * puts paragraph styles in a gallery and lists on their own buttons, because a
 * list is something you toggle on a selection rather than a style a paragraph
 * "is". Putting all eight in one menu made it read as a list of unrelated
 * nouns, which is the complaint that started this.
 */
const STYLE_ACTIONS = ["para", "h1", "h2", "h3", "quote", "code"] as const;

/** Inline formatting, as any editor spells it. */
const INLINE_ACTIONS = [
  { id: "bold", title: "Bold", Icon: Bold },
  { id: "italic", title: "Italic", Icon: Italic },
  { id: "underline", title: "Underline", Icon: Underline },
  { id: "strikeThrough", title: "Strikethrough", Icon: Strikethrough },
] as const;
type InlineAction = (typeof INLINE_ACTIONS)[number]["id"];

// ── The document, rendered to static HTML once ───────────────

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** `esc` plus the quote, for anything going inside an attribute. */
const escAttr = (s: string) => esc(s).replace(/"/g, "&quot;");

/**
 * The reading scale, shared by the serialiser and by anything that builds a
 * block by hand. One definition, because a paragraph made by leaving a list has
 * to be indistinguishable from one that was always a paragraph.
 */
const PROSE_CLS = "text-[17.5px] leading-[1.72] text-xn-ink";

// ── The four inline markers, as HTML strings ─────────────────
//
// The rules come from `output-blocks/inline`; only the OUTPUT is written here.
// The reading surface renders the same four as JSX, and cannot be reused: this
// document is uncontrolled DOM, so React must not own any part of it.
//
// ── Why the resolved markers are atoms ──
//
// `contenteditable="false"` inside an editable document makes a unit the caret
// skips: it can be selected and deleted whole, but typing cannot land inside
// KaTeX's markup and destroy it. A rendered formula is ~40 nested spans and
// there is nothing useful to do with the caret in the middle of them.
//
// Each atom carries `data-src` — the characters it was written as. Rendering
// `$q$` into maths otherwise destroys the only copy of `q`, and the editor
// needs it twice: to put back when a save serialises the DOM, and to count
// words with, because KaTeX emits its formula as BOTH MathML and styled spans,
// so `textContent` returns every copy.

/**
 * What the markers resolve against.
 *
 * Passed rather than read from a module constant, because the two things a
 * citation needs are properties of a DOCUMENT, not of this file: equation
 * numbers come from a whole-document pass, and the reference list belongs to
 * the document that cites it. `REFERENCES` is the research document's — a notes
 * document resolving against it would render a citation to a source it does not
 * carry, which is worse than leaving it unresolved.
 */
interface MarkerCtx {
  eq: Map<string, number>;
  refs: Reference[];
}

const DOC_CTX: MarkerCtx = {
  eq: numberEquations(NOTES_DOC),
  refs: NOTES_DOC.references,
};

/** A formula, rendered, or its source in red when the LaTeX will not parse. */
function texHtml(tex: string, display = false): string {
  let html = "";
  try {
    html = katex.renderToString(tex, {
      displayMode: display,
      // The same two non-defaults the reading surface sets, for the same
      // reasons: this LaTeX is model-generated, so it is untrusted input, and a
      // malformed formula has to render in place rather than take out the page.
      throwOnError: false,
      trust: false,
      strict: false,
    });
  } catch {
    html = "";
  }
  if (!html) {
    return `<code class="rounded-xn-sm bg-xn-danger-soft px-1.5 py-0.5 font-mono text-xs text-xn-danger">${esc(
      tex,
    )}</code>`;
  }
  return html;
}

function atomHtml(marker: string, src: string, inner: string, cls: string): string {
  return `<span data-marker="${marker}" data-src="${escAttr(
    src,
  )}" contenteditable="false" class="${cls}">${inner}</span>`;
}

function segsHtml(segs: InlineSeg[], ctx: MarkerCtx): string {
  return segs
    .map((seg): string => {
      switch (seg.kind) {
        case "text":
          return esc(seg.text);
        case "bold":
          return `<strong class="font-semibold text-xn-ink">${esc(seg.text)}</strong>`;
        case "highlight":
          // NOT an atom: a highlighted phrase is still prose and has to stay
          // typeable, which is also why it carries no `data-src`.
          //
          // `==phrase==` says nothing about colour, and it does not need to:
          // the default IS the answer. Generation only ever produces this one,
          // and a reader who wants another picks it afterwards.
          return `<mark data-mark="${DEFAULT_MARK}" class="xn-hl">${segsHtml(
            seg.inner,
            ctx,
          )}</mark>`;
        case "math":
          return atomHtml("math", seg.src, texHtml(seg.tex), "");
        case "cite": {
          const index = ctx.refs.findIndex((r) => r.id === seg.id);
          // An unknown id stays as the characters it was written as, matching
          // the reading surface: a broken citation reads as broken, not absent.
          if (index < 0) return esc(seg.src);
          return atomHtml(
            "cite",
            seg.src,
            `[${toRoman(index + 1)}]`,
            "mx-px rounded-[3px] px-[2px] font-mono text-[0.85em] text-xn-ink-muted",
          );
        }
        case "eqref": {
          const n = ctx.eq.get(seg.id);
          // An unresolved reference renders as a visible gap rather than a
          // number, so a broken link is obvious instead of plausible.
          return atomHtml(
            "eqref",
            seg.src,
            n ? `(${n})` : "(?)",
            "font-mono text-xn-ink-muted",
          );
        }
      }
    })
    .join("");
}

/** Escape prose and resolve its markers, in one pass. */
const inlineHtml = (text: string, ctx: MarkerCtx = DOC_CTX) =>
  segsHtml(parseInline(text), ctx);

/** A display formula as the block's only child — an atom, edited via the field. */
const mathBodyHtml = (tex: string) => atomHtml("mathblock", tex, texHtml(tex, true), "");

// ── How a highlight is painted ──────────────────────────────
//
// Two highlight systems reached this file from opposite directions: the reading
// surface's `==phrase==`, one lime stroke with a hand-drawn edge and no colour
// choice, and this editor's button, five flat rectangles with no text spelling.
// The same phrase looked like two different things depending on which made it.
//
// SETTLED 2026-09-29, by Hemanth, after looking at all three candidates:
//
//   · the PEN SHAPE for every highlight, the five included. A rectangle of
//     colour reads as a UI selection; the uneven edge reads as a pen, and one
//     shape across all six is what makes them one thing rather than two
//   · LIME is the default and stays the default — it is what generation
//     produces, and `==phrase==` resolves to it
//   · the other five are the user's, applied after the fact
//
// So there is one treatment now and the harness that compared three is gone.
//
// ── Why a stylesheet rather than markup ──
//
// The document is built ONCE, at module load, and pinned in `useMemo` with no
// deps: re-rendering it is the bug §13 records, where React re-applied
// `dangerouslySetInnerHTML` and silently undid every edit. Painting from a
// stylesheet keeps every colour change out of the HTML entirely, so applying a
// highlight never has to touch anything but the one element it wraps.

const HL_CSS = `
mark.xn-hl {
  /* The pen, for all six. --xn-hl-c defaults to lime, so a mark that lost its
     attribute still paints as the default rather than as nothing. */
  --xn-hl-c: var(--xn-hl);
  background-color: var(--xn-hl-c);
  color: inherit;
  border-radius: 0;
  padding: 0.16em 0.3em;
  margin: 0 -0.16em;
  -webkit-mask-image: ${HIGHLIGHT_MASK};
          mask-image: ${HIGHLIGHT_MASK};
  -webkit-mask-size: 100% 100%;
          mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
  -webkit-box-decoration-break: clone;
          box-decoration-break: clone;
}

/* Lime alone forces its ink. It is bright in both themes, so it carries a
   near-black partner; the other five are dark enough in dark and pale enough in
   light that the page's own ink is already the measured pairing. */
mark.xn-hl[data-mark="lime"] { color: var(--xn-hl-ink); }

mark.xn-hl[data-mark="yellow"] { --xn-hl-c: var(--xn-mark-yellow); }
mark.xn-hl[data-mark="green"]  { --xn-hl-c: var(--xn-mark-green); }
mark.xn-hl[data-mark="blue"]   { --xn-hl-c: var(--xn-mark-blue); }
mark.xn-hl[data-mark="pink"]   { --xn-hl-c: var(--xn-mark-pink); }
mark.xn-hl[data-mark="purple"] { --xn-hl-c: var(--xn-mark-purple); }

/* ── Where focus is shown ──────────────────────────────────
   The document is ONE focusable element wrapping the whole article, so the
   global :focus-visible rule — 2px solid var(--xn-ink), offset 2px — drew a
   box around everything the moment you clicked into the text. It reads thin in
   light and glaring in dark for the same reason: --xn-ink is near-black on
   white and near-white on near-black, and the same 2px carries far more weight
   against the darker page.

   A box around the entire article also answers a question nobody asked. What
   you want to know while editing is WHICH BLOCK the caret is in — and the
   formula field made that urgent, because it opens at the top of the panel
   with nothing on screen tying it to the formula it edits.

   So the ring moves down to the block. A left edge rather than an outline,
   which is the indicator this project already settled on for the skip link,
   and for the same reason: an outline around a block of prose reads as a
   selection or an error, an edge in the margin reads as "you are here". */
.xn-doc:focus,
.xn-doc:focus-visible { outline: none; }

.xn-doc [data-block] { position: relative; }

/* In the margin, never in the text, so marking a block reflows nothing. */
.xn-doc [data-block][data-active]::before {
  content: "";
  position: absolute;
  left: -16px;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 2px;
  background: var(--xn-ink-soft);
}

/* The formula block is the one that needed this. Its edge is full strength,
   because when it is active a LaTeX field opens elsewhere on the screen and
   this is the only thing connecting the two. */
.xn-doc [data-block][data-active][data-kind="math"]::before {
  background: var(--xn-ink);
}
`;

// ── Marker conformance ──────────────────────────────────────
//
// HARNESS. The seeded notes document exercises three markers — 18 formulas, one
// highlight, one equation reference — and CANNOT exercise the fourth. A notes
// document carries no reference list, so `NOTES_DOC.references` is empty by
// design and there is nothing for a citation to resolve against.
//
// It reaches none of the FAILURE paths either, and those are the ones worth
// looking at: a source id that resolves to nothing, a reference to an equation
// that does not exist, LaTeX that will not parse. Left unexercised they would
// ship unlooked-at and break on the first real document that hit one — which is
// the dead-button lesson from §13, where the thing that could not be reached
// was precisely the thing that would survive to break in front of someone.
//
// So these render through the SAME `inlineHtml`, against the research
// document's context, each line stating what it should do.

const CONFORMANCE_CTX: MarkerCtx = {
  eq: numberEquations(RESEARCH_DOC),
  refs: REFERENCES,
};

const CONFORMANCE: { expect: string; src: string }[] = [
  {
    // `eq-ratio` is a real derivation step in the research document. The first
    // version of this line cited `eq-scaling`, which reads perfectly and does
    // not exist — it is an EXAMPLE id from a doc comment. It rendered "(?)"
    // beside three markers that had resolved, in a row captioned "all four".
    expect: "all four markers, one line, one pass",
    src: "Scaling by $1/\\sqrt{d_k}$ [@vaswani17] keeps ==the softmax out of saturation== — the ratio is [#eq-ratio].",
  },
  {
    expect: "a citation inside a highlight still resolves as a citation",
    src: "==The result holds [@ba16] at every depth.==",
  },
  {
    expect: "unknown source id — stays as the characters written, not dropped",
    src: "A claim citing [@nosuchsource] resolves against nothing.",
  },
  {
    expect: "unknown equation id — a visible gap, never a plausible number",
    src: "As shown in [#eq-does-not-exist], the term vanishes.",
  },
  {
    expect: "malformed LaTeX — KaTeX's own error colour, in place, page survives",
    src: "This formula does not close: $\\frac{1}{$.",
  },
  {
    expect: "a lone dollar is not maths; bold still applies",
    src: "It cost **$5** and change.",
  },
];

/**
 * The conformance list.
 *
 * `dangerouslySetInnerHTML` is safe here in a way it is not inside the document:
 * this subtree is React's, nothing mutates it, and no toolbar operation can be
 * undone by a re-render of it.
 */
function Conformance() {
  return (
    <details className="mt-6 rounded-xn-md border border-xn-border bg-xn-surface px-5 py-3">
      <summary className="cursor-pointer font-mono text-micro uppercase tracking-widest text-xn-ink-soft">
        marker conformance · {CONFORMANCE.length} cases the seeded document cannot reach
      </summary>
      <ul className="mt-4 space-y-4">
        {CONFORMANCE.map((c) => (
          <li key={c.src}>
            <p className="font-mono text-micro uppercase tracking-widest text-xn-ink-soft">
              {c.expect}
            </p>
            <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-xn-ink-muted">
              {c.src}
            </pre>
            <p
              className="mt-1.5 text-[17.5px] leading-[1.72] text-xn-ink"
              dangerouslySetInnerHTML={{ __html: inlineHtml(c.src, CONFORMANCE_CTX) }}
            />
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * One block as HTML.
 *
 * `data-block` lets the caret be traced to its owner; `data-kind` lets the
 * toolbar read what that owner is. Classes are the shipped tokens, so what is
 * edited looks like what is read.
 */
/** The three heading levels, which the reading design already sizes. */
function headingHtml(level: 1 | 2 | 3, text: string): string {
  const size = level === 1 ? "text-[40px]" : level === 2 ? "text-[32px]" : "text-[24px]";
  return `<h${level} data-block data-kind="h${level}" class="mb-3 mt-8 font-serif ${size} leading-tight text-xn-ink">${inlineHtml(text)}</h${level}>`;
}

function blockHtml(b: Block): string {
  const cls = PROSE_CLS;
  switch (b.kind) {
    case "para":
      return `<p data-block data-kind="para" class="${cls} my-4">${inlineHtml(b.text)}</p>`;
    case "quote":
      return `<blockquote data-block data-kind="quote" class="${cls} my-4 border-l-2 border-xn-border pl-4 italic text-xn-ink-muted">${inlineHtml(b.text)}</blockquote>`;
    case "code":
      // NOT parsed. Code is literal by definition, and a `$` in a shell line is
      // a prompt, not the start of a formula.
      return `<pre data-block data-kind="code" class="my-4 overflow-x-auto rounded-xn-sm bg-xn-surface-alt p-3 font-mono text-[14px] text-xn-ink">${esc(b.text)}</pre>`;
    case "list":
      return `<ul data-block data-kind="list" class="${cls} my-4 list-disc space-y-1 pl-5">${b.items
        .map((i) => `<li>${inlineHtml(i)}</li>`)
        .join("")}</ul>`;
    case "definition":
      return `<p data-block data-kind="definition" class="${cls} my-4"><strong>${inlineHtml(b.term)}</strong> — ${inlineHtml(b.meaning)}</p>`;
    case "math":
      // `data-tex` is the source of truth for the contextual LaTeX field. It
      // used to read `textContent`, which worked only while the block held its
      // LaTeX as plain text; now that the block renders, textContent is KaTeX's
      // own output and says nothing about the formula that produced it.
      return `<p data-block data-kind="math" data-tex="${escAttr(
        b.tex,
      )}" class="my-4 rounded-xn-sm bg-xn-surface-alt px-4 py-3 text-center text-[15px] text-xn-ink">${mathBodyHtml(
        b.tex,
      )}</p>`;
    case "table": {
      const head = b.head.map((h) => `<th class="border border-xn-border px-3 py-2 text-left font-semibold">${inlineHtml(h)}</th>`).join("");
      const rows = b.rows
        .map((r) => `<tr>${r.map((c) => `<td class="border border-xn-border px-3 py-2">${inlineHtml(c)}</td>`).join("")}</tr>`)
        .join("");
      return `<table data-block data-kind="table" class="my-4 w-full border-collapse text-[15px] leading-normal text-xn-ink"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
    }
    default:
      return `<p data-block data-kind="${b.kind}" class="my-4 font-mono text-xs text-xn-ink-soft">[${b.kind} — rendered at /dev/output-blocks]</p>`;
  }
}

const DOC_HTML = NOTES_DOC.sections
  .flatMap((s) => [
    `<h2 data-block data-kind="heading" class="mb-3 mt-9 font-serif text-[32px] leading-tight text-xn-ink">${inlineHtml(s.heading)}</h2>`,
    ...s.blocks.map(blockHtml),
  ])
  .join("");

// ── DOM operations, because the document is uncontrolled ─────

function currentBlock(root: HTMLElement | null): HTMLElement | null {
  const sel = window.getSelection();
  if (!root || !sel || sel.rangeCount === 0) return null;
  let n: Node | null = sel.getRangeAt(0).startContainer;
  while (n && n !== root) {
    if (n instanceof HTMLElement && n.hasAttribute("data-block")) return n;
    n = n.parentNode;
  }
  return null;
}

/**
 * Every block the selection touches, in document order.
 *
 * This is what a block action should operate on. The first version split ONE
 * paragraph on sentence boundaries to make a list, which turned a single
 * paragraph into several bullets nobody asked for — the editor inventing
 * divisions in the user's prose. A list is made from the lines you SELECTED;
 * if you selected one, you get one item.
 *
 * `intersectsNode` is the whole trick: it answers "does the range touch this
 * element" without any reasoning about offsets or partial containment.
 */
function blocksInSelection(root: HTMLElement | null): HTMLElement[] {
  const sel = window.getSelection();
  if (!root || !sel || sel.rangeCount === 0) return [];
  const range = sel.getRangeAt(0);
  return [...root.querySelectorAll<HTMLElement>("[data-block]")].filter((b) =>
    range.intersectsNode(b),
  );
}

/**
 * The table cell the caret sits in, if any.
 *
 * Table operations that say "this row" need to know which row that is, and
 * the caret is the only thing that knows. Walking up from the selection is the
 * same trick `currentBlock` uses; it stops at the cell rather than the block.
 */
function currentCell(root: HTMLElement | null): HTMLTableCellElement | null {
  const sel = window.getSelection();
  if (!root || !sel || sel.rangeCount === 0) return null;
  let n: Node | null = sel.getRangeAt(0).startContainer;
  while (n && n !== root) {
    if (n instanceof HTMLTableCellElement) return n;
    n = n.parentNode;
  }
  return null;
}

/**
 * Highlight the selection.
 *
 * ── The painting moved out of here, deliberately ──
 *
 * This used to write `style="background-color:var(--xn-mark-…)"` directly onto
 * the element. An inline style beats any stylesheet, so a button-applied
 * highlight could not be restyled afterwards — which made the two highlight
 * systems impossible to compare: `==phrase==` was painted by CSS and this was
 * painted by an attribute.
 *
 * Now both emit the same `mark.xn-hl[data-mark]` and a stylesheet decides how
 * it looks, so the treatment switch moves all of them at once and the
 * comparison is of one thing rather than two.
 */
function applyHighlight(mark: MarkId): "applied" | "empty" | "crosses" {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return "empty";
  const el = document.createElement("mark");
  el.dataset.mark = mark;
  el.className = "xn-hl";
  try {
    sel.getRangeAt(0).surroundContents(el);
  } catch {
    // Thrown when the selection straddles two elements. Refusing beats
    // silently rearranging the document.
    return "crosses";
  }
  sel.removeAllRanges();
  return "applied";
}

/**
 * Words in the document: each block's source text, counted and summed.
 *
 * ── Two faults, and the measured numbers, because guessing got this wrong ──
 *
 * This read `root.textContent` and reported 240 for a document holding 254
 * words. It was UNDER-counting, which is the opposite of what you would expect
 * from maths that renders itself twice, so the mechanism is worth stating:
 *
 * 1. KaTeX emits each formula twice — MathML for assistive technology, then
 *    positioned spans for sight — and puts no whitespace anywhere. So `($q$)`
 *    arrived as `(𝑞q)`: not two extra words, ONE meaningless token built from
 *    whichever glyphs happened to land beside it.
 * 2. `textContent` across sibling blocks joins them with nothing at all, so the
 *    last word of each block and the first of the next merged into one. With 16
 *    blocks that is 15 words lost, which is exactly the gap measured between
 *    counting the whole string at once and counting block by block.
 *
 * So: swap each atom for the characters it was written as, with NO padding —
 * padding splits `($q$)` into three tokens and overshoots to 248 — then count
 * per block, which is the only boundary that is a real separator.
 *
 * The answer is now the words a person typed, which is also what a save would
 * write: the two agree by construction instead of being kept in step by hand.
 */
/**
 * Mark which block the caret is in, so the edge in the margin can follow it.
 *
 * Imperative, like every other write to this document: React does not own it,
 * and a state-driven class would re-render the surface and undo the toolbar's
 * DOM surgery — the bug §13 records.
 *
 * `data-active` is presentation, not content, so it is stripped before every
 * undo snapshot. Left in, the snapshot would carry whichever block happened to
 * be active when it was taken, and undo would restore a stale edge onto a block
 * the caret is not in. It costs two attribute writes; see `pushHistory`.
 */
/**
 * An element's text as it was WRITTEN, with every atom back to its source.
 *
 * The one place that knows rendered output is not the thing a person typed.
 * KaTeX emits a formula as MathML plus positioned spans, so `textContent` on a
 * paragraph holding `$q$` returns its glyphs — twice — and nothing resembling
 * `$q$`. Anything that reads a block back, to count it or to rebuild it as
 * another kind, has to come through here.
 */
function sourceText(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  for (const atom of clone.querySelectorAll<HTMLElement>("[data-src]")) {
    atom.replaceWith(document.createTextNode(atom.dataset.src ?? ""));
  }
  return clone.textContent ?? "";
}

/** A block that holds `<li>` children, so its items can be carried across. */
function isListBlock(el: Element): el is HTMLUListElement | HTMLOListElement {
  return el instanceof HTMLUListElement || el instanceof HTMLOListElement;
}

function markActive(root: HTMLElement | null, block: HTMLElement | null) {
  if (!root) return;
  const prev = root.querySelector<HTMLElement>("[data-active]");
  if (prev === block) return;
  prev?.removeAttribute("data-active");
  block?.setAttribute("data-active", "");
}

/** The document, as it should be stored: without the active-block marker. */
function snapshot(el: HTMLElement): string {
  const active = el.querySelector<HTMLElement>("[data-active]");
  if (!active) return el.innerHTML;
  active.removeAttribute("data-active");
  const html = el.innerHTML;
  active.setAttribute("data-active", "");
  return html;
}

const countWords = (root: HTMLElement | null) => {
  if (!root) return 0;
  const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

  const blocks = [...root.querySelectorAll<HTMLElement>("[data-block]")];
  // Before the first edit there is always at least one block; the fallback is
  // for a document emptied down to bare text nodes.
  if (blocks.length === 0) return words(sourceText(root));
  return blocks.reduce((n, b) => n + words(sourceText(b)), 0);
};

/**
 * The toolbar.
 *
 * Module level, not nested in the page. A component declared during render is
 * a new type every render, so React remounts it — which in an editor loses the
 * caret on every keystroke that changes state.
 *
 * `onMouseDown` is prevented on every control: mousedown moves focus out of
 * the document and collapses the selection BEFORE click fires, so without it
 * a highlight button always finds nothing selected.
 */
function Tools({
  kind,
  runBlock,
  runInline,
  mark,
  clearMarks,
  addLink,
  words,
  undo,
  redo,
  canUndo,
  canRedo,
  modLabel,
}: {
  kind: string;
  runBlock: (a: BlockAction) => void;
  runInline: (a: InlineAction) => void;
  mark: (m: MarkId) => void;
  clearMarks: () => void;
  addLink: () => void;
  words: number;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  modLabel: string;
}) {
  // A plain element, not a component. Declaring a component inside another is
  // a new type every render and remounts its subtree — the caret-losing bug
  // this file already fixed once, in this same component.
  const sep = <span className="mx-2 h-6 w-px shrink-0 bg-xn-border" aria-hidden="true" />;

  const icon =
    "inline-flex h-8 w-8 items-center justify-center rounded-xn-sm text-xn-ink-muted transition-colors duration-xn ease-xn hover:bg-xn-surface-alt hover:text-xn-ink";

  // The gallery shows what the caret is in, so the bar reports as well as acts.
  const styleValue =
    (STYLE_ACTIONS as readonly string[]).includes(kind) ? kind : kind === "heading" ? "h2" : "";

  return (
    <div className="flex flex-wrap items-center gap-y-2">
      {/* Revert, first because it is the way back from everything after it.
          Disabled with nothing to undo rather than hidden, so its place in the
          bar does not move. */}
      <button
        type="button"
        title={`Revert the last change (${modLabel}Z)`}
        aria-label="Revert the last change"
        disabled={!canUndo}
        onMouseDown={(e) => e.preventDefault()}
        onClick={undo}
        className={`${icon} disabled:cursor-not-allowed disabled:opacity-35`}
      >
        <Undo2 size={17} strokeWidth={2} />
      </button>

      <button
        type="button"
        title={`Redo (${modLabel}\u21e7Z)`}
        aria-label="Redo"
        disabled={!canRedo}
        onMouseDown={(e) => e.preventDefault()}
        onClick={redo}
        className={`${icon} disabled:cursor-not-allowed disabled:opacity-35`}
      >
        <Redo2 size={17} strokeWidth={2} />
      </button>

      <span className="mx-2 h-6 w-px shrink-0 bg-xn-border" aria-hidden="true" />

      {/* ── Style gallery, as a word processor has it ── */}
      <label className="flex items-center gap-2">
        <span className="sr-only">Paragraph style</span>
        <select
          value={styleValue}
          onChange={(e) => runBlock(e.target.value as BlockAction)}
          className="w-[150px] rounded-xn-sm border border-xn-border bg-xn-surface px-2.5 py-1.5 text-sm text-xn-ink"
        >
          {styleValue === "" && <option value="">Mixed</option>}
          {STYLE_ACTIONS.map((id) => {
            const a = BLOCK_ACTIONS.find((x) => x.id === id);
            return a ? (
              <option key={id} value={id}>
                {a.label}
              </option>
            ) : null;
          })}
        </select>
      </label>

      {sep}

      {INLINE_ACTIONS.map(({ id, title, Icon }) => (
        <button
          key={id}
          type="button"
          title={title}
          aria-label={title}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runInline(id)}
          className={icon}
        >
          <Icon size={17} strokeWidth={2} />
        </button>
      ))}

      {sep}

      <button
        type="button"
        title="Bulleted list"
        aria-label="Bulleted list"
        aria-pressed={kind === "list"}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => runBlock("ul")}
        className={`${icon} ${kind === "list" ? "bg-xn-surface-alt text-xn-ink" : ""}`}
      >
        <List size={17} strokeWidth={2} />
      </button>
      <button
        type="button"
        title="Numbered list"
        aria-label="Numbered list"
        aria-pressed={kind === "ol"}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => runBlock("ol")}
        className={`${icon} ${kind === "ol" ? "bg-xn-surface-alt text-xn-ink" : ""}`}
      >
        <ListOrdered size={17} strokeWidth={2} />
      </button>

      {sep}

      {/* ── Highlighter: the pen, then its colours ── */}
      <span className="flex items-center gap-1.5">
        <Highlighter size={17} strokeWidth={2} className="text-xn-ink-muted" aria-hidden="true" />
        {MARKS.map((m) => (
          <button
            key={m}
            type="button"
            title={`Highlight ${m}`}
            aria-label={`Highlight ${m}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => mark(m)}
            className="h-6 w-6 rounded-xn-sm border border-xn-border transition-transform duration-xn ease-xn hover:scale-110"
            style={{ backgroundColor: MARK_VAR[m] }}
          />
        ))}
        <button
          type="button"
          title="Remove highlights"
          aria-label="Remove highlights"
          onMouseDown={(e) => e.preventDefault()}
          onClick={clearMarks}
          className={icon}
        >
          <Eraser size={16} strokeWidth={2} />
        </button>
      </span>

      {sep}

      <button
        type="button"
        title="Add a link"
        aria-label="Add a link"
        onMouseDown={(e) => e.preventDefault()}
        onClick={addLink}
        className={icon}
      >
        <Link2 size={17} strokeWidth={2} />
      </button>

      {/* Word count only — see the header note on reading time. */}
      <span className="ml-auto pl-3 font-mono text-xs tabular-nums text-xn-ink-soft">
        {words.toLocaleString()} words
      </span>
    </div>
  );
}

/**
 * Controls for the block the caret is standing in.
 *
 * ── Why this exists ──
 *
 * The main bar is the same everywhere, which is right for styling but wrong
 * for structure: a formula is edited by changing its LaTeX and a table by
 * adding a row, and neither is something a bold button can express. Standing
 * in one and being offered only paragraph styles is the toolbar failing to
 * notice where you are.
 *
 * The block kind is already known — `selectionchange` reads it for the style
 * gallery — so this costs detection that was being computed and thrown away.
 * It is the same idea as a word processor showing table tools only when the
 * caret is in a table.
 *
 * Kinds with nothing useful to add render nothing, deliberately: an empty
 * strip that appears and offers a disabled button is worse than no strip.
 */
function BlockTools({
  kind,
  mathText,
  setMathText,
  onTable,
}: {
  kind: string;
  mathText: string;
  setMathText: (v: string) => void;
  onTable: (
    op: "rowBelow" | "colRight" | "delRow" | "delCol" | "delLastRow" | "delLastCol",
  ) => void;
}) {
  const icon =
    "inline-flex items-center gap-1.5 rounded-xn-sm px-2.5 py-1.5 text-sm text-xn-ink-muted transition-colors duration-xn ease-xn hover:bg-xn-surface-alt hover:text-xn-ink";

  if (kind === "math") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-micro uppercase tracking-widest text-xn-ink-soft">
          Formula
        </span>
        {/* The LaTeX itself, editable as text. Typing into the rendered block
            would mean typing into what should eventually be rendered maths;
            the source belongs in a field of its own. */}
        <input
          value={mathText}
          onChange={(e) => setMathText(e.target.value)}
          spellCheck={false}
          className="min-w-[320px] flex-1 rounded-xn-sm border border-xn-border bg-xn-surface px-2.5 py-1.5 font-mono text-sm text-xn-ink"
        />
        <span className="text-xs text-xn-ink-muted">
          LaTeX — rendering it needs a maths dependency, which is gated
        </span>
      </div>
    );
  }

  if (kind === "table") {
    // Caret-relative first, end-relative after the divider: the two answer
    // different questions — "fix this row" and "trim the table".
    return (
      <div className="flex flex-wrap items-center gap-1">
        <span className="pr-2 font-mono text-micro uppercase tracking-widest text-xn-ink-soft">
          Table
        </span>
        <button type="button" className={icon} title="Insert a row below this one" onMouseDown={(e) => e.preventDefault()} onClick={() => onTable("rowBelow")}>
          <Rows3 size={16} strokeWidth={2} /> Row below
        </button>
        <button type="button" className={icon} title="Insert a column to the right" onMouseDown={(e) => e.preventDefault()} onClick={() => onTable("colRight")}>
          <Columns3 size={16} strokeWidth={2} /> Column right
        </button>
        <button type="button" className={icon} title="Delete the row the caret is in" onMouseDown={(e) => e.preventDefault()} onClick={() => onTable("delRow")}>
          <Trash2 size={16} strokeWidth={2} /> This row
        </button>
        <button type="button" className={icon} title="Delete the column the caret is in" onMouseDown={(e) => e.preventDefault()} onClick={() => onTable("delCol")}>
          <Trash2 size={16} strokeWidth={2} /> This column
        </button>
        <span className="mx-1 h-5 w-px shrink-0 bg-xn-border" aria-hidden="true" />
        {/* All four deletes carry the bin. The icon says WHAT the button
            does; the label says WHICH one it does it to. An earlier version
            put arrows on these two to encode "the one at the end" — that put
            the wrong information in the icon and made two delete buttons look
            like two different kinds of action. */}
        <button
          type="button"
          className={icon}
          title="Delete the last row"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onTable("delLastRow")}
        >
          <Trash2 size={16} strokeWidth={2} /> Last row
        </button>
        <button
          type="button"
          className={icon}
          title="Delete the last column"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onTable("delLastCol")}
        >
          <Trash2 size={16} strokeWidth={2} /> Last column
        </button>
      </div>
    );
  }

  if (kind === "quote") {
    return (
      <p className="text-xs text-xn-ink-muted">
        Quote — type inside it to edit. Use the style menu to turn it back into
        normal text.
      </p>
    );
  }

  if (kind === "code") {
    return (
      <p className="text-xs text-xn-ink-muted">
        Code block — whitespace is preserved as typed.
      </p>
    );
  }

  if (kind === "example" || kind === "derivation" || kind === "definition") {
    return (
      <p className="text-xs text-xn-ink-muted">
        {kind === "definition" ? "Definition" : kind === "example" ? "Worked example" : "Derivation"}{" "}
        — a typed block with no markdown spelling. Editing it needs structured
        bodies (§16.5) before anything here could be saved.
      </p>
    );
  }

  return null;
}

export default function EditorPage() {
  const { theme, setTheme } = useTheme();
  const docRef = useRef<HTMLDivElement | null>(null);

  /**
   * The block the caret was last in.
   *
   * Reading the live selection inside a click handler does not work: by the
   * time React's handler runs, the click on the toolbar has collapsed it, so
   * `currentBlock` finds nothing and every block button reports "put the
   * caret in the text first" on a caret that is plainly in the text.
   *
   * `onMouseDown`/preventDefault keeps the VISIBLE selection, which is why
   * highlighting works — it reads the range synchronously. A block action
   * does not have that luxury, so the target is remembered when the caret
   * moves instead of looked up when the button is pressed. A ref, not state,
   * because a handler created in an earlier render would close over a stale
   * value — the same rule §5 states for race guards.
   */
  const lastBlockRef = useRef<HTMLElement | null>(null);
  /** Every block the selection touched, for actions that span several. */
  const lastBlocksRef = useRef<HTMLElement[]>([]);
  /** The last table cell the caret was in, for row/column operations. */
  const lastCellRef = useRef<HTMLTableCellElement | null>(null);

  const [editing, setEditing] = useState(true);
  const [kind, setKind] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [words, setWords] = useState(0);
  /** The LaTeX of the formula the caret is in, mirrored into a field. */
  const [mathText, setMathTextState] = useState("");

  /**
   * Undo, as one stack this editor owns.
   *
   * ── Why not the browser's ──
   *
   * `contentEditable` has a native undo stack, and it covers typing and
   * `execCommand` — bold, italic, link. It does NOT cover anything done by
   * direct DOM surgery, which here is most of the editor: block conversion,
   * highlighting, every table operation. Leaving undo to the browser would
   * give a Ctrl+Z that works on some actions and silently ignores others,
   * which is worse than none — the user cannot tell which is which until
   * something they meant to revert stays.
   *
   * So every mutation snapshots the document first and the native stack is
   * suppressed, giving one stack with one behaviour.
   *
   * Snapshots are whole-document HTML strings. That is crude and completely
   * adequate here: the document is a few kilobytes, and the alternative — a
   * diff or command model — is a real editing library, which is a gated
   * dependency.
   */
  const historyRef = useRef<string[]>([]);
  /**
   * States undone and not yet re-applied.
   *
   * Cleared by any NEW edit, which is the behaviour every editor has and the
   * reason it is worth stating: after undoing, typing something else makes the
   * undone branch unreachable. Keeping it would offer a redo that pastes work
   * from a history the document no longer follows.
   */
  const redoRef = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  /** Typing is grouped: a snapshot is taken once the keyboard goes quiet. */
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True while a burst of typing is in progress, so it snapshots once. */
  const typingBurst = useRef(false);

  const pushHistory = useCallback(() => {
    const el = docRef.current;
    if (!el) return;
    const stack = historyRef.current;
    const snap = snapshot(el);
    if (stack[stack.length - 1] === snap) return;
    stack.push(snap);
    // A specimen does not need unbounded history, and an unbounded array of
    // document copies is the kind of thing that is fine until it is not.
    if (stack.length > 100) stack.shift();
    setCanUndo(true);
    // A new edit abandons the redo branch.
    if (redoRef.current.length) {
      redoRef.current = [];
      setCanRedo(false);
    }
  }, []);

  /** Forget the caret — its node no longer exists after replacing markup. */
  const dropCaretState = useCallback(() => {
    lastBlockRef.current = null;
    lastBlocksRef.current = [];
    lastCellRef.current = null;
    setKind("");
  }, []);

  const undo = useCallback(() => {
    const el = docRef.current;
    const stack = historyRef.current;
    if (!el || stack.length === 0) return;
    const prev = stack.pop();
    if (prev === undefined) return;
    // The state being left becomes the thing redo returns to.
    redoRef.current.push(snapshot(el));
    setCanRedo(true);
    el.innerHTML = prev;
    setCanUndo(stack.length > 0);
    setWords(countWords(el));
    // The caret's node no longer exists after replacing the markup, so there
    // is nothing to restore it to. Said plainly rather than half-restored to
    // somewhere arbitrary.
    dropCaretState();
  }, [dropCaretState]);

  const redo = useCallback(() => {
    const el = docRef.current;
    const stack = redoRef.current;
    if (!el || stack.length === 0) return;
    const next = stack.pop();
    if (next === undefined) return;
    // Symmetric: stepping forward makes the state being left undoable again.
    // `pushHistory` is not used here — it clears the redo branch, which is
    // exactly what a redo must not do.
    historyRef.current.push(snapshot(el));
    setCanUndo(true);
    el.innerHTML = next;
    setCanRedo(stack.length > 0);
    setWords(countWords(el));
    dropCaretState();
  }, [dropCaretState]);


  useEffect(() => setWords(countWords(docRef.current)), []);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 2800);
    return () => clearTimeout(t);
  }, [note]);

  useEffect(() => {
    const onSel = () => {
      const root = docRef.current;
      const sel = window.getSelection();
      if (!root || !sel || sel.rangeCount === 0) return;

      // ── Ignore selections that are not in the document ──
      //
      // `selectionchange` fires for the LaTeX field too, and a caret in a text
      // input says nothing about which block is being edited. Acting on it
      // cleared `kind`, which closes the contextual strip — so the field would
      // have shut itself the moment it was clicked — and it would now also drop
      // the active edge, which is the one thing tying the field to its formula.
      //
      // Leaving everything as it was is what keeps the edge, the strip and the
      // field all pointing at the same block while any of them is in use.
      if (!root.contains(sel.getRangeAt(0).startContainer)) return;

      const b = currentBlock(root);
      if (b) lastBlockRef.current = b;
      markActive(root, b);
      const many = blocksInSelection(root);
      if (many.length) lastBlocksRef.current = many;
      setKind(b?.dataset.kind ?? "");
      // Mirror a formula's source into the field when the caret enters it.
      // From `data-tex`, not `textContent`: the block renders now, so its text
      // is KaTeX's output and not the LaTeX that produced it.
      if (b?.dataset.kind === "math") setMathTextState(b.dataset.tex ?? "");
      // Remember which cell, so "this row" means the row you are actually in.
      const c = currentCell(root);
      if (c) lastCellRef.current = c;
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  const mark = useCallback((m: MarkId) => {
    pushHistory();
    const r = applyHighlight(m);
    if (r === "empty") setNote("Select some text first.");
    if (r === "crosses") setNote("That selection crosses two blocks — highlight inside one.");
  }, [pushHistory]);

  /**
   * Apply a block style to everything the selection touches.
   *
   * ── What was wrong before ──
   *
   * Converting to a list split ONE paragraph on `. ` and made a bullet of each
   * sentence. That is the editor inventing structure: a paragraph the user
   * wrote as one thought came back as four bullets. A list is built from the
   * blocks that were SELECTED — one selected paragraph becomes one item.
   *
   * The same rule now governs every block action, which is also how a word
   * processor behaves: select three paragraphs, press Quote, get three quotes.
   */
  const runBlock = useCallback((action: BlockAction) => {
    pushHistory();
    const root = docRef.current;
    // The live selection is gone by the time a click handler runs, so the
    // remembered set from `selectionchange` is the real input here.
    const live = blocksInSelection(root);
    const targets = live.length
      ? live
      : lastBlocksRef.current.filter((b) => root?.contains(b));
    const fallback = lastBlockRef.current;
    const blocks =
      targets.length > 0 ? targets : fallback && root?.contains(fallback) ? [fallback] : [];

    if (blocks.length === 0) return setNote("Select some text first.");

    if (action === "ul" || action === "ol") {
      const wantKind = action === "ol" ? "ol" : "list";

      // ── Pressing the list you are already in turns it OFF ──
      //
      // These buttons carry `aria-pressed`, which promises a toggle, so one
      // that cannot be un-pressed is the surface claiming what the code does
      // not do. Leaving a list returns each item to its own paragraph, which is
      // what every word processor does and what the items were before.
      if (blocks.every((b) => isListBlock(b) && b.dataset.kind === wantKind)) {
        const made: HTMLElement[] = [];
        for (const b of blocks) {
          for (const li of [...b.children]) {
            const p = document.createElement("p");
            p.setAttribute("data-block", "");
            p.setAttribute("data-kind", "para");
            p.className = `${PROSE_CLS} my-4`;
            // Move nodes, never text: marks, bold and atoms have to survive.
            while (li.firstChild) p.appendChild(li.firstChild);
            b.before(p);
            made.push(p);
          }
          b.remove();
        }
        lastBlockRef.current = made[0] ?? null;
        lastBlocksRef.current = made;
        markActive(root, made[0] ?? null);
        setKind(made.length ? "para" : "");
        setWords(countWords(root));
        return;
      }

      // ── One list, and a list already selected contributes ITS items ──
      //
      // This used to move each selected block's children into a fresh `<li>`
      // unconditionally. For a paragraph that is right; for a list it put the
      // existing `<li>` elements INSIDE a new one, so switching bulleted to
      // numbered produced `<ol><li><li>text</li></li></ol>`. Invalid nesting,
      // which the browser then repairs in its own way — the collapse that made
      // the two buttons feel broken.
      //
      // Switching between the two is therefore a RE-TAG, not a re-wrap: the
      // items are carried over untouched and only the element around them
      // changes.
      const list = document.createElement(action === "ol" ? "ol" : "ul");
      list.setAttribute("data-block", "");
      list.setAttribute("data-kind", wantKind);
      list.className = `${PROSE_CLS} my-4 space-y-1 pl-5 ${
        action === "ol" ? "list-decimal" : "list-disc"
      }`;

      for (const b of blocks) {
        if (isListBlock(b)) {
          // appendChild moves, so each item leaves the old list as it arrives.
          for (const li of [...b.children]) list.appendChild(li);
        } else {
          const li = document.createElement("li");
          // Move the block's nodes rather than copying text, so highlights and
          // bold already inside it survive becoming a list item.
          while (b.firstChild) li.appendChild(b.firstChild);
          list.appendChild(li);
        }
      }

      blocks[0].replaceWith(list);
      for (const b of blocks.slice(1)) b.remove();
      lastBlockRef.current = list;
      lastBlocksRef.current = [list];
      markActive(root, list);
      setKind(wantKind);
      setWords(countWords(root));
      return;
    }

    // ── Every other kind re-renders each selected block from its SOURCE ──
    //
    // `sourceText`, never `textContent`. Since the markers render, a formula in
    // the DOM is KaTeX's output, so `textContent` returns its glyphs rather
    // than the `$q$` that produced them — converting a paragraph holding a
    // formula to a quote used to rebuild it from that garble. The atoms carry
    // `data-src` for exactly this.
    //
    // A LIST contributes one block per item, mirroring the rule going the other
    // way: one block in, one item out. Flattening it with `textContent` glued
    // every item into a single run of words with no space between them.
    const made: HTMLElement[] = [];

    const emit = (text: string, at: Element) => {
      const wrap = document.createElement("div");
      if (action === "h1" || action === "h2" || action === "h3") {
        wrap.innerHTML = headingHtml(Number(action[1]) as 1 | 2 | 3, text);
      } else {
        wrap.innerHTML = blockHtml({ kind: action, text } as Block);
      }
      const fresh = wrap.firstElementChild;
      if (fresh instanceof HTMLElement) {
        at.before(fresh);
        made.push(fresh);
      }
    };

    for (const b of blocks) {
      if (isListBlock(b)) {
        for (const li of [...b.children]) {
          if (li instanceof HTMLElement) emit(sourceText(li), b);
        }
      } else {
        emit(sourceText(b), b);
      }
      b.remove();
    }
    if (made.length) {
      lastBlockRef.current = made[0];
      lastBlocksRef.current = made;
      setKind(made[0].getAttribute("data-kind") ?? "");
      setWords(countWords(root));
    }
  }, [pushHistory]);

  /**
   * Inline formatting.
   *
   * `document.execCommand` is deprecated, and it is used here deliberately.
   * Bold across a selection that spans several nodes is genuinely hard to do
   * by hand — `Range.surroundContents` throws the moment a selection crosses
   * an element boundary, which is most real selections — and every browser
   * still implements these four commands. For a specimen whose job is to
   * judge the SURFACE, a working button beats a purist one that cannot bold
   * half a sentence. A shipped editor would use a real editing library; that
   * is a dependency decision, and dependencies are gated.
   */
  const runInline = useCallback((action: InlineAction) => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) pushHistory();
    if (!sel || sel.isCollapsed) return setNote("Select some text first.");
    document.execCommand(action);
  }, [pushHistory]);

  const addLink = useCallback(() => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) pushHistory();
    if (!sel || sel.isCollapsed) return setNote("Select the words to link first.");
    const url = window.prompt("Link to:");
    if (!url) return;
    document.execCommand("createLink", false, url);
  }, [pushHistory]);

  /**
   * The document, rendered ONCE and never re-rendered.
   *
   * ── The bug this fixes, which cost a long hunt ──
   *
   * Highlighting worked and block conversion silently did not. Both mutate the
   * DOM the same way; the difference is that conversion also calls setState to
   * update the toolbar. That re-render made React re-apply
   * `dangerouslySetInnerHTML`, restoring the original markup and discarding
   * the replacement — with no error, because nothing failed. The block simply
   * came back.
   *
   * Highlight and Clear survived only because neither sets state, which is
   * exactly what made it look like a problem with conversion rather than with
   * re-rendering.
   *
   * `useMemo` with no dependencies pins the element, so React has nothing to
   * reconcile and the DOM stays as the toolbar left it. `contentEditable` is
   * then set imperatively below, since changing it as a prop would put the
   * element back under React's control and reintroduce the same thing.
   */
  const surface = useMemo(
    () => (
      <div
        ref={docRef}
        suppressContentEditableWarning
        spellCheck={false}
        dangerouslySetInnerHTML={{ __html: DOC_HTML }}
        className="xn-doc mt-2 max-w-[68ch] outline-none"
      />
    ),
    [],
  );

  useEffect(() => {
    const el = docRef.current;
    if (!el) return;
    el.contentEditable = editing ? "true" : "false";
    // The edge marks where you are EDITING. On Done the document returns to the
    // output page's presentation, where there is no caret and nothing to mark.
    if (!editing) markActive(el, null);

    const onInput = () => setWords(countWords(el));

    /**
     * Snapshot BEFORE the first keystroke of a burst, not after it.
     *
     * The first version snapshotted on `input`, debounced — which records the
     * document as it is once the typing has already happened, so undo restored
     * the typed text instead of removing it. The button worked and the
     * keyboard appeared not to, when in fact both were reverting to a state
     * that already contained the change.
     *
     * `beforeinput` fires while the DOM is still untouched, which is the only
     * moment the pre-change state exists to be captured. The burst flag keeps
     * it to one snapshot per phrase rather than one per character.
     */
    const onBeforeInput = () => {
      if (!typingBurst.current) {
        pushHistory();
        typingBurst.current = true;
      }
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        typingBurst.current = false;
      }, 600);
    };

    /**
     * Ctrl+Z, or Cmd+Z on a Mac.
     *
     * `metaKey` is the Mac's Command and `ctrlKey` everything else, so
     * accepting either is the OS check — no platform sniffing needed to make
     * the shortcut WORK. Platform is detected below only to label the button.
     *
     * The native undo is suppressed deliberately: two stacks that each know
     * about half the edits would take turns reverting things the other did
     * not do.
     */
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();

      // Redo is spelled differently per platform and both spellings are
      // common on the same keyboard, so all three are accepted: Cmd+Shift+Z
      // on a Mac, Ctrl+Shift+Z and Ctrl+Y elsewhere.
      const isRedo = (key === "z" && e.shiftKey) || key === "y";
      const isUndo = key === "z" && !e.shiftKey;
      if (!isRedo && !isUndo) return;

      e.preventDefault();
      // End any open typing burst so the next keystroke starts a new entry.
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingBurst.current = false;
      if (isRedo) redo();
      else undo();
    };

    el.addEventListener("beforeinput", onBeforeInput);
    el.addEventListener("input", onInput);
    el.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("beforeinput", onBeforeInput);
      el.removeEventListener("input", onInput);
      el.removeEventListener("keydown", onKey);
    };
  }, [editing, pushHistory, undo, redo]);

  // Label only — the shortcut itself accepts either modifier. Read after
  // mount, never during render, because the server cannot know the platform
  // and §13 already records what a server/client disagreement costs here.
  const [modLabel, setModLabel] = useState("Ctrl");
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setModLabel("\u2318");
  }, []);

  /**
   * Write the field back into the formula block it came from, and re-render it.
   *
   * The LaTeX lives on `data-tex` and the rendered maths is a non-editable
   * atom, so typing in the field is now the only way to change a formula —
   * which is what the field was for. Re-rendering per keystroke is cheap next
   * to KaTeX's own parse, and showing the formula resolve as it is typed is
   * most of the field's value.
   */
  const setMathText = useCallback((v: string) => {
    setMathTextState(v);
    const b = lastBlockRef.current;
    if (b && b.dataset.kind === "math" && docRef.current?.contains(b)) {
      b.dataset.tex = v;
      b.innerHTML = mathBodyHtml(v);
    }
  }, []);

  /**
   * Table structure, relative to the caret where that makes sense.
   *
   * ── Why "this row" and not only "the last row" ──
   *
   * The first version could only append at the end and delete from the end,
   * which is fine for building a table and useless for fixing one: a wrong row
   * in the middle could not be removed, and a row could not be added where it
   * was needed. The caret already knows which cell it is in — the same way the
   * style gallery knows which block — so the operations that should be
   * relative now are.
   *
   * The end-relative ones stay, because they are the ones that still work when
   * the caret is not in the table at all.
   *
   * Columns are added to the header AND to every body row in one pass. A
   * header cell without matching body cells is not a table with a gap, it is a
   * table that renders wrong.
   */
  const onTable = useCallback(
    (op: "rowBelow" | "colRight" | "delRow" | "delCol" | "delLastRow" | "delLastCol") => {
      pushHistory();
      const b = lastBlockRef.current;
      if (!(b instanceof HTMLTableElement) || !docRef.current?.contains(b)) return;
      const head = b.tHead?.rows[0];
      const body = b.tBodies[0];
      if (!head || !body) return;

      const cellClass = "border border-xn-border px-3 py-2";
      const cell = lastCellRef.current;
      const inThisTable = cell && b.contains(cell);
      const row = inThisTable ? cell.closest("tr") : null;
      // A header cell has no index in the body, so column ops use its position.
      const colIndex = inThisTable ? cell.cellIndex : -1;

      const addCell = (tr: HTMLTableRowElement, at: number) => {
        const td = tr.insertCell(at);
        td.className = cellClass;
        td.textContent = "—";
        return td;
      };

      if (op === "rowBelow") {
        // Below the caret's row when there is one, otherwise at the end.
        //
        // `sectionRowIndex`, NOT `rowIndex`. The latter counts from the whole
        // table including the header, so the first body row reports 1, and
        // inserting at 1+1 put the new row two down instead of one. Caught by
        // asserting where the row landed rather than that a row appeared —
        // the table looked perfectly fine either way.
        const at =
          row && row.parentElement === body ? row.sectionRowIndex + 1 : body.rows.length;
        const tr = body.insertRow(Math.min(at, body.rows.length));
        for (let i = 0; i < head.cells.length; i++) addCell(tr, -1);
      } else if (op === "colRight") {
        const at = colIndex >= 0 ? colIndex + 1 : head.cells.length;
        const th = document.createElement("th");
        th.className = `${cellClass} text-left font-semibold`;
        th.textContent = "New";
        head.insertBefore(th, head.cells[at] ?? null);
        for (const tr of [...body.rows]) addCell(tr, Math.min(at, tr.cells.length));
      } else if (op === "delRow") {
        if (!row || row.parentElement !== body) {
          return setNote("Put the caret in the row you want to remove.");
        }
        if (body.rows.length <= 1) return setNote("A table needs at least one row.");
        row.remove();
        lastCellRef.current = null;
      } else if (op === "delCol") {
        if (colIndex < 0) return setNote("Put the caret in the column you want to remove.");
        if (head.cells.length <= 1) return setNote("A table needs at least one column.");
        head.deleteCell(colIndex);
        for (const tr of [...body.rows]) {
          if (colIndex < tr.cells.length) tr.deleteCell(colIndex);
        }
        lastCellRef.current = null;
      } else if (op === "delLastRow") {
        if (body.rows.length > 1) body.deleteRow(body.rows.length - 1);
      } else if (op === "delLastCol") {
        if (head.cells.length > 1) {
          head.deleteCell(head.cells.length - 1);
          for (const tr of [...body.rows]) tr.deleteCell(tr.cells.length - 1);
        }
      }
      setWords(countWords(docRef.current));
    },
    [pushHistory],
  );

  const clearMarks = useCallback(() => {
    pushHistory();
    const root = docRef.current;
    if (!root) return;
    for (const m of [...root.querySelectorAll("mark[data-mark]")]) {
      const p = m.parentNode;
      if (!p) continue;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
    }
  }, [pushHistory]);

  const lime = theme === "dark" ? HIGHLIGHT_LIME.dark : HIGHLIGHT_LIME.light;

  return (
    <div className="min-h-screen bg-xn-bg py-10">
      <style dangerouslySetInnerHTML={{ __html: HL_CSS }} />
      {/* `--xn-hl` is set here the same way the reading surface sets it, from
          the same constant, so the default stroke in the editor is the stroke
          the reading surface draws rather than something resembling it. */}
      <div
        style={
          { "--xn-hl": lime.bg, "--xn-hl-ink": lime.ink } as React.CSSProperties
        }
        className="mx-auto max-w-[1030px] px-6"
      >
        {/* Mode control sits OUTSIDE the card — it is the app asking whether
            you are reading or editing, not part of the editor's own chrome. */}
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={[
              "rounded-xn-pill px-4 py-1.5 text-sm font-medium transition-colors duration-xn ease-xn",
              editing ? "bg-xn-ink text-xn-bg" : "border border-xn-border text-xn-ink",
            ].join(" ")}
          >
            {editing ? "Done" : "Edit"}
          </button>
          <span className="font-mono text-micro uppercase tracking-widest text-xn-ink-soft">
            {editing ? "editing the whole document" : "reading"}
          </span>
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="ml-auto rounded-xn-sm px-2 py-1 font-mono text-micro text-xn-ink-muted transition-colors duration-xn ease-xn hover:text-xn-ink"
          >
            {theme === "dark" ? "→ light" : "→ dark"}
          </button>
        </div>

        {/* ── The card is the EDITOR's, not the document's ──
            Hemanth, 2026-09-29: seeing the whole card while editing is fine,
            but pressing Done has to return the content to the OUTPUT page's
            own presentation, with the edits carried into it. The editor's
            chrome is not how the document looks.

            So the card, its border, its shadow and the toolbar all belong to
            the editing state and are dropped on Done. What stays is the
            document — the same DOM, which is why the edits survive the switch
            rather than being re-rendered from a source of truth that never
            saw them.

            Reading presentation here is the 700px measure §13 settles for
            prose, not OutputView's 960: that 960 exists because the flashcard
            grid needs a third column, and §13 already names the resolution as
            capping the prose renderer rather than narrowing the card. */}
        <div
          className={
            editing
              ? // A PANEL, not a page section: fixed height, toolbar pinned as
                // a flex child, document scrolling inside it.
                //
                // It was `sticky top-0` on the toolbar inside a card carrying
                // `overflow-hidden` for its rounded corners — and OVERFLOW
                // HIDDEN ON AN ANCESTOR BREAKS STICKY. The clipped box becomes
                // the nearest scrolling ancestor, and it never scrolls, so the
                // toolbar had nothing to stick to and simply scrolled away
                // with the page. It had been silently non-sticky since the
                // corners were rounded; `sticky` resolves, applies, and does
                // nothing, which is the same class of failure as `outline-2`
                // emitting no outline-style.
                //
                // A flex column sidesteps the question entirely: the toolbar
                // is a sibling that does not scroll, not an element trying to
                // stick inside something that does.
                "flex max-h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-xn-lg border border-xn-border bg-xn-surface shadow-xn"
              : ""
          }
        >
          {editing && (
            <div className="shrink-0 border-b border-xn-border bg-xn-surface px-5 py-2.5">
              <Tools
                kind={kind}
                runBlock={runBlock}
                runInline={runInline}
                mark={mark}
                clearMarks={clearMarks}
                addLink={addLink}
                words={words}
                undo={undo}
                redo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
                modLabel={modLabel}
              />
              {/* Contextual controls, only when the block has any. */}
              {(() => {
                const strip = (
                  <BlockTools
                    kind={kind}
                    mathText={mathText}
                    setMathText={setMathText}
                    onTable={onTable}
                  />
                );
                return strip.props.kind &&
                  ["math", "table", "quote", "code", "example", "derivation", "definition"].includes(
                    kind,
                  ) ? (
                  <div className="mt-2.5 border-t border-xn-border pt-2.5">{strip}</div>
                ) : null;
              })()}
              {note && <p className="mt-2 text-xs text-xn-ink-muted">{note}</p>}
            </div>
          )}

          <div className={editing ? "flex-1 overflow-y-auto px-10 py-9" : "py-2"}>
            {/* Source chip — real data. The channel is metadata the app
                already fetches, so this is not a placeholder. */}
            <span className="inline-flex items-center rounded-xn-pill bg-xn-surface-alt px-3 py-1 font-mono text-micro tracking-wide text-xn-fmt-notes">
              From YouTube · {VIDEO.channel}
            </span>

            <h1 className="mt-5 max-w-[18ch] font-serif text-[52px] leading-[1.05] text-xn-ink">
              {NOTES_DOC.title}
            </h1>

            {/* NO AUTHOR ROW. The reference carries a name, an avatar and a
                draft number. This product holds none of them for a document —
                the author is the signed-in user, whose name it does not have
                here — and three blanks that ARE the line is the newsletter
                masthead mistake §13 records. The chip above carries the one
                piece of provenance that is real. */}

            {surface}
          </div>
        </div>

        <Conformance />
      </div>
    </div>
  );
}
