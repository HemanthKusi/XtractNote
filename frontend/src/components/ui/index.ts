// ─────────────────────────────────────────────────────────────
// UI Components — Barrel Export
// ─────────────────────────────────────────────────────────────
// Re-exports all base UI components from one path.
//
// Usage:
//   import { Button, Input, Card } from "@/components/ui";
//
// We also export the TypeScript types so other files can
// reference them. For example, a parent component might need:
//   import { type ButtonVariant } from "@/components/ui";
//   const variant: ButtonVariant = "primary";
//
// As we add more components in Sessions 2–5, each new component
// gets a line added here.
// ─────────────────────────────────────────────────────────────

export { Button, type ButtonVariant, type ButtonSize } from "./button";
export { Input, type InputSize } from "./input";
export { Card, type CardVariant, type CardPadding, type CardElevation } from "./card";