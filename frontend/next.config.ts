import path from "node:path";

import type { NextConfig } from "next";

// The extensions a page or route file may have. The design specimens under
// app/dev are named `page.dev.tsx`, and `dev.tsx` is recognised only outside
// a production build — so `next dev` serves them, and a production build,
// preview or live, does not contain them. scripts/check-dev-pages.mjs fails
// if a file under app/dev is named the way a production page or route is.
const PRODUCTION_PAGE_EXTENSIONS = ["tsx", "ts", "jsx", "js"];

const nextConfig: NextConfig = {
  pageExtensions:
    process.env.NODE_ENV === "production"
      ? PRODUCTION_PAGE_EXTENSIONS
      : ["dev.tsx", ...PRODUCTION_PAGE_EXTENSIONS],

  // ── Scope Turbopack to this app, not the whole repository ──
  //
  // Turbopack picks its workspace root by looking for lockfiles. Given two in
  // one tree it chooses the OUTER one, so a stray manifest at the repository
  // root silently moves the root up a level and the dev server's file watcher
  // and module graph start spanning every sibling directory — the backend, the
  // extension and its own dependencies, generated output, .git.
  //
  // That failure is not visible at startup. The server still reports ready in
  // about 300ms and then exhausts memory the moment a route actually
  // compiles, which makes it look like a fault in whichever editor or terminal
  // happens to be hosting it rather than in this configuration.
  //
  // It happened here: local tooling installed at the root left a manifest
  // behind, and roughly 880MB across tens of thousands of files went into the
  // graph. The manifest is gone and .gitignore no longer hides a replacement,
  // so this line is now a guard rather than a fix — it pins the root even if
  // one reappears. `root` is documented as "only files above this directory
  // can be resolved", which is what confines both the graph and the watcher.
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Allow YouTube thumbnail images from YouTube's CDN
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
