import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source-contract tests for the plan/side figure's new line key (quick 260910-jfp, PRNT-05) — the
 * same read-the-real-file-strip-comments-assert-structure idiom `rail-instructions-sheet.test.ts`
 * already uses, extended to this file. Vitest is node-environment: no DOM, no React rendering, so
 * every case below proves a property of the SOURCE rather than of a rendered tree — a doc comment
 * that happens to mention a number or a name can never false-positive an assertion, because every
 * assertion here reads the comment-stripped source.
 *
 * Deliberately does NOT import `rail-plan-side-figure.tsx` as a module (unlike a `lib/geometry/`
 * pure-function test): it is a `"use client"` component whose import chain reaches
 * `components/units-provider.tsx` -> `app/actions/units.ts` -> `lib/db/client.ts`, which throws at
 * import time without a live `DATABASE_URL`. So the derived-threshold check below recomputes the
 * same arithmetic the source itself performs, from numbers extracted out of the comment-stripped
 * text — the same "parse the text, recompute, compare" idiom `order-form-print.test.ts`'s own
 * `parseAspectRatio` already establishes for a different two-number contract.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

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

function extractNumber(source: string, name: string): number {
  const match = source.match(new RegExp(`const ${name}\\s*=\\s*([\\d.]+)`));
  expect(match, `expected a numeric const ${name} in the source`).not.toBeNull();
  return Number(match![1]);
}

function extractFigureColumns(source: string): { plan: number; label: number; side: number; note: number } {
  const match = source.match(/const FIGURE_COLUMNS\s*=\s*\{([^}]+)\}/);
  expect(match, "expected a FIGURE_COLUMNS object literal").not.toBeNull();
  const body = match![1];
  const get = (key: string) => {
    const m = body.match(new RegExp(`${key}\\s*:\\s*([\\d.]+)`));
    expect(m, `expected ${key} in FIGURE_COLUMNS`).not.toBeNull();
    return Number(m![1]);
  };
  return { plan: get("plan"), label: get("label"), side: get("side"), note: get("note") };
}

const FIGURE_PATH = "components/rails/rail-plan-side-figure.tsx";

describe("RailPlanSideFigure's line key (quick 260910-jfp)", () => {
  const source = readStripped(FIGURE_PATH);

  it("the derived threshold and the literal Tailwind class agree", () => {
    const figureHeight = extractNumber(source, "FIGURE_HEIGHT");
    const figureGap = extractNumber(source, "FIGURE_GAP");
    const figureMaxRenderedHeight = extractNumber(source, "FIGURE_MAX_RENDERED_HEIGHT");
    const columns = extractFigureColumns(source);
    const figureContentWidth = columns.plan + columns.label + columns.side + columns.note + figureGap * 3;
    const figureMaxRenderedWidth = (figureMaxRenderedHeight * figureContentWidth) / figureHeight;

    const keyGapPx = extractNumber(source, "KEY_GAP_PX");
    const keyMinColumnPx = extractNumber(source, "KEY_MIN_COLUMN_PX");
    const expectedThreshold = Math.ceil(figureMaxRenderedWidth + keyGapPx + keyMinColumnPx);

    expect(expectedThreshold).toBe(486);
    expect(source).toContain(`@min-[${expectedThreshold}px]/rail-key:block`);
  });

  it("the threshold is computed with Math.ceil from the three named constants, never typed as a bare 486", () => {
    expect(source).toMatch(
      /KEY_ROW_MIN_WIDTH_PX\s*=\s*Math\.ceil\(\s*FIGURE_MAX_RENDERED_WIDTH\s*\+\s*KEY_GAP_PX\s*\+\s*KEY_MIN_COLUMN_PX\s*\)/,
    );
    const withoutClassLiteral = source.replace(/@min-\[486px\]\/rail-key:block/g, "");
    expect(withoutClassLiteral).not.toMatch(/\b486\b/);
  });

  it("the key's type size is derived from the same two constants the station labels use", () => {
    expect(source).toContain("FIGURE_MAX_RENDERED_WIDTH * (LABEL_FONT_CQW / 100)");
  });

  it("the clamp() percentage coefficient appears exactly once in the whole file, on LABEL_FONT_CQW's own declaration", () => {
    const matches = source.match(/3\.2/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("RAIL_REFERENCE_LEGEND's nine entries carry no hex literal of their own", () => {
    const legendBlock = source.match(/RAIL_REFERENCE_LEGEND[\s\S]*?\n\];/);
    expect(legendBlock).not.toBeNull();
    expect(legendBlock![0]).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });

  it("refPathElements strokes every path with REF_GROUP_SCREEN_COLORS, on paper as much as on screen", () => {
    expect(source).toMatch(/stroke=\{REF_GROUP_SCREEN_COLORS\[p\.group\]\}/);
  });

  it("the key's swatch takes entry.color — the same field the legend itself reads", () => {
    expect(source).toMatch(/RailLegendSwatch\s+color=\{entry\.color\}/);
  });

  it("the key lists only the lines the shaper left ticked", () => {
    expect(source).toMatch(/RAIL_REFERENCE_LEGEND\.filter\(\(e\)\s*=>\s*visibleGroups\.has\(e\.key\)\)/);
  });

  it("the key is a key, not a control — no Checkbox, no touch target, no toggle handler", () => {
    expect(source).not.toMatch(/Checkbox/);
    expect(source).not.toMatch(/coarse:min-h-11/);
    expect(source).not.toMatch(/onCheckedChange/);
    expect(source).not.toMatch(/toggleGroup/);
  });

  it("showLineKey is opt-in, defaulting to false", () => {
    expect(source).toMatch(/showLineKey\s*=\s*false/);
  });

  it("the row keeps justify-center, so the drawing re-centres when the key is absent", () => {
    expect(source).toMatch(/justify-center/);
  });
});
