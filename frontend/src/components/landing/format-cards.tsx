import { Card } from "@/components/ui/card";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import type { ContentType } from "@/lib/constants/theme";

// ────────────────────────────────────────────────────────────
// FormatCards
//
// A 5-column grid showcasing the content types XtractNote
// can generate. Each card shows:
//   1. Tinted icon (via ContentTypeIcon withBackground)
//   2. Content type title
//   3. Short feature description
//   4. Image placeholder simulating sample output
//
// Responsive: 5 cols on xl, 3 on md, 2 on sm, 1 on mobile.
//
// Design reference: hifi-pages-a.jsx lines 78–96
// ────────────────────────────────────────────────────────────

// ── Card data — the five content types shown on the landing page ──

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
          grid-cols-1
          sm:grid-cols-2
          md:grid-cols-3
          xl:grid-cols-5
        "
      >
        {FORMAT_CARDS.map((card) => (
          <Card
            key={card.type}
            padding="none"
            interactive
            className="group"
          >
            <div className="p-5">
              {/* Icon in tinted rounded square */}
              <ContentTypeIcon
                type={card.type}
                size="lg"
                withBackground
              />

              {/* Title */}
              <h3 className="mt-3.5 text-[15px] font-semibold">
                {card.title}
              </h3>

              {/* Description — short feature list */}
              <p className="mt-1 text-[13px] text-[var(--ink-muted)]">
                {card.description}
              </p>

              {/* Image placeholder — simulates sample output.
                  In a real product this could be a screenshot
                  or a mini preview of generated content. */}
              <div
                className="
                  mt-3 flex h-[80px] items-center justify-center
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