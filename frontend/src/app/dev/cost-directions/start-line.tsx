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

import { StartCost } from "@/components/create/start-cost";
import { Button } from "@/components/ui/button";
import type { BalanceState, CostState } from "@/lib/credits/cost";
import { shortfallMessage } from "@/lib/credits/shortfall";

export type CostDirection =
  | "today"
  | "beside"
  | "button"
  | "receipt"
  | "builtA"
  | "shortOnlyB"
  | "priceOnlyC"
  | "joinedB1"
  | "inButtonB2"
  | "captionB3"
  | "inButtonMotion";

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
  if (props.direction === "inButtonMotion") return <InButtonMotion {...props} />;
  if (props.direction === "joinedB1") return <JoinedB1 {...props} />;
  if (props.direction === "inButtonB2") return <InButtonB2 {...props} />;
  if (props.direction === "captionB3") return <CaptionB3 {...props} />;
  if (props.direction === "builtA") return <BuiltA {...props} />;
  if (props.direction === "shortOnlyB") return <ShortOnlyB {...props} />;
  if (props.direction === "priceOnlyC") return <PriceOnlyC {...props} />;
  if (props.direction === "today") return <Today {...props} />;
  if (props.direction === "beside") return <Beside {...props} />;
  if (props.direction === "button") return <InButton {...props} />;
  return <Receipt {...props} />;
}

// ── Round 2: the menu shows the balance now ──
//
// #454 chose A provisionally, until the side menu showed the balance (#460).
// It does now, so the line is revisited: keep it, show the balance only when
// it is short, or show the price alone.

function toCost(price: Load<Price>): CostState {
  return price.phase === "ready" ? { phase: "ready", credits: price.value.total } : price;
}

function toBalance(balance: Load<Balance>): BalanceState {
  return balance.phase === "ready"
    ? { phase: "ready", balance: { balance: balance.value.credits, allowance: 30, nextRefillAt: balance.value.refillsAt } }
    : balance;
}

function StartButton({ action, short, onStart }: { action: string | null; short: boolean; onStart: () => void }) {
  return (
    <Button variant="primary" size="lg" onClick={onStart} disabled={!action || short}>
      {action ?? "Pick a format"}
    </Button>
  );
}

// A · Keep — what shipped until round 4: round 1's Beside (the price and
// "You have N" beside the button). The real StartCost is B2 now.
function BuiltA(props: StartLineProps) {
  return <Beside {...props} />;
}

function PriceText({ price }: { price: Load<Price> }) {
  if (price.phase === "ready") return <span className="font-medium tabular-nums text-xn-ink">{credits(price.value.total)}</span>;
  if (price.phase === "loading") return <Placeholder width="w-16" />;
  return <span className="text-xn-ink-soft">Price unavailable</span>;
}

// B · The price, and the balance only when it is short.
function ShortOnlyB({ action, price, balance, onStart }: StartLineProps) {
  const short = action ? shortBy(price, balance) : null;
  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <StartButton action={action} short={short !== null} onStart={onStart} />
        {action && (
          <div className="flex flex-col gap-1 whitespace-nowrap text-sm leading-tight">
            <PriceText price={price} />
            {short !== null && balance.phase === "ready" && (
              <span className="tabular-nums text-xn-danger">You have {balance.value.credits}</span>
            )}
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

// C · The price alone; short turns the button off and says when credits refill.
function PriceOnlyC({ action, price, balance, onStart }: StartLineProps) {
  const short = action ? shortBy(price, balance) : null;
  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <StartButton action={action} short={short !== null} onStart={onStart} />
        {action && (
          <div className="whitespace-nowrap text-sm leading-tight">
            <PriceText price={price} />
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

// ── Round 3: B, attached to the button ──
//
// B's rule — the price, and the balance only when it is short — drawn so the
// price belongs to the button instead of floating beside it. Each carries a
// small version of the menu's cell ring, lit for what is left, so the line
// visibly connects to the gauge in the menu.

const GLYPH_CELLS = 30;

/** The menu's cell ring at text size, in currentColor, lit for `share`. */
function CellGlyph({ share, size = 16 }: { share: number; size?: number }) {
  const stroke = 2.4;
  const c = size / 2;
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const segment = length / GLYPH_CELLS;
  const lit = Math.round(share * GLYPH_CELLS);
  return (
    <svg aria-hidden width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      {Array.from({ length: GLYPH_CELLS }, (_, i) => (
        <circle
          key={i}
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity={i < lit ? 1 : 0.22}
          strokeWidth={stroke}
          strokeDasharray={`${segment * 0.55} ${length}`}
          strokeDashoffset={-i * segment}
        />
      ))}
    </svg>
  );
}

function shareOf(balance: Load<Balance>): number {
  return balance.phase === "ready" ? Math.min(1, balance.value.credits / GLYPH_CELLS) : 0;
}

function RefillNote({ balance }: { balance: Load<Balance> }) {
  if (balance.phase !== "ready") return null;
  return (
    <p className="mt-3 text-sm text-xn-ink-muted">
      Not enough credits. Yours refill on {refillDay(balance.value.refillsAt)}.
    </p>
  );
}

// B1 · Joined: an outlined pill the button's height, against it.
function JoinedB1({ action, price, balance, onStart }: StartLineProps) {
  const short = action ? shortBy(price, balance) : null;
  return (
    <>
      <div className="mt-5 flex flex-wrap items-stretch gap-2">
        <StartButton action={action} short={short !== null} onStart={onStart} />
        {action && (
          <span
            className="flex items-center gap-2 whitespace-nowrap rounded-xn-pill border border-xn-border bg-xn-surface px-4 text-sm"
            style={short !== null ? { borderColor: "color-mix(in srgb, var(--xn-danger) 40%, transparent)" } : undefined}
          >
            <span className="text-xn-ink">
              <CellGlyph share={shareOf(balance)} />
            </span>
            <PriceText price={price} />
            {short !== null && balance.phase === "ready" && (
              <span className="tabular-nums text-xn-danger">· You have {balance.value.credits}</span>
            )}
          </span>
        )}
      </div>
      {short !== null && <RefillNote balance={balance} />}
    </>
  );
}

// B2 · In the button: the price as its trailing segment, behind a divider.
function InButtonB2({ action, price, balance, onStart }: StartLineProps) {
  const short = action ? shortBy(price, balance) : null;
  return (
    <>
      <div className="mt-5">
        <Button variant="primary" size="lg" onClick={onStart} disabled={!action || short !== null}>
          {action ?? "Pick a format"}
          {action && price.phase === "ready" && (
            <>
              <span aria-hidden className="mx-1 h-5 w-px bg-current opacity-30" />
              <CellGlyph share={shareOf(balance)} />
              <span className="tabular-nums opacity-80">{credits(price.value.total)}</span>
            </>
          )}
        </Button>
      </div>
      {short !== null && balance.phase === "ready" && (
        <p className="mt-3 text-sm">
          <span className="tabular-nums text-xn-danger">You have {balance.value.credits}.</span>{" "}
          <span className="text-xn-ink-muted">Your credits refill on {refillDay(balance.value.refillsAt)}.</span>
        </p>
      )}
    </>
  );
}

// B3 · Caption: one line under the button, on its left edge.
function CaptionB3({ action, price, balance, onStart }: StartLineProps) {
  const short = action ? shortBy(price, balance) : null;
  return (
    <div className="mt-5">
      <StartButton action={action} short={short !== null} onStart={onStart} />
      {action && (
        <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 pl-1 text-sm text-xn-ink-muted">
          <span className="text-xn-ink">
            <CellGlyph share={shareOf(balance)} />
          </span>
          <span>Costs</span>
          <PriceText price={price} />
          {short !== null && balance.phase === "ready" && (
            <>
              <span className="tabular-nums text-xn-danger">· you have {balance.value.credits}</span>
              <span>· refills {refillDay(balance.value.refillsAt)}</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}

// ── Round 4: B2, without the ring, the price arriving ──
//
// The button first says only what it makes; a beat later it stretches a
// little past its new size and settles back, as the price slides in behind a
// divider — the menu's own spring, over the menu's own duration. The
// segment's natural width is measured and an explicit width animates to it:
// only an explicit width can overshoot (a grid track going 0fr → 1fr stops at
// the content's width, which cut the spring off). The price fades in once the
// stretch is under way. A new format springs to the new width; reduced motion
// shows the price at once.

// What ships: the real StartCost.
function InButtonMotion({ action, price, balance, onStart }: StartLineProps) {
  return (
    <StartCost
      label={action ?? "Pick a format"}
      cost={action ? toCost(price) : null}
      balance={toBalance(balance)}
      disabled={!action}
      onStart={onStart}
    />
  );
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
            {balance.phase === "failed" && <span className="text-xn-ink-soft">Balance unavailable</span>}
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
