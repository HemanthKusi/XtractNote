// ─────────────────────────────────────────────────────────────
// UI Components — Barrel Export
// ─────────────────────────────────────────────────────────────
// Re-exports all base UI components from one path.
//
// Usage:
//   import { Button, Input, Card, Chip, Avatar, Toggle, ProgressBar, Modal }
//     from "@/components/ui";
//
// Components NOT in this barrel (imported from their own paths):
//   import { useToast } from "@/components/shared/toast-provider";
//   import { Logo } from "@/components/layout/logo";
//
// Session 1: Button, Input, Card
// Session 2: Chip, Avatar, Toggle, ProgressBar
// Session 3: Modal
// ─────────────────────────────────────────────────────────────

// Session 1
export { Button, type ButtonVariant, type ButtonSize } from "./button";
export { Input, type InputSize } from "./input";
export { Card, type CardVariant, type CardPadding, type CardElevation } from "./card";

// Session 2
export { Chip, type ChipVariant } from "./chip";
export { Avatar, type AvatarSize } from "./avatar";
export { Toggle } from "./toggle";
export { ProgressBar, type ProgressBarSize } from "./progress-bar";

// Session 3
export { Modal, type ModalSize } from "./modal";