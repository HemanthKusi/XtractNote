"use client";

// src/app/dev/social-templates/x-thread.tsx
//
// The thread preview: 5-9 artefacts, each with a budget that decides whether
// it can be posted at all.
//
// ── Why this format needed its own pass ──
//
// The video description is one artefact in a fixed frame, and the surface
// built for it assumes exactly that. A thread is a SEQUENCE. The chrome
// repeats, the connector runs between units, and the thing you copy is one
// tweet rather than the whole page.
//
// ── The two decisions this file makes ──
//
// 1. THE BUDGET IS ALWAYS VISIBLE, QUIETLY, AND ESCALATES.
//
//    The alternative was showing it only when a tweet is near or over the
//    limit. That keeps the mock clean and hides the number exactly when you
//    are comparing tones and want it. So it is always there in `ink-faint`,
//    which is quiet enough to ignore, and turns to `danger` with its own
//    label when the tweet cannot be posted.
//
//    It sits in a GUTTER OUTSIDE the card. The budget is our information,
//    not the destination's — the destination shows a ring while you type and
//    has no equivalent for an already-written tweet. Painting it into the
//    card would make the mock a liar about what the user will see.
//
// 2. OVER-BUDGET IS A MEASUREMENT, NOT AN ERROR.
//
//    The overflowing characters themselves are marked, so the tail you have
//    to cut is visible. An error state says "this is broken"; a measurement
//    says "cut from here". The second is the one you can act on, and the
//    count still turns red, so nothing is lost by being useful as well.
//
// ── What this surfaced ──
//
// The prompt asks for a numbered markdown list — "1.", "2.", "3.". The
// destination threads tweets visually and shows no numbers, so that
// numbering is SCAFFOLDING the user has to strip, or it gets posted and
// costs characters from a budget that is already tight. The sample here
// carries no numbers, which is what the artefact actually is.

import { BarChart3, Heart, Loader2, MessageCircle, Repeat2 } from "lucide-react";

import {
  LENGTH_LABEL,
  LENGTH_LIMIT,
  LENGTH_NOTE,
  LENGTHS,
  NEEDS_PREMIUM,
  TIMELINE_FOLD,
  type ThreadLength,
  type Tweet,
} from "./content";

/**
 * Split a tweet against its budget.
 *
 * Pure and React-free on purpose: this is the only real logic in the file,
 * it is the part worth testing, and the same split will be wanted by
 * anything that eventually validates generation output rather than merely
 * drawing it.
 */
export interface Budget {
  used: number;
  limit: number;
  /** Characters past the limit. 0 when the tweet fits. */
  over: number;
  /** The part that fits. */
  within: string;
  /** The part that does not. Empty when the tweet fits. */
  overflow: string;
}

export function budgetFor(text: string, limit: number): Budget {
  const used = text.length;
  const over = Math.max(0, used - limit);
  return {
    used,
    limit,
    over,
    within: over > 0 ? text.slice(0, limit) : text,
    overflow: over > 0 ? text.slice(limit) : "",
  };
}

/** A value the destination shows and this product does not have. */
function Blank({ label, width }: { label: string; width: string }) {
  return (
    <span
      className={`inline-block border-b border-dashed border-xn-ink-faint align-middle ${width}`}
      aria-label={`${label} — not available`}
    />
  );
}

/** Inert scenery in a tweet's action row. */
function FakeAction({ icon }: { icon: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xn-ink-soft">
      {icon}
      <Blank label="Count" width="w-5" />
    </span>
  );
}

function TweetCard({
  tweet,
  isLast,
  limit,
  showFold,
}: {
  tweet: Tweet;
  isLast: boolean;
  limit: number;
  /** Long posts are truncated in the timeline; mark where. */
  showFold: boolean;
}) {
  const budget = budgetFor(tweet.text, limit);
  const folds = showFold && tweet.text.length > TIMELINE_FOLD;

  return (
    <div className="flex gap-3">
      {/* ── The destination's half ── */}
      <article className="flex min-w-0 flex-1 gap-3">
        {/* Avatar column. The connector is a child of this column rather
            than an absolutely positioned overlay, so it stretches to
            whatever height the tweet turns out to be without anything
            measuring it. */}
        <div className="flex w-10 shrink-0 flex-col items-center">
          <span
            className="h-10 w-10 shrink-0 rounded-full border border-dashed border-xn-ink-faint"
            aria-label="Avatar — not available"
          />
          {!isLast && <span className="mt-1.5 w-px flex-1 bg-xn-border" aria-hidden="true" />}
        </div>

        <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-6"}`}>
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm">
            <Blank label="Display name" width="w-24" />
            <Blank label="Handle" width="w-16" />
            <span className="text-xn-ink-soft">·</span>
            <Blank label="Timestamp" width="w-8" />
          </p>

          {/* The overflow is marked rather than hidden or trimmed: the point
              is to show WHICH characters have to go. */}
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-xn-ink">
            {/* ── Two different boundaries, and only one is a failure ──

                `over` is characters the destination will REFUSE. Marked in
                danger, because the artefact cannot be posted.

                The fold is characters the destination will ACCEPT and then
                hide behind "Show more". Nothing is wrong; most readers just
                never see past it. Marking that in danger would be a lie, so
                it gets a rule and a label instead — the same distinction the
                video description's fold earned. */}
            {folds ? (
              <>
                {tweet.text.slice(0, TIMELINE_FOLD)}
                <span
                  className="mx-0.5 select-none whitespace-nowrap font-mono text-nano uppercase tracking-widest text-xn-ink-soft"
                  aria-label="Timeline fold — the destination hides everything after this behind Show more"
                >
                  {" "}— fold —{" "}
                </span>
                <span className="text-xn-ink-muted">
                  {tweet.text.slice(TIMELINE_FOLD)}
                </span>
              </>
            ) : (
              <>
                {budget.within}
                {budget.over > 0 && (
                  <mark className="rounded-[2px] bg-xn-danger-soft text-xn-danger">
                    {budget.overflow}
                  </mark>
                )}
              </>
            )}
          </p>

          <div
            className="mt-3 flex max-w-[380px] items-center justify-between"
            aria-hidden="true"
          >
            <FakeAction icon={<MessageCircle size={15} strokeWidth={1.75} />} />
            <FakeAction icon={<Repeat2 size={16} strokeWidth={1.75} />} />
            <FakeAction icon={<Heart size={15} strokeWidth={1.75} />} />
            <FakeAction icon={<BarChart3 size={15} strokeWidth={1.75} />} />
          </div>
        </div>
      </article>

      {/* ── Our half: the budget, outside the card ── */}
      <div className="w-[72px] shrink-0 pt-0.5 text-right">
        {budget.over > 0 ? (
          <>
            <span className="block font-mono text-micro font-semibold text-xn-danger">
              +{budget.over}
            </span>
            <span className="block text-nano leading-tight text-xn-danger">
              over limit
            </span>
          </>
        ) : (
          <span className="block font-mono text-micro text-xn-ink-faint">
            {budget.limit > 1000 ? budget.used : `${budget.used}/${budget.limit}`}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * The thread head — ours, not the destination's.
 *
 * ── Why length lives here and not in the bar ──
 *
 * The bar carries what is true for EVERY platform: which format this is,
 * which tone. Length is true of this platform only — a description has no
 * equivalent — so putting it in the bar would make a cross-platform surface
 * carry a control that is meaningless on four of five.
 *
 * It also would not fit. At the card's 720 the bar's two groups already need
 * 638 of 680, and a third group forces a second row.
 *
 * Postability sits here too, because a thread is postable only if EVERY
 * tweet is. That is a property of the set and belongs nowhere on an
 * individual card.
 */
function ThreadHead({
  length,
  onRequest,
  generating,
  ready,
  count,
  overCount,
}: {
  length: ThreadLength;
  onRequest: (next: ThreadLength) => void;
  generating: ThreadLength | null;
  ready: ReadonlySet<ThreadLength>;
  count: number;
  overCount: number;
}) {
  return (
    <div className="mb-5 border-b border-xn-border pb-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div
          className="inline-flex rounded-xn-pill bg-xn-surface-alt p-1"
          role="group"
          aria-label="Thread length"
        >
          {LENGTHS.map((l) => {
            const isGenerating = generating === l;
            return (
              <button
                key={l}
                type="button"
                onClick={() => onRequest(l)}
                aria-pressed={length === l}
                aria-busy={isGenerating || undefined}
                className={[
                  "inline-flex items-center gap-1.5 rounded-xn-pill px-3 py-1.5 text-sm transition-colors duration-xn ease-xn",
                  length === l && !generating
                    ? "bg-xn-ink text-xn-bg"
                    : "text-xn-ink-soft hover:text-xn-ink",
                ].join(" ")}
              >
                {LENGTH_LABEL[l]}
                {/* A length that has not been generated is marked, because
                    asking for it costs a model call and the user should know
                    that before clicking rather than after waiting. */}
                {!ready.has(l) && !isGenerating && (
                  <span
                    className="h-1 w-1 rounded-full bg-xn-ink-faint"
                    aria-label="not generated yet"
                  />
                )}
                {isGenerating && (
                  <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {/* A mode the account cannot send is the same shape of problem as a
              control with no destination: the user copies something and finds
              out at the paste box. Said here, before the copy. */}
          {NEEDS_PREMIUM.has(length) && (
            <span className="rounded-xn-pill bg-xn-surface-alt px-2.5 py-1 font-mono text-nano uppercase tracking-widest text-xn-ink-muted">
              Needs Premium
            </span>
          )}
          <span className="font-mono text-micro uppercase tracking-widest text-xn-ink-soft">
            {count} {count === 1 ? "post" : "posts"}
          </span>
          {overCount > 0 && (
            <span className="text-xs font-medium text-xn-danger">
              {overCount} cannot be posted as written
            </span>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs leading-snug text-xn-ink-soft">
        {generating
          ? `Generating the ${LENGTH_LABEL[generating].toLowerCase()} version…`
          : LENGTH_NOTE[length]}
      </p>
    </div>
  );
}

/**
 * The thread, CONTROLLED.
 *
 * Length used to be internal state here, and the route remounted this
 * component on tone change to reset it. That threw away artefacts the user
 * had already paid for the moment they returned to a tone — see the note in
 * `use-on-demand.ts`. Readiness lives with the route now, keyed by the
 * (tone, length) pair, and this component renders what it is told.
 */
export function XThread({
  threads,
  length,
  onRequestLength,
  lengthReady,
  lengthGenerating,
}: {
  threads: Record<ThreadLength, Tweet[]>;
  length: ThreadLength;
  onRequestLength: (next: ThreadLength) => void;
  lengthReady: ReadonlySet<ThreadLength>;
  lengthGenerating: ThreadLength | null;
}) {
  const tweets = threads[length];
  const limit = LENGTH_LIMIT[length];
  const overCount = tweets.filter((t) => budgetFor(t.text, limit).over > 0).length;

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <ThreadHead
        length={length}
        onRequest={onRequestLength}
        generating={lengthGenerating}
        ready={lengthReady}
        count={tweets.length}
        overCount={overCount}
      />

      {tweets.map((tweet, i) => (
        <TweetCard
          key={i}
          tweet={tweet}
          isLast={i === tweets.length - 1}
          limit={limit}
          showFold={NEEDS_PREMIUM.has(length)}
        />
      ))}
    </div>
  );
}
