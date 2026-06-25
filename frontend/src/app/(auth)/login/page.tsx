// src/app/(auth)/login/page.tsx
// The login screen: email/password + Google, with post-login redirect.

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants/routes";
import { Button, Input, Card } from "@/components/ui";
import { Logo } from "@/components/layout";

// Google doesn't ship in lucide (brand marks were removed), so inline the "G".
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

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  // Where to land after login. The proxy stashes this when it bounces a
  // logged-out user. Only honor relative in-app paths (open-redirect guard).
  const requested = params.get("redirectTo");
  const dest =
    requested && requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : ROUTES.DASHBOARD;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Seed the error from ?error=auth, which File 4 sets if the callback failed.
  const [error, setError] = useState(
    params.get("error") === "auth"
      ? "Something went wrong finishing your sign-in. Please try again."
      : "",
  );

  async function handleEmailLogin() {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      // Distinguish "not confirmed yet" from "wrong credentials" — different fixes.
      setError(
        /confirm/i.test(signInError.message)
          ? "Please confirm your email first — check your inbox for the link."
          : "Incorrect email or password.",
      );
      setLoading(false);
      return;
    }

    // Session cookie is set. Go where they were headed; refresh server state.
    router.push(dest);
    router.refresh();
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Back to our callback (File 4), carrying the final destination.
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(dest)}`,
      },
    });

    // On success the browser leaves for Google; only handle the error path here.
    if (oauthError) {
      setError("Couldn't start Google sign-in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-xn-bg px-4">
      <div className="w-full max-w-sm">
        {/* Logo → home */}
        <div className="flex justify-center mb-8">
          <Link href={ROUTES.HOME} aria-label="XtractNote home">
            <Logo size={28} showWordmark />
          </Link>
        </div>

        <Card padding="lg">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-xn-ink">Welcome back</h1>
            <p className="mt-1 text-sm text-xn-ink-muted">Sign in to continue to XtractNote</p>
          </div>

          {/* Google */}
          <Button
            type="button"
            variant="default"
            size="lg"
            fullWidth
            icon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-xn-border" />
            <span className="text-xs text-xn-ink-soft">or</span>
            <span className="h-px flex-1 bg-xn-border" />
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-4 rounded-xn-md border border-[#F9C3CC] bg-[#FEECEF] px-3 py-2 text-sm text-[#D44060]">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleEmailLogin();
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

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-xn-ink">Password</label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                size="lg"
                placeholder="••••••••"
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
                autoComplete="current-password"
                required
              />
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-xn-ink-muted">
          Don&apos;t have an account?{" "}
          <Link href={ROUTES.SIGNUP} className="font-medium text-xn-ink hover:text-xn-accent transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams must sit inside a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}