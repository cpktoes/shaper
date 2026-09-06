import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * `vitest.config.ts` runs in a node environment with no DOM and no testing-library, so a React
 * render test is not available here (the real behaviour coverage lives in
 * `lib/geometry/measure-display.test.ts`, which exercises `commitTypedMeasure` directly). This is
 * a source-contract test, in the same idiom as `components/design/slider-row.test.ts`: read the
 * real source, strip comments, and assert the structural properties `MeasureField` must hold.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const MEASURE_FIELD_PATH = join(REPO_ROOT, "components/design/measure-field.tsx");

/** Strips `//` line comments and `/* *\/` block comments, same helper as slider-row.test.ts. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

describe("MeasureField (the one typed measurement box, D-08/D-12)", () => {
  const source = stripComments(readFileSync(MEASURE_FIELD_PATH, "utf8"));

  it("exports MeasureField and MeasureFieldProps", () => {
    expect(source).toMatch(/export function MeasureField\(/);
    expect(source).toMatch(/export interface MeasureFieldProps/);
  });

  it("renders exactly one Input and at most one error div, with a box width that follows the render mode", () => {
    expect(source.match(/<Input\b/g)?.length).toBe(1);
    expect(source.match(/<div\s+id=\{errorId\}/g)?.length).toBe(1);
    // Bare mode (the ROCKER datasheet's in-table cells) — unchanged, byte-identical 64px box.
    expect(source).toContain(
      "h-7 w-16 min-w-16 max-w-16 rounded-md border border-surf-line bg-surf-ground px-1.5 text-right text-sm text-surf-ink",
    );
    // Standalone mode (the three Board Length sites) — widened to a 96px box so the whole value fits.
    expect(source).toContain(
      "h-7 w-24 min-w-24 max-w-24 rounded-md border border-surf-line bg-surf-ground px-1.5 text-right text-sm text-surf-ink",
    );
    expect(source).toContain("mt-0.5 w-24 text-right text-[10px] text-surf-warning-ink");
  });

  it("calls commitTypedMeasure and calls onCommit only when the returned error is null", () => {
    expect(source).toMatch(/commitTypedMeasure\(/);
    expect(source).toMatch(/if\s*\(\s*result\.error\s*===\s*null\s*\)\s*onCommit\(result\.value\)/);
  });

  it("declares none of the three error strings itself", () => {
    // Built from parts so this needle can never match this test file's own prose.
    const needle = ["Couldn", "'", "t read"].join("");
    expect(source).not.toContain(needle);
  });

  it("imports no formatter or parser other than through @/lib/geometry/measure-display", () => {
    expect(source).toMatch(/from\s+["']@\/lib\/geometry\/measure-display["']/);
    // Mm/UnitsSystem are branded types, not formatters or parsers — permitted directly from
    // units.ts, but only as a type-only import (never a value import of a conversion helper).
    const unitsImportMatch = source.match(/import\s+[^;]*\s+from\s+["']@\/lib\/geometry\/units["'];?/);
    if (unitsImportMatch) {
      expect(unitsImportMatch[0]).toMatch(/^import type /);
    }
    expect(source).not.toMatch(/parseMetric|parseImperial|roundToWholeMm|roundToSixteenthInch/);
  });

  it("reads system from its own props, not useUnits()", () => {
    expect(source).not.toMatch(/useUnits\(/);
    expect(source).toMatch(/system:\s*UnitsSystem/);
  });
});
