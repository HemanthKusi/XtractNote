"use client";

// ─────────────────────────────────────────────────────────────
// Card specimens — TEMPORARY
// ─────────────────────────────────────────────────────────────
// Four governing rules for what a "card" is, each applied across the
// five surfaces that currently share one rectangle: folders, history,
// the content-type picker, the social platform picker, and the landing
// format cards.
//
// http://localhost:3000/dev/card-specimens
//
// Nothing here imports Card, and nothing here is shipped. No real
// component is touched. This file exists to be looked at and then
// deleted once a rule is chosen.
//
// What each specimen is arguing:
//   A  Only objects stay cards — everything else demotes to a row
//   B  A clickable surface is a control — it lifts like a button
//   C  Silhouette carries the type — different data, different shape
//   D  No elevation on content — border and ground do all the work
// ─────────────────────────────────────────────────────────────

import { useState, type CSSProperties, type ReactNode } from "react";

import { FolderCard } from "@/components/folders/folder-card";
import { useTheme } from "@/components/shared/theme-provider";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import {
  contentTypeColors,
  THEMES,
  type ContentType,
  type ThemeName,
} from "@/lib/constants/theme";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/content/types";

// ── Tint helper ─────────────────────────────────────────────
// Mirrors formatTints() in theme.ts rather than importing it, because
// the specimens need arbitrary percentages and that helper is fixed at
// two. Same technique: derive from the variable so the tint follows the
// theme instead of freezing a light-mode value.

function tint(token: string, percent: number): string {
  return `color-mix(in srgb, var(${token}) ${percent}%, transparent)`;
}

// ── Sample data ─────────────────────────────────────────────
// Folder colours point at format tokens rather than stored hex. Real
// folders store hex and therefore cannot follow the theme — that is a
// known migration, deferred. Using tokens here keeps the specimens
// honest in dark mode instead of showing a bug we already know about.

interface SampleFolder {
  id: string;
  name: string;
  emoji: string;
  token: string;
  itemCount: number;
}

// Counts chosen to exercise every branch of the sheet logic: many, then
// exactly two, exactly one, and empty.
const FOLDERS: readonly SampleFolder[] = [
  { id: "f1", name: "Machine Learning", emoji: "🧠", token: "--xn-fmt-research", itemCount: 12 },
  { id: "f2", name: "Client work", emoji: "💼", token: "--xn-fmt-blog", itemCount: 2 },
  { id: "f3", name: "Interviews", emoji: "🎙️", token: "--xn-fmt-summary", itemCount: 1 },
  { id: "f4", name: "Reading queue", emoji: "📚", token: "--xn-fmt-notes", itemCount: 0 },
];

interface SampleItem {
  id: string;
  title: string;
  channel: string;
  when: string;
  words: number;
  contentType: ContentType;
  folder?: { name: string; emoji: string; token: string };
}

const ITEMS: readonly SampleItem[] = [
  {
    id: "i1",
    title: "Attention Is All You Need — the transformer paper explained end to end",
    channel: "Yannic Kilcher",
    when: "3 hours ago",
    words: 1840,
    contentType: "research",
    folder: { name: "Machine Learning", emoji: "🧠", token: "--xn-fmt-research" },
  },
  {
    id: "i2",
    title: "How I structure a Next.js app for scale",
    channel: "Theo",
    when: "2 days ago",
    words: 920,
    contentType: "blog",
  },
  {
    id: "i3",
    title: "Spaced repetition, properly explained",
    channel: "Ali Abdaal",
    when: "Aug 11, 2026",
    words: 460,
    contentType: "flashcards",
    folder: { name: "Reading queue", emoji: "📚", token: "--xn-fmt-notes" },
  },
];

const TYPE_ORDER: readonly ContentType[] = [
  "summary",
  "blog",
  "notes",
  "research",
  "flashcards",
  "quiz",
  "social",
];

const DESCRIPTIONS: Record<ContentType, string> = {
  summary: "Key points, quick read",
  blog: "Polished article with headings",
  notes: "Structured study notes",
  research: "Abstract, findings, citations",
  flashcards: "Q&A cards for review",
  quiz: "Practice questions",
  social: "Posts for X, LinkedIn & more",
};

// ── Folder art ──────────────────────────────────────────────
// Rebuilt on the CSS reference, which is a different construction from
// the video and a better one. Two things it does that the earlier
// attempt did not:
//
//   1. The front panel ROTATES OPEN — rotateX from its bottom edge — so
//      the folder actually opens rather than having paper slide up behind
//      a panel that never moves. That is the whole gesture.
//   2. The papers fan sideways as they rise: one left, one right, the
//      newest straight up the middle.
//
// The tab belongs to the BACK panel here, cut with a clip-path so its
// right edge is angled rather than square.
//
// Everything the reference does with ::before and ::after is a real
// element instead — the tab, the gloss, the ruled lines. Pseudo-elements
// cannot take a per-instance clip-path or colour from props, and the
// pattern in this codebase is Tailwind plus inline style rather than a
// stylesheet per component.
//
// Note the easing is a plain ease-out with NO overshoot, so this
// reference sits inside the "no bounce, no elastic" rule that the video
// reference was breaking. The one policy delta left is duration: the
// reference runs 450ms against an under-300ms rule for app motion.

const FOLDER_EASE = "cubic-bezier(0.22,0.61,0.36,1)";

interface Paper {
  /** Width and height as a share of the paper well. */
  width: string;
  height: string;
  fill: string;
  /** Where it travels on open. The base centring is a separate property. */
  lift: string;
}

// Newest is the widest, sits on top, and rises straight up. The two older
// ones sit behind it and splay outward.
const PAPER_NEWEST: Paper = {
  width: "86%",
  height: "78%",
  fill: "#FDFDFB",
  lift: "translateY(-26%)",
};
const PAPER_SECOND: Paper = {
  width: "78%",
  height: "70%",
  fill: "#F6F4EE",
  lift: "translate(-26%, -18%) rotate(-7deg)",
};
const PAPER_THIRD: Paper = {
  width: "82%",
  height: "74%",
  fill: "#FBFAF6",
  lift: "translate(22%, -22%) rotate(6deg)",
};

/**
 * How many sheets a folder shows, and which.
 *
 * A folder holding one item should not draw three sheets — the art would
 * be claiming contents that are not there. Order matters too: newest on
 * top in the middle, second-newest to the left, third to the right, so
 * the fan reads back in time from the centre outward.
 *
 * Array order is paint order, so the newest goes last to land on top.
 */
function papersFor(itemCount: number): readonly Paper[] {
  if (itemCount <= 0) return [];
  if (itemCount === 1) return [PAPER_NEWEST];
  if (itemCount === 2) return [PAPER_SECOND, PAPER_NEWEST];
  return [PAPER_SECOND, PAPER_THIRD, PAPER_NEWEST];
}

// ── Folder colour ───────────────────────────────────────────
// One colour for ALL folders, not one per folder. Per-folder identity
// colour put a second saturated system on screen competing with the
// seven format colours, and made a shelf of folders look like a paint
// chart. Identity comes from the emoji and the name instead.
//
// Chosen from three candidates: the reference's own palette, this one,
// and a browner kraft. This is the reference hue held but taken a step
// deeper — the original was designed against white, and ours sits on
// #f8f9f7 in light and a near-black in dark, where a lemon yellow
// glares. Fixed across both themes on purpose: manila is a physical
// colour, the same reasoning that keeps the newsletter envelope amber.

interface FolderSkin {
  back1: string;
  back2: string;
  front1: string;
  front2: string;
  edge: string;
}

const FOLDER_SKIN: FolderSkin = {
  back1: "#E5AE3C",
  back2: "#D08F21",
  front1: "#F5C65C",
  front2: "#E7AF3A",
  edge: "#B87A14",
};

function FolderArt({ skin, itemCount }: { skin: FolderSkin; itemCount: number }) {
  const papers = papersFor(itemCount);
  return (
    <span
      className={[
        "relative block aspect-[5/4] w-full transform-gpu",
        "transition-transform duration-xn-slow",
        "group-hover:-translate-y-1 group-active:-translate-y-0.5 group-active:scale-[0.99]",
      ].join(" ")}
      style={{ transitionTimingFunction: FOLDER_EASE }}
      aria-hidden
    >
      {/* Back panel */}
      <span
        className="absolute inset-x-0 bottom-0 top-[14%] rounded-[4px_10px_10px_10px]"
        style={{
          background: `linear-gradient(135deg, ${skin.back1}, ${skin.back2})`,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)",
        }}
      >
        {/* The tab. Its right edge is angled by the clip-path rather than
            cut square, which is what stops it reading as a plain block. */}
        <span
          className="absolute left-0 top-[-13%] h-[16%] w-[46%] rounded-t-[5px]"
          style={{
            background: `linear-gradient(135deg, ${skin.back1}, ${skin.back2})`,
            clipPath: "polygon(0 0, 82% 0, 100% 100%, 0 100%)",
          }}
        />
      </span>

      {/* The paper well. Empty folders draw nothing here, which is the
          empty state — the folder still opens onto nothing. */}
      <span className="absolute bottom-[12%] left-[8%] right-[8%] top-[6%] z-[2] block">
        {papers.map((paper, index) => (
          <span
            key={index}
            className={[
              "absolute bottom-0 left-1/2 block overflow-hidden rounded-[5px]",
              "transform-gpu transition-transform duration-xn-slow",
              "group-hover:[transform:var(--lift)]",
            ].join(" ")}
            style={
              {
                width: paper.width,
                height: paper.height,
                background: paper.fill,
                translate: "-50% 0",
                boxShadow: "0 3px 9px rgba(60,40,10,0.12)",
                transitionTimingFunction: FOLDER_EASE,
                "--lift": paper.lift,
              } as CSSProperties
            }
          >
            {/* Ruled lines, standing in for the page's content. */}
            <span className="absolute left-[14%] right-[24%] top-[22%] h-[6%] rounded-[2px] bg-[#F1F0EA]" />
            <span className="absolute left-[14%] right-[40%] top-[40%] h-[6%] rounded-[2px] bg-[#F1F0EA]" />
          </span>
        ))}
      </span>

      {/* Front panel. Rotating it about its bottom edge is what opens the
          folder; everything else is the paper responding to that. */}
      <span
        className={[
          "absolute inset-x-0 bottom-0 top-[38%] z-[3] origin-bottom rounded-[10px]",
          "transform-gpu transition-transform duration-xn-slow",
          "group-hover:[transform:rotateX(-32deg)]",
        ].join(" ")}
        style={{
          background: `linear-gradient(150deg, ${skin.front1}, ${skin.front2})`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.55), 0 -1px 0 ${skin.edge}, 0 9px 14px -8px rgba(120,80,10,0.35)`,
          transitionTimingFunction: FOLDER_EASE,
        }}
      >
        {/* Gloss, so the front reads as a surface catching light rather
            than a flat fill. */}
        <span
          className="pointer-events-none absolute inset-0 rounded-[10px]"
          style={{
            background:
              "linear-gradient(120deg, rgba(255,255,255,0.35) 0%, transparent 45%)",
          }}
        />
      </span>
    </span>
  );
}

// ── Platform marks ──────────────────────────────────────────
// The real brand paths, normalised to a square 24×24 box so the five sit
// on one optical baseline. YouTube's own artboard is 256×180 — the only
// non-square one — so it is translated down rather than stretched, or it
// would ride high against the other four.
//
// Every mark draws its body in currentColor, so the same file serves the
// monochrome specimens and the brand-coloured one.
//
// YouTube is the exception and cannot be recoloured by swapping a fill:
// it is a solid body with the play triangle knocked OUT of it. Paint both
// in currentColor and the triangle vanishes into a blob. The triangle
// therefore takes whatever is behind the mark — the card at rest, the
// brand fill once that has risen — which is what --xn-yt-knock carries.
// The fallback keeps it correct in the specimens that never light up.

function PlatformMark({ platform }: { platform: SocialPlatform }) {
  switch (platform) {
    case "linkedin":
      return (
        <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden>
          <path d="M8.268 28H2.463V9.306h5.805zM5.362 6.756C3.506 6.756 2 5.218 2 3.362a3.362 3.362 0 0 1 6.724 0c0 1.856-1.506 3.394-3.362 3.394M29.994 28h-5.792v-9.1c0-2.169-.044-4.95-3.018-4.95c-3.018 0-3.481 2.356-3.481 4.794V28h-5.799V9.306h5.567v2.55h.081c.775-1.469 2.668-3.019 5.492-3.019c5.875 0 6.955 3.869 6.955 8.894V28z" />
        </svg>
      );
    case "x-thread":
      return (
        <svg viewBox="0 0 512 512" fill="currentColor" aria-hidden>
          <path d="M389.2 48h70.6L305.6 224.2L487 464H345L233.7 318.6L106.5 464H35.8l164.9-188.5L26.8 48h145.6l100.5 132.9zm-24.8 373.8h39.1L151.1 88h-42z" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden>
          <path d="M128 23.064c34.177 0 38.225.13 51.722.745c12.48.57 19.258 2.655 23.769 4.408c5.974 2.322 10.238 5.096 14.717 9.575s7.253 8.743 9.575 14.717c1.753 4.511 3.838 11.289 4.408 23.768c.615 13.498.745 17.546.745 51.723s-.13 38.226-.745 51.723c-.57 12.48-2.655 19.257-4.408 23.768c-2.322 5.974-5.096 10.239-9.575 14.718s-8.743 7.253-14.717 9.574c-4.511 1.753-11.289 3.839-23.769 4.408c-13.495.616-17.543.746-51.722.746s-38.228-.13-51.723-.746c-12.48-.57-19.257-2.655-23.768-4.408c-5.974-2.321-10.239-5.095-14.718-9.574c-4.479-4.48-7.253-8.744-9.574-14.718c-1.753-4.51-3.839-11.288-4.408-23.768c-.616-13.497-.746-17.545-.746-51.723s.13-38.225.746-51.722c.57-12.48 2.655-19.258 4.408-23.769c2.321-5.974 5.095-10.238 9.574-14.717c4.48-4.48 8.744-7.253 14.718-9.575c4.51-1.753 11.288-3.838 23.768-4.408c13.497-.615 17.545-.745 51.723-.745M128 0C93.237 0 88.878.147 75.226.77c-13.625.622-22.93 2.786-31.071 5.95c-8.418 3.271-15.556 7.648-22.672 14.764S9.991 35.738 6.72 44.155C3.555 52.297 1.392 61.602.77 75.226C.147 88.878 0 93.237 0 128s.147 39.122.77 52.774c.622 13.625 2.785 22.93 5.95 31.071c3.27 8.417 7.647 15.556 14.763 22.672s14.254 11.492 22.672 14.763c8.142 3.165 17.446 5.328 31.07 5.95c13.653.623 18.012.77 52.775.77s39.122-.147 52.774-.77c13.624-.622 22.929-2.785 31.07-5.95c8.418-3.27 15.556-7.647 22.672-14.763s11.493-14.254 14.764-22.672c3.164-8.142 5.328-17.446 5.95-31.07c.623-13.653.77-18.012.77-52.775s-.147-39.122-.77-52.774c-.622-13.624-2.786-22.929-5.95-31.07c-3.271-8.418-7.648-15.556-14.764-22.672S220.262 9.99 211.845 6.72c-8.142-3.164-17.447-5.328-31.071-5.95C167.122.147 162.763 0 128 0m0 62.27c-36.302 0-65.73 29.43-65.73 65.73s29.428 65.73 65.73 65.73c36.301 0 65.73-29.428 65.73-65.73c0-36.301-29.429-65.73-65.73-65.73m0 108.397c-23.564 0-42.667-19.103-42.667-42.667S104.436 85.333 128 85.333s42.667 19.103 42.667 42.667s-19.103 42.667-42.667 42.667m83.686-110.994c0 8.484-6.876 15.36-15.36 15.36s-15.36-6.876-15.36-15.36s6.877-15.36 15.36-15.36s15.36 6.877 15.36 15.36" />
        </svg>
      );
    case "youtube-description":
      return (
        <svg viewBox="0 0 256 256" fill="none" aria-hidden>
          <g transform="translate(0 38)">
            <path
              fill="currentColor"
              d="M250.346 28.075A32.18 32.18 0 0 0 227.69 5.418C207.824 0 127.87 0 127.87 0S47.912.164 28.046 5.582A32.18 32.18 0 0 0 5.39 28.24c-6.009 35.298-8.34 89.084.165 122.97a32.18 32.18 0 0 0 22.656 22.657c19.866 5.418 99.822 5.418 99.822 5.418s79.955 0 99.82-5.418a32.18 32.18 0 0 0 22.657-22.657c6.338-35.348 8.291-89.1-.164-123.134"
            />
            <path
              fill="var(--xn-yt-knock, var(--xn-surface))"
              d="m102.421 128.06l66.328-38.418l-66.328-38.418z"
            />
          </g>
        </svg>
      );
    case "newsletter":
      // No brand exists for this one — it is generic email, so it stays a
      // drawn glyph. Kept in the same weight as the four real marks so it
      // does not read as the odd one out.
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="2.4" y="4.6" width="19.2" height="14.8" rx="2.6" stroke="currentColor" strokeWidth="2" />
          <path d="m3.6 6.9 8.4 5.9 8.4-5.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

// ── Brand skins ─────────────────────────────────────────────
// Monochrome at rest; the brand colour rises from the bottom of the tile
// on hover. Nothing saturated is on screen until the cursor asks for it,
// and then only one platform at a time — which is how this keeps faith
// with the rule that the seven format colours are the only standing
// colour in the product.
//
// `glyph` is not a style choice. It is whichever of white or ink actually
// holds against that fill, measured:
//   LinkedIn  #0A66C2 → white 5.69:1
//   YouTube   #FF0000 → white 4.00:1
//   Instagram gradient → white, 3.89:1 at its worst point (the red end)
//   Newsletter #E3B04B → white is 1.99:1 and fails; ink is 9.14:1
// A true envelope yellow is too light to carry a white glyph, so that one
// inverts. Dark enough to hold white, it stops reading as manila at all.
//
// X's brand IS monochrome, so its fill is the ink token and its glyph the
// background token. That inverts with the theme on its own — black mark on
// white in light, white on black in dark — both of which are the real
// lockup rather than an approximation of it.

// The tooltip is branded too, and `glyph` doubles as its text colour —
// the same measurement decides both. Two platforms need the tooltip to
// carry a deeper variant of their own colour, because a tooltip holds
// real text at 4.5:1 where the tile only holds an icon at 3:1:
//   YouTube   #FF0000 + white = 4.00, fails → #CC0000 + white = 5.89
//   Instagram the gradient's red end + white = 3.89, fails → the solid
//             brand magenta #C13584 + white = 5.11
// Everything else uses its own fill unchanged.

interface PlatformSkin {
  /** The fill that rises on hover. A gradient is legal here. */
  fill: string;
  /** Glyph colour once the fill is up — and the tooltip's text colour. */
  glyph: string;
  /** Tooltip ground. Defaults to `fill` where that carries text safely. */
  tip?: string;
  /** Only YouTube needs this — the colour its knocked-out triangle takes. */
  knock?: string;
}

const PLATFORM_SKIN: Record<SocialPlatform, PlatformSkin> = {
  linkedin: { fill: "#0A66C2", glyph: "#FFFFFF" },
  "x-thread": { fill: "var(--xn-ink)", glyph: "var(--xn-bg)" },
  instagram: {
    fill: "linear-gradient(45deg, #405DE6, #5B51DB, #B33AB4, #C135B4, #E1306C, #FD1F1F)",
    glyph: "#FFFFFF",
    tip: "#C13584",
  },
  "youtube-description": {
    fill: "#FF0000",
    glyph: "#FFFFFF",
    tip: "#CC0000",
    knock: "#FF0000",
  },
  newsletter: { fill: "#E3B04B", glyph: "#13161A" },
};

// ── Thumbnail stand-in ──────────────────────────────────────
// A drawn placeholder rather than VideoThumbnail: the real component
// loads remote YouTube stills, and a specimen page should not depend on
// the network to render. Shape and proportion are what is being judged.
//
// ⚠ The frame is 16:9 and the still must sit inside it uncropped. When
// this moves into the real component the image needs object-contain, not
// object-cover — YouTube serves hqdefault at 4:3 with the video pillared
// inside it, so object-cover crops a still that was already padded. The
// ground shows through wherever the aspect does not match, which is the
// correct outcome: a letterboxed still that is whole beats a full-bleed
// one with its edges cut off.

function Thumb({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-xn-bg-deep ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-br from-black/[0.06] to-transparent" />
      <svg viewBox="0 0 16 16" className="relative h-5 w-5 text-xn-ink-soft" fill="currentColor">
        <path d="M5.8 3.7v8.6L12.4 8 5.8 3.7Z" />
      </svg>
    </div>
  );
}

// ── Page chrome ─────────────────────────────────────────────

function SpecimenBlock({
  letter,
  name,
  rule,
  lifts,
  children,
}: {
  letter: string;
  name: string;
  rule: string;
  lifts: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-xn-border py-14">
      <div className="mb-8 flex items-baseline gap-4">
        <span className="font-mono text-h3 leading-none text-xn-ink-faint">{letter}</span>
        <div>
          <h2 className="text-h4 font-semibold text-xn-ink">{name}</h2>
          <p className="mt-1.5 max-w-[62ch] text-ui text-xn-ink-muted">{rule}</p>
          <p className="mt-1 text-sm text-xn-ink-soft">
            <span className="font-medium text-xn-ink-muted">On hover:</span> {lifts}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-9">{children}</div>
    </section>
  );
}

function Bench({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-3">{label}</p>
      {children}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// SPECIMEN A — Only objects stay cards
// ═════════════════════════════════════════════════════════════
// A card is for something you browse as a set of peers and recognise by
// its picture. A folder is a destination, a platform is a choice, a
// format is a control — none of those are objects, so none of them get a
// surface. They become rows and controls, and the page gets quieter by
// removing rectangles rather than by restyling them.

function SpecimenA() {
  const [type, setType] = useState<ContentType | null>("blog");
  const [platform, setPlatform] = useState<SocialPlatform>("linkedin");

  return (
    <SpecimenBlock
      letter="A"
      name="Only objects stay cards"
      rule="Folders, formats and platforms stop being surfaces altogether — they become rows and controls. Only history keeps a card, because it is the one thing you recognise by its thumbnail."
      lifts="nothing moves. The ground shifts one step and the border strengthens."
    >
      <Bench label="Folders — rail rows">
        <div className="max-w-[520px] overflow-hidden rounded-xn-lg border border-xn-border bg-xn-surface">
          {FOLDERS.map((folder, index) => (
            <button
              key={folder.id}
              type="button"
              className={[
                "group flex w-full items-center gap-3 px-3.5 py-3 text-left",
                "transition-colors duration-xn ease-xn hover:bg-xn-surface-alt",
                index > 0 ? "border-t border-xn-border" : "",
              ].join(" ")}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xn-md text-[17px]"
                style={{ backgroundColor: tint(folder.token, 14) }}
              >
                {folder.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ui font-medium text-xn-ink">{folder.name}</span>
              </span>
              <span className="font-mono text-xs text-xn-ink-soft">
                {folder.itemCount === 0 ? "empty" : folder.itemCount}
              </span>
              <svg
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5 shrink-0 text-xn-ink-soft transition-transform duration-xn ease-xn group-hover:translate-x-0.5"
                fill="none"
                aria-hidden
              >
                <path d="m6 3.5 4.5 4.5L6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      </Bench>

      <Bench label="History — cards, because a thumbnail is the point">
        <div className="grid max-w-[760px] grid-cols-1 gap-3 sm:grid-cols-2">
          {ITEMS.slice(0, 2).map((item) => {
            const meta = contentTypeColors[item.contentType];
            return (
              <article
                key={item.id}
                className="cursor-pointer overflow-hidden rounded-xn-lg border border-xn-border bg-xn-surface shadow-xn-1 transition-colors duration-xn ease-xn hover:border-xn-border-strong"
              >
                <Thumb className="h-[132px] w-full" />
                <div className="p-3.5">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-xn-pill border px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: meta.bg, color: meta.color, borderColor: meta.border }}
                  >
                    <ContentTypeIcon type={item.contentType} size="sm" />
                    {meta.label}
                  </span>
                  <h3 className="mt-2 line-clamp-2 text-ui font-semibold leading-snug text-xn-ink">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 font-mono text-xs text-xn-ink-soft">
                    {item.channel} · {item.when}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </Bench>

      <Bench label="Content type — segmented tiles, no description">
        <div className="grid max-w-[640px] grid-cols-2 gap-2 sm:grid-cols-4">
          {TYPE_ORDER.map((t) => {
            const meta = contentTypeColors[t];
            const on = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={on}
                className={[
                  "flex flex-col items-center gap-2 rounded-xn-md border px-2 py-3.5",
                  "transition-colors duration-xn ease-xn",
                  on
                    ? "border-transparent"
                    : "border-transparent bg-xn-surface-alt hover:border-xn-border-strong",
                ].join(" ")}
                style={on ? { backgroundColor: meta.bg, borderColor: meta.border } : undefined}
              >
                <ContentTypeIcon type={t} size="md" />
                <span
                  className="text-xs font-medium"
                  style={{ color: on ? meta.color : "var(--xn-ink-muted)" }}
                >
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>
      </Bench>

      <Bench label="Platform — radio rows, the mark where the dot was">
        <div className="max-w-[420px] overflow-hidden rounded-xn-lg border border-xn-border bg-xn-surface">
          {SOCIAL_PLATFORMS.map((p, index) => {
            const on = platform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatform(p.id)}
                aria-pressed={on}
                className={[
                  "flex w-full items-center gap-3 px-3.5 py-2.5 text-left",
                  "transition-colors duration-xn ease-xn hover:bg-xn-surface-alt",
                  index > 0 ? "border-t border-xn-border" : "",
                ].join(" ")}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center transition-colors duration-xn ease-xn"
                  style={{ color: on ? contentTypeColors.social.color : "var(--xn-ink-soft)" }}
                >
                  <PlatformMark platform={p.id} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-xn-ink">{p.label}</span>
                </span>
                {on && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: contentTypeColors.social.color }}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      </Bench>

      <Bench label="Landing format cards — the one place a card is still marketing">
        <div className="grid max-w-[680px] grid-cols-1 gap-3 sm:grid-cols-3">
          {(["blog", "notes", "quiz"] as const).map((t) => (
            <div key={t} className="rounded-xn-lg border border-xn-border bg-xn-surface p-5 shadow-xn">
              <ContentTypeIcon type={t} size="xl" withBackground />
              <h3 className="mt-3 text-ui font-semibold text-xn-ink">{contentTypeColors[t].label}</h3>
              <p className="mt-1 text-sm text-xn-ink-muted">{DESCRIPTIONS[t]}</p>
            </div>
          ))}
        </div>
      </Bench>
    </SpecimenBlock>
  );
}

// ═════════════════════════════════════════════════════════════
// SPECIMEN B — A clickable surface is a control
// ═════════════════════════════════════════════════════════════
// The maximal reading of the interaction system: if you can click it, it
// behaves like the button — rises 2px into the next tier, grows a halo of
// its own tone, and presses in below rest. Shown across all five at once
// on purpose, because the only way to know whether elevation on content
// is too much is to see a page of it moving.

const LIFT = [
  "cursor-pointer transition-[box-shadow,transform,background-color,border-color]",
  "duration-xn ease-xn",
  "hover:-translate-y-0.5 hover:shadow-xn-hover",
  "active:translate-y-px active:duration-xn-fast active:shadow-xn-1",
].join(" ");

function SpecimenB() {
  const [type, setType] = useState<ContentType | null>("blog");
  const [platform, setPlatform] = useState<SocialPlatform>("linkedin");

  return (
    <SpecimenBlock
      letter="B"
      name="A clickable surface is a control"
      rule="The button system extended upward without exception. Every clickable surface keeps its card and inherits rise, halo, and press — differentiation comes from density and layout, not from removing surfaces."
      lifts="everything rises 2px and grows a halo. Press drops it below rest and contracts the halo."
    >
      <Bench label="Folders">
        <div className="grid max-w-[680px] grid-cols-1 gap-3 sm:grid-cols-3">
          {FOLDERS.map((folder) => (
            <div
              key={folder.id}
              className={`rounded-xn-lg border border-xn-border bg-xn-surface p-4 shadow-xn-1 ${LIFT}`}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xn-md text-xl"
                style={{ backgroundColor: tint(folder.token, 14) }}
              >
                {folder.emoji}
              </span>
              <h3 className="mt-3 truncate text-ui font-semibold text-xn-ink">{folder.name}</h3>
              <p className="mt-0.5 font-mono text-xs text-xn-ink-soft">
                {folder.itemCount === 0 ? "No items yet" : `${folder.itemCount} items`}
              </p>
            </div>
          ))}
        </div>
      </Bench>

      <Bench label="History">
        <div className="flex max-w-[680px] flex-col gap-3">
          {ITEMS.slice(0, 2).map((item) => {
            const meta = contentTypeColors[item.contentType];
            return (
              <div
                key={item.id}
                className={`flex gap-4 rounded-xn-lg border border-xn-border bg-xn-surface p-4 shadow-xn-1 ${LIFT}`}
              >
                <Thumb className="h-[68px] w-[120px] shrink-0 rounded-xn-md" />
                <div className="min-w-0 flex-1">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-xn-pill border px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: meta.bg, color: meta.color, borderColor: meta.border }}
                  >
                    <ContentTypeIcon type={item.contentType} size="sm" />
                    {meta.label}
                  </span>
                  <h3 className="mt-2 line-clamp-2 text-ui font-semibold leading-snug text-xn-ink">
                    {item.title}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-xn-ink-soft">
                    {item.channel} · {item.when} · {item.words.toLocaleString()} words
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Bench>

      <Bench label="Content type">
        <div className="grid max-w-[680px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TYPE_ORDER.map((t) => {
            const meta = contentTypeColors[t];
            const on = type === t;
            return (
              <div
                key={t}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                onClick={() => setType(t)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setType(t);
                  }
                }}
                className={`rounded-xn-lg border border-xn-border bg-xn-surface p-4 shadow-xn-1 ${LIFT}`}
                style={on ? { outline: `2px solid ${meta.color}`, outlineOffset: "2px" } : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <ContentTypeIcon type={t} size="lg" withBackground />
                  <h3 className="text-ui font-semibold text-xn-ink">{meta.label}</h3>
                </div>
                <p className="mt-2 text-sm text-xn-ink-muted">{DESCRIPTIONS[t]}</p>
              </div>
            );
          })}
        </div>
      </Bench>

      <Bench label="Platform">
        <div className="flex max-w-[420px] flex-col gap-2">
          {SOCIAL_PLATFORMS.map((p) => {
            const on = platform === p.id;
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                onClick={() => setPlatform(p.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setPlatform(p.id);
                  }
                }}
                className={`flex items-center gap-3 rounded-xn-lg border border-xn-border bg-xn-surface px-3.5 py-2.5 shadow-xn-1 ${LIFT}`}
                style={
                  on
                    ? { outline: `2px solid ${contentTypeColors.social.color}`, outlineOffset: "2px" }
                    : undefined
                }
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center text-xn-ink-muted">
                  <PlatformMark platform={p.id} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight text-xn-ink">{p.label}</p>
                  <p className="mt-0.5 text-xs text-xn-ink-muted">{p.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Bench>

      <Bench label="Landing format cards">
        <div className="grid max-w-[680px] grid-cols-1 gap-3 sm:grid-cols-3">
          {(["blog", "notes", "quiz"] as const).map((t) => (
            <div
              key={t}
              className={`rounded-xn-lg border border-xn-border bg-xn-surface p-5 shadow-xn ${LIFT} hover:shadow-xn-lg`}
            >
              <ContentTypeIcon type={t} size="xl" withBackground />
              <h3 className="mt-3 text-ui font-semibold text-xn-ink">{contentTypeColors[t].label}</h3>
              <p className="mt-1 text-sm text-xn-ink-muted">{DESCRIPTIONS[t]}</p>
            </div>
          ))}
        </div>
      </Bench>
    </SpecimenBlock>
  );
}

// ═════════════════════════════════════════════════════════════
// SPECIMEN C — Silhouette carries the type
// ═════════════════════════════════════════════════════════════
// Differentiation by geometry rather than by chrome: a folder looks like
// a folder, a saved item looks like a document, a format is a tall tile,
// a platform is a pill. You should know what kind of thing you are
// looking at before you read a word of it.
//
// The container stays still; the element inside it answers the cursor.
// That keeps the "fields don't lift" logic intact — a container holds
// something, so the something is what responds.

function SpecimenC() {
  const [type, setType] = useState<ContentType | null>("blog");
  const [platform, setPlatform] = useState<SocialPlatform>("linkedin");

  return (
    <SpecimenBlock
      letter="C"
      name="Silhouette carries the type"
      rule="Four data types, four shapes. A folder gets a tab, a saved item becomes a document strip with a format rail, a format is a tall tile, a platform is a pill. Nothing relies on chrome to tell them apart."
      lifts="the container holds still and the contents answer — the tab widens, the rail thickens, the format icon zooms on a spring curve. The thumbnail no longer moves, because scaling it cropped it."
    >
      <Bench label="Folders — hover to open. Sheet count follows the real item count">
        <div className="grid max-w-[560px] grid-cols-4 gap-4">
          {FOLDERS.map((folder) => (
            <button key={folder.id} type="button" className="group block w-full text-left">
              <span className="relative block">
                <FolderArt skin={FOLDER_SKIN} itemCount={folder.itemCount} />
                {/* The emoji rides on the front panel. It is the only thing
                    distinguishing one folder from another now that they all
                    share a colour. */}
                <span className="pointer-events-none absolute bottom-[8%] left-[10%] z-[4] text-[17px] leading-none">
                  {folder.emoji}
                </span>
              </span>

              <span className="mt-2.5 block truncate text-center text-sm font-semibold text-xn-ink">
                {folder.name}
              </span>
              <span className="mt-0.5 block text-center font-mono text-xs text-xn-ink-soft">
                {folder.itemCount === 0
                  ? "empty"
                  : `${folder.itemCount} item${folder.itemCount === 1 ? "" : "s"}`}
              </span>
            </button>
          ))}
        </div>
      </Bench>

      <Bench label="History — a document strip, rail in the format's colour">
        <div className="flex max-w-[680px] flex-col gap-2.5">
          {ITEMS.map((item) => {
            const meta = contentTypeColors[item.contentType];
            // Fixed height, so a row with a folder pill is exactly as tall as
            // one without and the column reads as a list rather than a ragged
            // stack. The title clamps to two lines to hold it.
            return (
              <article
                key={item.id}
                className="group flex h-[118px] cursor-pointer overflow-hidden rounded-xn-lg border border-xn-border bg-xn-surface transition-colors duration-xn ease-xn hover:border-xn-border-strong"
              >
                {/* The rail is the format colour doing the identifying, so the
                    chip inside can go away and the row gets quieter. It is also
                    what answers the cursor now — widening a 3px bar costs the
                    image nothing, where scaling the thumbnail cropped it. */}
                <span
                  className="w-[3px] shrink-0 transition-[width] duration-xn ease-xn group-hover:w-[6px]"
                  style={{ backgroundColor: meta.color }}
                  aria-hidden
                />
                {/* 16:9 and fixed, never stretched to the row. */}
                <div className="flex shrink-0 items-center p-3.5">
                  <Thumb className="h-[90px] w-[160px] rounded-xn-md" />
                </div>
                <div className="min-w-0 flex-1 self-center pr-4">
                  <div className="flex items-center gap-2">
                    <ContentTypeIcon type={item.contentType} size="sm" />
                    <span className="text-xs font-medium" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="font-mono text-xs text-xn-ink-soft">· {item.when}</span>
                  </div>
                  <h3 className="mt-1.5 line-clamp-2 text-ui font-semibold leading-snug text-xn-ink">
                    {item.title}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-2 font-mono text-xs text-xn-ink-soft">
                    <span className="truncate">{item.channel}</span>
                    <span aria-hidden>·</span>
                    <span className="shrink-0">{item.words.toLocaleString()} words</span>
                    {item.folder && (
                      <span
                        className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-xn-pill px-2 py-0.5 font-sans text-xs font-medium text-xn-ink-muted"
                        style={{ backgroundColor: tint(item.folder.token, 12) }}
                      >
                        <span aria-hidden>{item.folder.emoji}</span>
                        {item.folder.name}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Bench>

      <Bench label="Content type — tall tiles, the icon does the work">
        <div className="grid max-w-[700px] grid-cols-2 gap-3 sm:grid-cols-4">
          {TYPE_ORDER.map((t) => {
            const meta = contentTypeColors[t];
            const on = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={on}
                className={[
                  "group flex flex-col items-start gap-3 rounded-xn-lg border p-4 text-left",
                  "transition-colors duration-xn ease-xn",
                  on ? "" : "border-xn-border bg-xn-surface hover:border-xn-border-strong",
                ].join(" ")}
                style={on ? { backgroundColor: meta.bg, borderColor: meta.border } : undefined}
              >
                {/* A zoom, not a lift — the badge swells in place. The spring
                    curve overshoots a few percent before settling, which is
                    what reads as liquid rather than mechanical; a plain
                    ease-out at this scale looks like a hard snap.
                    See the note in the specimen header about the motion rule
                    this grazes. */}
                <span className="inline-block origin-center transform-gpu transition-transform duration-xn ease-xn group-hover:scale-[1.22]">
                  <ContentTypeIcon type={t} size="xl" withBackground />
                </span>
                <span className="block">
                  <span
                    className="block text-ui font-semibold"
                    style={{ color: on ? meta.color : "var(--xn-ink)" }}
                  >
                    {meta.label}
                  </span>
                  <span className="mt-1 block text-xs leading-[1.45] text-xn-ink-muted">
                    {DESCRIPTIONS[t]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Bench>

      <Bench label="Platform — monochrome until the cursor asks, then the brand rises">
        <div>
          {/* pt-9 leaves room for the tooltip to sit above the first row
              without the bench clipping it. */}
          <ul className="flex flex-wrap gap-2.5 pt-9">
            {SOCIAL_PLATFORMS.map((p) => {
              const on = platform === p.id;
              const skin = PLATFORM_SKIN[p.id];

              // Custom properties carry the per-platform values so the
              // Tailwind classes below can stay static — a hover colour
              // cannot come from an inline style, and a class name built
              // by concatenation would never reach the JIT scanner.
              const vars = {
                "--lit": skin.fill,
                "--glyph-lit": skin.glyph,
                "--tip": skin.tip ?? skin.fill,
                ...(skin.knock && on ? { "--xn-yt-knock": skin.knock } : {}),
              } as CSSProperties;

              return (
                <li key={p.id} className="group relative" style={vars}>
                  {/* Branded, like the tile. Its text colour is the same
                      measured choice as the glyph's — white where the
                      ground is dark enough, ink where it is not. */}
                  <span
                    className={[
                      "pointer-events-none absolute bottom-full left-1/2 z-20 mb-2",
                      "-translate-x-1/2 translate-y-1 whitespace-nowrap",
                      "rounded-xn-sm px-2.5 py-1.5",
                      "bg-[color:var(--tip)] text-xs font-medium shadow-xn",
                      "text-[color:var(--glyph-lit)]",
                      "opacity-0 transition-[opacity,transform] duration-xn ease-xn",
                      "group-hover:translate-y-0 group-hover:opacity-100",
                    ].join(" ")}
                    aria-hidden
                  >
                    {p.label}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    aria-pressed={on}
                    aria-label={p.label}
                    className={[
                      "relative flex h-12 w-12 items-center justify-center overflow-hidden",
                      "rounded-xn-md border transition-colors duration-xn ease-xn",
                      on ? "border-transparent" : "border-xn-border bg-xn-surface",
                      // The knocked-out triangle follows the fill once it is up.
                      "group-hover:[--xn-yt-knock:var(--lit)]",
                    ].join(" ")}
                  >
                    {/* The fill slides up from below rather than growing in
                        height — height is a layout property, and a gradient
                        stretched by scaleY would smear. */}
                    <span
                      aria-hidden
                      className={[
                        "absolute inset-0 transition-transform duration-xn ease-xn",
                        on ? "translate-y-0" : "translate-y-full group-hover:translate-y-0",
                      ].join(" ")}
                      style={{ background: "var(--lit)" }}
                    />
                    <span
                      className={[
                        "relative z-10 flex h-6 w-6 items-center justify-center",
                        "transition-colors duration-xn ease-xn",
                        on ? "text-[color:var(--glyph-lit)]" : "text-xn-ink-muted",
                        "group-hover:text-[color:var(--glyph-lit)]",
                      ].join(" ")}
                    >
                      <PlatformMark platform={p.id} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </Bench>

      <Bench label="Landing format cards — the icon breaks the frame">
        <div className="grid max-w-[680px] grid-cols-1 gap-3 sm:grid-cols-3">
          {(["blog", "notes", "quiz"] as const).map((t) => {
            const meta = contentTypeColors[t];
            return (
              <div
                key={t}
                className="relative overflow-hidden rounded-xn-lg border border-xn-border bg-xn-surface p-5 shadow-xn"
              >
                {/* Oversized and clipped by the corner — the format colour as a
                    graphic element rather than another badge. */}
                <span
                  className="pointer-events-none absolute -right-4 -top-4 opacity-[0.14]"
                  style={{ color: meta.color }}
                  aria-hidden
                >
                  <span className="block scale-[2.6] origin-top-right">
                    <ContentTypeIcon type={t} size="xl" />
                  </span>
                </span>
                <ContentTypeIcon type={t} size="lg" withBackground />
                <h3 className="mt-3 text-ui font-semibold text-xn-ink">{meta.label}</h3>
                <p className="mt-1 text-sm text-xn-ink-muted">{DESCRIPTIONS[t]}</p>
              </div>
            );
          })}
        </div>
      </Bench>
    </SpecimenBlock>
  );
}

// ═════════════════════════════════════════════════════════════
// SPECIMEN D — No elevation on content
// ═════════════════════════════════════════════════════════════
// The opposite pole from B. Elevation is reserved for things that
// genuinely float above the page — modal, dropdown, toast, the sidebar
// over a scrolling body. Content surfaces get a border and a ground and
// nothing else, and the four-layer stack stops being a card treatment.
//
// This is the specimen that answers "is the elevation the problem, or is
// the sameness the problem?" — because everything here is differentiated
// by density alone.

const FLAT = [
  "cursor-pointer border bg-xn-surface border-xn-border",
  "transition-colors duration-xn ease-xn",
  "hover:bg-xn-surface-alt hover:border-xn-border-strong",
  "active:bg-xn-bg-deep active:duration-xn-fast",
].join(" ");

function SpecimenD() {
  const [type, setType] = useState<ContentType | null>("blog");
  const [platform, setPlatform] = useState<SocialPlatform>("linkedin");

  return (
    <SpecimenBlock
      letter="D"
      name="No elevation on content"
      rule="Elevation is spent only on things that genuinely float — modal, dropdown, toast, sidebar. Content surfaces get a border and a ground. Density is the only thing separating the four types."
      lifts="the ground shifts one step and the border strengthens. Press shifts the ground again."
    >
      <Bench label="Folders — tight three-up">
        <div className="grid max-w-[600px] grid-cols-2 gap-2 sm:grid-cols-3">
          {FOLDERS.map((folder) => (
            <div key={folder.id} className={`flex items-center gap-2.5 rounded-xn-md p-3 ${FLAT}`}>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xn-sm text-base"
                style={{ backgroundColor: tint(folder.token, 14) }}
              >
                {folder.emoji}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-xn-ink">{folder.name}</span>
                <span className="block font-mono text-xs text-xn-ink-soft">
                  {folder.itemCount === 0 ? "empty" : folder.itemCount}
                </span>
              </span>
            </div>
          ))}
        </div>
      </Bench>

      <Bench label="History — wide rows, airier than everything else">
        <div className="flex max-w-[680px] flex-col gap-2">
          {ITEMS.map((item) => {
            const meta = contentTypeColors[item.contentType];
            return (
              <div key={item.id} className={`flex gap-4 rounded-xn-lg p-4 ${FLAT}`}>
                <Thumb className="h-[68px] w-[120px] shrink-0 rounded-xn-md" />
                <div className="min-w-0 flex-1">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-xn-pill border px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: meta.bg, color: meta.color, borderColor: meta.border }}
                  >
                    <ContentTypeIcon type={item.contentType} size="sm" />
                    {meta.label}
                  </span>
                  <h3 className="mt-2 line-clamp-2 text-ui font-semibold leading-snug text-xn-ink">
                    {item.title}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-xn-ink-soft">
                    {item.channel} · {item.when} · {item.words.toLocaleString()} words
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Bench>

      <Bench label="Content type — medium density, description kept">
        <div className="grid max-w-[680px] grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TYPE_ORDER.map((t) => {
            const meta = contentTypeColors[t];
            const on = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={on}
                className={`rounded-xn-md p-3.5 text-left ${FLAT}`}
                style={on ? { borderColor: meta.color, backgroundColor: meta.bg } : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <ContentTypeIcon type={t} size="md" withBackground />
                  <span className="text-sm font-semibold text-xn-ink">{meta.label}</span>
                </div>
                <p className="mt-1.5 text-xs text-xn-ink-muted">{DESCRIPTIONS[t]}</p>
              </button>
            );
          })}
        </div>
      </Bench>

      <Bench label="Platform — tightest of the four">
        <div className="flex max-w-[420px] flex-col gap-1.5">
          {SOCIAL_PLATFORMS.map((p) => {
            const on = platform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatform(p.id)}
                aria-pressed={on}
                className={`flex items-center gap-3 rounded-xn-sm px-3 py-2 text-left ${FLAT}`}
                style={
                  on
                    ? {
                        borderColor: contentTypeColors.social.color,
                        backgroundColor: contentTypeColors.social.bg,
                      }
                    : undefined
                }
              >
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center"
                  style={{ color: on ? contentTypeColors.social.color : "var(--xn-ink-soft)" }}
                >
                  <PlatformMark platform={p.id} />
                </span>
                <span className="text-sm font-medium text-xn-ink">{p.label}</span>
              </button>
            );
          })}
        </div>
      </Bench>

      <Bench label="Landing format cards — flat too, weight from size alone">
        <div className="grid max-w-[680px] grid-cols-1 gap-2 sm:grid-cols-3">
          {(["blog", "notes", "quiz"] as const).map((t) => (
            <div key={t} className="rounded-xn-lg border border-xn-border bg-xn-surface p-6">
              <ContentTypeIcon type={t} size="xl" withBackground />
              <h3 className="mt-4 text-h5 font-semibold text-xn-ink">{contentTypeColors[t].label}</h3>
              <p className="mt-1.5 text-sm text-xn-ink-muted">{DESCRIPTIONS[t]}</p>
            </div>
          ))}
        </div>
      </Bench>
    </SpecimenBlock>
  );
}

// ═════════════════════════════════════════════════════════════
// Page
// ═════════════════════════════════════════════════════════════

// The active theme button is styled by CSS reading data-theme off <html>,
// not by comparing against the React state. The provider only learns the
// stored theme on the client, so any class derived from it disagrees with
// the server render — the app-wide hydration warning that is still open.
// Reading the attribute instead sidesteps it here rather than adding
// another instance of it to a page meant for looking at.
//
// Both strings are written out in full because Tailwind scans source for
// literal class names; building the variant by concatenation would leave
// the utilities ungenerated.
const THEME_BUTTON_ACTIVE: Record<ThemeName, string> = {
  light:
    "[html[data-theme=light]_&]:border-xn-ink [html[data-theme=light]_&]:bg-xn-ink [html[data-theme=light]_&]:text-xn-bg [html[data-theme=light]_&]:shadow-xn",
  dark:
    "[html[data-theme=dark]_&]:border-xn-ink [html[data-theme=dark]_&]:bg-xn-ink [html[data-theme=dark]_&]:text-xn-bg [html[data-theme=dark]_&]:shadow-xn",
};

export default function CardSpecimensPage() {
  const { setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-xn-bg">
      <div className="mx-auto max-w-[860px] px-6 py-14">
        <header className="pb-10">
          <p className="eyebrow mb-3">Specimens · not shipped</p>
          <h1 className="text-h3 font-semibold text-xn-ink">What is a card?</h1>
          <p className="mt-3 max-w-[62ch] text-body text-xn-ink-muted">
            Four rules, each applied to all five surfaces that share one rectangle
            today. Hover and click everything — the interaction is half of what is
            being judged, and it does not read from a screenshot.
          </p>

          <div className="mt-6 inline-flex gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={[
                  "rounded-xn-pill border px-4 py-2 text-ui font-medium",
                  "border-xn-border-strong bg-xn-surface text-xn-ink-muted shadow-xn-1",
                  "transition-[box-shadow,transform,background-color,color,border-color] duration-xn ease-xn",
                  "hover:-translate-y-0.5 hover:shadow-xn-hover",
                  "active:translate-y-px active:duration-xn-fast active:shadow-xn-1",
                  THEME_BUTTON_ACTIVE[t],
                ].join(" ")}
              >
                {t === "dark" ? "Dark" : "Light"}
              </button>
            ))}
          </div>
        </header>

        {/* The SHIPPED component, rendered here only because /folders is
            behind auth and cannot be opened in a bare browser. Temporary,
            like the rest of this page. */}
        <section className="border-t border-xn-border py-14">
          <p className="eyebrow mb-3">Shipped · components/folders/folder-card.tsx</p>
          <div className="grid max-w-[560px] grid-cols-1 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {FOLDERS.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={{
                  id: folder.id,
                  name: folder.name,
                  emoji: folder.emoji,
                  color: "#3B7AE8",
                  itemCount: folder.itemCount,
                  createdAt: "2026-08-01T00:00:00Z",
                }}
              />
            ))}
          </div>
        </section>

        <SpecimenA />
        <SpecimenB />
        <SpecimenC />
        <SpecimenD />

        <footer className="border-t border-xn-border py-10">
          <p className="text-sm text-xn-ink-soft">
            Delete this route once a rule is chosen.
          </p>
        </footer>
      </div>
    </div>
  );
}
