import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source-contract tests for the "View Full Sized" dialog (08-04 Task 2), in the same idiom
 * `lib/units-isolation.test.ts` already uses: read the real source, strip comments (so this file's
 * own prose can never false-positive an assertion about itself), assert a structural property.
 *
 * D-14's whole point is that the dialog's check bar and the Full Sized Template's scale-check
 * square agree — which only holds if the check bar's caption is composed by calling
 * `formatCalibrationMark` rather than a hand-typed string (RESEARCH.md Pitfall 6), and D-13/D-16
 * hold only if the dialog never invents its own conversion factor, never reads the browser's own
 * device pixel ratio, and never asks a shaper to calibrate anything.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DIALOG_PATH = "components/rails/view-full-sized-dialog.tsx";
const ACTUAL_SIZE_CSS_PATH = "app/design/rails/actual-size.css";
const SIGN_IN_BANNER_PATH = "components/auth/sign-in-banner.tsx";

/** Strips `//` line comments and `/* *\/` block comments — the same helper
 * `lib/units-isolation.test.ts` already copies from `lib/theme.test.ts`. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function readStripped(relativePath: string): string {
  return stripComments(readFileSync(join(REPO_ROOT, relativePath), "utf8"));
}

describe("view-full-sized-dialog.tsx (RAIL-04, D-12–D-16)", () => {
  it("imports formatCalibrationMark from the display boundary", () => {
    const source = readStripped(DIALOG_PATH);
    expect(source, "does not import from lib/geometry/measure-display").toMatch(
      /from\s+["']@\/lib\/geometry\/measure-display["']/,
    );
    expect(source, "does not call formatCalibrationMark").toMatch(/formatCalibrationMark\(/);
  });

  it("names no conversion factor of its own (25.4 or 2.54) — CLAUDE.md Rule 2", () => {
    const source = readStripped(DIALOG_PATH);
    expect(source, "names a raw conversion factor (25.4 or 2.54)").not.toMatch(/25\.4|2\.54/);
  });

  it("never names the browser's device pixel-ratio property", () => {
    const source = readStripped(DIALOG_PATH);
    // Built from parts so this assertion's own text can never match itself.
    const needle = ["device", "PixelRatio"].join("");
    expect(source, `names ${needle}`).not.toContain(needle);
  });

  it("carries the exact caveat sentence from the UI-SPEC Copywriting Contract", () => {
    const source = readStripped(DIALOG_PATH);
    expect(source).toContain("This assumes a standard screen at 100% zoom — check it against the bar below.");
  });

  it("carries the exact print-note sentence from the UI-SPEC Copywriting Contract", () => {
    const source = readStripped(DIALOG_PATH);
    expect(source).toContain(
      "In your print dialog, turn off 'Fit to page' — scaling to fit would break the true size.",
    );
  });

  it("the check bar's own element carries no hand-typed inch-mark or millimetre caption", () => {
    const source = readStripped(DIALOG_PATH);
    const checkBarLines = source.split("\n").filter((line) => line.includes('data-actual-size-box="check-bar"'));
    expect(checkBarLines.length, "no line declares the check bar's own element").toBeGreaterThanOrEqual(1);
    for (const line of checkBarLines) {
      expect(line, `check-bar element line hand-types a caption: "${line.trim()}"`).not.toMatch(/2"|50\.8|\bmm\b/);
    }
  });

  /** Locates the check bar's own element block — from its `<svg` open tag carrying
   * `data-actual-size-box="check-bar"` to the following `</svg>` — so the cases below can each
   * assert one structural property of it without repeating the search. */
  function checkBarSvgSlice(source: string): string {
    const openIndex = source.indexOf("<svg");
    let searchFrom = openIndex;
    while (searchFrom >= 0) {
      const nextOpen = source.indexOf("<svg", searchFrom);
      if (nextOpen === -1) break;
      const nextCloseSvg = source.indexOf("</svg>", nextOpen);
      const candidate = source.slice(nextOpen, nextCloseSvg + "</svg>".length);
      if (candidate.includes('data-actual-size-box="check-bar"')) {
        return candidate;
      }
      searchFrom = nextOpen + 1;
    }
    return "";
  }

  it("draws the check bar as an svg rect with foreground fill ink, not a painted background (the shaper's 2026-09-08 print report)", () => {
    const source = readStripped(DIALOG_PATH);
    const slice = checkBarSvgSlice(source);
    expect(slice, "no <svg data-actual-size-box=\"check-bar\"> block found").not.toBe("");
    expect(slice, "check-bar svg has no <rect").toMatch(/<rect\b/);
    expect(slice, "check-bar rect has no fill= attribute").toMatch(/<rect\b[^>]*\bfill=/);
    // Built from parts so a future edit cannot quietly reintroduce a background-colour utility
    // class on the check bar and still satisfy this by accident.
    const bgClassNeedle = ["b", "g"].join("") + "-";
    expect(slice, `check-bar block still names a background-colour utility class (${bgClassNeedle})`).not.toMatch(
      new RegExp(`\\b${bgClassNeedle}`),
    );
  });

  it("derives the check bar's printed width from CHECK_BAR_MM with no viewBox to insert a scale factor", () => {
    const source = readStripped(DIALOG_PATH);
    const slice = checkBarSvgSlice(source);
    expect(slice, "check-bar svg carries a viewBox — this would insert a scale factor").not.toMatch(/viewBox/);
    expect(slice, "check-bar block does not carry --vfs-w-in").toContain("--vfs-w-in");
    expect(source, "CHECK_BAR_MM is not derived with inchesToMm(2)").toMatch(/CHECK_BAR_MM[\s\S]{0,40}inchesToMm\(2\)/);
    expect(source, "checkBarWidthIn is not derived with mmToInches(CHECK_BAR_MM)").toMatch(
      /checkBarWidthIn[\s\S]{0,40}mmToInches\(CHECK_BAR_MM\)/,
    );
  });

  it("carries no calibration-flow instruction — the check bar is a passive check, not a step", () => {
    const source = readStripped(DIALOG_PATH);
    // "calibrate" (the verb, a real instruction) rather than "calibrat" alone, which would also
    // match this file's own legitimate `formatCalibrationMark` import/call above.
    expect(source, "names a calibration instruction").not.toMatch(/calibrate/i);
    expect(source, "tells a shaper to adjust their zoom").not.toMatch(/adjust (your |the )?(browser )?zoom/i);
  });

  it("sets its measured px-per-inch from a ref callback, never from an effect", () => {
    const source = readStripped(DIALOG_PATH);
    const setterCall = "setPxPerInch(measurePxPerInch())";
    const setterIndex = source.indexOf(setterCall);
    expect(setterIndex, `does not call ${setterCall}`).toBeGreaterThanOrEqual(0);
    const before = source.slice(0, setterIndex);
    const hookCalls = before.match(/\buse[A-Z]\w*\(/g) ?? [];
    expect(hookCalls.length, "no React hook call precedes the setter").toBeGreaterThan(0);
    expect(hookCalls[hookCalls.length - 1], "the setter's nearest enclosing hook is not useCallback(").toBe(
      "useCallback(",
    );
    // Built from parts so this assertion's own text can never match itself.
    const needle = ["use", "Effect("].join("");
    expect(source, `still names ${needle}`).not.toContain(needle);
  });

  it("measures the screen with a live one-inch probe (D-13)", () => {
    const source = readStripped(DIALOG_PATH);
    expect(source, "no longer measures a live 1in probe").toMatch(/width:\s*1in/);
    expect(source, "no longer creates the probe element").toContain("document.createElement(");
  });

  it("hides the rails screen from print only while the dialog is open (WR-01)", () => {
    const css = readStripped(ACTUAL_SIZE_CSS_PATH);
    expect(css, "does not scope [data-print-hide] to the dialog being present").toContain(
      'body:has([data-view-full-sized-dialog]) [data-print-hide]',
    );
    const printHideLines = css.split("\n").filter((line) => line.includes("[data-print-hide]"));
    expect(printHideLines.length, "no line names [data-print-hide]").toBeGreaterThanOrEqual(1);
    for (const line of printHideLines) {
      expect(line, `[data-print-hide] rule is not guarded on the dialog being open: "${line.trim()}"`).toContain(
        ":has([data-view-full-sized-dialog])",
      );
    }
  });

  it("prints the rail's name — the DialogHeader carrying the title is not print-hidden (the shaper's 2026-09-08 print report)", () => {
    const source = readStripped(DIALOG_PATH);
    const headerIndex = source.indexOf("<DialogHeader");
    const titleIndex = source.indexOf("Rail — Actual Size");
    expect(headerIndex, "no <DialogHeader carrying the title found").toBeGreaterThanOrEqual(0);
    expect(titleIndex, "no title text found").toBeGreaterThan(headerIndex);
    const headerToTitle = source.slice(headerIndex, titleIndex);
    // Same attribute name the WR-01 case above asserts about the stylesheet: the stylesheet
    // still hides chrome, and this header is no longer chrome.
    expect(headerToTitle, "the title's own DialogHeader is still print-hidden").not.toContain("data-print-hide");
  });

  it("still hides the footer's print note and Print button from paper (companion to the header no longer being hidden)", () => {
    const source = readStripped(DIALOG_PATH);
    const footerIndex = source.indexOf("<DialogFooter");
    expect(footerIndex, "no <DialogFooter found").toBeGreaterThanOrEqual(0);
    const footerLine = source.slice(footerIndex, source.indexOf(">", footerIndex) + 1);
    expect(footerLine, "DialogFooter no longer carries data-print-hide").toContain("data-print-hide");
  });

  it("composes the printed title from SECTION_TITLE[activeSection], appearing exactly once in the source", () => {
    const source = readStripped(DIALOG_PATH);
    expect(source, "does not interpolate SECTION_TITLE[activeSection] into the title").toContain(
      "{SECTION_TITLE[activeSection]} Rail — Actual Size",
    );
    const occurrences = source.split("Rail — Actual Size").length - 1;
    expect(occurrences, "the words 'Rail — Actual Size' appear more than once — risk of drift").toBe(1);
  });

  it("resets the CSS translate property for print from its own verbatim style element, not the stylesheet (G-08-5)", () => {
    // Tailwind v4 compiles the dialog's centring classes to `translate`, not `transform` — a
    // future edit that keeps only `transform: none` silently reintroduces the off-page offset.
    // And the reset cannot live in actual-size.css: the CSS pipeline that compiles it (Lightning
    // CSS) folds `translate: none` into `transform: translate(0, 0)`, so the browser never sees
    // it — measured on both the dev and the production stylesheet. Only a raw style element
    // rendered by the component reaches the browser untouched.
    const source = readStripped(DIALOG_PATH);
    const printReset =
      /@media print\s*\{\s*\[data-view-full-sized-dialog\]\s*\{\s*translate:\s*none\s*!important;?\s*\}\s*\}/;
    expect(source, "does not carry the print-scoped translate reset in its own style element").toMatch(
      printReset,
    );
    const css = readStripped(ACTUAL_SIZE_CSS_PATH);
    expect(css, "declares `translate` in actual-size.css, where the CSS pipeline folds it away").not.toMatch(
      /^\s*translate\s*:/m,
    );
  });

  it("names an @page rule asking for landscape, so the true-size rail prints unshrunk (G-08-5)", () => {
    const source = readStripped(DIALOG_PATH);
    expect(source, "does not declare an @page rule").toMatch(/@page/);
    expect(source, "does not ask for a landscape page").toMatch(/landscape/);
  });

  it("declares no @page rule of its own, so the landscape page can never leak to a plain rails print (WR-01)", () => {
    const css = readStripped(ACTUAL_SIZE_CSS_PATH);
    expect(css, "declares an @page rule in the route-wide stylesheet — this would leak landscape to every rails print").not.toMatch(
      /@page/,
    );
  });

  it("the sign-in banner carries data-print-hide, so a signed-out print carries no account nudge (G-08-5, D-15)", () => {
    const source = readStripped(SIGN_IN_BANNER_PATH);
    expect(source, "does not carry data-print-hide on the banner").toMatch(/data-print-hide/);
  });
});
