import type { Config } from "tailwindcss";

const config: Config = {
  // Tell Tailwind where to look for class names
  content: [
    "./src/**/*.{ts,tsx}",
  ],

  // Enable dark mode via a CSS class on <html>
  darkMode: "class",

  theme: {
    extend: {
      // ── XtractNote Color Tokens ──
      colors: {
        // Theme-aware colors (use CSS variables so they swap with dark mode)
        xn: {
          bg:           "var(--xn-bg)",
          "bg-recessed":"var(--xn-bg-recessed)",
          surface:      "var(--xn-surface)",
          ink:          "var(--xn-ink)",
          "ink-body":   "var(--xn-ink-body)",
          "ink-muted":  "var(--xn-ink-muted)",
          "ink-soft":   "var(--xn-ink-soft)",
          "ink-ghost":  "var(--xn-ink-ghost)",
          border:       "var(--xn-border)",
          "border-strong": "var(--xn-border-strong)",
        },

        // Content type colors (consistent across themes)
        content: {
          blog:       "#3B7AE8",
          notes:      "#48903A",
          summary:    "#D4880C",
          research:   "#7E4CC5",
          flashcards: "#E06030",
          quiz:       "#D44060",
          social:     "#1C8C86",
        },

        // Highlight colors
        highlight: {
          yellow: "#FEF08A",
          green:  "#BBF7D0",
          blue:   "#BFDBFE",
          pink:   "#FECDD3",
          purple: "#E9D5FF",
        },

        // Folder palette
        folder: {
          orange: "#E06030",
          blue:   "#3B7AE8",
          green:  "#48903A",
          amber:  "#D4880C",
          purple: "#7E4CC5",
          teal:   "#1C8C86",
          rose:   "#D44060",
        },
      },

      // ── Typography ──
      fontFamily: {
        sans:      ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        serif:     ["var(--font-instrument-serif)", "Georgia", "serif"],
        mono:      ["var(--font-jetbrains-mono)", "monospace"],
        handwrite: ["var(--font-caveat)", "cursive"],
      },

      // ── Spacing (4px base unit) ──
      spacing: {
        "4.5": "1.125rem",  // 18px
        "13":  "3.25rem",   // 52px — sidebar icon size
        "15":  "3.75rem",   // 60px
        "18":  "4.5rem",    // 72px
      },

      // ── Border Radius ──
      borderRadius: {
        sm:   "6px",
        md:   "10px",
        lg:   "14px",
        xl:   "20px",
        pill: "999px",
      },

      // ── Shadows ──
      boxShadow: {
        "xn":    "0 1px 2px rgba(28,24,19,0.04), 0 4px 16px rgba(28,24,19,0.03)",
        "xn-lg": "0 4px 12px rgba(28,24,19,0.06), 0 12px 40px rgba(28,24,19,0.04)",
      },

      // ── Layout widths ──
      width: {
        sidebar: "232px",
        inspector: "320px",
      },

      // ── Max widths ──
      maxWidth: {
        reading: "760px",    // Blog/notes reading column
        content: "1200px",   // Dashboard grid max
      },

      // ── Heights ──
      height: {
        topbar: "56px",
      },
    },
  },

  plugins: [],
};

export default config;
