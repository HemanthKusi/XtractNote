/**
 * check-redirect
 *
 * Fails when the post-sign-in redirect accepts a value that leaves the site,
 * or stops accepting the in-app paths it should.
 *
 * ── Why this exists ──
 * An open redirect renders nothing wrong: sign-in succeeds, and the person
 * lands on someone else's page. The check it replaced passed `/\evil.example`,
 * which a URL parser reads as `https://evil.example/`. Each bypass form is
 * listed here, and every result is parsed again the way the router will.
 *
 * ── Why it imports rather than re-states ──
 * As with check-rate-limit: it imports the real `redirect.ts`, which imports
 * nothing, so plain node can load it.
 */

import { safeRedirectPath } from "../src/lib/auth/redirect.ts";

const FALLBACK = "/dashboard";

let failed = 0;
let run = 0;

function check(name, actual, expected) {
  run++;
  if (actual !== expected) {
    failed++;
    console.error(`  FAIL  ${name}\n          expected ${JSON.stringify(expected)}\n          got      ${JSON.stringify(actual)}`);
  }
}

// ── In-app paths pass, as the parser normalises them ──
const ACCEPTED = [
  ["a page", "/create", "/create"],
  ["a page with an id, query and hash", "/output/abc-123?a=1#b", "/output/abc-123?a=1#b"],
  ["a folder", "/folders/f16ab7a4", "/folders/f16ab7a4"],
  ["a dot segment resolves within the site", "/a/../history", "/history"],
  ["a tab inside a path is dropped, and it stays here", "/\tcreate", "/create"],
  ["an encoded backslash stays an encoded path", "/%5Cevil.example", "/%5Cevil.example"],
];
for (const [name, input, expected] of ACCEPTED) {
  check(`accepted: ${name}`, safeRedirectPath(input, FALLBACK), expected);
}

// ── Anything that is not a path on this site falls back ──
const REFUSED = [
  ["nothing", null],
  ["an empty value", ""],
  ["a path without a leading slash", "create"],
  ["protocol-relative", "//evil.example"],
  ["a backslash after the slash", "/\\evil.example"],
  ["a backslash then a slash", "/\\/evil.example"],
  ["two backslashes", "/\\\\evil.example"],
  ["a tab between two slashes", "/\t/evil.example"],
  ["a newline between two slashes", "/\n/evil.example"],
  ["a leading backslash", "\\/evil.example"],
  ["a scheme with one slash", "https:/evil.example"],
  ["an absolute URL", "https://evil.example/x"],
  ["a script URL", "javascript:alert(1)"],
];
for (const [name, input] of REFUSED) {
  check(`refused: ${name}`, safeRedirectPath(input, FALLBACK), FALLBACK);
}

// ── Whatever comes out stays on the site when the router parses it ──
const HOME = "https://app.example";
for (const [name, input] of [...ACCEPTED.map(([n, i]) => [n, i]), ...REFUSED]) {
  const result = safeRedirectPath(input, FALLBACK);
  check(`stays on the site: ${name}`, new URL(result, HOME).origin, HOME);
}

if (failed > 0) {
  console.error(`\ncheck-redirect: ${failed} of ${run} checks FAILED.`);
  process.exit(1);
}

console.log(`check-redirect: ${run} checks passed.`);
