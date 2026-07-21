"use client";

import type { KeyboardEvent } from "react";

import { Card } from "@/components/ui/card";
import { contentTypeColors } from "@/lib/constants/theme";
import {
  SOCIAL_PLATFORMS,
  type SocialPlatform,
} from "@/lib/content/types";

// ─────────────────────────────────────────────────────────────
// SocialPlatformPicker
//
// The second step of the social flow. Social is one content type with five
// prompt variants, so once "Social" is picked in the ContentTypePicker the
// user chooses which platform to write for. That choice travels with the
// generate request and is stored in the saved row's metadata.
//
// Controlled and stateless, like ContentTypePicker: the parent owns
// `selected` and receives changes via `onSelect`.
//
// Rendered as a compact vertical LIST rather than a card grid. The format
// choice above is the primary decision (a seven-card grid); a second grid
// here would compete with it for weight. A list reads as "now narrow that
// down", which is what this step is.
//
// Returns null when `visible` is false, so the parent can render it
// unconditionally instead of wrapping it in a conditional block — the
// show/hide rule lives with the component that owns it.
//
// The platform list and its copy come from SOCIAL_PLATFORMS
// (lib/content/types.ts); this component holds no content of its own.
// ─────────────────────────────────────────────────────────────

interface SocialPlatformPickerProps {
  /** Whether the step applies — i.e. whether "social" is the chosen type. */
  visible: boolean;
  /** The currently chosen platform, or null if none is picked yet. */
  selected: SocialPlatform | null;
  /** Called with the chosen platform when a row is activated. */
  onSelect: (platform: SocialPlatform) => void;
  /** Disable all interaction (e.g. while a generation is running). */
  disabled?: boolean;
  className?: string;
}

export function SocialPlatformPicker({
  visible,
  selected,
  onSelect,
  disabled = false,
  className = "",
}: SocialPlatformPickerProps) {
  // Nothing to choose unless social is the active content type.
  if (!visible) return null;

  // Social's identity color, reused from the content-type registry so the
  // selected row is tinted the same as the Social card upstairs.
  const accent = contentTypeColors.social.color;

  return (
    <div className={className}>
      <p className="mb-2 text-[13px] font-medium text-xn-ink">
        Which platform?
      </p>

      <div className="flex flex-col gap-2">
        {SOCIAL_PLATFORMS.map((platform) => {
          const isSelected = selected === platform.id;

          const activate = () => {
            if (!disabled) onSelect(platform.id);
          };

          const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              activate();
            }
          };

          return (
            <Card
              key={platform.id}
              padding="none"
              interactive={!disabled}
              // Outline rather than border/shadow: it doesn't shift layout,
              // doesn't fight Card's own shadow, and sits just outside the
              // rounded corners. Same treatment as ContentTypePicker.
              style={
                isSelected
                  ? { outline: `2px solid ${accent}`, outlineOffset: "2px" }
                  : undefined
              }
              onClick={disabled ? undefined : activate}
              onKeyDown={disabled ? undefined : handleKeyDown}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-pressed={isSelected}
              aria-disabled={disabled}
              className={disabled ? "opacity-60 cursor-not-allowed" : ""}
            >
              <div className="flex items-center gap-3 px-3.5 py-2.5">
                {/*
                  A small dot standing in for a radio indicator. Filled with
                  social's identity color when chosen, a plain ring when not.
                  Cheaper than an icon per platform, and it reads as
                  "one of these" at a glance.
                */}
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full border"
                  style={
                    isSelected
                      ? { backgroundColor: accent, borderColor: accent }
                      : { borderColor: "var(--xn-border-strong)" }
                  }
                />

                <div className="min-w-0">
                  <p className="text-[14px] font-medium leading-tight text-xn-ink">
                    {platform.label}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-[1.45] text-xn-ink-muted">
                    {platform.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}