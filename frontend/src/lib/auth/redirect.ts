// ─────────────────────────────────────────────────────────────
// lib/auth/redirect.ts
//
// Where to send someone after they sign in, from the `redirectTo` a link
// carried. That value comes from the URL, so anyone can write it: only a
// path on this site is accepted.
//
// A prefix check is not enough. `/\evil.example` starts with one "/" and
// not two, and a URL parser reads it as `https://evil.example/`, because
// browsers treat "\" as "/". The router parses what it is given the same
// way, so the value is checked with that parser instead: resolved against a
// placeholder origin, and accepted only if the origin did not change.
//
// What is returned is the parsed path, not the string that came in, so the
// router is handed exactly the value that was checked.
//
// Imports nothing, so scripts/check-redirect.mjs can load it.
// ─────────────────────────────────────────────────────────────

/** An origin no request can come from; `.invalid` is reserved for this. */
const PLACEHOLDER_ORIGIN = "https://redirect-check.invalid";

/**
 * `requested` as a path, query and hash on this site, or `fallback` when it
 * is missing, does not start with "/", or resolves to another origin.
 */
export function safeRedirectPath(requested: string | null, fallback: string): string {
  if (!requested || !requested.startsWith("/")) return fallback;

  let url: URL;
  try {
    url = new URL(requested, PLACEHOLDER_ORIGIN);
  } catch {
    return fallback;
  }

  if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
