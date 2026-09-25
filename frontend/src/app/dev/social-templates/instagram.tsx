"use client";

// src/app/dev/social-templates/instagram.tsx
//
// The post: an image with words under it.
//
// ── The problem this format actually has ──
//
// Instagram is the only one of the five whose PRIMARY CONTENT this product
// cannot produce. The post is the picture; the caption is what sits beneath
// it. All we hold is a 16:9 thumbnail belonging to someone else, at the
// aspect ratio the platform rewards least, and frame extraction is deferred
// (§14).
//
// Three answers were possible and two of them ship something unusable:
//
//   CROP THE THUMBNAIL — real data, no new capability, and a third of
//     someone else's image cut away. YouTube thumbnails put their text at the
//     edges, so the third that goes is usually the third that said anything.
//
//   LEAVE THE SLOT EMPTY — honest about today, and a preview of a post that
//     cannot be posted.
//
//   DESIGN THE IMAGE FROM THE CONTENT — the only one that yields something a
//     person would publish. Chosen, and then extended into a CAROUSEL, which
//     is the format explainer content is actually saved from on this
//     platform.
//
// ── What choosing it commits the product to ──
//
// Generating IMAGES, which this product has never done — and several of them,
// since the carousel is the format that earns the save. That is the largest
// claim any of these templates makes, and it is deliberately confined to one
// component: replace `Carousel` with a cropped thumbnail and nothing else in
// this file moves.
//
// It is not, however, a large technical claim. The card is type on a coloured
// ground — no model, no frame extraction, no new dependency. What it needs is
// a renderer that turns the same text into an image server-side, which is
// ordinary work rather than new capability.
//
// ── 4:5, not 1:1 ──
//
// Square is the shape people picture, and portrait is the shape the feed
// gives the most room to. A preview exists to show what the post will be, not
// what a post used to be.

import { useState } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
} from "lucide-react";

import { CAPTION_FOLD, VIDEO, type InstagramCopy } from "./content";

// ── Nothing on this template is a blank any more ──
//
// Three fields were drawn as blanks and all three are gone. The like count
// left the word "likes" floating after an empty bar. The caption's username
// prefix put a grey rectangle in front of the first word you were meant to
// read. The account name was a blank until the channel — real data we hold —
// took its place.
//
// This is the newsletter masthead again, three times. A blank is honest on a
// line that has other content: a timestamp beside a name, a count beside an
// icon. When the blank IS the line, or stands in front of the thing you are
// reading, it reads as breakage rather than as absence.
//
// The one field still missing is the avatar, and it stays a shape rather than
// a dashed placeholder — a circle with an edge is what an account without a
// picture looks like on the destination too.

/**
 * The story ring, copied from the picker's `PLATFORM_SKIN`.
 *
 * It is the only place a gradient is correct on these templates: it is the
 * destination's own furniture around an avatar, not a colour applied to our
 * content. Duplicated rather than imported for the same reason the other
 * brand values are, and it wants promoting with them.
 */
const IG_RING =
  "linear-gradient(45deg, #405DE6, #5B51DB, #B33AB4, #C135B4, #E1306C, #FD1F1F)";

/**
 * The card's own colours, which do NOT follow the theme.
 *
 * ── Why it was wrong ──
 *
 * The ground was `bg-xn-fmt-social` and the type `text-xn-bg`, so both
 * flipped with the theme. In dark that made the ground rgb(79,211,201) at
 * luminance 0.525 — three times lighter than light mode's, leaping off the
 * page at 11.49 — with near-black type on it. A glowing slab.
 *
 * The immediate cause is the one §13 already names: the format token is
 * tuned to be legible as INK on a dark ground, and a colour tuned for ink
 * glares when it is used as a large fill. Envelopes are not ink.
 *
 * ── The better reason ──
 *
 * This card is not UI. It is a PICTURE that gets posted, and a picture does
 * not re-theme itself because the app previewing it switched to dark. Whoever
 * scrolls past it on Instagram sees one artefact, lit one way. A preview that
 * changed its colours with our theme was lying about the thing it previews.
 *
 * So these are fixed values, taken from what light mode already rendered —
 * light is unchanged to the pixel, and dark now shows the same card rather
 * than an inverted one.
 */
const CARD_GROUND = "#117E78";
const CARD_INK = "#F8F9F7";

/**
 * The carousel, which is what an explainer post on this platform actually is.
 *
 * ── Why a carousel and not one card ──
 *
 * A single image is a post people scroll past. A carousel is the format
 * educational content is saved from, because each swipe is a decision to
 * continue and the last slide is reached by people who chose to be there.
 *
 * It also fits what we have exactly: the hook is written to stop the scroll,
 * each body paragraph is one idea, and the call to action belongs at the end.
 * No content is invented to fill it — the slides ARE the caption, cut at the
 * boundaries the copy already has.
 *
 * ── The consequence for generation ──
 *
 * The body must arrive as separate paragraphs rather than one block, because
 * a paragraph is a slide. That is already how `InstagramCopy` is typed, and
 * it is a thing to ask generation for rather than parse out afterwards.
 */
function Carousel({ copy }: { copy: InstagramCopy }) {
  const slides = [
    { kind: "hook" as const, text: copy.hook },
    ...copy.body.map((text) => ({ kind: "point" as const, text })),
    { kind: "cta" as const, text: copy.cta },
  ];
  const [index, setIndex] = useState(0);
  const slide = slides[index];

  const go = (next: number) => setIndex(Math.min(Math.max(next, 0), slides.length - 1));

  return (
    // ── How you actually move through it ──
    //
    // Dots alone were the only way through, and a 6px dot is far under the
    // 24px minimum target — on a phone you swipe, and on a desktop there was
    // nothing but a hard-to-hit dot.
    //
    // Three ways now, which is what the destination offers: chevrons at the
    // media edges, arrow keys, and the dots. The chevrons appear on hover the
    // way the destination's do, but they are ALWAYS in the DOM and always
    // focusable — a control that only exists on hover cannot be reached by a
    // keyboard at all, and hover is not a thing a touch screen has.
    //
    // The arrow keys are handled on the wrapper rather than on a focusable
    // region of its own, so they work whenever any control inside has focus
    // without adding a tab stop that does nothing on its own.
    <div
      className="group bg-xn-surface"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") go(index - 1);
        if (event.key === "ArrowRight") go(index + 1);
      }}
    >
      <div className="relative aspect-[4/5]" style={{ backgroundColor: CARD_GROUND }}>
        {/* ── The horizontal padding clears the chevrons, but only where
            there are chevrons to clear ──

            They sit at 6px and are 44 wide, so anything starting before 50 is
            underneath one, and the text used to begin at 28. On the
            destination this never comes up: the thing behind the arrows is a
            photograph and a photograph does not mind being covered. Here the
            picture IS the type, so the type moved.

            56px each side is right at the card's full width and wrong at a
            phone's. Measured: a 272px card gives the text 158px, the longest
            body paragraph runs to 391px against a 338px card, and 54px of it
            is cut off by the parent's `overflow-hidden`.

            So the clearance applies from `sm` upward. Below it the chevrons
            are not reachable anyway — they are revealed by hover, and a touch
            screen has none — so the padding they exist for is padding nobody
            is paying for. */}
        <div className="flex h-full items-center px-6 py-8 sm:px-14">
          {/* Nothing but the words.

              The slide used to carry a counter top-left and the video's
              duration bottom-right. The counter said exactly what the pill
              top-right already says, and a number repeated twice on one
              picture is a number nobody reads. The duration belonged to a
              different artefact.

              The channel moved to the account row, where the destination puts
              it and where it is said once.

              The hook is the stop-the-scroll line so it gets the largest type.
              A point is prose and takes a size you can read a paragraph at;
              setting it as big as the hook would make every slide shout. */}
          <p
            style={{ color: CARD_INK }}
            className={[
              slide.kind === "point"
                ? "text-body leading-body"
                : "font-serif text-h3 leading-tight",
            ].join(" ")}
          >
            {slide.text}
          </p>
        </div>

        {/* Counter, where the destination puts it. */}
        <span
          className="absolute right-3 top-3 rounded-xn-pill px-2.5 py-1 font-mono text-micro"
          style={{ backgroundColor: "rgba(10,14,13,0.45)", color: CARD_INK }}
          aria-hidden="true"
        >
          {index + 1}/{slides.length}
        </span>

        {/* Hidden at the ends rather than disabled: the destination removes
            the arrow when there is nothing that way, and a disabled control
            that never becomes enabled is furniture. */}
        {index > 0 && (
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full bg-xn-bg/90 p-3 text-xn-ink opacity-0 transition-opacity duration-xn ease-xn focus-visible:opacity-100 group-hover:opacity-100"
          >
            <ChevronLeft size={20} strokeWidth={2.25} />
          </button>
        )}
        {index < slides.length - 1 && (
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-xn-bg/90 p-3 text-xn-ink opacity-0 transition-opacity duration-xn ease-xn focus-visible:opacity-100 group-hover:opacity-100"
          >
            <ChevronRight size={20} strokeWidth={2.25} />
          </button>
        )}
      </div>

      {/* Dots below the media, as the destination places them. These are real
          controls — they move the carousel — so unlike the action row they are
          buttons and keep their focus behaviour. */}
      {/* ── The dots, and an honest account of their target ──
          The dot is 6px, as the destination draws it, and the pitch is 12px,
          as the destination spaces it.

          An earlier version kept 24x24 buttons and overlapped them with a
          negative margin to pull the pitch back to 12, claiming each button
          "keeps its full 24". It does not: later buttons paint over earlier
          ones, so every dot but the last had roughly half its target covered.
          A comment asserting a property the code does not have.

          They are 12x24 now — no overlap, no claim, and each dot owns exactly
          the space between it and its neighbour. That is under the 24x24
          guideline in one axis, and the mitigation is real rather than
          hopeful: the chevrons and the arrow keys are the primary way through
          this carousel, and both are full-sized. */}
      <div className="flex items-center justify-center py-2" role="group" aria-label="Slide">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={`Slide ${i + 1} of ${slides.length}`}
            aria-current={i === index ? "true" : undefined}
            className="grid h-6 w-3 place-items-center"
          >
            <span
              className={[
                "h-1.5 w-1.5 rounded-full transition-colors duration-xn ease-xn",
                i === index ? "bg-xn-fmt-social" : "bg-xn-border",
              ].join(" ")}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Inert scenery in the action row. */
function FakeAction({ icon }: { icon: React.ReactNode }) {
  return <span className="text-xn-ink">{icon}</span>;
}

export function Instagram({ copy }: { copy: InstagramCopy }) {
  const [expanded, setExpanded] = useState(false);

  // The caption as the destination composes it: the hook, then the body, then
  // the call to action. Hashtags are NOT part of this string — see below.
  const caption = [copy.hook, ...copy.body, copy.cta].join("\n\n");
  const folds = caption.length > CAPTION_FOLD;

  return (
    <div className="mx-auto w-full max-w-[470px]">
      <div className="overflow-hidden rounded-xn-md border border-xn-border bg-xn-surface">
        {/* ── Account row ──
            The channel belongs HERE, beside the avatar, not on every slide.
            The destination puts the account at the top of a post and never
            repeats it, and it is real data — so the one blank that used to
            sit here is gone and the credit is where a reader looks for it.

            Two lines, as the destination has: the account, then the line
            under it. The second line carries the video title, which is the
            nearest true thing we hold to what Instagram puts there.

            The avatar has an edge now. As a plain `surface-alt` fill on a
            `surface` ground it was very nearly invisible — a circle you could
            only find by knowing it was there. */}
        <div className="flex items-center gap-3 px-3.5 py-3">
          <span className="shrink-0 rounded-full p-[2px]" style={{ background: IG_RING }}>
            <span
              className="block h-9 w-9 rounded-full border-2 border-xn-surface bg-xn-surface-alt"
              aria-label="Account avatar — not available"
            />
          </span>
          {/* ── The destination's actual header ──
              Corrected against a screenshot of it rather than from memory,
              and three things were wrong:

              FOLLOW IS A FILLED PILL, grey ground and dark bold label, sitting
              at the far right beside the overflow menu. It was blue text —
              which is what some surfaces use, and not what a web feed post
              does.

              THE BULLET SEPARATES THE ACCOUNT FROM THE TIMESTAMP, not the
              account from Follow. There is no timestamp on a post that has
              not been published, so the bullet has nothing to join and both
              are gone.

              THE AVATAR CARRIES THE STORY RING. Its absence was most of why
              the row read as a wireframe: the ring is the most recognisable
              object in the whole header. */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-xn-ink">
              {VIDEO.channel}
            </p>
            <p className="truncate text-xs leading-tight text-xn-ink-muted">{VIDEO.title}</p>
          </div>

          <span
            className="shrink-0 rounded-xn-sm bg-xn-surface-alt px-4 py-1.5 text-sm font-semibold text-xn-ink"
            aria-hidden="true"
          >
            Follow
          </span>
          <MoreHorizontal
            size={22}
            strokeWidth={2.5}
            className="shrink-0 text-xn-ink"
            aria-hidden="true"
          />
        </div>

        <Carousel copy={copy} />

        {/* ── Action row. Scenery: inert by construction, not by intention. ── */}
        <div className="flex items-center gap-4 px-3.5" aria-hidden="true">
          <FakeAction icon={<Heart size={22} strokeWidth={1.6} />} />
          <FakeAction icon={<MessageCircle size={22} strokeWidth={1.6} />} />
          <FakeAction icon={<Send size={22} strokeWidth={1.6} />} />
          <span className="flex-1" />
          <FakeAction icon={<Bookmark size={22} strokeWidth={1.6} />} />
        </div>

        <div className="px-3.5 pb-4 pt-3">
          {/* ── The caption, and its fold ──
              Collapsed shows what the destination shows and stops. No dimmed
              tail: the reader simply does not have the rest, and drawing it
              would be drawing something that is not on their screen. */}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-xn-ink">
            {expanded || !folds ? caption : caption.slice(0, CAPTION_FOLD).trimEnd()}
            {folds && !expanded && (
              <>
                {"… "}
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="rounded-xn-sm text-xn-ink-soft transition-colors duration-xn ease-xn hover:text-xn-ink-muted"
                >
                  more
                </button>
              </>
            )}
          </p>

          {/* ── Hashtags, as their own payload ──
              The prompt puts them "on the final lines", which makes them the
              caption's tail. They are not: they are commonly posted as a first
              comment rather than in the caption at all, and copied separately
              when they are not. Rendering them as the last paragraph of prose
              is the one treatment guaranteed to be wrong.

              They only appear once the caption is open, because on the
              destination they sit below the fold with everything else.

              `!folds` matters: a caption of 125 characters or fewer never
              gets a "more" control, so `expanded` could never become true and
              the hashtags were unreachable. None of the sample copy is that
              short, which is exactly why it would have survived to the first
              caption that was. */}
          {(expanded || !folds) && (
            <p className="mt-2.5 text-sm leading-relaxed text-xn-fmt-social">
              {copy.hashtags.map((tag) => `#${tag}`).join(" ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
