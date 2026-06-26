// src/components/layout/user-menu.tsx
// Topbar avatar + dropdown: shows the signed-in user and a Sign out action.

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants/routes";
import { Avatar } from "@/components/ui/avatar";

// Build 1–2 letter initials from a name, falling back to the email.
function initialsFrom(name: string, email: string): string {
  const source = (name || email).trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Fetch the signed-in user once on mount (browser client).
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // While open, close on outside-click or Escape.
  useEffect(() => {
    if (!open) return;

    function onPointer(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(ROUTES.LOGIN);
    router.refresh(); // re-run server state so the proxy sees us logged out
  }

  // Display fields from auth metadata (set at signup / by Google).
  const fullName = (user?.user_metadata?.full_name as string) || "";
  const email = user?.email || "";
  const avatarUrl = (user?.user_metadata?.avatar_url as string) || undefined;
  const displayName = fullName || email.split("@")[0] || "Account";
  const initials = initialsFrom(fullName, email);

  return (
    <div ref={containerRef} className="relative">
      {/* Avatar button — toggles the dropdown */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-xn-accent focus-visible:outline-offset-2"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <Avatar initials={initials} src={avatarUrl} size="md" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className={[
            "absolute right-0 top-[calc(100%+8px)] z-50 w-56",
            "bg-xn-surface border border-xn-border rounded-xn-lg shadow-xn-lg",
            "overflow-hidden",
          ].join(" ")}
        >
          {/* Identity header */}
          <div className="px-3 py-2.5 border-b border-xn-border">
            <p className="text-sm font-medium text-xn-ink truncate">{displayName}</p>
            {email && <p className="text-xs text-xn-ink-soft truncate">{email}</p>}
          </div>

          {/* Actions */}
          <div className="p-1">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={signingOut}
              className={[
                "w-full flex items-center gap-2",
                "px-2.5 py-2 rounded-xn-md",
                "text-sm text-xn-ink text-left",
                "hover:bg-xn-surface-alt transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              ].join(" ")}
            >
              <LogOut className="w-4 h-4 text-xn-ink-soft" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}