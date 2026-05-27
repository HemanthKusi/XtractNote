import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, Caveat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";

// ── Font Loading ──
// Next.js automatically optimizes and self-hosts these fonts
// They're available as CSS variables throughout the app

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

// Note: Instrument Serif is loaded via @import in globals.css
// because next/font doesn't support it directly yet.
// We use a CSS variable fallback for it.

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
  weight: ["500", "700"],
});

// ── Metadata ──
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

// ── Root Layout ──
// This wraps every page in the app. It sets up fonts, theme, and base HTML.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      // suppressHydrationWarning prevents React warning when theme
      // class is added by ThemeProvider before hydration completes
      suppressHydrationWarning
      className={`${dmSans.variable} ${jetbrainsMono.variable} ${caveat.variable}`}
    >
      <head>
        {/* Instrument Serif — loaded via Google Fonts link because
            next/font doesn't include it in the standard package */}
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-xn-bg font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
