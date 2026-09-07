"use client";

// src/app/dev/create-directions/direction-launchpad.tsx
//
// DIRECTION A — Launchpad (CONSOLIDATED)
//
// No longer one of four competing directions. This is the merge: the phase
// that won from each, assembled into a single candidate.
//
//   idle        Launchpad — input, drafts, recommendations
//   results     Launchpad's heading scale + Workspace's listing layout
//   ready       Gallery, plus in-card Change video / Open in YouTube
//   picking     Marquee — the seven as large type rows in their own colours
//   generating  Marquee's content in a new layout: source card with inline
//               progress, then a timed pipeline beneath it
//   error       Launchpad
//
// ── The two things on this page that the backend cannot do yet ──
//
// 1. Drafts. generated_content.status has 'draft' and DEFAULTS to it, but
//    content.ts hardcodes "saved", so none can exist. Agreed destination is
//    interrupted runs, which additionally needs generation_jobs and async
//    generation.
//
//    DECIDED — how drafts relate to History:
//
//    Drafts appear in History's main list ALONGSIDE saved items, carrying a
//    tag, AND History gains a filter so they can be viewed on their own. The
//    band above links to that filter rather than to History generally.
//
//    What that costs, and none of it exists yet:
//      - listContent() does not select `status` at all, let alone filter on
//        it. Today it returns every row for the user and works only because
//        every row is hardcoded 'saved'. It needs the column, and a filter
//        parameter for the drafts view.
//      - History rows need to render the tag. <Chip status="draft" /> ships
//        already and renders "Draft"; passing children overrides the word if
//        "Pending" is preferred, at the cost of diverging from the schema
//        value.
//      - The filter is new UI on a surface that is not designed yet —
//        History is step 7 in the sequence. Deciding this now means deciding
//        part of that surface ahead of time, which is fine, but it is a
//        constraint that arrived here rather than there.
//
//    DECIDED — drafts expire after 7 DAYS. Settled, not a placeholder.
//
//    Expiry needs a cleanup job, and the window has to be stated wherever a
//    draft is shown. That is not decoration: History is permanent, drafts are
//    not, and the two now share a list — so a row can disappear from a list
//    where every neighbour is permanent. A row that silently vanishes is
//    worse than one that was never there.
//
//    7 days is short enough that the band stays a genuine "where you left
//    off" rather than an archive, and it is the reason the notice sits under
//    the list rather than only in a settings page nobody opens. It also
//    raises a case worth designing when History is built: a draft on its last
//    day, sitting in a list of things that will still be there next month.
//
// 2. The generating screen, and this is the larger one. Per-stage events,
//    elapsed and remaining times, a percentage, a cancel, and the promise
//    that work continues after you close the tab — none of that exists.
//    generate.py is a single synchronous LangChain call. See the PIPELINE
//    comment in shared.tsx for the itemised list.
//
// Neither is a reason not to design them. Both are a reason not to ship this
// screen against the current backend.

import { useState } from "react";

import { ContentTypePicker } from "@/components/create/content-type-picker";
import { SocialPlatformPicker } from "@/components/create/social-platform-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HeroInput } from "@/components/ui/hero-input";
import { Modal } from "@/components/ui/modal";
import { contentTypeColors } from "@/lib/constants/theme";
import type {
  GeneratableContentType,
  SocialPlatform,
} from "@/lib/content/types";

import {
  AlertGlyph,
  CURRENT_STAGE,
  CheckGlyph,
  ChevronGlyph,
  DRAFTS,
  DRAFTS_COLLAPSED,
  DraftList,
  ELAPSED,
  ERROR_COPY,
  ExternalGlyph,
  LinkGlyph,
  PERCENT,
  PIPELINE,
  PLACEHOLDERS,
  RECOMMENDED,
  RefreshGlyph,
  SEARCH_RESULTS,
  SectionHead,
  Thumb,
  VIDEO,
  duration,
  views,
  type Clip,
  type Phase,
} from "./shared";

// ── Pieces ──────────────────────────────────────────────────

/**
 * A browsable video — a search result OR a recommendation.
 *
 * Bare thumbnail with its details beneath it, and no card around either.
 * Workspace's layout at Launchpad's type scale.
 *
 * ── Why recommendations dropped their own tile ──
 *
 * They had a separate card-wrapped layout, which drew a distinction that does
 * not exist: a recommended video and a searched video are the same kind of
 * thing and afford the same action. The card was also a second boundary
 * around a boundary — a result grid already separates its items.
 *
 * Container-derived columns, never viewport breakpoints: the menu alone moves
 * this column by 168px, so any `md:` here fires at a width the content area
 * never actually has.
 */
function ResultItem({ clip }: { clip: Clip }) {
  return (
    <button type="button" className="group flex flex-col text-left">
      <Thumb
        videoId={clip.videoId}
        src={clip.thumbnailUrl}
        orientation={clip.orientation}
        size="tile"
      />
      <span className="mt-2.5 line-clamp-2 block text-ui font-medium leading-snug text-xn-ink">
        {clip.title}
      </span>
      <span className="mt-1 block text-sm text-xn-ink-soft">
        {clip.channel}
      </span>
      <span className="mt-0.5 block text-xs text-xn-ink-soft">
        {views(clip.viewCount)} · {duration(clip.durationSeconds)}
      </span>
    </button>
  );
}

/**
 * The source, as a card with its own actions.
 *
 * Gallery's composition. The actions live INSIDE the card because they act on
 * the card's subject — a Change button floating in the page header acts on
 * "the page", which is vaguer than it sounds once a second video-shaped thing
 * appears on screen.
 *
 * `actions` is a prop rather than a flag so the generating phase can reuse
 * this exact card with nothing in the footer.
 */
function SourceCard({ actions }: { actions?: React.ReactNode }) {
  return (
    <Card variant="default" padding="none">
      <div className="flex flex-wrap items-center gap-4 p-3">
        <Thumb videoId={VIDEO.videoId} orientation="landscape" size="tile" />
        <div className="min-w-[220px] flex-1">
          <p className="line-clamp-2 text-h5 leading-snug text-xn-ink">
            {VIDEO.title}
          </p>
          <p className="mt-1.5 text-sm text-xn-ink-muted">
            {VIDEO.channel} · {duration(VIDEO.durationSeconds ?? null)} ·
            Transcript ready
          </p>
          {actions && <div className="mt-3 flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    </Card>
  );
}

// ── The direction ───────────────────────────────────────────

export function DirectionLaunchpad({ phase }: { phase: Phase }) {
  const [type, setType] = useState<GeneratableContentType | null>("notes");
  const [platform, setPlatform] = useState<SocialPlatform | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);

  const chosen = type ? contentTypeColors[type] : null;

  /**
   * Choosing a format clears the platform unless the format is social.
   *
   * Without this, picking a platform and then switching to another format
   * leaves the brand pill sitting on the social tile — the picker shows it
   * whenever `selectedPlatform` is non-null, so a stale value keeps rendering
   * a choice the user has moved away from. Generate would also stay gated on
   * a platform belonging to a format nobody selected.
   *
   * The shipped page already does exactly this (create/page.tsx: `setType`
   * then `if (type !== "social") setSelectedPlatform(null)`). This specimen
   * passed the setter straight to onSelect and dropped the guard, which is
   * how the bug got here — it is mine, not the product's.
   */
  function handleSelectType(next: GeneratableContentType) {
    setType(next);
    if (next !== "social") setPlatform(null);
  }

  const field = (
    <HeroInput
      placeholders={PLACEHOLDERS}
      prefix={<LinkGlyph />}
      error={phase === "error"}
      suffix={
        <Button variant="primary" size="md">
          Convert
        </Button>
      }
    />
  );

  // ── idle / error ──────────────────────────────────────────
  if (phase === "idle" || phase === "error") {
    return (
      <div className="py-10">
        <header className="mb-6">
          <h1 className="text-h3 text-xn-ink">Create</h1>
          <p className="mt-2 text-body text-xn-ink-muted">
            Paste a link, search a topic, or start from something below.
          </p>
        </header>

        {field}

        {phase === "error" && (
          <p className="mt-3 flex items-start gap-2 text-sm text-xn-danger">
            <AlertGlyph className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{ERROR_COPY}</span>
          </p>
        )}

        {/* ── Unfinished work ──
            The action goes to History FILTERED TO DRAFTS, not to History
            generally. "All history" was a reflex and meant nothing: this band
            shows drafts, so the way onward is more drafts.

            Drafts do also appear in History's main list, tagged — see the
            header comment for what that costs to build. */}
        {/* ── Unfinished work ──
            Expands IN PLACE rather than navigating. The 7-day window caps how
            many drafts can exist, so this list is short by construction —
            sending someone to another page to read six rows costs a
            navigation and a way back for no gain. The chevron says which it
            does: it rotates rather than pointing away. */}
        <section className="mt-10">
          {/* No action here. Refresh belongs to the recommendations below —
              these are your own drafts, and there is nothing to re-roll. */}
          <SectionHead>Pick up where you left off</SectionHead>

          <DraftList
            drafts={draftsOpen ? DRAFTS : DRAFTS.slice(0, DRAFTS_COLLAPSED)}
          />

          {/* The expiry notice sits BESIDE the button, not pushed to the far
              edge. `justify-between` had thrown it against the right margin,
              which read as a corner stamp — the kind of text the eye files as
              chrome and skips. It is not chrome: it is the one line that says
              this list empties itself, and the only warning a user gets before
              something disappears.

              Beside the control it relates to, at the chrome type step rather
              than the smallest one, it is read at the moment someone is
              looking at how many drafts they have. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {DRAFTS.length > DRAFTS_COLLAPSED && (
              <Button
                variant="default"
                size="sm"
                aria-expanded={draftsOpen}
                onClick={() => setDraftsOpen((open) => !open)}
                icon={
                  <ChevronGlyph
                    className={[
                      "h-3.5 w-3.5 transition-transform duration-xn ease-xn",
                      draftsOpen ? "rotate-180" : "",
                    ].join(" ")}
                  />
                }
              >
                {draftsOpen
                  ? "Show fewer"
                  : `Show all drafts (${DRAFTS.length})`}
              </Button>
            )}
            <p className="text-sm text-xn-ink-muted">
              Drafts are kept for 7 days.
            </p>
          </div>
        </section>

        {/* Recommendations use the SAME layout as topic results, because they
            are the same kind of thing: a browsable video you might pick. Two
            layouts for one data type was the difference that had no meaning. */}
        <section className="mt-10">
          <SectionHead
            action={
              <Button
                variant="default"
                size="sm"
                icon={<RefreshGlyph className="h-3.5 w-3.5" />}
              >
                Refresh
              </Button>
            }
          >
            Worth converting
          </SectionHead>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-x-5 gap-y-7">
            {RECOMMENDED.map((clip) => (
              <ResultItem key={clip.videoId} clip={clip} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  // ── topic results ─────────────────────────────────────────
  if (phase === "results") {
    return (
      <div className="py-10">
        <header className="mb-6">
          <h1 className="text-h3 text-xn-ink">Create</h1>
        </header>
        {field}
        <section className="mt-9">
          <SectionHead>Results for “how transformers work”</SectionHead>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-x-5 gap-y-7">
            {SEARCH_RESULTS.map((clip) => (
              <ResultItem key={clip.videoId} clip={clip} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  // ── source ready / choosing a format ──────────────────────
  //
  // ONE screen, not two. The "Choose a format" button is gone: it was a step
  // whose only job was to reveal the next step, so the formats sit directly
  // under the source instead and the run loses a click.
  //
  // `ready` and `picking` therefore render identically and differ only by
  // whether a format is selected — which is the honest relationship between
  // them once the button in between disappears.
  if (phase === "ready" || phase === "picking") {
    return (
      <div className="py-10">
        <SectionHead>Using this video</SectionHead>
        <SourceCard
          actions={
            <>
              {/* `default`, not `ghost`. The component documents default as
                  "most common — Cancel, Back" and ghost as "toolbar icons,
                  subtle actions". These are the source's ordinary secondary
                  actions sitting beside a primary, which is the default case;
                  the ghosts on this page are the section-header links, which
                  is the subtle one. */}
              <Button variant="default" size="sm">
                Change video
              </Button>

              {/* ── An anchor wearing the button's clothes, deliberately ──

                  This has to stay a real <a href>. PR #359 records the exact
                  cost of not doing that: the menu's rows were <button onSelect>
                  in the specimen and would have shipped without middle-click,
                  open-in-new-tab, or a status-bar URL. An external link is the
                  case where that matters most.

                  Button renders a <button> and has no href or `as` prop, so
                  matching it visually means repeating its classes here. That
                  duplication is the real finding: the design system has no
                  link-shaped button. The right fix is a link mode on Button,
                  not this — and if this direction ships, this is the block to
                  delete. */}
              <a
                href={VIDEO.url}
                target="_blank"
                rel="noopener noreferrer"
                className={[
                  "inline-flex items-center justify-center gap-1.5",
                  "rounded-xn-pill font-medium whitespace-nowrap select-none",
                  "border cursor-pointer px-3.5 py-2 text-sm",
                  // ghost: transparent until hovered
                  "bg-transparent border-transparent text-xn-ink-muted",
                  "transition-[box-shadow,transform,background-color,color] duration-xn ease-xn",
                  "hover:-translate-y-0.5 hover:bg-xn-surface hover:text-xn-ink hover:shadow-xn-lift",
                  "active:translate-y-px active:bg-xn-surface-alt active:shadow-xn-press",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xn-ink",
                ].join(" ")}
              >
                Open in YouTube
                <ExternalGlyph className="h-3 w-3" />
              </a>
            </>
          }
        />

        <div className="mt-9">
          <SectionHead>What should it become?</SectionHead>
          {/* Marquee's picking phase, which used the shipped picker — its
              icon-forward tiles, hover zoom, selected state in the format's
              own colour, and the social brand pill. */}
          <ContentTypePicker
            selected={phase === "picking" ? type : null}
            onSelect={handleSelectType}
            selectedPlatform={platform}
          />
          <SocialPlatformPicker
            visible={phase === "picking" && type === "social"}
            selected={platform}
            onSelect={setPlatform}
            className="mt-5"
          />
          <div className="mt-7">
            <Button
              variant="primary"
              size="lg"
              disabled={
                phase !== "picking" || !type || (type === "social" && !platform)
              }
            >
              {phase === "picking" && chosen
                ? `Make ${chosen.label.toLowerCase()}`
                : "Pick a format"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── generating ────────────────────────────────────────────
  // The layout asked for: a centred pair of lines, the source card with its
  // progress inline and no actions, then the timed pipeline beneath it, then
  // the two escapes.
  return (
    <div className="py-10">
      {/* The estimate is gone from this pair on purpose. "Usually about 90
          seconds" is a promise nothing can keep — nothing times these stages,
          and a figure that is wrong on a long video is worse than no figure.
          The wording about the tab is also now literal: leave it OPEN in the
          background. Saying "you can leave this tab" reads as "you can close
          it", which is the one thing that would lose the run. */}
      <header className="mb-8 text-center">
        <h1 className="text-h3 text-xn-ink">
          Reading the video, taking notes for you…
        </h1>
        <p className="mt-2 text-body text-xn-ink-muted">
          You can leave this tab open in the background — we&apos;ll keep going.
        </p>
      </header>

      {/* Source, with progress in place of the actions. */}
      <Card variant="default" padding="none">
        <div className="flex flex-wrap items-center gap-4 p-3">
          <Thumb videoId={VIDEO.videoId} orientation="landscape" size="tile" />
          <div className="min-w-[260px] flex-1">
            <p className="line-clamp-2 text-h5 leading-snug text-xn-ink">
              {VIDEO.title}
            </p>
            <p className="mt-1.5 text-sm text-xn-ink-muted">
              {VIDEO.channel} · creating{" "}
              <span className="font-semibold" style={{ color: chosen?.color }}>
                {chosen?.label}
              </span>
            </p>

            {/* The bar takes the format's colour. That is not a liberty:
                the content-type registry lists "progress bar during
                generation" as one of the identity colour's own uses. */}
            <div
              className="mt-3 h-1.5 w-full overflow-hidden rounded-xn-pill bg-xn-ink-faint"
              role="progressbar"
              aria-valuenow={PERCENT}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-xn-pill transition-[width] duration-xn-slow ease-xn"
                style={{
                  width: `${PERCENT}%`,
                  backgroundColor: chosen?.color,
                }}
              />
            </div>
            <p className="mt-2 font-mono text-micro text-xn-ink-soft">
              {PERCENT}% · {ELAPSED} sec elapsed
            </p>
          </div>
        </div>
      </Card>

      {/* The pipeline, timed. */}
      <Card variant="default" padding="none" className="mt-4">
        <ol className="flex flex-col">
          {PIPELINE.map((stage, index) => {
            const done = index < CURRENT_STAGE;
            const active = index === CURRENT_STAGE;

            return (
              <li
                key={stage.label}
                className="flex items-center gap-4 border-b border-xn-border px-4 py-3.5 last:border-b-0"
              >
                <span
                  className={[
                    "grid h-7 w-7 shrink-0 place-items-center rounded-xn-pill border-2",
                    done ? "border-xn-ink bg-xn-ink" : "",
                    active ? "" : done ? "" : "border-xn-border",
                  ].join(" ")}
                  style={
                    active
                      ? { borderColor: chosen?.color }
                      : undefined
                  }
                  aria-hidden="true"
                >
                  {done && <CheckGlyph className="h-3.5 w-3.5 text-xn-bg" />}
                  {active && (
                    <span
                      className="h-2.5 w-2.5 rounded-xn-pill"
                      style={{ backgroundColor: chosen?.color }}
                    />
                  )}
                </span>

                <span
                  className={[
                    "flex-1 text-h5",
                    done
                      ? "text-xn-ink"
                      : active
                        ? "text-xn-ink"
                        : "text-xn-ink-soft",
                  ].join(" ")}
                >
                  {stage.label}
                </span>

                {/* Three dots while a stage is running. Held to the
                    reduced-motion setting like everything else. */}
                {active && (
                  <span
                    className="flex shrink-0 items-center gap-1"
                    aria-hidden="true"
                  >
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="h-1 w-1 rounded-xn-pill animate-shimmer motion-reduce:animate-none"
                        style={{
                          backgroundColor: chosen?.color,
                          animationDelay: `${dot * 160}ms`,
                        }}
                      />
                    ))}
                  </span>
                )}

                {/* Only what actually happened. A completed stage reports the
                    time it took; a pending one reports nothing, because an
                    estimate here would be invented — no stage is timed and
                    none of these durations exists. */}
                <span className="w-12 shrink-0 text-right font-mono text-micro text-xn-ink-muted">
                  {done ? `${stage.took}s` : ""}
                </span>
              </li>
            );
          })}
        </ol>
      </Card>

      {/* "Notify me by email" is gone — that feature is not being worked on,
          and an escape hatch that does nothing is worse than no escape hatch.
          Cancel stands alone, which also stops a destructive action sitting
          beside a convenience toggle at identical weight. */}
      <div className="mt-6 flex items-center justify-center">
        <Button variant="danger" onClick={() => setConfirmCancel(true)}>
          Cancel generation
        </Button>
      </div>

      {/* ── The confirm ──

          NOT `persistent`. That flag is for cases where accidental dismissal
          is dangerous, and here the danger runs the other way: dismissing this
          means "keep generating", which is the safe outcome. Backdrop click
          and Escape should both mean no. Making it persistent would force a
          decision from someone whose actual problem was a mis-click.

          The destructive choice is therefore the only thing that needs
          deliberate weight — it is the `danger` button, and it is second, so
          the harmless option is what the eye and the keyboard reach first. */}
      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Stop generating?"
        // "drafts", plural — it names the band on the create page and the
        // History filter, both of which are a collection. "your draft" would
        // point at a specific one that does not exist yet: a cancelled run has
        // produced no content, only the video and the format it was going to
        // become, which is exactly what the drafts entry holds. Saying "list"
        // was vaguer still — the user has several lists.
        description="This run will be discarded, and the credits it used are not refunded. The video stays in your drafts, so you can start again whenever you like."
        size="lg"
        // `primary` on the safe action. It is the recommended way out, it is
        // what the dialog wants you to pick, and pairing it against a solid
        // danger fill makes the two read as a real choice rather than as one
        // loud button beside a quiet one.
        //
        // No wrapper: Modal's footer slot is already a right-aligned flex row
        // with the same gap, so a div here nested one inside the other.
        footer={
          <>
            <Button variant="primary" onClick={() => setConfirmCancel(false)}>
              Keep generating
            </Button>
            <Button variant="danger" onClick={() => setConfirmCancel(false)}>
              Stop and discard
            </Button>
          </>
        }
      />
    </div>
  );
}
