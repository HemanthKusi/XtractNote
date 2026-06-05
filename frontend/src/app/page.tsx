"use client";

// ─────────────────────────────────────────────────────────────
// Home Page — Placeholder
// ─────────────────────────────────────────────────────────────
// Temporary page until the real landing page is built in Phase 4.
// Shows the logo, a status message, and a link to the component
// showcase at /dev/components.
// ─────────────────────────────────────────────────────────────

import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/shared/theme-provider";
import type { ThemeName } from "@/lib/constants/theme";

export default function HomePage() {
  const { theme, setTheme } = useTheme();
  const themeOptions: ThemeName[] = ["paper", "clean", "dark"];

  return (
    <div className="min-h-screen bg-xn-bg text-xn-ink flex flex-col items-center justify-center px-6">
      {/* Theme switcher — top right corner */}
      <div className="fixed top-4 right-4 flex gap-2">
        {themeOptions.map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={[
              "px-2.5 py-1 rounded-xn-pill text-xs font-medium border transition-all",
              theme === t
                ? "bg-xn-ink text-xn-bg border-xn-ink"
                : "bg-xn-surface text-xn-ink-muted border-xn-border hover:bg-xn-surface-alt",
            ].join(" ")}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Center content */}
      <div className="flex flex-col items-center text-center max-w-md">
        {/* Logo */}
        <Logo size={48} showWordmark />

        {/* Status */}
        <p className="text-sm text-xn-ink-muted mt-6 leading-relaxed">
          Transform YouTube videos into blog posts, study notes, summaries,
          and more using multi-agent AI.
        </p>

        {/* Phase indicator */}
        <div className="mt-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-xn-accent animate-pulse" />
          <span className="font-mono text-micro text-xn-ink-soft">
            Phase 3 complete · Landing page next
          </span>
        </div>

        {/* Links */}
        <div className="mt-8 flex gap-3">
          <Link href="/dev/components">
            <Button variant="primary">
              Component Showcase →
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <p className="fixed bottom-4 text-nano text-xn-ink-soft font-mono">
        XtractNote · Design System v1.0
      </p>
    </div>
  );
}