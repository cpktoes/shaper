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
 *
 * This file now also guards the PHONE's own box (quick task 260910-2ny). The reason it has to is
 * the same reason as above, twice over: the phone's shorter sheet is described in two places — the
 * stylesheet applies it in `[data-order-form-root][data-print-touch] [data-order-form-sheet]`, and
 * the print handler measures against it in `use-print-fit.ts` — and two places describing one box
 * is exactly how a number goes quietly wrong.
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

/** CSS's own fixed mm-per-inch — a fact of the unit system itself, the same way
 * `CSS_REFERENCE_PX_PER_INCH` above is. Deliberately NOT read from `use-print-fit.ts`'s own
 * `MM_PER_INCH`: the stylesheet's literal `mm` figure is always interpreted against the real
 * physical constant, so a drift in the hook's `MM_PER_INCH` shows up as a mismatch below rather
 * than cancelling out on both sides of the comparison. */
const CSS_MM_PER_INCH = 25.4;

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

/** Extracts the `{ ... }` body of the print rule for `[data-order-form-sheet]` that carries
 * `aspect-ratio: auto` — the rule Task 1 extended with the printed sheet's width and height, not
 * the file's other `[data-order-form-sheet]` rules (the on-screen `aspect-ratio: 7.87 / 10.37`
 * rule, the page-break rules, the border rule, or the overflow backstop). */
function printedSheetRuleBody(css: string): string {
  const marker = "[data-order-form-sheet] {";
  let searchFrom = 0;
  while (true) {
    const start = css.indexOf(marker, searchFrom);
    expect(start, "no [data-order-form-sheet] rule carrying aspect-ratio: auto found").toBeGreaterThanOrEqual(0);
    const bodyStart = start + marker.length;
    const bodyEnd = css.indexOf("}", bodyStart);
    expect(bodyEnd, "rule body never closes").toBeGreaterThan(bodyStart);
    const body = css.slice(bodyStart, bodyEnd);
    if (/aspect-ratio:\s*auto/.test(body)) return body;
    searchFrom = bodyEnd + 1;
  }
}

/** Reads one `property: <value>;` declaration's raw value out of a rule body. Requires the
 * property name to start at a declaration boundary (start-of-body, `;`, `{` or whitespace) so
 * `width:` can never accidentally match inside a longer property name like `min-width:`. */
function extractDeclarationValue(body: string, property: string): string {
  const match = body.match(new RegExp(`(?:^|[\\s;{])${property}:\\s*([^;]+);`));
  expect(match, `no "${property}:" declaration found in the printed sheet's print rule`).not.toBeNull();
  return match![1].trim();
}

/** Pulls the numbers out of a `calc(min(Ain, Bin) - Cmm)` or `calc((min(Ain, Bin) - Cmm) * D)`
 * expression without caring exactly how its parens nest — the two `in` figures inside `min()`,
 * the `mm` figure subtracted, and (if present) the multiplier trailing a closing paren. */
function parseCalcNumbers(expr: string): { papers: number[]; marginMm: number; multiplier: number | undefined } {
  const papers = [...expr.matchAll(/([\d.]+)in/g)].map(([, value]) => Number(value));
  expect(papers.length, `expected two "Nin" figures in "${expr}"`).toBe(2);
  const marginMatch = expr.match(/([\d.]+)mm/);
  expect(marginMatch, `no "Nmm" figure found in "${expr}"`).not.toBeNull();
  const multiplierMatch = expr.match(/\)\s*\*\s*([\d.]+)/);
  return {
    papers,
    marginMm: Number(marginMatch![1]),
    multiplier: multiplierMatch ? Number(multiplierMatch[1]) : undefined,
  };
}

/** Extracts the `{ ... }` body and the file offset of the phone print rule — the rule whose
 * selector is exactly `[data-order-form-root][data-print-touch] [data-order-form-sheet]`. Unlike
 * `printedSheetRuleBody` this selector is unique in the file today, so the first match is the
 * rule; the offset is what New case B uses to prove it sits after the desktop sheet rule in source
 * order. */
function phoneSheetRuleBody(css: string): { body: string; index: number } {
  const marker = "[data-order-form-root][data-print-touch] [data-order-form-sheet] {";
  const start = css.indexOf(marker);
  expect(start, `no rule found for exactly "${marker}"`).toBeGreaterThanOrEqual(0);
  const bodyStart = start + marker.length;
  const bodyEnd = css.indexOf("}", bodyStart);
  expect(bodyEnd, "rule body never closes").toBeGreaterThan(bodyStart);
  return { body: css.slice(bodyStart, bodyEnd), index: start };
}

/** Reads the `data-print-*` attribute name straight out of the phone rule's own selector, rather
 * than hardcoding it — a rename on the stylesheet side alone still leaves this able to compare it
 * against the handler's source. */
function phoneAttributeName(css: string): string {
  const match = css.match(/\[data-order-form-root\]\[(data-print-[\w-]+)\]\s*\[data-order-form-sheet\]\s*\{/);
  expect(
    match,
    "no rule found matching [data-order-form-root][data-print-*] [data-order-form-sheet]",
  ).not.toBeNull();
  return match![1];
}

/** Finds the offset of the desktop sheet rule — the same rule `printedSheetRuleBody` extracts the
 * body of, carrying `aspect-ratio: auto` — so New case B can compare source order against the
 * phone rule found by `phoneSheetRuleBody`. */
function desktopSheetRuleIndex(css: string): number {
  const marker = "[data-order-form-sheet] {";
  let searchFrom = 0;
  while (true) {
    const start = css.indexOf(marker, searchFrom);
    expect(start, "no [data-order-form-sheet] rule carrying aspect-ratio: auto found").toBeGreaterThanOrEqual(0);
    const bodyStart = start + marker.length;
    const bodyEnd = css.indexOf("}", bodyStart);
    expect(bodyEnd, "rule body never closes").toBeGreaterThan(bodyStart);
    const body = css.slice(bodyStart, bodyEnd);
    if (/aspect-ratio:\s*auto/.test(body)) return start;
    searchFrom = bodyEnd + 1;
  }
}

/** Pulls the touch height calc's numbers out of an expression shaped like
 * `calc((min(Ain, Bin) - Cmm) * min(H1 / W1, H2 / W2))`: the two `Nin` paper widths, the `Nmm`
 * margin, and the ratio's two `H / W` pairs inside the trailing `min()` — without caring exactly
 * how the parens nest. */
function parseTouchHeightExpr(expr: string): {
  papers: number[];
  marginMm: number;
  ratioPairs: [number, number][];
} {
  const papers = [...expr.matchAll(/([\d.]+)in/g)].map(([, value]) => Number(value));
  expect(papers.length, `expected two "Nin" figures in "${expr}"`).toBe(2);
  const marginMatch = expr.match(/([\d.]+)mm/);
  expect(marginMatch, `no "Nmm" figure found in "${expr}"`).not.toBeNull();
  const ratioMatches = [...expr.matchAll(/([\d.]+)\s*\/\s*([\d.]+)/g)];
  expect(ratioMatches.length, `expected two "H / W" ratio pairs in "${expr}"`).toBe(2);
  const ratioPairs = ratioMatches.map(([, h, w]) => [Number(h), Number(w)] as [number, number]);
  return { papers, marginMm: Number(marginMatch![1]), ratioPairs };
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

  // The printed size is now declared in two places on purpose — the stylesheet decides it,
  // `useOrderFormPrintFit` mirrors it only to force the printing layout it measures — and two
  // places is exactly how a number goes quietly wrong. This case pins them together structurally,
  // reading both from their real source rather than trusting either file's prose.
  it("the stylesheet's printed sheet box and the print handler's own box describe the same piece of paper", () => {
    const css = readStripped(ORDER_FORM_CSS_PATH);
    const sheetBody = printedSheetRuleBody(css);
    const widthExpr = extractDeclarationValue(sheetBody, "width");
    const heightExpr = extractDeclarationValue(sheetBody, "height");

    const hookSource = readStripped(USE_PRINT_FIT_PATH);
    const mmPerInch = readNumericConst(hookSource, "MM_PER_INCH");
    const marginMm = readNumericConst(hookSource, "PAGE_MARGIN_MM");
    const fitSafety = readNumericConst(hookSource, "FIT_SAFETY");
    const papers = readPortraitPapersIn(hookSource);

    const widthNumbers = parseCalcNumbers(widthExpr);
    const heightNumbers = parseCalcNumbers(heightExpr);

    expect(
      [...widthNumbers.papers].sort((a, b) => a - b),
      `the width expression's paper figures (${widthNumbers.papers}) do not match PORTRAIT_PAPER_IN's widths`,
    ).toEqual([...papers.map((p) => p.width)].sort((a, b) => a - b));

    expect(
      [...heightNumbers.papers].sort((a, b) => a - b),
      `the height expression's paper figures (${heightNumbers.papers}) do not match PORTRAIT_PAPER_IN's heights`,
    ).toEqual([...papers.map((p) => p.height)].sort((a, b) => a - b));

    expect(
      widthNumbers.marginMm,
      `the width expression subtracts ${widthNumbers.marginMm}mm, not twice PAGE_MARGIN_MM (${2 * marginMm}mm)`,
    ).toBe(2 * marginMm);
    expect(
      heightNumbers.marginMm,
      `the height expression subtracts ${heightNumbers.marginMm}mm, not twice PAGE_MARGIN_MM (${2 * marginMm}mm)`,
    ).toBe(2 * marginMm);

    expect(
      heightNumbers.multiplier,
      `the height expression's multiplier (${heightNumbers.multiplier}) does not equal FIT_SAFETY (${fitSafety})`,
    ).toBe(fitSafety);
    expect(
      widthNumbers.multiplier,
      "the width expression carries a multiplier — only the height is meant to shave FIT_SAFETY off",
    ).toBeUndefined();

    // Evaluate both expressions at CSS's own fixed 96px-per-inch and 25.4mm-per-inch, and compare
    // against the handler's own printableBoxPx() arithmetic (mirrored here, using the hook's own
    // MM_PER_INCH — not CSS_MM_PER_INCH — so a drift in that constant alone still surfaces).
    const stylesheetWidthPx =
      Math.min(...widthNumbers.papers) * CSS_REFERENCE_PX_PER_INCH -
      (widthNumbers.marginMm / CSS_MM_PER_INCH) * CSS_REFERENCE_PX_PER_INCH;
    const stylesheetHeightPx =
      (Math.min(...heightNumbers.papers) * CSS_REFERENCE_PX_PER_INCH -
        (heightNumbers.marginMm / CSS_MM_PER_INCH) * CSS_REFERENCE_PX_PER_INCH) *
      (heightNumbers.multiplier ?? 1);

    const hookMarginIn = marginMm / mmPerInch;
    const hookWidthPx = (Math.min(...papers.map((p) => p.width)) - 2 * hookMarginIn) * CSS_REFERENCE_PX_PER_INCH;
    const hookHeightPx =
      (Math.min(...papers.map((p) => p.height)) - 2 * hookMarginIn) * CSS_REFERENCE_PX_PER_INCH * fitSafety;

    expect(
      Math.abs(stylesheetWidthPx - hookWidthPx),
      `stylesheet width (${stylesheetWidthPx.toFixed(4)}px) and handler width (${hookWidthPx.toFixed(4)}px) have drifted apart by more than 0.02 dots`,
    ).toBeLessThanOrEqual(0.02);
    expect(
      Math.abs(stylesheetHeightPx - hookHeightPx),
      `stylesheet height (${stylesheetHeightPx.toFixed(4)}px) and handler height (${hookHeightPx.toFixed(4)}px) have drifted apart by more than 0.02 dots`,
    ).toBeLessThanOrEqual(0.02);
  });

  // A touch device's sheet is a SHAPE, not a size — the ratio of the squarest portrait paper this
  // form fits, so it fits inside whatever uniform margin the browser picks (260910-2ny). This case
  // pins the stylesheet's phone rule to the same PORTRAIT_PAPER_IN/PAGE_MARGIN_MM constants the
  // desktop rule above is already pinned to, so the two boxes can never quietly describe two
  // different papers.
  it("the phone's printed sheet and the print handler's own phone box describe the same piece of paper", () => {
    const css = readStripped(ORDER_FORM_CSS_PATH);
    const { body: phoneBody } = phoneSheetRuleBody(css);
    const heightExpr = extractDeclarationValue(phoneBody, "height");
    const touch = parseTouchHeightExpr(heightExpr);

    const hookSource = readStripped(USE_PRINT_FIT_PATH);
    const mmPerInch = readNumericConst(hookSource, "MM_PER_INCH");
    const marginMm = readNumericConst(hookSource, "PAGE_MARGIN_MM");
    const papers = readPortraitPapersIn(hookSource);

    expect(
      [...touch.papers].sort((a, b) => a - b),
      `the phone height expression's paper widths (${touch.papers}) do not match PORTRAIT_PAPER_IN's widths`,
    ).toEqual([...papers.map((p) => p.width)].sort((a, b) => a - b));

    expect(
      touch.marginMm,
      `the phone height expression subtracts ${touch.marginMm}mm, not twice PAGE_MARGIN_MM (${2 * marginMm}mm)`,
    ).toBe(2 * marginMm);

    const cssRatioPairsSorted = touch.ratioPairs.map(([h, w]) => `${h}/${w}`).sort();
    const paperRatioPairsSorted = papers.map((p) => `${p.height}/${p.width}`).sort();
    expect(
      cssRatioPairsSorted,
      `the phone rule's ratio pairs (${touch.ratioPairs.map((r) => r.join("/"))}) are not PORTRAIT_PAPER_IN's own height/width pairs`,
    ).toEqual(paperRatioPairsSorted);

    // The chosen ratio is the SMALLEST height/width pair — the squarest portrait paper — never a
    // literal, so it can only ever mean "the squarest paper this form claims to fit".
    const touchRatio = Math.min(...touch.ratioPairs.map(([h, w]) => h / w));
    const derivedRatio = Math.min(...papers.map((p) => p.height / p.width));
    expect(
      touchRatio,
      `the phone rule's ratio (${touchRatio}) does not equal the squarest portrait paper's own height/width ratio (${derivedRatio})`,
    ).toBeCloseTo(derivedRatio, 6);

    // Evaluate both sides at CSS's own fixed 96px/25.4mm-per-inch, the same idiom and tolerance the
    // desktop case above uses.
    const marginIn = marginMm / mmPerInch;
    const widthIn = Math.min(...papers.map((p) => p.width)) - 2 * marginIn;
    const expectedHeightPx = widthIn * CSS_REFERENCE_PX_PER_INCH * derivedRatio;

    const cssWidthIn = Math.min(...touch.papers) - touch.marginMm / CSS_MM_PER_INCH;
    const cssHeightPx = cssWidthIn * CSS_REFERENCE_PX_PER_INCH * touchRatio;

    expect(
      Math.abs(cssHeightPx - expectedHeightPx),
      `phone rule height (${cssHeightPx.toFixed(4)}px) and the handler's own derived box (${expectedHeightPx.toFixed(4)}px) have drifted apart by more than 0.02 dots`,
    ).toBeLessThanOrEqual(0.02);
  });

  // The phone rule changes only the height, never the width — the root is the `@container` every
  // `cqw` font size resolves against, so a phone-only width would silently change the printed type
  // size and look like a design decision rather than a bug.
  it("the phone rule changes only the height, so the type container stays in lockstep", () => {
    const css = readStripped(ORDER_FORM_CSS_PATH);
    const { body: phoneBody, index: phoneIndex } = phoneSheetRuleBody(css);

    const heightExpr = extractDeclarationValue(phoneBody, "height");
    expect(heightExpr, `the phone rule's height value ("${heightExpr}") carries a viewport unit`).not.toMatch(
      /\d(vh|vw|vmin|vmax)\b/i,
    );
    expect(heightExpr, `the phone rule's height value ("${heightExpr}") carries a percentage`).not.toMatch(/%/);

    expect(
      () => extractDeclarationValue(phoneBody, "width"),
      "the phone rule declares a width — only height is meant to change on a touch device",
    ).toThrow();

    // Source order is the belt to the selector's braces: the phone selector is the more specific of
    // the two, but a media query adds no specificity, so source order is what keeps the phone rule
    // winning if that specificity margin is ever narrowed.
    const desktopIndex = desktopSheetRuleIndex(css);
    expect(
      phoneIndex,
      "the phone rule must appear later in the file than the desktop sheet rule",
    ).toBeGreaterThan(desktopIndex);
  });

  // The phone rule is reached by the pointer, never by a width — in print media a width query tests
  // the PAGE, not the screen, and an iPad is a coarse pointer on a wide screen running the same
  // WebKit print path as the phone this fix exists for.
  it("the phone rule keys on the attribute the handler writes, decided from the pointer rather than the window's width", () => {
    const css = readStripped(ORDER_FORM_CSS_PATH);
    const attrName = phoneAttributeName(css);

    const hookSource = readStripped(USE_PRINT_FIT_PATH).replace(/\s+/g, " ");
    expect(
      hookSource,
      `use-print-fit.ts does not carry the quoted attribute name "${attrName}" the stylesheet's phone rule keys on`,
    ).toMatch(new RegExp(`["'\`]${attrName}["'\`]`));

    expect(
      hookSource,
      "use-print-fit.ts does not carry the coarse pointer media query as a quoted string — a width query would wrongly exclude an iPad",
    ).toMatch(/["'`]\(pointer:\s*coarse\)["'`]/);
  });
});
