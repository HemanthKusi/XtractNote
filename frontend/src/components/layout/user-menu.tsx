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
  // Until the lookup settles the name is left blank, rather than showing
  // "Account" and then replacing it.
  const [userLoaded, setUserLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  // Bumped by unmounting and by starting a sign-out, so a lookup that lands
  // late cannot put a user back into the menu.
  const lookupToken = useRef(0);

  // Fetch the signed-in user once on mount (browser client). A lookup that
  // fails shows "Account": the name is a label, not a sign-in state, and
  // there is nothing for the person to do about it.
  useEffect(() => {
    const token = ++lookupToken.current;
    createClient()
      .auth.getUser()
      .then(({ data }) => data.user)
      .catch(() => null)
      .then((found) => {
        if (token !== lookupToken.current) return;
        setUser(found);
        setUserLoaded(true);
      });
    const lookups = lookupToken;
    return () => {
      lookups.current += 1;
    };
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
    lookupToken.current++;
    setSigningOut(true);
    setSignOutFailed(false);

    // signOut() reports most failures in its result, and can also throw.
    // Either way the session may still be there, so the person stays here.
    let failed: boolean;
    try {
      const { error } = await createClient().auth.signOut();
      failed = error !== null;
    } catch {
      failed = true;
    }
    if (failed) {
      setSigningOut(false);
      setSignOutFailed(true);
      return;
    }

    router.push(ROUTES.LOGIN);
    router.refresh(); // re-run server state so the proxy sees us logged out
  }

  // Display fields from auth metadata (set at signup / by Google).
  const fullName = (user?.user_metadata?.full_name as string) || "";
  const email = user?.email || "";
  const avatarUrl = (user?.user_metadata?.avatar_url as string) || undefined;
  const displayName = userLoaded ? fullName || email.split("@")[0] || "Account" : "";
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
            {/* A non-breaking space keeps the line's height while the name loads. */}
            <p className="text-sm font-medium text-xn-ink truncate">{displayName || "\u00a0"}</p>
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
            {signOutFailed && (
              <p role="alert" className="px-2.5 pb-1.5 pt-0.5 text-xs text-xn-danger">
                Couldn&apos;t sign out. Try again.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}