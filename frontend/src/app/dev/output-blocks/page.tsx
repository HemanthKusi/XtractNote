"use client";

// src/app/dev/output-blocks/page.tsx  →  route: /dev/output-blocks
//
// The block vocabulary, at three densities. Not shipped.
//
// ── What this route is for, and what it is NOT ──
//
// It exists to judge NINE BLOCK RENDERERS: para, list, quote, table, code,
// math, derivation, example, definition — plus the inline markers for
// highlights, maths, citations and equation references.
//
// It is NOT re-judging direction D. The shell here is D's, reduced: the pinned
// bar, the reading column, the collapsible source pane. What is new is the
// pane's SOURCES mode, which exists because research cites papers and D's pane
// only modelled the video.
//
// **There is deliberately no scroll spy.** D's tracker is settled and its two
// bugs are fixed and recorded; re-implementing it here would risk
// reintroducing them to answer a question this route is not asking. Contents is
// a jump list.
//
// ── Why this route does not import from the blog specimen ──
//
// It would be less code. It would also make a settled artefact a dependency of
// an unsettled one, so a change here could break a route that is already
// merged and agreed. The overlap is copied and labelled instead — see the note
// at the bottom of blocks.tsx — and §16 records where both copies go at port
// time, which is neither of these files.

import { useState } from "react";

import { AppShell } from "@/components/layout";
import { Chip } from "@/components/ui/chip";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { useTheme } from "@/components/shared/theme-provider";

import { BlockView, numberEquations, toRoman, widthFor, type RenderCtx } from "./blocks";
import { DOCS, type Reference } from "./content";

// The clip every specimen in this project uses, for continuity.
const VIDEO = {
  videoId: "wjZofJX0v4M",
  title: "Transformers, the tech behind LLMs | Deep Learning Chapter 5",
  channel: "3Blue1Brown",
  url: "https://www.youtube.com/watch?v=wjZofJX0v4M",
  duration: "28:07",
} as const;

// Settled in the blog work: lime, opaque on dark at a luminance that does not
// glare, with near-black text inside the band.
const HIGHLIGHT = {
  light: { bg: "#d8f24f", ink: "var(--xn-ink)" },
  dark: { bg: "#a6c03c", ink: "#12150b" },
};

// ── No reading time ──
//
// It was in the bar and it is gone, on Hemanth's call, for every content type.
// The dwell model behind it was reasonable and it still measured the wrong
// thing: a reader deciding whether to open a research brief is not deciding
// on minutes, and a number that says "4 min" over a page of derivations is
// confidently wrong in a way a missing number never is.
//
// The model is preserved in §16 if it is ever wanted for a listing surface,
// where an estimate has an actual job.

/**
 * The reference list, rendered in two places.
 *
 * ── Why it is not only in the source pane ──
 *
 * The pane is `hidden lg:block`. Below that breakpoint it is not rendered at
 * all — but the citation markers in the prose still are, and clicking one
 * still set the active source and switched the pane's tab. With nothing to
 * switch, the click produced no visible result: a control that announces
 * itself as actionable and does nothing.
 *
 * That is the third time this exact shape has appeared in this project — the
 * topbar's ⌘K trigger and the create route's "Resume" button were both the
 * same bug — so it gets fixed rather than deferred to the responsive pass.
 *
 * A reference list at the end of a brief is also just what a brief has, so
 * this is the conventional answer rather than a mobile workaround.
 */
function ReferenceList({
  refs,
  activeCite,
  className = "",
}: {
  refs: Reference[];
  activeCite: string | null;
  className?: string;
}) {
  return (
    <ol className={className}>
      {refs.map((ref, i) => {
        const current = activeCite === ref.id;
        return (
          <li key={ref.id}>
            <div
              className={[
                "flex gap-2.5 rounded-xn-sm px-2 py-2.5 transition-colors duration-xn ease-xn",
                current ? "bg-xn-surface-alt" : "",
              ].join(" ")}
            >
              {/* Roman here too, or clicking [iii] in the prose would send you
                  looking for a 3. */}
              <span
                className={[
                  "mt-px flex h-5 w-6 shrink-0 items-center justify-center rounded-xn-sm font-mono text-micro",
                  current ? "bg-xn-ink text-xn-bg" : "bg-xn-surface-alt text-xn-ink-muted",
                ].join(" ")}
              >
                {toRoman(i + 1)}
              </span>
              <span className="min-w-0">
                <span className="block text-sm leading-snug text-xn-ink">{ref.title}</span>
                <span className="mt-0.5 block font-mono text-micro text-xn-ink-soft">
                  {ref.authors} · {ref.year} · {ref.venue}
                </span>
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function OutputBlocksPage() {
  const [docIndex, setDocIndex] = useState(1); // notes: the middle density
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<"video" | "sources">("video");
  const [activeCite, setActiveCite] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  const doc = DOCS[docIndex];
  const eq = numberEquations(doc);
  const hl = theme === "dark" ? HIGHLIGHT.dark : HIGHLIGHT.light;

  const ctx: RenderCtx = {
    eq,
    refs: doc.references,
    activeCite,
    // Clicking a citation opens the pane on Sources and marks the entry, which
    // is the whole reason the second mode exists.
    onCite: (id) => {
      setActiveCite(id);
      setOpen(true);
      setTab("sources");
      // Below `lg` the pane does not exist and the inline list is the
      // destination. Above it the section is display:none, so this resolves to
      // nothing and the pane switch above is what the user sees — one handler,
      // correct at both widths, without asking the component how wide it is.
      document.getElementById("references")?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  };

  return (
    <>
      <AppShell>
        <div
          style={
            {
              "--xn-hl": hl.bg,
              "--xn-hl-ink": hl.ink,
              // The quote fill follows the FORMAT, so it changes with the
              // density switch — the same rule as the blog work, applied to
              // three types rather than one.
              "--xn-quote-fill": `color-mix(in srgb, var(--xn-fmt-${doc.type}) ${
                theme === "dark" ? 20 : 13
              }%, var(--xn-surface))`,
            } as React.CSSProperties
          }
        >
          <div className="mx-auto -mt-6 max-w-[1240px] px-6 pb-16 2xl:max-w-[1440px]">
            {/* ── Pinned bar. Both offsets cancel the shell's py-6 — see the
                blog specimen for why one alone drops it 24px on pinning. ── */}
            <div className="sticky -top-6 z-30 -mx-6 bg-xn-bg px-6 pt-4">
              <div className="flex h-11 items-center gap-4 border-b border-xn-border">
                <Chip
                  contentType={doc.type}
                  icon={<ContentTypeIcon type={doc.type} size="sm" />}
                  className="shrink-0 px-2.5 py-1"
                />
                <span className="min-w-0 flex-1" />
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="shrink-0 rounded-xn-pill border border-xn-border px-3.5 py-1.5 text-sm text-xn-ink-muted transition-colors duration-xn ease-xn hover:border-xn-border-strong hover:text-xn-ink"
                >
                  {open ? "Hide source" : "Show source"}
                </button>
              </div>
            </div>

            <div
              className={[
                "grid gap-10 pt-10",
                open
                  ? "lg:grid-cols-[minmax(0,1fr)_clamp(340px,32%,450px)]"
                  : "lg:grid-cols-1",
              ].join(" ")}
            >
              {/* ── Reading column ── */}
              <article className="min-w-0">
                <div className={open ? "max-w-measure" : "max-w-[820px]"}>
                  <h1 className="font-serif text-h1 leading-tight text-xn-ink">{doc.title}</h1>
                  <p className="mt-4 text-h5 leading-snug text-xn-ink-muted">{doc.dek}</p>
                </div>

                <div className="mt-10">
                  {doc.sections.map((section) => (
                    <section key={section.id} id={section.id} className="mb-12 scroll-mt-20">
                      <h2 className="mb-5 max-w-measure font-serif text-h3 leading-tight text-xn-ink">
                        {section.heading}
                      </h2>
                      <div className="space-y-5">
                        {section.blocks.map((block, i) => (
                          // The measure is per BLOCK, not per page — direction
                          // C's rule. Prose holds 64ch; anything you parse
                          // rather than read gets the room it needs.
                          <div key={i} className={widthFor(block, open)}>
                            <BlockView block={block} ctx={ctx} />
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>

                {/* Below `lg` the source pane is not rendered, so this is the
                    only place a citation can lead. `lg:hidden` is display:none,
                    which also keeps it out of the accessibility tree at wider
                    widths rather than announcing every reference twice. */}
                {doc.references.length > 0 && (
                  <section id="references" className="mt-12 max-w-measure scroll-mt-20 lg:hidden">
                    <h2 className="mb-4 font-serif text-h3 leading-tight text-xn-ink">Sources</h2>
                    <ReferenceList refs={doc.references} activeCite={activeCite} />
                  </section>
                )}
              </article>

              {/* ── Source pane, now with two modes ── */}
              {open && (
                <aside className="hidden lg:block">
                  <div className="sticky top-[76px]">
                    <div className="overflow-hidden rounded-xn-lg border border-xn-border bg-xn-surface">
                      {/* Tabs only when there is a second thing to show. A
                          Sources tab on a document with no citations is a
                          control that leads to an empty room. */}
                      {doc.references.length > 0 && (
                        <div className="flex border-b border-xn-border">
                          {(["video", "sources"] as const).map((id) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setTab(id)}
                              aria-current={tab === id ? "true" : undefined}
                              className={[
                                "flex-1 px-3 py-2.5 text-xs capitalize transition-colors duration-xn ease-xn",
                                tab === id
                                  ? "border-b-2 border-xn-ink text-xn-ink"
                                  : "text-xn-ink-soft hover:text-xn-ink-muted",
                              ].join(" ")}
                            >
                              {id === "sources" ? `Sources (${doc.references.length})` : "Video"}
                            </button>
                          ))}
                        </div>
                      )}

                      {tab === "video" || doc.references.length === 0 ? (
                        <>
                          <a href={VIDEO.url} target="_blank" rel="noopener noreferrer">
                            <VideoThumbnail videoId={VIDEO.videoId} height={225} label="youtube" />
                          </a>
                          <div className="border-b border-xn-border px-4 py-3.5">
                            <p className="line-clamp-2 text-sm leading-snug text-xn-ink">
                              {VIDEO.title}
                            </p>
                            <p className="mt-1.5 font-mono text-micro text-xn-ink-soft">
                              {VIDEO.channel} · {VIDEO.duration}
                            </p>
                          </div>
                          <nav aria-label="Contents" className="px-4 py-4">
                            <p className="mb-3.5 font-mono text-micro uppercase tracking-widest text-xn-ink-soft">
                              Contents
                            </p>
                            <ul className="border-l border-xn-border">
                              {doc.sections.map((s) => (
                                <li key={s.id}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      document
                                        .getElementById(s.id)
                                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                                    }
                                    className="block w-full py-2.5 pl-4 pr-1 text-left text-sm leading-snug text-xn-ink-soft transition-colors duration-xn ease-xn hover:text-xn-ink"
                                  >
                                    {s.heading}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </nav>
                        </>
                      ) : (
                        <ReferenceList
                          refs={doc.references}
                          activeCite={activeCite}
                          className="px-2 py-2"
                        />
                      )}
                    </div>
                  </div>
                </aside>
              )}
            </div>
          </div>
        </div>
      </AppShell>

      {/* ── Harness controls ── */}
      <div className="fixed bottom-4 right-4 z-50 w-[300px] rounded-xn-lg border border-xn-border bg-xn-surface p-3 shadow-xn-lg">
        <div className="flex items-center justify-between">
          <p className="font-mono text-micro uppercase tracking-wide text-xn-ink-soft">Density</p>
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-xn-sm px-2 py-1 font-mono text-micro text-xn-ink-muted transition-colors duration-xn ease-xn hover:bg-xn-surface-alt hover:text-xn-ink"
          >
            {theme === "dark" ? "→ light" : "→ dark"}
          </button>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1">
          {DOCS.map((d, i) => (
            <button
              key={d.type}
              type="button"
              onClick={() => {
                setDocIndex(i);
                setActiveCite(null);
                setTab("video");
              }}
              className={[
                "rounded-xn-sm px-2 py-1.5 text-sm capitalize transition-colors duration-xn ease-xn",
                i === docIndex
                  ? "bg-xn-ink text-xn-bg"
                  : "text-xn-ink-muted hover:bg-xn-surface-alt hover:text-xn-ink",
              ].join(" ")}
            >
              {d.type}
            </button>
          ))}
        </div>

        <p className="mt-2 text-xs leading-snug text-xn-ink-soft">
          {doc.type === "summary" && "para and list only. If this needs a formula, the density brief was wrong."}
          {doc.type === "notes" && "Formulas, a worked example, definitions, a table and code. No citations."}
          {doc.type === "research" && "A numbered derivation, citations into the Sources tab, dense tables."}
        </p>

        {/* The citation-style and table-background dials are gone: both
            questions were answered on 2026-09-09 and the answers are
            hardcoded in blocks.tsx. A control offering a choice already made
            is a question the next reader has to re-ask. */}

        <p className="mt-3 rounded-xn-sm border border-xn-danger bg-xn-danger-soft p-2 text-xs leading-snug text-xn-danger">
          Every block here is authored. The prompts do not ask for LaTeX,
          citations, examples or definitions — see §16 for what the backend has
          to produce.
        </p>
      </div>
    </>
  );
}
