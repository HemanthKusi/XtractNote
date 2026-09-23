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

import type { SocialPlatform } from "@/lib/content/types";

/**
 * What each platform's artefact is called on the surface.
 *
 * The platform's own name is carried by its mark; this is the name of the
 * THING, which is what the user is actually looking at. "Thread" rather than
 * "X", "Video description" rather than "YouTube".
 */
export const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  linkedin: "Post",
  "x-thread": "Thread",
  instagram: "Caption",
  "youtube-description": "Video description",
  newsletter: "Newsletter",
};

/**
 * The platforms this specimen has templates for so far.
 *
 * Typed against `SocialPlatform` so a name that is not a real platform
 * cannot be added, and derived into a union below so the switcher cannot
 * offer one that has nothing to render.
 */
export const BUILT_PLATFORMS = [
  "youtube-description",
  "x-thread",
] as const satisfies readonly SocialPlatform[];

export type BuiltPlatform = (typeof BUILT_PLATFORMS)[number];

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

/** One tweet in a thread. */
export interface Tweet {
  text: string;
}

/**
 * How much thread the user wants.
 *
 * ── Why this is a setting and not a sixth platform ──
 *
 * A single tweet and a nine-tweet thread go to the same destination, in the
 * same frame, under the same 280-character rule. What differs is how much of
 * the video it tries to carry. A sixth platform would have made the picker
 * six wide to express one number.
 *
 * ── Why these are written, not sliced ──
 *
 * `long` is NOT the thread's first tweet, and `short` is not the first
 * three. A thread opener is written to be continued — it promises, it does
 * not deliver — so lifting it out alone produces a tweet that reads like the
 * start of something missing. Each length is its own artefact.
 *
 * ── `long` carries the whole explanation ──
 *
 * The first version of it was a teaser of about 250 characters and that was
 * wrong: a single tweet is not a shorter thread, it is the WHOLE THING
 * compressed into one artefact. If the user picks one tweet, every character
 * they are allowed is a character they should get.
 *
 * All four sit between 270 and 278 against the 280 limit — deliberately
 * close, because leaving 40 characters unused is leaving a clause of the
 * explanation out for no reason. It also means this length is the one most
 * likely to trip the over-budget state the moment generation writes it
 * rather than a human, which is an argument for validating before showing,
 * not for aiming lower.
 *
 * ── Generation, per Hemanth 2026-09-23 ──
 *
 * One length is generated by default and the rest on demand, when the user
 * asks for them. That keeps a social run at 1x plus whatever is actually
 * wanted, rather than generating variants to be discarded.
 *
 * THE CATCH, verified the same day: nothing persists the transcript. There
 * is no insert of it anywhere in the backend and no column for it in any
 * migration, and `/api/generate` fetches it inside the request — so every
 * on-demand regeneration is a fresh fetch, even one made seconds later.
 * Persisting the transcript is therefore a REQUIREMENT of this design, not a
 * nice-to-have, and re-fetching from a datacenter IP is §15's largest open
 * risk.
 */
export const LENGTHS = ["short", "long", "multiple"] as const;

export type ThreadLength = (typeof LENGTHS)[number];

/**
 * The cap each mode is written against.
 *
 * 280 is the free-account post limit. 25,000 is X Premium's long-post limit —
 * verified 2026-09-23 rather than recalled, because it is a platform number
 * and platform numbers move.
 *
 * THE LIMIT IS PER MODE, which is the structural change this brought. A
 * single global 280 was wrong the moment `long` was allowed to exceed it,
 * and a budget that is wrong in one mode is worse than no budget at all,
 * because it marks correct output as broken.
 *
 * ── Nothing enforces either number today ──
 *
 * Verified 2026-09-23: the only occurrence of 280 anywhere in this product
 * is the prompt string asking for "roughly 280 characters". No validation in
 * the service, none in the frontend. Over-budget output is a state
 * generation will reach, not a hypothetical, and on this platform it means
 * an artefact that cannot be posted at all.
 *
 * ── Counting is simplified, and that matters if it ever ships ──
 *
 * Plain string length here. The destination weights URLs at a fixed cost and
 * counts some characters as two. A specimen judging layout does not need
 * that; a counter the user trusts would, and quietly inheriting this
 * arithmetic would make it wrong in exactly the cases nearest the limit.
 */
export const LENGTH_LIMIT: Record<ThreadLength, number> = {
  short: 280,
  long: 25_000,
  multiple: 280,
};

/**
 * What a social run produces without being asked.
 *
 * `multiple`, because that is what the prompt writes today — "one item per
 * tweet", five to nine of them. The default should be the thing that already
 * exists, not the thing we would prefer; anything else would make the
 * specimen describe a pipeline that is not there.
 */
export const DEFAULT_LENGTH: ThreadLength = "multiple";

/**
 * Where the destination truncates a long post in the timeline.
 *
 * THE FOLD IS BACK, on a different platform, for a different reason. Premium
 * buys 25,000 characters to WRITE, and buys nothing at all in the timeline:
 * a long post still shows about 280 characters behind a "Show more". So the
 * first 280 decide whether the other 700 are ever read.
 *
 * That makes this the same finding as the video description's fold — a
 * boundary the prompt does not know exists, deciding what most readers
 * actually see — reached from a completely different direction.
 */
export const TIMELINE_FOLD = 280;

/** Modes that cannot be posted from a free account. */
export const NEEDS_PREMIUM: ReadonlySet<ThreadLength> = new Set<ThreadLength>(["long"]);

export const LENGTH_LABEL: Record<ThreadLength, string> = {
  short: "Short",
  long: "Long",
  multiple: "Multiple",
};

export const LENGTH_NOTE: Record<ThreadLength, string> = {
  short: "One post, inside the 280 any account can send.",
  long: "One post, the whole explanation. Needs Premium to send, and the timeline still folds it at 280.",
  multiple: "A thread. Every post inside 280, so any account can send it.",
};

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

/**
 * The X thread, professional tone.
 *
 * ── Tweet 4 is deliberately over the limit ──
 *
 * It is not a mistake and it should not be "fixed". The over-budget state is
 * the thing this specimen exists to design, and a sample where every tweet
 * fits would demonstrate the happy path only — which is exactly how a state
 * that the product will definitely reach ends up never being drawn.
 *
 * It is over by a realistic margin rather than absurdly: the failure to
 * design for is a model that ran slightly long, not one that returned an
 * essay.
 *
 * The remaining three tones follow once the card itself is settled.
 */
export const X_THREAD: Record<Tone, Record<ThreadLength, Tweet[]>> = {
  professional: {
    long: [
      {
        text:
          "Most explanations of large language models stop at \"it predicts the next word\". This one does not.\n\nIt builds the transformer component by component, and every piece is motivated before it is formalised. Tokens become vectors first, because direction in embedding space is what carries meaning, and nothing later makes sense until that is solid.\n\nThen attention: the mechanism that lets surrounding words rewrite what a word means, so \"bank\" resolves differently beside \"river\" than beside \"deposit\". Query, key and value are where most explanations lose people. Here each projection is motivated before it is written down, so you see why the operation is a dot product rather than being told that it is.\n\nMulti-headed attention runs that across 96 parallel subspaces. And the part nobody covers: the MLP blocks between attention layers, holding roughly two thirds of the parameters and most of what the model has actually learned.\n\n28 minutes, and you come out understanding the architecture rather than having heard about it.",
      },
    ],

    short: [
      {
        text: "The clearest transformer explanation I've found. Tokens become vectors, so meaning is a direction. Attention lets context rewrite that direction. 96 heads run it in parallel. And the MLP blocks between layers hold most of the 175B parameters, and most of the facts. 28 minutes.",
      },
    ],

    multiple: [
      {
        text: "You've been typing into a box backed by 175 billion numbers, and nobody has explained what they do. This is the clearest walkthrough of the transformer I've found — the architecture under every model you've used.",
      },
      {
        text: "It starts where it should: tokens become vectors. Direction in that space carries meaning, which is the whole trick. Nothing else in the architecture makes sense until this one is solid.",
      },
      {
        text: "Then attention, explained properly rather than gestured at. It is the mechanism that lets surrounding words update what a word means — so 'bank' resolves differently beside 'river' than beside 'deposit'.",
      },
      {
        text: "Query, key and value are where most explanations lose people, and this one does not. Each projection is motivated before it is written down, so you see why the operation is a dot product rather than being told that it is.",
      },
      {
        text: "Multi-headed attention then runs that whole operation in parallel, many times over, each head free to attend to a different kind of relationship. Ninety-six of them in a production model.",
      },
      {
        text: "The part nobody talks about: the MLP blocks between attention layers, which hold most of the parameters and most of the learned facts. Worth the 28 minutes if you have been meaning to actually understand this.",
      },
    ],
  },

  casual: {
    long: [
      {
        text:
          "you've been using ChatGPT for years without knowing what's actually inside it. this is the video that fixes that, and it doesn't cheat.\n\nno \"it's like a brain\" hand-waving. it builds the thing piece by piece and every piece earns its place.\n\nwords become vectors first, so meaning turns into a direction you can do maths on. that one move is the whole trick and everything else follows from it.\n\nthen attention, which is how context rewrites meaning. \"bank\" next to \"river\" ends up somewhere completely different from \"bank\" next to \"deposit\", and you watch it happen in the maths rather than being told it does.\n\nqueries, keys and values sound like a database and basically are one. each word asks a question, every other word answers, answers get mixed by how well they match. then it runs 96 of those at once because why not.\n\nand the layers in between? that's where most of the parameters live, quietly storing facts you'll later argue with it about.\n\n28 minutes. genuinely worth it.",
      },
    ],

    short: [
      {
        text: "been using ChatGPT for years with no idea what's inside it? this is the one. words become vectors so meaning is a direction, attention lets context rewrite it, it runs 96 of those in parallel, and the layers in between quietly store every fact. zero hand-waving. 28 min.",
      },
    ],

    multiple: [
      {
        text: "ok so you've been using ChatGPT for two years without knowing what's inside it. this video fixes that, and it doesn't cheat — no 'it's like a brain' hand-waving, actual mechanism.",
      },
      {
        text: "first thing: words become vectors. that's it, that's the trick. once meaning is a direction in space you can do maths on it, and everything else follows from that one move.",
      },
      {
        text: "attention is the bit everyone name-drops and nobody explains. it's how context changes what a word means. 'bank' next to 'river' vs 'bank' next to 'deposit' — same token, different vector by the end.",
      },
      {
        text: "queries, keys and values sound like a database and basically are one. each word asks a question, every other word answers, and the answers get mixed in proportion to how well they match.",
      },
      {
        text: "then it does all that 96 times in parallel, because why wouldn't you. different heads end up tracking different kinds of relationship without anyone telling them to.",
      },
      {
        text: "and the layers in between? that's where most of the parameters live, quietly storing facts. 28 minutes, worth every one of them if you've been meaning to get this.",
      },
    ],
  },

  informative: {
    long: [
      {
        text:
          "Chapter 5 of the deep learning series covers the transformer architecture introduced in 2017, built component by component rather than presented whole.\n\nTokenisation and embedding come first: a vocabulary mapped into high-dimensional space, where the dot product between two vectors measures semantic alignment. Every later step depends on this representation.\n\nSingle-head attention follows, with query, key and value projections, the scaling factor, and the masking step that prevents a position attending to tokens after it. Multi-headed attention then runs the operation across parallel representation subspaces; a production model uses 96 heads, each with its own projection matrices.\n\nThe multilayer perceptron blocks between attention layers account for roughly two thirds of total parameters, and are where most factual recall appears to be stored.\n\nIt closes with the unembedding step, softmax, and the role of temperature. Chapters 1 to 4 cover neural networks, gradient descent and backpropagation, and are worth watching first.",
      },
    ],

    short: [
      {
        text: "The transformer, component by component: embeddings map tokens into a space where dot products measure alignment, attention updates each vector from its context, multi-headed attention runs 96 parallel subspaces, and MLP blocks hold roughly two thirds of all parameters. 28 min.",
      },
    ],

    multiple: [
      {
        text: "Chapter 5 of the deep learning series covers the transformer architecture introduced in 2017. It builds the model component by component rather than presenting it whole.",
      },
      {
        text: "Tokenisation and embedding first: a vocabulary mapped into high-dimensional space, where the dot product between two vectors measures semantic alignment. Every later step depends on this.",
      },
      {
        text: "Single-head attention follows — query, key and value projections, the scaling factor, and the masking step that prevents a position attending to tokens after it.",
      },
      {
        text: "Multi-headed attention runs the operation across parallel representation subspaces. A production model uses 96 heads, each with its own projection matrices.",
      },
      {
        text: "The multilayer perceptron blocks between attention layers account for roughly two thirds of total parameters, and are where most factual recall appears to be stored.",
      },
      {
        text: "Finishes with the unembedding step, softmax, and the role of temperature. Chapters 1 to 4 cover neural networks, gradient descent and backpropagation, and are worth watching first.",
      },
    ],
  },

  funny: {
    long: [
      {
        text:
          "You have been typing into a text box containing roughly 175 billion numbers and at no point did anyone explain what they do. This video fixes that.\n\nStep one: words become vectors, because computers famously cannot read. Meaning is now a direction in space. Yes this is as unhinged as it sounds. Yes it works.\n\nStep two: attention, which is how \"bank\" works out whether it is near a river or your money. Every word turns to every other word and asks \"are you relevant to me\", which is frankly more social awareness than most group chats manage.\n\nStep three: queries, keys and values, a filing system invented by people who hate filing. Each word files a request, every other word files a response, everyone gets averaged, democracy happens.\n\nStep four: do all of that 96 times simultaneously, because doing it once would be restrained and we do not do that here.\n\nStep five: the layers in between, quietly memorising every fact you will later argue with it about.\n\n28 minutes. Go.",
      },
    ],

    short: [
      {
        text: "You've been typing into a box of 175 billion numbers with no idea what they do. Words become vectors because computers can't read, attention figures out whether 'bank' means river or money, it does that 96 times at once, and the layers between memorise everything. 28 min.",
      },
    ],

    multiple: [
      {
        text: "You have been typing into a text box containing roughly 175 billion numbers and at no point did anyone explain what they do. This video fixes that. Spoiler: it's matrix multiplication in a trench coat.",
      },
      {
        text: "Step one, words become vectors, because computers famously cannot read. Meaning is now a direction. Yes this is as unhinged as it sounds. Yes it works.",
      },
      {
        text: "Attention is how 'bank' figures out whether it's near a river or your money. Every word turns to every other word and asks 'are you relevant', which is more social awareness than most group chats.",
      },
      {
        text: "Queries, keys and values: a filing system invented by people who hate filing. Each word files a request, every other word files a response, everyone gets averaged. Democracy, basically.",
      },
      {
        text: "Then it does the whole thing 96 times simultaneously, because doing it once would be restrained and we don't do that here.",
      },
      {
        text: "Between the attention layers sit the blocks quietly memorising every fact you will later argue with it about. 28 minutes. Go.",
      },
    ],
  },
};

/**
 * The line a tone shows above the fold, per platform.
 *
 * `B · Specimens` previews a tone by its real first line, and what counts as
 * "first line" differs by platform: a description has an opening paragraph, a
 * thread has tweet one. Without this the thread would have been previewed
 * with the description's copy — a card claiming to show the real thing while
 * showing a different platform's.
 */
export function openingFor(platform: BuiltPlatform, tone: Tone): string {
  return platform === "x-thread"
    ? X_THREAD[tone][DEFAULT_LENGTH][0].text
    : YOUTUBE_DESCRIPTION[tone].opening;
}
