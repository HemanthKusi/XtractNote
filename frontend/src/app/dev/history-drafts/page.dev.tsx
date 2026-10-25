"use client";

// src/app/dev/history-drafts/page.dev.tsx  →  route: /dev/history-drafts
//
// How a draft could be marked in the History list (#423): the treatments it
// was chosen from, kept as the record. B + D with the solid chip shipped.
//
// Each treatment shows the same list: two drafts and two saved items, one of
// them in a folder. The saved rows are the real HistoryCard, so a treatment
// that disturbed them would show up here as a difference. "Before" is the
// list as it was before drafts were marked, for reference.
//
// Rendered inside the real AppShell at History's own column (`max-w-wide`).

import { useState } from "react";

import { AppShell } from "@/components/layout";
import { HistoryCard } from "@/components/history/history-card";
import { useTheme } from "@/components/shared/theme-provider";
import type { HistoryItem } from "@/lib/api/history";

import { DraftRow, type ChipStrength, type Treatment } from "./draft-row";

const TREATMENTS: { id: Treatment; label: string; note: string }[] = [
  {
    id: "today",
    label: "Before",
    note: "Before drafts were marked: a draft looked exactly like a saved item. For reference.",
  },
  {
    id: "word",
    label: "A · Word",
    note: "\"Draft\" in the line that already carries the format and the date, in ink at the label's weight. No new element; the row's shape is untouched.",
  },
  {
    id: "chip",
    label: "B · Chip",
    note: "The design system's existing status chip, after the date. One word and one look for \"draft\" across the app, at the cost of the chip the row once removed.",
  },
  {
    id: "outline",
    label: "C · Outline",
    note: "The row drawn as not yet kept: a dashed border on the page background instead of a raised surface, and a dashed rail. Plus the word, so it does not rest on line style alone.",
  },
  {
    id: "action",
    label: "D · Action",
    note: "The mark and the way out of it as one control: a draft offers Save draft where a saved row offers Add to folder. Adds saving from History to the issue's scope.",
  },
  {
    id: "combined",
    label: "B + D",
    note: "The chip and the action together. A draft has Save draft and cannot be filed until it is kept. The top row is a run still generating, with View progress: it does not exist in History today (see below).",
  },
];

const STRENGTHS: { id: ChipStrength; label: string }[] = [
  { id: "soft", label: "Soft" },
  { id: "ink", label: "Ink outline" },
  { id: "solid", label: "Solid" },
];

const HOUR = 3600_000;
const at = (hoursAgo: number) => new Date(Date.now() - hoursAgo * HOUR).toISOString();

function sample(partial: Pick<HistoryItem, "id" | "contentType" | "title" | "channel" | "wordCount" | "status" | "folderId"> & { videoId: string; hoursAgo: number }): HistoryItem {
  return {
    id: partial.id,
    contentType: partial.contentType,
    title: partial.title,
    channel: partial.channel,
    thumbnail: `https://img.youtube.com/vi/${partial.videoId}/hqdefault.jpg`,
    wordCount: partial.wordCount,
    createdAt: at(partial.hoursAgo),
    markdown: "",
    body: { markdown: "" },
    folderId: partial.folderId,
    status: partial.status,
  };
}

const ITEMS: HistoryItem[] = [
  sample({ id: "d1", contentType: "summary", title: "Transformers, the tech behind LLMs | Deep Learning Chapter 5", channel: "3Blue1Brown", wordCount: 261, status: "draft", folderId: null, videoId: "wjZofJX0v4M", hoursAgo: 16 }),
  sample({ id: "d2", contentType: "blog", title: "But what is a neural network? | Deep learning chapter 1", channel: "3Blue1Brown", wordCount: 1184, status: "draft", folderId: null, videoId: "aircAruvnKk", hoursAgo: 52 }),
  sample({ id: "s1", contentType: "notes", title: "Gradient descent, how neural networks learn | Deep Learning Chapter 2", channel: "3Blue1Brown", wordCount: 912, status: "saved", folderId: "f1", videoId: "IHZwWFHWa-w", hoursAgo: 70 }),
  sample({ id: "s2", contentType: "research", title: "Attention Is All You Need: the transformer paper explained end to end", channel: "Yannic Kilcher", wordCount: 1840, status: "saved", folderId: null, videoId: "iDulhoQ2pro", hoursAgo: 96 }),
];

const FOLDER = { name: "Machine Learning", emoji: "🧠" };

/** A run still going, shown only under "B + D". No such row reaches History today. */
const GENERATING: HistoryItem = sample({
  id: "g1",
  contentType: "quiz",
  title: "How large language models work, a visual intro to transformers",
  channel: "3Blue1Brown",
  wordCount: 0,
  status: "draft",
  folderId: null,
  videoId: "LPZh9BOjkQs",
  hoursAgo: 2 / 60,
});

export default function HistoryDraftsPage() {
  const [treatment, setTreatment] = useState<Treatment>("combined");
  const [strength, setStrength] = useState<ChipStrength>("ink");
  const [folded, setFolded] = useState(false);
  const { theme, setTheme } = useTheme();
  const active = TREATMENTS.find((entry) => entry.id === treatment);

  const small =
    "rounded-xn-sm px-2 py-1 font-mono text-micro text-xn-ink-muted transition-colors duration-xn ease-xn hover:bg-xn-surface-alt hover:text-xn-ink";

  return (
    <>
      <AppShell>
        {/* History's own column and heading, so the rows sit where they ship. */}
        <div className="mx-auto max-w-wide px-4 py-10 sm:px-6">
          <h1 className="text-h2 text-xn-ink">History</h1>
          <p className="mt-2 text-body text-xn-ink-muted">Everything you&apos;ve saved, newest first.</p>

          <div className="mt-8 flex flex-col gap-3">
            {treatment === "combined" && (
              <DraftRow item={GENERATING} treatment={treatment} kind="generating" strength={strength} />
            )}
            {ITEMS.map((item) =>
              item.status === "draft" && treatment !== "today" ? (
                <DraftRow key={item.id} item={item} treatment={treatment} strength={strength} />
              ) : (
                <HistoryCard
                  key={item.id}
                  // "Before" drops the status, which rows did not carry then.
                  item={treatment === "today" ? { ...item, status: null } : item}
                  folderLabel={item.folderId ? FOLDER : null}
                  onOpen={() => {}}
                  onMove={() => {}}
                />
              ),
            )}
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
        <div className="fixed bottom-4 right-4 z-50 w-[316px] rounded-xn-lg border border-xn-border bg-xn-surface p-3 shadow-xn-lg">
          <div className="flex items-center justify-between">
            <p className="font-mono text-micro uppercase tracking-wide text-xn-ink-soft">Draft mark</p>
            <span className="flex items-center gap-1">
              <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className={small}>
                {theme === "dark" ? "→ light" : "→ dark"}
              </button>
              <button type="button" onClick={() => setFolded(true)} className={small}>
                hide
              </button>
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {TREATMENTS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setTreatment(entry.id)}
                className={[
                  "rounded-xn-sm px-2 py-1.5 text-left text-sm transition-colors duration-xn ease-xn",
                  entry.id === treatment
                    ? "bg-xn-ink text-xn-bg"
                    : "text-xn-ink-muted hover:bg-xn-surface-alt hover:text-xn-ink",
                ].join(" ")}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-snug text-xn-ink-soft">{active?.note}</p>

          {treatment === "combined" && (
            <>
              <p className="mt-3 font-mono text-micro uppercase tracking-wide text-xn-ink-soft">Chip strength</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {STRENGTHS.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setStrength(entry.id)}
                    className={[
                      "rounded-xn-sm px-2 py-1.5 text-left text-sm transition-colors duration-xn ease-xn",
                      entry.id === strength
                        ? "bg-xn-ink text-xn-bg"
                        : "text-xn-ink-muted hover:bg-xn-surface-alt hover:text-xn-ink",
                    ].join(" ")}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs leading-snug text-xn-ink-soft">
                Soft is the design system&apos;s current draft chip. All three stay monochrome: status is chrome, and colour is kept for failure.
              </p>
            </>
          )}

          <p className="mt-3 text-xs leading-snug text-xn-ink-soft">
            The drafts are above the two saved rows, which are drawn by the real HistoryCard.
          </p>
        </div>
      )}
    </>
  );
}
