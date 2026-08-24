import { describe, expect, it } from "vitest";
import {
  THEME_INIT_SCRIPT,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  applyThemePreference,
  isThemePreference,
  parseThemePreference,
  resolveTheme,
  themeClassFor,
  type ThemePreference,
} from "./theme";

/** Minimal stand-in for `document.documentElement`, tracking the class set as a Set. */
function fakeRoot(initial: string[] = []) {
  const classes = new Set(initial);
  return {
    classes,
    classList: {
      add: (t: string) => void classes.add(t),
      remove: (t: string) => void classes.delete(t),
      contains: (t: string) => classes.has(t),
    },
  };
}

describe("theme preference boundary", () => {
  it("offers system, light and dark in menu order", () => {
    expect(THEME_PREFERENCES).toEqual(["system", "light", "dark"]);
  });

  describe("isThemePreference", () => {
    it("accepts the three preferences", () => {
      expect(isThemePreference("system")).toBe(true);
      expect(isThemePreference("light")).toBe(true);
      expect(isThemePreference("dark")).toBe(true);
    });

    it("rejects anything else", () => {
      for (const junk of [null, undefined, "", "Dark", "auto", 0, {}]) {
        expect(isThemePreference(junk)).toBe(false);
      }
    });
  });

  describe("parseThemePreference", () => {
    it("passes through a valid stored value", () => {
      expect(parseThemePreference("dark")).toBe("dark");
    });

    it("falls back to system for a missing or stale value", () => {
      // A key written by an older build, a hand-edited entry, or nothing stored at all.
      expect(parseThemePreference(null)).toBe("system");
      expect(parseThemePreference("midnight")).toBe("system");
    });
  });

  describe("themeClassFor", () => {
    it("maps system to no class at all", () => {
      // Not a placeholder class: bare `:root` IS the light theme and the prefers-color-scheme
      // block handles OS dark, so absence is the correct encoding of "follow the OS".
      expect(themeClassFor("system")).toBeNull();
    });

    it("maps explicit preferences to their class", () => {
      expect(themeClassFor("light")).toBe("light");
      expect(themeClassFor("dark")).toBe("dark");
    });
  });

  describe("resolveTheme", () => {
    it("follows the OS when the preference is system", () => {
      expect(resolveTheme("system", true)).toBe("dark");
      expect(resolveTheme("system", false)).toBe("light");
    });

    it("ignores the OS when the preference is explicit", () => {
      expect(resolveTheme("light", true)).toBe("light");
      expect(resolveTheme("dark", false)).toBe("dark");
    });
  });

  describe("applyThemePreference", () => {
    it("adds the class for an explicit preference", () => {
      const root = fakeRoot();
      applyThemePreference(root, "dark");
      expect([...root.classes]).toEqual(["dark"]);
    });

    it("clears both classes for system", () => {
      const root = fakeRoot(["dark"]);
      applyThemePreference(root, "system");
      expect([...root.classes]).toEqual([]);
    });

    it("never leaves the opposite class behind when switching", () => {
      const root = fakeRoot(["light"]);
      applyThemePreference(root, "dark");
      expect([...root.classes]).toEqual(["dark"]);
    });

    it("leaves unrelated classes alone", () => {
      // The root element also carries next/font variables and layout classes.
      const root = fakeRoot(["h-full", "antialiased"]);
      applyThemePreference(root, "dark");
      expect([...root.classes]).toEqual(["h-full", "antialiased", "dark"]);
    });
  });

  /**
   * The pre-hydration script cannot import from theme.ts — it ships as a raw string in the
   * HTML and runs before any bundle. That makes it a second implementation of
   * `applyThemePreference`, and second implementations drift.
   *
   * These tests run the actual exported string against a fake document and localStorage and
   * assert it agrees with the module for every input, so drift fails the suite rather than
   * silently shipping a flash of the wrong theme.
   */
  describe("THEME_INIT_SCRIPT", () => {
    function runScript(stored: string | null | (() => never)) {
      const root = fakeRoot(["h-full"]);
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

    it.each<[ThemePreference | null, ThemePreference]>([
      ["dark", "dark"],
      ["light", "light"],
      ["system", "system"],
      [null, "system"],
    ])("stored %s produces the same classes as the module", (stored, equivalent) => {
      const fromScript = runScript(stored);
      const fromModule = fakeRoot(["h-full"]);
      applyThemePreference(fromModule, equivalent);
      expect([...fromScript.classes]).toEqual([...fromModule.classes]);
    });

    it("falls back to system on an unrecognised stored value", () => {
      expect([...runScript("midnight").classes]).toEqual(["h-full"]);
    });

    it("clears a stale class rather than leaving it on the server-rendered markup", () => {
      // Guards the ordering inside the script: it must remove before it adds.
      const root = fakeRoot(["light"]);
      const localStorage = { getItem: () => "dark" };
      const document = { documentElement: { classList: root.classList } };
      new Function("localStorage", "document", THEME_INIT_SCRIPT)(localStorage, document);
      expect([...root.classes]).toEqual(["dark"]);
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

    it("references the same storage key the provider writes", () => {
      expect(THEME_INIT_SCRIPT).toContain(JSON.stringify(THEME_STORAGE_KEY));
    });
  });
});
