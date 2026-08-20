import type { Config } from "tailwindcss";

const config: Config = {
  // Tell Tailwind which files to scan for class names.
  // It looks through all .tsx, .ts, .jsx, .js files in src/ to find
  // classes like "bg-xn-surface" and generates CSS only for those.
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      // ────────────────────────────────────────────────────────
      // COLORS
      // ────────────────────────────────────────────────────────
      // Every colour is a CSS variable declared in globals.css.
      // When you write bg-xn-surface, Tailwind outputs:
      //   background-color: var(--xn-surface);
      // and the value comes from whichever theme is active. Nothing
      // here is a literal, so nothing here can go stale against the
      // token layer or ignore the theme.
      colors: {
        xn: {
          bg:              "var(--xn-bg)",
          "bg-deep":       "var(--xn-bg-deep)",
          surface:         "var(--xn-surface)",
          "surface-alt":   "var(--xn-surface-alt)",
          ink:             "var(--xn-ink)",
          "ink-muted":     "var(--xn-ink-muted)",
          "ink-soft":      "var(--xn-ink-soft)",
          "ink-faint":     "var(--xn-ink-faint)",
          border:          "var(--xn-border)",
          "border-strong": "var(--xn-border-strong)",
          highlight:       "var(--xn-highlight)",

          // Semantic. Danger is a real token now rather than the
          // accent standing in for error states.
          danger:          "var(--xn-danger)",
          "danger-soft":   "var(--xn-danger-soft)",

          // Transitional: resolves to ink. Kept only because a
          // number of components still reference it — see the note
          // in globals.css.
          accent:          "var(--xn-accent)",
          "accent-soft":   "var(--xn-accent-soft)",

          // ── Content-format identity ──
          // The only saturated colours in the product, and the only
          // place they belong is a format-bearing element: a chip, a
          // type icon, a folder dot, the rail on an output header.
          // Never a button, nav item, background, or primary action.
          //
          // Previously these were literal hex under a "content" key,
          // which meant they could not respond to the theme. Every
          // value now clears WCAG 4.5:1 on its own ground.
          //
          // Usage: text-xn-fmt-research, bg-xn-fmt-quiz
          "fmt-blog":       "var(--xn-fmt-blog)",
          "fmt-notes":      "var(--xn-fmt-notes)",
          "fmt-summary":    "var(--xn-fmt-summary)",
          "fmt-research":   "var(--xn-fmt-research)",
          "fmt-flashcards": "var(--xn-fmt-flashcards)",
          "fmt-quiz":       "var(--xn-fmt-quiz)",
          "fmt-social":     "var(--xn-fmt-social)",
        },
      },

      // ────────────────────────────────────────────────────────
      // ELEVATION
      // ────────────────────────────────────────────────────────
      // Four stacked layers whose offset and blur grow as opacity
      // falls, so the tight dark layer sits under the element and the
      // wide faint one does the ambient work. Depth does the
      // separating; borders are for structure, not for edges.
      //
      // shadow-xn and shadow-xn-lg keep their names because a dozen
      // components already use them, and a renamed shadow would fail
      // silently rather than error.
      //
      // Usage: shadow-xn-1 (rest), shadow-xn (raised),
      //        shadow-xn-lg (floating), shadow-xn-hover
      boxShadow: {
        "xn-1":     "var(--xn-elev-1)",
        xn:         "var(--xn-elev-2)",
        "xn-lg":    "var(--xn-elev-3)",
        "xn-hover": "var(--xn-elev-hover)",

        // ── Interactive states ──
        // Elevation and halo composed once here rather than spelled out
        // as arbitrary values in every component. A control lifts into
        // -lift on hover, and -press removes the elevation entirely while
        // the halo contracts, so it reads as being pushed into the
        // surface rather than merely dropping.
        "xn-lift":    "0 0 0 var(--xn-halo-size) var(--xn-halo), var(--xn-elev-2)",
        "xn-lift-lg": "0 0 0 var(--xn-halo-size) var(--xn-halo), var(--xn-elev-3)",
        "xn-press":   "0 0 0 var(--xn-halo-size-press) var(--xn-halo-press)",
      },

      // ────────────────────────────────────────────────────────
      // BORDER RADIUS
      // ────────────────────────────────────────────────────────
      // Rounded throughout — nothing boxy. Cards sit at lg, controls
      // at pill. There is deliberately no oversized token pretending
      // to be a corner.
      //
      // Usage: rounded-xn-sm … rounded-xn-pill
      borderRadius: {
        "xn-sm":   "var(--xn-radius-sm)",   // 8px
        "xn-md":   "var(--xn-radius-md)",   // 10px
        "xn-lg":   "var(--xn-radius-lg)",   // 14px — cards
        "xn-xl":   "var(--xn-radius-xl)",   // 18px
        "xn-pill": "var(--xn-radius-pill)", // 999px — controls
      },

      // ────────────────────────────────────────────────────────
      // FONT FAMILIES
      // ────────────────────────────────────────────────────────
      // Three families, each with a job:
      // - sans:  all UI text
      // - serif: editorial headings
      // - mono:  metadata, timestamps, counts — anything measured
      //
      // The handwriting family is gone: it existed for margin
      // annotations that were never built, and it was being loaded on
      // every page for nothing.
      //
      // This file is the single home for the families themselves.
      // Their optical letter-spacing cannot live here — Tailwind's
      // fontFamily options accept only font-feature and
      // font-variation settings — so it is applied to the same class
      // names in globals.css, which now sets tracking alone and no
      // longer restates the family.
      fontFamily: {
        sans:  ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-instrument-serif)", "Georgia", "serif"],
        mono:  ["var(--font-jetbrains-mono)", "ui-monospace", "Menlo", "monospace"],
      },

      // ────────────────────────────────────────────────────────
      // FONT SIZES
      // ────────────────────────────────────────────────────────
      // Reading grade. The output view is where people actually read,
      // so body is set for reading rather than for a dashboard — it
      // was 14px, which at the old 14px root rendered smaller still.
      //
      // Names are unchanged because components use them throughout;
      // only the values moved.
      //
      // Usage: text-display, text-h1…text-h4, text-body, text-ui,
      //        text-sm, text-xs, text-micro, text-nano
      fontSize: {
        "display": ["var(--xn-text-5xl)", { lineHeight: "var(--xn-leading-tight)", letterSpacing: "-0.045em" }],
        "h1":      ["var(--xn-text-4xl)", { lineHeight: "var(--xn-leading-tight)", letterSpacing: "-0.04em" }],
        "h2":      ["var(--xn-text-3xl)", { lineHeight: "1.12", letterSpacing: "-0.035em" }],
        "h3":      ["var(--xn-text-2xl)", { lineHeight: "1.18", letterSpacing: "-0.03em" }],
        "h4":      ["var(--xn-text-xl)",  { lineHeight: "var(--xn-leading-snug)", letterSpacing: "-0.025em" }],
        "h5":      ["var(--xn-text-lg)",  { lineHeight: "1.35", letterSpacing: "-0.02em" }],
        "body":    ["var(--xn-text-body)", { lineHeight: "var(--xn-leading-body)" }],
        "ui":      ["var(--xn-text-ui)",  { lineHeight: "var(--xn-leading-normal)" }],
        "sm":      ["var(--xn-text-sm)",  { lineHeight: "1.5" }],
        "xs":      ["var(--xn-text-xs)",  { lineHeight: "1.4" }],
        "micro":   ["var(--xn-text-micro)", { lineHeight: "1.35" }],
        "nano":    ["var(--xn-text-nano)",  { lineHeight: "1.3" }],
      },

      // ────────────────────────────────────────────────────────
      // SPACING
      // ────────────────────────────────────────────────────────
      // Extra steps Tailwind does not ship. The named layout values
      // are revisited when the app shell is redesigned.
      spacing: {
        "4.5":     "18px",
        "13":      "52px",
        "15":      "60px",
        "18":      "72px",
        "sidebar": "232px",
        "topbar":  "56px",
      },

      // ────────────────────────────────────────────────────────
      // MAX WIDTHS
      // ────────────────────────────────────────────────────────
      // measure is the reading column: a character count rather than
      // a pixel width, so it holds its line length as type scales.
      maxWidth: {
        "measure": "var(--xn-measure)", // 64ch — generated content
        "content": "680px",             // legacy reading column
        "wide":    "960px",
      },

      // ────────────────────────────────────────────────────────
      // MOTION
      // ────────────────────────────────────────────────────────
      // Durations and easing come from the token layer so app motion
      // stays consistent: short, interruptible, and always a response
      // to something the user did. The global reduced-motion rule in
      // globals.css neutralises all of it.
      transitionDuration: {
        "xn-fast": "var(--xn-dur-fast)",
        "xn":      "var(--xn-dur-base)",
        "xn-slow": "var(--xn-dur-slow)",
      },
      transitionTimingFunction: {
        "xn":        "var(--xn-ease-out)",
        "xn-in-out": "var(--xn-ease-in-out)",
      },

      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(8px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          from: { backgroundPosition: "-200% 0" },
          to:   { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in":        "fade-in var(--xn-dur-base) var(--xn-ease-out)",
        "slide-in-right": "slide-in-right var(--xn-dur-base) var(--xn-ease-out)",
        "scale-in":       "scale-in var(--xn-dur-fast) var(--xn-ease-out)",
        "shimmer":        "shimmer 1.5s infinite linear",
      },
    },
  },

  plugins: [],
};

export default config;
