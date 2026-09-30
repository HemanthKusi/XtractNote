"use client";

// ─────────────────────────────────────────────────────────────
// History row specimens — TEMPORARY
// ─────────────────────────────────────────────────────────────
// http://localhost:3000/dev/history-row
//
// Round three. Settled and built in, no longer offered:
//   · Move sits top right, labelled, ALWAYS visible, focus ring only.
//   · Row scale: Medium — 136px row, 192×108 still.
//   · Column: 960px.
//   · Pill: outlined amber (was D). Its strength is still being tuned.
//
// ── What round two got wrong ────────────────────────────────
// Only the card grew. The tag, the date, the pill and the Move control
// all stayed at text-xs with a 14px icon — ContentTypeIcon's smallest
// step — so the chrome kept the proportions of a 118px row inside a
// 136px one and read small. Chrome is now its own dial rather than
// something hardcoded to the row.
//
// The row-scale and column dials survive on purpose: growing the chrome
// can make a 136px row feel tight, and that is worth being able to check
// rather than assume.
//
// Nothing here is shipped and no real component is modified. Delete this
// route once the pill and the chrome are chosen.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";

import { HistoryCard } from "@/components/history/history-card";
import { useTheme } from "@/components/shared/theme-provider";
import { ContentTypeIcon, type ContentTypeIconSize } from "@/components/ui/content-type-icon";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import {
  contentTypeColors,
  THEMES,
  type ContentType,
  type ThemeName,
} from "@/lib/constants/theme";

// ── The folder amber ────────────────────────────────────────
// Repeated from folder-card.tsx rather than imported, because its SKIN
// is a private const and a specimen should not force it public. Amber is
// fixed in both themes there — manila is a physical colour.

const FOLDER_AMBER = "#E5AE3C";

function tintHex(hex: string, percent: number): string {
  return `color-mix(in srgb, ${hex} ${percent}%, transparent)`;
}

// ── Working around a bug in the shipped thumbnail ───────────
// VideoThumbnail fades its image in by flipping React state from onLoad.
// A cached image finishes decoding before React attaches that listener,
// so onLoad never fires and the still stays at opacity 0 forever. A real
// defect in components/ui/video-thumbnail.tsx, reported separately and
// not this page's to fix. Forcing it visible is what makes these
// benches judgeable at all.

const SHOW_CACHED_STILL = "[&_img]:opacity-100";

// Fixed at module load rather than read during render, so the shipped
// component below gets a stable timestamp to format.
const THREE_HOURS_AGO = new Date(Date.now() - 3 * 3600 * 1000).toISOString();

// ── Sample data ─────────────────────────────────────────────

interface SampleItem {
  id: string;
  title: string;
  channel: string;
  when: string;
  words: number;
  contentType: ContentType;
  videoId: string;
  folder?: { name: string; emoji: string };
}

const ITEMS: readonly SampleItem[] = [
  {
    id: "i1",
    title: "Attention Is All You Need — the transformer paper explained end to end",
    channel: "Yannic Kilcher",
    when: "3 hours ago",
    words: 1840,
    contentType: "research",
    videoId: "dQw4w9WgXcQ",
    folder: { name: "Machine Learning", emoji: "🧠" },
  },
  {
    id: "i2",
    title: "How I structure a Next.js app for scale",
    channel: "Theo",
    when: "2 days ago",
    words: 920,
    contentType: "blog",
    videoId: "9bZkp7q19f0",
  },
  {
    id: "i3",
    title: "Spaced repetition, properly explained",
    channel: "Ali Abdaal",
    when: "Aug 11, 2026",
    words: 460,
    contentType: "flashcards",
    videoId: "jNQXAC9IVRw",
    folder: { name: "Reading queue", emoji: "📚" },
  },
];

// ── Row scale ───────────────────────────────────────────────
// Every still is exact 16:9, so no preset introduces a crop the others
// do not have. Medium is the chosen one; the rest stay so the choice can
// be re-checked against bigger chrome.

type ScaleName = "current" | "md" | "lg" | "xl";

interface Scale {
  label: string;
  row: string;
  thumb: string;
  thumbHeight: number;
  pad: string;
  title: string;
  rail: string;
  railHover: string;
}

const SCALES: Record<ScaleName, Scale> = {
  current: {
    label: "Current · 118px row, 160×90 still",
    row: "h-[118px]", thumb: "w-[160px]", thumbHeight: 90, pad: "p-3.5",
    title: "text-ui", rail: "w-[3px]", railHover: "group-hover:w-[6px]",
  },
  md: {
    label: "Medium · 136px row, 192×108 still",
    row: "h-[136px]", thumb: "w-[192px]", thumbHeight: 108, pad: "p-3.5",
    title: "text-[17px]", rail: "w-[4px]", railHover: "group-hover:w-[7px]",
  },
  lg: {
    label: "Large · 158px row, 224×126 still",
    row: "h-[158px]", thumb: "w-[224px]", thumbHeight: 126, pad: "p-4",
    title: "text-[19px]", rail: "w-[4px]", railHover: "group-hover:w-[8px]",
  },
  xl: {
    label: "Extra large · 180px row, 256×144 still",
    row: "h-[180px]", thumb: "w-[256px]", thumbHeight: 144, pad: "p-4.5",
    title: "text-[21px]", rail: "w-[5px]", railHover: "group-hover:w-[9px]",
  },
};

const SCALE_ORDER: readonly ScaleName[] = ["current", "md", "lg", "xl"];

// ── Chrome scale ────────────────────────────────────────────
// The tag, the date line, the pill and the Move control. These were
// hardcoded to the smallest step and are the reason the row still read
// small after the card grew. The Move gutter travels with them, so a
// long title never runs under the control.

type ChromeName = "small" | "medium" | "large";

interface Chrome {
  label: string;
  note: string;
  icon: ContentTypeIconSize;
  tag: string;
  meta: string;
  moveText: string;
  moveIcon: number;
  movePad: string;
  gutter: string;
  pill: string;
}

const CHROMES: Record<ChromeName, Chrome> = {
  small: {
    label: "Small",
    note: "What round two shipped — 14px icon, text-xs throughout. The 118px row's proportions inside a 136px one.",
    icon: "sm", tag: "text-xs", meta: "text-xs",
    moveText: "text-xs", moveIcon: 14, movePad: "px-2 py-1",
    gutter: "pr-[150px]", pill: "px-2 py-0.5 text-xs",
  },
  medium: {
    label: "Medium",
    note: "16px icon, text-sm. One step up on everything, matching the card's own step from 118 to 136.",
    icon: "md", tag: "text-sm", meta: "text-sm",
    moveText: "text-sm", moveIcon: 16, movePad: "px-2.5 py-1.5",
    gutter: "pr-[170px]", pill: "px-2.5 py-1 text-sm",
  },
  large: {
    label: "Large",
    note: "20px icon, 15px tag. The chrome stops being incidental and starts carrying the row alongside the still.",
    icon: "lg", tag: "text-[15px]", meta: "text-[15px]",
    moveText: "text-[15px]", moveIcon: 18, movePad: "px-3 py-1.5",
    gutter: "pr-[190px]", pill: "px-3 py-1 text-[15px]",
  },
};

const CHROME_ORDER: readonly ChromeName[] = ["small", "medium", "large"];

// ── Column width ────────────────────────────────────────────

type WidthName = "legacy" | "wide" | "wider" | "fluid";

const WIDTHS: Record<WidthName, { label: string; className: string }> = {
  legacy: { label: "680px · max-w-content, as it ships", className: "max-w-[680px]" },
  wide: { label: "960px · chosen", className: "max-w-[960px]" },
  wider: { label: "1200px", className: "max-w-[1200px]" },
  fluid: { label: "Fluid · fills the content area", className: "max-w-none" },
};

const WIDTH_ORDER: readonly WidthName[] = ["legacy", "wide", "wider", "fluid"];

// ── Pill strength ───────────────────────────────────────────
// All four are the outlined treatment that was chosen. They differ only
// in how hard the border and the ground push, because "a little more
// visible" is a range rather than a value.

type PillVariant = "d1" | "d2" | "d3" | "d4";

interface PillSpec {
  label: string;
  border: number;
  ground: number;
  weight: string;
  borderWidth: string;
}

const PILLS: Record<PillVariant, PillSpec> = {
  d1: { label: "D1 · as you saw it — 70% border, 14% ground", border: 70, ground: 14, weight: "font-medium", borderWidth: "1px" },
  d2: { label: "D2 · full border, 20% ground", border: 100, ground: 20, weight: "font-medium", borderWidth: "1px" },
  d3: { label: "D3 · full border at 1.5px, 26% ground", border: 100, ground: 26, weight: "font-semibold", borderWidth: "1.5px" },
  d4: { label: "D4 · full border at 2px, 34% ground", border: 100, ground: 34, weight: "font-semibold", borderWidth: "2px" },
};

const PILL_ORDER: readonly PillVariant[] = ["d1", "d2", "d3", "d4"];

function FolderPill({
  emoji,
  name,
  variant,
  chrome,
}: {
  emoji: string;
  name: string;
  variant: PillVariant;
  chrome: Chrome;
}) {
  const spec = PILLS[variant];
  return (
    <span
      className={`ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-xn-pill font-sans ${spec.weight} ${chrome.pill}`}
      style={{
        backgroundColor: tintHex(FOLDER_AMBER, spec.ground),
        color: "var(--xn-ink)",
        border: `${spec.borderWidth} solid ${tintHex(FOLDER_AMBER, spec.border)}`,
      }}
    >
      <span aria-hidden>{emoji}</span>
      {name}
    </span>
  );
}

function MoveIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.4a1 1 0 0 1 .7.3l.9.9h5A1.5 1.5 0 0 1 14 5.7V11a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11V4.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── The row ─────────────────────────────────────────────────

function HistoryRowSpecimen({
  item,
  pill,
  scale,
  chrome,
}: {
  item: SampleItem;
  pill: PillVariant;
  scale: Scale;
  chrome: Chrome;
}) {
  const meta = contentTypeColors[item.contentType];
  const label = item.folder ? "Move" : "Add to folder";

  return (
    <article
      className={`group relative flex cursor-pointer overflow-hidden rounded-xn-lg border border-xn-border bg-xn-surface transition-colors duration-xn ease-xn hover:border-xn-border-strong ${scale.row}`}
    >
      <span
        className={`shrink-0 transition-[width] duration-xn ease-xn ${scale.rail} ${scale.railHover}`}
        style={{ backgroundColor: meta.color }}
        aria-hidden
      />

      <div className={`flex shrink-0 items-center ${scale.pad}`}>
        <div className={`${scale.thumb} ${SHOW_CACHED_STILL}`}>
          <VideoThumbnail videoId={item.videoId} height={scale.thumbHeight} label={item.title} />
        </div>
      </div>

      <div className={`min-w-0 flex-1 self-center ${chrome.gutter}`}>
        <div className="flex items-center gap-2">
          <ContentTypeIcon type={item.contentType} size={chrome.icon} />
          <span className={`font-medium ${chrome.tag}`} style={{ color: meta.color }}>
            {meta.label}
          </span>
          <span className={`font-mono text-xn-ink-soft ${chrome.meta}`}>· {item.when}</span>
        </div>

        <h3 className={`mt-1.5 line-clamp-2 font-semibold leading-snug text-xn-ink ${scale.title}`}>
          {item.title}
        </h3>

        <div className={`mt-1.5 flex items-center gap-2 font-mono text-xn-ink-soft ${chrome.meta}`}>
          <span className="truncate">{item.channel}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{item.words.toLocaleString()} words</span>
          {item.folder && (
            <FolderPill
              emoji={item.folder.emoji}
              name={item.folder.name}
              variant={pill}
              chrome={chrome}
            />
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => event.stopPropagation()}
        className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-xn-md font-medium text-xn-ink-soft transition-colors duration-xn ease-xn hover:bg-xn-surface-alt hover:text-xn-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xn-ink ${chrome.moveText} ${chrome.movePad}`}
      >
        <MoveIcon size={chrome.moveIcon} />
        {label}
      </button>
    </article>
  );
}

// ── Page chrome ─────────────────────────────────────────────

function Control<T extends string>({
  legend,
  options,
  value,
  onChange,
  labelFor,
}: {
  legend: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  labelFor: (option: T) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-[92px] shrink-0 text-sm text-xn-ink-soft">{legend}</span>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={[
            "rounded-xn-pill border px-3 py-1 text-xs font-medium transition-colors duration-xn ease-xn",
            value === option
              ? "border-xn-ink bg-xn-ink text-xn-bg"
              : "border-xn-border bg-xn-surface text-xn-ink-muted hover:border-xn-border-strong",
          ].join(" ")}
        >
          {labelFor(option)}
        </button>
      ))}
    </div>
  );
}

const THEME_BUTTON_ACTIVE: Record<ThemeName, string> = {
  light:
    "[html[data-theme=light]_&]:border-xn-ink [html[data-theme=light]_&]:bg-xn-ink [html[data-theme=light]_&]:text-xn-bg [html[data-theme=light]_&]:shadow-xn",
  dark:
    "[html[data-theme=dark]_&]:border-xn-ink [html[data-theme=dark]_&]:bg-xn-ink [html[data-theme=dark]_&]:text-xn-bg [html[data-theme=dark]_&]:shadow-xn",
};

const BROKEN_SRC = "https://broken.invalid/404.jpg";
const CACHED_SRC = "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg";

function ErrorToCachedProbe() {
  const [src, setSrc] = useState(BROKEN_SRC);

  return (
    <div className="mt-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSrc(CACHED_SRC)}
          className="rounded-xn-pill border border-xn-border bg-xn-surface px-3 py-1 text-xs font-medium text-xn-ink-muted hover:border-xn-border-strong"
        >
          Swap to cached URL
        </button>
        <button
          type="button"
          onClick={() => setSrc(BROKEN_SRC)}
          className="rounded-xn-pill border border-xn-border bg-xn-surface px-3 py-1 text-xs font-medium text-xn-ink-muted hover:border-xn-border-strong"
        >
          Reset to broken
        </button>
        <span className="font-mono text-xs text-xn-ink-soft">
          {src === BROKEN_SRC ? "broken" : "cached"}
        </span>
      </div>

      <div className="mt-3 w-[192px]" data-probe>
        <VideoThumbnail src={src} height={108} label="probe" />
      </div>
    </div>
  );
}

export default function HistoryRowSpecimensPage() {
  const { setTheme } = useTheme();
  const [pill, setPill] = useState<PillVariant>("d3");
  const [scale, setScale] = useState<ScaleName>("md");
  const [width, setWidth] = useState<WidthName>("wide");
  const [chrome, setChrome] = useState<ChromeName>("medium");

  return (
    <div className="flex min-h-screen bg-xn-bg">
      <aside className="hidden w-[232px] shrink-0 border-r border-xn-border bg-xn-surface lg:block">
        <p className="p-6 font-mono text-xs text-xn-ink-faint">
          232px sidebar
          <br />
          (mock — real shell width)
        </p>
      </aside>

      <div className="min-w-0 flex-1 px-8 py-14">
        <header className="pb-10">
          <p className="eyebrow mb-3">Specimens · not shipped</p>
          <h1 className="text-h3 font-semibold text-xn-ink">The history row</h1>
          <p className="mt-3 max-w-[62ch] text-body text-xn-ink-muted">
            Medium row, 960px column and the outlined pill are locked in as the
            defaults. What is still open is how hard the pill pushes and how big
            the chrome gets — the tag, the date, the pill and Move, all of which
            stayed at the smallest step while only the card grew.
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

        {/* The SHIPPED component, rendered here only because /history is
            behind auth and cannot be opened in a bare browser. This is
            the thing that actually ships; everything below it is the
            specimen it was decided from. */}
        <section className="border-t border-xn-border py-10">
          <p className="eyebrow mb-3">Shipped · components/history/history-card.tsx</p>
          <div className="flex max-w-[960px] flex-col gap-3">
            {ITEMS.map((item) => (
              <HistoryCard
                key={item.id}
                item={{
                  id: item.id,
                  contentType: item.contentType,
                  title: item.title,
                  channel: item.channel,
                  thumbnail: `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`,
                  wordCount: item.words,
                  createdAt: THREE_HOURS_AGO,
                  markdown: "",
                  body: { markdown: "" },
                  folderId: item.folder ? "f1" : null,
                }}
                folderLabel={item.folder ?? null}
                onMove={() => {}}
              />
            ))}
          </div>
        </section>

        <section className="border-t border-xn-border py-10">
          <div className="flex flex-col gap-3">
            <Control legend="Chrome" options={CHROME_ORDER} value={chrome} onChange={setChrome}
              labelFor={(c) => CHROMES[c].label} />
            <Control legend="Pill" options={PILL_ORDER} value={pill} onChange={setPill}
              labelFor={(p) => PILLS[p].label.split(" · ")[0]} />
            <Control legend="Row scale" options={SCALE_ORDER} value={scale} onChange={setScale}
              labelFor={(s) => SCALES[s].label.split(" · ")[0]} />
            <Control legend="Column" options={WIDTH_ORDER} value={width} onChange={setWidth}
              labelFor={(w) => WIDTHS[w].label.split(" · ")[0]} />
          </div>

          <p className="mt-5 max-w-[70ch] font-mono text-xs text-xn-ink-soft">
            {CHROMES[chrome].note}
          </p>

          <div className={`mt-6 flex flex-col gap-3 ${WIDTHS[width].className}`}>
            {ITEMS.map((item) => (
              <HistoryRowSpecimen key={item.id} item={item} pill={pill}
                scale={SCALES[scale]} chrome={CHROMES[chrome]} />
            ))}
          </div>
        </section>

        {/* Chrome, all three at once. The row underneath is identical in
            every one, so the only thing changing is the thing being judged. */}
        <section className="border-t border-xn-border py-10">
          <h2 className="text-h4 font-semibold text-xn-ink">Chrome, all three together</h2>
          <p className="mt-1.5 max-w-[62ch] text-ui text-xn-ink-muted">
            Same row, same pill, same still. Only the tag, date, pill and Move
            change size.
          </p>
          <div className={`mt-6 flex flex-col gap-6 ${WIDTHS[width].className}`}>
            {CHROME_ORDER.map((name) => (
              <div key={name}>
                <p className="eyebrow mb-2">{CHROMES[name].label}</p>
                <HistoryRowSpecimen item={ITEMS[0]} pill={pill}
                  scale={SCALES[scale]} chrome={CHROMES[name]} />
              </div>
            ))}
          </div>
        </section>

        {/* Pill strength, all four at once. */}
        <section className="border-t border-xn-border py-10">
          <h2 className="text-h4 font-semibold text-xn-ink">Pill strength, all four together</h2>
          <p className="mt-1.5 max-w-[62ch] text-ui text-xn-ink-muted">
            The outlined treatment throughout — only the border and the ground
            change. Switch themes: amber is fixed in both, so these hold their
            weight while everything around them inverts.
          </p>
          <div className={`mt-6 flex flex-col gap-6 ${WIDTHS[width].className}`}>
            {PILL_ORDER.map((variant) => (
              <div key={variant}>
                <p className="eyebrow mb-2">{PILLS[variant].label}</p>
                <HistoryRowSpecimen item={ITEMS[0]} pill={variant}
                  scale={SCALES[scale]} chrome={CHROMES[chrome]} />
              </div>
            ))}
          </div>
        </section>

        {/* Regression harness for the error -> cached-URL transition.
            Start broken (the component sets imgError, so the <img> is not
            rendered at all), then swap to a URL that is already in cache.
            If the swap leaves an invisible thumbnail, the bug is present. */}
        <section className="border-t border-xn-border py-10">
          <h2 className="text-h4 font-semibold text-xn-ink">Error → cached URL</h2>
          <ErrorToCachedProbe />
        </section>

        <footer className="border-t border-xn-border py-10">
          <p className="text-sm text-xn-ink-soft">
            Delete this route once the pill and the chrome are chosen.
          </p>
        </footer>
      </div>
    </div>
  );
}
