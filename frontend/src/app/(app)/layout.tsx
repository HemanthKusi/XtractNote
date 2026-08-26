// src/app/(app)/layout.tsx
// One shell for every signed-in route.
//
// Before this file, each page in the group wrapped itself in <AppShell>,
// which had three consequences: /create forgot to and rendered with no
// sidebar at all, the nav could not navigate because the active row came
// from a per-page prop, and /output/[id] highlighted Home because it
// passed no prop and the default was "home".
//
// A layout fixes all three at once. It stays a Server Component — the
// shell's own client pieces (the sidebar reading the URL, the topbar's
// user menu) are marked client where they live, so nothing here needs to be.
//
// Auth is not this file's job: src/proxy.ts redirects logged-out users
// before a route in this group renders at all.

import { type ReactNode } from "react";

import { AppShell } from "@/components/layout";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
