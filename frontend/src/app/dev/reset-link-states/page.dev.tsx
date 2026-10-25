"use client";

// src/app/dev/reset-link-states/page.dev.tsx  →  route: /dev/reset-link-states
//
// The reset-password page when it cannot check the recovery link because
// the check itself failed (#438) — as opposed to the link being expired,
// which the page already handles. Directions for the new state, beside the
// two screens it sits between today, and the form when saving fails.
//
// Each "Try again" runs: it shows the page's own "Loading…" for a moment,
// then lands where the controls say — the form, or the same state again.
//
// A · Same card, neutral was chosen and ships in the reset-password page;
// B and C are kept as the record of what it was chosen from.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Lock, RotateCw } from "lucide-react";

import { Button, Card, Input } from "@/components/ui";
import { Logo } from "@/components/layout";
import { useTheme } from "@/components/shared/theme-provider";

type Lands = "form" | "fails";
type Phase = "state" | "loading" | "form";

const RETRY_MS = 700;

export default function ResetLinkStatesPage() {
  const [lands, setLands] = useState<Lands>("form");
  const [folded, setFolded] = useState(false);
  const { theme, setTheme } = useTheme();

  const small =
    "rounded-xn-sm px-2 py-1 font-mono text-micro text-xn-ink-muted transition-colors duration-xn ease-xn hover:bg-xn-surface-alt hover:text-xn-ink";

  return (
    <div className="min-h-screen bg-xn-surface-alt px-6 py-10">
      <div className="mx-auto max-w-[1200px]">
        <p className="font-mono text-micro uppercase tracking-wide text-xn-ink-soft">/reset-password · #438</p>
        <h1 className="mt-1 text-h4 text-xn-ink">When the link cannot be checked</h1>
        <p className="mt-2 max-w-2xl text-sm text-xn-ink-muted">
          The page checks for a session when it opens. Before #438, if that check threw, the page stayed on
          &ldquo;Loading…&rdquo; for good. The new state says what happened without blaming the link.
        </p>

        <h2 className="mt-10 font-mono text-micro uppercase tracking-wide text-xn-ink-soft">For reference</h2>
        <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] gap-5">
          <Frame label="Link expired or invalid" note="The check worked and found no session. Unchanged.">
            <ExpiredCard />
          </Frame>
          <Frame label="The check throws, before #438" note="What a crash left on screen — and never left.">
            <LoadingLine />
          </Frame>
        </div>

        <h2 className="mt-10 font-mono text-micro uppercase tracking-wide text-xn-ink-soft">New state</h2>
        <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] gap-5">
          <Frame
            label="A · Same card, neutral (chosen)"
            note="The expired card's shape with a grey triangle — the problem is ours, not the link's. Try again, and a way out."
          >
            <Retrying lands={lands} direction="A" />
          </Frame>
          <Frame
            label="B · Retry first"
            note="A retry icon, and only one action. Fewer choices; anyone who wants a new link goes back to the email."
          >
            <Retrying lands={lands} direction="B" />
          </Frame>
          <Frame
            label="C · Quiet line"
            note="No card: one line where &ldquo;Loading…&rdquo; was, and an inline Try again. Lightest; reads as a hiccup, not a page."
          >
            <Retrying lands={lands} direction="C" />
          </Frame>
        </div>

        <h2 className="mt-10 font-mono text-micro uppercase tracking-wide text-xn-ink-soft">Saving fails</h2>
        <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] gap-5">
          <Frame
            label="The existing error banner"
            note="If saving the new password throws, the page's own banner says so and the button comes back from &ldquo;Updating…&rdquo;."
          >
            <PasswordForm error="We couldn't update your password. Please try again." />
          </Frame>
          <Frame
            label="Saved, then sign-out fails"
            note="The password did change, so the page still says so. Still signed in, they go to the dashboard, not to sign in."
          >
            <UpdatedCard next="Taking you to your dashboard…" />
          </Frame>
        </div>
      </div>

      {folded ? (
        <button
          type="button"
          onClick={() => setFolded(false)}
          className="fixed bottom-4 right-4 z-50 rounded-xn-lg border border-xn-border bg-xn-surface px-3 py-2 font-mono text-micro text-xn-ink-muted shadow-xn-lg"
        >
          Controls
        </button>
      ) : (
        <div className="fixed bottom-4 right-4 z-50 w-[280px] rounded-xn-lg border border-xn-border bg-xn-surface p-3 shadow-xn-lg">
          <div className="flex items-center justify-between">
            <p className="font-mono text-micro uppercase tracking-wide text-xn-ink-soft">Reset link</p>
            <span className="flex items-center gap-1">
              <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className={small}>
                {theme === "dark" ? "→ light" : "→ dark"}
              </button>
              <button type="button" onClick={() => setFolded(true)} className={small}>
                hide
              </button>
            </span>
          </div>
          <p className="mt-3 font-mono text-micro uppercase tracking-wide text-xn-ink-soft">Try again lands on</p>
          <div className="mt-1.5 flex gap-1">
            {(
              [
                ["form", "The form"],
                ["fails", "Fails again"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setLands(id)}
                className={[
                  "rounded-xn-sm px-2 py-1.5 text-sm transition-colors duration-xn ease-xn",
                  id === lands ? "bg-xn-ink text-xn-bg" : "text-xn-ink-muted hover:bg-xn-surface-alt hover:text-xn-ink",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Frame: one screen of the page, at its real width ──

function Frame({ label, note, children }: { label: string; note: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-xn-ink">{label}</p>
      <p className="mt-0.5 min-h-[2.5rem] text-xs leading-snug text-xn-ink-soft">{note}</p>
      <div className="mt-2 flex min-h-[420px] items-center justify-center rounded-xn-lg border border-xn-border bg-xn-bg px-4 py-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

// ── Retrying: runs a direction's Try again ──

function Retrying({ lands, direction }: { lands: Lands; direction: "A" | "B" | "C" }) {
  const [phase, setPhase] = useState<Phase>("state");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function retry() {
    if (timer.current) clearTimeout(timer.current);
    setPhase("loading");
    timer.current = setTimeout(() => setPhase(lands === "form" ? "form" : "state"), RETRY_MS);
  }

  if (phase === "loading") return <LoadingLine />;
  if (phase === "form")
    return (
      <div>
        <PasswordForm />
        <button
          type="button"
          onClick={() => setPhase("state")}
          className="mt-3 w-full text-center font-mono text-micro text-xn-ink-soft hover:text-xn-ink"
        >
          reset specimen
        </button>
      </div>
    );
  if (direction === "A") return <DirectionA onRetry={retry} />;
  if (direction === "B") return <DirectionB onRetry={retry} />;
  return <DirectionC onRetry={retry} />;
}

// ── The page's screens today ──

function Branded({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="mb-8 flex justify-center">
        <Logo size={28} showWordmark />
      </div>
      {children}
    </>
  );
}

function ExpiredCard() {
  return (
    <Branded>
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
            <Button variant="primary" size="lg" fullWidth>
              Request a new link
            </Button>
          </div>
        </div>
      </Card>
    </Branded>
  );
}

function LoadingLine() {
  return <p className="text-center text-sm text-xn-ink-soft">Loading…</p>;
}

function UpdatedCard({ next }: { next: string }) {
  return (
    <Branded>
      <Card padding="lg">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-xn-surface-alt">
            <CheckCircle2 className="h-6 w-6 text-xn-accent" />
          </div>
          <h1 className="text-xl font-semibold text-xn-ink">Password updated</h1>
          <p className="mt-2 text-sm text-xn-ink-muted">{next}</p>
        </div>
      </Card>
    </Branded>
  );
}

function PasswordForm({ error }: { error?: string }) {
  return (
    <Branded>
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
        <div className="space-y-4">
          <Input size="lg" type="password" placeholder="At least 6 characters" prefix={<Lock />} defaultValue="" />
          <Input size="lg" type="password" placeholder="Re-enter your password" prefix={<Lock />} defaultValue="" />
          <Button variant="primary" size="lg" fullWidth>
            Update password
          </Button>
        </div>
      </Card>
    </Branded>
  );
}

// ── The new state ──

function DirectionA({ onRetry }: { onRetry: () => void }) {
  return (
    <Branded>
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
            <Button variant="primary" size="lg" fullWidth onClick={onRetry}>
              Try again
            </Button>
          </div>
          <p className="mt-4 text-sm text-xn-ink-muted">
            Or{" "}
            <span className="font-medium text-xn-ink underline-offset-2 hover:underline">request a new link</span>
          </p>
        </div>
      </Card>
    </Branded>
  );
}

function DirectionB({ onRetry }: { onRetry: () => void }) {
  return (
    <Branded>
      <Card padding="lg">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-xn-surface-alt">
            <RotateCw className="h-6 w-6 text-xn-ink-soft" />
          </div>
          <h1 className="text-xl font-semibold text-xn-ink">Couldn&apos;t check your link</h1>
          <p className="mt-2 text-sm text-xn-ink-muted">
            This is on our side, not your link. Give it another go.
          </p>
          <div className="mt-6">
            <Button variant="primary" size="lg" fullWidth onClick={onRetry}>
              Try again
            </Button>
          </div>
        </div>
      </Card>
    </Branded>
  );
}

function DirectionC({ onRetry }: { onRetry: () => void }) {
  return (
    <p className="text-center text-sm text-xn-ink-muted">
      We couldn&apos;t check your link.{" "}
      <button
        type="button"
        onClick={onRetry}
        className="font-medium text-xn-ink underline-offset-2 hover:underline"
      >
        Try again
      </button>{" "}
      or{" "}
      <span className="font-medium text-xn-ink underline-offset-2 hover:underline">request a new link</span>.
    </p>
  );
}
