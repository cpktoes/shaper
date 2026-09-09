import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The phone preview (260909-i7r) reserves the screen space a shrunken picture of the order form
 * will occupy — see `app/design/summary/order-form.css`'s "The phone preview" comment. It works
 * that height out from four numbers that are each written down somewhere else as well: the sheet's
 * own shape, the stack's own gap, the design width, and the sheet count. If any of them drifts, the
 * preview does not break loudly — it leaves a strip of empty page under the last sheet, or clips its
 * bottom edge, which is exactly the kind of fault that survives a review.
 *
 * Same idiom `components/summary/order-form-print.test.ts` and
 * `components/rails/view-full-sized-dialog.test.ts` already use: read the real source, strip
 * comments (so this file's own prose can never satisfy an assertion about itself), assert a
 * structural property.
 *
 * At today's numbers, the reserved height comes out to 2351.06px for two sheets and 3542.59px for
 * three — recorded here as what these currently-pinned inputs add up to, not asserted directly,
 * since evaluating a CSS `calc()` expression is not this file's job.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const ORDER_FORM_CSS_PATH = "app/design/summary/order-form.css";
const ORDER_FORM_TSX_PATH = "components/summary/order-form.tsx";

/** Strips `//` line comments and `/* *\/` block comments — the same helper
 * `lib/theme.test.ts`, `view-full-sized-dialog.test.ts` and `order-form-print.test.ts` each copy. */
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

/** Extracts the body of a brace-delimited block starting at `marker` (which must end in `{`),
 * counting nested braces so a multi-rule `@media` block is captured whole rather than stopping at
 * the first inner `}` — unlike a non-greedy regex, which is only safe for a single flat rule. */
function extractBraceBlock(css: string, marker: string): string {
  const start = css.indexOf(marker);
  expect(start, `no block found starting with "${marker}"`).toBeGreaterThanOrEqual(0);
  let i = start + marker.length;
  let depth = 1;
  while (depth > 0) {
    expect(i, `"${marker}" block never closes`).toBeLessThan(css.length);
    if (css[i] === "{") depth++;
    else if (css[i] === "}") depth--;
    i++;
  }
  return css.slice(start + marker.length, i - 1);
}

/** Extracts the `{ ... }` body of the FIRST rule whose selector is exactly `[data-order-form-sheet]`
 * and whose body declares a numeric `aspect-ratio` (width / height) — the on-screen sizing rule,
 * not the print path's later `[data-order-form-sheet] { aspect-ratio: auto !important; ... }`
 * override, which shares the same selector text. */
function screenSheetAspectRatioBody(css: string): string {
  const marker = "[data-order-form-sheet] {";
  let searchFrom = 0;
  while (true) {
    const start = css.indexOf(marker, searchFrom);
    expect(start, "no [data-order-form-sheet] rule declaring a numeric aspect-ratio found").toBeGreaterThanOrEqual(0);
    const bodyStart = start + marker.length;
    const bodyEnd = css.indexOf("}", bodyStart);
    expect(bodyEnd, "rule body never closes").toBeGreaterThan(bodyStart);
    const body = css.slice(bodyStart, bodyEnd);
    if (/aspect-ratio:\s*[\d.]+\s*\/\s*[\d.]+/.test(body)) return body;
    searchFrom = bodyEnd + 1;
  }
}

/** Extracts the `{ ... }` body of the FIRST rule whose selector is exactly `[data-order-form-scaler]`
 * — the base, non-media rule that must generate no box on paper — not the later `@media screen`
 * rule of the same selector, which carries the scale and height math. */
function baseScalerRuleBody(css: string): string {
  const marker = "[data-order-form-scaler] {";
  const start = css.indexOf(marker);
  expect(start, `no rule found for exactly "${marker}"`).toBeGreaterThanOrEqual(0);
  const bodyStart = start + marker.length;
  const bodyEnd = css.indexOf("}", bodyStart);
  expect(bodyEnd, "rule body never closes").toBeGreaterThan(bodyStart);
  return css.slice(bodyStart, bodyEnd);
}

describe("Summary order form — phone preview's borrowed numbers (260909-i7r)", () => {
  it("the stack height's shape figures are the sheet's own aspect-ratio figures, the other way up", () => {
    const css = readStripped(ORDER_FORM_CSS_PATH);

    const sheetBody = screenSheetAspectRatioBody(css);
    const sheetMatch = sheetBody.match(/aspect-ratio:\s*([\d.]+)\s*\/\s*([\d.]+)/);
    expect(sheetMatch, "no numeric aspect-ratio found on the on-screen sheet rule").not.toBeNull();
    const [, sheetWidth, sheetHeight] = sheetMatch!.map(Number) as unknown as [never, number, number];

    const screenBlock = extractBraceBlock(css, "@media screen {");
    const stackHeightMatch = screenBlock.match(
      /--order-form-stack-height:\s*calc\(\s*var\(--order-form-design-width\)\s*\*\s*([\d.]+)\s*\/\s*([\d.]+)\s*\*\s*var\(--order-form-sheet-count\)/,
    );
    expect(stackHeightMatch, "no --order-form-stack-height calc() expression found in the @media screen block").not.toBeNull();
    const [, stackNumerator, stackDenominator] = stackHeightMatch!.map(Number) as unknown as [
      never,
      number,
      number,
    ];

    expect(
      stackNumerator,
      `the stack height's numerator (${stackNumerator}) should be the sheet's own aspect-ratio height (${sheetHeight}), inverted from the sheet's width-over-height`,
    ).toBe(sheetHeight);
    expect(
      stackDenominator,
      `the stack height's denominator (${stackDenominator}) should be the sheet's own aspect-ratio width (${sheetWidth})`,
    ).toBe(sheetWidth);
  });

  it("--order-form-stack-gap is 2rem, which is what gap-8 on the stack means", () => {
    const css = readStripped(ORDER_FORM_CSS_PATH);
    const gapMatch = css.match(/--order-form-stack-gap:\s*([^;]+);/);
    expect(gapMatch, "no --order-form-stack-gap declaration found").not.toBeNull();
    expect(gapMatch![1].trim(), "--order-form-stack-gap should be 2rem, matching gap-8").toBe("2rem");

    const tsx = readStripped(ORDER_FORM_TSX_PATH);
    const rootClassMatch = tsx.match(/data-order-form-root\s*\n\s*className="([^"]+)"/);
    expect(rootClassMatch, "no className found on the data-order-form-root element").not.toBeNull();
    const rootClassList = rootClassMatch![1];

    expect(rootClassList, "the stack's class list should still carry gap-8").toContain("gap-8");
    expect(
      rootClassList,
      "the stack's width moved to the stylesheet — its class list should carry no max-w- class",
    ).not.toMatch(/max-w-/);
  });

  it("the stack's screen width and the scale expression both read --order-form-design-width, so the design width is stated once", () => {
    const css = readStripped(ORDER_FORM_CSS_PATH);
    const screenBlock = extractBraceBlock(css, "@media screen {");

    expect(
      screenBlock,
      "the scaler's screen width should be built from var(--order-form-design-width), not a literal",
    ).toMatch(/width:\s*calc\(\s*var\(--order-form-design-width\)\s*\*\s*var\(--order-form-preview-scale\)\s*\)/);

    expect(
      screenBlock,
      "the scale expression's atan2() call should name var(--order-form-design-width), not a literal 880px",
    ).toMatch(/tan\(atan2\(100cqw,\s*var\(--order-form-design-width\)\)\)/);

    // No bare "880px" should reappear inside the @media screen block itself — the design width is
    // declared once (on the scaler, outside any media query) and only ever referenced by name here.
    expect(
      screenBlock,
      "a bare 880px literal reappeared inside the @media screen block — the design width should be read through the variable everywhere it's used",
    ).not.toMatch(/880px/);
  });

  it("[data-order-form-page] carries container-type: inline-size inside @media screen", () => {
    const css = readStripped(ORDER_FORM_CSS_PATH);
    const screenBlock = extractBraceBlock(css, "@media screen {");

    expect(screenBlock, "the @media screen block should mention [data-order-form-page]").toMatch(
      /\[data-order-form-page\]/,
    );
    expect(
      screenBlock,
      "the @media screen block should declare container-type: inline-size for the page wrapper",
    ).toMatch(/\[data-order-form-page\]\)?\s*\{\s*container-type:\s*inline-size;\s*\}/);
  });

  it("nothing the preview needs is declared inside @media print, and the scaler's base declaration is display: contents", () => {
    const css = readStripped(ORDER_FORM_CSS_PATH);
    const printBlock = extractBraceBlock(css, "@media print {");

    expect(printBlock, "the print path should never mention the scaler attribute").not.toMatch(
      /data-order-form-scaler/,
    );
    expect(printBlock, "the print path should never mention the preview scale property").not.toMatch(
      /order-form-preview-scale/,
    );

    const baseScalerBody = baseScalerRuleBody(css);
    expect(
      baseScalerBody,
      "the scaler's base (non-media) rule should declare display: contents, so it generates no box on paper",
    ).toMatch(/display:\s*contents/);
  });
});
