"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "./use-reduced-motion";

/** Lets what arrives with it land first — the menu's rows, for the credits foot. */
const FILL_DELAY_MS = 220;
const FILL_MS = 900;
/** Past the menu's morph (560ms), by which time a hidden form has faded out. */
const EMPTY_AFTER_MS = 600;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * A number that FILLS to `target` — for a gauge and the count beside it.
 *
 * When `shown` turns true the value runs from zero to `target`, after a short
 * delay; when only `target` changes it runs from the value on screen to the
 * new one, at once. When `shown` turns false the value is left alone while
 * the form fades out, then emptied, so the next showing starts from zero
 * without first flashing the old value. One animation-frame loop drives the
 * value, so a gauge and a count drawn from it always agree.
 *
 * Reduced motion returns `target` straight away. Frames do not run in a
 * hidden tab, so a fill started there plays when the tab is next visible.
 */
export function useFill(target: number, shown: boolean): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  const drawn = useRef(0);

  useEffect(() => {
    if (reduced) {
      drawn.current = target;
      setValue(target);
      return;
    }
    if (!shown) {
      drawn.current = 0;
      const empty = setTimeout(() => setValue(0), EMPTY_AFTER_MS);
      return () => clearTimeout(empty);
    }
    const from = drawn.current;
    const delay = from === 0 ? FILL_DELAY_MS : 0;
    let frame = 0;
    let start: number | null = null;
    const step = (now: number) => {
      start ??= now;
      const t = Math.min(1, Math.max(0, (now - start - delay) / FILL_MS));
      const next = from + (target - from) * easeOutCubic(t);
      drawn.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, shown, reduced]);

  return value;
}
