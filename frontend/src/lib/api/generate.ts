// ─────────────────────────────────────────────────────────────
// lib/api/generate.ts
//
// Frontend client for the backend content-generation endpoint.
//
// The UI calls generateContent(fullText, contentType) and gets back either
// the generated content or a clear failure reason. All the HTTP details
// (URL, method, status codes, body parsing) live here so components stay clean.
//
// Twin of fetchTranscript in lib/api/transcript.ts — same result shape, same
// try/catch structure, same detail.code-then-status fallback. The generation
// endpoint returns several distinct codes (empty / too-long / unknown-type /
// misconfigured / failed), so reading detail.code matters here too.
// ─────────────────────────────────────────────────────────────

  import type {
    GeneratableContentType,
    GeneratedContent,
    GenerateFailReason,
  } from "@/lib/content/types";
    
  // Same backend base URL the other clients use. NEXT_PUBLIC_ so it's
  // available in browser code; falls back to localhost in dev.
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  
  export type GenerateContentResult =
    | { ok: true; data: GeneratedContent }
    | { ok: false; reason: GenerateFailReason };
  
  // The codes the backend is allowed to send in detail.code. We check against
  // this before trusting the body, so a malformed/unexpected code can't slip
  // through as a fake reason. Note: "network" and "unknown" are client-side
  // reasons and never appear here — the backend never sends them.
  const BACKEND_REASONS: readonly GenerateFailReason[] = [
    "empty-transcript",
    "transcript-too-long",
    "unknown-content-type",
    "provider-misconfigured",
    "generation-failed",
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
  async function reasonFromResponse(
    response: Response
  ): Promise<GenerateFailReason> {
    try {
      const body = await response.json();
      const code = body?.detail?.code;
      if (
        typeof code === "string" &&
        (BACKEND_REASONS as readonly string[]).includes(code)
      ) {
        return code as GenerateFailReason;
      }
    } catch {
      // Body wasn't JSON (e.g. a proxy error page). Fall through to status.
    }
    return statusToReason(response.status);
  }
  
  /**
   * Generate content from a transcript via the backend.
   *
   * Pass the transcript's fullText (from a successful fetchTranscript) and the
   * chosen content type. Returns a discriminated union — check `.ok` first.
   */
  export async function generateContent(
  fullText: string,
  contentType: GeneratableContentType
): Promise<GenerateContentResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullText, contentType }),
      });
  
      // fetch only throws on network-level failures — a 422/500/502 still
      // resolves, so we check response.ok ourselves (same as the other clients).
      if (response.ok) {
        const data = (await response.json()) as GeneratedContent;
        return { ok: true, data };
      }
  
      return { ok: false, reason: await reasonFromResponse(response) };
    } catch {
      // No response at all: backend down, CORS, DNS, no internet.
      return { ok: false, reason: "network" };
    }
  }