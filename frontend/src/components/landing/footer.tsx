import { Logo } from "@/components/layout/logo";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";

// ── Footer link columns ─────────────────────────────────────

const FOOTER_LINKS: Record<string, string[]> = {
  Product: ["Features", "Pricing", "Changelog", "Roadmap", "Browser extension", "Templates"],
  "Use cases": ["For students", "For creators", "For researchers", "For marketers", "For teams"],
  Company: ["About", "Blog", "Careers · hiring", "Press kit", "Contact"],
  Resources: ["Help center", "API docs", "Tutorials", "Community", "Status"],
  Legal: ["Terms of service", "Privacy policy", "Cookie policy", "Acceptable use", "DPA · GDPR"],
};

// ── Social icons — serif letter in a bordered square ────────

const SOCIALS = [
  { label: "X / Twitter", glyph: "𝕏" },
  { label: "YouTube", glyph: "▶" },
  { label: "LinkedIn", glyph: "in" },
  { label: "Instagram", glyph: "◎" },
  { label: "GitHub", glyph: "⌥" },
  { label: "Discord", glyph: "#" },
];

// ── Contact strip entries ───────────────────────────────────

const CONTACTS = [
  { label: "General", email: "hello@xtractnote.app", note: "Within 24h, weekdays" },
  { label: "Support", email: "support@xtractnote.app", note: "In-app chat available" },
  { label: "Press & partnerships", email: "press@xtractnote.app", note: "Press kit available" },
];

// ── Legal links at the bottom ───────────────────────────────

const LEGAL_LINKS = ["Terms", "Privacy", "Cookies", "DPA", "Security", "Acceptable use", "Sitemap"];

// ── Compliance badges ───────────────────────────────────────

const COMPLIANCE = ["SOC 2 · in progress", "GDPR-ready", "Data deletion · 24h", "YouTube ToS compliant"];

// ────────────────────────────────────────────────────────────
// Footer
//
// Full marketing footer with:
//   1. Main grid — brand column + 5 link columns
//   2. Contact strip — 4-column email/office grid
//   3. Bottom row — copyright + legal links
//   4. Compliance chips + status indicator
//
// Design reference: hifi-pages-d.jsx lines 52–163
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
              Multi-agent content creator for YouTube. Independent,
              built in public, made by a tiny team.
            </p>

            {/* Team avatars */}
            <div className="flex items-center gap-3">
              {[
                { initials: "JT", name: "Jonas T." },
                { initials: "MK", name: "Maya K." },
              ].map((person) => (
                <div key={person.initials} className="flex items-center gap-1.5">
                  <Avatar initials={person.initials} size="sm" />
                  <span className="text-[12px] text-[var(--ink-muted)]">{person.name}</span>
                </div>
              ))}
            </div>

            {/* Email signup */}
            <div className="mt-1">
              <div className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--xn-accent)]">
                Stay in the loop
              </div>
              <div className="mt-2 flex items-center gap-1 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--xn-surface)] p-1">
                <span className="flex-1 px-2.5 py-1.5 text-[12.5px] text-[var(--ink-soft)]">
                  your@email
                </span>
                <button
                  className="shrink-0 rounded-[6px] px-3 py-1.5 text-[12px] font-medium text-white"
                  style={{ backgroundColor: "var(--xn-accent)" }}
                >
                  Join
                </button>
              </div>
              <div className="mt-1.5 font-mono text-[10.5px] text-[var(--ink-soft)]">
                ~ 1 email / fortnight · unsub anytime
              </div>
            </div>

            {/* Social icons */}
            <div className="mt-1 flex flex-wrap gap-1.5">
              {SOCIALS.map((s) => (
                <span
                  key={s.label}
                  title={s.label}
                  className="
                    inline-flex h-8 w-8 cursor-pointer items-center
                    justify-center rounded-lg border border-[var(--border)]
                    bg-[var(--xn-surface)] font-serif text-[14px]
                    font-semibold transition-colors hover:border-[var(--border-strong)]
                  "
                >
                  {s.glyph}
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
            CONTACT STRIP — bordered top/bottom
            ════════════════════════════════════════════════════ */}
        <div
          className="
            mt-14 grid gap-8 border-t border-b border-[var(--border)]
            py-6
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-4
          "
        >
          {CONTACTS.map((c) => (
            <div key={c.label} className="flex flex-col gap-1">
              <div className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--xn-accent)]">
                {c.label}
              </div>
              <span className="text-[14px] font-medium">{c.email}</span>
              <span className="font-mono text-[11px] text-[var(--ink-soft)]">{c.note}</span>
            </div>
          ))}
          {/* Office */}
          <div className="flex flex-col gap-1">
            <div className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--xn-accent)]">
              Office
            </div>
            <span className="text-[13.5px] leading-[1.45]">
              5/F · 12th Main · Koramangala
              <br />
              Bangalore 560095 · India
            </span>
            <span className="font-mono text-[11px] text-[var(--ink-soft)]">
              Mitte · Berlin (remote)
            </span>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            BOTTOM ROW — copyright + legal links
            ════════════════════════════════════════════════════ */}
        <div className="mt-7 flex flex-wrap items-start gap-6">
          {/* Copyright */}
          <div className="flex-1 basis-[320px]">
            <div className="text-[12px] text-[var(--ink-muted)]">
              © 2026 XtractNote. All rights reserved.
              <span className="font-mono"> · </span>
              Made with ☕ + 🎧
            </div>
            <div className="mt-1 font-mono text-[11px] text-[var(--ink-soft)]">
              GST · 29ABCDE1234F1Z5 · CIN · U72900KA2024PTC123456
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
        <div className="mt-4.5 flex flex-wrap items-center gap-2">
          {COMPLIANCE.map((badge) => (
            <Chip key={badge} variant="outline">
              {badge}
            </Chip>
          ))}

          <span className="flex-1" />

          {/* Language + currency */}
          <Chip variant="outline">🌐 English ▾</Chip>
          <Chip variant="outline">$ USD ▾</Chip>

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