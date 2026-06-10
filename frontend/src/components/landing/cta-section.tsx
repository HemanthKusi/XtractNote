import { Button } from "@/components/ui/button";

// ────────────────────────────────────────────────────────────
// CTASection
//
// The tail call-to-action at the bottom of the landing page.
// Centered layout with:
//   1. Eyebrow label
//   2. Large heading with accent underline on "making"
//   3. Two buttons (primary + default)
//   4. No-credit-card note in mono
//
// This is the final conversion point — a visitor who scrolls
// here has seen everything and needs a clear invitation.
//
// Design reference: hifi-pages-a.jsx lines 231–242
// ────────────────────────────────────────────────────────────
export function CTASection() {
  return (
    <section className="border-t border-[var(--border)] px-6 py-20 text-center md:px-12 md:py-[88px]">
      <div className="mx-auto max-w-[700px]">

        {/* Eyebrow */}
        <div className="font-mono text-[13px] font-medium uppercase tracking-[0.08em] text-[var(--xn-accent)]">
          Ready when you are
        </div>

        {/* Heading — "making" gets the accent underline */}
        <h2 className="mx-auto mt-4 max-w-[680px] font-serif text-4xl tracking-tight sm:text-5xl md:text-[48px]">
            <span className="block">Stop <span className="underline-accent">&ldquo;I&rsquo;ll watch this later.&rdquo;</span></span>
            <span className="mt-3 block">
                Start{" "}
                <span className="mark-yellow">making things</span>.
            </span>
        </h2>

        {/* Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" size="lg">
            Try free — 10 generations
          </Button>
          <Button variant="default" size="lg">
            See pricing
          </Button>
        </div>

        {/* No-credit-card note */}
        <div className="mt-4 font-mono text-[12px] text-[var(--ink-muted)]">
          No credit card · cancel anytime
        </div>

      </div>
    </section>
  );
}