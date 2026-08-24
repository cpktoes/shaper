/**
 * Theme preference boundary.
 *
 * The *rendering* of a theme is entirely CSS — see the three-layer system at the top of
 * app/globals.css. This module owns only the small amount of state CSS cannot hold: which of
 * the three preferences the shaper picked, where it is stored, and which class that maps to.
 *
 * Deliberately DOM-free. `applyThemePreference` takes a structurally-typed root rather than
 * importing `HTMLElement`, so the whole module unit-tests under Vitest's `node` environment
 * with no jsdom in the dependency tree.
 */

/** What the shaper chose. `system` means "follow the OS", and is the default. */
export type ThemePreference = "system" | "light" | "dark";

/** What is actually on screen once `system` has been resolved against the OS. */
export type ResolvedTheme = "light" | "dark";

/** Menu order, and the order the radio group renders in. */
export const THEME_PREFERENCES: readonly ThemePreference[] = ["system", "light", "dark"];

export const THEME_STORAGE_KEY = "shaper-theme";

/**
 * The two classes this module ever puts on the root element. `system` maps to *neither*:
 * bare `:root` is the light theme and the `prefers-color-scheme` block handles OS dark, so
 * the correct representation of "follow the OS" is the absence of both classes. That is also
 * what makes a first paint with no JavaScript correct.
 */
const THEME_CLASSES = ["light", "dark"] as const;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

/**
 * Reads a stored value back into a preference, falling back to `system` for anything
 * unrecognised — a stale key from an older build, a hand-edited localStorage entry, or null.
 */
export function parseThemePreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : "system";
}

/** Which class belongs on the root element, or `null` for "follow the OS". */
export function themeClassFor(preference: ThemePreference): "light" | "dark" | null {
  return preference === "system" ? null : preference;
}

/** What the user actually sees, given the OS preference at this moment. */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference !== "system") return preference;
  return systemPrefersDark ? "dark" : "light";
}

/**
 * The minimal shape of a root element this module needs. Structural, so tests pass a fake and
 * the provider passes `document.documentElement` — neither needs a DOM typing import here.
 */
export interface ThemeRoot {
  classList: {
    add: (token: string) => void;
    remove: (token: string) => void;
  };
}

/**
 * Puts the preference on the root element. Always removes both classes before adding, so
 * switching light→dark→system leaves nothing stale behind; `classList.remove` on an absent
 * class is a no-op, which is why this is unconditional rather than branched.
 */
export function applyThemePreference(root: ThemeRoot, preference: ThemePreference): void {
  for (const cls of THEME_CLASSES) root.classList.remove(cls);
  const next = themeClassFor(preference);
  if (next) root.classList.add(next);
}

/**
 * The pre-hydration script, as source text.
 *
 * This runs synchronously while the browser parses <head>, before the first paint, which is
 * the only way to restore a stored override without a flash of the wrong theme — see
 * node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md. It
 * cannot import from this module (it is a raw string in the HTML), so it necessarily
 * re-implements `applyThemePreference` in miniature.
 *
 * Duplicated logic drifts, so lib/theme.test.ts evaluates this string against a fake document
 * and asserts it produces exactly what `applyThemePreference` produces, for every preference
 * and for junk input. If the two implementations ever disagree, a test fails.
 *
 * The try/catch matters: `localStorage` throws on access in Safari private mode and wherever
 * cookies are blocked. Swallowing it leaves the classes untouched, which lands on `system` —
 * the correct fallback, and still flash-free.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var c=document.documentElement.classList;c.remove("light");c.remove("dark");if(p==="light"||p==="dark")c.add(p)}catch(e){}})()`;
