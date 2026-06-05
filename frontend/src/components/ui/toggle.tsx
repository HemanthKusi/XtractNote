"use client";

// ─────────────────────────────────────────────────────────────
// Toggle
// ─────────────────────────────────────────────────────────────
// On/off switch matching the hi-fi's .hf-toggle component.
//
// Dimensions (from hi-fi):
//   Track: 32px wide × 18px tall, pill-shaped
//   Thumb: 14px circle, white, subtle shadow
//   Off:   border-color background, thumb at left (2px)
//   On:    accent-color background, thumb at right (16px)
//
// Supports both controlled and uncontrolled usage:
//
//   Controlled (parent manages state):
//     <Toggle checked={isOn} onChange={setIsOn} />
//
//   Uncontrolled (toggle manages its own state):
//     <Toggle defaultChecked={true} />
//
// Accessibility:
//   - role="switch" for screen readers
//   - aria-checked announces on/off state
//   - Space and Enter keys toggle the switch
//   - aria-label describes what the toggle controls
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, type KeyboardEvent } from "react";

// ── Props ───────────────────────────────────────────────────

interface ToggleProps {
  /** Controlled mode: current on/off state */
  checked?: boolean;
  /** Uncontrolled mode: initial on/off state */
  defaultChecked?: boolean;
  /** Called when the toggle is clicked. Receives the new state. */
  onChange?: (checked: boolean) => void;
  /** Prevent interaction */
  disabled?: boolean;
  /** Accessible label describing what this toggle controls */
  "aria-label"?: string;
  /** Additional CSS classes on the outer element */
  className?: string;
}

// ── Component ───────────────────────────────────────────────

export function Toggle({
  checked: controlledChecked,
  defaultChecked = false,
  onChange,
  disabled = false,
  "aria-label": ariaLabel,
  className = "",
}: ToggleProps) {
  // ── Internal state (for uncontrolled mode) ──
  // If the parent passes `checked`, we use that (controlled).
  // If not, we manage our own state (uncontrolled).
  const [internalChecked, setInternalChecked] = useState(defaultChecked);

  // Determine which mode we're in and get the current value
  const isControlled = controlledChecked !== undefined;
  const isOn = isControlled ? controlledChecked : internalChecked;

  // ── Toggle handler ──
  const handleToggle = useCallback(() => {
    if (disabled) return;

    const newValue = !isOn;

    // In uncontrolled mode, update internal state
    if (!isControlled) {
      setInternalChecked(newValue);
    }

    // Always call onChange if provided (works in both modes)
    onChange?.(newValue);
  }, [disabled, isOn, isControlled, onChange]);

  // ── Keyboard handler ──
  // Space and Enter should toggle the switch (standard for role="switch")
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault(); // Prevent page scroll on Space
        handleToggle();
      }
    },
    [handleToggle]
  );

  // ── Track classes (the outer pill) ──
  const trackClasses = [
    // Pixel values — not rem — because our root font is 14px,
    // which makes rem-based Tailwind classes smaller than expected.
    // Track: 36×20px, thumb: 16px, gap: 2px all around.
    "relative inline-flex",
    "w-[36px] h-[20px]",
    "rounded-xn-pill",
    // Reset browser button defaults
    "p-0 border-0",
    // Smooth color transition when toggling
    "transition-colors duration-150",
    // Cursor
    disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // ── Thumb classes (the sliding circle) ──
  const thumbClasses = [
    "absolute top-[2px]",
    // 16px circle — pixel value, not rem
    "w-[16px] h-[16px]",
    "rounded-full",
    "bg-white",
    // Centered shadow
    "shadow-[0_0.5px_2px_rgba(0,0,0,0.2)]",
    // Smooth slide transition
    "transition-[left] duration-150",
  ].join(" ");

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      className={trackClasses}
      style={{
        // Track background: accent when on, border-color when off
        backgroundColor: isOn ? "var(--xn-accent)" : "var(--xn-border)",
      }}
    >
      {/* The white thumb circle */}
      <span
        className={thumbClasses}
        style={{
            // Slide position: 2px (off) → 18px (on)
            // 18px = track width (36) - thumb size (16) - padding (2)
            left: isOn ? 18 : 2,
          }}
      />
    </button>
  );
}