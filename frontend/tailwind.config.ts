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
      // These map to CSS variables defined in globals.css.
      // When you write bg-xn-surface, Tailwind outputs:
      //   background-color: var(--xn-surface);
      // The actual hex value comes from whichever [data-theme]
      // is active — that's how theme switching works.
      colors: {
        xn: {
          bg:             "var(--xn-bg)",
          "bg-deep":      "var(--xn-bg-deep)",
          surface:        "var(--xn-surface)",
          "surface-alt":  "var(--xn-surface-alt)",
          ink:            "var(--xn-ink)",
          "ink-muted":    "var(--xn-ink-muted)",
          "ink-soft":     "var(--xn-ink-soft)",
          "ink-faint":    "var(--xn-ink-faint)",
          border:         "var(--xn-border)",
          "border-strong":"var(--xn-border-strong)",
          accent:         "var(--xn-accent)",
          "accent-soft":  "var(--xn-accent-soft)",
          highlight:      "var(--xn-highlight)",
        },

        // Content type colors are static — they don't change with theme.
        // These are the identity colors for each content format.
        // Usage: text-content-blog, bg-content-notes, border-content-quiz
        content: {
          blog:       "#3B7AE8",
          notes:      "#48903A",
          summary:    "#D4880C",
          research:   "#7E4CC5",
          flashcards: "#E06030",
          quiz:       "#D44060",
          social:     "#1C8C86",
        },
      },

      // ────────────────────────────────────────────────────────
      // BOX SHADOWS
      // ────────────────────────────────────────────────────────
      // The hi-fi uses warm-tinted shadows in light mode and
      // heavy dark shadows in dark mode. CSS variables handle this.
      // Usage: shadow-xn (default), shadow-xn-lg (prominent)
      boxShadow: {
        xn:       "var(--xn-shadow)",
        "xn-lg":  "var(--xn-shadow-lg)",
      },

      // ────────────────────────────────────────────────────────
      // BORDER RADIUS
      // ────────────────────────────────────────────────────────
      // The hi-fi uses a specific radius scale, not Tailwind's
      // default. Pill (999px) is for buttons and chips.
      // Usage: rounded-xn-sm, rounded-xn-md, rounded-xn-lg,
      //        rounded-xn-xl, rounded-xn-pill
      borderRadius: {
        "xn-sm":    "var(--xn-radius-sm)",   // 6px
        "xn-md":    "var(--xn-radius-md)",   // 10px
        "xn-lg":    "var(--xn-radius-lg)",   // 14px
        "xn-xl":    "var(--xn-radius-xl)",   // 20px
        "xn-pill":  "var(--xn-radius-pill)", // 999px
      },

      // ────────────────────────────────────────────────────────
      // FONT FAMILIES
      // ────────────────────────────────────────────────────────
      // Four fonts from the hi-fi design:
      // - sans: DM Sans — all UI text
      // - serif: Instrument Serif — headings in editorial content
      // - mono: JetBrains Mono — metadata, code, eyebrow labels
      // - hand: Caveat — only on Notes screen margin annotations
      //
      // Usage: font-sans (default), font-serif, font-mono, font-hand
      fontFamily: {
        sans:  ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        serif: ["Instrument Serif", "Georgia", "serif"],
        mono:  ["var(--font-jetbrains-mono)", "ui-monospace", "Menlo", "monospace"],
        hand:  ["var(--font-caveat)", "cursive"],
      },

      // ────────────────────────────────────────────────────────
      // FONT SIZES
      // ────────────────────────────────────────────────────────
      // Matches the heading scale from hifi-core.jsx exactly:
      //   .hf-h1 = 56px, .hf-h2 = 36px, .hf-h3 = 20px, .hf-h4 = 16px
      //
      // Each entry is [fontSize, { lineHeight, letterSpacing }].
      // Usage: text-display, text-h1, text-h2, text-h3, text-h4,
      //        text-body, text-sm, text-xs, text-micro, text-nano
      fontSize: {
        "display": ["56px", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        "h1":      ["42px", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "h2":      ["36px", { lineHeight: "1.08", letterSpacing: "-0.015em" }],
        "h3":      ["20px", { lineHeight: "1.2",  letterSpacing: "-0.005em" }],
        "h4":      ["16px", { lineHeight: "1.3" }],
        "body":    ["14px", { lineHeight: "1.45" }],
        "sm":      ["13px", { lineHeight: "1.4" }],
        "xs":      ["12px", { lineHeight: "1.35" }],
        "micro":   ["11px", { lineHeight: "1.3" }],
        "nano":    ["10px", { lineHeight: "1.2" }],
      },

      // ────────────────────────────────────────────────────────
      // SPACING
      // ────────────────────────────────────────────────────────
      // Extra spacing values that Tailwind doesn't include by default.
      // These match specific measurements from the hi-fi layouts.
      // Usage: w-sidebar, h-topbar, p-13, etc.
      spacing: {
        "4.5":    "18px",
        "13":     "52px",
        "15":     "60px",
        "18":     "72px",
        "sidebar": "232px",  // Sidebar width from HFSidebar
        "topbar":  "56px",   // Top bar height from HFTopbar
      },

      // ────────────────────────────────────────────────────────
      // MAX WIDTHS
      // ────────────────────────────────────────────────────────
      // Content reading width and dashboard content width.
      // Usage: max-w-content (blog posts), max-w-wide (dashboard)
      maxWidth: {
        "content": "680px",  // Blog post reading column
        "wide":    "960px",  // Dashboard and wider layouts
      },

      // ────────────────────────────────────────────────────────
      // ANIMATIONS
      // ────────────────────────────────────────────────────────
      // Subtle entrance animations for components.
      // Usage: animate-fade-in, animate-slide-in-right, etc.
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
        "fade-in":        "fade-in 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.2s ease-out",
        "scale-in":       "scale-in 0.15s ease-out",
        "shimmer":        "shimmer 1.5s infinite linear",
      },
    },
  },

  plugins: [],
};

export default config;