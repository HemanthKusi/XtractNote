// src/components/auth/otp-verify.tsx
// Reusable 6-digit code verification used by both the signup-confirm and
// password-recovery screens. Handles entry, verification, and resend.

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";

// Which flow we're verifying. Maps directly to Supabase's verifyOtp `type`.
type VerifyType = "signup" | "recovery";

interface OtpVerifyProps {
  /** The email the code was sent to. */
  email: string;
  /** signup = confirm a new account; recovery = password reset. */
  type: VerifyType;
  /** Called after the code verifies and a session exists. */
  onVerified: () => void;
  /** Full redirect URL reused if the user resends (keeps the email link valid). */
  resendRedirectTo: string;
}

const RESEND_COOLDOWN = 60; // Supabase allows ~one email per 60s.

export function OtpVerify({ email, type, onVerified, resendRedirectTo }: OtpVerifyProps) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resentNote, setResentNote] = useState("");

  // Count the resend cooldown down to zero, one second at a time.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleVerify() {
    const code = token.trim();
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code, type });

    if (verifyError) {
      setError(
        /expired/i.test(verifyError.message)
          ? "That code has expired — request a new one below."
          : "Incorrect code. Double-check and try again.",
      );
      setLoading(false);
      return;
    }

    // A session now exists; let the parent decide where to go next.
    onVerified();
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setError("");
    setResentNote("");

    const supabase = createClient();

    // resend() supports signup but NOT recovery, so recovery re-triggers reset.
    const { error: resendError } =
      type === "signup"
        ? await supabase.auth.resend({
            type: "signup",
            email,
            options: { emailRedirectTo: resendRedirectTo },
          })
        : await supabase.auth.resetPasswordForEmail(email, { redirectTo: resendRedirectTo });

    if (resendError && !/rate limit/i.test(resendError.message)) {
      setError("Couldn't resend just now. Please wait a moment and try again.");
      return;
    }

    setResentNote("Sent — check your inbox for a fresh code.");
    setCooldown(RESEND_COOLDOWN);
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xn-md border border-[#F9C3CC] bg-[#FEECEF] px-3 py-2 text-sm text-[#D44060]">
          {error}
        </div>
      )}
      {resentNote && <p className="text-sm text-xn-ink-muted">{resentNote}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleVerify();
        }}
        className="space-y-3"
      >
        <Input
          size="lg"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
          value={token}
          onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
          disabled={loading}
          className="text-center tracking-[0.4em] font-mono text-lg"
          aria-label="6-digit verification code"
        />

        <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
          {loading ? "Verifying…" : "Verify code"}
        </Button>
      </form>

      <button
        type="button"
        onClick={handleResend}
        disabled={cooldown > 0}
        className="w-full text-center text-xs text-xn-ink-soft hover:text-xn-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
      </button>
    </div>
  );
}