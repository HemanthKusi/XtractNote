"use client";

// ─────────────────────────────────────────────────────────────
// ThemeProvider
// ─────────────────────────────────────────────────────────────
// Manages the app's visual theme (Paper / Clean / Dark).
//
// How it works:
// 1. On first load, checks localStorage for a saved theme preference
// 2. If none found, defaults to "paper" (warm cream)
// 3. Sets data-theme="paper" on the <html> element
// 4. globals.css sees [data-theme="paper"] and activates those CSS variables
// 5. Every component using bg-xn-surface, text-xn-ink, etc. gets the right colors
//
// When the user clicks a theme toggle:
// 1. setTheme("dark") is called
// 2. State updates, useEffect fires
// 3. <html> attribute changes to data-theme="dark"
// 4. CSS variables instantly swap to dark values
// 5. Entire app re-colors without a single React re-render of child components
// 6. Choice is saved to localStorage for next visit
//
// Usage in any component:
//   import { useTheme } from "@/components/shared/theme-provider";
//   const { theme, setTheme } = useTheme();
//   <button onClick={() => setTheme("dark")}>Dark Mode</button>
// ─────────────────────────────────────────────────────────────

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// Import the ThemeName type so we get autocomplete and type safety.
// This type is "paper" | "clean" | "dark" — nothing else is allowed.
import type { ThemeName } from "@/lib/constants/theme";

// ── Context Definition ──────────────────────────────────────
// This defines the SHAPE of what the context provides.
// Any component using useTheme() gets an object with these two properties.

interface ThemeContextValue {
  /** The currently active theme name: "paper", "clean", or "dark" */
  theme: ThemeName;
  /** Function to change the theme. Saves to localStorage automatically. */
  setTheme: (theme: ThemeName) => void;
}

// Create the context with undefined as default.
// It's undefined because the actual value is set by the Provider below.
// If someone tries to use useTheme() outside of a ThemeProvider,
// we throw a helpful error (see the hook at the bottom).
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ── Constants ───────────────────────────────────────────────

// The key used to save/read the theme in localStorage.
// Using a prefix ("xn-") avoids conflicts with other apps on localhost.
const STORAGE_KEY = "xn-theme";

// If nothing is saved in localStorage, use this theme.
const DEFAULT_THEME: ThemeName = "paper";

// The three valid theme names. Used to validate what we read from localStorage
// (because localStorage could contain anything — even garbage from another app).
const VALID_THEMES: ThemeName[] = ["paper", "clean", "dark"];

// ── Provider Component ──────────────────────────────────────

interface ThemeProviderProps {
  children: ReactNode;
  /** Override the default theme (useful for testing or previews) */
  defaultTheme?: ThemeName;
}

export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
  // ── State Initialization ──
  // useState accepts a function (called a "lazy initializer") that runs
  // only once on first render. We use this to read from localStorage
  // without reading it on every re-render.
  const [theme, setThemeState] = useState<ThemeName>(() => {
    // During server-side rendering, window doesn't exist.
    // Return the default and let the client-side effect handle the rest.
    if (typeof window === "undefined") {
      return defaultTheme ?? DEFAULT_THEME;
    }

    // Try to read the saved preference from localStorage.
    const stored = localStorage.getItem(STORAGE_KEY);

    // Validate it — only accept known theme names.
    // This protects against corrupted or tampered localStorage values.
    if (stored && VALID_THEMES.includes(stored as ThemeName)) {
      return stored as ThemeName;
    }

    // Nothing saved or invalid — use the default.
    return defaultTheme ?? DEFAULT_THEME;
  });

  // ── Apply Theme to DOM ──
  // Whenever the theme state changes, update the data-theme attribute
  // on <html>. This is the single line that triggers the entire CSS
  // variable swap defined in globals.css.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // ── Theme Setter ──
  // useCallback memoizes this function so it doesn't get recreated on
  // every render. This prevents unnecessary re-renders in child components
  // that receive setTheme as a prop or through context.
  const setTheme = useCallback((newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, []);

  // ── Render ──
  // ThemeContext.Provider makes { theme, setTheme } available to
  // every descendant component that calls useTheme().
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── useTheme Hook ───────────────────────────────────────────
// This is what components actually import and use.
// It reads the current context value and returns { theme, setTheme }.
//
// The error check ensures you don't accidentally use useTheme()
// in a component that's not wrapped by ThemeProvider. Without this,
// you'd get `undefined` and a confusing crash later.

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme() must be used within a <ThemeProvider>. " +
      "Make sure your component is a child of the ThemeProvider in layout.tsx."
    );
  }

  return context;
}