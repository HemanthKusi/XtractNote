"use client";

// ─────────────────────────────────────────────────────────────
// ThemeProvider
// ─────────────────────────────────────────────────────────────
// Manages the app's visual theme. There are two: light and dark.
//
// How it works:
// 1. On first load, checks localStorage for a saved preference
// 2. If none is found, or the stored value is not a theme, uses light
// 3. Sets data-theme on the <html> element
// 4. globals.css sees that attribute and activates those CSS variables
// 5. Everything using bg-xn-surface, text-xn-ink and friends re-colours
//
// The attribute swap is the whole mechanism: changing it re-colours the
// entire app without re-rendering a single child component.
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

// The theme names, the default, and the guard all come from the token
// file. They were previously restated here, so the two could disagree
// about which themes exist.
import {
  DEFAULT_THEME,
  isThemeName,
  type ThemeName,
} from "@/lib/constants/theme";

// ── Context Definition ──────────────────────────────────────

interface ThemeContextValue {
  /** The currently active theme: "light" or "dark". */
  theme: ThemeName;
  /** Change the theme. Persists to localStorage automatically. */
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ── Constants ───────────────────────────────────────────────

// Prefixed so it cannot collide with another app on the same origin.
const STORAGE_KEY = "xn-theme";

// Themes that no longer exist, and what they become. The warm "paper"
// and near-white "clean" themes were retired; anyone still carrying one
// in localStorage is moved to light and the stale value is rewritten,
// rather than being silently ignored on every load.
const RETIRED_THEMES: Record<string, ThemeName> = {
  paper: "light",
  clean: "light",
};

/**
 * Read the stored preference, tolerating anything localStorage might
 * hold — a retired theme name, a value from another app, or nothing.
 */
function readStoredTheme(): ThemeName | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  // Note the guard takes the bare value rather than a cast expression:
  // a type guard called on a cast does not narrow.
  if (isThemeName(stored)) return stored;

  const migrated = RETIRED_THEMES[stored];
  if (migrated) {
    localStorage.setItem(STORAGE_KEY, migrated);
    return migrated;
  }

  return null;
}

// ── Provider Component ──────────────────────────────────────

interface ThemeProviderProps {
  children: ReactNode;
  /** Override the default theme (useful for testing or previews). */
  defaultTheme?: ThemeName;
}

export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
  // Read localStorage during the first render so the theme is right
  // immediately and there is no flash of the wrong one.
  //
  // Known trade-off: the server cannot see localStorage, so it renders
  // the default while a client holding "dark" renders dark, and React
  // reports a hydration mismatch in development. It is dev-only and
  // users never see it. The real fix is to store the preference in a
  // cookie the server can read; that is deliberately deferred.
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === "undefined") {
      return defaultTheme ?? DEFAULT_THEME;
    }
    return readStoredTheme() ?? defaultTheme ?? DEFAULT_THEME;
  });

  // The single line that triggers the CSS variable swap.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── useTheme Hook ───────────────────────────────────────────

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
