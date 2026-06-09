import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Logo } from "@/components/layout/logo";

// ────────────────────────────────────────────────────────────
// ArrowRightIcon — small arrow for the CTA button.
// ────────────────────────────────────────────────────────────
function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

// ── Extension popup action items ────────────────────────────

const POPUP_ACTIONS = [
  { label: "Create blog post", highlighted: true },
  { label: "Take notes", highlighted: false },
  { label: "Summarize", highlighted: false },
  { label: "Save to folder", highlighted: false },
];

// ────────────────────────────────────────────────────────────
// ExtensionSection
//
// Two-column layout on bg-deep background:
//   Left  → Chip, heading, description, two buttons
//   Right → YouTube player placeholder with floating extension popup
//
// Design reference: hifi-pages-a.jsx lines 183–229
// ────────────────────────────────────────────────────────────
export function ExtensionSection() {
  return (
    <section
      id="extension"
      className="border-t border-[var(--border)] bg-[var(--xn-bg-deep)] px-6 py-16 md:px-12 md:py-[64px]"
    >
      <div
        className="
          mx-auto grid max-w-[1100px] items-center gap-10
          grid-cols-1
          lg:grid-cols-[1.1fr_1fr] lg:gap-12
        "
      >
        {/* ── Left column: text + buttons ── */}
        <div>
          {/* Chrome extension chip */}
          <Chip variant="outline">Chrome extension</Chip>

          {/* Heading */}
          <h2 className="mt-3 font-serif text-4xl leading-[1.15] tracking-tight md:text-[42px]">
            One click on YouTube. Done.
          </h2>

          {/* Description */}
          <p className="mt-3 max-w-[420px] text-[15px] leading-relaxed text-[var(--ink-muted)]">
            Drop the extension in. While you're watching, hit the
            button — blog, notes, summarize, or save for later.
            Picks up your default folder.
          </p>

          {/* Two buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Button variant="primary" className="gap-1.5">
              Get the extension
              <ArrowRightIcon />
            </Button>
            <Button variant="default">
              Watch demo (24s)
            </Button>
          </div>
        </div>

        {/* ── Right column: YouTube player + floating popup ── */}
        <Card elevate="lg" padding="none" className="relative overflow-hidden">
          <div className="p-4">
            {/* YouTube player placeholder */}
            <div
              className="
                flex h-[200px] items-center justify-center
                rounded-[var(--radius-sm)]
                bg-[var(--surface-alt)]
                border border-[var(--border)]
              "
            >
              <span className="font-mono text-[12px] text-[var(--ink-soft)]">
                youtube video player
              </span>
            </div>
          </div>

          {/* Floating extension popup — absolute positioned
              to overlay the top-right corner of the player */}
          <div
            className="absolute right-5 top-5 w-[240px] overflow-hidden rounded-[var(--radius-md)] bg-[var(--xn-surface)] border border-[var(--border)]"
            style={{ boxShadow: "0 8px 32px rgba(28, 24, 19, 0.18)" }}
          >
            {/* Popup header — logo + close button */}
            <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-2.5">
              <Logo size={18} />
              <span className="flex-1" />
              <span className="text-[14px] text-[var(--ink-soft)] cursor-pointer">×</span>
            </div>

            {/* Popup content */}
            <div className="p-3">
              {/* Video info */}
              <div className="text-[12px] font-medium leading-[1.3]">
                How sleep consolidates memory
              </div>
              <div className="mt-0.5 font-mono text-[10.5px] text-[var(--ink-soft)]">
                1:24:08 · captions ✓
              </div>

              {/* Quick action list */}
              <div className="mt-2.5 flex flex-col gap-1">
                {POPUP_ACTIONS.map((action) => (
                  <div
                    key={action.label}
                    className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-[12px]"
                    style={{
                      background: action.highlighted
                        ? "var(--xn-accent-soft)"
                        : "transparent",
                      color: action.highlighted
                        ? "var(--xn-accent)"
                        : "var(--xn-ink)",
                    }}
                  >
                    {action.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}