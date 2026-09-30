import { describe, expect, it } from "vitest";
import { ERROR_COPY, NOT_FOUND_COPY, errorReference } from "./copy";

/**
 * TDD RED for quick 260930-fjm, Task 2: the error-screen and not-found words, approved by the
 * founder as written (F-4) and pinned exactly so a future edit can't drift from what was shown
 * and approved.
 */

describe("ERROR_COPY", () => {
  it("holds every approved word, exactly", () => {
    expect(ERROR_COPY.heading).toBe("Something went wrong");
    expect(ERROR_COPY.lead).toBe(
      "This screen ran into a problem and couldn't finish loading. Your saved boards are safe.",
    );
    expect(ERROR_COPY.hint).toBe(
      "Try again — it often clears on its own. If it keeps happening, tell us what you were doing and we'll look into it.",
    );
    expect(ERROR_COPY.tryAgain).toBe("Try again");
    expect(ERROR_COPY.home).toBe("Home screen");
    expect(ERROR_COPY.contact).toBe("Tell us what happened");
    expect(ERROR_COPY.referenceLead).toBe("If you write to us, include this reference:");
    expect(ERROR_COPY.documentTitle).toBe("Something went wrong — Shaper Assistant");
  });
});

describe("NOT_FOUND_COPY", () => {
  it("holds every approved word, exactly", () => {
    expect(NOT_FOUND_COPY.pageTitle).toBe("Page not found — Shaper Assistant");
    expect(NOT_FOUND_COPY.heading).toBe("We couldn't find that page");
    expect(NOT_FOUND_COPY.lead).toBe("The address may be mistyped, or the page may have moved.");
    expect(NOT_FOUND_COPY.hint).toBe(
      "Head back to the home screen, or tell us about the link that brought you here.",
    );
    expect(NOT_FOUND_COPY.home).toBe("Home screen");
    expect(NOT_FOUND_COPY.contact).toBe("Tell us about a broken link");
  });
});

describe("errorReference", () => {
  it("is null for undefined, empty, and blank", () => {
    expect(errorReference(undefined)).toBeNull();
    expect(errorReference("")).toBeNull();
    expect(errorReference("   ")).toBeNull();
  });

  it("trims a real digest", () => {
    expect(errorReference(" 1603484608 ")).toBe("1603484608");
  });
});

describe("no jargon in the copy", () => {
  const JARGON = ["404", "500", "digest", "exception", "stack", "null"];

  it("ERROR_COPY has no jargon words", () => {
    const strings = Object.values(ERROR_COPY);
    for (const jargon of JARGON) {
      for (const s of strings) {
        expect(s.toLowerCase()).not.toContain(jargon);
      }
    }
  });

  it("NOT_FOUND_COPY has no jargon words", () => {
    const strings = Object.values(NOT_FOUND_COPY);
    for (const jargon of JARGON) {
      for (const s of strings) {
        expect(s.toLowerCase()).not.toContain(jargon);
      }
    }
  });
});
