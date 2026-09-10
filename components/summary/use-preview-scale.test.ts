import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { previewScale } from "./use-preview-scale";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/**
 * The phone preview's scale rule, stated once in JavaScript for the engines whose stylesheet cannot
 * divide two lengths (260909-wrz). It has to be the SAME rule `app/design/summary/order-form.css`
 * writes in CSS — `min(1, 100cqw / design width)` — or an engine that can do the division and one
 * that cannot would show a different-sized preview.
 */
describe("previewScale — the phone preview's scale rule (260909-wrz)", () => {
  it("is the page's content width over the design width", () => {
    // An iPhone 14: 390 dots wide, less the page wrapper's 24px of padding each side.
    expect(previewScale(342, 880)).toBeCloseTo(342 / 880, 6);
    // A Pixel 7: 412 wide, same padding.
    expect(previewScale(364, 880)).toBeCloseTo(364 / 880, 6);
  });

  it("never draws the sheet larger than its design size", () => {
    expect(previewScale(880, 880)).toBe(1);
    expect(previewScale(1232, 880)).toBe(1);
  });

  it("matches the stylesheet's own expression, written as a plain division", () => {
    const css = readFileSync(join(REPO_ROOT, "app/design/summary/order-form.css"), "utf8").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
    expect(css).toMatch(
      /--order-form-preview-scale:\s*min\(\s*1,\s*calc\(\s*100cqw\s*\/\s*var\(--order-form-design-width\)\s*\)\s*\)/,
    );
  });
});
