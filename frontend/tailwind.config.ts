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

          // Success is the quiz's counterpart to danger. Weight-matched to
          // it in both themes so right and wrong read as equal opposites
          // rather than one shouting over the other. Always paired with a
          // glyph — colour is never the only signal.
          success:         "var(--xn-success)",
          "success-soft":  "var(--xn-success-soft)",

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

        // The halo alone, with no elevation. Fields use this on focus:
        // they do not lift, so they get the ring without the shadow.
        "xn-ring":    "0 0 0 var(--xn-halo-size) var(--xn-halo)",
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

        // The page column for routes that render generated output.
        //
        // 1058 is derived, not chosen: 960 (`wide`) of content, plus the
        // 24px padding and 1px border the output Card puts on each side,
        // plus the 24px the page itself pads by. Cap a page here and the
        // content column inside its card lands on `wide` exactly.
        //
        // That 960 matters because the flashcard grid's column count is
        // measured against it — three 312px columns with the covers
        // clearing each other. Change this and the content width moves,
        // so re-measure rather than assuming the grid still fits.
        "output":  "1058px",
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

        // Overshoots slightly before settling. It stands in for a
        // spring on properties CSS can transition — enough for a width
        // and an offset, and it avoids a runtime dependency whose only
        // job here was easing.
        //
        // Points at the variable like its two neighbours rather than
        // repeating the curve. It was the only easing token here holding
        // its own literal, which meant anything building a transition as
        // a string — a duration computed at runtime cannot be a utility
        // class — had to copy the numbers instead of referring to them.
        "xn-spring": "var(--xn-ease-spring)",
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

        // A cycling label. The two lines travel a full line-height in
        // the same direction, so together they read as one strip of
        // text advancing upward rather than two things crossfading.
        //
        // The distance is a percentage, not pixels, so it stays correct
        // at any font size — and the opacity is held until the line is
        // most of the way through its travel, which is what stops it
        // looking like a fade with some movement attached.
        "rise-in": {
          "0%":   { opacity: "0", transform: "translateY(100%)" },
          "55%":  { opacity: "0.85" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "rise-out": {
          "0%":   { opacity: "1", transform: "translateY(0)" },
          "45%":  { opacity: "0.5" },
          "100%": { opacity: "0", transform: "translateY(-100%)" },
        },

        // The quiz explanation arriving. `fade-in` was tried first and
        // read as nothing happening — 4px of travel at 200ms is below the
        // threshold where an appearance registers as an event rather than
        // a repaint. This unfolds: it drops in from above while expanding
        // from the top edge, so the block reads as opening out of the
        // option that was just answered.
        //
        // scaleY needs its origin at the top or it grows from the middle
        // and reads as a pop rather than an unfold.
        "unfold": {
          from: { opacity: "0", transform: "translateY(-10px) scaleY(0.94)" },
          to:   { opacity: "1", transform: "translateY(0) scaleY(1)" },
        },
      },
      animation: {
        "fade-in":        "fade-in var(--xn-dur-base) var(--xn-ease-out)",
        "slide-in-right": "slide-in-right var(--xn-dur-base) var(--xn-ease-out)",
        "scale-in":       "scale-in var(--xn-dur-fast) var(--xn-ease-out)",
        "shimmer":        "shimmer 1.5s infinite linear",
        // Slower than a UI transition on purpose: this is ambient text
        // being read, not a response to an action, and a short travel
        // was over before the eye could follow it. Eased at both ends
        // rather than fast-out, because movement that starts abruptly
        // reads as a jump when nobody asked for it.
        "rise-in":        "rise-in 560ms var(--xn-ease-smooth) both",
        "rise-out":       "rise-out 560ms var(--xn-ease-smooth) both",

        // 450ms, matching the flashcard cover's swing exactly
        // (`DURATION_MS` in flashcards-view.tsx). The two structured
        // renderers are the only places in the app where content is
        // revealed by an interaction, and a reveal that takes a different
        // length of time in each reads as two unrelated products. Started
        // at 320ms, which was fine on its own and wrong next to the
        // flashcards.
        //
        // Well over the base duration either way: the travel here is
        // longer than a fade, and the same speed over a longer distance
        // reads as hurried. The motion policy treats duration as a
        // default, not a cap.
        //
        // If one of these changes, change both.
        "unfold":         "unfold 450ms var(--xn-ease-out) both",
      },

    },
  },

  plugins: [],
};

export default config;
