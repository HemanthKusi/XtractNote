// ─────────────────────────────────────────────────────────────
// Layout Components — Barrel Export
// ─────────────────────────────────────────────────────────────
// Structural components that define page layout and navigation.
//
// Usage:
//   import { AppShell, Sidebar, Topbar, Logo } from "@/components/layout";
//
// These are separate from UI components (Button, Card, etc.) because
// they serve a different purpose: layout defines WHERE things go,
// UI defines HOW things look.
//
// Session 3: Logo
// Session 4: Sidebar, Topbar, AppShell
// ─────────────────────────────────────────────────────────────

// Session 3
export { Logo } from "./logo";

// Session 4
export { Sidebar, type PageId } from "./sidebar";
export { Topbar } from "./topbar";
export { AppShell } from "./app-shell";