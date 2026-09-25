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
  "newsletter",
  "instagram",
] as const satisfies readonly SocialPlatform[];

export type BuiltPlatform = (typeof BUILT_PLATFORMS)[number];

/** The four tone options offered for every platform. */
export const TONES = ["professional", "casual", "informative", "funny"] as const;

export type Tone = (typeof TONES)[number];

/** The tone a run produces without being asked. */
export const DEFAULT_TONE: Tone = "professional";

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
 * thread has tweet one, a newsletter has its subject.
 *
 * ── A RECORD, because the previous version was a ternary with a fallback ──
 *
 * This existed already, written to stop the thread being previewed with the
 * description's copy. It was `platform === "x-thread" ? ... : <description>`,
 * so when newsletter was added it silently inherited the description's prose
 * and B claimed to be showing the real thing while showing another
 * platform's. The same bug it was written to fix, reintroduced by the same
 * shape.
 *
 * A record keyed by `BuiltPlatform` cannot do that: adding a platform without
 * a line here fails to compile.
 */
const OPENING_LINE: Record<BuiltPlatform, (tone: Tone) => string> = {
  "youtube-description": (tone) => YOUTUBE_DESCRIPTION[tone].opening,
  "x-thread": (tone) => X_THREAD[tone][DEFAULT_LENGTH][0].text,
  // The subject, because that is genuinely the first thing a reader of a
  // newsletter sees. It is much shorter than the other two, and that is
  // information rather than an inconsistency.
  newsletter: (tone) => NEWSLETTER[tone].subject,
  // The hook, which is the line the destination shows before "more" and the
  // line the quote card puts on the image. One piece of copy, both jobs.
  instagram: (tone) => INSTAGRAM[tone].hook,
};

export function openingFor(platform: BuiltPlatform, tone: Tone): string {
  return OPENING_LINE[platform](tone);
}

// ─────────────────────────────────────────────────────────────
// Newsletter
// ─────────────────────────────────────────────────────────────
//
// The only one of the five whose destination has TWO STATES: the inbox row
// and the opened email. Every other platform has one surface. It is also the
// only artefact that is sent to someone rather than posted.

/**
 * What the inbox actually shows, and where it stops.
 *
 * Verified 2026-09-23 rather than recalled. Truncation is by pixel width in
 * real clients, but these character counts are what the guidance is written
 * in and what a writer can act on, so they are what the specimen measures
 * against.
 *
 * MOBILE IS THE ONE THAT MATTERS. Over 65% of opens are mobile, so a subject
 * that only survives on desktop is a subject most readers never finish.
 */
export const SUBJECT_LIMIT = {
  /** Safe across Apple and Android. Gmail mobile is tightest at about 30. */
  mobile: 33,
  /** Gmail 60-70, Outlook nearer 50. */
  desktop: 60,
} as const;

/** Visible preview text beside or under the subject. 40-100 in practice. */
export const PREHEADER_LIMIT = {
  mobile: 40,
  desktop: 100,
} as const;

/**
 * A newsletter, in the shape its destination needs rather than the shape its
 * prompt produces.
 *
 * ── `preheader` DOES NOT EXIST TODAY, and that is the point ──
 *
 * The inbox shows the subject AND preview text. Verified 2026-09-23: there is
 * no notion of a preheader anywhere in this product — not in the prompt, not
 * in the types, not in any renderer. So whatever the body happens to open
 * with becomes the preview by accident.
 *
 * It is a separate field here because it is a separate decision. A preheader
 * that repeats the subject wastes the second half of the only thing a reader
 * sees before choosing; one that continues the subject doubles the space the
 * artefact gets. That choice cannot be made if the field does not exist.
 *
 * ── `subject` carries the scaffolding problem ──
 *
 * The prompt asks for it as an H2 prefixed with the literal `Subject: `. That
 * text is not part of the email — it is a label the user strips, exactly like
 * the X thread's `1.` `2.` numbering. Stored here as the subject alone.
 */
/** One section of the body: a heading and the prose under it. */
export interface NewsletterSection {
  heading: string;
  paragraphs: string[];
}

export interface NewsletterCopy {
  subject: string;
  /** Not produced by generation today. See above. */
  preheader: string;
  /** One line under the title. What the issue is about, before the argument. */
  standfirst: string;
  intro: string;
  /**
   * SECTIONS, not a bulleted list.
   *
   * The prompt today asks for "the key insights as tight prose or a short
   * skimmable list" inside 150-250 words, and that produces a note rather
   * than a newsletter. A newsletter is read as a sequence of small arguments
   * under their own headings — the headings are how it is skimmed, and the
   * prose under them is why it is worth opening.
   *
   * This is the design deciding the representation and the backend following
   * (§16's stated direction of dependency). Generation does not produce this
   * shape yet.
   */
  sections: NewsletterSection[];
  /** The one line worth lifting out of the body. */
  pullQuote: string;
  closing: string;
}

/**
 * Four tones.
 *
 * THREE OF THE FOUR SUBJECTS OVERRUN MOBILE, and that is deliberate sampling
 * rather than careless writing. The prompt caps the subject at "short" with
 * no number, so overrunning is the normal case, not the edge one. A sample
 * where every subject fit would demonstrate a discipline the pipeline does
 * not have.
 */
export const NEWSLETTER: Record<Tone, NewsletterCopy> = {
  professional: {
    subject: "How transformers actually work",
    preheader: "Embeddings, attention, and where the parameters really live.",
    standfirst: "The architecture under every model you use, built one component at a time.",
    intro:
      "Most explanations of large language models stop at “it predicts the next word”. That is true and it explains nothing — it describes the output without touching the machinery. This week's video is the clearest account of that machinery I have found, and it is worth the twenty-eight minutes precisely because it refuses to hand-wave.",
    sections: [
      {
        heading: "Meaning becomes a direction",
        paragraphs: [
          "The first move is the one everything else rests on: tokens become vectors. Once a word is a point in high-dimensional space, the distance and direction between words carries meaning, and meaning becomes something you can do arithmetic on.",
          "That is the whole trick, and it is why the rest of the architecture is possible at all. Nothing downstream makes sense until this one is solid."
        ],
      },
      {
        heading: "Attention rewrites what a word means",
        paragraphs: [
          "A word does not arrive with a fixed meaning. “Bank” beside “river” and “bank” beside “deposit” are the same token and end up in completely different places, and attention is the mechanism that moves them.",
          "Query, key and value are where most explanations lose people. Here each projection is motivated before it is written down, so the dot product arrives as a consequence of wanting to measure alignment rather than as a formula to accept."
        ],
      },
      {
        heading: "Where the parameters actually live",
        paragraphs: [
          "Multi-headed attention runs that operation ninety-six times in parallel, each head free to track a different kind of relationship without anyone specifying what.",
          "But the attention layers are not where most of the model is. The multilayer perceptron blocks between them hold roughly two thirds of the parameters, and most of what the model has actually learned. It is the part nobody covers and the part that answers “where are the facts stored”."
        ],
      },
    ],
    pullQuote: "Once meaning is a direction, meaning becomes something you can do arithmetic on.",
    closing:
      "Twenty-eight minutes, and worth the whole of it. If you have been meaning to understand this rather than have heard about it, start here.",
  },
  casual: {
    subject: "the thing inside ChatGPT, explained properly",
    preheader: "No hand-waving, no “it's like a brain”. Actual mechanism.",
    standfirst: "You've used this stuff for years. Here's what's actually in it.",
    intro:
      "You have been typing into a box backed by 175 billion numbers for about two years now, and nobody has explained what those numbers do. This video fixes that, and the reason I'm sending it is that it doesn't cheat — no “it's like a brain”, no vague gestures at neurons.",
    sections: [
      {
        heading: "words become vectors, and that's the trick",
        paragraphs: [
          "First thing that happens: every word turns into a point in space. Once meaning is a direction, you can do maths on it, and that single move is what makes everything after it possible.",
          "Sounds like a detail. It's the whole foundation."
        ],
      },
      {
        heading: "attention is how context changes meaning",
        paragraphs: [
          "“Bank” next to “river” versus “bank” next to “deposit” — same word going in, completely different thing coming out. Attention is the bit that does that, and it's the bit everyone name-drops and nobody explains.",
          "Queries, keys and values sound like a database and honestly are one. Each word asks a question, every other word answers, and the answers get mixed by how well they match."
        ],
      },
      {
        heading: "then it does all that 96 times at once",
        paragraphs: [
          "Ninety-six heads, running in parallel, each one drifting toward a different kind of relationship without being told to. Nobody programs what they track.",
          "And the layers in between? That's where most of the parameters sit, quietly storing every fact you'll later argue with it about."
        ],
      },
    ],
    pullQuote: "Same word going in, completely different thing coming out.",
    closing:
      "28 minutes, and genuinely worth it. Watch it once properly rather than twice in the background.",
  },
  informative: {
    subject: "Transformers: a component-by-component walkthrough",
    preheader: "Chapter 5 of the deep learning series. Prerequisites in 1 to 4.",
    standfirst: "The 2017 architecture, built up rather than presented whole.",
    intro:
      "Chapter 5 of the deep learning series covers the transformer architecture introduced in 2017. Its approach is to construct the model component by component rather than present it complete, which makes it usable as a reference rather than only as an explanation.",
    sections: [
      {
        heading: "Embeddings and the geometry of meaning",
        paragraphs: [
          "A vocabulary is mapped into high-dimensional space, where the dot product between two vectors measures semantic alignment. Every subsequent operation depends on this representation.",
          "The video is careful to establish why direction carries meaning before using that fact, which is unusual and makes the attention section land."
        ],
      },
      {
        heading: "Attention, single and multi-headed",
        paragraphs: [
          "Single-head attention is covered first: query, key and value projections, the scaling factor, and the masking step that prevents a position attending to tokens after it.",
          "Multi-headed attention then runs the operation across parallel representation subspaces — 96 heads in a production-scale model, each with its own projection matrices."
        ],
      },
      {
        heading: "Parameter distribution",
        paragraphs: [
          "The multilayer perceptron blocks between attention layers account for roughly two thirds of total parameters, and appear to be where most factual recall is stored.",
          "The chapter closes with the unembedding step, softmax, and the role of temperature in sampling."
        ],
      },
    ],
    pullQuote: "Roughly two thirds of the parameters sit outside the attention layers entirely.",
    closing:
      "Chapters 1 to 4 cover neural networks, gradient descent and backpropagation, and are worth watching first if any of the above was unfamiliar.",
  },
  funny: {
    subject: "175 billion numbers and nobody explained them",
    preheader: "Turns out it is matrix multiplication in a trench coat.",
    standfirst: "An honest look inside the thing you've been arguing with.",
    intro:
      "You have been typing into a text box containing roughly 175 billion numbers, and at no point did anyone sit you down and explain what they do. This video does. The answer, broadly, is matrix multiplication wearing a very convincing trench coat.",
    sections: [
      {
        heading: "Words become vectors, because computers cannot read",
        paragraphs: [
          "Step one is turning every word into a direction in space, which sounds unhinged and is, and works anyway. Meaning is now geometry. Nobody asked for this and yet here we are.",
          "Everything else in the architecture is downstream of that one deeply strange decision."
        ],
      },
      {
        heading: "Attention, or: is that river-bank or money-bank",
        paragraphs: [
          "Every word turns to every other word and asks “are you relevant to me”, which is frankly more social awareness than most group chats manage.",
          "Queries, keys and values are a filing system invented by people who hate filing. Each word files a request, every other word files a response, everyone gets averaged. Democracy happens."
        ],
      },
      {
        heading: "Ninety-six times, simultaneously, for some reason",
        paragraphs: [
          "Doing it once would be restrained, and we do not do that here. Ninety-six heads all running at the same time, each quietly developing its own opinion about grammar.",
          "Meanwhile the layers in between are memorising every fact you will later confidently argue with it about."
        ],
      },
    ],
    pullQuote: "Matrix multiplication wearing a very convincing trench coat.",
    closing:
      "28 minutes. Go. It is better than whatever else you had open.",
  },
};

// ─────────────────────────────────────────────────────────────
// Instagram
// ─────────────────────────────────────────────────────────────
//
// The only one of the five whose PRIMARY CONTENT this product cannot make.
// Instagram is an image with words under it; we have words and a 16:9
// thumbnail belonging to someone else. Frame extraction is deferred (§14).

/** Instagram truncates a feed caption here. Verified 2026-09-23. */
export const CAPTION_FOLD = 125;

/**
 * An Instagram post.
 *
 * ── `hashtags` is its own field, not the end of the caption ──
 *
 * The prompt asks for "a block of 8-15 relevant hashtags on the final lines",
 * which makes them the caption's tail. In practice they are a separate
 * payload: frequently posted as a first comment rather than in the caption at
 * all, and copied separately when they are not. Rendering them as the last
 * paragraph of prose is the one thing guaranteed to be wrong.
 *
 * ── `hook` is its own field because the destination treats it as one ──
 *
 * Instagram shows about 125 characters before "more", and this prompt is the
 * FIRST of the five to acknowledge its own fold: it asks for "an
 * attention-grabbing first line (the part shown before 'more')". It still
 * gives no number, so it knows the boundary exists and cannot aim at it.
 */
export interface InstagramCopy {
  /** The line shown before "more". */
  hook: string;
  body: string[];
  cta: string;
  hashtags: string[];
}

export const INSTAGRAM: Record<Tone, InstagramCopy> = {
  professional: {
    hook: "The architecture under every model you use, explained without hand-waving.",
    body: [
      "Tokens become vectors, so meaning turns into a direction you can do maths on. Attention then lets the words around a word rewrite what it means — which is why “bank” resolves differently beside “river” than beside “deposit”.",
      "Ninety-six heads run that in parallel. And the blocks between them hold most of the parameters, and most of what the model has actually learned.",
    ],
    cta: "Save this for the next time someone tells you it just predicts the next word.",
    hashtags: [
      "MachineLearning",
      "DeepLearning",
      "Transformers",
      "LLM",
      "AI",
      "NeuralNetworks",
      "DataScience",
      "TechExplained",
      "3Blue1Brown",
    ],
  },
  casual: {
    hook: "you've used ChatGPT for years without knowing what's inside it. this fixes that.",
    body: [
      "words become vectors, so meaning is a direction. attention is how context changes what a word means — same word in, completely different thing out.",
      "then it runs 96 of those at once, and the layers in between quietly store every fact you'll later argue with it about.",
    ],
    cta: "save it for later, you'll want the 28 minutes when you have them",
    hashtags: [
      "AI",
      "MachineLearning",
      "ChatGPT",
      "LearnInPublic",
      "TechTok",
      "Explainer",
      "DeepLearning",
      "Curiosity",
    ],
  },
  informative: {
    hook: "Chapter 5: the transformer architecture, built component by component.",
    body: [
      "Embeddings map a vocabulary into a space where dot products measure alignment. Attention updates each vector from its context, with query, key and value projections and a masking step.",
      "Multi-headed attention runs across 96 parallel subspaces. MLP blocks account for roughly two thirds of total parameters.",
    ],
    cta: "Chapters 1–4 cover the prerequisites. Save for later.",
    hashtags: [
      "DeepLearning",
      "Transformers",
      "NeuralNetworks",
      "MachineLearning",
      "AIEducation",
      "DataScience",
      "Mathematics",
      "LLM",
      "StudyNotes",
    ],
  },
  funny: {
    hook: "175 billion numbers are involved and nobody has ever explained them to you.",
    body: [
      "Words become vectors, because computers famously cannot read. Attention then works out whether “bank” is near a river or your money, which is more social awareness than most group chats.",
      "Then it does the whole thing 96 times at once, because restraint was not on the menu.",
    ],
    cta: "Save this and casually bring it up at dinner. Nobody can stop you.",
    hashtags: [
      "AI",
      "MachineLearning",
      "TechHumour",
      "Explainer",
      "ChatGPT",
      "DeepLearning",
      "NerdStuff",
      "LearnSomething",
    ],
  },
};
