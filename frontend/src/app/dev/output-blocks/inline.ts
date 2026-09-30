// src/app/dev/output-blocks/inline.ts
//
// The inline marker vocabulary. Not shipped.
//
// ── Why the rules live apart from the renderers ──
//
// Two surfaces render the same four markers and CANNOT share a renderer. This
// specimen renders React, recursing into JSX. The editor's document is
// uncontrolled DOM — rendered once through `dangerouslySetInnerHTML`, then
// owned by the browser, because a controlled `contentEditable` re-renders per
// keystroke and loses the caret. React cannot own that subtree.
//
// So the RULES live here once and each surface writes its own output: JSX in
// `blocks.tsx`, HTML strings in the editor. The alternative is the regex in two
// places, which is how the two drift — one gains a marker and the other goes on
// showing it as literal characters, silently, because nothing fails.
//
// This is a shared module inside one specimen, not two specimens importing from
// each other: the editor is already built on this folder's `content.tsx`. The
// note at the bottom of `blocks.tsx` draws that line, and the blog specimen's
// own labelled copy stays where it is.

/**
 * Four markers, each resolving against something different, which is why they
 * are four markers and not one escape:
 *
 *   ==phrase==     a highlight — resolves against nothing, it is presentation
 *   $x^2$          maths       — resolves against KaTeX
 *   [@vaswani17]   citation    — resolves against the document's references
 *   [#eq-scaling]  equation    — resolves against the numbering pass
 *
 * A single alternation keeps them in one pass, so a citation inside a
 * highlighted phrase still renders as a citation.
 */
export const INLINE = /(==[^=]+==|\$[^$\n]+\$|\[@[A-Za-z0-9_-]+\]|\[#[A-Za-z0-9_-]+\])/g;

/** Minimal bold, so a list item can emphasise a term without a markdown parser. */
const BOLD = /(\*\*[^*]+\*\*)/g;

/**
 * One piece of a parsed line.
 *
 * ── The three ATOM kinds carry `src`; the other three do not ──
 *
 * `src` is the exact characters the marker was written as. A renderer that
 * replaces `$q$` with rendered maths has destroyed the only copy of `q` unless
 * it keeps the source, and the editor needs it twice over: to put back when a
 * save serialises the DOM, and to count words with, since KaTeX emits its
 * formula two or three times over and `textContent` would count every copy.
 *
 * A highlight deliberately has no `src`. Its contents stay editable prose, so a
 * stored source would go stale the moment someone typed inside it — the
 * reconstruction has to come from the live DOM instead.
 */
export type InlineSeg =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "highlight"; inner: InlineSeg[] }
  | { kind: "math"; src: string; tex: string }
  | { kind: "cite"; src: string; id: string }
  | { kind: "eqref"; src: string; id: string };

/** Split one line into its markers and the prose between them. */
export function parseInline(text: string): InlineSeg[] {
  const segs: InlineSeg[] = [];

  for (const part of text.split(INLINE)) {
    // `split` on an alternation yields empty strings where two markers touch.
    if (!part) continue;

    if (part.startsWith("==") && part.endsWith("==") && part.length > 4) {
      segs.push({ kind: "highlight", inner: parseInline(part.slice(2, -2)) });
    } else if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
      segs.push({ kind: "math", src: part, tex: part.slice(1, -1) });
    } else if (part.startsWith("[@") && part.endsWith("]")) {
      segs.push({ kind: "cite", src: part, id: part.slice(2, -1) });
    } else if (part.startsWith("[#") && part.endsWith("]")) {
      segs.push({ kind: "eqref", src: part, id: part.slice(2, -1) });
    } else {
      for (const seg of part.split(BOLD)) {
        if (!seg) continue;
        if (seg.startsWith("**") && seg.endsWith("**") && seg.length > 4) {
          segs.push({ kind: "bold", text: seg.slice(2, -2) });
        } else {
          segs.push({ kind: "text", text: seg });
        }
      }
    }
  }

  return segs;
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

/**
 * The highlighter's hand-drawn edge, as a mask.
 *
 * A rectangle of colour reads as a UI selection; an uneven top and bottom reads
 * as a pen. The shape is a mask rather than a background so it works over any
 * colour — the mask decides the silhouette and the colour underneath decides
 * the hue, which is what lets one shape serve five marks.
 *
 * Lives here because both renderers now need it and the SVG path is the kind of
 * thing nobody re-derives correctly once it has drifted.
 */
const HIGHLIGHT_MASK_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 24' preserveAspectRatio='none'><path d='M0,3.4 C14,5.2 30,1.9 43,3.4 C57,4.9 74,1.6 88,3.1 C94,3.8 97,2.1 100,3.6 L100,21.0 C87,23.2 69,20.2 54,21.7 C39,23.1 21,20.4 8,22.2 C4,22.7 2,21.2 0,22.0 Z' fill='#000'/></svg>";

export const HIGHLIGHT_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  HIGHLIGHT_MASK_SVG,
)}")`;

/**
 * The single stroke's colour pair, settled in the blog work: lime, opaque on
 * dark at a luminance that does not glare, with near-black text in the band.
 *
 * It sits beside the mask because it is the other half of the same stroke, and
 * because the editor now draws that stroke too and must draw the REAL one — a
 * comparison against an approximation of it would decide nothing.
 *
 * Not a global token yet, deliberately. Each surface sets `--xn-hl` and
 * `--xn-hl-ink` on a wrapper of its own; §16 is where the pair joins
 * `globals.css` as `--xn-mark-lime`.
 */
export const HIGHLIGHT_LIME = {
  light: { bg: "#d8f24f", ink: "var(--xn-ink)" },
  dark: { bg: "#a6c03c", ink: "#12150b" },
} as const;
