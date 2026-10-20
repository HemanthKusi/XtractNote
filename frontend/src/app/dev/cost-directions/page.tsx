"use client";

// src/app/dev/cost-directions/page.tsx  →  route: /dev/cost-directions
//
// What a start costs and what the user has, on the create page before they
// commit (#454): the directions it was chosen from, kept as the record.
// A · Beside was chosen first, provisionally, until the side menu showed the
// balance (#460). Once it did, the line was revisited: **B2 · Final is what
// ships** — the price inside the button, joining it with the menu's stretch,
// and the balance only when it is short. Rendered inside the real AppShell
// (fed the page's balance, so the menu agrees with the line), in create's own
// column, with the real SourcePanel,
// ContentTypePicker and SocialPlatformPicker; only the start line changes.
//
// The price here is worked out on the page from the same rules the backend
// charges by (1 or 2 by format, +1 per started hour past the first). The
// built page will ask the server instead, so it shows what the start charges.

import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout";
import { ContentTypePicker } from "@/components/create/content-type-picker";
import { SocialPlatformPicker } from "@/components/create/social-platform-picker";
import { SourcePanel } from "@/components/create/source-panel";
import { useTheme } from "@/components/shared/theme-provider";
import { contentTypeColors } from "@/lib/constants/theme";
import type { GeneratableContentType, SocialPlatform } from "@/lib/content/types";
import type { BalanceState } from "@/lib/credits/cost";
import type { VideoMeta } from "@/lib/youtube/types";

import { StartLine, type Balance, type CostDirection, type Load, type Price } from "./start-line";

type LoadPhase = "ready" | "loading" | "failed";

interface Choice<T extends string> {
  id: T;
  label: string;
  note: string;
}

const DIRECTIONS: Choice<CostDirection>[] = [
  {
    id: "inButtonMotion",
    label: "B2 · Final",
    note: "Chosen — what ships. Round 4 — B2 without the ring. The button first says only what it makes; a beat later it stretches a little past its new size and settles back — the menu's own spring — as the price slides in behind a divider. Short: the button goes off, and one line beneath says what you have and when credits refill. \"replay\" plays it again.",
  },
  {
    id: "joinedB1",
    label: "B1 · Joined",
    note: "Round 3 — B, attached. The price in an outlined pill the button's height, against it, with a small version of the menu's cell ring. Short: the pill adds \"You have 1\" in red; the refill date beneath.",
  },
  {
    id: "inButtonB2",
    label: "B2 · In the button",
    note: "Round 3. The price as the button's trailing segment, behind a thin divider, with the cell ring. Short: the button goes off, and one line beneath says what you have and when credits refill.",
  },
  {
    id: "captionB3",
    label: "B3 · Caption",
    note: "Round 3. One line under the button, on its left edge: the cell ring, \"Costs 2 credits\". Short: it continues \"· you have 1 · refills 30 October\".",
  },
  {
    id: "builtA",
    label: "Revisit A · Keep",
    note: "Round 2 — the menu shows the balance now (#460). A as it shipped until round 4: the price and \"You have N\" beside the button, so the balance shows twice — here and in the menu.",
  },
  {
    id: "shortOnlyB",
    label: "Revisit B · Short only",
    note: "Round 2. The price alone, until the balance is short: then \"You have 1\" in red, the button off, and the refill date beneath. The menu carries the balance the rest of the time.",
  },
  {
    id: "priceOnlyC",
    label: "Revisit C · Price only",
    note: "Round 2. The price alone, always. Short: the button off and the refill date beneath; what you have is in the menu.",
  },
  {
    id: "today",
    label: "Today",
    note: "Nothing until a start is refused; then the cost appears in red and the button says Try again, which cannot work before the refill. For reference.",
  },
  {
    id: "beside",
    label: "A · Beside",
    note: "Chosen, provisionally. The price and what you have, quiet, to the right of the button. Short: the button turns off and the balance turns red, with the refill date underneath.",
  },
  {
    id: "button",
    label: "B · In the button",
    note: "The price is part of the button's label; what is left and the refill date on one line beneath. Short: the button says what it needs.",
  },
  {
    id: "receipt",
    label: "C · Receipt",
    note: "A short receipt above the button: the format's price, the length's extra hours when there are any, and the balance before → after. Says why a long video costs more.",
  },
];

const BALANCES = [28, 2, 1, 0];

const LENGTHS: { seconds: number; label: string; shown: string }[] = [
  { seconds: 214, label: "3 min", shown: "3:34" },
  { seconds: 4_800, label: "1 h 20", shown: "1:20:00" },
  { seconds: 9_900, label: "2 h 45", shown: "2:45:00" },
];

const PHASES: { id: LoadPhase; label: string }[] = [
  { id: "ready", label: "Loaded" },
  { id: "loading", label: "Loading" },
  { id: "failed", label: "Failed" },
];

const BASE_PRICE: Record<GeneratableContentType, number> = {
  summary: 1,
  flashcards: 1,
  quiz: 1,
  social: 1,
  notes: 2,
  research: 2,
  blog: 2,
};

const REFILLS_AT = "2026-10-30T19:30:49+00:00";

function priceFor(type: GeneratableContentType, seconds: number, shown: string): Price {
  const extraHours = Math.max(0, Math.ceil(seconds / 3600) - 1);
  return { base: BASE_PRICE[type], extraHours, total: BASE_PRICE[type] + extraHours, length: shown };
}

function loaded<T>(phase: LoadPhase, value: T): Load<T> {
  return phase === "ready" ? { phase, value } : { phase };
}

export default function CostDirectionsPage() {
  const [direction, setDirection] = useState<CostDirection>("inButtonMotion");
  const [type, setType] = useState<GeneratableContentType | null>("notes");
  const [platform, setPlatform] = useState<SocialPlatform | null>(null);
  const [credits, setCredits] = useState(28);
  const [lengthIndex, setLengthIndex] = useState(0);
  const [pricePhase, setPricePhase] = useState<LoadPhase>("ready");
  const [balancePhase, setBalancePhase] = useState<LoadPhase>("ready");
  const [refused, setRefused] = useState(false);
  // Bumped by "replay", which mounts the start line afresh so its motion plays again.
  const [replay, setReplay] = useState(0);
  const [folded, setFolded] = useState(false);
  const { theme, setTheme } = useTheme();

  // Any change puts Today's refusal away, as a new choice would on the page.
  useEffect(() => {
    setRefused(false);
  }, [direction, type, platform, credits, lengthIndex, pricePhase, balancePhase]);

  const length = LENGTHS[lengthIndex];
  const meta: VideoMeta = {
    videoId: "wjZofJX0v4M",
    title: "Transformers, the tech behind LLMs | Deep Learning Chapter 5",
    channel: "3Blue1Brown",
    thumbnailUrl: "https://img.youtube.com/vi/wjZofJX0v4M/hqdefault.jpg",
    url: "https://www.youtube.com/watch?v=wjZofJX0v4M",
    durationSeconds: length.seconds,
  };

  const ready = type !== null && (type !== "social" || platform !== null);
  const label = type ? contentTypeColors[type].label : null;
  // With no format chosen there is nothing to price; the start line shows no
  // price then, whatever this holds.
  const price: Load<Price> = type
    ? loaded(pricePhase, priceFor(type, length.seconds, length.shown))
    : { phase: "loading" };
  const balance = loaded<Balance>(balancePhase, { credits, refillsAt: REFILLS_AT });
  // The menu's foot shows the same balance the line does.
  const menuBalance: BalanceState =
    balance.phase === "ready"
      ? { phase: "ready", balance: { balance: credits, allowance: 30, nextRefillAt: REFILLS_AT } }
      : balance;

  function start() {
    if (direction !== "today") return;
    if (price.phase === "ready" && credits < price.value.total) setRefused(true);
  }

  const small =
    "rounded-xn-sm px-2 py-1 font-mono text-micro text-xn-ink-muted transition-colors duration-xn ease-xn hover:bg-xn-surface-alt hover:text-xn-ink";

  return (
    <>
      <AppShell previewBalance={menuBalance}>
        <div className="mx-auto max-w-output px-6 py-10">
          <h2 className="mb-4 text-h5 text-xn-ink">Using this video</h2>
          <SourcePanel meta={meta} onChange={() => {}} />

          <div className="mt-8">
            <h2 className="mb-4 text-h5 text-xn-ink">What should it become?</h2>
            <ContentTypePicker selected={type} onSelect={setType} selectedPlatform={platform} />
            <SocialPlatformPicker
              visible={type === "social"}
              selected={platform}
              onSelect={setPlatform}
              className="mt-5"
            />

            <StartLine
              key={replay}
              direction={direction}
              action={ready && label ? `Make ${label.toLowerCase()}` : null}
              formatLabel={label}
              price={price}
              balance={balance}
              refused={refused}
              onStart={start}
            />
          </div>
        </div>
      </AppShell>

      {folded ? (
        <button
          type="button"
          onClick={() => setFolded(false)}
          className="fixed bottom-4 right-4 z-50 rounded-xn-lg border border-xn-border bg-xn-surface px-3 py-2 font-mono text-micro text-xn-ink-muted shadow-xn-lg"
        >
          Controls
        </button>
      ) : (
        <div className="fixed bottom-4 right-4 z-50 max-h-[calc(100vh-2rem)] w-[332px] overflow-y-auto rounded-xn-lg border border-xn-border bg-xn-surface p-3 shadow-xn-lg">
          <div className="flex items-center justify-between">
            <p className="font-mono text-micro uppercase tracking-wide text-xn-ink-soft">Cost on create</p>
            <span className="flex items-center gap-1">
              <button type="button" onClick={() => setReplay((n) => n + 1)} className={small}>
                replay
              </button>
              <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className={small}>
                {theme === "dark" ? "→ light" : "→ dark"}
              </button>
              <button type="button" onClick={() => setFolded(true)} className={small}>
                hide
              </button>
            </span>
          </div>

          <Directions title="Direction" options={DIRECTIONS} value={direction} onChange={setDirection} />
          <Picker
            title="Balance"
            options={BALANCES.map((n) => ({ id: String(n), label: String(n) }))}
            value={String(credits)}
            onChange={(id) => setCredits(Number(id))}
          />
          <Picker
            title="Video length"
            options={LENGTHS.map((l, index) => ({ id: String(index), label: l.label }))}
            value={String(lengthIndex)}
            onChange={(id) => setLengthIndex(Number(id))}
          />
          <Picker title="Price" options={PHASES} value={pricePhase} onChange={setPricePhase} />
          <Picker title="Balance load" options={PHASES} value={balancePhase} onChange={setBalancePhase} />

          <p className="mt-3 text-xs leading-snug text-xn-ink-soft">
            In every direction a price or balance that is loading or failed leaves the button on — the server
            prices and refuses on its own. Only a balance known to be short turns it off. In Today, a start
            with too few credits shows the refusal the page shows now.
          </p>
        </div>
      )}
    </>
  );
}

function Picker<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <>
      <p className="mt-3 font-mono text-micro uppercase tracking-wide text-xn-ink-soft">{title}</p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={[
              "rounded-xn-sm px-2 py-1.5 text-left text-sm transition-colors duration-xn ease-xn",
              option.id === value
                ? "bg-xn-ink text-xn-bg"
                : "text-xn-ink-muted hover:bg-xn-surface-alt hover:text-xn-ink",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </>
  );
}

function Directions<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Choice<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  const active = options.find((option) => option.id === value);
  return (
    <>
      <Picker title={title} options={options} value={value} onChange={onChange} />
      <p className="mt-1.5 text-xs leading-snug text-xn-ink-soft">{active?.note}</p>
    </>
  );
}
