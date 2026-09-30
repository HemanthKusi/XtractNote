"use client";

// src/app/dev/sidebar-modes/page.tsx  →  route: /dev/sidebar-modes
//
// Specimens for the three menu modes. A harness; never ships.
//
// The harness is FULL-BLEED on purpose. Every other specimen in this project
// is pinned to the container its component renders in — but this component IS
// the container. The app shell's real container is the viewport, so pinning
// this harness to a comfortable column would repeat the exact mistake that
// shipped a flashcard collision: measuring against a width the product does
// not have.

import { useState } from "react";

import {
  DOCK_W,
  EXPANDED_HOVER_LABEL,
  EXPANDED_HOVERS,
  ICON,
  ICON_SPEED,
  ICON_ZOOM,
  MENU_MODES,
  MENU_TITLE_PX,
  MODE_LABEL,
  MORPH_MS,
  PANEL_HOVER,
  type ExpandedHover,
  type MenuMode,
} from "./menu-modes";
import { ModeShell } from "./mode-shell";

function Dial({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex min-w-[200px] flex-1 flex-col gap-1">
      <span className="flex items-baseline justify-between font-mono text-micro uppercase tracking-[0.06em] text-xn-ink-soft">
        {label}
        <span className="text-xn-ink">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-xn-ink"
      />
    </label>
  );
}

export default function SidebarModesPage() {
  const [mode, setMode] = useState<MenuMode>("expanded");
  const [railWidth, setRailWidth] = useState(DOCK_W);
  const [morphMs, setMorphMs] = useState(MORPH_MS);
  const [shellWidth, setShellWidth] = useState(1280);
  const [iconPx, setIconPx] = useState(ICON);
  const [iconZoom, setIconZoom] = useState(ICON_ZOOM);
  const [iconSpeed, setIconSpeed] = useState(ICON_SPEED);
  const [menuTitlePx, setMenuTitlePx] = useState(MENU_TITLE_PX);
  const [hoverVariant, setHoverVariant] = useState<ExpandedHover>(PANEL_HOVER.variant);
  const [hoverZoom, setHoverZoom] = useState(PANEL_HOVER.zoom);
  const [hoverCrop, setHoverCrop] = useState(PANEL_HOVER.crop);
  const [enableAll, setEnableAll] = useState(false);

  return (
    <div className="min-h-screen bg-xn-bg text-xn-ink">
      <div className="px-8 py-10">
        <header className="mb-6">
          <p className="mb-2 font-mono text-micro uppercase tracking-[0.06em] text-xn-ink-soft">
            Specimen · menu modes
          </p>
          <h1 className="font-serif text-display text-xn-ink">Three modes, one menu</h1>
          <p className="mt-2 max-w-[70ch] text-body text-xn-ink-muted">
            Expanded, rail and floating are states of the same menu — same
            destinations, same active row, same icons. The logo has been taken
            out of the menu and pinned to the shell&apos;s top-left corner, so it
            holds still while everything under it changes size.
          </p>
        </header>

        {/* ── Mode switch + dials ── */}
        <div className="mb-6 flex flex-wrap items-end gap-6 rounded-xn-lg border border-xn-border bg-xn-surface p-4">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-micro uppercase tracking-[0.06em] text-xn-ink-soft">Mode</span>
            <div className="flex gap-1.5">
              {MENU_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={[
                    "rounded-xn-pill border px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                    mode === m
                      ? "border-xn-ink bg-xn-ink text-xn-bg"
                      : "border-xn-border bg-xn-surface text-xn-ink-muted hover:bg-xn-surface-alt",
                  ].join(" ")}
                >
                  {MODE_LABEL[m]}
                </button>
              ))}
            </div>
          </div>

          <Dial label="Shell width" value={shellWidth} min={900} max={1600} step={10} suffix="px" onChange={setShellWidth} />
          <Dial label="Dock width" value={railWidth} min={56} max={96} suffix="px" onChange={setRailWidth} />
          <Dial label="Morph" value={morphMs} min={200} max={1200} step={20} suffix="ms" onChange={setMorphMs} />
          <Dial label="Icon" value={iconPx} min={14} max={24} suffix="px" onChange={setIconPx} />
          <Dial label="Icon zoom" value={iconZoom} min={1} max={1.8} step={0.05} suffix="x" onChange={setIconZoom} />
          <Dial label="Menu title" value={menuTitlePx} min={11} max={30} suffix="px" onChange={setMenuTitlePx} />
          <Dial label="Icon speed" value={iconSpeed} min={0.2} max={1.5} step={0.05} suffix="x" onChange={setIconSpeed} />

          {/* In the panel every nav glyph zooms and gets cropped rather than
              looping; this chooses WHICH box does the cropping. "Cut by the
              row" is the chosen design and the default — the slot variant is
              kept alongside it because the comparison is what settled it.
              Switch to Expanded and hover any row. */}
          <div className="flex flex-col gap-1">
            <span className="font-mono text-micro uppercase tracking-[0.06em] text-xn-ink-soft">
              Panel hover
            </span>
            <div className="flex gap-1.5">
              {EXPANDED_HOVERS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setHoverVariant(v)}
                  className={[
                    "rounded-xn-pill border px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                    hoverVariant === v
                      ? "border-xn-ink bg-xn-ink text-xn-bg"
                      : "border-xn-border bg-xn-surface text-xn-ink-muted hover:bg-xn-surface-alt",
                  ].join(" ")}
                >
                  {EXPANDED_HOVER_LABEL[v]}
                </button>
              ))}
            </div>
          </div>

          <Dial label="Hover zoom" value={hoverZoom} min={1.2} max={3} step={0.1} suffix="x" onChange={setHoverZoom} />
          <Dial label="Hover crop" value={hoverCrop} min={0} max={0.6} step={0.05} suffix="" onChange={setHoverCrop} />

          {/* Testing aid, not a design state. Extension and Settings are inert
              in the product because neither route exists — which also means
              their icons can never be hovered, so their animation is otherwise
              impossible to see. */}
          <label className="flex cursor-pointer select-none flex-col gap-1">
            <span className="font-mono text-micro uppercase tracking-[0.06em] text-xn-ink-soft">
              Testing
            </span>
            <span
              className={[
                "flex items-center gap-2 rounded-xn-pill border px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                enableAll
                  ? "border-xn-ink bg-xn-ink text-xn-bg"
                  : "border-xn-border bg-xn-surface text-xn-ink-muted hover:bg-xn-surface-alt",
              ].join(" ")}
            >
              <input
                type="checkbox"
                checked={enableAll}
                onChange={(e) => setEnableAll(e.target.checked)}
                className="sr-only"
              />
              Wake the inert rows
            </span>
          </label>
        </div>

        {/* ── Specimen 1: the shell, at viewport width ── */}
        <section className="mb-12">
          <h2 className="mb-1 text-h4 font-semibold text-xn-ink-muted">
            One menu, morphing between three shapes
          </h2>
          <p className="mb-3 max-w-[70ch] text-sm text-xn-ink-muted">
            <span className="text-xn-ink">One menu element, floating in all three modes.</span>{" "}
            It is never attached to the side, so every mode shares one anchor and
            only the box changes: a panel, a dock, a button. Each step moves one
            dimension —{" "}
            <span className="text-xn-ink">panel to dock is width alone, dock to button is height alone</span>{" "}
            — which is what makes it read as one object changing shape rather
            than one object being replaced. Pressing the button brings it back
            to the dock.
          </p>
          <p className="mb-4 max-w-[70ch] text-sm text-xn-ink-muted">
            Switch modes and watch the content column measure itself under the
            heading. The card grid uses the flashcard grid&apos;s own
            container-derived rule, so a mode that gives back width genuinely
            buys a column — it is not a claim, it is the same CSS.{" "}
            <span className="text-xn-ink">
              The shell dial exists because of what this specimen nearly hid:
            </span>{" "}
            above roughly 1420px the output column hits its 1058 ceiling in every
            mode, so collapsing the menu moves margins and gives the content
            nothing. The line under the heading turns red when that is happening.
          </p>
          <ModeShell
            mode={mode}
            onModeChange={setMode}
            railWidth={railWidth}
            morphMs={morphMs}
            iconPx={iconPx}
            iconZoom={iconZoom}
            iconSpeed={iconSpeed}
            menuTitlePx={menuTitlePx}
            panelHover={{ variant: hoverVariant, zoom: hoverZoom, crop: hoverCrop }}
            enableAll={enableAll}
            shellWidth={shellWidth}
          />
        </section>

        {/* ── What still needs deciding ── */}
        <section className="rounded-xn-lg border border-xn-border bg-xn-surface p-5">
          <h2 className="mb-3 text-h4 font-semibold text-xn-ink-muted">Open, and yours to call</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-xn-ink-muted">
            <li>
              <span className="text-xn-ink">How the menu gets INTO floating.</span>{" "}
              Coming out is settled — press the pill and it returns to rail. The
              way down is not: the foot chevron currently steps expanded ↔ rail
              only, so the chips above are what reach floating. One control
              cannot serve both directions at rail without a hidden sense of
              which way it is heading, so floating probably wants its own
              affordance, or a gesture. This is the last piece of the model.
            </li>
            <li>
              <span className="text-xn-ink">Folders in the floating panel.</span>{" "}
              The docked menu has room for a folder list; the pill does not
              without getting tall. They are left out of all three shapes here
              so the morph is judged on its own.
            </li>
            <li>
              <span className="text-xn-ink">Whether the gooey separation belongs here at all.</span>{" "}
              The bible&apos;s Input entry sets a placement rule —{" "}
              <em>&ldquo;the gooey separation belongs to search only (topbar,
              history)&rdquo;</em> — on the grounds that a signature which
              appears everywhere stops being one. Putting it on the menu widens
              that, deliberately, and is worth confirming rather than assuming.
            </li>
            <li>
              <span className="text-xn-ink">Whether floating mode keeps the top bar.</span>{" "}
              It does here. If the point of floating is a clean canvas, search
              and the avatar could fold into the pill too.
            </li>
            <li>
              <span className="text-xn-ink">Rail labels.</span> Native tooltips are
              standing in. A designed tooltip is a component we do not have yet.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
