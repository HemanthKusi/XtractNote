"use client";

// src/app/dev/blog-directions/shared.tsx
//
// The sample post every direction renders, plus the few things all four need.
// Not shipped.
//
// ── Why the post is STRUCTURED rather than a markdown string ──
//
// The shipped renderer takes one markdown blob and prints it. That is exactly
// why a blog post and a summary look identical today: nothing downstream can
// address a section, so nothing can index one, anchor an artefact beside one,
// or seek a video to one. Three of these four directions are about doing
// something per-section, so the specimen models the post as sections that
// carry their own identity and their own source range.
//
// That is a claim about the DESIGN, not about the backend. Generation returns
// prose today, and whether the sections come from a real outline or from
// parsing headings out of markdown is a separate decision — see the note on
// SECTION PROVENANCE below.
//
// ── SECTION PROVENANCE — what is real and what is authored ──
//
// The `from`/`to` seconds on each section are AUTHORED. Nothing in the
// pipeline maps a generated paragraph back to a transcript range today, and
// pretending otherwise is the kind of decorative accuracy the create route's
// generating screen already got wrong once. Directions B and D show what the
// surface would look like WITH that mapping; they are a design question put
// to Hemanth, not a description of the backend.

import { useEffect, useState, type CSSProperties } from "react";

// ── The source video ────────────────────────────────────────
//
// The same clip the create directions use, deliberately: continuity across
// specimens, and a thumbnail URL already known to resolve.

export const VIDEO = {
  videoId: "wjZofJX0v4M",
  title: "Transformers, the tech behind LLMs | Deep Learning Chapter 5",
  channel: "3Blue1Brown",
  url: "https://www.youtube.com/watch?v=wjZofJX0v4M",
  durationSeconds: 1687,
} as const;

// ── The post ────────────────────────────────────────────────

export type Block =
  | { kind: "para"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "quote"; text: string; attribution?: string }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "code"; text: string };

export interface Section {
  id: string;
  heading: string;
  /** Where in the source this section came from. AUTHORED — see the note above. */
  from: number;
  to: number;
  blocks: Block[];
}

export interface Post {
  title: string;
  dek: string;
  sections: Section[];
}

export const POST: Post = {
  title: "How a transformer actually reads your sentence",
  dek: "Attention gets explained as “the model decides what to focus on”, which is true and almost useless. Here is the mechanism underneath it, in the order it happens.",
  sections: [
    {
      id: "one-sentence",
      heading: "The one-sentence version",
      from: 0,
      to: 134,
      blocks: [
        {
          kind: "para",
          text: "A transformer turns each word into a list of numbers, lets those lists repeatedly compare themselves against one another, and reads the final numbers as a prediction about what comes next. ==Everything else — attention heads, positional encoding, the feed-forward layers — is machinery in service of that loop.==",
        },
        {
          kind: "para",
          text: "The part worth slowing down on is the comparison step, because ==it is the only place where a word's meaning is allowed to depend on the words around it==. Before that step, “bank” is one fixed list of numbers whether you are standing on a river or cashing a cheque.",
        },
      ],
    },
    {
      id: "vectors",
      heading: "Words become directions in space",
      from: 134,
      to: 450,
      blocks: [
        {
          kind: "para",
          text: "Every token in the vocabulary gets a vector — a few thousand numbers, learned during training. You can think of that vector as a direction in a very high-dimensional space, and the useful property is that directions turn out to carry meaning rather than just identity.",
        },
        {
          kind: "para",
          text: "The famous demonstration is arithmetic on those directions. Take the vector for “king”, subtract “man”, add “woman”, and you land near “queen”. That is not a party trick bolted on afterwards; ==it falls out of training a model to predict text, because words used in similar contexts drift toward similar directions==.",
        },
        {
          kind: "quote",
          text: "The embedding isn't a lookup table of meanings. It's a map where distance and direction are the meaning.",
        },
        {
          kind: "para",
          text: "One consequence matters for everything that follows: at this stage every occurrence of a word has an identical vector. Position hasn't been encoded yet, context hasn't been applied yet. The sentence is still a bag of directions.",
        },
      ],
    },
    {
      id: "attention",
      heading: "Attention is words looking at each other",
      from: 450,
      to: 845,
      blocks: [
        {
          kind: "para",
          text: "Attention is the step that lets one token's vector be updated by the others. Each token emits three different projections of itself, and the names are unhelpfully borrowed from databases:",
        },
        {
          kind: "list",
          items: [
            "A query — roughly, “what am I looking for?”",
            "A key — roughly, “what do I offer to whoever is looking?”",
            "A value — the content actually passed along when a match happens",
          ],
        },
        {
          kind: "para",
          text: "Every query is compared against every key by taking a dot product, which is large when two directions align. Those scores are softmaxed into weights, and each token's new vector becomes a weighted blend of the values it attended to. A pronoun learns which noun it refers to by scoring highly against that noun's key.",
        },
        {
          kind: "code",
          text: "scores  = Q @ K.T / sqrt(d_k)\nweights = softmax(scores)      # rows sum to 1\nout     = weights @ V",
        },
        {
          kind: "para",
          text: "The division by the square root of the key dimension is not decoration. ==Without it, dot products in a few thousand dimensions grow large enough that softmax saturates, gradients vanish, and the model stops learning.==",
        },
      ],
    },
    {
      id: "multi-head",
      heading: "Why there are many heads",
      from: 845,
      to: 1180,
      blocks: [
        {
          kind: "para",
          text: "One attention pattern has to commit to one notion of relevance. Real sentences need several at once — which noun a pronoun refers to, which adjective modifies which noun, where the clause boundary falls. Running several attention operations in parallel, each with its own learned projections, lets different heads specialise.",
        },
        {
          kind: "table",
          head: ["Head", "Tends to learn", "Visible as"],
          rows: [
            ["Positional", "Nearby tokens", "A band along the diagonal"],
            ["Syntactic", "Grammatical dependency", "Verbs attending to subjects"],
            ["Coreference", "What a pronoun points at", "Sharp off-diagonal spikes"],
          ],
        },
        {
          kind: "para",
          text: "Those labels are read off trained models after the fact. Nobody assigns a head a job; the specialisation is emergent, it is only partly interpretable, and plenty of heads do nothing legible at all.",
        },
      ],
    },
    {
      id: "feed-forward",
      heading: "The layer nobody talks about",
      from: 1180,
      to: 1452,
      blocks: [
        {
          kind: "para",
          text: "Attention gets the attention, but ==roughly two thirds of a transformer's parameters live in the feed-forward layers== that sit between attention blocks. Each one takes a single token's vector, projects it up into a much wider space, applies a non-linearity, and projects it back down.",
        },
        {
          kind: "para",
          text: "A useful reading is that attention moves information between positions, and the feed-forward layer does the thinking at a position. It is also the best current candidate for where factual associations are stored — edit the right rows there and you can change what a model claims about a specific entity without touching attention at all.",
        },
        {
          kind: "quote",
          text: "Attention decides what to mix. The layer after it decides what the mixture means.",
        },
      ],
    },
    {
      id: "prompting",
      heading: "What this changes about prompting",
      from: 1452,
      to: 1687,
      blocks: [
        {
          kind: "para",
          text: "Once you have seen the mechanism, some prompting folklore stops being folklore. ==Putting the instruction near the content works because attention scores fall off with distance in most heads.== Repeating a constraint helps because repetition raises how much weight it can attract. ==Long contexts degrade because every token competes for a share of the same softmax.==",
        },
        {
          kind: "para",
          text: "None of that makes prompting a science, and the model is not reasoning about your instruction in the way the word suggests. But it does explain why the advice that circulates tends to be structural — about placement, repetition and length — rather than about phrasing.",
        },
      ],
    },
  ],
};

// ── Derived, so the metadata line is measured rather than asserted ──

function wordsIn(section: Section): number {
  return section.blocks.reduce((total, block) => {
    const text =
      block.kind === "list"
        ? block.items.join(" ")
        : block.kind === "table"
          ? [...block.head, ...block.rows.flat()].join(" ")
          : block.text;
    return total + text.split(/\s+/).filter(Boolean).length;
  }, 0);
}

export const WORD_COUNT = POST.sections.reduce((n, s) => n + wordsIn(s), 0);

/**
 * Reading time.
 *
 * ── Why not words ÷ 225 ──
 *
 * That figure is for continuous narrative prose, and it reported 3 minutes
 * for this post — which is wrong in a way you can feel, because it counts a
 * three-line code block as about four words and a table as its cell text.
 * Nobody reads either at 225 words a minute; they stop.
 *
 * So: prose is counted at 200 wpm rather than 225, because expository
 * technical writing with defined terms is genuinely slower than narrative,
 * and blocks you have to parse are charged as DWELL rather than as words —
 * a flat cost per code line and per table row, independent of how many
 * words happen to be in them.
 *
 * The numbers are judgement, not measurement, and they are deliberately
 * conservative: over-promising a short read is worse than the reverse.
 */
const PROSE_WPM = 200;
const SECONDS_PER_CODE_LINE = 9;
const SECONDS_PER_TABLE_ROW = 7;

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function readingSeconds(): number {
  let words = 0;
  let dwell = 0;

  for (const section of POST.sections) {
    words += countWords(section.heading);
    for (const block of section.blocks) {
      switch (block.kind) {
        case "para":
        case "quote":
          words += countWords(block.text);
          break;
        case "list":
          words += countWords(block.items.join(" "));
          break;
        case "code":
          dwell += block.text.split("\n").length * SECONDS_PER_CODE_LINE;
          break;
        case "table":
          // The header row counts: it is what you read to understand the rest.
          dwell += (block.rows.length + 1) * SECONDS_PER_TABLE_ROW;
          break;
      }
    }
  }

  return (words / PROSE_WPM) * 60 + dwell;
}

export const READ_MINUTES = Math.max(1, Math.round(readingSeconds() / 60));

// ── The transcript, for the directions that show provenance ─
//
// AUTHORED to match the sections above. A real transcript comes back from the
// backend as timed cues; this is enough of one to judge a layout against.

export interface Cue {
  at: number;
  text: string;
}

export const TRANSCRIPT: Cue[] = [
  { at: 0, text: "Let's start with what a transformer is actually doing, end to end." },
  { at: 62, text: "It reads a sequence, and it predicts what token comes next." },
  { at: 134, text: "The first thing that happens is every token becomes a vector." },
  { at: 212, text: "These are learned. Similar words end up pointing in similar directions." },
  { at: 318, text: "King minus man plus woman lands you very close to queen." },
  { at: 450, text: "Now for the part that makes this architecture work: attention." },
  { at: 528, text: "Each token produces a query, a key, and a value." },
  { at: 640, text: "You take the dot product of every query with every key." },
  { at: 731, text: "And you divide by the square root of the key dimension." },
  { at: 845, text: "One head can only represent one kind of relationship." },
  { at: 962, text: "So we run several in parallel, each with its own projections." },
  { at: 1180, text: "Between the attention blocks sit the feed-forward layers." },
  { at: 1300, text: "Most of the parameter count actually lives here." },
  { at: 1452, text: "Which brings us back to why prompts behave the way they do." },
  { at: 1580, text: "Placement matters because attention falls off with distance." },
];

export function cuesFor(section: Section): Cue[] {
  return TRANSCRIPT.filter((cue) => cue.at >= section.from && cue.at < section.to);
}

// ── Highlighting ────────────────────────────────────────────
//
// Two different jobs, deliberately given two different treatments:
//
//   QUOTES         filled in the CONTENT TYPE's own colour
//   KEY PHRASES    struck through with ONE standard colour, every format
//
// ── Why a standard colour has to collide with something ──
//
// The seven format hues are blog 217°, notes 144°, social 176°, research
// 262°, quiz 342°, flashcards 17°, summary 40°. Every one of the design
// system's five existing marks lands on one of them — yellow on Summary,
// green on Notes, blue on Blog, pink on Quiz, purple on Research. Since a
// quote is filled with the format's colour, a key phrase in the same hue on
// the same page reads as the same kind of thing.
//
// Lime is the exception. At roughly 80° it sits inside the one wide gap the
// formats leave (40° → 144°), so it is the only candidate here that never
// collides with the colour a quote is wearing. That is the argument for it;
// the rest are offered so the claim can be looked at rather than believed.
//
// ── What is reused and what is proposed ──
//
// The five `--xn-mark-*` tokens already exist and are already theme-aware:
// solid pastels on light, translucent on dark so light text stays legible
// through them. globals.css calls them "groundwork for annotation data the
// generation path does not produce yet", which is exactly this. Lime is NOT
// a token — it is a proposal, and it carries its own pair of values.

/** A highlighter in one theme: the ink of the pen, and the text it sits under. */
export interface HighlighterTheme {
  /** The stroke colour. */
  bg: string;
  /** Text colour INSIDE the stroke. */
  ink: string;
}

export interface Highlighter {
  id: string;
  label: string;
  light: HighlighterTheme;
  dark: HighlighterTheme;
  note: string;
}

// ── Why dark mode needs a different treatment, not a different value ──
//
// The first attempt gave dark a wash at 22% alpha, matching what the system
// marks do. It reads dull, and that is not a badly chosen number — it is what
// the technique produces. A light colour at low alpha OVER NEAR-BLACK can
// only ever resolve to a dark, desaturated tint; the black underneath is most
// of the result. Raising the alpha does not rescue it either, because the
// text on top is near-white and needs the band to stay dark to be readable.
//
// A real highlighter over dark paper does not go dim, it goes OPAQUE — the
// ink covers the ground and whatever is under it reads dark against it. So
// on dark, lime becomes a solid band with near-black text inside it. That is
// why every candidate now carries its own ink colour.
//
// ── And then it has to be turned DOWN ──
//
// The first opaque version used the same lime as light mode. Opaque was
// right and the colour was not: at 15.3:1 against a near-black page it is a
// bright rectangle in a dark room, and the eye goes to it before the
// sentence it is marking. Distracting, which is the opposite of the job.
//
// The hue is unchanged; only its luminance comes down. That keeps it
// recognisably the same highlighter across themes instead of becoming a
// different colour on dark, and it lands the band nearer the page than the
// page is to white.
//
// Settled at 9.3:1 against the page, after 15.3 read as glare and 8.5 sat a
// little flat. Tuned by eye against measured numbers, not derived from a
// rule — the readable range here is wide and the choice inside it is taste.
//
// The five system marks keep their shipped behaviour deliberately. They are
// what the design system does today, and the comparison is the point: switch
// between lime and any of them on dark and the difference is the technique,
// not the hue.

export const HIGHLIGHTERS: Highlighter[] = [
  {
    id: "lime",
    label: "Lime",
    light: { bg: "#d8f24f", ink: "var(--xn-ink)" },
    dark: { bg: "#a6c03c", ink: "#12150b" },
    note: "Proposed, not a token. The only candidate whose hue no content type occupies. On dark it stays opaque but drops in luminance so it does not glare.",
  },
  {
    id: "yellow",
    label: "Yellow",
    light: { bg: "var(--xn-mark-yellow)", ink: "var(--xn-ink)" },
    dark: { bg: "var(--xn-mark-yellow)", ink: "var(--xn-ink)" },
    note: "The system default and the only mark used in the product today. Collides with Summary. Dark is the shipped 26% wash.",
  },
  {
    id: "green",
    label: "Green",
    light: { bg: "var(--xn-mark-green)", ink: "var(--xn-ink)" },
    dark: { bg: "var(--xn-mark-green)", ink: "var(--xn-ink)" },
    note: "System token. A soft mint rather than a neon. Collides with Study Notes.",
  },
  {
    id: "blue",
    label: "Blue",
    light: { bg: "var(--xn-mark-blue)", ink: "var(--xn-ink)" },
    dark: { bg: "var(--xn-mark-blue)", ink: "var(--xn-ink)" },
    note: "System token. Collides with Blog — on this very page, the quote colour.",
  },
  {
    id: "pink",
    label: "Pink",
    light: { bg: "var(--xn-mark-pink)", ink: "var(--xn-ink)" },
    dark: { bg: "var(--xn-mark-pink)", ink: "var(--xn-ink)" },
    note: "System token. Collides with Quiz.",
  },
  {
    id: "purple",
    label: "Purple",
    light: { bg: "var(--xn-mark-purple)", ink: "var(--xn-ink)" },
    dark: { bg: "var(--xn-mark-purple)", ink: "var(--xn-ink)" },
    note: "System token. Collides with Research.",
  },
];

// ── The marker stroke ───────────────────────────────────────
//
// ── Why a MASK and not a background ──
//
// The shipped `.mark-*` utilities are a linear-gradient covering 55%–92% of
// the line box: an underline-weight stroke, and half the text sits above it.
// A gradient cannot do anything else — its colour stops are straight lines,
// so every edge it produces is perfectly horizontal.
//
// A background-image of a hand-drawn stroke would give the shape but not the
// colour: a data-URI SVG cannot read `--xn-hl`, so the highlighter would stop
// being switchable. Masking inverts the problem. The SVG supplies only the
// SHAPE, and `background-color` supplies the colour — still a variable, still
// theme-aware, still driven by the picker.
//
// ── Why three strokes and not one ──
//
// A single shape repeated down the page is a rectangle with a wobble drawn
// on it; the eye finds the repeat immediately. Three variants cycled by
// position means no two marks in a paragraph share an outline, which is what
// actually reads as "somebody did this by hand" rather than any one edge.
//
// Each path is asymmetric on purpose: the ends are cut at different angles
// like a chisel tip, the top and bottom edges wander independently, and none
// of the four corners agree.
//
// ── Wrapping ──
//
// `box-decoration-break: clone` is what makes a phrase that breaks across
// lines get a whole stroke per line instead of one shape stretched over the
// bounding box with the gap between lines filled in. Without it a wrapped
// highlight is visibly one rectangle behind two lines of text.

// ── Why every path starts at x=0 and ends at x=100 ──
//
// The first version inset the ends — x from ~1 to ~98 — to cut them at an
// angle like a chisel tip. That clipped letters, and only on long marks,
// which is why it looked arbitrary.
//
// `mask-size: 100% 100%` with `preserveAspectRatio='none'` STRETCHES the
// viewBox across whatever the element's width happens to be, so a 2% inset
// is 2px on a short phrase and 12px on a wide one. The horizontal padding is
// a fixed 0.3em, so past a certain width the inset overtakes it and the
// stroke stops short of the text. No padding value fixes that — one is
// proportional and the other is not.
//
// So the ends are flush and the character lives entirely in the top and
// bottom edges, which do not scale the same way: line height barely varies,
// so their inset stays a stable fraction of a stable box.
const STROKES = [
  "M0,3.4 C14,5.2 30,1.9 43,3.4 C57,4.9 74,1.6 88,3.1 C94,3.8 97,2.1 100,3.6 L100,21.0 C87,23.2 69,20.2 54,21.7 C39,23.1 21,20.4 8,22.2 C4,22.7 2,21.2 0,22.0 Z",
  "M0,2.6 C16,1.2 33,4.4 48,2.4 C62,1.0 78,4.1 91,2.0 C95,1.5 98,3.3 100,1.9 L100,22.6 C84,20.0 66,23.4 50,21.2 C36,19.7 20,22.9 8,21.0 C4,20.5 2,22.5 0,21.3 Z",
  "M0,4.0 C10,2.0 26,5.0 40,2.8 C54,1.4 70,4.6 84,2.6 C91,1.6 96,4.0 100,2.4 L100,20.6 C90,22.8 74,19.8 58,21.9 C44,23.3 26,20.6 12,22.0 C7,22.5 3,20.8 0,21.8 Z",
];

function strokeMask(variant: number): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 24' preserveAspectRatio='none'>` +
    `<path d='${STROKES[variant % STROKES.length]}' fill='#000'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function markStyle(variant: number): CSSProperties {
  const mask = strokeMask(variant);
  return {
    backgroundColor: "var(--xn-hl)",
    // Set explicitly rather than inherited, so a treatment that goes opaque
    // on dark can put readable text back on top of itself.
    color: "var(--xn-hl-ink)",
    // The shape.
    maskImage: mask,
    WebkitMaskImage: mask,
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    // Padding takes the stroke past the text on all four sides, the way a
    // marker overshoots what it is marking. Vertical padding on an inline box
    // grows the paint area without touching line height, so nothing reflows.
    // The negative horizontal margin cancels the side padding so word spacing
    // is unchanged either side of a mark.
    padding: "0.16em 0.3em",
    margin: "0 -0.16em",
    boxDecorationBreak: "clone",
    WebkitBoxDecorationBreak: "clone",
  };
}

/**
 * Text with `==key phrase==` spans struck through in the current highlighter.
 *
 * `<mark>` is the right element — it means "marked for reference", and it is
 * announced as such — but its user-agent style is a yellow block with black
 * text, so both are reset.
 */
export function MarkedText({ text }: { text: string }) {
  const parts = text.split(/(==[^=]+==)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.length > 4 && part.startsWith("==") && part.endsWith("==") ? (
          // The variant comes from the phrase's own length rather than a
          // running count. A counter restarts at zero in every paragraph, so
          // the same stroke would lead each one — the repeat this exists to
          // avoid, just at a wider spacing.
          <mark key={index} className="bg-transparent" style={markStyle(part.length)}>
            {part.slice(2, -2)}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

// ── Helpers ─────────────────────────────────────────────────

export function timestamp(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// ── The scroll spy ──────────────────────────────────────────
//
// ── Why this is geometry and not an IntersectionObserver ──
//
// It was an observer, with `rootMargin: "-12% 0px -70% 0px"` narrowing the
// page to a band near the top and the active section being the first one
// intersecting it. That rule has a hole at the end of the document, and it
// is not an edge case — it is the last section of every post.
//
// To become active, a section's top has to reach the band. The last section
// only can if there is a screenful of content BELOW it to scroll through.
// There never is: it is the last thing on the page. So you read to the very
// bottom and the index still says section 5, and clicking section 6 scrolls
// there and highlights nothing, because `scrollIntoView` cannot put it at
// the top when there is no scroll left underneath it.
//
// A position rule fixes it honestly — the end of the document is a real
// state and it can be asked about directly. It has a second benefit that
// decided the approach: IntersectionObserver never fires at all in the
// browser tooling used here (measured — a trivial observer on a plainly
// visible element produced zero callbacks), so the observer version could
// not be tested before shipping it to Hemanth. Scrolling CAN be driven
// there, so this version is checkable.

/**
 * How far below the top of the scroller the "you are here" line sits.
 *
 * ── Why a fixed offset and not a fraction of the viewport ──
 *
 * It was `clientHeight * 0.25`, and that produced an off-by-one on every
 * index click: section N highlighted N-1.
 *
 * Jumping to a section aligns its heading `scroll-margin-top` below the top
 * of the scroller — 80px in the widest case here, because a pinned bar has
 * to clear. A fraction is only coincidentally larger than that. On a short
 * viewport a quarter is LESS than 80, so the clicked heading lands below the
 * line, fails the "has passed" test, and the previous section keeps the
 * highlight. Measured: every click off by one.
 *
 * A fixed line cannot drift relative to a fixed scroll margin. 96 sits below
 * the largest `scroll-mt` in these directions (80) with room to spare, and
 * just under the pinned bar, which is also where the answer to "what am I
 * reading" actually is: whatever begins just under the furniture.
 *
 * ── THE INVARIANT, for whoever changes a scroll-margin ──
 *
 * This must stay GREATER than the largest `scroll-mt-*` any direction puts
 * on a section. If a section's scroll margin ever exceeds it, a clicked
 * heading lands below the line and every jump highlights the section before
 * the one you asked for.
 *
 * There was a `Math.min(…, clientHeight * 0.5)` guard here for short
 * scrollers. It was removed because it reintroduced exactly the bug it sat
 * next to: on a 48px scroller it put the line at 24 against a heading
 * landing at 80, and every click was off by one again. Scaling the line to
 * the viewport is the mistake; there is no version of it that is safe.
 */
const READING_LINE_PX = 96;

/** Slack for fractional scroll heights, which do not land on integers. */
const BOTTOM_EPSILON = 2;

export interface SectionTop {
  id: string;
  /** Distance from the top of the scroller's content to this section's top. */
  top: number;
}

/**
 * Which section is being read, from geometry alone. Pure, so the rule can be
 * checked without a renderer — see the note above.
 *
 * Two rules, in order:
 *
 * 1. At the bottom of the scroller, the answer is the LAST section, whatever
 *    the reading line says. Reaching the end of the document is the reader
 *    saying they are in the final section, and no line-crossing test can
 *    observe that because the scroll runs out first.
 * 2. Otherwise, the last section whose top has passed the reading line.
 *    "Last past the line" rather than "first intersecting" so a long section
 *    holds the index while you read it, instead of the next one claiming it
 *    the moment its heading appears at the bottom of the screen.
 */
export function activeSectionFor(
  tops: SectionTop[],
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
): string | undefined {
  if (tops.length === 0) return undefined;

  if (scrollTop + clientHeight >= scrollHeight - BOTTOM_EPSILON) {
    return tops[tops.length - 1].id;
  }

  const line = scrollTop + READING_LINE_PX;
  let current = tops[0].id;
  for (const section of tops) {
    if (section.top > line) break;
    current = section.id;
  }
  return current;
}

/**
 * The nearest ancestor that actually scrolls.
 *
 * ── Why this is not `getElementById("main-content")` ──
 *
 * It was, and that id comes from a DIFFERENT BRANCH — the skip-link work,
 * which is not merged. On this branch the lookup returns null, the effect
 * returns early, and every section tracker in all four directions silently
 * stops working. Found by checking out `main` before committing, not by
 * anything going wrong on screen.
 *
 * A specimen should not depend on an unmerged change, and walking up to the
 * real scroller is better regardless: it works in the component showcase, it
 * survives the shell being restructured, and it cannot be broken by someone
 * renaming an id they have no reason to think anything reads.
 */
function scrollerFor(start: Element | null): HTMLElement | null {
  let node = start?.parentElement ?? null;
  while (node) {
    const overflowY = getComputedStyle(node).overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Which section is currently being read.
 *
 * The decision is `activeSectionFor`; this part only measures and feeds it.
 *
 * ── What triggers a re-measure ──
 *
 * Scrolling, and a ResizeObserver on both the scroller and its content.
 *
 * Scroll alone is not enough, and the gap was found in review. Section tops
 * move whenever the column reflows, and the things that reflow it here fire
 * no event at all: collapsing the live menu changes the content padding, the
 * source pane opening or closing changes the grid, a webfont swaps, a
 * thumbnail lands. After any of those the active section stays whatever it
 * was until the user happens to scroll.
 *
 * `window`'s resize event does not cover them either — the window never
 * changes size in any of those cases. That listener was what this used, and
 * it is exactly the mistake an earlier version of this comment described and
 * then failed to notice in the code below it.
 *
 * Two elements are observed because they move independently. The scroller's
 * own box changes width when the menu reserves more or less room; its content
 * changes HEIGHT while the scroller's height stays fixed at `h-full`, so
 * observing the scroller alone sees nothing when an image arrives.
 *
 * ── Why there is no rAF throttle ──
 *
 * There was one. It bought nothing measurable — this is six
 * `getBoundingClientRect` calls with no interleaved writes, so there is no
 * layout thrashing to avoid and the listener is passive — and it cost the
 * ability to observe the hook at all: rAF callbacks never run in the browser
 * tooling used here, so every scroll measurement was scheduled and dropped.
 *
 * A throttle that hides a bug is worse than no throttle at this scale. If a
 * post ever has enough sections for the reads to matter, cache the tops and
 * invalidate from the observer below — but measure first.
 */
export function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? "");

  useEffect(() => {
    const scroller = scrollerFor(document.getElementById(ids[0]));
    if (!scroller) return;

    const measure = () => {
      // Section tops in the scroller's CONTENT space, so they can be compared
      // against scrollTop directly.
      const base = scroller.getBoundingClientRect().top - scroller.scrollTop;
      const tops: SectionTop[] = [];
      for (const id of ids) {
        const element = document.getElementById(id);
        if (element) tops.push({ id, top: element.getBoundingClientRect().top - base });
      }

      const next = activeSectionFor(
        tops,
        scroller.scrollTop,
        scroller.clientHeight,
        scroller.scrollHeight,
      );
      if (next) setActive(next);
    };

    measure();
    scroller.addEventListener("scroll", measure, { passive: true });

    // Catches reflow from any cause rather than from an enumerated list of
    // events, which is the point — the list was wrong once already.
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);

    return () => {
      scroller.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [ids]);

  return active;
}

/** Scroll a section to the top of the shell's scroller. */
export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Glyphs ──────────────────────────────────────────────────

export function PlayGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path d="M5 3.5v9l8-4.5-8-4.5z" fill="currentColor" />
    </svg>
  );
}

export function CopyGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.5 3.5H3.8A1.3 1.3 0 0 0 2.5 4.8v6.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function RegenerateGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M13 8a5 5 0 1 1-1.6-3.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M13 2.5V5h-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
