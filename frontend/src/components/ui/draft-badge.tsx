// ─────────────────────────────────────────────────────────────
// components/ui/draft-badge.tsx
//
// The mark a draft carries wherever it is listed: History, a folder, the
// create page's drafts band. One look for "draft" across the app.
//
// Filled with ink rather than tinted. Status is chrome, not identity, so it
// stays monochrome and the format colour stays the rail's alone; the soft
// status chip it replaces was too faint to find in a list.
// ─────────────────────────────────────────────────────────────

export function DraftBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-xn-pill border border-xn-ink bg-xn-ink px-2 py-0.5 text-xs font-semibold leading-tight text-xn-bg ${className}`}
    >
      Draft
    </span>
  );
}
