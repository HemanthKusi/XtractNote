"use client";

import type { KeyboardEvent } from "react";

import { Card } from "@/components/ui/card";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { contentTypeColors, type ContentType } from "@/lib/constants/theme";
import {
  isGeneratable,
  type GeneratableContentType,
} from "@/lib/content/types";

// ─────────────────────────────────────────────────────────────
// ContentTypePicker
//
// The format-selection grid for the create flow. Shows all 7 content
// types: the generatable ones (summary, blog, notes) are live and
// selectable; the rest render as dimmed "Coming soon" cards.
//
// Controlled component — it owns no state. The parent passes the current
// `selected` value and an `onSelect` callback; the parent decides what a
// selection does (e.g. enable a Generate button). Disable all interaction
// via `disabled` while a generation is in flight.
//
// Availability is read from isGeneratable() (backed by GENERATABLE_TYPES),
// so a card flips live the moment its type is added there — no edit here.
// ─────────────────────────────────────────────────────────────

// Short, picker-specific descriptions (one line each). Display copy, kept
// next to the picker rather than in the shared token registry.
const DESCRIPTIONS: Record<ContentType, string> = {
  summary: "Key points, quick read",
  blog: "Polished article with headings",
  notes: "Structured study notes",
  research: "Abstract, findings, citations",
  flashcards: "Q&A cards for review",
  quiz: "Practice questions",
  social: "Posts for X, LinkedIn & more",
};

// Display order: generatable types first, then coming-soon. This is purely
// presentational — enabled-ness still comes from isGeneratable(), so the two
// can't disagree.
const DISPLAY_ORDER: ContentType[] = [
  "summary",
  "blog",
  "notes",
  "research",
  "flashcards",
  "quiz",
  "social",
];

interface ContentTypePickerProps {
  /** The currently selected type, or null if nothing is picked yet. */
  selected: GeneratableContentType | null;
  /** Called with the chosen type when a live card is activated. */
  onSelect: (type: GeneratableContentType) => void;
  /** Disable all interaction (e.g. while a generation is running). */
  disabled?: boolean;
  className?: string;
}

export function ContentTypePicker({
  selected,
  onSelect,
  disabled = false,
  className = "",
}: ContentTypePickerProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
    >
      {DISPLAY_ORDER.map((type) => {
        const meta = contentTypeColors[type];

        // A card is live only if its type is generatable AND the picker isn't
        // globally disabled. isGeneratable() also narrows `type` to the
        // generatable subset inside the handlers below.
        const live = !disabled && isGeneratable(type);
        const isSelected = selected === type;

        // Activating a live card. The isGeneratable guard both gates the call
        // and narrows the type so onSelect receives a GeneratableContentType.
        const activate = () => {
          if (!disabled && isGeneratable(type)) {
            onSelect(type);
          }
        };

        const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activate();
          }
        };

        return (
          <Card
            key={type}
            padding="none"
            interactive={live}
            // Selected cards get an outline in the type's own identity color.
            // outline (not border/shadow) so it doesn't shift layout or fight
            // Card's own shadow, and sits just outside the rounded corners.
            style={
              isSelected
                ? { outline: `2px solid ${meta.color}`, outlineOffset: "2px" }
                : undefined
            }
            // Interaction + a11y wiring, only meaningful for live cards.
            onClick={live ? activate : undefined}
            onKeyDown={live ? handleKeyDown : undefined}
            role="button"
            tabIndex={live ? 0 : -1}
            aria-pressed={isSelected}
            aria-disabled={!isGeneratable(type) || disabled}
            className={
              isGeneratable(type)
                ? ""
                : // Coming-soon: dim and show the not-allowed cursor.
                  "opacity-60 cursor-not-allowed"
            }
          >
            <div className="p-4">
              {/* Icon + label + (coming-soon badge) on one row */}
              <div className="flex items-center gap-2.5">
                <ContentTypeIcon type={type} size="lg" withBackground />
                <h3 className="text-[15px] font-semibold text-xn-ink">
                  {meta.label}
                </h3>

                {!isGeneratable(type) && (
                  <span className="ml-auto rounded-full border border-xn-border bg-xn-bg-deep px-2 py-0.5 text-[11px] font-medium text-xn-ink-soft">
                    Coming soon
                  </span>
                )}
              </div>

              {/* One-line description */}
              <p className="mt-2 text-[13px] leading-[1.5] text-xn-ink-muted">
                {DESCRIPTIONS[type]}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}