"use client";

import { useEffect, useState } from "react";

/**
 * Whether the visitor has asked for reduced motion.
 *
 * CSS handles most of this on its own — globals.css neutralises
 * animations and transitions wholesale under the same query. This hook
 * exists for the cases CSS cannot reach: animation driven in
 * JavaScript, where the honest answer is to skip the effect and jump
 * straight to its end state rather than play it faster.
 *
 * Starts false so the server and the first client render agree; the
 * real value arrives immediately after mount. That matters because
 * guessing true would flash the reduced variant for users who never
 * asked for it.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
