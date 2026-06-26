// src/app/(app)/dashboard/page.tsx
// Placeholder dashboard. Exists so (1) login has a real landing page and
// (2) AppShell (and the topbar user menu) has a surface to render on.
// The real dashboard is built in a later phase.

import { AppShell } from "@/components/layout";

export default function DashboardPage() {
  return (
    <AppShell activePage="home">
      <div className="max-w-2xl">
        <h1 className="font-serif text-3xl text-xn-ink">Dashboard</h1>
        <p className="mt-2 text-sm text-xn-ink-muted">
          Placeholder for now — the real dashboard comes later. If you can see
          this with the sidebar and top bar around it, you&apos;re signed in.
          Your account menu is the avatar in the top-right.
        </p>
      </div>
    </AppShell>
  );
}