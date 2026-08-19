import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// ────────────────────────────────────────────────────────────
// CheckIcon — small SVG checkmark for the feature list.
// ────────────────────────────────────────────────────────────
function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

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

// ────────────────────────────────────────────────────────────
// MoreIcon — three-dot icon for the editor title bar.
// ────────────────────────────────────────────────────────────
function MoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

// ── Feature checklist items ─────────────────────────────────

const FEATURES = [
  "Built-in SEO inspector for blog posts",
  "Screenshots from the video, dropped where they matter",
  "One-click flashcard export to Anki",
  "Version history — undo a regeneration in two clicks",
];

// ────────────────────────────────────────────────────────────
// OutputPreview
//
// Two-column layout:
//   Left  → Eyebrow, heading, description, checklist, CTA
//   Right → Fake editor mockup showing a sample blog post
//
// Design reference: hifi-pages-a.jsx lines 130–181
// ────────────────────────────────────────────────────────────
export function OutputPreview() {
  return (
    <section className="px-6 py-16 md:px-12 md:py-[80px]">
      <div
        className="
          mx-auto grid max-w-[1200px] items-center gap-10
          grid-cols-1
          lg:grid-cols-[1fr_1.2fr] lg:gap-12
        "
      >
        {/* ── Left column: text + checklist ── */}
        <div>
          {/* Eyebrow */}
          <div className="font-mono text-[13px] font-medium uppercase tracking-[0.08em] text-[var(--xn-accent)]">
            What you get
          </div>

          {/* Heading */}
          <h2 className="mt-3 max-w-[480px] font-serif text-4xl leading-[1.15] tracking-tight md:text-[42px]">
            Editable. Yours.{" "}
            <span className="italic">Not</span> a wall of text.
          </h2>

          {/* Description */}
          <p className="mt-3 max-w-[460px] text-[15px] leading-relaxed text-[var(--ink-muted)]">
            Every output lands in a real editor — block-based for blogs
            and notes, card-grid for flashcards, side-by-side for social.
            Save to folders, export to Markdown or PDF, hand off to Anki,
            or just copy.
          </p>

          {/* Feature checklist */}
          <ul className="mt-5 flex flex-col gap-2.5">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-[14px]">
                {/* Accent circle with check icon */}
                <span
                  className="
                    inline-flex h-[18px] w-[18px] shrink-0 items-center
                    justify-center rounded-full
                    bg-[var(--xn-accent-soft)] text-[var(--xn-accent)]
                  "
                >
                  <CheckIcon />
                </span>
                {feature}
              </li>
            ))}
          </ul>

          {/* CTA button */}
          <div className="mt-6">
            <Button variant="primary" size="lg" className="gap-1.5">
              Open a sample output
              <ArrowRightIcon />
            </Button>
          </div>
        </div>

        {/* ── Right column: fake editor mockup ── */}
        <Card elevate="lg" padding="none" className="overflow-hidden">

          {/* Editor title bar — macOS-style dots + filename */}
          <div className="flex items-center gap-2.5 border-b border-[var(--border)] bg-[var(--surface-alt)] px-3.5 py-2.5">
            {/* Traffic light dots */}
            <span className="flex gap-1.5">
              {["#e07b6c", "#e9c46a", "#7fa67f"].map((color) => (
                <span
                  key={color}
                  className="block h-2.5 w-2.5 rounded-full"
                  style={{ background: color }}
                />
              ))}
            </span>
            {/* Filename */}
            <span className="font-mono text-[11px] text-[var(--ink-soft)]">
              example.output · blog post · karpathy-llm-intro
            </span>
            <span className="flex-1" />
            {/* More icon */}
            <span className="text-[var(--ink-soft)]">
              <MoreIcon />
            </span>
          </div>

          {/* Editor content area — sample blog post */}
          <div className="px-6 py-5 md:px-8 md:py-6">
            {/* From YouTube chip */}
            <span
                className="inline-flex rounded-[var(--xn-radius-pill)] px-2.5 py-0.5 text-[11px] font-medium"
                style={{
                    backgroundColor: "var(--xn-accent-soft)",
                    color: "var(--xn-accent)",
                }}
                >
                From YouTube
            </span>

            {/* Blog title */}
            <h3 className="mt-2 font-serif text-[26px] leading-[1.15] tracking-tight md:text-[30px]">
              What Karpathy gets right about LLMs
            </h3>

            {/* Meta line */}
            <div className="mt-1.5 font-mono text-[13px] text-[var(--ink-soft)]">
              by Maya K · 8 min read
            </div>

            {/* Intro paragraph with highlight */}
            <p className="mt-3.5 text-[14.5px] leading-[1.7]">
              In a recent 2-hour talk, Andrej Karpathy argues that the
              bitter lesson of AI research applies{" "}
              <span className="mark-yellow">once again</span> — and that
              the most useful framing for understanding LLMs is to treat
              them as compressed knowledge of the internet.
            </p>

            {/* Section stubs — dashed separator + numbered headings */}
            <div className="mt-4 border-t border-dashed border-[var(--border)] pt-3.5">
              <div className="text-[15px] font-semibold">
                1 · The bitter lesson, revisited
              </div>
              <div className="mt-1 text-[13.5px] leading-[1.6] text-[var(--ink-muted)]">
                Compute and data eat hand-engineered priors. The pattern
                repeats every five years…
              </div>

              <div className="mt-3.5 text-[15px] font-semibold">
                2 · <span className="mark-yellow">Scale is a feature</span>
              </div>
              <div className="mt-1 text-[13.5px] leading-[1.6] text-[var(--ink-muted)]">
                Treating capability as an emergent function of scale, not
                architecture.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}