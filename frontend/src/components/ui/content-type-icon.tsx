// ─────────────────────────────────────────────────────────────
// ContentTypeIcon
// ─────────────────────────────────────────────────────────────
// Renders a unique icon for each of the 7 content types,
// colored with the type's identity color from theme.ts.
//
// Icon shapes:
//   blog       → document with text lines (article)
//   notes      → notebook with ruled lines (study notes)
//   summary    → compressed horizontal lines (condensed)
//   research   → beaker/flask (academic)
//   flashcards → stacked cards (deck)
//   quiz       → circle with question mark
//   social     → share/broadcast arrows
//
// Two display modes:
//   icon only     → just the colored SVG (default)
//   with background → icon inside a tinted circle/rounded square
//
// Usage:
//   <ContentTypeIcon type="blog" />
//   <ContentTypeIcon type="notes" size="lg" />
//   <ContentTypeIcon type="quiz" withBackground />
// ─────────────────────────────────────────────────────────────

import {
    contentTypeColors,
    type ContentType,
  } from "@/lib/constants/theme";
  
  // ── Size Definitions ────────────────────────────────────────
  
  const sizes = {
    sm: { icon: 14, bg: 24 },
    md: { icon: 16, bg: 28 },
    lg: { icon: 20, bg: 34 },
    xl: { icon: 24, bg: 40 },
  } as const;
  
  type ContentTypeIconSize = keyof typeof sizes;
  
  // ── Props ───────────────────────────────────────────────────
  
  interface ContentTypeIconProps {
    /** Which content type to render */
    type: ContentType;
    /** Icon size: sm, md, lg, xl */
    size?: ContentTypeIconSize;
    /** Show a tinted background circle behind the icon */
    withBackground?: boolean;
    /** Additional CSS class */
    className?: string;
  }
  
  // ── Icon SVGs ───────────────────────────────────────────────
  // Each icon is a thin-line SVG designed to be recognizable at 16px.
  // They use currentColor for stroke so the parent's color applies.
  
  const iconPaths: Record<ContentType, React.ReactNode> = {
    // Blog — document with text lines
    blog: (
      <>
        <path
          d="M3.5 2h6L13 5.5V14a.5.5 0 0 1-.5.5H3.5A.5.5 0 0 1 3 14V2.5a.5.5 0 0 1 .5-.5z"
          stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none"
        />
        <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
        <path d="M5.5 8h5M5.5 10.5h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
  
    // Notes — notebook with ruled lines
    notes: (
      <>
        <rect
          x="2.5" y="2.5" width="11" height="11" rx="1.5"
          stroke="currentColor" strokeWidth="1.3" fill="none"
        />
        <path
          d="M5 6h6M5 8.5h6M5 11h4"
          stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"
        />
      </>
    ),
  
    // Summary — compressed horizontal lines
    summary: (
      <>
        <path
          d="M2.5 4h11M2.5 7h8M2.5 10h5M2.5 13h3"
          stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"
        />
      </>
    ),
  
    // Research — beaker/flask
    research: (
      <>
        <path
          d="M5.5 2v4L2.5 12.5a1 1 0 0 0 1 1.5h9a1 1 0 0 0 1-1.5L10.5 6V2"
          stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none"
        />
        <path d="M5 2h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M4.5 10h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
  
    // Flashcards — stacked cards
    flashcards: (
      <>
        <rect
          x="1.5" y="4" width="10" height="8" rx="1.5"
          stroke="currentColor" strokeWidth="1.3" fill="none"
        />
        <path
          d="M4.5 4V2.5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H11.5"
          stroke="currentColor" strokeWidth="1.3" fill="none"
        />
        <path d="M4 7h5M4 9.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
  
    // Quiz — circle with question mark
    quiz: (
      <>
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" fill="none" />
        <path
          d="M6 6.5a2 2 0 0 1 3.5 1.3c0 1.2-1.5 1.2-1.5 2.2"
          stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none"
        />
        <circle cx="8" cy="12" r="0.5" fill="currentColor" />
      </>
    ),
  
    // Social — broadcast/share arrows
    social: (
      <>
        <circle cx="4" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
        <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
        <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
        <path d="M5.8 7l4.4-2M5.8 9l4.4 2" stroke="currentColor" strokeWidth="1.3" />
      </>
    ),
  };
  
  // ── Component ───────────────────────────────────────────────
  
  export function ContentTypeIcon({
    type,
    size = "md",
    withBackground = false,
    className = "",
  }: ContentTypeIconProps) {
    const s = sizes[size];
    const typeColor = contentTypeColors[type];
  
    // The SVG icon itself
    const icon = (
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 16 16"
        fill="none"
        className="shrink-0"
        style={{ color: typeColor.color }}
      >
        {iconPaths[type]}
      </svg>
    );
  
    // If no background, just return the icon
    if (!withBackground) {
      return <span className={`inline-flex ${className}`}>{icon}</span>;
    }
  
    // With background — wrap the icon in a tinted circle
    return (
      <span
        className={[
          "inline-flex items-center justify-center",
          "rounded-xn-md shrink-0",
          className,
        ].join(" ")}
        style={{
          width: s.bg,
          height: s.bg,
          backgroundColor: typeColor.bg,
          border: `1px solid ${typeColor.border}`,
        }}
      >
        {icon}
      </span>
    );
  }
  
  // Re-export types
  export type { ContentTypeIconSize };