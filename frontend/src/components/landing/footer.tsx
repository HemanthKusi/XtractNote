import { Logo } from "@/components/layout/logo";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";

// ── Footer link columns ─────────────────────────────────────

const FOOTER_LINKS: Record<string, string[]> = {
  Product: ["Features", "Pricing", "Changelog", "Roadmap", "Browser extension", "Templates"],
  "Use cases": ["For students", "For creators", "For researchers", "For marketers", "For teams"],
  Company: ["About", "Blog", "Press kit", "Contact"],
  Resources: ["Help center", "API docs", "Tutorials", "Community", "Status"],
  Legal: ["Terms of service", "Privacy policy", "Cookie policy", "Acceptable use", "DPA · GDPR"],
};

// ── Social links — only the three active platforms ──────────

const SOCIALS = [
  {
    label: "YouTube",
    href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#FF0000">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2">
        <path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2ZM8 19H5v-9h3v9ZM6.5 8.5A1.75 1.75 0 1 1 8.3 6.8a1.75 1.75 0 0 1-1.8 1.7ZM20 19h-3v-4.7c0-1.1 0-2.5-1.5-2.5S14 13 14 14.2V19h-3v-9h2.9v1.2h0a3.2 3.2 0 0 1 2.9-1.6c3.1 0 3.7 2 3.7 4.7V19Z" />
      </svg>
    ),
  },
  {
    label: "GitHub",
    href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.5 2 2 6.5 2 12c0 4.4 2.9 8.2 6.8 9.5.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.8.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 22 12c0-5.5-4.5-10-10-10Z" />
      </svg>
    ),
  },
];

// ── Legal links at the bottom ───────────────────────────────

const LEGAL_LINKS = ["Terms", "Privacy", "Cookies", "DPA", "Security", "Acceptable use", "Sitemap"];

// ── Compliance badges ───────────────────────────────────────

const COMPLIANCE = ["SOC 2 · in progress", "GDPR-ready", "Data deletion · 24h", "YouTube ToS compliant"];

// ────────────────────────────────────────────────────────────
// Footer
//
// Marketing footer with:
//   1. Main grid — brand column + 5 link columns
//   2. Bottom row — copyright + legal links
//   3. Compliance chips + status indicator
//
// Design reference: hifi-pages-d.jsx (simplified for solo dev)
// ────────────────────────────────────────────────────────────
export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] px-6 py-16 md:px-12 md:py-[64px]">
      <div className="mx-auto max-w-[1200px]">

        {/* ════════════════════════════════════════════════════
            MAIN GRID — brand column + 5 link columns
            ════════════════════════════════════════════════════ */}
        <div
          className="
            grid gap-10
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr]
            lg:gap-10
          "
        >
          {/* ── Brand column ── */}
          <div className="flex flex-col gap-3.5">
            <Logo showWordmark size={28} />

            <p className="max-w-[280px] text-[13.5px] leading-[1.55] text-[var(--ink-muted)]">
              AI-powered multi-agent content creator for YouTube.
              Built by a solo developer, shipped in public.
            </p>

            {/* Developer */}
            <div className="flex items-center gap-2">
              <Avatar initials="HK" size="sm" />
              <span className="text-[12px] text-[var(--ink-muted)]">Hemanth Kusi</span>
            </div>

            {/* Social links */}
            <div className="mt-1 flex flex-wrap gap-2">
              {SOCIALS.map((s) => (
                <span
                  key={s.label}
                  title={s.label}
                  className="
                    inline-flex h-8 w-8 cursor-pointer items-center
                    justify-center rounded-lg border border-[var(--border)]
                    bg-[var(--xn-surface)] transition-colors
                    hover:border-[var(--border-strong)]
                  "
                >
                  {s.icon}
                </span>
              ))}
            </div>
          </div>

          {/* ── Link columns ── */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading} className="flex flex-col gap-2.5">
              <div className="text-[12.5px] font-semibold">{heading}</div>
              <div className="flex flex-col gap-1.5">
                {links.map((link) => (
                  <span
                    key={link}
                    className="cursor-pointer text-[13px] leading-[1.4] text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
                  >
                    {link}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════
            BOTTOM ROW — copyright + legal links
            ════════════════════════════════════════════════════ */}
        <div className="mt-14 flex flex-wrap items-start gap-6 border-t border-[var(--border)] pt-7">
          {/* Copyright */}
          <div className="flex-1 basis-[320px]">
            <div className="text-[12px] text-[var(--ink-muted)]">
              © 2026 XtractNote. All rights reserved.
              <span className="font-mono"> · </span>
              Made with ☕ + 🎧
            </div>
          </div>

          {/* Legal links */}
          <div className="flex flex-1 flex-wrap items-center justify-end gap-3.5">
            {LEGAL_LINKS.map((link) => (
              <span
                key={link}
                className="cursor-pointer text-[12px] text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
              >
                {link}
              </span>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            COMPLIANCE CHIPS + STATUS
            ════════════════════════════════════════════════════ */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {COMPLIANCE.map((badge) => (
            <Chip key={badge} variant="outline">
              {badge}
            </Chip>
          ))}

          <span className="flex-1" />

          {/* Status indicator */}
          <div className="flex items-center gap-1.5">
            <span className="block h-1.5 w-1.5 rounded-full bg-[#3f7a4f]" />
            <span className="font-mono text-[11px] text-[var(--ink-muted)]">All systems normal</span>
          </div>
        </div>

      </div>
    </footer>
  );
}