// ─────────────────────────────────────────────────────────────
// lib/api/backend.ts
//
// What the clients for the signed-in backend routes share: where the backend
// is, how long a request may take, the access token sent with it, and how a
// refusal's `detail` is read.
// ─────────────────────────────────────────────────────────────

import { createClient } from "@/lib/supabase/client";

// NEXT_PUBLIC_ so it's available in browser code; falls back to localhost in dev.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// How long a request may take before it is given up as a network failure.
// Without it a stalled connection would hold the caller inside the await
// indefinitely, past any limit a poller sets on waiting.
export const REQUEST_TIMEOUT_MS = 15_000;

/**
 * The signed-in user's access token, or null when there is no session.
 * Callers call it inside their own try, where a throw becomes "network".
 */
export async function accessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  return session?.access_token ?? null;
}

/**
 * The `detail` object from an error body, or null if the body is not one of
 * ours. A body can be read once, so the code and anything else the refusal
 * carries are taken from this.
 */
export async function detailFrom(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null) {
      const detail = (body as { detail?: unknown }).detail;
      if (typeof detail === "object" && detail !== null) return detail as Record<string, unknown>;
    }
  } catch {
    // Not JSON — a proxy error page, say. Fall through.
  }
  return null;
}

/** detail.code, or null. */
export function codeOf(detail: Record<string, unknown> | null): string | null {
  return typeof detail?.code === "string" ? detail.code : null;
}
