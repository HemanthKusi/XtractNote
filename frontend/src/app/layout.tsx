import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, Caveat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";

// ─────────────────────────────────────────────────────────────
// Font Loading
// ─────────────────────────────────────────────────────────────
// next/font downloads these at build time and self-hosts them.
// Each font gets a CSS variable that we reference in tailwind.config.ts
// and globals.css.
//
// Font usage in XtractNote:
//   DM Sans        → All UI text (buttons, labels, body paragraphs)
//   Instrument Serif → Editorial headings (blog titles, section headers)
//   JetBrains Mono → Metadata, timestamps, code, eyebrow labels
//   Caveat         → Handwritten margin notes (only on Notes screen)
//
// Instrument Serif is loaded via @import in globals.css because
// next/font doesn't support it. The other three are loaded here.
// ─────────────────────────────────────────────────────────────

const dmSans = DM_Sans({
  subsets: ["latin"],
  // This creates a CSS variable --font-dm-sans that we can use anywhere.
  // In globals.css: font-family: var(--font-dm-sans)
  // In tailwind.config.ts: fontFamily.sans uses this variable
  variable: "--font-dm-sans",
  // "swap" means: show text immediately in a fallback font, then swap
  // to DM Sans once it loads. This prevents invisible text while loading.
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
  // Caveat only needs these two weights. Loading fewer weights = smaller file.
  // 500 for normal margin notes, 700 for bold annotations.
  weight: ["500", "700"],
});

// ─────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────
// This is used by search engines and social media when your app
// is shared. Next.js automatically generates the <title> and
// <meta> tags from this object.

export const metadata: Metadata = {
  title: "XtractNote — YouTube to Content, Powered by AI",
  description:
    "Transform YouTube videos into blog posts, study notes, summaries, research papers, flashcards, and more using multi-agent AI.",
  keywords: [
    "YouTube to blog",
    "AI content generator",
    "video to notes",
    "YouTube summary",
    "AI study notes",
    "video transcript",
  ],
};

// ─────────────────────────────────────────────────────────────
// Root Layout
// ─────────────────────────────────────────────────────────────
// This component wraps every page in the app. It:
// 1. Sets the <html> lang and font CSS variables
// 2. Sets data-theme="paper" as the initial theme (server-side)
// 3. Wraps everything in ThemeProvider (which updates data-theme
//    on the client side based on localStorage)
// 4. Renders the page content inside <body>
//
// Every page you create (landing page, dashboard, etc.) renders
// as {children} inside this layout.

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      // Default theme for server-side rendering.
      // ThemeProvider will override this on the client if the user
      // has a different theme saved in localStorage.
      data-theme="paper"
      // The .variable classes add the CSS variables to <html>.
      // After this, --font-dm-sans, --font-jetbrains-mono, and
      // --font-caveat are available everywhere in CSS.
      className={`${dmSans.variable} ${jetbrainsMono.variable} ${caveat.variable}`}
      // Prevents React warning when ThemeProvider changes data-theme
      // from "paper" (server default) to the user's saved theme.
      suppressHydrationWarning
    >
      <body>
        {/* ThemeProvider reads localStorage, updates data-theme,
            and provides useTheme() to all child components. */}
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}