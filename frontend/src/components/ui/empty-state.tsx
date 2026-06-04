import { type ReactNode } from "react";

// ─────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────
// Centered placeholder for pages or sections with no content.
//
// Structure:
//   ┌──────────────────────────────────┐
//   │                                  │
//   │           [  icon  ]             │
//   │                                  │
//   │       No content yet             │
//   │   Start by pasting a YouTube     │
//   │   URL to generate your first     │
//   │   piece of content.              │
//   │                                  │
//   │       [ Create Content ]         │
//   │                                  │
//   └──────────────────────────────────┘
//
// Two size contexts:
//   page    → Full page empty state (larger icon, bigger text)
//   section → Inside a card or panel (compact)
//
// Usage:
//   <EmptyState
//     icon={<FolderIcon />}
//     title="No folders yet"
//     description="Create a folder to organize your content."
//     action={<Button variant="primary">Create Folder</Button>}
//   />
//
//   <EmptyState
//     size="section"
//     title="No items in this folder"
//     description="Save generated content here from the dashboard."
//   />
// ─────────────────────────────────────────────────────────────

// ── Default Icon ────────────────────────────────────────────
// A simple empty box/tray icon used when no custom icon is provided.

const DefaultIcon = () => (
  <svg viewBox="0 0 48 48" fill="none">
    <rect
      x="6" y="12" width="36" height="28" rx="4"
      stroke="currentColor" strokeWidth="2" fill="none"
    />
    <path
      d="M6 20h36"
      stroke="currentColor" strokeWidth="2"
    />
    <path
      d="M20 28h8M22 32h4"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    />
  </svg>
);

// ── Size Definitions ────────────────────────────────────────

const sizeConfig = {
  page: {
    wrapper: "py-16",
    icon: "w-12 h-12",
    title: "text-h3 font-semibold",
    description: "text-sm max-w-[360px]",
    gap: "gap-3",
  },
  section: {
    wrapper: "py-8",
    icon: "w-8 h-8",
    title: "text-h4 font-semibold",
    description: "text-xs max-w-[280px]",
    gap: "gap-2",
  },
} as const;

type EmptyStateSize = keyof typeof sizeConfig;

// ── Props ───────────────────────────────────────────────────

interface EmptyStateProps {
  /** Custom icon element. Defaults to an empty tray icon. */
  icon?: ReactNode;
  /** Main heading text (e.g., "No folders yet") */
  title: string;
  /** Supporting text explaining what to do */
  description?: string;
  /** Action element — typically a Button (e.g., "Create Folder") */
  action?: ReactNode;
  /** Size context: page (full page) or section (inside a panel) */
  size?: EmptyStateSize;
  /** Additional CSS class */
  className?: string;
}

// ── Component ───────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = "page",
  className = "",
}: EmptyStateProps) {
  const s = sizeConfig[size];

  return (
    <div
      className={[
        "flex flex-col items-center justify-center text-center",
        s.wrapper,
        s.gap,
        className,
      ].join(" ")}
    >
      {/* ── Icon ──
          Muted color so it doesn't demand attention.
          The empty state is informational, not critical. */}
      <div className={`${s.icon} text-xn-ink-soft mb-1 [&>svg]:w-full [&>svg]:h-full`}>
        {icon || <DefaultIcon />}
      </div>

      {/* ── Title ── */}
      <h3 className={`${s.title} text-xn-ink`}>
        {title}
      </h3>

      {/* ── Description ── */}
      {description && (
        <p className={`${s.description} text-xn-ink-muted leading-relaxed`}>
          {description}
        </p>
      )}

      {/* ── Action Button ──
          Extra top margin to separate it visually from the text. */}
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}

// Re-export types
export type { EmptyStateSize };