// src/app/(auth)/reset-password/page.tsx
// Final step of password reset: set a new password using the temporary
// recovery session created when File 4's callback exchanged the email link.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants/routes";
import { Button, Input, Card } from "@/components/ui";
import { Logo } from "@/components/layout";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // null = still checking, true/false = whether a recovery session exists.
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // On mount, confirm we actually arrived via a valid recovery link.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
    });
  }, []);

  async function handleSubmit() {
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords don't match.");

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Sign out of the recovery session so they log in fresh with the new password.
    await supabase.auth.signOut();
    setDone(true);
    setLoading(false);

    // Brief success beat, then to login.
    setTimeout(() => router.push(ROUTES.LOGIN), 1500);
  }

  // ── Invalid / expired link ──
  if (hasSession === false && !done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-xn-bg px-4">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <Logo size={28} showWordmark />
          </div>
          <Card padding="lg">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-xn-surface-alt">
                <AlertTriangle className="h-6 w-6 text-[#D44060]" />
              </div>
              <h1 className="text-xl font-semibold text-xn-ink">Link expired or invalid</h1>
              <p className="mt-2 text-sm text-xn-ink-muted">
                This password reset link is no longer valid. Please request a new one.
              </p>
              <div className="mt-6">
                <Link href="/forgot-password">
                  <Button variant="primary" size="lg" fullWidth>Request a new link</Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-xn-bg px-4">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <Logo size={28} showWordmark />
          </div>
          <Card padding="lg">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-xn-surface-alt">
                <CheckCircle2 className="h-6 w-6 text-xn-accent" />
              </div>
              <h1 className="text-xl font-semibold text-xn-ink">Password updated</h1>
              <p className="mt-2 text-sm text-xn-ink-muted">
                Taking you to sign in…
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── Loading the session check ──
  if (hasSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-xn-bg px-4">
        <p className="text-sm text-xn-ink-soft">Loading…</p>
      </div>
    );
  }

  // ── New-password form (valid recovery session) ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-xn-bg px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo size={28} showWordmark />
        </div>

        <Card padding="lg">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-xn-ink">Set a new password</h1>
            <p className="mt-1 text-sm text-xn-ink-muted">Choose a password you&apos;ll remember.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xn-md border border-[#F9C3CC] bg-[#FEECEF] px-3 py-2 text-sm text-[#D44060]">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-xn-ink">New password</label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                size="lg"
                placeholder="At least 6 characters"
                prefix={<Lock />}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-xn-ink-soft hover:text-xn-ink transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm" className="block text-sm font-medium text-xn-ink">Confirm password</label>
              <Input
                id="confirm"
                type={showPassword ? "text" : "password"}
                size="lg"
                placeholder="Re-enter your password"
                prefix={<Lock />}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                required
              />
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}