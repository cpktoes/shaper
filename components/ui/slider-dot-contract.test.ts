import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source contract for the slider dot's remount-when-shown guard (quick task 260909-nvw). The
 * behaviour itself is proved on a production build by e2e/prod/slider-dots.spec.ts; this pins the
 * wiring in components/ui/slider.tsx so a shadcn regeneration or a tidy-up cannot quietly drop it:
 * the control carries the ref the observer watches, and the dot's key carries the epoch that
 * remounts it. Comments are stripped first so this file's own prose cannot satisfy an assertion.
 */
const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
}

describe("components/ui/slider.tsx keeps every dot on screen once its row is", () => {
  const source = stripComments(readFileSync(join(REPO_ROOT, "components/ui/slider.tsx"), "utf8"));

  it("watches the control's size from the parent's layout effect", () => {
    expect(source).toContain("useLayoutEffect(");
    expect(source).toContain("new ResizeObserver(");
    expect(source).toMatch(/<SliderPrimitive\.Control\s+ref=\{controlRef\}/);
  });

  it("remounts the dot through an epoch in its key, never the bare index", () => {
    expect(source).toMatch(/key=\{`\$\{index\}-\$\{thumbEpoch\}`\}/);
    expect(source).not.toMatch(/key=\{index\}/);
  });

  it("bumps the epoch only when the control goes from no width to some width", () => {
    expect(source).toContain("if (wasHidden && !hidden) setEpoch(");
  });
});
