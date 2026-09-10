import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source-contract tests for `RailInstructionsSheet` (the order form's third sheet, PRNT-05, D-01,
 * D-08) — proving structurally that the sheet is the Flat example rail (fixed, always) drawn with
 * the shaper's own chosen legend lines (shared, D-01 overturns the old "always every line" rule for
 * the legend half only): no state of its own, the non-domed rail hard-set rather than read from a
 * variable, the shared `useRailLegend()` set passed straight through, and the Copywriting
 * Contract's own strings verbatim. Same idiom as `lib/units-isolation.test.ts` and
 * `components/rails/view-full-sized-dialog.test.ts`: read the real source, strip comments, assert a
 * structural property — so a mention inside a doc comment (like this one) can never false-positive
 * an assertion.
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

const SHEET_PATH = "components/summary/rail-instructions-sheet.tsx";
const ORDER_FORM_PATH = "components/summary/order-form.tsx";

describe("RailInstructionsSheet — the Flat example rail with the shaper's own chosen lines (D-01, D-08)", () => {
  const sheetSource = readStripped(SHEET_PATH);
  const orderFormSource = readStripped(ORDER_FORM_PATH);

  it("reads the shared set from useRailLegend and passes it straight through to RailPlanSideFigure (D-01)", () => {
    expect(sheetSource).toContain("useRailLegend");
    expect(sheetSource).toMatch(/visibleGroups=\{visibleGroups\}/);
  });

  it("asks the figure to draw the line key — the sheet is the one place a key is wanted (quick 260910-jfp)", () => {
    const callMatch = sheetSource.match(/<RailPlanSideFigure\b[\s\S]*?\/>/);
    expect(callMatch).not.toBeNull();
    expect(callMatch![0]).toMatch(/visibleGroups=\{visibleGroups\}/);
    expect(callMatch![0]).toMatch(/showLineKey/);
  });

  it("still keeps no set of its own to drift — reads the shared one, not a local useState/useReducer", () => {
    expect(sheetSource).not.toMatch(/useState/);
    expect(sheetSource).not.toMatch(/useReducer/);
  });

  it("renders the example rail in its non-domed (Flat) form, hard-set rather than a variable", () => {
    expect(sheetSource).toMatch(/<ExampleRailFigure\s+domed=\{false\}\s*\/>/);
  });

  it("imports only the figure and the pure thickness function from rail-instructions — never the tab's own toggle or legend state", () => {
    const importMatch = sheetSource.match(
      /import\s*\{([^}]*)\}\s*from\s*["']@\/components\/rails\/rail-instructions["']/,
    );
    expect(importMatch).not.toBeNull();
    const names = importMatch![1]
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)
      .sort();
    expect(names).toEqual(["ExampleRailFigure", "exampleRailThickness"]);
  });

  it("reads its stated example thickness from the same pure function that draws the rail (WR-02)", () => {
    expect(sheetSource).toContain("exampleRailThickness(false)");
    expect(sheetSource).not.toMatch(/3\.5/);
  });

  it("carries the sheet's own heading string from the Copywriting Contract, verbatim", () => {
    expect(sheetSource).toContain("Rail Band Instructions");
  });

  it("order-form.tsx carries the page-mark title string from the Copywriting Contract, verbatim", () => {
    expect(orderFormSource).toContain("Rail Band Reference");
  });

  it("order-form.tsx renders RailInstructionsSheet inside a conditional keyed on the preference, after page 2's closing tag", () => {
    const page2CloseIndex = orderFormSource.indexOf('title="Shaper Reference"');
    expect(page2CloseIndex).toBeGreaterThan(-1);
    const thirdSheetIndex = orderFormSource.indexOf("<RailInstructionsSheet", page2CloseIndex);
    expect(thirdSheetIndex).toBeGreaterThan(page2CloseIndex);
    const conditionalWindow = orderFormSource.slice(Math.max(0, thirdSheetIndex - 300), thirdSheetIndex);
    expect(conditionalWindow).toMatch(/printRailInstructions\s*&&/);
  });

  it("the third sheet carries the same data-order-form-sheet hook the other two sheets carry", () => {
    // RailInstructionsSheet is wrapped in the shared <Sheet> primitive, which unconditionally sets
    // data-order-form-sheet on its own root div — so useOrderFormPrintFit's existing walk of every
    // [data-order-form-sheet] fits this sheet exactly the way it fits the other two, with no
    // separate attribute needed on RailInstructionsSheet's own root.
    const thirdSheetIndex = orderFormSource.indexOf("<RailInstructionsSheet");
    expect(thirdSheetIndex).toBeGreaterThan(-1);
    const before = orderFormSource.slice(Math.max(0, thirdSheetIndex - 150), thirdSheetIndex);
    expect(before).toMatch(/<Sheet\b[^>]*variant="instructions"/);
  });
});

describe("the Summary's own mirrored ticks, under the print buttons (D-01)", () => {
  const orderFormSource = readStripped(ORDER_FORM_PATH);

  it("renders the shared ticks component", () => {
    expect(orderFormSource).toContain("RailLegendTicks");
  });

  it("is gated on the same preference as the sheet itself", () => {
    const ticksIndex = orderFormSource.indexOf("<RailLegendTicks");
    expect(ticksIndex).toBeGreaterThan(-1);
    const window = orderFormSource.slice(Math.max(0, ticksIndex - 300), ticksIndex);
    expect(window).toMatch(/printRailInstructions\s*&&/);
  });

  it("sits below the paper, never on it — after the data-print-hide control row's opening tag", () => {
    const rowIndex = orderFormSource.indexOf("data-print-hide");
    const ticksIndex = orderFormSource.indexOf("<RailLegendTicks");
    expect(rowIndex).toBeGreaterThan(-1);
    expect(ticksIndex).toBeGreaterThan(rowIndex);
  });

  it("cannot break the phone row — the control row still wraps and centres, and the ticks always take their own line", () => {
    const rowOpenMatch = orderFormSource.match(/data-print-hide className="([^"]*)"/);
    expect(rowOpenMatch).not.toBeNull();
    expect(rowOpenMatch![1]).toContain("flex-wrap");
    expect(rowOpenMatch![1]).toContain("justify-center");

    const ticksCallMatch = orderFormSource.match(/<RailLegendTicks\s+className="([^"]*)"/);
    expect(ticksCallMatch).not.toBeNull();
    expect(ticksCallMatch![1]).toContain("flex-wrap");

    const wrapperMatch = orderFormSource.match(/<div className="([^"]*w-full[^"]*)">\s*<span>Lines on the instructions sheet/);
    expect(wrapperMatch).not.toBeNull();
    expect(wrapperMatch![1]).toContain("w-full");
  });

  it("the page-count sentences are unchanged, byte for byte", () => {
    expect(orderFormSource).toContain(
      "Two portrait pages, printed double-sided — plus a single-sided Rail Band Instructions page.",
    );
    expect(orderFormSource).toContain("Two portrait pages — print double-sided for a front-and-back form.");
  });
});

describe("the RAILS tab does NOT ask for a second, unclickable copy of the key (quick 260910-jfp)", () => {
  const railsTabSource = readStripped("components/rails/rail-instructions.tsx");

  it("its own RailPlanSideFigure call carries no showLineKey — the nine lines already sit there as tick boxes", () => {
    const callMatch = railsTabSource.match(/<RailPlanSideFigure\b[\s\S]*?\/>/);
    expect(callMatch).not.toBeNull();
    expect(callMatch![0]).not.toMatch(/showLineKey/);
  });

  it("its own RailPlanSideFigure call carries no fit — the new opt-in height-driven fit is only for the printed sheet (quick 260910-kz2)", () => {
    const callMatch = railsTabSource.match(/<RailPlanSideFigure\b[\s\S]*?\/>/);
    expect(callMatch).not.toBeNull();
    expect(callMatch![0]).not.toMatch(/fit=/);
  });
});

/**
 * Source-contract tests for the sheet's new height division (quick 260910-kz2, PRNT-05) — proving,
 * before any source change, that the sheet has no way to stop its example rail band from being the
 * ONLY thing that gives when the paper runs short. Every case below FAILS today: the sheet imports
 * no `FIGURE_MAX_CARD_HEIGHT_PX` from the figure, declares no `FIGURE_MAX_BODY_SHARE_PERCENT` of
 * its own, and asks the figure for no `fit` at all.
 *
 * **The browser half of this bug — that the example rail's own SVG measures literally 0x0 below
 * 454 dots of page area — cannot be run from a worktree.** `npm run dev` fails here with
 * Turbopack's "Could not find the Next.js package"; `e2e/summary-rail-instructions-fit.spec.ts`
 * (written, not run, in this same commit) is what proves it in a real browser, on the main
 * checkout, in quick task 260910-kz2's Task 3. The narrow sweep in that file exists because this
 * sheet used to lose its own reference drawing on a small page with no clipping, no pagination and
 * no warning — silently, which is the whole reason this is a bug worth fixing.
 */
describe("RailInstructionsSheet's height division between its two drawings (quick 260910-kz2)", () => {
  const sheetSource = readStripped(SHEET_PATH);

  it("imports FIGURE_MAX_CARD_HEIGHT_PX from the figure and declares its own FIGURE_MAX_BODY_SHARE_PERCENT, so neither number is a bare literal", () => {
    const importMatch = sheetSource.match(
      /import\s*\{([^}]*)\}\s*from\s*["']@\/components\/rails\/rail-plan-side-figure["']/,
    );
    expect(importMatch, "expected an import from rail-plan-side-figure").not.toBeNull();
    const names = importMatch![1].split(",").map((n) => n.trim());
    expect(names).toContain("RailPlanSideFigure");
    expect(names).toContain("FIGURE_MAX_CARD_HEIGHT_PX");

    const shareMatch = sheetSource.match(/const FIGURE_MAX_BODY_SHARE_PERCENT\s*=\s*([\d.]+)/);
    expect(shareMatch, "expected a numeric const FIGURE_MAX_BODY_SHARE_PERCENT in the source").not.toBeNull();
    const share = Number(shareMatch![1]);
    expect(share).toBeGreaterThan(50);
    expect(share).toBeLessThan(100);
  });

  it("composes the figure's own height box with min(), so the pixel cap wins whenever there is room", () => {
    expect(sheetSource).toMatch(
      /min\(\s*\$\{FIGURE_MAX_CARD_HEIGHT_PX\}px,\s*\$\{FIGURE_MAX_BODY_SHARE_PERCENT\}%\s*\)/,
    );
  });

  it("asks the figure for the height-driven fit", () => {
    const callMatch = sheetSource.match(/<RailPlanSideFigure\b[\s\S]*?\/>/);
    expect(callMatch).not.toBeNull();
    expect(callMatch![0]).toMatch(/fit="height"/);
  });

  it("the two drawing bands share one wrapper that is separate from the heading, and the heading cannot shrink", () => {
    const flexColCount = (sheetSource.match(/flex-col/g) ?? []).length;
    expect(
      flexColCount,
      "expected a drawings wrapper column, distinct from the sheet's own outer column, so a percentage height means 'of the two drawings' shared height'",
    ).toBeGreaterThanOrEqual(2);

    const headingBlock = sheetSource.match(/<div className="[^"]*flex-none[^"]*">[\s\S]{0,120}?Rail Band Instructions/);
    expect(headingBlock, "expected the heading's own div to carry flex-none so it cannot shrink").not.toBeNull();

    const exampleRailIndex = sheetSource.indexOf("<ExampleRailFigure");
    const figureIndex = sheetSource.indexOf("<RailPlanSideFigure");
    expect(exampleRailIndex).toBeGreaterThan(-1);
    expect(figureIndex).toBeGreaterThan(exampleRailIndex);
  });
});
