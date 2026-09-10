// src/app/dev/output-blocks/content.tsx
//
// Three documents at three densities, sharing one block vocabulary. Not shipped.
//
// ── Why one specimen and not three ──
//
// Summary, notes and research were confirmed to share direction D's shell
// (§16.4). They differ in WHICH BLOCKS THEY USE and how densely, not in
// structure — so the thing being designed is one vocabulary, and the honest way
// to judge it is to see the same renderers carry all three loads.
//
// ── The content is real, and the papers are real ──
//
// Written rather than generated. Lorem cannot tell you whether a derivation is
// legible or whether a citation marker interrupts a sentence, and those are the
// only questions this route exists to answer. The mathematics is the standard
// scaled-dot-product argument and the four references are genuine papers.
//
// ── What is AUTHORED that generation cannot produce today ──
//
// All of it, essentially. The prompts do not ask for LaTeX, citations, worked
// examples or definitions — read `backend/app/services/prompts.py`. Per §16 the
// direction of dependency runs the other way: this specimen says what the
// content should be, and the backend is built to produce it. Nothing here is a
// claim about current behaviour.

export interface Reference {
  id: string;
  authors: string;
  year: number;
  title: string;
  venue: string;
}

export type Block =
  | { kind: "para"; text: string }
  | { kind: "list"; items: string[]; ordered?: boolean }
  | { kind: "quote"; text: string }
  | { kind: "table"; head: string[]; rows: string[][]; caption?: string }
  | { kind: "code"; text: string }
  /** A display formula. Carries an id only when prose needs to refer to it. */
  | { kind: "math"; tex: string; id?: string }
  /** A numbered multi-step argument. Every step gets an equation number. */
  | { kind: "derivation"; title?: string; steps: DerivationStep[] }
  /** A worked example. Nests blocks, because an example contains prose AND maths. */
  | { kind: "example"; title: string; blocks: Block[] }
  | { kind: "definition"; term: string; meaning: string };

export interface DerivationStep {
  id: string;
  tex: string;
  /** Why this step follows from the last. The part a student actually needs. */
  note?: string;
}

export interface Section {
  id: string;
  heading: string;
  blocks: Block[];
}

export interface Doc {
  /** Drives the density switch and the chip in the bar. */
  type: "summary" | "notes" | "research";
  title: string;
  dek: string;
  sections: Section[];
  references: Reference[];
}

// ── Inline syntax, used inside `para` and a few other text fields ──
//
//   ==phrase==        key-phrase highlight, carried over from the blog work
//   $x^2$             inline maths
//   [@vaswani17]      citation marker, resolved against `references`
//   [#eq-scaling]     equation reference, resolved to that equation's number
//
// Four markers rather than one general escape because each resolves against a
// different thing, and a parser that cannot tell them apart cannot render them
// differently.

// ── The references, shared by the research document ─────────

export const REFERENCES: Reference[] = [
  {
    id: "vaswani17",
    authors: "Vaswani, A. et al.",
    year: 2017,
    title: "Attention Is All You Need",
    venue: "NeurIPS",
  },
  {
    id: "ba16",
    authors: "Ba, J., Kiros, J., Hinton, G.",
    year: 2016,
    title: "Layer Normalization",
    venue: "arXiv:1607.06450",
  },
  {
    id: "geva21",
    authors: "Geva, M. et al.",
    year: 2021,
    title: "Transformer Feed-Forward Layers Are Key-Value Memories",
    venue: "EMNLP",
  },
  {
    id: "shazeer20",
    authors: "Shazeer, N.",
    year: 2020,
    title: "GLU Variants Improve Transformer",
    venue: "arXiv:2002.05202",
  },
];

// ── SUMMARY — brief, light on technical detail ──────────────
//
// Deliberately uses only `para` and `list`. If the vocabulary needs a formula
// to make a summary work, the density brief was wrong.

export const SUMMARY_DOC: Doc = {
  type: "summary",
  title: "How a transformer reads a sentence",
  dek: "The mechanism under “attention”, in the order it happens.",
  sections: [
    {
      id: "what-it-does",
      heading: "What it does",
      blocks: [
        {
          kind: "para",
          text: "A transformer turns each word into a list of numbers, lets those lists compare themselves against one another, and reads the final numbers as a prediction about what comes next. ==Everything else is machinery in service of that loop.==",
        },
        {
          kind: "para",
          text: "The comparison step is the only place a word's meaning is allowed to depend on the words around it. Before it, “bank” is the same vector on a river or at a cashpoint.",
        },
      ],
    },
    {
      id: "the-parts",
      heading: "The parts, briefly",
      blocks: [
        {
          kind: "list",
          items: [
            "**Embeddings** turn tokens into directions in a high-dimensional space, where distance carries meaning.",
            "**Attention** lets each token pull in information from the others, weighted by how relevant they are to it.",
            "**Multiple heads** run that in parallel, so different heads can specialise in different kinds of relevance.",
            "**Feed-forward layers** sit between attention blocks and hold most of the model's parameters.",
          ],
        },
        {
          kind: "para",
          text: "Attention moves information between positions; the layer after it decides what the mixture means.",
        },
      ],
    },
    {
      id: "why-it-matters",
      heading: "Why it matters for prompting",
      blocks: [
        {
          kind: "para",
          text: "Placement, repetition and length all affect output for mechanical reasons rather than stylistic ones: attention falls off with distance, repetition raises the weight a constraint can attract, and ==every token competes for a share of the same softmax==.",
        },
      ],
    },
  ],
  references: [],
};

// ── NOTES — technical, for a student ────────────────────────
//
// Formulas, a worked example, definitions and a table. No citations: notes are
// for learning the material, not for defending a claim.

export const NOTES_DOC: Doc = {
  type: "notes",
  title: "Scaled dot-product attention",
  dek: "Working notes: the mechanism, the terms, and why the scaling factor is there.",
  sections: [
    {
      id: "the-operation",
      heading: "The operation",
      blocks: [
        {
          kind: "para",
          text: "Each token emits three projections of itself. The names are borrowed from databases and are not especially helpful, so learn them by what they do rather than what they are called.",
        },
        {
          kind: "definition",
          term: "Query ($q$)",
          meaning: "What this token is looking for in the others. Compared against every key.",
        },
        {
          kind: "definition",
          term: "Key ($k$)",
          meaning: "What this token offers to anything looking. A large $q \\cdot k$ means a match.",
        },
        {
          kind: "definition",
          term: "Value ($v$)",
          meaning: "The content actually passed along when a match happens.",
        },
        {
          kind: "para",
          text: "The whole operation is one expression, and every part of it is doing something you can name:",
        },
        {
          kind: "math",
          id: "eq-attention",
          tex: "\\text{Attention}(Q, K, V) = \\text{softmax}\\!\\left(\\frac{QK^{\\top}}{\\sqrt{d_k}}\\right)V",
        },
        {
          kind: "para",
          text: "In [#eq-attention], $QK^{\\top}$ scores every query against every key, the softmax turns those scores into weights that sum to one, and multiplying by $V$ blends the values in those proportions.",
        },
      ],
    },
    {
      id: "the-scaling",
      heading: "Why divide by √d_k",
      blocks: [
        {
          kind: "para",
          text: "==The division is not decoration.== Without it, dot products in a few thousand dimensions grow large enough that softmax saturates, gradients vanish, and the model stops learning.",
        },
        {
          kind: "example",
          title: "Worked example — what happens at d_k = 64",
          blocks: [
            {
              kind: "para",
              text: "Take $q$ and $k$ with independent components, each mean $0$ and variance $1$. Their dot product is a sum of $d_k$ such products:",
            },
            {
              kind: "math",
              tex: "q \\cdot k = \\sum_{i=1}^{d_k} q_i k_i",
            },
            {
              kind: "para",
              text: "Each term has variance $1$, and the terms are independent, so the variance of the sum is $d_k = 64$ and its standard deviation is $8$. Scores therefore land roughly in $[-24, 24]$ at three standard deviations — wide enough that softmax is already close to one-hot before training starts.",
            },
            {
              kind: "para",
              text: "Dividing by $\\sqrt{d_k} = 8$ returns the variance to $1$ and the scores to roughly $[-3, 3]$, where softmax still has a usable gradient.",
            },
          ],
        },
      ],
    },
    {
      id: "heads",
      heading: "Why there are many heads",
      blocks: [
        {
          kind: "para",
          text: "One attention pattern commits to one notion of relevance. Real sentences need several at once, so several attention operations run in parallel with their own learned projections.",
        },
        {
          kind: "table",
          caption: "Patterns read off trained models. Nobody assigns a head its job.",
          head: ["Head", "Tends to learn", "Visible as"],
          rows: [
            ["Positional", "Nearby tokens", "A band along the diagonal"],
            ["Syntactic", "Grammatical dependency", "Verbs attending to subjects"],
            ["Coreference", "What a pronoun points at", "Sharp off-diagonal spikes"],
          ],
        },
        {
          kind: "para",
          text: "The specialisation is emergent and only partly interpretable. Plenty of heads do nothing legible at all.",
        },
        {
          kind: "code",
          text: "scores  = Q @ K.T / sqrt(d_k)\nweights = softmax(scores)      # rows sum to 1\nout     = weights @ V",
        },
      ],
    },
  ],
  references: [],
};

// ── RESEARCH — deeply technical, cited ──────────────────────
//
// The type that exercises every block: a numbered derivation, citations
// resolving to the Sources pane, dense tables, and claims attached to papers.

export const RESEARCH_DOC: Doc = {
  type: "research",
  title: "Where a transformer's capacity actually sits",
  dek: "Attention receives the attention. Most of the parameters, and probably most of the stored knowledge, are somewhere else.",
  sections: [
    {
      id: "claim",
      heading: "The claim, and what supports it",
      blocks: [
        {
          kind: "para",
          text: "The attention mechanism introduced in [@vaswani17] is the architecture's defining operation, but it is not where most of its capacity lives. ==In a standard block, roughly two thirds of the parameters sit in the position-wise feed-forward network==, not in the attention projections.",
        },
        {
          kind: "para",
          text: "That is an arithmetic claim before it is an empirical one, and it is worth deriving rather than asserting.",
        },
        {
          kind: "derivation",
          title: "Parameter count per block",
          steps: [
            {
              id: "eq-attn-params",
              tex: "P_{\\text{attn}} = 4 d_{\\text{model}}^{2}",
              note: "Four projections — query, key, value and output — each a $d_{\\text{model}} \\times d_{\\text{model}}$ matrix.",
            },
            {
              id: "eq-ffn-params",
              tex: "P_{\\text{ffn}} = 2 d_{\\text{model}} d_{\\text{ff}}",
              note: "Two matrices, up and back down, through an inner width $d_{\\text{ff}}$.",
            },
            {
              id: "eq-ratio",
              tex: "\\frac{P_{\\text{ffn}}}{P_{\\text{attn}}} = \\frac{2 d_{\\text{model}} d_{\\text{ff}}}{4 d_{\\text{model}}^{2}} = \\frac{d_{\\text{ff}}}{2 d_{\\text{model}}}",
              note: "Dividing through. The model width cancels, leaving only the expansion ratio.",
            },
            {
              id: "eq-ratio-4",
              tex: "d_{\\text{ff}} = 4 d_{\\text{model}} \\implies \\frac{P_{\\text{ffn}}}{P_{\\text{attn}}} = 2",
              note: "At the conventional expansion of four, the feed-forward network carries twice the parameters of attention — two thirds of the block.",
            },
          ],
        },
        {
          kind: "para",
          text: "The ratio in [#eq-ratio] is independent of model width, so the conclusion holds across scales rather than at one size.",
        },
      ],
    },
    {
      id: "evidence",
      heading: "What the layer appears to be doing",
      blocks: [
        {
          kind: "para",
          text: "[@geva21] argues the feed-forward layers operate as key-value memories: the first matrix detects patterns over the input, and the second retrieves a distribution associated with whatever fired. On that reading, ==editing specific rows changes what the model asserts about a specific entity== without touching attention at all.",
        },
        {
          kind: "table",
          caption: "Where each component sits in the block, by role and share.",
          head: ["Component", "Parameters", "Role", "Evidence"],
          rows: [
            ["Attention projections", "$4 d_{\\text{model}}^{2}$", "Moves information between positions", "[@vaswani17]"],
            ["Feed-forward", "$2 d_{\\text{model}} d_{\\text{ff}}$", "Transforms at a position", "[@geva21]"],
            ["Layer norm", "$2 d_{\\text{model}}$", "Stabilises activations", "[@ba16]"],
            ["Gated variants", "$3 d_{\\text{model}} d_{\\text{ff}}$", "Replaces the FFN non-linearity", "[@shazeer20]"],
          ],
        },
        {
          kind: "para",
          text: "The gated variants in [@shazeer20] raise the feed-forward share further, which sharpens rather than weakens the claim.",
        },
        {
          kind: "quote",
          text: "Attention decides what to mix. The layer after it decides what the mixture means.",
        },
      ],
    },
    {
      id: "limits",
      heading: "Limits of the argument",
      blocks: [
        {
          kind: "para",
          text: "Parameter count is not capability. A component holding most of the weights need not hold most of the behaviour, and the key-value reading of [@geva21] is an interpretation of observed activations rather than a proof of mechanism.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The counts above exclude embeddings, which at small model widths are a large share of the total.",
            "$d_{\\text{ff}} = 4 d_{\\text{model}}$ is convention, not law; the ratio moves with it.",
            "Attention's cost is dominated by sequence length at inference, which parameter counts do not capture at all.",
          ],
        },
      ],
    },
  ],
  references: REFERENCES,
};

export const DOCS: Doc[] = [SUMMARY_DOC, NOTES_DOC, RESEARCH_DOC];
