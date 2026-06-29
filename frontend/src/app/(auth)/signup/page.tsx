// src/app/(auth)/signup/page.tsx
// The signup screen: create an account with name/email/password or Google.

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Eye, EyeOff, MailCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants/routes";
import { Button, Input, Card } from "@/components/ui";
import { Logo } from "@/components/layout";
import { OtpVerify } from "@/components/auth/otp-verify";

// Same inline Google "G" as the login page (lucide dropped brand marks).
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();

  // Same relative-only redirect guard as login.
  const requested = params.get("redirectTo");
  const dest =
    requested && requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : ROUTES.DASHBOARD;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // When confirmation is required, we flip to a "check your inbox" view.
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  async function handleSignup() {
    if (!name.trim()) return setError("Please enter your name.");
    if (!email || !password) return setError("Please enter your email and password.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Saved into auth metadata; the 8.2 profile trigger reads full_name.
        data: { full_name: name.trim() },
        // Where the confirmation link returns the user.
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(dest)}`,
      },
    });

    if (signUpError) {
      setError(
        /already registered|already exists/i.test(signUpError.message)
          ? "An account with this email already exists. Try signing in."
          : signUpError.message,
      );
      setLoading(false);
      return;
    }

    // No session back = email confirmation is ON → show the inbox screen.
    if (!data.session) {
      setAwaitingConfirm(true);
      setLoading(false);
      return;
    }

    // Session present = confirmation OFF → straight into the app.
    router.push(dest);
    router.refresh();
  }

  async function handleGoogleSignup() {
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(dest)}`,
      },
    });

    if (oauthError) {
      setError("Couldn't start Google sign-up. Please try again.");
      setLoading(false);
    }
  }

  // ── "Check your inbox" state (link + 6-digit code) ────────
  if (awaitingConfirm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-xn-bg px-4">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <Logo size={28} showWordmark />
          </div>
          <Card padding="lg">
            <div className="mb-5 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-xn-surface-alt">
                <MailCheck className="h-6 w-6 text-xn-accent" />
              </div>
              <h1 className="text-xl font-semibold text-xn-ink">Check your inbox</h1>
              <p className="mt-2 text-sm text-xn-ink-muted">
                We sent a confirmation email to{" "}
                <span className="font-medium text-xn-ink">{email}</span>. Enter the
                6-digit code below, or click the link in the email.
              </p>
            </div>

            {/* Code path → on success, straight into the app */}
            <OtpVerify
              email={email}
              type="signup"
              resendRedirectTo={`${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(dest)}`}
              onVerified={() => {
                router.push(dest);
                router.refresh();
              }}
            />

            <p className="mt-5 text-center text-sm text-xn-ink-muted">
              <Link href={ROUTES.LOGIN} className="font-medium text-xn-ink hover:text-xn-accent transition-colors">
                Back to sign in
              </Link>
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // ── Default signup form ───────────────────────────────────
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
            <h1 className="text-2xl font-semibold text-xn-ink">Create your account</h1>
            <p className="mt-1 text-sm text-xn-ink-muted">Start turning videos into content</p>
          </div>

          <Button
            type="button"
            variant="default"
            size="lg"
            fullWidth
            icon={<GoogleIcon />}
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-xn-border" />
            <span className="text-xs text-xn-ink-soft">or</span>
            <span className="h-px flex-1 bg-xn-border" />
          </div>

          {error && (
            <div className="mb-4 rounded-xn-md border border-[#F9C3CC] bg-[#FEECEF] px-3 py-2 text-sm text-[#D44060]">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSignup();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-medium text-xn-ink">Name</label>
              <Input
                id="name"
                type="text"
                size="lg"
                placeholder="Jane Doe"
                prefix={<User />}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="name"
                required
              />
            </div>

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

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-xn-ink">Password</label>
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

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-xn-ink-muted">
          Already have an account?{" "}
          <Link href={ROUTES.LOGIN} className="font-medium text-xn-ink hover:text-xn-accent transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}