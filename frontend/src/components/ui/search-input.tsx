"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────
// SearchInput
// ─────────────────────────────────────────────────────────────
// The topbar and history search. A collapsed pill that expands when
// you reach for it.
//
// ── The effect, and why it works ──
// It is not a merge. At rest there is one pill. On open, the pill
// widens and slides right while a round bubble stays behind on the
// left — and because both shapes sit inside a gooey SVG filter, they
// stretch apart like liquid before they separate. The separation is
// the effect; a blur plus a high-contrast alpha matrix is what makes
// two ordinary elements behave like one substance.
//
// The filter is applied to the two shapes only, never to the text.
// Running text through a Gaussian blur rasterises it, and it looks
// filthy at small sizes.
//
// ── Three things that are deliberate ──
//
// No halo. Every other control rings on focus, but this one already
// announces itself by changing shape, and a ring around a shape that
// is mid-stretch reads as a mistake.
//
// The input is type="text", not type="search". A search input carries
// native browser appearance: an inner field box and a reserved slot
// for a clear button, which drew furniture we did not ask for and
// stole the width that clipped the last letter of the label.
//
// The collapsed label is a real element rather than the input's
// placeholder. A placeholder is clipped by the input's own box, so a
// label that fits at one font size loses a character at another.
//
// The whole thing runs on CSS transitions. A spring-shaped curve does
// what a physics library was doing, on two properties, without one.
//
// Used in exactly two places. A signature that appears everywhere
// stops being a signature.
// ─────────────────────────────────────────────────────────────

interface SearchInputProps {
  /** Placeholder shown once the field is open */
  placeholder?: string;
  /** Label shown on the collapsed pill */
  label?: string;
  /** Fires on every keystroke */
  onValueChange?: (value: string) => void;
  /** Fires when the field is submitted */
  onSubmit?: (value: string) => void;
  /** Width of the collapsed pill, in pixels. Kept tight: a shorter
   *  travel makes the spring's overshoot read as a snap rather than a
   *  lurch. */
  collapsedWidth?: number;
  /** Width of the expanded field, in pixels */
  expandedWidth?: number;
  /** How far the field slides right as it opens, in pixels */
  offset?: number;
  disabled?: boolean;
}

const SURFACE = "bg-xn-ink text-xn-bg";

function MagnifierIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="w-4 h-4 shrink-0"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="m20 20-4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SearchInput({
  placeholder = "Search",
  label = "Search",
  onValueChange,
  onSubmit,
  collapsedWidth = 120,
  expandedWidth = 236,
  offset = 58,
  disabled = false,
}: SearchInputProps) {
  // useId is stable across server and client; its colons are not valid
  // inside a CSS url() reference, so they go.
  const filterId = `xn-goo-${useId().replace(/:/g, "")}`;

  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const expand = useCallback(() => {
    if (!disabled) setOpen(true);
  }, [disabled]);

  const collapse = useCallback(() => {
    if (!value) setOpen(false);
  }, [value]);

  // Focus follows the expansion rather than racing it, so the caret
  // does not land before there is a field to hold it.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <div className="relative inline-flex items-center">
      {/* Renders nothing; supplies the filter. */}
      <svg aria-hidden="true" className="absolute w-0 h-0">
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div
        className="relative flex items-center h-11"
        style={{ filter: `url(#${filterId})` }}
      >
        {/* The bubble left behind as the field departs. */}
        <div
          className={[
            "absolute left-0 top-1/2 -mt-[22px] grid h-11 w-11 place-items-center",
            "rounded-xn-pill transition-transform duration-[460ms] ease-xn-spring",
            "motion-reduce:transition-none",
            open ? "scale-100" : "scale-0",
            SURFACE,
          ].join(" ")}
        >
          <MagnifierIcon />
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit?.(value);
          }}
          style={{
            width: open ? expandedWidth : collapsedWidth,
            marginLeft: open ? offset : 0,
          }}
          className={[
            // shrink-0 matters: this is a flex item carrying an explicit
            // width, and without it the parent shrinks the pill back to
            // its collapsed size and the expansion silently does nothing.
            "flex h-11 shrink-0 items-center gap-3 overflow-hidden rounded-xn-pill px-[18px]",
            "transition-[width,margin-left] duration-[460ms] ease-xn-spring",
            "motion-reduce:transition-none",
            SURFACE,
          ].join(" ")}
        >
          {open ? (
            <input
              ref={inputRef}
              type="text"
              enterKeyHint="search"
              autoComplete="off"
              disabled={disabled}
              value={value}
              placeholder={placeholder}
              aria-label={label}
              onChange={(event) => {
                setValue(event.target.value);
                onValueChange?.(event.target.value);
              }}
              onBlur={collapse}
              className={[
                "min-w-0 flex-1 appearance-none bg-transparent text-ui",
                "border-none outline-none",
                // The shape is NOT a sufficient focus indicator once there is
                // a value, because collapse() keeps the field open when it has
                // one — so an expanded field can be unfocused, and tabbing back
                // into it changed nothing visible.
                //
                // The ring goes on the input rather than the pill, which keeps
                // the note above honest: nothing rings the shape while it is
                // mid-stretch. Page colour, because this sits on ink.
                "focus-visible:outline focus-visible:outline-2",
                "focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xn-bg)]",
                "text-xn-bg placeholder:text-xn-bg/70",
              ].join(" ")}
            />
          ) : (
            // Collapsed: a real button with a real label, so nothing is
            // clipped and the whole pill is one hit target.
            <button
              type="button"
              disabled={disabled}
              onClick={expand}
              onFocus={expand}
              className="flex min-w-0 flex-1 items-center gap-3 bg-transparent text-ui text-xn-bg outline-none focus-visible:outline-none"
            >
              <MagnifierIcon />
              <span className="truncate">{label}</span>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
