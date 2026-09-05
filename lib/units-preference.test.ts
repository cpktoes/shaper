import { describe, expect, it } from "vitest";
import {
  DEFAULT_UNITS_SYSTEM,
  UNITS_COOKIE_MAX_AGE_SECONDS,
  UNITS_COOKIE_NAME,
  UNITS_STORAGE_KEY,
  UNITS_WRITE_RETRY_DELAYS_MS,
  decideUnitsHandoff,
  nextUnitsWriteRetryDelayMs,
  parseUnitsPreference,
  readUnitsCookie,
  resolveUnitsSystem,
  unitsCookieString,
} from "./units-preference";

describe("units preference boundary", () => {
  it("exposes the storage key and cookie name as shaper-units", () => {
    expect(UNITS_STORAGE_KEY).toBe("shaper-units");
    expect(UNITS_COOKIE_NAME).toBe("shaper-units");
  });

  it("defaults to imperial", () => {
    expect(DEFAULT_UNITS_SYSTEM).toBe("imperial");
  });

  describe("parseUnitsPreference", () => {
    it("passes through the two known systems", () => {
      expect(parseUnitsPreference("imperial")).toBe("imperial");
      expect(parseUnitsPreference("metric")).toBe("metric");
    });

    it("returns null — never a default — for anything unrecognised or absent", () => {
      for (const junk of [null, undefined, "", "IMPERIAL", "inches", 123, {}]) {
        expect(parseUnitsPreference(junk)).toBeNull();
      }
    });
  });

  describe("resolveUnitsSystem", () => {
    it("resolves no preference to imperial", () => {
      expect(resolveUnitsSystem(null)).toBe("imperial");
    });

    it("resolves an explicit preference to itself", () => {
      expect(resolveUnitsSystem("metric")).toBe("metric");
    });
  });

  describe("readUnitsCookie", () => {
    it("finds the units cookie among others", () => {
      expect(readUnitsCookie("shaper-theme=slate; shaper-units=metric; other=1")).toBe("metric");
    });

    it("returns null for an empty or missing cookie header", () => {
      expect(readUnitsCookie("")).toBeNull();
      expect(readUnitsCookie(null)).toBeNull();
      expect(readUnitsCookie(undefined)).toBeNull();
    });

    it("returns null for a cookie carrying a junk value", () => {
      expect(readUnitsCookie("shaper-units=bogus")).toBeNull();
    });
  });

  describe("unitsCookieString", () => {
    it("carries the cookie name, value, Path, Max-Age and SameSite", () => {
      const cookie = unitsCookieString("metric");
      expect(cookie).toContain("shaper-units=metric");
      expect(cookie).toContain("Path=/");
      expect(cookie).toContain(`Max-Age=${UNITS_COOKIE_MAX_AGE_SECONDS}`);
      expect(cookie).toContain("SameSite=Lax");
      expect(UNITS_COOKIE_MAX_AGE_SECONDS).toBe(31_536_000);
    });
  });

  describe("decideUnitsHandoff", () => {
    it("signed out with a browser value: that system, nothing adopted, nothing promoted", () => {
      expect(decideUnitsHandoff({ signedIn: false, account: null, browser: "metric" })).toEqual({
        system: "metric",
        adoptIntoBrowser: null,
        promoteToAccount: null,
      });
    });

    it("signed out with no browser value: Imperial, nothing adopted, nothing promoted", () => {
      expect(decideUnitsHandoff({ signedIn: false, account: null, browser: null })).toEqual({
        system: "imperial",
        adoptIntoBrowser: null,
        promoteToAccount: null,
      });
    });

    it("signed in with an account value: the account's system, adopted into the browser, nothing promoted", () => {
      // Browser holds nothing.
      expect(decideUnitsHandoff({ signedIn: true, account: "metric", browser: null })).toEqual({
        system: "metric",
        adoptIntoBrowser: "metric",
        promoteToAccount: null,
      });
      // Browser holds a DIFFERENT explicit value — the account still wins outright.
      expect(decideUnitsHandoff({ signedIn: true, account: "metric", browser: "imperial" })).toEqual({
        system: "metric",
        adoptIntoBrowser: "metric",
        promoteToAccount: null,
      });
    });

    it("signed in with no account value but an explicit browser value: the browser's system, nothing adopted, promoted to the account", () => {
      expect(decideUnitsHandoff({ signedIn: true, account: null, browser: "metric" })).toEqual({
        system: "metric",
        adoptIntoBrowser: null,
        promoteToAccount: "metric",
      });
    });

    it("signed in with neither: Imperial, nothing adopted, nothing promoted — a default nobody chose is never written", () => {
      expect(decideUnitsHandoff({ signedIn: true, account: null, browser: null })).toEqual({
        system: "imperial",
        adoptIntoBrowser: null,
        promoteToAccount: null,
      });
    });

    it("promoteToAccount is never non-null when account is non-null", () => {
      const result = decideUnitsHandoff({ signedIn: true, account: "imperial", browser: "metric" });
      expect(result.promoteToAccount).toBeNull();
    });
  });

  describe("UNITS_WRITE_RETRY_DELAYS_MS / nextUnitsWriteRetryDelayMs", () => {
    it("the ladder is non-empty and strictly increasing", () => {
      expect(UNITS_WRITE_RETRY_DELAYS_MS.length).toBeGreaterThan(0);
      for (let i = 1; i < UNITS_WRITE_RETRY_DELAYS_MS.length; i++) {
        expect(UNITS_WRITE_RETRY_DELAYS_MS[i]).toBeGreaterThan(UNITS_WRITE_RETRY_DELAYS_MS[i - 1]);
      }
    });

    it("returns the first, second and third rungs for attempts 0, 1 and 2", () => {
      expect(nextUnitsWriteRetryDelayMs(0)).toBe(UNITS_WRITE_RETRY_DELAYS_MS[0]);
      expect(nextUnitsWriteRetryDelayMs(1)).toBe(UNITS_WRITE_RETRY_DELAYS_MS[1]);
      expect(nextUnitsWriteRetryDelayMs(2)).toBe(UNITS_WRITE_RETRY_DELAYS_MS[2]);
    });

    it("returns null once the ladder is exhausted — the write gives up quietly rather than retrying forever", () => {
      expect(nextUnitsWriteRetryDelayMs(UNITS_WRITE_RETRY_DELAYS_MS.length)).toBeNull();
    });

    it("returns the first delay for a negative attempt — a defensive floor, not a throw", () => {
      expect(nextUnitsWriteRetryDelayMs(-1)).toBe(UNITS_WRITE_RETRY_DELAYS_MS[0]);
    });
  });
});
