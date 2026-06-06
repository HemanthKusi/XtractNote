"use client";

import { useState } from "react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Use cases", href: "#use-cases" },
  { label: "Examples", href: "#examples" },
  { label: "Extension", href: "#extension" },
  { label: "Pricing", href: "#pricing" },
];

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
      <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 py-5 md:px-12">
        <Logo showWordmark size={26} />
        <div className="flex-1" />

        {/* Nav links — hidden on mobile, shown on md+ */}
        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => {
            return (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-[var(--ink-muted)] transition-colors duration-150 hover:text-[var(--ink)]"
              >
                {link.label}
              </a>
            );
          })}
        </div>

        {/* CTA buttons */}
        <div className="flex items-center gap-3">
          <Button variant="default" size="sm" className="hidden sm:inline-flex">
            Sign in
          </Button>
          <Button variant="primary" size="sm">
            Try free
          </Button>
        </div>

        {/* Hamburger toggle — mobile only */}
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

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="border-t border-[var(--border)] px-6 pb-4 pt-2 md:hidden">
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
            <a
              className="mt-1 rounded-md px-3 py-2.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-alt)] sm:hidden"
            >
              Sign in
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}