// src/app/(auth)/reset-password/page.tsx
// Final step of password reset: set a new password using the temporary
// recovery session created when File 4's callback exchanged the email link.

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants/routes";
import { Button, Input, Card } from "@/components/ui";
import { Logo } from "@/components/layout";

/**
 * Whether there is a session to set the new password with. `failed` means the
 * check itself failed — it threw, or reported an error — which says nothing
 * about the link, so it gets its own screen rather than the expired-link one.
 */
type LinkCheck = "checking" | "valid" | "invalid" | "failed";

function checkRecoveryLink(): Promise<Exclude<LinkCheck, "checking">> {
  return createClient()
    .auth.getSession()
    .then(({ data, error }): Exclude<LinkCheck, "checking"> =>
      error ? "failed" : data.session ? "valid" : "invalid",
    )
    .catch((): Exclude<LinkCheck, "checking"> => "failed");
}

/**
 * Where the success screen goes after signing out of the recovery session.
 * `unknown` when the session cannot be read: it goes to sign in, with copy
 * that names no destination.
 */
type NextStop = "sign-in" | "dashboard" | "unknown";

const NEXT_COPY: Record<NextStop, string> = {
  "sign-in": "Taking you to sign in…",
  dashboard: "Taking you to your dashboard…",
  unknown: "Taking you on…",
};

const NEXT_ROUTE: Record<NextStop, string> = {
  "sign-in": ROUTES.LOGIN,
  dashboard: ROUTES.DASHBOARD,
  unknown: ROUTES.LOGIN,
};

/**
 * Sign out, and say where to go next. signOut() reports most failures in its
 * result and can also throw — and it can fail after it has already removed
 * the session — so a failure is followed by reading what session is left.
 */
async function signOutAndFindNextStop(): Promise<NextStop> {
  const supabase = createClient();
  try {
    const { error } = await supabase.auth.signOut();
    if (error === null) return "sign-in";
  } catch {
    // Read the session below.
  }
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return "unknown";
    return data.session ? "dashboard" : "sign-in";
  } catch {
    return "unknown";
  }
}

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [nextStop, setNextStop] = useState<NextStop>("sign-in");
  // Bumped by every submit and by unmounting; a submit's later steps run only
  // while its token is current. The redirect timer is cleared on unmount.
  const submitToken = useRef(0);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const submits = submitToken;
    const timer = redirectTimer;
    return () => {
      submits.current += 1;
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  const [link, setLink] = useState<LinkCheck>("checking");
  // Bumped by every check and by unmounting, so only the latest check's
  // result is applied.
  const checkToken = useRef(0);

  function runLinkCheck() {
    const token = ++checkToken.current;
    checkRecoveryLink().then((result) => {
      if (token === checkToken.current) setLink(result);
    });
  }

  // On mount, check for a session to set the new password with.
  useEffect(() => {
    runLinkCheck();
    const checks = checkToken;
    return () => {
      checks.current += 1;
    };
  }, []);

  function retryLinkCheck() {
    setLink("checking");
    runLinkCheck();
  }

  async function handleSubmit() {
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords don't match.");

    const token = ++submitToken.current;
    setLoading(true);
    setError("");

    const supabase = createClient();
    let updateError: { message: string } | null;
    try {
      ({ error: updateError } = await supabase.auth.updateUser({ password }));
    } catch {
      updateError = { message: "We couldn't update your password. Please try again." };
    }
    if (token !== submitToken.current) return;

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Sign out of the recovery session so they sign in fresh with the new
    // password. The password has changed whatever happens here.
    const next = await signOutAndFindNextStop();
    if (token !== submitToken.current) return;
    setNextStop(next);
    setDone(true);
    setLoading(false);

    // Brief success beat, then on.
    redirectTimer.current = setTimeout(() => router.push(NEXT_ROUTE[next]), 1500);
  }

  // ── Invalid / expired link ──
  if (link === "invalid" && !done) {
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
                <Link href={ROUTES.FORGOT_PASSWORD} className="font-medium text-xn-ink hover:text-xn-accent transition-colors">
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
                {NEXT_COPY[nextStop]}
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── Loading the session check ──
  if (link === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-xn-bg px-4">
        <p className="text-sm text-xn-ink-soft">Loading…</p>
      </div>
    );
  }

  // ── The check itself failed — not the link ──
  if (link === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-xn-bg px-4">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <Logo size={28} showWordmark />
          </div>
          <Card padding="lg">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-xn-surface-alt">
                <AlertTriangle className="h-6 w-6 text-xn-ink-soft" />
              </div>
              <h1 className="text-xl font-semibold text-xn-ink">We couldn&apos;t check your link</h1>
              <p className="mt-2 text-sm text-xn-ink-muted">
                Something went wrong on our side — your link may still be fine. Try again in a moment.
              </p>
              <div className="mt-6">
                <Button variant="primary" size="lg" fullWidth onClick={retryLinkCheck}>
                  Try again
                </Button>
              </div>
              <p className="mt-4 text-sm text-xn-ink-muted">
                Or{" "}
                <Link
                  href={ROUTES.FORGOT_PASSWORD}
                  className="font-medium text-xn-ink underline-offset-2 hover:underline"
                >
                  request a new link
                </Link>
              </p>
            </div>
          </Card>
        </div>
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