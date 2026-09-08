import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source-contract tests for `RailInstructionsSheet` (the order form's third sheet, PRNT-05, D-08)
 * — proving structurally that the sheet is fixed, not a mirror of the INSTRUCTIONS tab's own
 * on-screen state: no state of its own, the non-domed rail hard-set rather than read from a
 * variable, every legend group, and the Copywriting Contract's own strings verbatim. Same idiom as
 * `lib/units-isolation.test.ts` and `components/rails/view-full-sized-dialog.test.ts`: read the
 * real source, strip comments, assert a structural property — so a mention inside a doc comment
 * (like this one) can never false-positive an assertion.
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

describe("RailInstructionsSheet — a fixed reference sheet, never a partial one (D-08)", () => {
  const sheetSource = readStripped(SHEET_PATH);
  const orderFormSource = readStripped(ORDER_FORM_PATH);

  it("names ALL_RAIL_REFERENCE_GROUPS — every legend line, never a subset gated by on-screen ticks", () => {
    expect(sheetSource).toContain("ALL_RAIL_REFERENCE_GROUPS");
  });

  it("holds no state of its own to reflect", () => {
    expect(sheetSource).not.toMatch(/useState/);
    expect(sheetSource).not.toMatch(/useReducer/);
  });

  it("renders the example rail in its non-domed (Flat) form, hard-set rather than a variable", () => {
    expect(sheetSource).toMatch(/<ExampleRailFigure\s+domed=\{false\}\s*\/>/);
  });

  it("imports only ExampleRailFigure from rail-instructions — never the tab's own toggle or legend state", () => {
    const importMatch = sheetSource.match(
      /import\s*\{([^}]*)\}\s*from\s*["']@\/components\/rails\/rail-instructions["']/,
    );
    expect(importMatch).not.toBeNull();
    const names = importMatch![1]
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    expect(names).toEqual(["ExampleRailFigure"]);
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
