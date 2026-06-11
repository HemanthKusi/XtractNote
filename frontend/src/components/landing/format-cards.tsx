import { Card } from "@/components/ui/card";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import type { ContentType } from "@/lib/constants/theme";

// ────────────────────────────────────────────────────────────
// FormatCards
//
// A 6-column grid showcasing the content types XtractNote
// can generate. Each card shows:
//   1. Icon + title on the same row
//   2. Short feature description (fixed min-height for alignment)
//   3. Smaller image placeholder at the bottom
//
// Responsive: 6 cols on xl, 3 on md, 2 on sm, 1 on mobile.
//
// Design reference: hifi-pages-a.jsx lines 78–96
// (extended from 5 to 6 cards to include Research)
// ────────────────────────────────────────────────────────────

// ── Card data — the six content types shown on the landing page ──

const FORMAT_CARDS: {
  type: ContentType;
  title: string;
  description: string;
  sampleLabel: string;
}[] = [
  {
    type: "blog",
    title: "Blog post",
    description: "SEO-friendly · headings · meta",
    sampleLabel: "Karpathy · LLM intro",
  },
  {
    type: "notes",
    title: "Study notes",
    description: "Bullets · screenshots · highlights",
    sampleLabel: "Sleep & memory",
  },
  {
    type: "summary",
    title: "Summary",
    description: "TL;DR · detailed · timestamps",
    sampleLabel: "Vision Pro review",
  },
  {
    type: "research",
    title: "Research",
    description: "Abstract · citations · findings",
    sampleLabel: "LLM scaling laws",
  },
  {
    type: "flashcards",
    title: "Flashcards",
    description: "Q&A · spaced repetition",
    sampleLabel: "12 cards",
  },
  {
    type: "social",
    title: "Social pack",
    description: "X · LinkedIn · IG · newsletter",
    sampleLabel: "5 formats",
  },
];

// ── Component ───────────────────────────────────────────────

export function FormatCards() {
  return (
    <section className="px-6 pb-20 pt-6 md:px-12">
      <div
        className="
          mx-auto grid max-w-[1200px] gap-4
          grid-cols-2
          md:grid-cols-3
          xl:grid-cols-6
        "
      >
        {FORMAT_CARDS.map((card) => (
          <Card
            key={card.type}
            padding="none"
            interactive
            className="group"
          >
            <div className="p-3 md:p-5">

              {/* Icon + Title — same row */}
              <div className="flex items-center gap-2.5">
                <ContentTypeIcon
                  type={card.type}
                  size="lg"
                  withBackground
                />
                <h3 className="text-[15px] font-semibold">
                  {card.title}
                </h3>
              </div>

              {/* Description — min-h ensures all descriptions
                  take the same vertical space (2 lines worth)
                  so the rectangles below align across cards */}
              <p className="mt-3 min-h-[38px] text-[13px] leading-[1.5] text-[var(--ink-muted)]">
                {card.description}
              </p>

              {/* Image placeholder — reduced in both height and
                  width (mx-2 adds side margins). Sits directly
                  below the fixed-height description so all
                  placeholders align across cards. */}
              <div
                className="
                  mx-2 mt-3 flex h-[35px] md:h-[50px] items-center justify-center px-3
                  rounded-[var(--radius-sm)]
                  bg-[var(--bg-deep)]
                  border border-[var(--border)]
                "
              >
                <span className="font-mono text-[11px] text-[var(--ink-soft)]">
                  {card.sampleLabel}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}