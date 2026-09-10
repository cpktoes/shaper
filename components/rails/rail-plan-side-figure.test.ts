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

/**
 * Source-contract tests for the figure's new `fit` prop (quick 260910-kz2, PRNT-05) — proving,
 * before any source change, that the printed Rail Band Instructions sheet has no way to ask this
 * figure to fit a BOX rather than only a width, which is the root cause of the sheet quietly
 * clipping its own example rail drawing on a narrow page. Every case below FAILS today: the `fit`
 * prop, `FIGURE_CARD_CHROME_PX` and `FIGURE_MAX_CARD_HEIGHT_PX` do not exist yet, and the drawing
 * box has exactly one way to size itself (its width, from a fixed flex-basis).
 */
describe("RailPlanSideFigure's height-driven fit (quick 260910-kz2)", () => {
  const source = readStripped(FIGURE_PATH);

  it("the card's chrome constant is derived, in the source, from two named factors that agree with the card's own Tailwind classes (p-3.5 twice, border twice)", () => {
    const paddingMatch = source.match(/const FIGURE_CARD_PADDING_PX\s*=\s*([\d.]+)/);
    expect(paddingMatch, "expected a numeric const FIGURE_CARD_PADDING_PX in the source").not.toBeNull();
    expect(Number(paddingMatch![1])).toBe(14);

    const borderMatch = source.match(/const FIGURE_CARD_BORDER_PX\s*=\s*([\d.]+)/);
    expect(borderMatch, "expected a numeric const FIGURE_CARD_BORDER_PX in the source").not.toBeNull();
    expect(Number(borderMatch![1])).toBe(1);

    expect(source).toMatch(
      /const FIGURE_CARD_CHROME_PX\s*=\s*FIGURE_CARD_PADDING_PX\s*\*\s*2\s*\+\s*FIGURE_CARD_BORDER_PX\s*\*\s*2/,
    );
    expect(source).toMatch(/p-3\.5/);
    expect(source).toContain("border border-surf-line-faint");
  });

  it("FIGURE_MAX_CARD_HEIGHT_PX is exported and composed from FIGURE_MAX_RENDERED_HEIGHT and the chrome constant, not typed as a literal", () => {
    expect(source).toMatch(
      /export const FIGURE_MAX_CARD_HEIGHT_PX\s*=\s*FIGURE_MAX_RENDERED_HEIGHT\s*\+\s*FIGURE_CARD_CHROME_PX/,
    );
  });

  it("the figure takes a fit prop whose default is the width-driven mode, so a caller that passes nothing gets today's behaviour", () => {
    expect(source).toMatch(/fit\s*=\s*"width"/);
    expect(source).toMatch(/fit\?:\s*"width"\s*\|\s*"height"/);
  });

  it("in the height-driven mode the drawing's height leads and its width is derived from the aspect ratio, not pinned", () => {
    expect(source).toMatch(/fit === "height"[\s\S]{0,400}height:\s*"100%"[\s\S]{0,200}width:\s*"auto"/);
  });

  it("the width-driven mode still pins the drawing to FIGURE_MAX_RENDERED_WIDTH — today's behaviour stays expressed, not deleted", () => {
    expect(source).toMatch(/flex:\s*`0 1 \$\{FIGURE_MAX_RENDERED_WIDTH\}px`/);
  });
});
