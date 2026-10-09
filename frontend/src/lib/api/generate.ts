// ─────────────────────────────────────────────────────────────
// lib/api/generate.ts
//
// Frontend client for the generation endpoints.
//
// Generation runs in the background. `startGeneration` asks the backend to
// start one and gets back a job id; `fetchJob` reports that job's state. The
// finished content is saved as a draft row, read through lib/api/history.ts.
//
// Both send the signed-in user's access token. The backend decides who the
// user is from that token alone.
//
// Every response is checked rather than cast: a body this client does not
// recognise is a failure, never data.
// ─────────────────────────────────────────────────────────────

import { createClient } from "@/lib/supabase/client";
import {
  JOB_STATUSES,
  type GeneratableContentType,
  type GenerateFailReason,
  type GenerationJob,
  type JobStatus,
  type SocialPlatform,
} from "@/lib/content/types";
import type { VideoMeta } from "@/lib/youtube/types";

// Same backend base URL the other clients use. NEXT_PUBLIC_ so it's
// available in browser code; falls back to localhost in dev.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// How long either request may take before it is given up as a network
// failure. Without it a stalled connection would hold the caller inside the
// await indefinitely, past any limit the poller sets on waiting.
const REQUEST_TIMEOUT_MS = 15_000;

// Statuses a proxy or gateway can return without our error body, meaning
// "not now" rather than "no": ask again.
const RETRYABLE_STATUSES = new Set([408, 429]);

export type StartGenerationResult =
  | { ok: true; jobId: string }
  | { ok: false; reason: GenerateFailReason };

/**
 * `transient` says whether asking again might succeed: the network, or the
 * server being briefly unable to check. A poller retries those and stops at
 * the rest.
 */
export type FetchJobResult =
  | { ok: true; job: GenerationJob }
  | { ok: false; reason: GenerateFailReason; transient: boolean };

// The codes POST /api/generate refuses with, in detail.code. Checked against
// this before being trusted, so an unexpected string cannot pass as a reason.
const START_REASONS: readonly GenerateFailReason[] = [
  "empty-transcript",
  "transcript-too-long",
  "unknown-content-type",
  "not-authenticated",
  "auth-unavailable",
  "generation-busy",
  "job-not-created",
];

/** The signed-in user's access token, or null when there is no session. */
async function accessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  return session?.access_token ?? null;
}

/** detail.code from an error body, or null if the body is not one of ours. */
async function codeFrom(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null) {
      const detail = (body as { detail?: unknown }).detail;
      if (typeof detail === "object" && detail !== null) {
        const code = (detail as { code?: unknown }).code;
        if (typeof code === "string") return code;
      }
    }
  } catch {
    // Not JSON — a proxy error page, say. Fall through.
  }
  return null;
}

/**
 * Start a generation in the background.
 *
 * `platform` is required when contentType is "social" and ignored otherwise.
 * `meta` supplies the video's details for the draft row; the watch URL is not
 * sent, because the backend builds it from the video id.
 *
 * `requestId` identifies this start. Sending the same one again returns the
 * job it already made, so a start whose reply was lost — "network" — can be
 * repeated without paying twice. The caller keeps it until it has a definite
 * answer, and uses a new one for a new request.
 */
export async function startGeneration(
  fullText: string,
  contentType: GeneratableContentType,
  platform: SocialPlatform | undefined,
  meta: VideoMeta,
  requestId: string,
): Promise<StartGenerationResult> {
  try {
    const token = await accessToken();
    if (!token) return { ok: false, reason: "not-authenticated" };

    const response = await fetch(`${API_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        fullText,
        contentType,
        // Only sent for social, so other types carry no stray value.
        ...(platform ? { platform } : {}),
        videoId: meta.videoId,
        title: meta.title,
        channel: meta.channel,
        thumbnailUrl: meta.thumbnailUrl,
        ...(meta.durationSeconds != null ? { durationSeconds: meta.durationSeconds } : {}),
        requestId,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const jobId =
        typeof body === "object" && body !== null ? (body as { jobId?: unknown }).jobId : undefined;
      // A success whose body this client does not recognise means the contract
      // drifted — `unknown`, not a fake job id.
      return typeof jobId === "string" && jobId
        ? { ok: true, jobId }
        : { ok: false, reason: "unknown" };
    }

    const code = await codeFrom(response);
    if (code !== null && (START_REASONS as readonly string[]).includes(code)) {
      return { ok: false, reason: code as GenerateFailReason };
    }
    return { ok: false, reason: response.status === 401 ? "not-authenticated" : "unknown" };
  } catch {
    // No response at all, or none within the time limit: backend down, CORS,
    // DNS, no internet, or a stalled connection.
    return { ok: false, reason: "network" };
  }
}

/** A job as the server reported it, or null if the body is not a job. */
function parseJob(raw: unknown): GenerationJob | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const isStringOrNull = (value: unknown) => value === null || typeof value === "string";
  const status = r.status;
  if (
    typeof r.jobId !== "string" ||
    typeof status !== "string" ||
    !(JOB_STATUSES as readonly string[]).includes(status) ||
    !(r.progress === null || typeof r.progress === "number") ||
    !isStringOrNull(r.resultId) ||
    !isStringOrNull(r.errorCode) ||
    typeof r.createdAt !== "string" ||
    !isStringOrNull(r.completedAt)
  ) {
    return null;
  }

  return {
    jobId: r.jobId,
    status: status as JobStatus,
    progress: r.progress as number | null,
    resultId: r.resultId as string | null,
    errorCode: r.errorCode as string | null,
    createdAt: r.createdAt,
    completedAt: r.completedAt as string | null,
  };
}

/** Report one of the signed-in user's jobs. */
export async function fetchJob(jobId: string): Promise<FetchJobResult> {
  try {
    const token = await accessToken();
    if (!token) return { ok: false, reason: "not-authenticated", transient: false };

    const response = await fetch(
      `${API_BASE_URL}/api/generate/jobs/${encodeURIComponent(jobId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );

    if (response.ok) {
      const job = parseJob(await response.json().catch(() => null));
      return job ? { ok: true, job } : { ok: false, reason: "unknown", transient: false };
    }

    const code = await codeFrom(response);
    switch (code) {
      case "not-authenticated":
        return { ok: false, reason: "not-authenticated", transient: false };
      case "job-not-found":
        return { ok: false, reason: "job-not-found", transient: false };
      case "auth-unavailable":
        return { ok: false, reason: "auth-unavailable", transient: true };
      case "job-status-unavailable":
        // The server could not check just now. The run itself is unaffected.
        return { ok: false, reason: "unknown", transient: true };
      default:
        return {
          ok: false,
          reason: response.status === 401 ? "not-authenticated" : "unknown",
          transient: response.status >= 500 || RETRYABLE_STATUSES.has(response.status),
        };
    }
  } catch {
    return { ok: false, reason: "network", transient: true };
  }
}
