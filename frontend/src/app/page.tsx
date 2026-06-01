"use client";

// ─────────────────────────────────────────────────────────────
// Component Showcase — Phase 3, Sessions 1 + 2
// ─────────────────────────────────────────────────────────────
// Test page for all base UI components.
// Access at: http://localhost:3000
// Replaced by the landing page in Phase 4.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/avatar";
import { Toggle } from "@/components/ui/toggle";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useTheme } from "@/components/shared/theme-provider";
import type { ThemeName } from "@/lib/constants/theme";
import type { ContentType } from "@/lib/constants/theme";

// ── Inline SVG Icons (temporary — replaced by Lucide in Session 3+) ──

const SearchIcon = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const LinkIcon = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const SparkIcon = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const DocIcon = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <path d="M3.5 2h6L13 5.5V14a.5.5 0 0 1-.5.5H3.5A.5.5 0 0 1 3 14V2.5a.5.5 0 0 1 .5-.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

// ── Layout helpers ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <h2 className="font-serif text-h2 text-xn-ink mb-2">{title}</h2>
      <div className="h-px bg-xn-border mb-6" />
      {children}
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-h4 font-semibold text-xn-ink-muted mb-3">{title}</h3>
      {children}
    </div>
  );
}

// ── Main Page ──

export default function ShowcasePage() {
  const { theme, setTheme } = useTheme();
  const themeOptions: ThemeName[] = ["paper", "clean", "dark"];

  // State for the controlled toggle demo
  const [toggleA, setToggleA] = useState(false);
  const [toggleB, setToggleB] = useState(true);

  // State for animated progress demo
  const [progress, setProgress] = useState(33);

  return (
    <div className="min-h-screen bg-xn-bg text-xn-ink transition-colors duration-300">
      <div className="max-w-[960px] mx-auto px-8 py-12">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="eyebrow mb-2">Phase 3 · Sessions 1 & 2</p>
            <h1 className="font-serif text-display text-xn-ink">
              Component Showcase
            </h1>
            <p className="text-sm text-xn-ink-muted mt-2">
              Theme + Button + Input + Card + Chip + Avatar + Toggle + ProgressBar
            </p>
          </div>
          <div className="flex gap-2">
            {themeOptions.map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={[
                  "px-3 py-1.5 rounded-xn-pill text-xs font-medium border transition-all",
                  theme === t
                    ? "bg-xn-ink text-xn-bg border-xn-ink"
                    : "bg-xn-surface text-xn-ink-muted border-xn-border hover:bg-xn-surface-alt",
                ].join(" ")}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            SESSION 1 COMPONENTS
            ══════════════════════════════════════════════════════ */}

        {/* ── Theme Colors ── */}
        <Section title="Theme Colors">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Background", cls: "bg-xn-bg" },
              { label: "Deep", cls: "bg-xn-bg-deep" },
              { label: "Surface", cls: "bg-xn-surface" },
              { label: "Surface Alt", cls: "bg-xn-surface-alt" },
            ].map((swatch) => (
              <div key={swatch.label} className="flex flex-col gap-1.5">
                <div className={`h-16 rounded-xn-md ${swatch.cls} border border-xn-border`} />
                <span className="font-mono text-nano text-xn-ink-soft uppercase tracking-wide">
                  {swatch.label}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-6">
            <span className="text-xn-ink font-semibold">Ink</span>
            <span className="text-xn-ink-muted">Muted</span>
            <span className="text-xn-ink-soft">Soft</span>
            <span className="text-xn-accent font-medium">Accent</span>
          </div>
        </Section>

        {/* ── Typography ── */}
        <Section title="Typography">
          <div className="space-y-4">
            <p className="font-serif text-display">Display — Instrument Serif</p>
            <p className="font-serif text-h1">Heading 1 — Instrument Serif</p>
            <p className="font-serif text-h2">Heading 2 — Instrument Serif</p>
            <p className="text-h3 font-semibold">Heading 3 — DM Sans Semibold</p>
            <p className="text-h4 font-semibold">Heading 4 — DM Sans Semibold</p>
            <p className="text-body">Body text — DM Sans Regular, 14px.</p>
            <p className="text-sm text-xn-ink-muted">Small text — 13px. Secondary info.</p>
            <p className="font-mono text-micro text-xn-ink-soft">Mono — JetBrains Mono, 11px.</p>
            <p className="eyebrow">Eyebrow — JetBrains Mono uppercase</p>
          </div>
        </Section>

        {/* ── Editorial Ink ── */}
        <Section title="Editorial Ink">
          <p className="text-body leading-relaxed max-w-[680px]">
            The video discusses how{" "}
            <span className="mark-yellow">transformer models revolutionized NLP</span>{" "}
            by replacing recurrence with{" "}
            <span className="mark-green">self-attention mechanisms</span>. The presenter
            argues that <span className="mark-blue">scaling laws predict performance</span>{" "}
            better than architecture changes, though{" "}
            <span className="mark-pink">this claim remains controversial</span>{" "}
            among researchers studying{" "}
            <span className="mark-purple">emergent capabilities</span>. Key concept:{" "}
            <span className="underline-accent">attention is all you need</span>.
          </p>
        </Section>

        {/* ── Buttons ── */}
        <Section title="Button">
          <SubSection title="Variants">
            <div className="flex flex-wrap gap-3">
              <Button>Default</Button>
              <Button variant="primary">Primary</Button>
              <Button variant="accent">Accent</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
          </SubSection>
          <SubSection title="Sizes">
            <div className="flex items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </SubSection>
          <SubSection title="With Icons & Shortcuts">
            <div className="flex flex-wrap gap-3">
              <Button icon={<SparkIcon />} variant="accent">Generate</Button>
              <Button icon={<PlusIcon />}>New Project</Button>
              <Button icon={<PlusIcon />} kbd="⌘N">Create</Button>
              <Button variant="ghost" kbd="⌘K">Search Library</Button>
            </div>
          </SubSection>
          <SubSection title="Icon Only & Full Width">
            <div className="flex items-center gap-3 mb-3">
              <Button iconOnly size="sm" variant="ghost" icon={<SearchIcon />} aria-label="Search" />
              <Button iconOnly size="md" variant="ghost" icon={<PlusIcon />} aria-label="Add" />
              <Button iconOnly size="lg" variant="default" icon={<SparkIcon />} aria-label="Generate" />
            </div>
            <div className="max-w-xs">
              <Button variant="primary" fullWidth>Upgrade →</Button>
            </div>
          </SubSection>
          <SubSection title="Disabled">
            <div className="flex gap-3">
              <Button disabled>Default</Button>
              <Button variant="primary" disabled>Primary</Button>
              <Button variant="accent" disabled>Accent</Button>
            </div>
          </SubSection>
        </Section>

        {/* ── Inputs ── */}
        <Section title="Input">
          <SubSection title="Variants & Sizes">
            <div className="max-w-md space-y-3">
              <Input placeholder="Type something..." />
              <Input placeholder="Search your library..." prefix={<SearchIcon />} />
              <Input
                placeholder="https://youtube.com/watch?v=..."
                prefix={<LinkIcon />}
                suffix={<Button size="sm" variant="accent">Extract</Button>}
              />
              <Input size="sm" placeholder="Small input" prefix={<SearchIcon />} />
              <Input size="lg" placeholder="Large hero input" prefix={<LinkIcon />} />
            </div>
          </SubSection>
          <SubSection title="Error & Disabled">
            <div className="max-w-md space-y-3">
              <div>
                <Input placeholder="Paste YouTube URL" prefix={<LinkIcon />} error defaultValue="not-a-valid-url" />
                <p className="text-xs text-[#D44060] mt-1.5">Please enter a valid YouTube URL</p>
              </div>
              <Input placeholder="Disabled input" disabled />
            </div>
          </SubSection>
        </Section>

        {/* ── Cards ── */}
        <Section title="Card (Surface)">
          <SubSection title="Variants">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <p className="text-h4 font-semibold mb-1">Default Card</p>
                <p className="text-sm text-xn-ink-muted">Surface + border + shadow.</p>
              </Card>
              <Card variant="flat">
                <p className="text-h4 font-semibold mb-1">Flat Card</p>
                <p className="text-sm text-xn-ink-muted">Surface + border, no shadow.</p>
              </Card>
              <Card variant="recessed">
                <p className="text-h4 font-semibold mb-1">Recessed Card</p>
                <p className="text-sm text-xn-ink-muted">Deep background, inset look.</p>
              </Card>
              <Card variant="ghost" padding="none">
                <p className="text-h4 font-semibold mb-1">Ghost Card</p>
                <p className="text-sm text-xn-ink-muted">Transparent, no border.</p>
              </Card>
            </div>
          </SubSection>
          <SubSection title="Header, Footer & Interactive">
            <div className="max-w-md mb-4">
              <Card
                header={
                  <div className="flex items-center justify-between">
                    <span className="text-h4 font-semibold">Video Preview</span>
                    <span className="eyebrow">12:42</span>
                  </div>
                }
                footer={
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-xn-ink-soft">By TechChannel · 142K views</span>
                    <Button size="sm" variant="accent" icon={<SparkIcon />}>Generate</Button>
                  </div>
                }
              >
                <div className="h-32 rounded-xn-md bg-xn-bg-deep border border-xn-border flex items-center justify-center">
                  <span className="text-xn-ink-soft text-sm">Video Thumbnail</span>
                </div>
              </Card>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {["Blog Post", "Study Notes", "Summary"].map((type) => (
                <Card key={type} interactive>
                  <p className="text-h4 font-semibold">{type}</p>
                  <p className="text-xs text-xn-ink-muted mt-1">Click to select</p>
                </Card>
              ))}
            </div>
          </SubSection>
          <SubSection title="Three-Layer Depth">
            <div className="bg-xn-bg-deep p-6 rounded-xn-xl border border-xn-border">
              <p className="font-mono text-nano text-xn-ink-soft uppercase tracking-wide mb-3">Layer 1 — bg-deep</p>
              <div className="bg-xn-bg p-5 rounded-xn-lg border border-xn-border">
                <p className="font-mono text-nano text-xn-ink-soft uppercase tracking-wide mb-3">Layer 2 — bg</p>
                <Card elevate="lg" padding="lg">
                  <p className="font-mono text-nano text-xn-ink-soft uppercase tracking-wide mb-2">Layer 3 — surface</p>
                  <p className="text-sm text-xn-ink">Content lives here. Each layer is progressively lighter.</p>
                </Card>
              </div>
            </div>
          </SubSection>
        </Section>

        {/* ══════════════════════════════════════════════════════
            SESSION 2 COMPONENTS
            ══════════════════════════════════════════════════════ */}

        {/* ── Chips ── */}
        <Section title="Chip">
          <SubSection title="Content Types">
            <div className="flex flex-wrap gap-2">
              {(["blog", "notes", "summary", "research", "flashcards", "quiz", "social"] as ContentType[]).map(
                (type) => (
                  <Chip key={type} contentType={type} />
                )
              )}
            </div>
          </SubSection>
          <SubSection title="Status">
            <div className="flex flex-wrap gap-2">
              <Chip status="draft" />
              <Chip status="saved" />
              <Chip status="archived" />
              <Chip status="exported" />
              <Chip status="error" />
            </div>
          </SubSection>
          <SubSection title="Variants">
            <div className="flex flex-wrap gap-2">
              <Chip contentType="blog" />
              <Chip contentType="blog" variant="solid" />
              <Chip contentType="blog" variant="outline" />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Chip contentType="notes" />
              <Chip contentType="notes" variant="solid" />
              <Chip contentType="notes" variant="outline" />
            </div>
          </SubSection>
          <SubSection title="With Dot">
            <div className="flex flex-wrap gap-2">
              <Chip dot dotColor="#E06030">Marketing</Chip>
              <Chip dot dotColor="#4a5cb8">Class Notes</Chip>
              <Chip dot dotColor="#3f7a4f">AI Research</Chip>
              <Chip dot dotColor="#b48a00">YT Scripts</Chip>
            </div>
          </SubSection>
          <SubSection title="With Icon">
            <div className="flex flex-wrap gap-2">
              <Chip icon={<DocIcon />} contentType="blog" />
              <Chip icon={<SparkIcon />} contentType="summary">AI Generated</Chip>
            </div>
          </SubSection>
          <SubSection title="Custom Children (Override Label)">
            <div className="flex flex-wrap gap-2">
              <Chip contentType="blog">Article</Chip>
              <Chip contentType="notes">Lecture Notes</Chip>
              <Chip>Neutral Chip</Chip>
            </div>
          </SubSection>
        </Section>

        {/* ── Avatar ── */}
        <Section title="Avatar">
          <SubSection title="Sizes">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-1.5">
                <Avatar initials="MK" size="sm" />
                <span className="font-mono text-nano text-xn-ink-soft">sm (24)</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Avatar initials="MK" size="md" />
                <span className="font-mono text-nano text-xn-ink-soft">md (28)</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Avatar initials="MK" size="lg" />
                <span className="font-mono text-nano text-xn-ink-soft">lg (36)</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Avatar initials="MK" size="xl" />
                <span className="font-mono text-nano text-xn-ink-soft">xl (48)</span>
              </div>
            </div>
          </SubSection>
          <SubSection title="Different Initials">
            <div className="flex items-center gap-3">
              <Avatar initials="A" size="lg" />
              <Avatar initials="MK" size="lg" />
              <Avatar initials="jd" size="lg" />
              <Avatar initials="SR" size="lg" />
            </div>
          </SubSection>
          <SubSection title="Image Fallback">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1.5">
                <Avatar initials="MK" size="lg" src="https://broken-url.invalid/404.jpg" />
                <span className="font-mono text-nano text-xn-ink-soft">Broken URL → initials</span>
              </div>
            </div>
          </SubSection>
          <SubSection title="In Context (Topbar Preview)">
            <div className="flex items-center gap-2 px-3 py-2 bg-xn-bg border border-xn-border rounded-xn-md">
              <span className="text-sm text-xn-ink-muted">Welcome back</span>
              <span className="text-sm font-semibold">Mohan</span>
              <Avatar initials="MK" />
            </div>
          </SubSection>
        </Section>

        {/* ── Toggle ── */}
        <Section title="Toggle">
          <SubSection title="Controlled (click to toggle)">
            <div className="space-y-4">
              <div className="flex items-center justify-between max-w-xs">
                <span className="text-sm">Auto-save content</span>
                <Toggle
                  checked={toggleA}
                  onChange={setToggleA}
                  aria-label="Auto-save content"
                />
              </div>
              <div className="flex items-center justify-between max-w-xs">
                <span className="text-sm">Enable screenshots</span>
                <Toggle
                  checked={toggleB}
                  onChange={setToggleB}
                  aria-label="Enable screenshots"
                />
              </div>
            </div>
          </SubSection>
          <SubSection title="Uncontrolled">
            <div className="flex items-center justify-between max-w-xs">
              <span className="text-sm">Manages its own state</span>
              <Toggle defaultChecked={false} aria-label="Self-managed toggle" />
            </div>
          </SubSection>
          <SubSection title="Disabled">
            <div className="space-y-4">
              <div className="flex items-center justify-between max-w-xs">
                <span className="text-sm text-xn-ink-soft">Disabled (off)</span>
                <Toggle checked={false} disabled aria-label="Disabled off" />
              </div>
              <div className="flex items-center justify-between max-w-xs">
                <span className="text-sm text-xn-ink-soft">Disabled (on)</span>
                <Toggle checked={true} disabled aria-label="Disabled on" />
              </div>
            </div>
          </SubSection>
          <SubSection title="In Context (Settings Card)">
            <Card variant="flat" padding="none" className="max-w-sm">
              {[
                { label: "Auto-save generated content", on: toggleA, set: setToggleA },
                { label: "Include video screenshots", on: toggleB, set: setToggleB },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i > 0 ? "border-t border-xn-border" : ""
                  }`}
                >
                  <span className="text-sm">{item.label}</span>
                  <Toggle checked={item.on} onChange={item.set} aria-label={item.label} />
                </div>
              ))}
            </Card>
          </SubSection>
        </Section>

        {/* ── ProgressBar ── */}
        <Section title="ProgressBar">
          <SubSection title="Values">
            <div className="max-w-md space-y-3">
              <ProgressBar value={0} />
              <ProgressBar value={25} />
              <ProgressBar value={50} />
              <ProgressBar value={75} />
              <ProgressBar value={100} />
            </div>
          </SubSection>
          <SubSection title="Sizes">
            <div className="max-w-md space-y-3">
              <div>
                <span className="font-mono text-nano text-xn-ink-soft mb-1 block">sm (4px)</span>
                <ProgressBar value={60} size="sm" />
              </div>
              <div>
                <span className="font-mono text-nano text-xn-ink-soft mb-1 block">md (6px) — default</span>
                <ProgressBar value={60} size="md" />
              </div>
              <div>
                <span className="font-mono text-nano text-xn-ink-soft mb-1 block">lg (8px)</span>
                <ProgressBar value={60} size="lg" />
              </div>
            </div>
          </SubSection>
          <SubSection title="Content Type Colors">
            <div className="max-w-md space-y-3">
              <ProgressBar value={80} color="#3B7AE8" size="lg" />
              <ProgressBar value={65} color="#48903A" size="lg" />
              <ProgressBar value={45} color="#D4880C" size="lg" />
              <ProgressBar value={30} color="#7E4CC5" size="lg" />
            </div>
          </SubSection>
          <SubSection title="With Label">
            <div className="max-w-md space-y-4">
              <ProgressBar value={33} showLabel label="Free plan — 10 / 30 generations" />
              <ProgressBar value={75} showLabel label="Generating blog post..." size="lg" color="#3B7AE8" />
            </div>
          </SubSection>
          <SubSection title="Interactive Demo">
            <div className="max-w-md">
              <ProgressBar value={progress} showLabel label="Drag the slider below to test" size="lg" />
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full mt-3"
              />
              <p className="text-xs text-xn-ink-soft mt-1">
                Move the slider — notice the smooth animated transition on the bar above.
              </p>
            </div>
          </SubSection>
          <SubSection title="In Context (Sidebar Usage)">
            <Card variant="flat" padding="md" className="max-w-[200px]">
              <p className="font-mono text-nano text-xn-ink-soft uppercase tracking-wide">
                Free plan
              </p>
              <p className="font-semibold text-sm mt-0.5">10 / 30 generations</p>
              <div className="mt-2">
                <ProgressBar value={33} size="sm" />
              </div>
              <Button variant="primary" size="sm" fullWidth className="mt-3">
                Upgrade →
              </Button>
            </Card>
          </SubSection>
        </Section>

        {/* ── Combined: URL Input Card ── */}
        <Section title="Combined — URL Input Card">
          <div className="max-w-lg">
            <Card padding="lg" elevate="lg">
              <p className="eyebrow mb-2">Start creating</p>
              <p className="font-serif text-h2 mb-4">Paste a YouTube URL</p>
              <Input
                size="lg"
                placeholder="https://youtube.com/watch?v=..."
                prefix={<LinkIcon />}
                suffix={<Button variant="accent" icon={<SparkIcon />}>Extract</Button>}
              />
              <p className="text-xs text-xn-ink-soft mt-3">
                Supports standard links, shorts, and youtu.be URLs
              </p>
            </Card>
          </div>
        </Section>

        {/* ── Footer ── */}
        <div className="text-center text-xs text-xn-ink-soft py-8 border-t border-xn-border">
          <p>
            XtractNote · Phase 3, Sessions 1 & 2 · Theme:{" "}
            <span className="font-mono">{theme}</span>
          </p>
        </div>
      </div>
    </div>
  );
}