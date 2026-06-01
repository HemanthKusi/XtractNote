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
    // Dimensions matching hi-fi: 32×18px, pill shape
    "relative inline-flex",
    "w-8 h-[18px]",
    "rounded-xn-pill",
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
    // 14px circle matching hi-fi
    "w-3.5 h-3.5",
    "rounded-full",
    "bg-white",
    // Subtle shadow on the thumb (from hi-fi's box-shadow)
    "shadow-[0_1px_2px_rgba(0,0,0,0.2)]",
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
          // Slide position: 2px (off) → 16px (on)
          // 16px = track width (32) - thumb size (14) - padding (2)
          left: isOn ? 16 : 2,
        }}
      />
    </button>
  );
}