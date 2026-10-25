/**
 * check-dev-pages
 *
 * Fails when a file under src/app/dev is named the way a production page or
 * route is — `page.tsx`, `route.ts` and the like — instead of `page.dev.tsx`.
 *
 * ── Why this exists ──
 * The design specimens under app/dev are left out of production builds by
 * their extension: next.config.ts recognises `dev.tsx` only outside a
 * production build. A specimen added as a plain `page.tsx` would build and
 * deploy with nothing to say so, public to anyone with the URL.
 *
 * Reads the file tree only; imports nothing but Node's own modules.
 */

import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

const DEV_ROOT = new URL("../src/app/dev/", import.meta.url).pathname;

// The files that turn a folder into a URL, with the extensions a production
// build recognises (next.config.ts, PRODUCTION_PAGE_EXTENSIONS).
const PRODUCTION_ROUTE_FILE = /^(page|route|default)\.(tsx|ts|jsx|js)$/;
const DEV_PAGE_FILE = /^page\.dev\.tsx$/;

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const files = filesUnder(DEV_ROOT);
const shipping = files.filter((path) => PRODUCTION_ROUTE_FILE.test(path.split("/").pop()));
const specimens = files.filter((path) => DEV_PAGE_FILE.test(path.split("/").pop()));

let failed = false;

for (const path of shipping) {
  failed = true;
  console.error(`  FAIL  src/app/dev/${relative(DEV_ROOT, path)} would be a production URL — files under app/dev end in .dev.tsx`);
}

// With no specimens found, the check would pass on a moved or emptied folder
// without having looked at anything.
if (specimens.length === 0) {
  failed = true;
  console.error("  FAIL  no page.dev.tsx found under src/app/dev — the check is not looking where the specimens are");
}

if (failed) {
  console.error("\ncheck-dev-pages: FAILED.");
  process.exit(1);
}

console.log(`check-dev-pages: ${specimens.length} specimens, none would be a production URL.`);
