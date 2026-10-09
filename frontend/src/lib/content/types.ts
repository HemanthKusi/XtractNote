/**
 * lib/content/types.ts
 *
 * Shared types for the content-generation flow.
 *
 * The canonical ContentType (all 7 formats) lives in lib/constants/theme — it
 * is the single source of truth for every format the app can style. This file
 * does NOT redefine it; it re-exports it, and adds the generation-specific
 * pieces on top:
 *
 *   - GENERATABLE_TYPES: which formats the backend can actually make TODAY.
 *     This is the single source of truth for "available vs. coming soon" and
 *     must stay in parity with the backend ContentType literal in prompts.py.
 *   - GeneratableContentType: the subset type derived from that array.
 *   - SocialPlatform / SOCIAL_PLATFORMS: the five social targets + their UI copy.
 *   - ContentBody: the discriminated union of stored/returned body shapes.
 *   - GenerateFailReason: every reason a generation can fail.
 *   - JOB_STATUSES / GenerationJob: a generation job, as its status route reports it.
 *
 * Pure types and const arrays — no logic beyond two small guards.
 */

import type { ContentType } from "@/lib/constants/theme";

// Re-export so callers can import ContentType from here too, without needing to
// know it physically lives in the theme tokens file.
export type { ContentType };

/**
 * The formats the backend can generate right now.
 *
 * SINGLE SOURCE OF TRUTH for availability: the picker reads this to decide
 * which cards are live vs. "Coming soon". MUST stay in parity with the backend
 * ContentType literal in prompts.py. Add a format here only once its prompt
 * and generation path exist.
 *
 * As of Phase 11 this is all seven formats — research, flashcards, quiz, and
 * social gained prompts and generation paths, so nothing is "coming soon".
 *
 * Typed `readonly ContentType[]` + `as const` so each value is checked against
 * the canonical list, and the subset type below is derived from it — the array
 * and its type can never drift apart.
 */
export const GENERATABLE_TYPES = ["summary", "blog", "notes", "research", "flashcards", "quiz", "social"] as const satisfies readonly ContentType[];

/**
 * The generatable types as a type, derived from the array above.
 *
 * This currently equals ContentType (all seven are generatable), but it is
 * kept as its own name so the distinction survives: if a future format is
 * added to the canonical list before its generation path exists, this
 * narrows again automatically.
 */
export type GeneratableContentType = (typeof GENERATABLE_TYPES)[number];

/**
 * Runtime check: is this content type generatable today?
 * Lets the picker (and any caller) ask without hardcoding the list again.
 */
export function isGeneratable(type: ContentType): type is GeneratableContentType {
  return (GENERATABLE_TYPES as readonly ContentType[]).includes(type);
}

/* -------------------------------------------------------------------------- */
/* Social platforms                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The five platforms a "social" generation can target. Mirrors the backend
 * SocialPlatform literal in prompts.py.
 *
 * Social is ONE content type with five prompt variants — the platform is not
 * a content type of its own. It travels alongside contentType on the request
 * and is stored in the saved row's metadata.
 */
export type SocialPlatform = "linkedin" | "x-thread" | "instagram" | "youtube-description" | "newsletter";

/** Display metadata for the social platform picker. */
export interface SocialPlatformOption {
  id: SocialPlatform;
  label: string;
  description: string;
}

/**
 * The platform list with UI copy, in display order.
 *
 * The labels live here rather than inside the picker component because the
 * same strings are needed in more than one place (the picker, the output
 * header showing which platform was generated, and later history cards).
 * Keeping them beside the type means one edit instead of several.
 */
export const SOCIAL_PLATFORMS: readonly SocialPlatformOption[] = [
  {
    id: "linkedin",
    label: "LinkedIn post",
    description: "Professional post with a hook and hashtags",
  },
  {
    id: "x-thread",
    label: "X thread",
    description: "Numbered thread, one idea per post",
  },
  {
    id: "instagram",
    label: "Instagram caption",
    description: "Conversational caption with a hashtag block",
  },
  {
    id: "youtube-description",
    label: "YouTube description",
    description: "SEO-friendly description with key points",
  },
  {
    id: "newsletter",
    label: "Newsletter snippet",
    description: "Subject line plus a short email section",
  },
] as const;

/** Runtime check for a valid platform id (e.g. when reading saved metadata). */
export function isSocialPlatform(value: unknown): value is SocialPlatform {
  return SOCIAL_PLATFORMS.some((p) => p.id === value);
}

/** Look up a platform's display label, falling back to the raw id. */
export function getSocialPlatformLabel(platform: SocialPlatform): string {
  return SOCIAL_PLATFORMS.find((p) => p.id === platform)?.label ?? platform;
}

/* -------------------------------------------------------------------------- */
/* Content bodies                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Prose body — every type except flashcards and quiz.
 *
 * NOTE the `kind?: undefined`. Prose bodies genuinely have no `kind` field:
 * that is what keeps them backward-compatible with every row already saved
 * before Phase 11. Declaring it as optional-undefined (rather than omitting
 * it) is what lets TypeScript treat "no kind" as a distinct, narrowable case
 * in the union below.
 */
export interface MarkdownBody {
  kind?: undefined;
  markdown: string;
}

/** A single flashcard: a prompt side and an answer side. */
export interface Flashcard {
  front: string;
  back: string;
}

/** Structured flashcards body. */
export interface FlashcardsBody {
  kind: "flashcards";
  cards: Flashcard[];
}

/**
 * A single quiz question.
 *
 * `answerIndex` is a 0-based index into `options`. The backend validates it is
 * in range before storing, so renderers can index directly.
 * `explanation` is optional — the model is asked for one but may omit it.
 */
export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string | null;
}

/** Structured quiz body. */
export interface QuizBody {
  kind: "quiz";
  questions: QuizQuestion[];
}

/**
 * The stored/returned content body, as a discriminated union on `kind`.
 *
 * Mirrors the three shapes the backend produces. Because the union is
 * discriminated, a `switch (body.kind)` in the renderer narrows to the right
 * member automatically — and if a shape is added later without a matching
 * branch, that becomes a compile error rather than a blank screen.
 */
export type ContentBody = MarkdownBody | FlashcardsBody | QuizBody;

/** True when the body is prose (no structured `kind`). */
export function isMarkdownBody(body: ContentBody): body is MarkdownBody {
  return body.kind === undefined;
}

/* -------------------------------------------------------------------------- */
/* Generation jobs and failures                                                */
/* -------------------------------------------------------------------------- */

/**
 * Every status a generation job can have — the values migration 004's CHECK
 * constraint allows. A list rather than only a type, so a status read from the
 * server can be checked against it instead of cast.
 *
 * `npm run lint` fails if this and the migration disagree
 * (scripts/check-job-vocabulary.mjs).
 */
export const JOB_STATUSES = [
  "pending",
  "fetching",
  "reading",
  "understanding",
  "drafting",
  "polishing",
  "completed",
  "failed",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

/**
 * One generation job, as GET /api/generate/jobs/{jobId} reports it.
 *
 * `errorCode` is the backend's reason when the job failed. The backend's set
 * of codes is open, so it is kept as a string here and mapped to a
 * GenerateFailReason by whoever shows it — an unrecognised code is `unknown`.
 */
export interface GenerationJob {
  jobId: string;
  status: JobStatus;
  progress: number | null;
  resultId: string | null;
  errorCode: string | null;
  createdAt: string;
  completedAt: string | null;
}

/**
 * Every reason a generation can fail, as a closed union.
 *
 * Refused when the job is started (the response's detail.code):
 *   empty-transcript, transcript-too-long, unknown-content-type,
 *   not-authenticated, auth-unavailable, generation-busy, job-not-created
 *
 * Recorded on a job that failed (its errorCode):
 *   provider-misconfigured, generation-failed, invalid-structured-output,
 *   draft-not-saved, unexpected, interrupted
 *
 * Reported while polling: job-not-found
 *
 * Client-side: `network` when fetch itself throws (offline, server down), and
 * `unknown` for anything else — including a code from the server this union
 * does not name.
 *
 * `invalid-structured-output` means the model returned unusable JSON for a
 * flashcards/quiz generation. A fresh attempt often succeeds, so its copy
 * should say so. Stopping waiting for a run is not a failure and is not here.
 */
export type GenerateFailReason =
  | "empty-transcript"
  | "transcript-too-long"
  | "unknown-content-type"
  | "not-authenticated"
  | "auth-unavailable"
  | "generation-busy"
  | "job-not-created"
  | "provider-misconfigured"
  | "generation-failed"
  | "invalid-structured-output"
  | "draft-not-saved"
  | "unexpected"
  | "interrupted"
  | "job-not-found"
  | "network"
  | "unknown";