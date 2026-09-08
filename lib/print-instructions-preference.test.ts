import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRINT_RAIL_INSTRUCTIONS,
  PRINT_RAIL_INSTRUCTIONS_COOKIE_MAX_AGE_SECONDS,
  PRINT_RAIL_INSTRUCTIONS_COOKIE_NAME,
  PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY,
  decidePrintRailInstructionsHandoff,
  parsePrintRailInstructionsPreference,
  printRailInstructionsCookieString,
  readPrintRailInstructionsCookie,
} from "./print-instructions-preference";

describe("print-instructions preference boundary", () => {
  it("exposes the storage key and cookie name as shaper-print-rail-instructions", () => {
    expect(PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY).toBe("shaper-print-rail-instructions");
    expect(PRINT_RAIL_INSTRUCTIONS_COOKIE_NAME).toBe("shaper-print-rail-instructions");
  });

  it("defaults to unticked (D-05)", () => {
    expect(DEFAULT_PRINT_RAIL_INSTRUCTIONS).toBe(false);
  });

  describe("parsePrintRailInstructionsPreference", () => {
    it("passes through the two real booleans", () => {
      expect(parsePrintRailInstructionsPreference(true)).toBe(true);
      expect(parsePrintRailInstructionsPreference(false)).toBe(false);
    });

    it("passes through the two literal strings 'true' and 'false'", () => {
      expect(parsePrintRailInstructionsPreference("true")).toBe(true);
      expect(parsePrintRailInstructionsPreference("false")).toBe(false);
    });

    it("returns null — never a default — for anything unrecognised or absent", () => {
      for (const junk of ["1", "yes", "", null, undefined, 1, {}]) {
        expect(parsePrintRailInstructionsPreference(junk)).toBeNull();
      }
    });

    it("distinguishes an explicit 'false' from absence — both must not collapse to the same state", () => {
      expect(parsePrintRailInstructionsPreference("false")).toBe(false);
      expect(parsePrintRailInstructionsPreference(undefined)).toBeNull();
      expect(parsePrintRailInstructionsPreference("false")).not.toBeNull();
    });
  });

  describe("readPrintRailInstructionsCookie", () => {
    it("finds the print-instructions cookie among others", () => {
      expect(
        readPrintRailInstructionsCookie("shaper-units=metric; shaper-print-rail-instructions=true; other=1"),
      ).toBe(true);
    });

    it("returns null for an empty or missing cookie header", () => {
      expect(readPrintRailInstructionsCookie("")).toBeNull();
      expect(readPrintRailInstructionsCookie(null)).toBeNull();
      expect(readPrintRailInstructionsCookie(undefined)).toBeNull();
    });

    it("returns null for a cookie carrying a junk value", () => {
      expect(readPrintRailInstructionsCookie("shaper-print-rail-instructions=bogus")).toBeNull();
    });
  });

  describe("printRailInstructionsCookieString", () => {
    it("carries the cookie name, value, Path, Max-Age and SameSite", () => {
      const cookie = printRailInstructionsCookieString(true);
      expect(cookie).toContain("shaper-print-rail-instructions=true");
      expect(cookie).toContain("Path=/");
      expect(cookie).toContain(`Max-Age=${PRINT_RAIL_INSTRUCTIONS_COOKIE_MAX_AGE_SECONDS}`);
      expect(cookie).toContain("SameSite=Lax");
      expect(PRINT_RAIL_INSTRUCTIONS_COOKIE_MAX_AGE_SECONDS).toBe(31_536_000);
    });
  });

  describe("decidePrintRailInstructionsHandoff", () => {
    it("signed out with a browser value: that value, nothing adopted, nothing promoted", () => {
      expect(decidePrintRailInstructionsHandoff({ signedIn: false, account: null, browser: true })).toEqual({
        included: true,
        adoptIntoBrowser: null,
        promoteToAccount: null,
      });
    });

    it("signed out with no browser value: unticked, nothing adopted, nothing promoted", () => {
      expect(decidePrintRailInstructionsHandoff({ signedIn: false, account: null, browser: null })).toEqual({
        included: false,
        adoptIntoBrowser: null,
        promoteToAccount: null,
      });
    });

    it("signed in with an account value: the account's value, adopted into the browser, nothing promoted", () => {
      // Browser holds nothing.
      expect(decidePrintRailInstructionsHandoff({ signedIn: true, account: true, browser: null })).toEqual({
        included: true,
        adoptIntoBrowser: true,
        promoteToAccount: null,
      });
      // Browser holds a DIFFERENT explicit value — the account still wins outright.
      expect(decidePrintRailInstructionsHandoff({ signedIn: true, account: false, browser: true })).toEqual({
        included: false,
        adoptIntoBrowser: false,
        promoteToAccount: null,
      });
    });

    it("signed in with no account value but an explicit browser value: the browser's value, nothing adopted, promoted to the account", () => {
      expect(decidePrintRailInstructionsHandoff({ signedIn: true, account: null, browser: true })).toEqual({
        included: true,
        adoptIntoBrowser: null,
        promoteToAccount: true,
      });
    });

    it("signed in with neither: unticked, nothing adopted, nothing promoted — a default nobody chose is never written", () => {
      expect(decidePrintRailInstructionsHandoff({ signedIn: true, account: null, browser: null })).toEqual({
        included: false,
        adoptIntoBrowser: null,
        promoteToAccount: null,
      });
    });

    it("promoteToAccount is never non-null when account is non-null", () => {
      const result = decidePrintRailInstructionsHandoff({ signedIn: true, account: false, browser: true });
      expect(result.promoteToAccount).toBeNull();
    });
  });
});
