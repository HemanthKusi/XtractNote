// ─────────────────────────────────────────────────────────────
// lib/constants/recommended-videos.ts
//
// A curated list of videos worth converting, shown on the create page's
// idle state.
//
// ── This is STATIC on purpose, and it is not a placeholder ──
//
// There is no recommendation engine, no trending endpoint and no
// subscription data anywhere in this product. The only thing that could
// generate a list is search_videos(), which needs a query and whose own
// comment calls it "the expensive one" — every render would spend quota.
//
// A hand-picked list is the honest version of this band rather than a
// stand-in for one: it is genuinely editorial, it costs no quota, it has no
// cold-start problem, and it is the same shape a real recommender would
// return. What it is NOT is personalised, so the heading must never imply
// that it is — "Worth converting", not "Picked for you".
//
// ── When this is replaced ──
//
// Deriving from a user's own history is the upgrade, planned for the backend
// work after the design phase. That path uses the search service with topics
// taken from what they have already converted, and it needs caching because
// of the quota cost above. At that point this file becomes the fallback for
// a new account with no history, which is a job it can keep doing.
//
// ── Choosing entries ──
//
// Videos with real captions, since the whole flow dies without a transcript,
// and subjects that suit more than one output format — something worth both
// study notes and flashcards demonstrates more of the product than a video
// that only makes sense as a summary.
// ─────────────────────────────────────────────────────────────

export interface RecommendedVideo {
  /** The 11-character YouTube id. Also builds the thumbnail URL. */
  videoId: string;
  title: string;
  channel: string;
  /** Runtime in seconds, formatted for display at render time. */
  durationSeconds: number;
}

export const RECOMMENDED_VIDEOS: RecommendedVideo[] = [
  {
    videoId: "wjZofJX0v4M",
    title: "Transformers, the tech behind LLMs",
    channel: "3Blue1Brown",
    durationSeconds: 1687,
  },
  {
    videoId: "aircAruvnKk",
    title: "But what is a neural network?",
    channel: "3Blue1Brown",
    durationSeconds: 1132,
  },
  {
    videoId: "kCc8FmEb1nY",
    title: "Let's build GPT: from scratch, in code, spelled out",
    channel: "Andrej Karpathy",
    durationSeconds: 7212,
  },
  {
    videoId: "zjkBMFhNj_g",
    title: "Intro to Large Language Models",
    channel: "Andrej Karpathy",
    durationSeconds: 3600,
  },
  {
    videoId: "eMlx5fFNoYc",
    title: "Attention in transformers, step-by-step",
    channel: "3Blue1Brown",
    durationSeconds: 1560,
  },
  {
    videoId: "rEDzUT3ymw4",
    title: "How does a computer actually work?",
    channel: "Sebastian Lague",
    durationSeconds: 1230,
  },
];
