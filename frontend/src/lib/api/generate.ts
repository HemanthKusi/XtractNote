// ─────────────────────────────────────────────────────────────
// lib/api/generate.ts
//
// Frontend client for the backend content-generation endpoint.
//
// The UI calls generateContent(fullText, contentType, platform?) and gets back
// either the generated content or a clear failure reason. All the HTTP details
// (URL, method, status codes, body parsing) live here so components stay clean.
//
// Twin of fetchTranscript in lib/api/transcript.ts — same result shape, same
// try/catch structure, same detail.code-then-status fallback. The generation
// endpoint returns several distinct codes (empty / too-long / unknown-type /
// misconfigured / failed / invalid-structured-output), so reading detail.code
// matters here too.
//
// As of Phase 11 the response `content` field is a ContentBody union, not a
// string: { markdown } for prose types, { kind: "flashcards", cards } or
// { kind: "quiz", questions } for structured types. Because that body gets
// written to the database downstream, this client VALIDATES the shape rather
// than casting it.
// ─────────────────────────────────────────────────────────────

import type {
  ContentBody,
  GeneratableContentType,
  GeneratedContent,
  GenerateFailReason,
  SocialPlatform,
} from "@/lib/content/types";

// Same backend base URL the other clients use. NEXT_PUBLIC_ so it's
// available in browser code; falls back to localhost in dev.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type GenerateContentResult =
  | { ok: true; data: GeneratedContent }
  | { ok: false; reason: GenerateFailReason };

// The codes the backend is allowed to send in detail.code. We check against
// this before trusting the body, so a malformed/unexpected code can't slip
// through as a fake reason. Note: "network" and "unknown" are client-side
// reasons and never appear here — the backend never sends them.
//
// Keep this in parity with _GENERATE_ERROR_STATUS in backend/app/api/generate.py.
// A backend code that is missing here silently degrades to a status-mapped
// fallback, which loses the specific message — so any new code needs three
// updates: the GenerateFailReason union, this list, and the ERROR_MESSAGES map.
const BACKEND_REASONS: readonly GenerateFailReason[] = [
  "empty-transcript",
  "transcript-too-long",
  "unknown-content-type",
  "provider-misconfigured",
  "generation-failed",
  "invalid-structured-output",
];

// Fallback when we can't read a code from the body: map the status alone.
// In practice every coded failure carries detail.code (handled below), so this
// only fires for bodies without one — e.g. a FastAPI/Pydantic 422 validation
// error (detail is an array, not {code}), a bare 500 crash, or a proxy error
// page. We map to the closest honest reason.
function statusToReason(status: number): GenerateFailReason {
  switch (status) {
    case 500:
      return "provider-misconfigured";
    case 502:
      return "generation-failed";
    default:
      // Includes 422 without a readable code (a validation/contract issue the
      // user can't act on) and anything else unexpected.
      return "unknown";
  }
}

// Prefer the backend's machine code (detail.code); fall back to status.
async function reasonFromResponse(response: Response): Promise<GenerateFailReason> {
  try {
    const body = await response.json();
    const code = body?.detail?.code;
    if (typeof code === "string" && (BACKEND_REASONS as readonly string[]).includes(code)) {
      return code as GenerateFailReason;
    }
  } catch {
    // Body wasn't JSON (e.g. a proxy error page). Fall through to status.
  }
  return statusToReason(response.status);
}

/**
 * Validate an unknown payload into a ContentBody, or return null.
 *
 * We check rather than cast because this body is written to the database in
 * lib/api/content.ts and switched on in the output renderer. A cast would
 * assert the shape without verifying it, so a contract drift would persist
 * junk into content_body instead of failing loudly here.
 *
 * Deliberately shallow: it confirms the discriminant and that the collection
 * is an array. The backend already validates every item (dropping unusable
 * cards/questions), so re-checking each field here would duplicate that work.
 */
function parseBody(raw: unknown): ContentBody | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as Record<string, unknown>;

  if (body.kind === "flashcards") {
    return Array.isArray(body.cards) ? (body as unknown as ContentBody) : null;
  }
  if (body.kind === "quiz") {
    return Array.isArray(body.questions) ? (body as unknown as ContentBody) : null;
  }
  // Prose: no discriminant, just markdown text.
  if (body.kind === undefined && typeof body.markdown === "string") {
    return body as unknown as ContentBody;
  }
  return null;
}

/**
 * Generate content from a transcript via the backend.
 *
 * Pass the transcript's fullText (from a successful fetchTranscript) and the
 * chosen content type. `platform` is REQUIRED when contentType is "social" and
 * ignored otherwise — the backend returns a 422 if it is missing, so the rule
 * is enforced there rather than encoded as an awkward overload here.
 *
 * Returns a discriminated union — check `.ok` first.
 */
export async function generateContent(
  fullText: string,
  contentType: GeneratableContentType,
  platform?: SocialPlatform
): Promise<GenerateContentResult> {
  try {
    // Only include `platform` when we actually have one, so non-social
    // requests send a clean payload with the key absent rather than null.
    const payload = platform ? { fullText, contentType, platform } : { fullText, contentType };

    const response = await fetch(`${API_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // fetch only throws on network-level failures — a 422/500/502 still
    // resolves, so we check response.ok ourselves (same as the other clients).
    if (response.ok) {
      const raw = await response.json();
      const body = parseBody(raw?.content);
      if (!body) {
        // A 200 whose body we don't recognize means our contract drifted, not
        // that the model misbehaved — so this is "unknown", NOT
        // "invalid-structured-output" (which is the retryable model failure).
        return { ok: false, reason: "unknown" };
      }
      return {
        ok: true,
        data: {
          contentType: raw.contentType ?? contentType,
          platform: raw.platform ?? null,
          content: body,
        },
      };
    }

    return { ok: false, reason: await reasonFromResponse(response) };
  } catch {
    // No response at all: backend down, CORS, DNS, no internet.
    return { ok: false, reason: "network" };
  }
}