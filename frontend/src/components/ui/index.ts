// ─────────────────────────────────────────────────────────────
// UI Components — Barrel Export
// ─────────────────────────────────────────────────────────────
// Re-exports all base UI components from one path.
//
// Usage:
//   import { Button, Card, Chip, Skeleton, EmptyState }
//     from "@/components/ui";
//
// Components NOT in this barrel (imported from their own paths):
//   import { useTheme } from "@/components/shared/theme-provider";
//   import { useToast } from "@/components/shared/toast-provider";
//   import { AppShell, Sidebar, Topbar, Logo } from "@/components/layout";
//
// Session 1: Button, Input, Card
// Session 2: Chip, Avatar, Toggle, ProgressBar
// Session 3: Modal
// Session 5: VideoThumbnail, ContentTypeIcon, EmptyState, Skeleton
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

// Session 5
export { VideoThumbnail } from "./video-thumbnail";
export { ContentTypeIcon, type ContentTypeIconSize } from "./content-type-icon";
export { EmptyState, type EmptyStateSize } from "./empty-state";
export { Skeleton, SkeletonText, SkeletonCard } from "./loading-skeleton";