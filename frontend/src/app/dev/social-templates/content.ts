// src/app/dev/social-templates/content.ts
//
// Sample copy for the social templates. NOT generated — every word here is
// hand-written.
//
// ── Why this file is typed the way it is ──
//
// The video-description prompt already specifies a three-part shape: an
// opening paragraph of 2-3 sentences, a bulleted "In this video:" list, and a
// closing line. That is a structure, not a blob, so the sample is typed to it
// rather than stored as one markdown string.
//
// This is deliberate and it is a proposal. Social stores `{ markdown }` today;
// §16 records that four tone variants need a body shape anyway, and a typed
// shape per platform is the cheaper thing to ask generation for than a string
// the frontend then has to take apart. The type below is what that contract
// would look like for one platform.
//
// ── The fold ──
//
// `opening` is the field the destination shows above its "...more" control.
// It is the only part of a description most viewers read, which is why the
// prompt caps it at 2-3 sentences and why it is a separate field here rather
// than the first paragraph of a longer string.

/** The four tone options offered for every platform. */
export const TONES = ["professional", "casual", "informative", "funny"] as const;

export type Tone = (typeof TONES)[number];

/**
 * What each tone is trying to be.
 *
 * Copy, so it lives with the copy. Every direction shows this differently —
 * one as a caption under the switch, one not at all — which is part of what
 * the directions are for.
 */
export const TONE_NOTE: Record<Tone, string> = {
  professional: "Measured and industry-facing. The safe default for a technical channel.",
  casual: "Second person, contractions, lower stakes. Reads like a person, not a press release.",
  informative: "Dense and neutral. Closest to what the current prompt already produces.",
  funny: "Jokes that still carry the facts. The variant most likely to need a human pass.",
};

/**
 * One video description, in the shape its prompt already asks for.
 *
 * Kept as three fields rather than markdown because the template renders them
 * in different places — `opening` above the fold, `points` and `closing`
 * below it — and a renderer that has to re-parse a string to find its own
 * fold boundary is the problem this shape avoids.
 */
export interface DescriptionCopy {
  /** 2-3 sentences. The part shown above the destination's "...more". */
  opening: string;
  /** The "In this video:" list. */
  points: string[];
  /** The sign-off line. */
  closing: string;
}

/**
 * The clip every specimen in this project uses, for continuity.
 *
 * Title, channel, duration and thumbnail are all metadata the app already
 * fetches today (§16.4), so these four fields are the ones the template can
 * be fed for real when it ports. Everything else the destination shows —
 * subscriber count, view count, upload date — is data this product does not
 * have, and the template renders those as visible blanks rather than
 * inventing them.
 */
export const VIDEO = {
  videoId: "wjZofJX0v4M",
  title: "Transformers, the tech behind LLMs | Deep Learning Chapter 5",
  channel: "3Blue1Brown",
  url: "https://www.youtube.com/watch?v=wjZofJX0v4M",
  duration: "28:07",
} as const;

/**
 * Four tones of the same description.
 *
 * They are deliberately the same length and cover the same points, because
 * the thing being judged is whether tone reads differently inside an
 * identical frame. A funny variant that is also twice as short would confound
 * the two.
 */
export const YOUTUBE_DESCRIPTION: Record<Tone, DescriptionCopy> = {
  professional: {
    opening:
      "A technical walkthrough of the transformer architecture that underpins modern large language models. The video traces the path from raw token embeddings through attention to a final probability distribution over next tokens, with each step motivated before it is formalised.",
    points: [
      "How tokens become vectors, and why direction in embedding space carries meaning",
      "The attention mechanism as a way for context to update word meaning",
      "Query, key and value matrices, and what each contributes",
      "Why multi-headed attention runs the operation many times in parallel",
      "How the multilayer perceptron blocks between attention layers store learned facts",
      "Where the parameter count of a production model actually goes",
    ],
    closing:
      "Subscribe for the rest of the deep learning series, and consider supporting the channel directly if the work is useful to you.",
  },

  casual: {
    opening:
      "Ever wondered what's actually going on inside ChatGPT? This one takes you through the transformer — the thing doing the heavy lifting — one piece at a time. No hand-waving, but no prerequisites beyond the earlier chapters either.",
    points: [
      "What a token is, and why turning words into vectors is the whole trick",
      "Attention, explained properly — how words change meaning based on context",
      "Queries, keys and values without the linear algebra headache",
      "Why running attention 96 times in parallel isn't as mad as it sounds",
      "The bit between the attention layers that nobody talks about",
      "Where all 175 billion parameters are actually hiding",
    ],
    closing:
      "If this made something click, stick around — there's a whole series here working up from the basics.",
  },

  informative: {
    opening:
      "Chapter 5 of the deep learning series covers the transformer architecture introduced in 2017. The video builds the model component by component: embeddings, attention, multi-headed attention, and the feed-forward blocks between layers, ending with how the final vector becomes a next-token prediction.",
    points: [
      "Tokenisation and embedding matrices — mapping a vocabulary into high-dimensional space",
      "The dot product as a measure of semantic alignment",
      "Single-head attention: query, key and value projections, and the masking step",
      "Multi-headed attention and parallel representation subspaces",
      "Multilayer perceptron blocks and their share of total parameters",
      "The unembedding step, softmax, and the role of temperature",
    ],
    closing:
      "Chapters 1 through 4 cover neural networks, gradient descent and backpropagation, and are worth watching first.",
  },

  funny: {
    opening:
      "You have been typing into a text box that contains roughly 175 billion numbers, and at no point did anyone explain what they do. This video fixes that. Turns out the answer is mostly matrix multiplication wearing a very convincing trench coat.",
    points: [
      "Words become vectors, because computers famously cannot read",
      "Attention: how 'bank' figures out whether it is near a river or your money",
      "Queries, keys and values — a filing system invented by people who hate filing",
      "Multi-headed attention, or: why do it once when you could do it ninety-six times",
      "The layers in between, quietly memorising every fact you will later argue with",
      "A tour of where the billions of parameters went, none of which is your prompt",
    ],
    closing:
      "Stick around for the rest of the series, in which the maths continues to be suspiciously reasonable.",
  },
};
