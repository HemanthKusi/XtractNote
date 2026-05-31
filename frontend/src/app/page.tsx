"use client";

// ─────────────────────────────────────────────────────────────
// Component Showcase — Phase 3, Session 1
// ─────────────────────────────────────────────────────────────
// Temporary test page to verify that the theme system, Button,
// Input, and Card components all work and match the hi-fi design.
//
// Access at: http://localhost:3000
// This page gets replaced by the landing page in Phase 4.
// ─────────────────────────────────────────────────────────────

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/components/shared/theme-provider";
import type { ThemeName } from "@/lib/constants/theme";

// ── Inline SVG Icons ────────────────────────────────────────
// Temporary hand-coded icons matching the hi-fi's thin-line style.
// In Session 3+, we'll use Lucide icons instead.
// These are defined as components so we can pass them to Button's
// icon prop and Input's prefix prop.

const SearchIcon = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="m10.5 10.5 3 3"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

const LinkIcon = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <path
      d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <path
      d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

const SparkIcon = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <path
      d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <path
      d="M8 3v10M3 8h10"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

// ── Section Wrapper ─────────────────────────────────────────
// Reusable layout for each showcase section (title + divider + content).

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-12">
      <h2 className="font-serif text-h2 text-xn-ink mb-2">{title}</h2>
      <div className="h-px bg-xn-border mb-6" />
      {children}
    </div>
  );
}

// Sub-section with a smaller heading
function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-h4 font-semibold text-xn-ink-muted mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ── Main Showcase Page ──────────────────────────────────────

export default function ShowcasePage() {
  // Read current theme and the setter function from our ThemeProvider
  const { theme, setTheme } = useTheme();

  // The three theme options for the switcher buttons
  const themeOptions: ThemeName[] = ["paper", "clean", "dark"];

  return (
    <div className="min-h-screen bg-xn-bg text-xn-ink transition-colors duration-300">
      <div className="max-w-wide mx-auto px-8 py-12">
        {/* ────────────────────────────────────────────────────
            HEADER — Title + Theme Switcher
            ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="eyebrow mb-2">Phase 3 · Session 1</p>
            <h1 className="font-serif text-display text-xn-ink">
              Component Showcase
            </h1>
            <p className="text-sm text-xn-ink-muted mt-2">
              Theme system + Button + Input + Card — matching the hi-fi design.
            </p>
          </div>

          {/* Theme Switcher — three pill buttons */}
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

        {/* ────────────────────────────────────────────────────
            THEME COLORS — Visual swatches for the depth layers
            ──────────────────────────────────────────────────── */}
        <Section title="Theme Colors">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Background", cls: "bg-xn-bg" },
              { label: "Deep", cls: "bg-xn-bg-deep" },
              { label: "Surface", cls: "bg-xn-surface" },
              { label: "Surface Alt", cls: "bg-xn-surface-alt" },
            ].map((swatch) => (
              <div key={swatch.label} className="flex flex-col gap-1.5">
                <div
                  className={`h-16 rounded-xn-md ${swatch.cls} border border-xn-border`}
                />
                <span className="font-mono text-nano text-xn-ink-soft uppercase tracking-wide">
                  {swatch.label}
                </span>
              </div>
            ))}
          </div>

          {/* Ink color samples */}
          <div className="flex gap-4 mt-6">
            <span className="text-xn-ink font-semibold">Ink</span>
            <span className="text-xn-ink-muted">Muted</span>
            <span className="text-xn-ink-soft">Soft</span>
            <span className="text-xn-accent font-medium">Accent</span>
          </div>
        </Section>

        {/* ────────────────────────────────────────────────────
            TYPOGRAPHY — All font sizes and families
            ──────────────────────────────────────────────────── */}
        <Section title="Typography">
          <div className="space-y-4">
            <p className="font-serif text-display">
              Display — Instrument Serif
            </p>
            <p className="font-serif text-h1">Heading 1 — Instrument Serif</p>
            <p className="font-serif text-h2">Heading 2 — Instrument Serif</p>
            <p className="text-h3 font-semibold">
              Heading 3 — DM Sans Semibold
            </p>
            <p className="text-h4 font-semibold">
              Heading 4 — DM Sans Semibold
            </p>
            <p className="text-body">
              Body text — DM Sans Regular, 14px. The quick brown fox jumps over
              the lazy dog.
            </p>
            <p className="text-sm text-xn-ink-muted">
              Small text — DM Sans, 13px. Secondary information and
              descriptions.
            </p>
            <p className="font-mono text-micro text-xn-ink-soft">
              Mono micro — JetBrains Mono, 11px. Metadata and labels.
            </p>
            <p className="eyebrow">Eyebrow — JetBrains Mono uppercase</p>
          </div>
        </Section>

        {/* ────────────────────────────────────────────────────
            EDITORIAL INK — Highlight marks and accent underline
            ──────────────────────────────────────────────────── */}
        <Section title="Editorial Ink">
          <p className="text-body leading-relaxed max-w-content">
            The video discusses how{" "}
            <span className="mark-yellow">
              transformer models revolutionized NLP
            </span>{" "}
            by replacing recurrence with{" "}
            <span className="mark-green">self-attention mechanisms</span>. The
            presenter argues that{" "}
            <span className="mark-blue">
              scaling laws predict performance
            </span>{" "}
            better than architecture changes, though{" "}
            <span className="mark-pink">
              this claim remains controversial
            </span>{" "}
            among researchers studying{" "}
            <span className="mark-purple">emergent capabilities</span>. Key
            concept:{" "}
            <span className="underline-accent">
              attention is all you need
            </span>
            .
          </p>
        </Section>

        {/* ────────────────────────────────────────────────────
            BUTTONS — All variants, sizes, and configurations
            ──────────────────────────────────────────────────── */}
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

          <SubSection title="With Icons">
            <div className="flex flex-wrap gap-3">
              <Button icon={<SparkIcon />} variant="accent">
                Generate
              </Button>
              <Button icon={<PlusIcon />}>New Project</Button>
              <Button icon={<SearchIcon />} variant="ghost">
                Search
              </Button>
            </div>
          </SubSection>

          <SubSection title="With Keyboard Shortcuts">
            <div className="flex flex-wrap gap-3">
              <Button icon={<PlusIcon />} kbd="⌘N">
                Create
              </Button>
              <Button variant="ghost" kbd="⌘K">
                Search Library
              </Button>
            </div>
          </SubSection>

          <SubSection title="Icon Only">
            <div className="flex items-center gap-3">
              <Button
                iconOnly
                size="sm"
                variant="ghost"
                icon={<SearchIcon />}
                aria-label="Search"
              />
              <Button
                iconOnly
                size="md"
                variant="ghost"
                icon={<PlusIcon />}
                aria-label="Add"
              />
              <Button
                iconOnly
                size="lg"
                variant="default"
                icon={<SparkIcon />}
                aria-label="Generate"
              />
            </div>
          </SubSection>

          <SubSection title="Full Width">
            <div className="max-w-xs">
              <Button variant="primary" fullWidth>
                Upgrade →
              </Button>
            </div>
          </SubSection>

          <SubSection title="Disabled">
            <div className="flex gap-3">
              <Button disabled>Disabled Default</Button>
              <Button variant="primary" disabled>
                Disabled Primary
              </Button>
              <Button variant="accent" disabled>
                Disabled Accent
              </Button>
            </div>
          </SubSection>
        </Section>

        {/* ────────────────────────────────────────────────────
            INPUTS — All sizes, states, and slot configurations
            ──────────────────────────────────────────────────── */}
        <Section title="Input">
          <SubSection title="Default">
            <div className="max-w-md space-y-3">
              <Input placeholder="Type something..." />
              <Input
                placeholder="Search your library..."
                prefix={<SearchIcon />}
              />
              <Input
                placeholder="https://youtube.com/watch?v=..."
                prefix={<LinkIcon />}
                suffix={
                  <Button size="sm" variant="accent">
                    Extract
                  </Button>
                }
              />
            </div>
          </SubSection>

          <SubSection title="Sizes">
            <div className="max-w-md space-y-3">
              <Input
                size="sm"
                placeholder="Small input"
                prefix={<SearchIcon />}
              />
              <Input
                size="md"
                placeholder="Medium input (default)"
                prefix={<SearchIcon />}
              />
              <Input
                size="lg"
                placeholder="Large input (hero)"
                prefix={<LinkIcon />}
              />
            </div>
          </SubSection>

          <SubSection title="With Keyboard Hint">
            <div className="max-w-md">
              <Input
                placeholder="Search your library..."
                prefix={<SearchIcon />}
                suffix={
                  <span className="font-mono text-nano text-xn-ink-soft border border-xn-border rounded px-1.5 py-0.5">
                    ⌘K
                  </span>
                }
              />
            </div>
          </SubSection>

          <SubSection title="Error State">
            <div className="max-w-md space-y-2">
              <Input
                placeholder="Paste YouTube URL"
                prefix={<LinkIcon />}
                error
                defaultValue="not-a-valid-url"
              />
              <p className="text-xs text-[#D44060]">
                Please enter a valid YouTube URL
              </p>
            </div>
          </SubSection>

          <SubSection title="Disabled">
            <div className="max-w-md">
              <Input placeholder="Disabled input" disabled />
            </div>
          </SubSection>
        </Section>

        {/* ────────────────────────────────────────────────────
            CARDS — All variants, slots, and elevation levels
            ──────────────────────────────────────────────────── */}
        <Section title="Card (Surface)">
          <SubSection title="Variants">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <p className="text-h4 font-semibold mb-1">Default Card</p>
                <p className="text-sm text-xn-ink-muted">
                  Surface background with border and subtle shadow. The
                  workhorse container.
                </p>
              </Card>

              <Card variant="flat">
                <p className="text-h4 font-semibold mb-1">Flat Card</p>
                <p className="text-sm text-xn-ink-muted">
                  Surface background with border, no shadow. For dense layouts.
                </p>
              </Card>

              <Card variant="recessed">
                <p className="text-h4 font-semibold mb-1">Recessed Card</p>
                <p className="text-sm text-xn-ink-muted">
                  Deep background — the inset layer. Used for sidebar panels.
                </p>
              </Card>

              <Card variant="ghost" padding="none">
                <p className="text-h4 font-semibold mb-1">Ghost Card</p>
                <p className="text-sm text-xn-ink-muted">
                  Transparent, no border. For logical grouping only.
                </p>
              </Card>
            </div>
          </SubSection>

          <SubSection title="With Header & Footer">
            <div className="max-w-md">
              <Card
                header={
                  <div className="flex items-center justify-between">
                    <span className="text-h4 font-semibold">Video Preview</span>
                    <span className="eyebrow">12:42</span>
                  </div>
                }
                footer={
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-xn-ink-soft">
                      By TechChannel · 142K views
                    </span>
                    <Button size="sm" variant="accent" icon={<SparkIcon />}>
                      Generate
                    </Button>
                  </div>
                }
              >
                <div className="h-32 rounded-xn-md bg-xn-bg-deep border border-xn-border flex items-center justify-center">
                  <span className="text-xn-ink-soft text-sm">
                    Video Thumbnail
                  </span>
                </div>
              </Card>
            </div>
          </SubSection>

          <SubSection title="Interactive Cards">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {["Blog Post", "Study Notes", "Summary"].map((type) => (
                <Card key={type} interactive>
                  <p className="text-h4 font-semibold">{type}</p>
                  <p className="text-xs text-xn-ink-muted mt-1">
                    Click to select this content type
                  </p>
                </Card>
              ))}
            </div>
          </SubSection>

          <SubSection title="Padding Variants">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(["sm", "md", "lg", "xl"] as const).map((p) => (
                <Card key={p} padding={p} variant="flat">
                  <p className="text-xs font-mono text-xn-ink-muted">
                    padding: {p}
                  </p>
                </Card>
              ))}
            </div>
          </SubSection>

          <SubSection title="Elevation">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card elevate="none">
                <p className="text-xs font-mono text-xn-ink-muted">
                  No shadow
                </p>
              </Card>
              <Card elevate="sm">
                <p className="text-xs font-mono text-xn-ink-muted">
                  Small shadow
                </p>
              </Card>
              <Card elevate="lg">
                <p className="text-xs font-mono text-xn-ink-muted">
                  Large shadow
                </p>
              </Card>
            </div>
          </SubSection>

          {/* Three-layer depth demo — shows how the layers stack */}
          <SubSection title="Three-Layer Depth System">
            <div className="bg-xn-bg-deep p-6 rounded-xn-xl border border-xn-border">
              <p className="font-mono text-nano text-xn-ink-soft uppercase tracking-wide mb-3">
                Layer 1 — bg-deep (recessed)
              </p>
              <div className="bg-xn-bg p-5 rounded-xn-lg border border-xn-border">
                <p className="font-mono text-nano text-xn-ink-soft uppercase tracking-wide mb-3">
                  Layer 2 — bg (page)
                </p>
                <Card elevate="lg" padding="lg">
                  <p className="font-mono text-nano text-xn-ink-soft uppercase tracking-wide mb-2">
                    Layer 3 — surface (card / "paper")
                  </p>
                  <p className="text-sm text-xn-ink">
                    This is where content lives. Brightest layer. Notice how
                    each layer is progressively lighter, creating visual depth
                    without heavy shadows.
                  </p>
                </Card>
              </div>
            </div>
          </SubSection>
        </Section>

        {/* ────────────────────────────────────────────────────
            COMBINED — URL Input Card (like the dashboard hero)
            ──────────────────────────────────────────────────── */}
        <Section title="Combined — URL Input Card">
          <div className="max-w-lg">
            <Card padding="lg" elevate="lg">
              <p className="eyebrow mb-2">Start creating</p>
              <p className="font-serif text-h2 mb-4">Paste a YouTube URL</p>
              <Input
                size="lg"
                placeholder="https://youtube.com/watch?v=..."
                prefix={<LinkIcon />}
                suffix={
                  <Button variant="accent" icon={<SparkIcon />}>
                    Extract
                  </Button>
                }
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
            XtractNote · Phase 3, Session 1 · Theme:{" "}
            <span className="font-mono">{theme}</span>
          </p>
        </div>
      </div>
    </div>
  );
}