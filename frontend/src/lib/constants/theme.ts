// ─────────────────────────────────────────────────────────────
// XtractNote — TypeScript-side design tokens
// ─────────────────────────────────────────────────────────────
// The token layer lives in globals.css as CSS variables, and
// tailwind.config.ts maps those variables to utility classes.
// Components should reach for the utilities first — bg-xn-surface,
// text-xn-ink-muted — and come here only when a value has to be
// handed to TypeScript, which in practice means an inline style.
//
// Everything below therefore refers to the variables rather than
// restating their values. A literal here would be a second source of
// truth that could not follow the theme, which is exactly what this
// file used to be.
// ─────────────────────────────────────────────────────────────

// ── Themes ──────────────────────────────────────────────────
// Two, not three. The warm "paper" and near-white "clean" themes
// were retired along with the warm surface family; both now resolve
// to the single light theme. The database constrains the stored
// preference to these same two values.

export type ThemeName = "light" | "dark";

export const THEMES: readonly ThemeName[] = ["light", "dark"] as const;

export const DEFAULT_THEME: ThemeName = "light";

/** Narrow an unknown stored value — localStorage, a database row — to a theme. */
export function isThemeName(value: unknown): value is ThemeName {
  return value === "light" || value === "dark";
}

// ── Content-format identity ─────────────────────────────────
// The seven formats are the only saturated colours in the product,
// and they belong only on format-bearing elements: a chip, a type
// icon, a folder dot, the rail on an output header. Never a button,
// nav item, background, or primary action.
//
// These were literal hex, which meant a chip tuned for a light
// surface kept exactly the same value on a near-black one. Each now
// points at a variable that inverts with the theme, and the tints are
// derived from it rather than hand-picked, so a fill and its border
// can never drift away from the colour they belong to.

/** Fill and border tints, derived from a format's own colour. */
function formatTints(token: string) {
  return {
    color: `var(${token})`,
    /** Chip and badge fill — light enough to sit under text. */
    bg: `color-mix(in srgb, var(${token}) 13%, transparent)`,
    /** Chip and card border — visible without competing with the fill. */
    border: `color-mix(in srgb, var(${token}) 32%, transparent)`,
  };
}

export const contentTypeColors = {
  blog: { ...formatTints("--xn-fmt-blog"), label: "Blog Post" },
  notes: { ...formatTints("--xn-fmt-notes"), label: "Study Notes" },
  summary: { ...formatTints("--xn-fmt-summary"), label: "Summary" },
  research: { ...formatTints("--xn-fmt-research"), label: "Research" },
  flashcards: { ...formatTints("--xn-fmt-flashcards"), label: "Flashcards" },
  quiz: { ...formatTints("--xn-fmt-quiz"), label: "Quiz" },
  social: { ...formatTints("--xn-fmt-social"), label: "Social Pack" },
} as const;

export type ContentType = keyof typeof contentTypeColors;

// ── Status ──────────────────────────────────────────────────
// Status is chrome, not identity, so it stays near-monochrome. Giving
// each status its own hue would put five more saturated colours on
// screen competing with the seven that are supposed to mean something.
//
// Only the failure case earns colour, because only it needs to stop
// someone. The rest are separated by weight and by their label.

export const statusColors = {
  draft: {
    bg: "var(--xn-surface-alt)",
    text: "var(--xn-ink-muted)",
    border: "var(--xn-border)",
  },
  saved: {
    bg: "var(--xn-surface-alt)",
    text: "var(--xn-ink)",
    border: "var(--xn-border-strong)",
  },
  archived: {
    bg: "transparent",
    text: "var(--xn-ink-soft)",
    border: "var(--xn-border)",
  },
  exported: {
    bg: "var(--xn-surface-alt)",
    text: "var(--xn-ink-muted)",
    border: "var(--xn-border)",
  },
  error: {
    bg: "var(--xn-danger-soft)",
    text: "var(--xn-danger)",
    border: "color-mix(in srgb, var(--xn-danger) 32%, transparent)",
  },
} as const;

export type StatusType = keyof typeof statusColors;

// ── Folder colours ──────────────────────────────────────────
// Unlike everything else here these are *data*: the chosen value is
// written to the folder row and read back later, so it has to be a
// literal that means the same thing whenever it is read.
//
// That is also the limitation. A stored hex cannot follow the theme,
// so these are the light-surface values and they stay slightly dark
// against the dark theme. Fixing it properly means storing a token
// name instead of a colour, which is a migration rather than a
// restyle — deferred deliberately.
//
// Folders created before this change keep whatever hex they were
// given; nothing rewrites existing rows.

export const folderColors = [
  "#2563C9", // blue
  "#2A8049", // green
  "#97680D", // amber
  "#7B4BD4", // violet
  "#C14B26", // rust
  "#CE3462", // rose
  "#117E78", // teal
] as const;

// ── The one folder amber ────────────────────────────────────
// Presentation, not data — the opposite of folderColors above. Every
// folder now *displays* as the same amber regardless of the hex stored
// on its row, because a wall of differently-tinted folders put a second
// saturated system on screen competing with the seven format colours,
// which are meant to be the only saturated things that mean anything.
// Identity comes from the emoji and the name instead.
//
// It is a literal rather than a token because it does not invert with
// the theme: manila is a physical colour, the same reasoning that keeps
// a sheet of paper white on a dark ground.

export const folderAmber = "#E5AE3C";
