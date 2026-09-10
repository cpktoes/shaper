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
 * This file now also guards the PHONE's own box (quick task 260910-2ny). The founder's SECOND
 * iPhone print (260910-2ny-PROBE-READING-2.md) showed the desktop-shaped box quietly overhanging
 * his paper by about 19% on each edge, because iOS Safari does not honour an absolute inch WIDTH
 * at all — only a page-relative one. So what the phone rules now need guarding is not a box
 * described in two places, but two subtler things: a SHAPE that has to stay tied to the same papers
 * `use-print-fit.ts` lists (add one, or change one, and the stylesheet has to follow or this
 * fails), and the ABSENCE of any absolute length in either touch rule — a property nobody reviewing
 * a diff would notice going missing, and exactly the property that cost the founder his second
 * print.
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

/** Extracts the `{ ... }` body of the root's OWN touch rule — the rule whose selector is exactly
 * `[data-order-form-root][data-print-touch]`, with no descendant combinator, distinct from
 * `phoneSheetRuleBody`'s sheet-descendant rule. */
function phoneRootRuleBody(css: string): { body: string; index: number } {
  const marker = "[data-order-form-root][data-print-touch] {";
  const start = css.indexOf(marker);
  expect(start, `no rule found for exactly "${marker}"`).toBeGreaterThanOrEqual(0);
  const bodyStart = start + marker.length;
  const bodyEnd = css.indexOf("}", bodyStart);
  expect(bodyEnd, "rule body never closes").toBeGreaterThan(bodyStart);
  return { body: css.slice(bodyStart, bodyEnd), index: start };
}

/** Finds the offset of the desktop print rule for `[data-order-form-root]` itself — the one
 * declaring `width: calc(min(...in, ...in) - ...mm)`, not the type-scale declarations at the top of
 * the file or the on-screen scaler rule, both of which share the same bare selector text. */
function desktopRootRuleIndex(css: string): number {
  const marker = "[data-order-form-root] {";
  let searchFrom = 0;
  while (true) {
    const start = css.indexOf(marker, searchFrom);
    expect(
      start,
      "no [data-order-form-root] print rule found (width: calc(min(...in, ...in) - ...mm))",
    ).toBeGreaterThanOrEqual(0);
    const bodyStart = start + marker.length;
    const bodyEnd = css.indexOf("}", bodyStart);
    expect(bodyEnd, "rule body never closes").toBeGreaterThan(bodyStart);
    const body = css.slice(bodyStart, bodyEnd);
    if (/width:\s*calc\(min\(/.test(body)) return start;
    searchFrom = bodyEnd + 1;
  }
}

/** Parses a plain two-number `aspect-ratio: W / H` declaration value — the form the stylesheet
 * deliberately uses instead of a derived `max()` (see this plan's `<mechanism>`), so this parser
 * only ever needs to handle two bare numbers either side of a slash. */
function parseAspectRatio(expr: string): { width: number; height: number } {
  const stripped = stripImportant(expr);
  const match = stripped.match(/^([\d.]+)\s*\/\s*([\d.]+)$/);
  expect(match, `expected a plain "W / H" aspect-ratio value, got "${stripped}"`).not.toBeNull();
  return { width: Number(match![1]), height: Number(match![2]) };
}

/** Strips a trailing `!important` (and its surrounding whitespace) off a declaration value already
 * extracted by `extractDeclarationValue`, for an exact-match comparison. */
function stripImportant(value: string): string {
  return value.replace(/\s*!important\s*$/, "").trim();
}

/** Splits a rule body into its own `{ property, value }` declarations — each value still carries a
 * trailing `!important` where the source declares one, exactly as `extractDeclarationValue` returns
 * it, so a caller comparing raw text sees what the stylesheet actually wrote. */
function ruleDeclarations(body: string): { property: string; value: string }[] {
  return [...body.matchAll(/([a-z-]+)\s*:\s*([^;]+);/gi)].map(([, property, value]) => ({
    property: property.trim(),
    value: value.trim(),
  }));
}

/** Absolute CSS lengths — inches, millimetres, centimetres, points, picas, quarter-millimetres or
 * pixels — the one property iOS Safari does not honour on the touch path
 * (260910-2ny-PROBE-READING-2.md). `cqw` deliberately does not match: it ends in the same letter as
 * `vw` but is a container-query unit, not an absolute length. */
const ABSOLUTE_LENGTH_RE = /\d\s*(in|mm|cm|pt|pc|q|px)\b/i;

/** Viewport units — round 1's probe measured these against the SCREEN, not the printed page. */
const VIEWPORT_UNIT_RE = /\d\s*(vh|vw|vmin|vmax)\b/i;

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
  // form fits, so it fits inside whatever uniform margin the browser picks
  // (260910-2ny-PROBE-READING-2.md). This case pins the stylesheet's `aspect-ratio` to the same
  // PORTRAIT_PAPER_IN constants the desktop rule above is already pinned to — add a paper here, or
  // change one, and the stylesheet has to follow or this fails.
  it("the phone rule's shape is the squarest paper use-print-fit.ts claims to fit", () => {
    const css = readStripped(ORDER_FORM_CSS_PATH);
    const { body: sheetBody } = phoneSheetRuleBody(css);
    const aspectRatioExpr = extractDeclarationValue(sheetBody, "aspect-ratio");
    const { width: cssWidth, height: cssHeight } = parseAspectRatio(aspectRatioExpr);

    const hookSource = readStripped(USE_PRINT_FIT_PATH);
    const papers = readPortraitPapersIn(hookSource);
    const squarest = papers.reduce((a, b) => (a.height / a.width <= b.height / b.width ? a : b));

    expect(
      cssWidth,
      `the phone rule's aspect-ratio width (${cssWidth}) is not the squarest paper's own width (${squarest.width})`,
    ).toBe(squarest.width);
    expect(
      cssHeight,
      `the phone rule's aspect-ratio height (${cssHeight}) is not the squarest paper's own height (${squarest.height})`,
    ).toBe(squarest.height);

    // Pinned to six places so the MEANING is checked as well as the digits — a ratio that happens
    // to equal the right numbers by coincidence would still pass the two assertions above.
    const evaluatedRatio = cssHeight / cssWidth;
    const derivedRatio = squarest.height / squarest.width;
    expect(
      evaluatedRatio,
      `the phone rule's evaluated ratio (${evaluatedRatio}) does not equal the squarest portrait paper's own height/width ratio (${derivedRatio})`,
    ).toBeCloseTo(derivedRatio, 6);
  });

  // The most important assertion in this file (260910-2ny-PROBE-READING-2.md): the founder's
  // second iPhone print showed the identical 7.640in of CSS width printing at 8.758in and then
  // 8.719in — iOS Safari does not honour an absolute inch width at all. So neither touch rule may
  // carry one, or any viewport unit either (round 1's own probe measured those against the screen,
  // not the page).
  it("the phone rules carry no absolute length at all — the touch box takes its width from the page and its shape from the paper", () => {
    const css = readStripped(ORDER_FORM_CSS_PATH);
    const { body: rootBody, index: rootIndex } = phoneRootRuleBody(css);
    const { body: sheetBody, index: sheetIndex } = phoneSheetRuleBody(css);

    for (const { property, value } of [...ruleDeclarations(rootBody), ...ruleDeclarations(sheetBody)]) {
      expect(
        value,
        `"${property}: ${value}" in a touch rule carries an absolute CSS length — iOS does not honour one (260910-2ny-PROBE-READING-2.md)`,
      ).not.toMatch(ABSOLUTE_LENGTH_RE);
      expect(
        value,
        `"${property}: ${value}" in a touch rule carries a viewport unit — round 1's probe measured those against the screen, not the page`,
      ).not.toMatch(VIEWPORT_UNIT_RE);
    }

    // The sheet takes its size from the page (width/height: auto) and its shape from the paper
    // (aspect-ratio) — nothing else.
    expect(
      stripImportant(extractDeclarationValue(sheetBody, "width")),
      "the sheet's touch rule must declare width: auto",
    ).toBe("auto");
    expect(
      stripImportant(extractDeclarationValue(sheetBody, "height")),
      "the sheet's touch rule must declare height: auto",
    ).toBe("auto");
    expect(
      () => extractDeclarationValue(sheetBody, "aspect-ratio"),
      "the sheet's touch rule declares no aspect-ratio",
    ).not.toThrow();

    // The root's width is the one percentage this file allows — a percentage of the PAGE is
    // exactly the point — and nothing else in either rule may carry one.
    const rootDecls = ruleDeclarations(rootBody);
    const rootWidthDecl = rootDecls.find((d) => d.property === "width");
    expect(rootWidthDecl, "the root's touch rule declares no width").toBeDefined();
    expect(stripImportant(rootWidthDecl!.value), "the root's touch rule width must be a plain 100%").toBe("100%");

    for (const { property, value } of [
      ...rootDecls.filter((d) => d.property !== "width"),
      ...ruleDeclarations(sheetBody),
    ]) {
      expect(
        value,
        `"${property}: ${value}" carries a percentage — only the root's own width is allowed to`,
      ).not.toMatch(/%/);
    }

    // Source order is the belt to the selector's own braces — a media query adds no specificity —
    // so both touch rules must appear later in the file than their desktop counterparts.
    const desktopSheetIndex = desktopSheetRuleIndex(css);
    expect(
      sheetIndex,
      "the sheet's touch rule must appear later in the file than the desktop sheet rule",
    ).toBeGreaterThan(desktopSheetIndex);
    const desktopRootIndex = desktopRootRuleIndex(css);
    expect(
      rootIndex,
      "the root's touch rule must appear later in the file than the desktop root rule",
    ).toBeGreaterThan(desktopRootIndex);
  });

  // There is no target width to pin on the touch path — the whole fix is that the page decides it
  // — and pinning one in pixels would re-impose from inside the app the exact absolute width iOS
  // refuses to honour, undoing the fix invisibly. A re-introduced inline width on the touch path is
  // the one change that would quietly break this without looking like a diff anyone should question.
  it("the print handler returns before writing anything on the touch path", () => {
    const hookSource = readStripped(USE_PRINT_FIT_PATH).replace(/\s+/g, " ");

    const attrReadIdx = hookSource.indexOf("hasAttribute(TOUCH_PRINT_ATTRIBUTE)");
    expect(
      attrReadIdx,
      "use-print-fit.ts does not read the touch attribute off the root inside beforePrint",
    ).toBeGreaterThanOrEqual(0);

    const inlineRootWidthIdx = hookSource.indexOf("root.style.width =");
    expect(inlineRootWidthIdx, "use-print-fit.ts never writes an inline root width").toBeGreaterThanOrEqual(0);

    expect(
      attrReadIdx,
      "the touch attribute must be read before the first inline root width is written, or a re-introduced inline width could win on the touch path",
    ).toBeLessThan(inlineRootWidthIdx);

    const between = hookSource.slice(attrReadIdx, inlineRootWidthIdx);
    expect(
      between,
      "no bare return statement between the touch attribute read and the first inline width write — the handler can still write something on the touch path",
    ).toMatch(/\breturn\s*;/);
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
