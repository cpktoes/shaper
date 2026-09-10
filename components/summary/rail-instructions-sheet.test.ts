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
