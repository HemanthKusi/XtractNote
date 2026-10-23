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
// way, so the check uses that parser instead, against a placeholder origin.
//
// Both the value that came in and the path that goes out are checked.
// Parsing changes the path — `/a/..//evil.example` resolves to
// `//evil.example` — so a path built from a value that stayed on the site
// can still leave it when the router parses it again.
//
// Imports nothing, so scripts/check-redirect.mjs can load it.
// ─────────────────────────────────────────────────────────────

/** An origin no request can come from; `.invalid` is reserved for this. */
const PLACEHOLDER_ORIGIN = "https://redirect-check.invalid";

/** `value` parsed against the placeholder, or null when it cannot be. */
function parse(value: string): URL | null {
  try {
    return new URL(value, PLACEHOLDER_ORIGIN);
  } catch {
    return null;
  }
}

/**
 * `requested` as a path, query and hash on this site, or `fallback` when it
 * is missing, does not start with "/", or it or the path it becomes
 * resolves to another origin.
 */
export function safeRedirectPath(requested: string | null, fallback: string): string {
  if (!requested || !requested.startsWith("/")) return fallback;

  const url = parse(requested);
  if (url === null || url.origin !== PLACEHOLDER_ORIGIN) return fallback;

  const path = `${url.pathname}${url.search}${url.hash}`;
  return parse(path)?.origin === PLACEHOLDER_ORIGIN ? path : fallback;
}
