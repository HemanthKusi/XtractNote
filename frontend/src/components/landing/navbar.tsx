"use client";

import { useState } from "react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

// ────────────────────────────────────────────────────────────
// Navigation links — defined here so they're easy to update.
// Each link has a label (displayed text) and an href (scroll
// target on the landing page using anchor IDs).
// ────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Use cases", href: "#use-cases" },
  { label: "Examples", href: "#examples" },
  { label: "Extension", href: "#extension" },
  { label: "Pricing", href: "#pricing" },
];

// ────────────────────────────────────────────────────────────
// Navbar
//
// Sticky navigation bar for the public landing page.
// Three zones:  Logo  ·  flex spacer  ·  nav links  ·  CTA buttons
//
// Responsive behavior:
//   - Logo scales down on mobile (28) vs desktop (38)
//   - Nav links collapse into hamburger on mobile
//   - Sign in + Try free buttons stay visible at ALL sizes
// ────────────────────────────────────────────────────────────
export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav
      className="
        sticky top-0 z-50
        border-b border-[var(--border)]
        bg-[var(--bg)]
        backdrop-blur-sm
      "
    >
      {/* ── Desktop row ── */}
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-3 py-3 sm:gap-6 sm:px-6 md:px-12 md:py-5">

        {/* Logo — two renders for responsive sizing.
            Logo takes a numeric size prop, not a Tailwind class,
            so we can't use responsive utilities on it directly.
            Instead: show small logo on mobile, large on md+. */}
        <div className="md:hidden">
          <Logo showWordmark size={28} />
        </div>
        <div className="hidden md:block">
          <Logo showWordmark size={38} />
        </div>

        {/* Spacer pushes links + buttons to the right */}
        <div className="flex-1" />

        {/* Nav links — hidden on mobile, shown on md+ */}
        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => {
            return (
              <a
                key={link.href}
                href={link.href}
                className="text-[15px] text-[var(--ink-muted)] transition-colors duration-150 hover:text-[var(--ink)]"
              >
                {link.label}
              </a>
            );
          })}
        </div>

        {/* CTA buttons — always visible at all screen sizes */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="default" size="md">
            Sign in
          </Button>
          <Button variant="primary" size="md">
            Try free
          </Button>
        </div>

        {/* Hamburger toggle — visible only on mobile (below md) */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="
            ml-1 inline-flex items-center justify-center
            rounded-md p-2
            text-[var(--ink-muted)]
            hover:bg-[var(--surface-alt)] hover:text-[var(--ink)]
            md:hidden
          "
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            {mobileMenuOpen ? (
              <>
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </>
            ) : (
              <>
                <line x1="3" y1="5" x2="17" y2="5" />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="15" x2="17" y2="15" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* ── Mobile dropdown — only nav links, no auth buttons ── */}
      {mobileMenuOpen && (
        <div className="border-t border-[var(--border)] px-4 pb-4 pt-2 sm:px-6 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm text-[var(--ink-muted)] transition-colors duration-150 hover:bg-[var(--surface-alt)] hover:text-[var(--ink)]"
                >
                  {link.label}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}