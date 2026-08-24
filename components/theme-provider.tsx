"use client";

/**
 * Holds the shaper's theme preference and keeps the root element's class in step with it.
 *
 * Almost nothing happens here: the themes themselves are pure CSS (see the three-layer system
 * at the top of app/globals.css), and the *first* paint is handled before React exists at all,
 * by the inline script in app/layout.tsx. This provider only owns what happens afterwards —
 * the menu's current selection, writing the choice to localStorage, and following the OS while
 * the preference is `system`.
 *
 * Both pieces of state live outside React (localStorage, and a media query), so both are read
 * through `useSyncExternalStore` rather than an effect-plus-setState. That is the reason the
 * server/client difference is safe: `getServerSnapshot` returns the same default the server
 * rendered, React hydrates against it, then re-renders with the real client value — no
 * hydration mismatch, and no cascading render.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  THEME_STORAGE_KEY,
  applyThemePreference,
  parseThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/* -- stored preference, as an external store ------------------------------------------- */

/** Subscribers for same-tab writes. The `storage` event only fires in *other* tabs. */
const storeListeners = new Set<() => void>();

function emitPreferenceChange() {
  for (const listener of storeListeners) listener();
}

function subscribeToStoredPreference(onStoreChange: () => void) {
  storeListeners.add(onStoreChange);
  // Free cross-tab sync: another tab picking Dark fires `storage` here, and this provider
  // re-renders and re-applies the class without anything else being wired up.
  window.addEventListener("storage", onStoreChange);
  return () => {
    storeListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getStoredPreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    // Safari private mode and blocked-cookie contexts throw on access.
    return "system";
  }
}

/** Must match what the server rendered — the server cannot see storage, so: the default. */
function getServerPreference(): ThemePreference {
  return "system";
}

/* -- OS preference, as an external store ----------------------------------------------- */

function subscribeToSystemPreference(onStoreChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function getSystemPrefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

function getServerSystemPrefersDark(): boolean {
  return false;
}

/* -------------------------------------------------------------------------------------- */

interface ThemeContextValue {
  /** What the shaper picked: `system`, `light` or `dark`. */
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  /** What is actually on screen — `system` resolved against the OS. */
  resolved: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(
    subscribeToStoredPreference,
    getStoredPreference,
    getServerPreference,
  );
  const systemPrefersDark = useSyncExternalStore(
    subscribeToSystemPreference,
    getSystemPrefersDark,
    getServerSystemPrefersDark,
  );

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked — the choice still applies for this session (the class goes on
      // below), it just won't survive a reload. Better than refusing to switch.
    }
    // Applied here as well as in the effect so the switch is synchronous with the click.
    // Passive effects run after paint, which would show one frame of the old theme.
    applyThemePreference(document.documentElement, next);
    emitPreferenceChange();
  }, []);

  // Keeps the class in step with the preference for the paths `setPreference` does not
  // cover: another tab changing it, and first mount when the inline script was blocked by a
  // strict CSP. Idempotent, and DOM-only — it sets no state.
  useEffect(() => {
    applyThemePreference(document.documentElement, preference);
  }, [preference]);

  const resolved = resolveTheme(preference, systemPrefersDark);

  const value = useMemo(
    () => ({ preference, setPreference, resolved }),
    [preference, setPreference, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
