// src/components/layout/menu/index.ts
//
// The floating menu: one element that morphs between a panel, a dock and a
// button. Split three ways on purpose —
//
//   menu-geometry  pure numbers and pure functions, checkable without a browser
//   menu-icons     the animated glyphs, each one self-contained
//   app-menu       the component that puts the two together
//   menu-shell     the client boundary that owns which mode it is in
//
// The geometry is separate because the browser tooling here has repeatedly
// failed to run an animation at all, and arithmetic outside the component stays
// verifiable when a frame never arrives.

export { AppMenu, type AppMenuProps } from "./app-menu";
export { MenuShell } from "./menu-shell";
export { MENU_ENTRIES, pageForPathname, reservedFor, type MenuMode, type PageId } from "./menu-geometry";
