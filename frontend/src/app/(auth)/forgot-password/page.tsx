// src/app/(auth)/forgot-password/page.tsx
// Step 1 of password reset: request a reset email.

"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, MailCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants/routes";
import { Button, Input, Card } from "@/components/ui";
import { Logo } from "@/components/layout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      // The recovery link returns through File 4's callback, which then
      // forwards to the reset page (File 9) inside a temporary session.
      redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(ROUTES.RESET_PASSWORD)}`,
    });

    // Don't leak whether the email exists — always show the same success.
    if (resetError && !/rate limit/i.test(resetError.message)) {
      // Only surface infrastructure-level problems (e.g. rate limiting).
      setSent(true);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  // ── Success state ──
  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-xn-bg px-4">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <Logo size={28} showWordmark />
          </div>
          <Card padding="lg">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-xn-surface-alt">
                <MailCheck className="h-6 w-6 text-xn-accent" />
              </div>
              <h1 className="text-xl font-semibold text-xn-ink">Check your inbox</h1>
              <p className="mt-2 text-sm text-xn-ink-muted">
                If an account exists for <span className="font-medium text-xn-ink">{email}</span>,
                we&apos;ve sent a link to reset your password.
              </p>
              <div className="mt-6">
                <Link href={ROUTES.LOGIN}>
                  <Button variant="default" size="lg" fullWidth>Back to sign in</Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── Request form ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-xn-bg px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href={ROUTES.HOME} aria-label="XtractNote home">
            <Logo size={28} showWordmark />
          </Link>
        </div>

        <Card padding="lg">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-xn-ink">Reset your password</h1>
            <p className="mt-1 text-sm text-xn-ink-muted">
              Enter your email and we&apos;ll send you a reset link.
            </p>
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
              <label htmlFor="email" className="block text-sm font-medium text-xn-ink">Email</label>
              <Input
                id="email"
                type="email"
                size="lg"
                placeholder="you@example.com"
                prefix={<Mail />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                required
              />
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-xn-ink-muted">
          Remembered it?{" "}
          <Link href={ROUTES.LOGIN} className="font-medium text-xn-ink hover:text-xn-accent transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}