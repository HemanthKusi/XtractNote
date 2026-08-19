import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { ToastProvider } from "@/components/shared/toast-provider";

// ── Font Loading ────────────────────────────────────────────
// next/font downloads these at build time and self-hosts them, so no
// request leaves the user's browser for a font and there is no
// third-party origin in the critical path.
//
// Each font exposes a CSS variable that tailwind.config.ts maps to a
// family. Three families, each with a job: sans for interface text,
// serif for editorial headings, mono for anything measured.
//
// The serif was previously pulled in with an @import at the top of
// globals.css — a render-blocking request to an external origin, and
// the reason that file carried a rule about @import having to come
// first. It is supported here like the others, so that is gone.

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
  weight: "400",
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// ── Metadata ────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "XtractNote — YouTube to Content, Powered by AI",
  // Note the wording: the generation path is a single model call, not a
  // pipeline of agents. Describing it as multi-agent would be a claim the
  // product does not currently support.
  description:
    "Turn YouTube videos into blog posts, study notes, summaries, research briefs, flashcards, quizzes, and social posts.",
  keywords: [
    "YouTube to blog",
    "AI content generator",
    "video to notes",
    "YouTube summary",
    "AI study notes",
    "video transcript",
  ],
};

// ── Root Layout ─────────────────────────────────────────────
// Wraps every page with fonts, theme, and toast support.
//
// Provider nesting order matters:
//   ThemeProvider (outermost — sets CSS variables)
//     └─ ToastProvider (inside — uses theme variables for styling)
//         └─ {children} (pages — can call useToast() anywhere)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${dmSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* The theme is read from localStorage synchronously in ThemeProvider, so
            it is correct on first paint and never flashes. The server cannot see
            localStorage, so it renders light while a client holding dark renders
            dark, and React reports a hydration mismatch in development. It is
            dev-only and cosmetic. The real fix is to keep the preference in a
            cookie the server can read; still outstanding. */}
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}