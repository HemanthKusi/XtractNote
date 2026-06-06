import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";

// ────────────────────────────────────────────────────────────
// PlayIcon — small SVG triangle used inside the hero input.
// Matches the HFI.play icon from hifi-core.jsx.
// ────────────────────────────────────────────────────────────
function PlayIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-[var(--ink-soft)] shrink-0"
    >
      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.04-6.86a1 1 0 0 0 0-1.72L9.5 4.28a1 1 0 0 0-1.5.86Z" />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────
// ArrowRightIcon — small arrow for the Generate button.
// ────────────────────────────────────────────────────────────
function ArrowRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────
// HeroSection
//
// The main hero area of the landing page. Five stacked layers:
//   1. Beta badge chip
//   2. Large headline (78px serif)
//   3. Description paragraph
//   4. Hero input card with Generate button
//   5. Trust strip (stacked avatars + waitlist count)
//
// Everything is centered. Max width 1080px.
// ────────────────────────────────────────────────────────────
export function HeroSection() {
  return (
    <section className="px-6 pb-16 pt-20 md:px-12 md:pt-[80px]">
      <div className="mx-auto max-w-[1080px] text-center">

        {/* ── 1. Beta badge ── */}
        <div className="mb-6 flex justify-center">
          <Chip dot dotColor="var(--accent)" variant="outline">
            Multi-agent · v0.4 beta
          </Chip>
        </div>

        {/* ── 2. Headline ── */}
        <h1
          className="
            mx-auto max-w-[900px]
            font-serif text-5xl leading-[1.08] tracking-tight
            sm:text-6xl
            md:text-[78px]
          "
        >
          Turn any YouTube video
          <br />
          into{" "}
          <span className="italic">something</span>{" "}
          <span className="mark-yellow">useful</span>.
        </h1>

        {/* ── 3. Description ── */}
        <p
          className="
            mx-auto mt-5 max-w-[560px]
            text-base leading-relaxed text-[var(--ink-muted)]
            md:text-lg
          "
        >
          Paste a link or search a topic. A small team of AI agents reads the
          video, then hands you back a blog post, study notes, a summary,
          flashcards, or social copy — yours to edit and keep.
        </p>

        {/* ── 4. Hero input card ──
            Card uses padding="none" because the default padding="md"
            wraps children in an inner <div className="p-4"> that
            blocks the flex layout. With padding="none", the inner
            wrapper has no classes, so our own flex div works. */}
        <Card
          elevate="sm"
          padding="none"
          className="mx-auto mt-8 max-w-[620px]"
        >
          <div className="flex items-center gap-1.5 p-1.5">
            {/* Play icon */}
            <span className="px-2 pl-3.5">
              <PlayIcon />
            </span>

            {/* Placeholder text — this becomes a real input in Phase 6 */}
            <span className="flex-1 py-3 px-1 text-base text-[var(--ink-soft)]">
              Paste a YouTube link or search a topic…
            </span>

            {/* Generate button */}
            <Button variant="primary" size="lg" className="gap-1">
              Generate
              <ArrowRightIcon />
            </Button>
          </div>
        </Card>

        {/* ── "Try:" suggestions ── */}
        <div className="mt-2.5 font-mono text-xs text-[var(--ink-soft)]">
          Try:{" "}
          <span className="underline decoration-[var(--border-strong)] underline-offset-2">
            &ldquo;andrej karpathy llm intro&rdquo;
          </span>
          {" · "}
          <span className="underline decoration-[var(--border-strong)] underline-offset-2">
            youtube.com/watch?v=…
          </span>
        </div>

        {/* ── 5. Trust strip ── */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
          {/* Stacked avatars with negative margin overlap */}
          <div className="flex">
            {["JT", "MK", "LR", "AS"].map((initials, i) => (
              <div
                key={initials}
                className="rounded-full border-2 border-[var(--bg)]"
                style={{ marginLeft: i > 0 ? -8 : 0 }}
              >
                <Avatar initials={initials} size="sm" />
              </div>
            ))}
          </div>

          <span className="text-sm text-[var(--ink-muted)]">
            2,400 creators · students · researchers on the waitlist
          </span>
        </div>

      </div>
    </section>
  );
}