"use client";

// src/app/dev/cost-directions/start-line.tsx
//
// The line the create page's start button sits on, in each direction for
// showing what a start costs and what the user has (#454). Every direction
// gets the same price and balance — each loading, failed or ready — and
// differs only in where they go and what they say.
//
// One rule holds in all of them: a price or balance that is loading or has
// failed never blocks the button. The start route prices and refuses on its
// own, so a display that could not load is not a reason to stop someone.
// Only a balance KNOWN to be short disables it.

import { Button } from "@/components/ui/button";
import { shortfallMessage } from "@/lib/credits/shortfall";

export type CostDirection = "today" | "beside" | "button" | "receipt";

export type Load<T> = { phase: "loading" } | { phase: "failed" } | { phase: "ready"; value: T };

export interface Price {
  total: number;
  base: number;
  /** One per started hour past the first. */
  extraHours: number;
  /** The video's length as shown on its card, e.g. "1:20:00". */
  length: string;
}

export interface Balance {
  credits: number;
  /** ISO 8601 with an offset. */
  refillsAt: string;
}

interface StartLineProps {
  direction: CostDirection;
  /** "Make study notes", or null while no format is chosen. */
  action: string | null;
  formatLabel: string | null;
  price: Load<Price>;
  balance: Load<Balance>;
  /** Today only: the start was sent and refused for credits. */
  refused: boolean;
  onStart: () => void;
}

function credits(count: number): string {
  return `${count} ${count === 1 ? "credit" : "credits"}`;
}

function refillDay(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(new Date(iso));
}

function shortBy(price: Load<Price>, balance: Load<Balance>): number | null {
  if (price.phase !== "ready" || balance.phase !== "ready") return null;
  const gap = price.value.total - balance.value.credits;
  return gap > 0 ? gap : null;
}

export function StartLine(props: StartLineProps) {
  if (props.direction === "today") return <Today {...props} />;
  if (props.direction === "beside") return <Beside {...props} />;
  if (props.direction === "button") return <InButton {...props} />;
  return <Receipt {...props} />;
}

// ── Today ── what ships: nothing until a start is refused.
function Today({ action, price, balance, refused, onStart }: StartLineProps) {
  return (
    <>
      <div className="mt-5 flex items-center gap-3">
        <Button variant="primary" size="lg" onClick={onStart} disabled={!action}>
          {refused ? "Try again" : (action ?? "Pick a format")}
        </Button>
      </div>
      {refused && price.phase === "ready" && balance.phase === "ready" && (
        <p className="mt-3 flex items-start gap-2 text-sm text-xn-danger">
          <AlertIcon />
          <span>
            {shortfallMessage({
              cost: price.value.total,
              balance: balance.value.credits,
              nextRefillAt: balance.value.refillsAt,
            })}
          </span>
        </p>
      )}
    </>
  );
}

// ── A · Beside ── the price and what is left, quiet, to the button's right.
function Beside({ action, price, balance, onStart }: StartLineProps) {
  const short = action ? shortBy(price, balance) : null;
  return (
    <>
      {/* Wraps below the button when the column is too narrow for both. */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button variant="primary" size="lg" onClick={onStart} disabled={!action || short !== null}>
          {action ?? "Pick a format"}
        </Button>
        {action && (
          <div className="flex flex-col gap-1 whitespace-nowrap text-sm leading-tight">
            {price.phase === "ready" && (
              <span className="font-medium tabular-nums text-xn-ink">{credits(price.value.total)}</span>
            )}
            {price.phase === "loading" && <Placeholder width="w-16" />}
            {price.phase === "failed" && <span className="text-xn-ink-soft">Price unavailable</span>}

            {balance.phase === "ready" && (
              <span className={`tabular-nums ${short !== null ? "text-xn-danger" : "text-xn-ink-soft"}`}>
                You have {balance.value.credits}
              </span>
            )}
            {balance.phase === "loading" && <Placeholder width="w-20" />}
          </div>
        )}
      </div>
      {short !== null && balance.phase === "ready" && (
        <p className="mt-3 text-sm text-xn-ink-muted">
          Not enough credits. Yours refill on {refillDay(balance.value.refillsAt)}.
        </p>
      )}
    </>
  );
}

// ── B · In the button ── the price is part of what the button says.
function InButton({ action, price, balance, onStart }: StartLineProps) {
  const short = action ? shortBy(price, balance) : null;
  const label = !action
    ? "Pick a format"
    : short !== null && price.phase === "ready"
      ? `Needs ${credits(price.value.total)}`
      : action;
  return (
    <>
      <div className="mt-5 flex items-center gap-3">
        <Button variant="primary" size="lg" onClick={onStart} disabled={!action || short !== null}>
          {label}
          {action && short === null && price.phase === "ready" && (
            <span className="ml-2 tabular-nums opacity-60">· {credits(price.value.total)}</span>
          )}
        </Button>
      </div>
      {/* A failed balance shows nothing; a failed price leaves the button
          without one. */}
      {action && balance.phase !== "failed" && (
        <p className={`mt-2.5 text-sm tabular-nums ${short !== null ? "text-xn-danger" : "text-xn-ink-soft"}`}>
          {balance.phase === "ready" &&
            (short !== null
              ? `You have ${balance.value.credits}. Your credits refill on ${refillDay(balance.value.refillsAt)}.`
              : `${credits(balance.value.credits)} left · refills ${refillDay(balance.value.refillsAt)}`)}
          {balance.phase === "loading" && <Placeholder width="w-48" />}
        </p>
      )}
    </>
  );
}

// ── C · Receipt ── what this costs and why, then the balance before and after.
function Receipt({ action, formatLabel, price, balance, onStart }: StartLineProps) {
  const short = action ? shortBy(price, balance) : null;
  return (
    <>
      {action && (
        <dl className="mt-5 w-full max-w-sm text-sm">
          <Row term={formatLabel ?? ""}>
            {price.phase === "ready" && credits(price.value.base)}
            {price.phase === "loading" && <Placeholder width="w-14" />}
            {price.phase === "failed" && <span className="text-xn-ink-soft">Unavailable</span>}
          </Row>
          {price.phase === "ready" && price.value.extraHours > 0 && (
            <Row term={`Length ${price.value.length}`} quiet>
              +{price.value.extraHours}
            </Row>
          )}
          <div className="my-2 border-t border-xn-border" />
          <Row term="Your balance">
            {balance.phase === "ready" && price.phase === "ready" && (
              <span className={short !== null ? "text-xn-danger" : undefined}>
                {short !== null
                  ? `${balance.value.credits} · ${short} short`
                  : `${balance.value.credits} → ${balance.value.credits - price.value.total}`}
              </span>
            )}
            {balance.phase === "ready" && price.phase !== "ready" && balance.value.credits}
            {balance.phase === "loading" && <Placeholder width="w-14" />}
            {balance.phase === "failed" && <span className="text-xn-ink-soft">Unavailable</span>}
          </Row>
        </dl>
      )}
      <div className="mt-4 flex items-center gap-3">
        <Button variant="primary" size="lg" onClick={onStart} disabled={!action || short !== null}>
          {action ?? "Pick a format"}
        </Button>
      </div>
      {short !== null && balance.phase === "ready" && (
        <p className="mt-3 text-sm text-xn-ink-muted">
          Your credits refill on {refillDay(balance.value.refillsAt)}.
        </p>
      )}
    </>
  );
}

function Row({ term, quiet, children }: { term: string; quiet?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-0.5">
      <dt className={quiet ? "text-xn-ink-soft" : "text-xn-ink-muted"}>{term}</dt>
      <dd className={`tabular-nums ${quiet ? "text-xn-ink-soft" : "text-xn-ink"}`}>{children}</dd>
    </div>
  );
}

function Placeholder({ width }: { width: string }) {
  return <span className={`inline-block h-3.5 animate-pulse rounded-xn-sm bg-xn-surface-alt align-middle ${width}`} />;
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="mt-0.5 shrink-0">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.75v4M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
