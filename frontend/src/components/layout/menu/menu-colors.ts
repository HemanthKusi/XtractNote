// src/components/layout/menu/menu-colors.ts
//
// The menu is ink in every mode, and everything drawn on it is the page
// colour on ink, in these steps. Shared by the rows and the credits foot.

/** SearchInput's own surface: ink ground, page-coloured glyphs, at every size. */
export const ON_INK = "var(--xn-bg)";
export const ON_INK_DIM = "color-mix(in srgb, var(--xn-bg) 66%, transparent)";
export const ON_INK_ACTIVE = "color-mix(in srgb, var(--xn-bg) 15%, transparent)";
export const ON_INK_HOVER = "color-mix(in srgb, var(--xn-bg) 8%, transparent)";
