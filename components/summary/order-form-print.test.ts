import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source-contract tests for the order form's print path (08-09, G-08-10), in the same idiom
 * `components/rails/view-full-sized-dialog.test.ts` already uses: read the real source, strip
 * comments (so this file's own prose can never false-positive an assertion about itself), assert
 * a structural property.
 *
 * The blank first-and-last-page bug this plan fixes survived a Phase 7 print audit and a Phase 8
 * phase review because nothing in the repo tested what the printed page adds up to — the
 * stylesheet's `@page` margin and `use-print-fit.ts`'s `PAGE_MARGIN_MM` each promise, in prose, to
 * mirror the other, and nobody was checking. This file closes that.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const ORDER_FORM_CSS_PATH = "app/design/summary/order-form.css";
const USE_PRINT_FIT_PATH = "components/summary/use-print-fit.ts";

/** Strips `//` line comments and `/* *\/` block comments — the same helper
 * `lib/units-isolation.test.ts` and `view-full-sized-dialog.test.ts` already copy from
 * `lib/theme.test.ts`. */
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

/** Extracts the `{ ... }` body of the FIRST rule whose selector is exactly `[data-order-form-page]`
 * — not the tripled `[data-order-form-page][data-order-form-page][data-order-form-page]`
 * specificity-boost rule further down the same file, which shares a trailing substring with the
 * plain selector but is a different rule entirely. */
function firstOrderFormPageRuleBody(css: string): string {
  const marker = "[data-order-form-page] {";
  const start = css.indexOf(marker);
  expect(start, `no rule found for exactly "${marker}"`).toBeGreaterThanOrEqual(0);
  const bodyStart = start + marker.length;
  const bodyEnd = css.indexOf("}", bodyStart);
  expect(bodyEnd, "rule body never closes").toBeGreaterThan(bodyStart);
  return css.slice(bodyStart, bodyEnd);
}

/** Reads a single numeric `const NAME = <number>;` declaration out of use-print-fit.ts. */
function readNumericConst(source: string, name: string): number {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*([\\d.]+)\\s*;`));
  expect(match, `no "const ${name} = <number>;" declaration found`).not.toBeNull();
  return Number(match![1]);
}

/** Reads every `{ width: N, height: N }` pair out of the PORTRAIT_PAPER_IN array declaration. */
function readPortraitPapersIn(source: string): { width: number; height: number }[] {
  const arrayMatch = source.match(/PORTRAIT_PAPER_IN\s*=\s*\[([\s\S]*?)\];/);
  expect(arrayMatch, "no PORTRAIT_PAPER_IN array declaration found").not.toBeNull();
  const entries = [...arrayMatch![1].matchAll(/width:\s*([\d.]+)\s*,\s*height:\s*([\d.]+)/g)].map(
    ([, width, height]) => ({ width: Number(width), height: Number(height) }),
  );
  expect(entries.length, "no {width, height} pairs found in PORTRAIT_PAPER_IN").toBeGreaterThanOrEqual(2);
  return entries;
}

/** CSS's own reference pixel for a stylesheet length (96px = 1in) — not a board-dimension
 * conversion. CLAUDE.md Rule 2 governs design values (in/mm for what a shaper sees), and
 * use-print-fit.ts measures the real px-per-inch at runtime on purpose; this constant exists only
 * to interpret a raw CSS `px` length read straight out of the stylesheet's own print rule below. */
const CSS_REFERENCE_PX_PER_INCH = 96;

/** Converts a padding value + CSS unit (as matched out of the stylesheet) into inches. No unit is
 * only ever valid for a value of 0 — the print rule this feeds is expected to declare
 * `padding: 0 !important` with no unit, and any other unitless length would be ambiguous. */
function paddingToInches(value: number, unit: string | undefined, mmPerInch: number): number {
  if (!unit) {
    expect(value, "a unitless CSS length must be 0").toBe(0);
    return 0;
  }
  if (unit === "in") return value;
  if (unit === "mm") return value / mmPerInch;
  return value / CSS_REFERENCE_PX_PER_INCH;
}

describe("order form print path (G-08-10, PRNT-06)", () => {
  it("zeroes the page wrapper's screen padding in print, so a future tidy-up cannot quietly put the blank pages back", () => {
    const css = readStripped(ORDER_FORM_CSS_PATH);
    const body = firstOrderFormPageRuleBody(css);
    expect(body, "does not zero padding with !important inside the [data-order-form-page] print rule").toMatch(
      /padding:\s*0\s*!important/,
    );
  });

  it("the stylesheet's @page margin and use-print-fit.ts's PAGE_MARGIN_MM mirror the same number", () => {
    const css = readStripped(ORDER_FORM_CSS_PATH);
    const pageBlockMatch = css.match(/@page\s*\{([\s\S]*?)\}/);
    expect(pageBlockMatch, "no @page rule found in order-form.css").not.toBeNull();
    const marginMatch = pageBlockMatch![1].match(/margin:\s*([\d.]+)mm/);
    expect(marginMatch, "the @page rule does not declare a margin in mm").not.toBeNull();
    const stylesheetMarginMm = Number(marginMatch![1]);

    const hookSource = readStripped(USE_PRINT_FIT_PATH);
    const hookMarginMm = readNumericConst(hookSource, "PAGE_MARGIN_MM");

    expect(
      hookMarginMm,
      `order-form.css's @page margin (${stylesheetMarginMm}mm) and use-print-fit.ts's PAGE_MARGIN_MM (${hookMarginMm}mm) have drifted apart`,
    ).toBe(stylesheetMarginMm);
  });

  it("the fitted sheet, plus the wrapper's print padding as the stylesheet declares it, fits inside the shortest portrait paper's printable height", () => {
    const css = readStripped(ORDER_FORM_CSS_PATH);
    const pageBlockMatch = css.match(/@page\s*\{([\s\S]*?)\}/);
    const marginMm = Number(pageBlockMatch![1].match(/margin:\s*([\d.]+)mm/)![1]);

    const hookSource = readStripped(USE_PRINT_FIT_PATH);
    const mmPerInch = readNumericConst(hookSource, "MM_PER_INCH");
    const fitSafety = readNumericConst(hookSource, "FIT_SAFETY");
    const papers = readPortraitPapersIn(hookSource);

    // The box every sheet is fitted to is the smaller of every listed paper on each axis — today
    // that shortest height is US Letter's, per the array's own inline comment, but this test
    // derives it from the array rather than assuming which entry is which.
    const shortestHeightIn = Math.min(...papers.map((p) => p.height));
    const marginIn = marginMm / mmPerInch;
    const printableHeightIn = shortestHeightIn - 2 * marginIn;
    const fittedSheetHeightIn = printableHeightIn * fitSafety;

    // The wrapper's print padding is read from the [data-order-form-page] print rule itself
    // (G-08-10), not assumed to be zero — so a future regression in the padding reset fails this
    // test too. 32px of wrapper padding is about 0.33in against roughly 0.05in of Letter's own
    // slack, which is exactly the bug this plan fixed.
    const body = firstOrderFormPageRuleBody(css);
    const paddingMatch = body.match(/padding:\s*([\d.]+)\s*(px|mm|in)?\s*!important/);
    expect(paddingMatch, "the [data-order-form-page] print rule declares no numeric padding").not.toBeNull();
    const wrapperPrintPaddingIn = paddingToInches(Number(paddingMatch![1]), paddingMatch![2], mmPerInch);

    expect(
      fittedSheetHeightIn + wrapperPrintPaddingIn,
      `fitted sheet height (${fittedSheetHeightIn.toFixed(4)}in) plus wrapper print padding (${wrapperPrintPaddingIn}in) does not fit inside the shortest paper's printable height (${printableHeightIn.toFixed(4)}in) — a sheet, or the desk padding, would spill onto its own page`,
    ).toBeLessThanOrEqual(printableHeightIn);
  });
});
