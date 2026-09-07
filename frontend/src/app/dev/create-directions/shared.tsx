// src/app/dev/create-directions/shared.tsx
//
// Shared data and pieces for the create-route directions.
//
// ── Everything here feeds the REAL components ──
//
//   VideoMeta          -> VideoPreviewCard, VideoThumbnail
//   SearchResultVideo  -> SearchResultCard, SearchResults
//   ContentType        -> ContentTypePicker, ContentTypeIcon, Chip
//
// The video ids are real and next.config.ts already allows img.youtube.com,
// so these render actual artwork. A dead id falls back to the component's own
// placeholder.

import { Chip } from "@/components/ui/chip";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { contentTypeColors, type ContentType } from "@/lib/constants/theme";
import type { SearchResultVideo } from "@/lib/youtube/search-types";
import type { VideoMeta } from "@/lib/youtube/types";

// ── Phases ──────────────────────────────────────────────────

export const PHASES = [
  "idle",
  "results",
  "ready",
  "picking",
  "generating",
  "error",
] as const;

export type Phase = (typeof PHASES)[number];

export const PHASE_LABELS: Record<Phase, string> = {
  idle: "Idle",
  results: "Topic results",
  ready: "Source ready",
  picking: "Choosing a format",
  generating: "Generating",
  error: "Error",
};

// ── Orientation ─────────────────────────────────────────────
//
// ── Why this exists, and why it is not free ──
//
// VideoThumbnail is `w-full` with a FIXED inline height (default 180). Its
// shape is therefore whatever the caller's width and that height make it —
// there is no aspect-ratio prop. A 104px-wide container with the default
// height produced a 104x180 box, which is why every draft thumbnail rendered
// portrait regardless of the video. The component is not wrong; the caller
// has to size it.
//
// ── Where a real orientation would come from ──
//
// The YouTube API returns thumbnail dimensions (thumbnails.high.width /
// .height) on both search.list and videos.list, so it IS derivable — but
// SearchResultVideo carries no width/height today, so the backend's
// _parse_search_item would need to surface it. Shorts are 9:16 and are also
// identifiable by duration, though duration alone is a guess: a 45-second
// landscape clip is not a Short.
//
// Until then this is authored per item, which is honest for a specimen and
// must not ship as an assumption.

export type Orientation = "landscape" | "portrait";

/**
 * ONE box per context. Orientation does not change the box.
 *
 * ── Why this replaced per-orientation sizes ──
 *
 * Sizing the box to the video gave a portrait item a 280x158 neighbour and a
 * 158x280 box of its own. In a grid that is simply a broken row: the tall item
 * pushes its row's baseline down and every caption beside it stops aligning.
 * The "equal visual mass" the two sizes were computed for is not worth a
 * layout that visibly jumps.
 *
 * So every thumbnail is 16:9, and orientation decides how the IMAGE sits in
 * that fixed box instead — see Thumb.
 */
export const THUMB_SIZES = {
  row: { w: 128, h: 72 },
  tile: { w: 280, h: 158 },
} as const;

// ── The resolved video ──────────────────────────────────────

export const VIDEO: VideoMeta = {
  videoId: "wjZofJX0v4M",
  title: "Transformers, the tech behind LLMs | Deep Learning Chapter 5",
  channel: "3Blue1Brown",
  channelUrl: "https://www.youtube.com/@3blue1brown",
  thumbnailUrl: "https://img.youtube.com/vi/wjZofJX0v4M/maxresdefault.jpg",
  url: "https://www.youtube.com/watch?v=wjZofJX0v4M",
  durationSeconds: 1687,
};

// ── Videos, with an authored orientation ────────────────────

export interface Clip extends SearchResultVideo {
  orientation: Orientation;
}

export const SEARCH_RESULTS: Clip[] = [
  {
    videoId: "wjZofJX0v4M",
    title: "Transformers, the tech behind LLMs | Deep Learning Chapter 5",
    channel: "3Blue1Brown",
    channelUrl: null,
    thumbnailUrl: "https://img.youtube.com/vi/wjZofJX0v4M/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=wjZofJX0v4M",
    description:
      "Breaking down how transformers work, from embeddings through attention to the final prediction.",
    publishedAt: "2026-04-01T00:00:00Z",
    durationSeconds: 1687,
    viewCount: 4_100_000,
    orientation: "landscape",
  },
  {
    videoId: "eMlx5fFNoYc",
    title: "Attention in transformers, step-by-step",
    channel: "3Blue1Brown",
    channelUrl: null,
    thumbnailUrl: "https://img.youtube.com/vi/eMlx5fFNoYc/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=eMlx5fFNoYc",
    description:
      "A visual walk through the attention mechanism and what the query, key and value matrices actually do.",
    publishedAt: "2026-04-07T00:00:00Z",
    durationSeconds: 1560,
    viewCount: 2_800_000,
    orientation: "landscape",
  },
  {
    videoId: "kCc8FmEb1nY",
    title: "Let's build GPT: from scratch, in code, spelled out",
    channel: "Andrej Karpathy",
    channelUrl: null,
    thumbnailUrl: "https://img.youtube.com/vi/kCc8FmEb1nY/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=kCc8FmEb1nY",
    description:
      "We build a Generatively Pretrained Transformer, following the Attention Is All You Need paper.",
    publishedAt: "2026-01-17T00:00:00Z",
    durationSeconds: 7212,
    viewCount: 5_600_000,
    orientation: "landscape",
  },
];

/**
 * Recommendations.
 *
 * Restored by request, using the tile layout from the first Launchpad pass.
 *
 * THE SOURCE IS STILL UNDECIDED. There is no recommendation engine, no
 * trending endpoint and no subscription data. The options were a curated
 * static list (no quota cost, no cold start, goes stale), history-derived
 * via search_videos() (personal, but new users get nothing and search.list
 * is the expensive call), or the trending endpoint (not implemented).
 * This mock stands in for whichever is chosen — the layout does not depend
 * on it, but shipping does.
 *
 * The portrait entry is deliberate: a Shorts-shaped video in the grid is the
 * case that broke the draft rows, so it stays visible here.
 */
export const RECOMMENDED: Clip[] = [
  ...SEARCH_RESULTS,
  {
    videoId: "aircAruvnKk",
    title: "But what is a neural network?",
    channel: "3Blue1Brown",
    channelUrl: null,
    thumbnailUrl: "https://img.youtube.com/vi/aircAruvnKk/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=aircAruvnKk",
    description: "The structure of a network, and what the layers represent.",
    publishedAt: "2025-10-05T00:00:00Z",
    durationSeconds: 1132,
    viewCount: 18_000_000,
    orientation: "landscape",
  },
  {
    videoId: "zjkBMFhNj_g",
    title: "Intro to Large Language Models",
    channel: "Andrej Karpathy",
    channelUrl: null,
    thumbnailUrl: "https://img.youtube.com/vi/zjkBMFhNj_g/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=zjkBMFhNj_g",
    description: "A one-hour general-audience introduction to LLMs.",
    publishedAt: "2025-11-22T00:00:00Z",
    durationSeconds: 3600,
    viewCount: 2_300_000,
    orientation: "landscape",
  },
  {
    videoId: "UZDiGooFs54",
    title: "Backpropagation, in 60 seconds",
    channel: "Computerphile",
    channelUrl: null,
    thumbnailUrl: "https://img.youtube.com/vi/UZDiGooFs54/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=UZDiGooFs54",
    description: "The chain rule, fast.",
    publishedAt: "2026-02-11T00:00:00Z",
    durationSeconds: 58,
    viewCount: 890_000,
    orientation: "portrait",
  },
];

// ── Unfinished work ─────────────────────────────────────────
//
// DRAFTS: generated_content rows with status 'draft'. That value exists in
// the schema and DEFAULTS there, and <Chip status="draft" /> already ships —
// but content.ts hardcodes status:"saved" on insert, so nothing can produce
// one yet. Making this real means writing 'draft' at generation time,
// filtering the history list to 'saved', and deciding when a draft expires.
//
// The AGREED destination is interrupted runs — "you closed the tab three
// minutes in" — which is what the band's name actually promises. That needs
// generation_jobs (which exists, with status and progress columns, and is
// referenced only in a comment) to be written to, which needs generation to
// stop being one synchronous blocking call. Drafts are the step on the way.

export interface DraftItem {
  id: string;
  videoId: string;
  videoTitle: string;
  type: ContentType;
  when: string;
  words: number;
  orientation: Orientation;
}

export const DRAFTS: DraftItem[] = [
  {
    id: "d1",
    videoId: "kCc8FmEb1nY",
    videoTitle: "Let's build GPT: from scratch, in code, spelled out",
    type: "notes",
    when: "20 minutes ago",
    words: 1840,
    orientation: "landscape",
  },
  {
    id: "d2",
    videoId: "UZDiGooFs54",
    videoTitle: "Backpropagation, in 60 seconds",
    type: "flashcards",
    when: "Yesterday",
    words: 620,
    orientation: "portrait",
  },
  {
    id: "d3",
    videoId: "aircAruvnKk",
    videoTitle: "But what is a neural network?",
    type: "summary",
    when: "3 days ago",
    words: 410,
    orientation: "landscape",
  },
  {
    id: "d4",
    videoId: "wjZofJX0v4M",
    videoTitle: "Transformers, the tech behind LLMs",
    type: "quiz",
    when: "4 days ago",
    words: 280,
    orientation: "landscape",
  },
  {
    id: "d5",
    videoId: "zjkBMFhNj_g",
    videoTitle: "Intro to Large Language Models",
    type: "blog",
    when: "5 days ago",
    words: 2140,
    orientation: "landscape",
  },
  {
    id: "d6",
    videoId: "eMlx5fFNoYc",
    videoTitle: "Attention in transformers, step-by-step",
    type: "research",
    when: "6 days ago",
    words: 1560,
    orientation: "landscape",
  },
];

/**
 * How many drafts the band shows before it has to be expanded.
 *
 * Three, because the band is an entry point rather than a list — past that it
 * starts competing with the field above it for the page's attention.
 */
export const DRAFTS_COLLAPSED = 3;

// ── The pipeline ────────────────────────────────────────────
//
// ── THIS IS AHEAD OF THE BACKEND, and by more than the last version was ──
//
// A staged list needed per-stage events. This adds elapsed time per completed
// stage, an estimate per pending stage, a percentage, a "time remaining", and
// a cancel. Every one of those is a separate thing the backend does not
// currently produce:
//
//   per-stage events   generation_jobs is never written to
//   elapsed / remaining  nothing times the stages
//   percentage         generation_jobs.progress exists but is never set
//   cancel             generation is one synchronous call with nothing to
//                      cancel and no handle to cancel it with
//   "leave this tab"   only true once generation is async and server-side
//
// The copy promises the work continues after you leave. That promise is the
// biggest commitment on this screen: it cannot be kept by a blocking call in
// a request handler. Designing it is fine — shipping it means building async
// generation first.

export interface Stage {
  label: string;
  /** Seconds the stage actually took, once complete. */
  took?: number;
  /** Seconds it is expected to take, while pending. */
  estimate: number;
}

export const PIPELINE: Stage[] = [
  { label: "Fetching the video", took: 6, estimate: 6 },
  { label: "Reading the transcript", took: 12, estimate: 12 },
  { label: "Understanding the topic", estimate: 20 },
  { label: "Drafting your notes", estimate: 30 },
  { label: "Polishing and saving", estimate: 10 },
];

/** Which stage the specimen freezes on, so the composition is judgeable. */
export const CURRENT_STAGE = 2;
export const ELAPSED = 38;
export const REMAINING = 58;
export const PERCENT = 62;

/**
 * Stage labels alone, for the three directions kept only for comparison.
 * Derived rather than duplicated, so the two lists cannot drift.
 */
export const PIPELINE_STAGES: string[] = PIPELINE.map((stage) => stage.label);

/**
 * The indeterminate wait — no percentage, no stages, no estimate.
 *
 * This is what the generating screen looks like if it stays honest about the
 * current backend, and it is worth keeping visible next to the timed version:
 * the gap between these two components IS the async-generation work.
 */
export function Indeterminate({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative h-[3px] w-full overflow-hidden rounded-xn-pill bg-xn-ink-faint ${className}`}
      role="progressbar"
      aria-label="Generating"
    >
      <div className="absolute inset-y-0 w-1/3 rounded-xn-pill bg-xn-ink animate-shimmer motion-reduce:animate-none" />
    </div>
  );
}

// ── Copy ────────────────────────────────────────────────────

export const PLACEHOLDERS = [
  "Paste a YouTube link…",
  "Or search a topic — “how diffusion models work”",
  "youtube.com/watch?v=…",
  "Anything you'd rather read than watch",
];

export const ERROR_COPY = "That link didn’t resolve to a video we can read.";

/**
 * One line per format.
 *
 * Local to these specimens on purpose. `contentTypeColors` (theme.ts) carries
 * the redesigned label and colours but no copy; CONTENT_TYPES
 * (constants/content-types.ts) carries copy but also a second, older set of
 * hex colours predating the redesigned seven. Importing the latter to read one
 * string would drag that stale palette in. Whichever direction ships, those
 * two registries need reconciling — real debt, noted rather than papered over.
 */
export const BLURB: Record<ContentType, string> = {
  summary: "The short version, with timestamps",
  blog: "A structured article with headings",
  notes: "Highlights and key points, for revision",
  research: "Deep analysis with citations",
  flashcards: "Question and answer pairs",
  quiz: "Multiple choice that tests recall",
  social: "Posts sized for five different places",
};

// ── Glyphs ──────────────────────────────────────────────────

export function LinkGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </svg>
  );
}

export function AlertGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.4v.2" />
    </svg>
  );
}

export function ExternalGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 3.5H4A1.5 1.5 0 0 0 2.5 5v7A1.5 1.5 0 0 0 4 13.5h7A1.5 1.5 0 0 0 12.5 12v-2" />
      <path d="M9.5 2.5h4v4" />
      <path d="M13.5 2.5 7 9" />
    </svg>
  );
}

export function ChevronGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 9.5 12 15.5 18 9.5" />
    </svg>
  );
}

export function RefreshGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 11a8 8 0 0 0-13.7-5.7L3 8.5" />
      <path d="M3 4v4.5h4.5" />
      <path d="M4 13a8 8 0 0 0 13.7 5.7L21 15.5" />
      <path d="M21 20v-4.5h-4.5" />
    </svg>
  );
}

export function CheckGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}

// ── Pieces ──────────────────────────────────────────────────

/**
 * A thumbnail in a fixed 16:9 box, whatever shape the video is.
 *
 * The width is set on the wrapper and the matching height passed to the
 * component, because VideoThumbnail has no aspect-ratio prop and its inline
 * height would beat any aspect class anyway.
 *
 * ── How a portrait video fits a landscape box ──
 *
 * VideoThumbnail hardcodes `object-cover`, and its own comment explains why:
 * YouTube stills arrive 480x360 with letterbox bars for 16:9 source, and cover
 * is exactly what crops those away. That reasoning holds for landscape and
 * inverts for portrait — covering a 9:16 image into a 16:9 box keeps a narrow
 * horizontal band from the middle of the frame and throws away most of it,
 * which for a Short is usually the whole subject.
 *
 * So portrait switches the fit to `contain`: the full frame is shown, scaled
 * to the box height, with the surface visible either side. Nothing is cropped
 * and nothing changes size.
 *
 * This is done from OUTSIDE via an arbitrary variant rather than by adding a
 * prop to VideoThumbnail. The component ships on other surfaces and this is a
 * specimen — a shared component should not grow an API for an unproven
 * layout. If this direction ships, an explicit `fit` prop is the right fix and
 * this selector is the thing to replace.
 */
export function Thumb({
  videoId,
  src,
  orientation,
  size,
}: {
  videoId: string;
  src?: string;
  orientation: Orientation;
  size: keyof typeof THUMB_SIZES;
}) {
  const box = THUMB_SIZES[size];
  return (
    <div style={{ width: box.w }} className="shrink-0">
      <VideoThumbnail
        videoId={videoId}
        src={src}
        height={box.h}
        label="youtube"
        className={orientation === "portrait" ? "[&_img]:object-contain" : ""}
      />
    </div>
  );
}

/**
 * A section heading with an optional action on the right.
 *
 * ── On the size ──
 *
 * h5 (21px), not h4 (28px). The page title is h3 (36px), and at 28 a section
 * head sits close enough to it that the two compete — the page reads as
 * several titles rather than a title with sections under it. 21 leaves a
 * clear step at both ends: 36 above, 15 for item titles below.
 */
export function SectionHead({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="text-h5 text-xn-ink">{children}</h2>
      {action}
    </div>
  );
}

/**
 * Unfinished work, as ONE list rather than a grid of cards.
 *
 * ── Why the shape changed ──
 *
 * Recommendations and search results are both browsable videos and now share
 * a layout, which is right — they are the same kind of thing. Drafts are not.
 * They are your own half-finished work, the list is short and finite, and the
 * verb is "resume", not "choose". Rendering them as a third grid of cards put
 * a fourth data type into the same rectangle, which is exactly what the
 * discard list objects to.
 *
 * One container with divided rows reads as a short inventory instead: closer
 * to a table of your things than to a shelf of options.
 *
 * The thumbnail is still the video it came from, because that is what a person
 * recognises — not the content type, and not a title the generator wrote.
 */
export function DraftList({ drafts }: { drafts: DraftItem[] }) {
  return (
    <ul className="overflow-hidden rounded-xn-lg border border-xn-border bg-xn-surface shadow-xn-1">
      {drafts.map((draft) => (
        <li
          key={draft.id}
          className="border-b border-xn-border last:border-b-0"
        >
          <button
            type="button"
            className="group flex w-full items-center gap-4 px-3 py-3 text-left transition-colors duration-xn ease-xn hover:bg-xn-surface-alt"
          >
            <Thumb
              videoId={draft.videoId}
              orientation={draft.orientation}
              size="row"
            />

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <ContentTypeIcon type={draft.type} size="sm" />
                <span className="truncate text-ui font-medium text-xn-ink">
                  {contentTypeColors[draft.type].label}
                </span>
                <Chip status="draft" />
              </span>
              <span className="mt-1 block truncate text-sm text-xn-ink-muted">
                {draft.videoTitle}
              </span>
            </span>

            <span className="hidden shrink-0 text-right sm:block">
              <span className="block font-mono text-micro text-xn-ink-soft">
                {draft.words.toLocaleString()} words
              </span>
              <span className="mt-0.5 block text-xs text-xn-ink-soft">
                {draft.when}
              </span>
            </span>

            <span className="shrink-0 text-sm text-xn-ink-muted transition-colors duration-xn ease-xn group-hover:text-xn-ink">
              Resume
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ── Formatters ──────────────────────────────────────────────

/** Seconds to "27:14". */
export function duration(totalSeconds: number | null): string | undefined {
  if (totalSeconds == null) return undefined;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return h > 0
    ? `${h}:${mm}:${String(s).padStart(2, "0")}`
    : `${mm}:${String(s).padStart(2, "0")}`;
}

/** "4.1M views" */
export function views(count: number | null): string {
  if (count == null) return "";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}K views`;
  return `${count} views`;
}
