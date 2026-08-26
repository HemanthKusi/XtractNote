"use client";

// ─────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────
// Left navigation panel, 232px wide.
// Matches HFSidebar from hifi-core.jsx exactly.
//
// Structure (top to bottom):
//   ┌────────────────────┐
//   │  Logo              │
//   │                    │
//   │  Home         ●    │  ← main nav (active = highlighted)
//   │  Create      ⌘N   │
//   │  History           │
//   │  Folders           │
//   │                    │
//   │  FOLDERS           │  ← section label
//   │  ● Marketing   14  │  ← folder items with colored dots
//   │  ● Class notes  8  │
//   │  ● AI research 21  │
//   │                    │
//   │  ── spacer ──      │
//   │                    │
//   │  Extension         │  ← bottom nav
//   │  Settings          │
//   │                    │
//   │  ┌──────────────┐  │
//   │  │ Free plan    │  │  ← usage card
//   │  │ 10/30 gens   │  │
//   │  │ ████░░░░░░░  │  │
//   │  │ [Upgrade →]  │  │
//   │  └──────────────┘  │
//   └────────────────────┘
//
// Usage:
//   <Sidebar activePage="home" />
//   <Sidebar activePage="history" />
// ─────────────────────────────────────────────────────────────

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ROUTES } from "@/lib/constants/routes";

// ── Navigation Page IDs ─────────────────────────────────────

export type PageId =
  | "home"
  | "create"
  | "history"
  | "folders"
  | "extension"
  | "settings";

// ── Icons ───────────────────────────────────────────────────
// Thin-line 16px icons matching the hi-fi's icon set.
// These will be replaced with Lucide icons later.

const icons = {
  home: (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M2 7l6-5 6 5v7a1 1 0 0 1-1 1h-3v-5h-4v5H3a1 1 0 0 1-1-1V7z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 4.5V8l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M2 5a1 1 0 0 1 1-1h3l1.5 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  puzzle: (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M6 2.5a1.5 1.5 0 0 1 3 0v.5h2.5a1 1 0 0 1 1 1V6.5h.5a1.5 1.5 0 0 1 0 3H12.5V12a1 1 0 0 1-1 1H9v-.5a1.5 1.5 0 0 0-3 0V13H3.5a1 1 0 0 1-1-1V9.5H3a1.5 1.5 0 0 1 0-3h-.5V4a1 1 0 0 1 1-1H6v-.5z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  cog: (
    <svg viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 1.5v1.8M8 12.7v1.8M14.5 8h-1.8M3.3 8H1.5M12.6 3.4l-1.3 1.3M4.7 11.3 3.4 12.6M12.6 12.6l-1.3-1.3M4.7 4.7 3.4 3.4"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
};

// ── Nav Item Component ──────────────────────────────────────
// A single row in the sidebar navigation.
//
// Rows that have a destination render as real links, so middle-click,
// "open in new tab", the status-bar URL preview and keyboard activation
// all behave the way navigation is expected to. Two deliberate exceptions:
//
//   - `unavailable` rows have nowhere to go yet, so they render as a
//     disabled button. A disabled button is genuinely inert and is
//     announced as unavailable; a <span aria-disabled> is neither.
//   - `onNavigate` lets a preview surface show the active state without
//     leaving the page. The row stays a real link with a real href — the
//     handler only cancels the navigation.

type NavItemProps = {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  shortcut?: string;
} & (
  | { href: string; unavailable?: false; onNavigate?: () => void }
  | { href?: never; unavailable: true; onNavigate?: never }
);

function NavItem(props: NavItemProps) {
  const { icon, label, active = false, shortcut } = props;
  const unavailable = props.unavailable === true;

  // Built as flags rather than by appending overrides, because two
  // conflicting utilities (cursor-pointer and cursor-default) resolve by
  // their order in the generated stylesheet, not their order in this string.
  const rowClass = [
    "w-full flex items-center gap-2.5",
    "px-2.5 py-[7px] rounded-xn-md",
    "text-[13.5px] font-medium",
    "transition-all duration-150",
    // Active state: surface bg + shadow + full ink color + accent icon
    active ? "bg-xn-surface text-xn-ink shadow-xn" : "text-xn-ink-muted",
    // Only a row you can actually use reacts to the pointer.
    !active && !unavailable ? "hover:bg-xn-surface-alt hover:text-xn-ink" : "",
    unavailable ? "cursor-default opacity-50" : "cursor-pointer",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {/* Icon — 16×16, accent colored when active */}
      <span
        className={[
          "w-4 h-4 shrink-0 [&>svg]:w-full [&>svg]:h-full",
          active ? "text-xn-accent opacity-100" : "opacity-70",
        ].join(" ")}
      >
        {icon}
      </span>

      {/* Label */}
      <span className="flex-1 text-left">{label}</span>

      {/* Keyboard shortcut, or the marker on a row that has no destination */}
      {shortcut && (
        <span className="font-mono text-nano text-xn-ink-soft">{shortcut}</span>
      )}
    </>
  );

  if (props.unavailable) {
    return (
      <button type="button" disabled className={rowClass}>
        {content}
      </button>
    );
  }

  const { href, onNavigate } = props;

  return (
    <Link
      href={href}
      className={rowClass}
      onClick={
        onNavigate &&
        ((event) => {
          event.preventDefault();
          onNavigate();
        })
      }
    >
      {content}
    </Link>
  );
}

// ── Folder Item Component ───────────────────────────────────
// A single folder row with colored dot, name, and count.

function FolderItem({
  name,
  color,
  count,
  onClick,
}: {
  name: string;
  color: string;
  count: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full flex items-center gap-2",
        "px-2.5 py-1 pl-9 rounded-xn-sm",
        "text-xs text-xn-ink-soft",
        "cursor-pointer",
        "transition-colors duration-150",
        "hover:bg-xn-surface-alt hover:text-xn-ink-muted",
      ].join(" ")}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="flex-1 text-left">{name}</span>
      <span className="font-mono text-micro text-xn-ink-soft">{count}</span>
    </button>
  );
}

// ── Where each row goes ─────────────────────────────────────
// Settings and Extension are absent on purpose: neither route exists yet,
// so both render as unavailable rows rather than links into a 404.

const NAV_HREF = {
  home: ROUTES.DASHBOARD,
  create: ROUTES.CREATE,
  history: ROUTES.HISTORY,
  folders: ROUTES.FOLDERS,
} as const;

// True for the section's own path and anything beneath it, but not for a
// sibling that merely shares a prefix — "/folders" must not light up on a
// hypothetical "/folders-archive".
function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

// Which row the current URL belongs to. Pure, so it can be reasoned about
// without a router.
//
// `/output/[id]` deliberately matches nothing: a saved item is reachable
// from both History and Folders, and the editor's own back link already
// says which one you came from.
function pageForPathname(pathname: string): PageId | null {
  if (isUnder(pathname, NAV_HREF.home)) return "home";
  if (isUnder(pathname, NAV_HREF.create)) return "create";
  if (isUnder(pathname, NAV_HREF.history)) return "history";
  if (isUnder(pathname, NAV_HREF.folders)) return "folders";
  return null;
}

// ── Props ───────────────────────────────────────────────────

interface SidebarProps {
  /**
   * Overrides the row the current URL would highlight. Preview surfaces
   * only — in the app the sidebar reads the router itself.
   */
  activePage?: PageId;
  /**
   * Preview hook: cancels the row's navigation and reports which row was
   * clicked instead, so a showcase can demonstrate active states in place.
   */
  onNavigate?: (page: PageId) => void;
}

// ── Placeholder folder data ─────────────────────────────────
// This will come from the database later. For now, matches the hi-fi.

const folders = [
  { name: "Marketing", color: "#c54f2a", count: 14 },
  { name: "Class notes", color: "#4a5cb8", count: 8 },
  { name: "AI research", color: "#3f7a4f", count: 21 },
  { name: "YT scripts", color: "#b48a00", count: 3 },
  { name: "Personal", color: "#8e8478", count: 11 },
];

// ── Main Component ──────────────────────────────────────────

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  // The URL is the source of truth; the prop is an override for previews.
  const active = activePage ?? pageForPathname(pathname);

  // Only built when a preview asked for it, so the rows stay plain links
  // in the app and navigate normally.
  const previewHandler = (page: PageId) =>
    onNavigate ? () => onNavigate(page) : undefined;

  return (
    <aside
      className={[
        "w-[232px] shrink-0",
        "bg-xn-bg",
        "border-r border-xn-border",
        "p-3",
        "flex flex-col gap-0.5",
        "h-full overflow-y-auto",
        "hide-scrollbar",
      ].join(" ")}
    >
      {/* ── Logo ── */}
      <div className="px-2 pt-1.5 pb-3">
        <Logo size={22} showWordmark />
      </div>

      {/* ── Main Navigation ── */}
      <NavItem
        icon={icons.home}
        label="Home"
        href={NAV_HREF.home}
        active={active === "home"}
        onNavigate={previewHandler("home")}
      />
      <NavItem
        icon={icons.plus}
        label="Create"
        href={NAV_HREF.create}
        active={active === "create"}
        shortcut="⌘N"
        onNavigate={previewHandler("create")}
      />
      <NavItem
        icon={icons.history}
        label="History"
        href={NAV_HREF.history}
        active={active === "history"}
        onNavigate={previewHandler("history")}
      />
      <NavItem
        icon={icons.folder}
        label="Folders"
        href={NAV_HREF.folders}
        active={active === "folders"}
        onNavigate={previewHandler("folders")}
      />

      {/* ── Folder Section ── */}
      <div className="px-3 pt-3 pb-1 font-mono text-[10.5px] text-xn-ink-soft tracking-[0.06em] uppercase">
        Folders
      </div>
      {folders.map((f) => (
        <FolderItem key={f.name} name={f.name} color={f.color} count={f.count} />
      ))}

      {/* ── Spacer — pushes bottom items down ── */}
      <div className="flex-1" />

      {/* ── Bottom Navigation ── */}
      {/* Neither route is built yet. The rows stay so the bottom cluster
          keeps its shape, but they are inert and say so — a link into a
          404 is worse than the dead row it would replace. */}
      <NavItem icon={icons.puzzle} label="Extension" unavailable shortcut="Soon" />
      <NavItem icon={icons.cog} label="Settings" unavailable shortcut="Soon" />

      {/* ── Usage Card ── */}
      <div
        className={[
          "mt-2 p-3 rounded-xn-md",
          "bg-xn-surface-alt",
          "border border-xn-border",
        ].join(" ")}
      >
        <p className="font-mono text-nano text-xn-ink-soft tracking-[0.06em] uppercase">
          Free plan
        </p>
        <p className="font-semibold text-sm mt-0.5">10 / 30 generations</p>
        <div className="mt-1.5">
          <ProgressBar value={33} size="sm" />
        </div>
        <Button variant="primary" size="sm" fullWidth className="mt-2.5">
          Upgrade →
        </Button>
      </div>
    </aside>
  );
}