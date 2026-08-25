/**
 * Theme registry and preference boundary.
 *
 * The *rendering* of a theme is entirely CSS — see the layered system at the top of
 * app/globals.css. This module owns only what CSS cannot: the list of themes that exist,
 * which one the shaper picked, where that is stored, and which classes it maps to.
 *
 * Adding, removing or renaming a theme is an edit to THEMES plus the matching ramp and
 * `:root.theme-<id>` block in globals.css. Nothing else in the app enumerates themes — the
 * settings menu, the provider and the pre-hydration script all read this list.
 *
 * Deliberately DOM-free. `applyThemePreference` takes a structurally-typed root rather than
 * importing `HTMLElement`, so the whole module unit-tests under Vitest's `node` environment
 * with no jsdom in the dependency tree.
 */

export type ThemeMode = "light" | "dark";

export interface ThemeDefinition {
  /** Stable identifier: the storage value and the `theme-<id>` class suffix. */
  id: string;
  /** What the settings menu shows. */
  label: string;
  /** One line under the label, and what distinguishes two themes of the same mode. */
  description: string;
  /** Drives `color-scheme` and decides which OS preference this theme can be the default for. */
  mode: ThemeMode;
}

/** Menu order. Grouped by mode when rendered. */
export const THEMES: readonly ThemeDefinition[] = [
  { id: "daylight", label: "Daylight", description: "Blue on white", mode: "light" },
  { id: "chalk", label: "Chalk", description: "Black on white, cyan accent", mode: "light" },
  { id: "slate", label: "Slate", description: "Chalk on matte black", mode: "dark" },
  { id: "phosphor", label: "Phosphor", description: "Green terminal", mode: "dark" },
];

/**
 * What `system` resolves to. These two must match the theme assigned to bare `:root` and to
 * the `prefers-color-scheme: dark` block in globals.css — that CSS is what paints before any
 * JavaScript runs, so if these disagree the first paint and the menu disagree too.
 */
export const DEFAULT_LIGHT_THEME = "daylight";
export const DEFAULT_DARK_THEME = "phosphor";

/** `system` follows the OS. Anything else is a theme id. */
export type ThemePreference = "system" | (string & {});

export const THEME_STORAGE_KEY = "shaper-theme";

/**
 * Values written by the two-theme version of this module. Mapped rather than discarded so an
 * existing choice survives the upgrade instead of silently reverting to system.
 */
const LEGACY_ALIASES: Record<string, string> = {
  light: DEFAULT_LIGHT_THEME,
  dark: DEFAULT_DARK_THEME,
};

export function getTheme(id: string): ThemeDefinition | undefined {
  return THEMES.find((t) => t.id === id);
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || (typeof value === "string" && THEMES.some((t) => t.id === value));
}

/**
 * Reads a stored value back into a preference. Falls back to `system` for anything
 * unrecognised — a theme that has since been removed, a hand-edited entry, or null — and
 * translates the old `light`/`dark` values first.
 */
export function parseThemePreference(value: unknown): ThemePreference {
  if (typeof value === "string" && LEGACY_ALIASES[value]) return LEGACY_ALIASES[value];
  return isThemePreference(value) ? value : "system";
}

/** Every class this module ever adds, so it can clear them all before adding any. */
const ALL_THEME_CLASSES: readonly string[] = [
  "light",
  "dark",
  ...THEMES.map((t) => `theme-${t.id}`),
];

/**
 * The classes for a preference. `system` maps to *none*: bare `:root` is the default light
 * theme and the `prefers-color-scheme` block covers OS dark, so the correct representation of
 * "follow the OS" is the absence of all of them. That is also what makes a first paint with no
 * JavaScript correct.
 *
 * An explicit choice gets two: `theme-<id>` selects the palette, and a bare `light`/`dark`
 * carries the mode. The mode class sets no tokens — it exists so Tailwind's `dark:` variant
 * fires for *any* dark theme without having to know their names.
 */
export function themeClassesFor(preference: ThemePreference): string[] {
  if (preference === "system") return [];
  const theme = getTheme(preference);
  return theme ? [`theme-${theme.id}`, theme.mode] : [];
}

/** Which theme is actually on screen, given the OS preference at this moment. */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ThemeDefinition {
  const chosen = preference === "system" ? undefined : getTheme(preference);
  if (chosen) return chosen;
  const fallbackId = systemPrefersDark ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
  return getTheme(fallbackId) ?? THEMES[0];
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
 * Puts the preference on the root element. Always clears every theme class before adding, so
 * switching between themes never leaves a stale one behind; `classList.remove` on an absent
 * class is a no-op, which is why this is unconditional rather than branched.
 */
export function applyThemePreference(root: ThemeRoot, preference: ThemePreference): void {
  for (const cls of ALL_THEME_CLASSES) root.classList.remove(cls);
  for (const cls of themeClassesFor(preference)) root.classList.add(cls);
}

/**
 * The pre-hydration script, as source text.
 *
 * This runs synchronously while the browser parses <head>, before the first paint, which is
 * the only way to restore a stored choice without a flash of the wrong theme — see
 * node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md. It
 * cannot import from this module (it is a raw string in the HTML), so it necessarily
 * re-implements `applyThemePreference` in miniature.
 *
 * Every list it needs — the class names, the id-to-mode map, the legacy aliases — is
 * generated from THEMES below rather than typed out, so adding a theme cannot leave the
 * script behind. lib/theme.test.ts then evaluates this exact string against a fake document
 * and asserts it agrees with `applyThemePreference` for every theme, so drift fails a test.
 *
 * The try/catch matters: `localStorage` throws on access in Safari private mode and wherever
 * cookies are blocked. Swallowing it leaves the classes untouched, which lands on `system` —
 * the correct fallback, and still flash-free.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var A=${JSON.stringify(LEGACY_ALIASES)};var M=${JSON.stringify(
  Object.fromEntries(THEMES.map((t) => [t.id, t.mode])),
)};var c=document.documentElement.classList;${JSON.stringify(ALL_THEME_CLASSES)}.forEach(function(x){c.remove(x)});if(A[p])p=A[p];if(M[p]){c.add("theme-"+p);c.add(M[p])}}catch(e){}})()`;
