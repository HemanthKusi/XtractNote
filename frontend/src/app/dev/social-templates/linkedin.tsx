"use client";

// src/app/dev/social-templates/linkedin.tsx
//
// The LinkedIn post preview: one artefact, and the first fold on this surface
// that is TWO budgets at once.
//
// ── Why this platform needed its own pass ──
//
// X's gutter exists because the limit is the point: a tweet over 280 cannot be
// posted, so the number is the most useful thing on the screen. LinkedIn
// inverts that. The ceiling is 3,000 characters and the prompt targets 150-300
// words — every one of the four samples here lands between 626 and 779, so the
// ceiling never comes close to binding. What decides whether the post is READ
// is the fold, and the fold is the only boundary this template argues about.
//
// ── The fold is two budgets, and the prompt fights one of them ──
//
// ~140 characters on mobile, ~210 on desktop, OR three lines, whichever runs
// out first — and blank lines spend a line. The prompt names the boundary
// ("a strong one-line hook that earns the 'see more' click"), gives no number
// for it, and then asks for "generous line breaks", which is the fastest way
// to spend three lines. The other four prompts were silent about their folds.
// This one actively works against its own.
//
// ── The finding that came out of building it ──
//
// On a post cut by LINES, the desktop fold lands at exactly the same character
// as the mobile one — 74 and 82 in the two samples that do it. Desktop's extra
// seventy characters buy NOTHING, because the line budget ran out before
// either character budget was touched. "Desktop is more generous" is false for
// precisely the copy shape the prompt asks for, which is why the readout below
// states both numbers rather than only the tighter one.
//
// ── One focusable element, and it cannot be verified in the pane ──
//
// The fold control is a real button: it truncates and reveals, as the
// destination does. That makes it the only focusable thing on the template,
// and `:focus` and `:hover` are not scriptable in the browser pane — so its
// focus ring is a MANUAL check, not one that was run here.
//
// ── No blanks on this template, and for once that costs nothing ──
//
// The newsletter masthead and three Instagram fields taught that a blank which
// IS the line reads as breakage. LinkedIn's action row is the first that needs
// no blank at all: its four controls carry TEXT LABELS, so the row is full
// without a single invented number. Reaction counts are omitted rather than
// drawn as empty bars — the same call Instagram's like count got.
//
// ── The reference confirmed the finding this template is built on ──
//
// The post Hemanth supplied folds after "🚀 Built and Tested a Wireless Mini
// Drone System", a blank line, and one more line — roughly 107 characters,
// well inside the 140. It was cut by LINES, with the blank line spending one
// of the three, which is the exact behaviour the `casual` and `funny` samples
// here demonstrate. The dual constraint is not inferred from guidance; it is
// visible in a real post.
//
// ── And it corrected six things built from memory ──
//
// The control says "more", not "see more". The action row stacks its icons
// ABOVE its labels and sets them bold and near-ink. The author block is three
// lines, not two. Follow is blue text with a leading "+", not the filled grey
// pill Instagram uses. The avatar is larger. Each is recorded at the component
// it belongs to.
//
// §13 already says a screenshot beats iterating toward one. This is the second
// platform where that was true, and the first where the reference also
// VALIDATED a measurement rather than only fixing an appearance.
//
// ── What is still approximated ──
//
// The card's width — the destination's feed column — is reasoned rather than
// measured, since the reference is cropped to the card and carries no page
// around it to measure against.

import { useState } from "react";

import { MessageSquare, MoreHorizontal, Plus, Repeat2, Send, ThumbsUp } from "lucide-react";

import { VideoThumbnail } from "@/components/ui/video-thumbnail";

import {
  foldAt,
  POST_FOLD,
  POST_FOLD_LINES,
  POST_LIMIT,
  VIDEO,
  type LinkedInCopy,
} from "./content";

/**
 * Our information about the post, OUTSIDE the destination's card.
 *
 * Same reasoning as X's budget gutter: the destination shows a composer ring
 * while you type and has no equivalent for an already-written post, so
 * painting our measurements into the card would make the preview lie about
 * what the user will see.
 *
 * The character count is deliberately quiet. It is the number that almost
 * never matters here, and giving it the emphasis X gives its budget would
 * point the reader at the wrong boundary.
 */
function PostHead({ post }: { post: string }) {
  const mobile = foldAt(post, POST_FOLD.mobile, POST_FOLD_LINES);
  const desktop = foldAt(post, POST_FOLD.desktop, POST_FOLD_LINES);

  // When the LINE budget is what cut the post, both devices stop at the same
  // character and desktop's larger allowance is irrelevant. Saying so is the
  // whole value of showing two numbers.
  const desktopAddsNothing =
    mobile.cause !== null && desktop.visible.length === mobile.visible.length;

  const over = post.length - POST_LIMIT;

  return (
    <div className="mb-5 border-b border-xn-border pb-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-mono text-micro uppercase tracking-widest text-xn-ink-soft">
          {mobile.cause === null ? (
            "No fold — the whole post shows"
          ) : (
            <>
              {/* The visible length and the budget are different numbers once
                  the cut snaps back to a word boundary, so the readout names
                  the budget that ran out rather than repeating the length. */}
              Folds at {mobile.visible.length} of {post.length} —{" "}
              <span className="text-xn-ink-muted">
                {mobile.cause === "lines"
                  ? `the ${POST_FOLD_LINES}-line budget`
                  : `the ${POST_FOLD.mobile}-character budget`}
              </span>
            </>
          )}
        </p>

        {/* The ceiling, kept faint because it is not the operative limit. It
            turns to danger only if a post ever actually exceeds it, which the
            prompt's word target makes unlikely rather than impossible. */}
        {over > 0 ? (
          <span className="font-mono text-micro font-semibold text-xn-danger">
            +{over} over {POST_LIMIT}
          </span>
        ) : (
          <span className="font-mono text-micro text-xn-ink-faint">
            {post.length}/{POST_LIMIT}
          </span>
        )}
      </div>

      <p className="mt-2 text-xs leading-snug text-xn-ink-soft">
        {mobile.cause === null ? (
          <>
            Short enough to clear both budgets: under {POST_FOLD.mobile} characters
            and within {POST_FOLD_LINES} lines.
          </>
        ) : desktopAddsNothing ? (
          <>
            Cut by the line budget, so desktop stops in the same place — its extra{" "}
            {POST_FOLD.desktop - POST_FOLD.mobile} characters show nothing more. Blank
            lines spend a line, and this opener spends two.
          </>
        ) : (
          <>
            Desktop shows {desktop.visible.length} characters, mobile{" "}
            {mobile.visible.length}. Mobile is the one that matters — it is where the
            reading happens.
          </>
        )}
      </p>
    </div>
  );
}

/**
 * The author row.
 *
 * ── Whose identity this is, which is an open product question ──
 *
 * It carries the SOURCE CHANNEL, consistent with the placement Hemanth
 * directed for Instagram. §13 records review's objection there — the creator of
 * the video is not the author of the post — and LinkedIn sharpens it, because
 * a post here is authored by a person and the second line is normally their
 * professional headline. It stands by direction, and is recorded as open in
 * both places rather than settled.
 *
 * The second line takes the video title, which is the nearest true thing we
 * hold to what the destination puts there. It is real data, so it is not a
 * blank — the distinction the newsletter masthead established.
 *
 * ── Corrected against a screenshot, which changed four things ──
 *
 * THE BLOCK IS THREE LINES, not two: name and connection degree, then the
 * professional headline, then a third line carrying time, an edited marker and
 * the audience globe. Built from memory it was two, which collapsed the
 * headline and the metadata into one idea when the destination keeps them
 * apart.
 *
 * FOLLOW IS BLUE TEXT WITH A LEADING "+", at the top right — and specifically
 * NOT the filled grey pill Instagram turned out to use. Two platforms, two
 * different treatments, and guessing from the other one would have been wrong
 * in a new way.
 *
 * THE AVATAR IS LARGER than Instagram's, near 56px, and it anchors the whole
 * block rather than sitting inside one line of it.
 *
 * ── What stays absent, and why that is not the screenshot being ignored ──
 *
 * The third line is dropped despite being in the reference, because every
 * value on it is one this product does not have: a post that has not been
 * published has no age, has not been edited, and has no audience setting. The
 * screenshot settles what the destination DRAWS; it does not hand us data. A
 * line rendered as "▁▁ • ▁▁ • ▁▁" would be three blanks that ARE the line,
 * which the newsletter masthead established reads as breakage.
 *
 * The connection degree goes for the same reason — there is no relationship
 * between a reader and an author who does not exist yet.
 */
function AuthorRow() {
  return (
    <div className="flex items-start gap-2.5 px-4 pt-3.5">
      {/* A circle with an edge, not a dashed placeholder: an account with no
          picture looks like this on the destination too. */}
      <span
        className="h-14 w-14 shrink-0 rounded-full border border-xn-border bg-xn-surface-alt"
        aria-label="Author avatar — not available"
      />

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="truncate text-base font-semibold leading-tight text-xn-ink">
          {VIDEO.channel}
        </p>
        {/* The headline's slot. The video title is the nearest true thing we
            hold to a professional headline, and it truncates here exactly as
            the reference's does. */}
        <p className="truncate text-xs leading-snug text-xn-ink-muted">{VIDEO.title}</p>
      </div>

      {/* Blue, through the same theme-aware pair the hashtags use — one
          constraint, two places, reasoned once in `Hashtags`. This is the
          control the reference draws in blue, and the mark beside it in the
          bar is the same brand at the same value in light. */}
      <span
        className="flex shrink-0 items-center gap-1 pt-0.5 text-sm font-semibold"
        style={{ color: "var(--xn-brand-linkedin)" }}
      >
        <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
        Follow
      </span>

      <MoreHorizontal
        size={20}
        strokeWidth={2}
        className="mt-0.5 shrink-0 text-xn-ink-soft"
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * The post body, cut where the destination cuts it.
 *
 * ── The fold is drawn inline and always, with no expand control ──
 *
 * Instagram's caption has a toggle. This one does not, and the difference is
 * the job each surface does. The point of this template is comparing where the
 * boundary lands across four tones; a control that hides the text below it
 * hides exactly the thing being judged. X's thread reached the same answer for
 * the same reason.
 *
 * It also avoids adding a focusable control whose states cannot be verified in
 * the browser pane, where `:focus` and `:hover` are not scriptable.
 *
 * The control uses the destination's own words, and the screenshot corrected
 * them: it reads "more" after an ellipsis belonging to the cut text — "…to
 * explore… more" — not "see more". That phrasing exists on other LinkedIn
 * surfaces, which is exactly why it was the wrong thing to recall.
 *
 * ── It TRUNCATES, and an earlier version of this was wrong to dim instead ──
 *
 * The first build showed the folded text dimmed rather than removed, arguing
 * that a specimen has to show what the fold costs. That was wrong twice over.
 *
 * It contradicted the platform next door: Instagram's caption already
 * truncates and says why — "the reader simply does not have the rest, and
 * drawing it would be drawing something that is not on their screen". Two
 * templates on one surface disagreeing about what a fold IS is the same class
 * of error as the two registries of format knowledge §13 records.
 *
 * And it answered the wrong question. What is being judged is where the
 * boundary lands and what survives it — which the truncated state shows
 * directly, and the dimmed state buries under the very text that is not
 * there. The collapsed state IS the thing under test.
 *
 * Expansion is one-way, as it is on the destination: the feed offers no way
 * back once a post is open.
 */
function Body({ post, expanded, onExpand }: {
  post: string;
  expanded: boolean;
  onExpand: () => void;
}) {
  const fold = foldAt(post, POST_FOLD.mobile, POST_FOLD_LINES);
  const folds = fold.cause !== null;

  return (
    <p className="whitespace-pre-wrap px-4 pt-3 text-sm leading-relaxed text-xn-ink">
      {expanded || !folds ? post : fold.visible}
      {folds && !expanded && (
        <>
          {"… "}
          <button
            type="button"
            onClick={onExpand}
            aria-expanded={false}
            className="rounded-xn-sm text-xn-ink-soft transition-colors duration-xn ease-xn hover:text-xn-ink-muted"
          >
            more
          </button>
        </>
      )}
    </p>
  );
}

/**
 * Hashtags, as their own block.
 *
 * ── They are blue, via a token PAIR, and the pair is the point ──
 *
 * The destination renders them as links, and a link is blue. An earlier
 * version of this file took ink instead and recorded why: text needs 4.5:1,
 * and no single value clears that against both `--xn-surface` grounds — it
 * would need a relative luminance at or below 0.183 for #ffffff and at or
 * above 0.217 for #161917, which is a contradiction rather than a tight fit.
 *
 * That arithmetic was right and the conclusion drawn from it was wrong. The
 * answer to "no single value works" is two values, which is what every format
 * colour in this project already does and what the mark table avoids only
 * because a mark needs 3:1. `--xn-brand-linkedin` is declared in both theme
 * blocks: 5.69:1 light, 8.15:1 dark.
 *
 * It is read through `var()` rather than a Tailwind class deliberately — it is
 * a destination's brand, not a product token, so it does not earn a utility in
 * the config beside `text-xn-ink`. The same reasoning keeps the mark colours
 * as inline values.
 *
 * ── Why they are a block at all ──
 *
 * The prompt asks for "3-5 relevant hashtags on the final line", which makes
 * them the tail of the prose. They are a separate payload — copied separately,
 * edited separately, and on some platforms posted separately — so rendering
 * them as the post's last paragraph is the one thing certain to be wrong. Two
 * platforms have now hit this.
 *
 * ── They are BELOW THE FOLD, and that is the argument, not a detail ──
 *
 * Making the fold real surfaced this. Hashtags sit at the end of the post, the
 * post is cut after three lines, so on the destination a reader who does not
 * click never sees them at all. The prompt's "on the final line" places them
 * exactly where they are guaranteed to be invisible.
 *
 * So they render only once the post is open, which is the truth. It also turns
 * the separate-payload argument from a tidiness point into a functional one:
 * as the tail of the prose they are buried, and as their own field the user
 * can put them where they actually work — a first comment, or the top of the
 * post.
 */
function Hashtags({ tags }: { tags: string[] }) {
  return (
    <p
      className="flex flex-wrap gap-x-2 gap-y-1 px-4 pt-2 text-sm font-medium"
      style={{ color: "var(--xn-brand-linkedin)" }}
    >
      {tags.map((tag) => (
        <span key={tag}>#{tag}</span>
      ))}
    </p>
  );
}

/**
 * The preview image.
 *
 * ── This is the one platform where the thumbnail we hold actually fits ──
 *
 * Instagram could not use it: 16:9 is the ratio that platform rewards least,
 * so the choice there was to crop away a third of someone else's image, ship
 * an empty slot, or generate a picture from the content. LinkedIn accepts
 * landscape media natively, and a post about a video legitimately shows that
 * video's thumbnail — it is what the destination pulls from the link on its
 * own.
 *
 * So the format whose primary content this product could not make, and the
 * format where the same asset drops straight in, are two platforms apart. The
 * difference is entirely the destination's aspect ratio, which is worth
 * remembering before assuming an asset problem is a product problem.
 *
 * ── Real data, and the component already owns its states ──
 *
 * `videoId` and `duration` are both metadata the app fetches today (§16.4),
 * so this is one of the few things on the surface that is not hand-written.
 * `VideoThumbnail` carries its own loading shimmer and its own fallback, which
 * is the loading-and-error requirement met by reuse rather than by a second
 * implementation.
 *
 * THE RATIO IS OWNED BY THE WRAPPER, not asserted at one width — the same trap
 * the description template records. `VideoThumbnail` takes a pixel height and
 * fills its parent, so a fixed height is 16:9 at exactly one width and wrong
 * at every other. `!h-full` overrides the component's INLINE height, which an
 * ordinary class cannot do.
 *
 * It is full-bleed and square-cornered: the destination's media runs edge to
 * edge of the card, so the rounding the description template gives it would be
 * wrong here.
 */
function Media() {
  return (
    <div className="mt-3 aspect-video">
      <VideoThumbnail
        videoId={VIDEO.videoId}
        duration={VIDEO.duration}
        label="video"
        className="!h-full"
      />
    </div>
  );
}

/**
 * The action row — the first on this surface that needs no blanks.
 *
 * Each control carries a text label, so the row is full of real content
 * without a single count this product does not have.
 *
 * ── Two things the screenshot corrected ──
 *
 * THE ICON SITS ABOVE THE LABEL, not beside it. Built horizontally from memory
 * it read as a toolbar; stacked, it reads as the destination's action bar,
 * which is a different object.
 *
 * THE LABELS ARE BOLD AND NEARLY FULL INK. They were muted and medium here,
 * on the reasoning that inert scenery should recede. That reasoning is right
 * for a COUNT — X's blanks recede correctly — and wrong for these, which are
 * the most prominent text in the destination's footer. Quieting them made the
 * card look disabled.
 *
 * ── What is above it in the reference and absent here ──
 *
 * The destination puts a reaction row between the media and this one: stacked
 * reaction glyphs with a total, then comments and reposts. Every value in it
 * is a count this product does not have, so the whole row goes rather than
 * becoming three blanks — the same call Instagram's like count got. Its
 * divider stays, because the divider is structure rather than data.
 *
 * Inert by construction, like Instagram's and X's: spans inside an
 * `aria-hidden` wrapper, so nothing here is focusable or announced.
 *
 * The template has exactly ONE focusable element, and it is not in this row —
 * it is the fold control in `Body`, which matches the description template.
 */
function Actions() {
  const actions = [
    { label: "Like", icon: <ThumbsUp size={20} strokeWidth={1.75} /> },
    { label: "Comment", icon: <MessageSquare size={20} strokeWidth={1.75} /> },
    { label: "Repost", icon: <Repeat2 size={21} strokeWidth={1.75} /> },
    { label: "Send", icon: <Send size={19} strokeWidth={1.75} /> },
  ];

  return (
    <div className="mt-3 border-t border-xn-border px-2 py-1" aria-hidden="true">
      <div className="flex items-stretch justify-between">
        {actions.map(({ label, icon }) => (
          <span
            key={label}
            className="inline-flex flex-1 flex-col items-center justify-center gap-1 rounded-xn-sm px-2 py-2 text-xs font-semibold text-xn-ink-muted"
          >
            {icon}
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The post.
 *
 * ── The width is approximate and named as such ──
 *
 * The destination's feed column is narrower than X's, and 555 is the figure
 * this is built to. It is reasoned from the destination's proportions rather
 * than measured from it, so it belongs on the same list as the missing Follow
 * control: a thing one screenshot would settle.
 */
export function LinkedIn({ copy }: { copy: LinkedInCopy }) {
  // The post as the destination composes it: hook, body, then the call to
  // engagement. Hashtags are NOT part of this string — see `Hashtags`.
  const post = [copy.hook, ...copy.body, copy.cta].join("\n\n");

  // Collapsed by default, because collapsed is what a reader is served.
  // Reset per tone: each tone is a different artefact with its own fold, and
  // carrying an expanded state across would show one tone's post opened
  // because a different one had been. `key` on the caller does this — see the
  // note there.
  const [expanded, setExpanded] = useState(false);

  const folds = foldAt(post, POST_FOLD.mobile, POST_FOLD_LINES).cause !== null;

  return (
    <div className="mx-auto w-full max-w-[555px]">
      <PostHead post={post} />

      <div className="overflow-hidden rounded-xn-md border border-xn-border bg-xn-surface pb-1">
        <AuthorRow />

        {/* Text first, then the media. That is the destination's order and the
            reference's: the words carry the post and the image supports them,
            which is the opposite of Instagram, where the picture IS the post
            and the caption sits under it. Same product, same video, two
            formats that disagree about which half leads. */}
        <Body post={post} expanded={expanded} onExpand={() => setExpanded(true)} />

        {/* Below the fold on the destination, so below it here. */}
        {(expanded || !folds) && <Hashtags tags={copy.hashtags} />}

        <Media />
        <Actions />
      </div>
    </div>
  );
}
