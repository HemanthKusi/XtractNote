import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, Caveat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { ToastProvider } from "@/components/shared/toast-provider";

// ── Font Loading ────────────────────────────────────────────
// next/font downloads these at build time and self-hosts them.
// Each font gets a CSS variable referenced in tailwind.config.ts
// and globals.css.
//
// Instrument Serif is loaded via @import in globals.css because
// next/font doesn't support it.

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
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
  weight: ["500", "700"],
});

// ── Metadata ────────────────────────────────────────────────

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
      data-theme="paper"
      className={`${dmSans.variable} ${jetbrainsMono.variable} ${caveat.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}