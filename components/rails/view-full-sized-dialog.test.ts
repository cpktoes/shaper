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

  it("carries no calibration-flow instruction — the check bar is a passive check, not a step", () => {
    const source = readStripped(DIALOG_PATH);
    // "calibrate" (the verb, a real instruction) rather than "calibrat" alone, which would also
    // match this file's own legitimate `formatCalibrationMark` import/call above.
    expect(source, "names a calibration instruction").not.toMatch(/calibrate/i);
    expect(source, "tells a shaper to adjust their zoom").not.toMatch(/adjust (your |the )?(browser )?zoom/i);
  });
});
