// ─────────────────────────────────────────────────────────────
// Layout Components — Barrel Export
// ─────────────────────────────────────────────────────────────
// Structural components that define page layout and navigation.
//
// Usage:
//   import { AppShell, AppMenu, Topbar, Logo } from "@/components/layout";
//
// These are separate from UI components (Button, Card, etc.) because
// they serve a different purpose: layout defines WHERE things go,
// UI defines HOW things look.
//
// The fixed sidebar that used to live here was replaced by the floating
// menu, which is a directory of its own because it is three files and a
// pure geometry module rather than one component.
// ─────────────────────────────────────────────────────────────

export { Logo } from "./logo";
export { Topbar } from "./topbar";
export { AppShell } from "./app-shell";
export { AppMenu, MenuShell, type MenuMode, type PageId } from "./menu";
