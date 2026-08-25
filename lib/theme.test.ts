import { describe, expect, it } from "vitest";
import {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  THEMES,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  applyThemePreference,
  getTheme,
  isThemePreference,
  parseThemePreference,
  resolveTheme,
  themeClassesFor,
} from "./theme";

/** Minimal stand-in for `document.documentElement`, tracking the class set as a Set. */
function fakeRoot(initial: string[] = []) {
  const classes = new Set(initial);
  return {
    classes,
    classList: {
      add: (t: string) => void classes.add(t),
      remove: (t: string) => void classes.delete(t),
    },
  };
}

describe("theme registry", () => {
  it("offers two light themes and two dark ones", () => {
    expect(THEMES.filter((t) => t.mode === "light").map((t) => t.id)).toEqual(["daylight", "chalk"]);
    expect(THEMES.filter((t) => t.mode === "dark").map((t) => t.id)).toEqual(["slate", "phosphor"]);
  });

  it("gives every theme a unique id", () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
  });

  it("names system defaults that actually exist, one per mode", () => {
    // If either of these drifted from globals.css, first paint and the menu would disagree.
    expect(getTheme(DEFAULT_LIGHT_THEME)?.mode).toBe("light");
    expect(getTheme(DEFAULT_DARK_THEME)?.mode).toBe("dark");
  });

  describe("parseThemePreference", () => {
    it("passes through a known theme id", () => {
      expect(parseThemePreference("slate")).toBe("slate");
    });

    it("migrates the two-theme era's stored values instead of dropping them", () => {
      expect(parseThemePreference("light")).toBe(DEFAULT_LIGHT_THEME);
      expect(parseThemePreference("dark")).toBe(DEFAULT_DARK_THEME);
    });

    it("falls back to system for a removed theme, junk, or nothing stored", () => {
      for (const junk of [null, undefined, "", "midnight", "Slate", 0, {}]) {
        expect(parseThemePreference(junk)).toBe("system");
      }
    });
  });

  describe("isThemePreference", () => {
    it("accepts system and every registered id", () => {
      expect(isThemePreference("system")).toBe(true);
      for (const t of THEMES) expect(isThemePreference(t.id)).toBe(true);
    });

    it("rejects the legacy values, which are input but not a preference", () => {
      // They parse (see above) but must not be treated as ids in their own right.
      expect(isThemePreference("light")).toBe(false);
      expect(isThemePreference("dark")).toBe(false);
    });
  });

  describe("themeClassesFor", () => {
    it("maps system to no classes at all", () => {
      // Not a placeholder: bare :root IS the default light theme and the media block covers
      // OS dark, so absence is the correct encoding of "follow the OS".
      expect(themeClassesFor("system")).toEqual([]);
    });

    it("pairs the palette class with a bare mode class", () => {
      // The mode class sets no tokens — it is what lets Tailwind's `dark:` variant fire for
      // any dark theme without knowing its name.
      expect(themeClassesFor("phosphor")).toEqual(["theme-phosphor", "dark"]);
      expect(themeClassesFor("chalk")).toEqual(["theme-chalk", "light"]);
    });

    it("yields nothing for an unknown id rather than inventing a class", () => {
      expect(themeClassesFor("midnight")).toEqual([]);
    });
  });

  describe("resolveTheme", () => {
    it("follows the OS when the preference is system", () => {
      expect(resolveTheme("system", true).id).toBe(DEFAULT_DARK_THEME);
      expect(resolveTheme("system", false).id).toBe(DEFAULT_LIGHT_THEME);
    });

    it("ignores the OS when the preference is explicit, in both directions", () => {
      expect(resolveTheme("chalk", true).id).toBe("chalk");
      expect(resolveTheme("slate", false).id).toBe("slate");
    });

    it("falls back to the OS default if the stored theme no longer exists", () => {
      expect(resolveTheme("midnight", true).id).toBe(DEFAULT_DARK_THEME);
    });
  });

  describe("applyThemePreference", () => {
    it("adds both classes for an explicit theme", () => {
      const root = fakeRoot();
      applyThemePreference(root, "slate");
      expect([...root.classes].sort()).toEqual(["dark", "theme-slate"]);
    });

    it("clears everything for system", () => {
      const root = fakeRoot(["theme-phosphor", "dark"]);
      applyThemePreference(root, "system");
      expect([...root.classes]).toEqual([]);
    });

    it("never leaves another theme's classes behind when switching", () => {
      const root = fakeRoot(["theme-phosphor", "dark"]);
      applyThemePreference(root, "chalk");
      expect([...root.classes].sort()).toEqual(["light", "theme-chalk"]);
    });

    it("leaves unrelated classes alone", () => {
      // The root element also carries next/font variables and layout classes.
      const root = fakeRoot(["h-full", "antialiased"]);
      applyThemePreference(root, "daylight");
      expect([...root.classes]).toEqual(["h-full", "antialiased", "theme-daylight", "light"]);
    });
  });

  /**
   * The pre-hydration script cannot import from theme.ts — it ships as a raw string in the
   * HTML and runs before any bundle. That makes it a second implementation of
   * `applyThemePreference`, and second implementations drift.
   *
   * These run the actual exported string against a fake document and assert it agrees with
   * the module for every registered theme, so adding a theme without regenerating the script
   * fails the suite rather than silently shipping a flash of the wrong one.
   */
  describe("THEME_INIT_SCRIPT", () => {
    function runScript(stored: string | null | (() => never), initial: string[] = ["h-full"]) {
      const root = fakeRoot(initial);
      const localStorage = {
        getItem: (key: string) => {
          if (typeof stored === "function") stored();
          return key === THEME_STORAGE_KEY ? (stored as string | null) : null;
        },
      };
      const document = { documentElement: { classList: root.classList } };
      new Function("localStorage", "document", THEME_INIT_SCRIPT)(localStorage, document);
      return root;
    }

    it.each(THEMES.map((t) => [t.id] as const))(
      "stored %s produces the same classes as the module",
      (id) => {
        const fromScript = runScript(id);
        const fromModule = fakeRoot(["h-full"]);
        applyThemePreference(fromModule, id);
        expect([...fromScript.classes].sort()).toEqual([...fromModule.classes].sort());
      },
    );

    it("agrees with the module on system, and on junk", () => {
      expect([...runScript(null).classes]).toEqual(["h-full"]);
      expect([...runScript("midnight").classes]).toEqual(["h-full"]);
    });

    it("migrates the legacy values exactly as the module does", () => {
      expect([...runScript("dark").classes].sort()).toEqual(["dark", "h-full", `theme-${DEFAULT_DARK_THEME}`].sort());
      expect([...runScript("light").classes].sort()).toEqual(["h-full", "light", `theme-${DEFAULT_LIGHT_THEME}`].sort());
    });

    it("clears a stale theme rather than stacking on the server-rendered markup", () => {
      // Guards the ordering inside the script: it must remove before it adds.
      const root = runScript("chalk", ["theme-phosphor", "dark"]);
      expect([...root.classes].sort()).toEqual(["light", "theme-chalk"]);
    });

    it("survives localStorage throwing", () => {
      // Safari private mode and blocked-cookie contexts throw on access rather than
      // returning null. Swallowing lands on `system`, which is still flash-free.
      expect(() =>
        runScript(() => {
          throw new Error("SecurityError");
        }),
      ).not.toThrow();
    });

    it("carries every registered theme, so a new one cannot be left out", () => {
      for (const t of THEMES) expect(THEME_INIT_SCRIPT).toContain(t.id);
      expect(THEME_INIT_SCRIPT).toContain(JSON.stringify(THEME_STORAGE_KEY));
    });
  });
});
