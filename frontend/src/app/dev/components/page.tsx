"use client";

// ─────────────────────────────────────────────────────────────
// Component Showcase — Phase 3, Sessions 1 + 2 + 3 + 4 + 5
// ─────────────────────────────────────────────────────────────
// Test page for all base UI components and Layouts components.
// Access at: http://localhost:3000/dev/components
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/avatar";
import { Toggle } from "@/components/ui/toggle";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Modal } from "@/components/ui/modal";
import { Logo } from "@/components/layout/logo";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonText, SkeletonCard } from "@/components/ui/loading-skeleton";
import { SearchResults } from "@/components/create/search-results";
import { useTheme } from "@/components/shared/theme-provider";
import { useToast } from "@/components/shared/toast-provider";
import { THEMES, type ThemeName, type ContentType } from "@/lib/constants/theme";
import { SocialPlatformPicker } from "@/components/create/social-platform-picker";
import { FlashcardsView } from "@/components/output/flashcards-view";
import type { SocialPlatform } from "@/lib/content/types";
import { QuizView } from "@/components/output/quiz-view";

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

const TrashIcon = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <path d="M2.5 4h11M5.5 4V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V4M6.5 7v4M9.5 7v4M3.5 4l.5 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l.5-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
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

const FAKE_RESULTS = Array.from({ length: 23 }).map((_, i) => ({
  videoId: `vid${i}`,
  title: `Sample video ${i + 1}: a reasonably long title that will clamp to two lines eventually`,
  channel: "Sample Channel",
  channelUrl: null,
  thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  description:
    "A short description snippet that shows how the two-line clamp behaves in the card body.",
  publishedAt: new Date(Date.now() - i * 5e9).toISOString(),
  durationSeconds: 200 + i * 37,
  viewCount: 1234 * (i + 1) * 97,
}));

// ── Main Page ──

export default function ShowcasePage() {
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const themeOptions: ThemeName[] = [...THEMES];

  // Session 2 state
  const [toggleA, setToggleA] = useState(false);
  const [toggleB, setToggleB] = useState(true);
  const [progress, setProgress] = useState(33);

  // Session 3 state — modals
  const [basicModal, setBasicModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [formModal, setFormModal] = useState(false);

  // Session 4 state — AppShell preview active page
  const [previewPage, setPreviewPage] = useState<"home" | "create" | "history" | "folders" | "extension" | "settings">("home");

  const [demoPlatform, setDemoPlatform] = useState<SocialPlatform | null>(null);

  return (
    <div className="min-h-screen bg-xn-bg text-xn-ink transition-colors duration-300">
      <div className="max-w-[960px] mx-auto px-8 py-12">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="eyebrow mb-2">Design System · Component Reference</p>
            <h1 className="font-serif text-display text-xn-ink">
              Component Showcase
            </h1>
            <p className="text-sm text-xn-ink-muted mt-2">
              All base UI and layout components. Accessible at{" "}
              <span className="font-mono text-xn-accent">/dev/components</span>
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
              <Button variant="primary">Accent</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
          </SubSection>
          <SubSection title="Sizes, Icons & Shortcuts">
            <div className="flex items-center gap-3 mb-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button icon={<SparkIcon />} variant="primary">Generate</Button>
              <Button icon={<PlusIcon />} kbd="⌘N">Create</Button>
              <Button variant="ghost" kbd="⌘K">Search Library</Button>
            </div>
          </SubSection>
          <SubSection title="Icon Only, Full Width & Disabled">
            <div className="flex items-center gap-3 mb-3">
              <Button iconOnly size="sm" variant="ghost" icon={<SearchIcon />} aria-label="Search" />
              <Button iconOnly size="md" variant="ghost" icon={<PlusIcon />} aria-label="Add" />
              <Button iconOnly size="lg" variant="default" icon={<SparkIcon />} aria-label="Generate" />
            </div>
            <div className="max-w-xs mb-3">
              <Button variant="primary" fullWidth>Upgrade →</Button>
            </div>
            <div className="flex gap-3">
              <Button disabled>Default</Button>
              <Button variant="primary" disabled>Primary</Button>
              <Button variant="primary" disabled>Accent</Button>
            </div>
          </SubSection>
        </Section>

        {/* ── Inputs ── */}
        <Section title="Input">
          <div className="max-w-md space-y-3">
            <Input placeholder="Type something..." />
            <Input placeholder="Search your library..." prefix={<SearchIcon />} />
            <Input
              placeholder="https://youtube.com/watch?v=..."
              prefix={<LinkIcon />}
              suffix={<Button size="sm" variant="primary">Extract</Button>}
            />
            <Input size="sm" placeholder="Small input" prefix={<SearchIcon />} />
            <Input size="lg" placeholder="Large hero input" prefix={<LinkIcon />} />
            <div>
              <Input placeholder="Paste YouTube URL" prefix={<LinkIcon />} error defaultValue="not-a-valid-url" />
              <p className="text-xs text-[#D44060] mt-1.5">Please enter a valid YouTube URL</p>
            </div>
            <Input placeholder="Disabled input" disabled />
          </div>
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
                (type) => <Chip key={type} contentType={type} />
              )}
            </div>
          </SubSection>
          <SubSection title="Status & Variants">
            <div className="flex flex-wrap gap-2 mb-3">
              <Chip status="draft" />
              <Chip status="saved" />
              <Chip status="archived" />
              <Chip status="exported" />
              <Chip status="error" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip contentType="blog" />
              <Chip contentType="blog" variant="solid" />
              <Chip contentType="blog" variant="outline" />
            </div>
          </SubSection>
          <SubSection title="With Dot & Icon">
            <div className="flex flex-wrap gap-2 mb-3">
              <Chip dot dotColor="#E06030">Marketing</Chip>
              <Chip dot dotColor="#4a5cb8">Class Notes</Chip>
              <Chip dot dotColor="#3f7a4f">AI Research</Chip>
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip icon={<DocIcon />} contentType="blog" />
              <Chip icon={<SparkIcon />} contentType="summary">AI Generated</Chip>
            </div>
          </SubSection>
        </Section>

        {/* ── Avatar ── */}
        <Section title="Avatar">
          <SubSection title="Sizes">
            <div className="flex items-center gap-4">
              {(["sm", "md", "lg", "xl"] as const).map((s) => (
                <div key={s} className="flex flex-col items-center gap-1.5">
                  <Avatar initials="MK" size={s} />
                  <span className="font-mono text-nano text-xn-ink-soft">{s}</span>
                </div>
              ))}
            </div>
          </SubSection>
          <SubSection title="In Context">
            <div className="flex items-center gap-2 px-3 py-2 bg-xn-bg border border-xn-border rounded-xn-md inline-flex">
              <span className="text-sm text-xn-ink-muted">Welcome back</span>
              <span className="text-sm font-semibold">Mohan</span>
              <Avatar initials="MK" />
            </div>
          </SubSection>
        </Section>

        {/* ── Toggle ── */}
        <Section title="Toggle">
          <SubSection title="Controlled & Disabled">
            <Card variant="flat" padding="none" className="max-w-sm">
              {[
                { label: "Auto-save content", on: toggleA, set: setToggleA, disabled: false },
                { label: "Enable screenshots", on: toggleB, set: setToggleB, disabled: false },
                { label: "Disabled (off)", on: false, set: () => {}, disabled: true },
                { label: "Disabled (on)", on: true, set: () => {}, disabled: true },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i > 0 ? "border-t border-xn-border" : ""
                  }`}
                >
                  <span className={`text-sm ${item.disabled ? "text-xn-ink-soft" : ""}`}>
                    {item.label}
                  </span>
                  <Toggle
                    checked={item.on}
                    onChange={item.set}
                    disabled={item.disabled}
                    aria-label={item.label}
                  />
                </div>
              ))}
            </Card>
          </SubSection>
        </Section>

        {/* ── ProgressBar ── */}
        <Section title="ProgressBar">
          <SubSection title="Values & Sizes">
            <div className="max-w-md space-y-3">
              <ProgressBar value={25} />
              <ProgressBar value={50} />
              <ProgressBar value={75} />
              <ProgressBar value={60} size="sm" />
              <ProgressBar value={60} size="lg" />
            </div>
          </SubSection>
          <SubSection title="Colors & Labels">
            <div className="max-w-md space-y-4">
              <ProgressBar value={80} color="#3B7AE8" size="lg" />
              <ProgressBar value={65} color="#48903A" size="lg" />
              <ProgressBar value={33} showLabel label="Free plan — 10 / 30 generations" />
              <ProgressBar value={75} showLabel label="Generating blog post..." size="lg" color="#3B7AE8" />
            </div>
          </SubSection>
          <SubSection title="Interactive Demo">
            <div className="max-w-md">
              <ProgressBar value={progress} showLabel label="Drag the slider to test" size="lg" />
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full mt-3"
              />
            </div>
          </SubSection>
          <SubSection title="Sidebar Usage Context">
            <Card variant="flat" padding="md" className="max-w-[200px]">
              <p className="font-mono text-nano text-xn-ink-soft uppercase tracking-wide">Free plan</p>
              <p className="font-semibold text-sm mt-0.5">10 / 30 generations</p>
              <div className="mt-2">
                <ProgressBar value={33} size="sm" />
              </div>
              <Button variant="primary" size="sm" fullWidth className="mt-3">Upgrade →</Button>
            </Card>
          </SubSection>
        </Section>

        {/* ══════════════════════════════════════════════════════
            SESSION 3 COMPONENTS
            ══════════════════════════════════════════════════════ */}

        {/* ── Logo ── */}
        <Section title="Logo">
          <SubSection title="Primary Variant (Landscape)">
            <div className="flex items-center gap-8">
              {[20, 28, 40, 56].map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <Logo size={s} />
                  <span className="font-mono text-nano text-xn-ink-soft">{s}px</span>
                </div>
              ))}
            </div>
          </SubSection>
          <SubSection title="Square Variant (Favicon)">
            <div className="flex items-center gap-8">
              {[24, 36, 48].map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <Logo variant="square" size={s} />
                  <span className="font-mono text-nano text-xn-ink-soft">{s}px</span>
                </div>
              ))}
            </div>
          </SubSection>
          <SubSection title="With Wordmark">
            <div className="space-y-4">
              <Logo size={28} showWordmark />
              <Logo size={36} showWordmark />
            </div>
          </SubSection>
          <SubSection title="Manual Color Override (for custom backgrounds)">
            <div
              className="inline-flex flex-col gap-4 p-8 rounded-xn-xl"
              style={{ backgroundColor: "#0c1b3a" }}
            >
              <Logo size={32} color="#f3ebd9" mutedColor="rgba(243,235,217,0.55)" showWordmark />
              <Logo size={24} color="#f3ebd9" />
              <Logo variant="square" size={40} color="#f3ebd9" />
            </div>
          </SubSection>
          <SubSection title="In Context (Sidebar Header)">
            <div className="w-[232px] bg-xn-bg border-r border-xn-border p-4 rounded-xn-md">
              <Logo size={22} showWordmark />
            </div>
          </SubSection>
        </Section>

        {/* ── Modal ── */}
        <Section title="Modal">
          <SubSection title="Open Modals">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setBasicModal(true)}>
                Basic Modal
              </Button>
              <Button variant="danger" icon={<TrashIcon />} onClick={() => setConfirmModal(true)}>
                Delete Confirmation
              </Button>
              <Button variant="primary" onClick={() => setFormModal(true)}>
                Form Modal
              </Button>
            </div>
            <p className="text-xs text-xn-ink-soft mt-2">
              Click a button to open. Close via ✕, backdrop click, or Escape key.
            </p>
          </SubSection>

          {/* Basic Modal */}
          <Modal
            open={basicModal}
            onClose={() => setBasicModal(false)}
            title="Basic Modal"
            description="This is a simple informational modal with a title and description."
            footer={
              <Button variant="primary" onClick={() => setBasicModal(false)}>
                Got it
              </Button>
            }
          >
            <p className="text-sm text-xn-ink-muted">
              Modal content goes here. This could be a message, a list, or any component.
              Try closing with the ✕ button, clicking outside, or pressing Escape.
            </p>
          </Modal>

          {/* Confirm Delete Modal */}
          <Modal
            open={confirmModal}
            onClose={() => setConfirmModal(false)}
            title="Delete Content?"
            description="This action cannot be undone. The content will be permanently removed."
            size="sm"
            footer={
              <>
                <Button variant="ghost" onClick={() => setConfirmModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setConfirmModal(false);
                    toast.success("Content deleted");
                  }}
                >
                  Delete
                </Button>
              </>
            }
          />

          {/* Form Modal */}
          <Modal
            open={formModal}
            onClose={() => setFormModal(false)}
            title="Save to Folder"
            description="Choose a folder for this content."
            footer={
              <>
                <Button variant="ghost" onClick={() => setFormModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setFormModal(false);
                    toast.success("Saved to Marketing folder");
                  }}
                >
                  Save
                </Button>
              </>
            }
          >
            <div className="space-y-2">
              {[
                { name: "Marketing", color: "#E06030", count: 14 },
                { name: "Class Notes", color: "#4a5cb8", count: 8 },
                { name: "AI Research", color: "#3f7a4f", count: 21 },
                { name: "YT Scripts", color: "#b48a00", count: 3 },
              ].map((folder) => (
                <div
                  key={folder.name}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xn-md hover:bg-xn-surface-alt cursor-pointer transition-colors"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: folder.color }}
                  />
                  <span className="text-sm flex-1">{folder.name}</span>
                  <span className="font-mono text-micro text-xn-ink-soft">{folder.count}</span>
                </div>
              ))}
            </div>
          </Modal>
        </Section>

        {/* ── Toast ── */}
        <Section title="Toast">
          <SubSection title="Fire Toasts">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => toast.success("Content saved successfully!")}
              >
                Success Toast
              </Button>
              <Button
                onClick={() =>
                  toast.error("Could not fetch transcript.", {
                    description: "This video may not have captions enabled.",
                  })
                }
              >
                Error Toast
              </Button>
              <Button
                onClick={() => toast.info("Processing your video...")}
              >
                Info Toast
              </Button>
              <Button
                onClick={() =>
                  toast.warning("This video is over 3 hours long.", {
                    description: "Generation may take longer than usual.",
                  })
                }
              >
                Warning Toast
              </Button>
            </div>
            <p className="text-xs text-xn-ink-soft mt-2">
              Toasts appear at the bottom-right. They auto-dismiss after 4 seconds.
              Click ✕ to dismiss early. Fire multiple to see them stack.
            </p>
          </SubSection>
          <SubSection title="With Description">
            <Button
              onClick={() =>
                toast.success("Blog post generated!", {
                  description: "2,400 words · 8 sections · SEO optimized",
                  duration: 6000,
                })
              }
            >
              Detailed Toast (6s duration)
            </Button>
          </SubSection>
        </Section>

        {/* ══════════════════════════════════════════════════════
            SESSION 4 COMPONENTS
            ══════════════════════════════════════════════════════ */}

        {/* ── AppShell Preview ── */}
        <Section title="AppShell (Sidebar + Topbar + Content)">
          <SubSection title="Full Layout Preview">
            <p className="text-sm text-xn-ink-muted mb-4">
              This is how every in-app page looks. The sidebar and topbar stay
              fixed while the content area scrolls. Click the nav items to see
              the active state change.
            </p>

            {/* Constrained container simulating a viewport.
                We can't use the actual AppShell here because it uses h-screen.
                Instead we manually assemble the same flex layout inside a
                fixed-height box. This is the same structure AppShell renders. */}
            <div className="h-[500px] border border-xn-border rounded-xn-xl overflow-hidden flex bg-xn-bg">

              {/* Sidebar — same component, works inside the constrained box */}
              <Sidebar
                activePage={previewPage}
                onNavigate={(page) => setPreviewPage(page)}
              />

              {/* Main area — topbar + content */}
              <div className="flex-1 flex flex-col overflow-hidden">

                {/* Topbar */}
                <Topbar
                  userInitials="MK"
                  onSearchClick={() => toast.info("⌘K search modal coming soon!")}
                />

                {/* Content area — scrollable sample content */}
                <main className="flex-1 overflow-y-auto px-8 py-6">
                  <p className="eyebrow mb-2">
                    {previewPage.toUpperCase()} PAGE
                  </p>
                  <h2 className="font-serif text-h2 mb-3">
                    {previewPage === "home" && "Good morning, Mohan"}
                    {previewPage === "create" && "Create New Content"}
                    {previewPage === "history" && "Your History"}
                    {previewPage === "folders" && "Your Folders"}
                    {previewPage === "settings" && "Settings"}
                    {previewPage === "extension" && "Browser Extension"}
                  </h2>
                  <p className="text-sm text-xn-ink-muted max-w-[500px] mb-6">
                    This is the content area. Each page renders its own content here
                    while the sidebar and topbar stay fixed. The content scrolls
                    independently.
                  </p>

                  {/* Sample cards to show scrolling */}
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="bg-xn-surface border border-xn-border rounded-xn-lg p-4"
                      >
                        <div className="h-20 bg-xn-bg-deep rounded-xn-md mb-3 flex items-center justify-center">
                          <span className="text-xs text-xn-ink-soft">
                            Content Card {i}
                          </span>
                        </div>
                        <p className="text-sm font-medium">Sample Item {i}</p>
                        <p className="text-xs text-xn-ink-muted mt-1">
                          Placeholder content for scroll testing
                        </p>
                      </div>
                    ))}
                  </div>
                </main>
              </div>
            </div>
          </SubSection>

          <SubSection title="Individual Components">
            <div className="flex gap-3">
              <span className="font-mono text-micro text-xn-ink-soft bg-xn-surface-alt border border-xn-border rounded-xn-sm px-2 py-1">
                Sidebar — 232px × full height
              </span>
              <span className="font-mono text-micro text-xn-ink-soft bg-xn-surface-alt border border-xn-border rounded-xn-sm px-2 py-1">
                Topbar — full width × 56px
              </span>
              <span className="font-mono text-micro text-xn-ink-soft bg-xn-surface-alt border border-xn-border rounded-xn-sm px-2 py-1">
                AppShell — wraps both + content
              </span>
            </div>
          </SubSection>
        </Section>

        {/* ══════════════════════════════════════════════════════
            SESSION 5 COMPONENTS
            ══════════════════════════════════════════════════════ */}

        {/* ── VideoThumbnail ── */}
        <Section title="VideoThumbnail">
          <SubSection title="With Real YouTube Video">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <VideoThumbnail videoId="dQw4w9WgXcQ" duration="3:32" />
              <VideoThumbnail videoId="jNQXAC9IVRw" duration="0:19" />
              <VideoThumbnail videoId="9bZkp7q19f0" duration="4:13" />
            </div>
          </SubSection>
          <SubSection title="Fallback (No Image)">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <VideoThumbnail duration="12:42" />
              <VideoThumbnail duration="1:03:20" label="lecture" />
              <VideoThumbnail label="podcast" height={140} />
            </div>
          </SubSection>
          <SubSection title="Broken Image URL">
            <div className="max-w-xs">
              <VideoThumbnail
                src="https://broken.invalid/404.jpg"
                duration="5:00"
                label="error fallback"
              />
            </div>
          </SubSection>
        </Section>

        {/* ── ContentTypeIcon ── */}
        <Section title="ContentTypeIcon">
          <SubSection title="All 7 Types">
            <div className="flex flex-wrap gap-4">
              {(["blog", "notes", "summary", "research", "flashcards", "quiz", "social"] as const).map(
                (type) => (
                  <div key={type} className="flex flex-col items-center gap-1.5">
                    <ContentTypeIcon type={type} size="lg" />
                    <span className="font-mono text-nano text-xn-ink-soft capitalize">
                      {type}
                    </span>
                  </div>
                )
              )}
            </div>
          </SubSection>
          <SubSection title="Sizes">
            <div className="flex items-center gap-6">
              {(["sm", "md", "lg", "xl"] as const).map((s) => (
                <div key={s} className="flex flex-col items-center gap-1.5">
                  <ContentTypeIcon type="blog" size={s} />
                  <span className="font-mono text-nano text-xn-ink-soft">{s}</span>
                </div>
              ))}
            </div>
          </SubSection>
          <SubSection title="With Background">
            <div className="flex flex-wrap gap-3">
              {(["blog", "notes", "summary", "research", "flashcards", "quiz", "social"] as const).map(
                (type) => (
                  <ContentTypeIcon key={type} type={type} size="lg" withBackground />
                )
              )}
            </div>
          </SubSection>
          <SubSection title="In Context (With Chip)">
            <div className="flex flex-wrap gap-3">
              {(["blog", "notes", "summary"] as const).map((type) => (
                <div
                  key={type}
                  className="flex items-center gap-2 bg-xn-surface border border-xn-border rounded-xn-md px-3 py-2"
                >
                  <ContentTypeIcon type={type} size="sm" />
                  <Chip contentType={type} />
                </div>
              ))}
            </div>
          </SubSection>
        </Section>

        {/* ── EmptyState ── */}
        <Section title="EmptyState">
          <SubSection title="Page Size (Full Page)">
            <Card variant="flat">
              <EmptyState
                title="No content generated yet"
                description="Start by pasting a YouTube URL to generate your first piece of content. You can create blog posts, study notes, summaries, and more."
                action={
                  <Button variant="primary" icon={<SparkIcon />}>
                    Create Content
                  </Button>
                }
              />
            </Card>
          </SubSection>
          <SubSection title="Section Size (Inside a Panel)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card variant="flat">
                <EmptyState
                  size="section"
                  title="No folders yet"
                  description="Create a folder to organize your content."
                  action={
                    <Button variant="primary" size="sm" icon={<PlusIcon />}>
                      New Folder
                    </Button>
                  }
                />
              </Card>
              <Card variant="flat">
                <EmptyState
                  size="section"
                  title="No search results"
                  description="Try a different search term or check your spelling."
                />
              </Card>
            </div>
          </SubSection>
        </Section>

        {/* ── LoadingSkeleton ── */}
        <Section title="LoadingSkeleton">
          <SubSection title="Base Skeleton">
            <div className="max-w-md space-y-3">
              <Skeleton width="100%" height={20} />
              <Skeleton width="80%" height={16} />
              <Skeleton width="60%" height={16} />
              <div className="flex items-center gap-3 pt-2">
                <Skeleton width={36} height={36} circle />
                <div className="flex-1 space-y-2">
                  <Skeleton width="50%" height={14} />
                  <Skeleton width="30%" height={10} />
                </div>
              </div>
            </div>
          </SubSection>
          <SubSection title="SkeletonText (Paragraph)">
            <div className="max-w-md space-y-6">
              <div>
                <span className="font-mono text-nano text-xn-ink-soft mb-2 block">
                  3 lines (default)
                </span>
                <SkeletonText lines={3} />
              </div>
              <div>
                <span className="font-mono text-nano text-xn-ink-soft mb-2 block">
                  5 lines
                </span>
                <SkeletonText lines={5} />
              </div>
            </div>
          </SubSection>
          <SubSection title="SkeletonCard">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SkeletonCard />
              <SkeletonCard thumbnailHeight={100} descriptionLines={1} />
              <SkeletonCard showThumbnail={false} descriptionLines={4} />
            </div>
          </SubSection>
          <SubSection title="Custom Layout (History Row)">
            <div className="max-w-lg space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 bg-xn-surface border border-xn-border rounded-xn-lg p-3"
                >
                  <Skeleton width={80} height={50} rounded="var(--xn-radius-sm)" />
                  <div className="flex-1 space-y-2">
                    <Skeleton width="60%" height={14} rounded="var(--xn-radius-sm)" />
                    <Skeleton width="35%" height={10} rounded="var(--xn-radius-sm)" />
                  </div>
                  <Skeleton width={60} height={22} rounded="var(--xn-radius-pill)" />
                </div>
              ))}
            </div>
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
                suffix={<Button variant="primary" icon={<SparkIcon />}>Extract</Button>}
              />
              <p className="text-xs text-xn-ink-soft mt-3">
                Supports standard links, shorts, and youtu.be URLs
              </p>
            </Card>
          </div>
        </Section>

        {/* ── Search Results (TEMP — remove before committing File 8) ── */}
          <Section title="Search Results (temp test)">
            <SearchResults
              results={FAKE_RESULTS}
              query="sample"
              onUse={(id) => alert(id)}
            />
          </Section>

        {/* ── Phase 11: Social platform picker ───────────────────── */}
          <section className="mt-12">
            <h2 className="mb-1 text-[18px] font-semibold text-xn-ink">
              SocialPlatformPicker
            </h2>
            <p className="mb-4 text-[13px] text-xn-ink-muted">
              Step two of the social flow. Controlled — the parent owns the choice.
              Selected: <span className="font-mono">{demoPlatform ?? "none"}</span>
            </p>

            <div className="max-w-[420px]">
              <SocialPlatformPicker
                visible
                selected={demoPlatform}
                onSelect={setDemoPlatform}
              />
            </div>

            <p className="mb-2 mt-6 text-[13px] text-xn-ink-muted">Disabled state</p>
            <div className="max-w-[420px]">
              <SocialPlatformPicker
                visible
                selected="linkedin"
                onSelect={() => {}}
                disabled
              />
            </div>
          </section>

        {/* ── Phase 11: Flashcards view ──────────────────────────── */}
          <section className="mt-12">
            <h2 className="mb-1 text-[18px] font-semibold text-xn-ink">
              FlashcardsView
            </h2>
            <p className="mb-4 text-[13px] text-xn-ink-muted">
              Static renderer for structured flashcard bodies. Renders bare — in the app
              it sits inside OutputView&apos;s Card, so it looks plainer here.
            </p>

            <div className="max-w-[680px] rounded-xn-md border border-xn-border bg-xn-bg-card p-6">
              <FlashcardsView
                body={{
                  kind: "flashcards",
                  cards: [
                    {
                      front: "What is photosynthesis?",
                      back: "The process by which plants convert light energy into chemical energy stored as glucose.",
                    },
                    {
                      front: "Which pigment absorbs light during photosynthesis?",
                      back: "Chlorophyll, found in the chloroplasts of plant cells.",
                    },
                    {
                      front: "What is the byproduct of photosynthesis?",
                      back: "Oxygen, released into the atmosphere through the stomata.",
                    },
                  ],
                }}
              />
            </div>

            <p className="mb-2 mt-6 text-[13px] text-xn-ink-muted">Empty state</p>
            <div className="max-w-[680px] rounded-xn-md border border-xn-border bg-xn-bg-card p-6">
              <FlashcardsView body={{ kind: "flashcards", cards: [] }} />
            </div>
          </section>

          {/* ── Phase 11: Quiz view ────────────────────────────────── */}
          <section className="mt-12">
            <h2 className="mb-1 text-[18px] font-semibold text-xn-ink">QuizView</h2>
            <p className="mb-4 text-[13px] text-xn-ink-muted">
              Static renderer for structured quiz bodies. Renders bare — sits inside
              OutputView&apos;s Card in the app.
            </p>

            <div className="max-w-[680px] rounded-xn-md border border-xn-border bg-xn-bg-card p-6">
              <QuizView
                body={{
                  kind: "quiz",
                  questions: [
                    {
                      question: "What does chlorophyll do in photosynthesis?",
                      options: [
                        "Stores glucose for later use",
                        "Absorbs light energy",
                        "Releases carbon dioxide",
                        "Transports water to the roots",
                      ],
                      answerIndex: 1,
                      explanation:
                        "Chlorophyll is the pigment that captures light energy to power the reaction.",
                    },
                    {
                      question: "What is the main byproduct of photosynthesis?",
                      options: ["Nitrogen", "Carbon dioxide", "Oxygen", "Methane"],
                      answerIndex: 2,
                      explanation: null,
                    },
                  ],
                }}
              />
            </div>

            <p className="mb-2 mt-6 text-[13px] text-xn-ink-muted">Empty state</p>
            <div className="max-w-[680px] rounded-xn-md border border-xn-border bg-xn-bg-card p-6">
              <QuizView body={{ kind: "quiz", questions: [] }} />
            </div>
          </section>

        {/* ── Footer ── */}
        <div className="text-center text-xs text-xn-ink-soft py-8 border-t border-xn-border">
          <p>
            XtractNote · Phase 3, Sessions 1–5 · Theme:{" "}
            <span className="font-mono">{theme}</span>
          </p>
        </div>
      </div>
    </div>
  );
}