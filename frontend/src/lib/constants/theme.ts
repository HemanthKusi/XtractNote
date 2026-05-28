// ─────────────────────────────────────────────────────────────
// XtractNote Design Tokens
// ─────────────────────────────────────────────────────────────
// Single source of truth for all colors, fonts, and spacing.
// These values come directly from the hi-fi designs (hifi-core.jsx).
//
// CSS variables are set in globals.css. Tailwind reads them via
// tailwind.config.ts. Components use Tailwind classes like
// `bg-xn-surface` or `text-xn-ink-muted`.
//
// This file is for TypeScript code that needs color values directly
// (e.g., charts, dynamic styles, content-type icons).
// ─────────────────────────────────────────────────────────────

// ── Theme Palettes ──────────────────────────────────────────
// Each theme defines the same set of tokens with different values.
// "paper" is warm cream (Notability/Readwise feel).
// "clean" is crisp white (more neutral).
// "dark" is warm dark (not pure black — warm undertones).

export const themes = {
    paper: {
      bg: '#fbf8f1',
      bgDeep: '#f3edde',
      surface: '#ffffff',
      surfaceAlt: '#fbf8f1',
      ink: '#1c1813',
      inkMuted: '#6b6055',
      inkSoft: '#8e8478',
      inkFaint: 'rgba(28,24,19,0.10)',
      border: '#ece5d4',
      borderStrong: '#dccfb1',
      shadow: '0 1px 2px rgba(28,24,19,0.04), 0 4px 16px rgba(28,24,19,0.05)',
      shadowLg: '0 4px 12px rgba(28,24,19,0.06), 0 12px 40px rgba(28,24,19,0.10)',
    },
    clean: {
      bg: '#f6f6f4',
      bgDeep: '#eeeeea',
      surface: '#ffffff',
      surfaceAlt: '#fafaf8',
      ink: '#161614',
      inkMuted: '#5e5d57',
      inkSoft: '#86847d',
      inkFaint: 'rgba(22,22,20,0.10)',
      border: '#e6e5e0',
      borderStrong: '#d4d3cc',
      shadow: '0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04)',
      shadowLg: '0 4px 12px rgba(0,0,0,0.05), 0 12px 40px rgba(0,0,0,0.08)',
    },
    dark: {
      bg: '#15130f',
      bgDeep: '#100e0b',
      surface: '#1d1a15',
      surfaceAlt: '#22201a',
      ink: '#f1ece0',
      inkMuted: '#a59e8e',
      inkSoft: '#7d776b',
      inkFaint: 'rgba(241,236,224,0.10)',
      border: '#2d2922',
      borderStrong: '#3b362d',
      shadow: '0 1px 2px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
      shadowLg: '0 4px 12px rgba(0,0,0,0.5), 0 12px 40px rgba(0,0,0,0.5)',
    },
  } as const;
  
  // This creates a type that can only be "paper" | "clean" | "dark".
  // TypeScript will catch any typo if you accidentally write "drak".
  export type ThemeName = keyof typeof themes;
  
  // ── Accent Color ────────────────────────────────────────────
  // The terracotta accent is the default. Others are available
  // for future user preference settings.
  
  export const accent = {
    terracotta: '#c54f2a',
    forest: '#3f7a4f',
    indigo: '#4a5cb8',
    plum: '#8a3a6e',
  } as const;
  
  export const defaultAccent = accent.terracotta;
  
  // ── Highlight ───────────────────────────────────────────────
  // The yellow highlighter mark (like Notability's marker pen).
  
  export const highlight = '#fbe28f';
  
  // ── Content Type Colors ─────────────────────────────────────
  // Each of the 7 content types has its own identity color.
  // `color` is the main color, `bg` is a light tint for chips
  // and badges, `border` is for chip/card borders.
  
  export const contentTypeColors = {
    blog:       { color: '#3B7AE8', bg: '#EEF4FF', border: '#C6DBFC', label: 'Blog Post' },
    notes:      { color: '#48903A', bg: '#F0F7EC', border: '#C8E2B8', label: 'Study Notes' },
    summary:    { color: '#D4880C', bg: '#FEF4E8', border: '#F5DDB5', label: 'Summary' },
    research:   { color: '#7E4CC5', bg: '#F5F0FF', border: '#DDD0F5', label: 'Research' },
    flashcards: { color: '#E06030', bg: '#FEF0E8', border: '#F5D0B5', label: 'Flashcards' },
    quiz:       { color: '#D44060', bg: '#FEECEF', border: '#F9C3CC', label: 'Quiz' },
    social:     { color: '#1C8C86', bg: '#EDFAF9', border: '#B8E8E5', label: 'Social Pack' },
  } as const;
  
  export type ContentType = keyof typeof contentTypeColors;
  
  // ── Folder Colors ───────────────────────────────────────────
  // Users can assign these vibrant colors to folders.
  
  export const folderColors = [
    '#E06030', // orange
    '#3B7AE8', // blue
    '#48903A', // green
    '#D4880C', // amber
    '#7E4CC5', // purple
    '#1C8C86', // teal
    '#D44060', // rose
  ] as const;
  
  // ── Status Colors ───────────────────────────────────────────
  // Used for status pills in the history table.
  
  export const statusColors = {
    draft:    { bg: '#FEF4E8', text: '#D4880C', border: '#F5DDB5' },
    saved:    { bg: '#F0F7EC', text: '#48903A', border: '#C8E2B8' },
    archived: { bg: '#f8f7f5', text: '#8e8478', border: '#e6e3dc' },
    exported: { bg: '#EEF4FF', text: '#3B7AE8', border: '#C6DBFC' },
    error:    { bg: '#FEECEF', text: '#D44060', border: '#F9C3CC' },
  } as const;
  
  export type StatusType = keyof typeof statusColors;
  
  // ── Font Families ───────────────────────────────────────────
  
  export const fonts = {
    sans: '"DM Sans", system-ui, sans-serif',
    serif: '"Instrument Serif", Georgia, serif',
    mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
    hand: '"Caveat", cursive',
  } as const;
  
  // ── Border Radius ───────────────────────────────────────────
  
  export const radius = {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
    pill: '999px',
  } as const;
  
  // ── Brand Palette ───────────────────────────────────────────
  // From the XtractNote logo file — deep navy + cream + amber.
  // Used for the logo component and splash screens.
  
  export const brand = {
    bg: '#0c1b3a',
    bgDeep: '#081530',
    ink: '#f3ebd9',
    inkSoft: 'rgba(243,235,217,0.6)',
    accent: '#e8a955',
    paper: '#fbf7ec',
  } as const;