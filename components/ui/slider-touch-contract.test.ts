import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source-contract tests for components/ui/slider.tsx (260909-kyz), in the same idiom
 * components/rails/view-full-sized-dialog.test.ts already uses: read the real source off disk and
 * assert on its text, so a regression here fails a build instead of a shaper's finger.
 *
 * The bug this pins: every slider used to render TWO thumbs stacked exactly on top of each other,
 * because the fallback that decides thumb count built a two-entry `[min, max]` array whenever
 * `value`/`defaultValue` was a plain number (which is every slider in this app — there is no
 * two-ended range slider anywhere). Base UI only ever tracks the one real value, so a press
 * anywhere but the dot looked up the wrong thumb and did nothing — roughly 71% of a 151px bar was
 * dead to a finger. If this fallback ever regresses back to a two-entry array, a shaper loses the
 * bar entirely and can only move a slider by landing exactly on its 12px dot.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SLIDER_PATH = "components/ui/slider.tsx";

/** Strips `//` line comments and block comments, the same helper this repo's other
 * source-contract tests already copy from lib/theme.test.ts, so this file's own prose (which
 * necessarily discusses the very patterns it pins) can never false-positive an assertion. */
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

describe("components/ui/slider.tsx — one dot per slider, and the bar takes a finger (260909-kyz)", () => {
  it("a scalar value/defaultValue falls back to a ONE-entry array, never the old two-entry [min, max]", () => {
    const source = readStripped(SLIDER_PATH);
    // A shaper loses the bar entirely if this ever goes back to a two-entry fallback: with two
    // thumbs at the identical position, Base UI (which tracks only one value) looks up the wrong
    // one the moment a press lands anywhere but the dot.
    expect(source, "the scalar fallback must build a one-entry array").toMatch(
      /:\s*\[value\s*\?\?\s*defaultValue\s*\?\?\s*min\]/,
    );
    // The bug's exact old shape must not reappear.
    expect(source, "the old two-entry [min, max] fallback must not reappear").not.toMatch(
      /:\s*\[min,\s*max\]/,
    );
  });

  it("the Track carries the no-scroll touch utility, so a vertical wander mid-drag can't scroll the page out from under a shaper", () => {
    const source = readStripped(SLIDER_PATH);
    const trackClassMatch = source.match(/data-slot="slider-track"[\s\S]*?className="([^"]+)"/);
    expect(trackClassMatch, "could not find the Track's class string").not.toBeNull();
    expect(trackClassMatch![1]).toContain("touch-none");
  });

  it("the Thumb carries the no-scroll touch utility AND keeps its 44px finger-target ring", () => {
    const source = readStripped(SLIDER_PATH);
    const thumbClassMatch = source.match(/data-slot="slider-thumb"[\s\S]*?className="([^"]+)"/);
    expect(thumbClassMatch, "could not find the Thumb's class string").not.toBeNull();
    const thumbClass = thumbClassMatch![1];
    expect(thumbClass, "the Thumb's class string is missing touch-none").toContain("touch-none");
    // The 44px coarse-pointer finger target this app already relies on (e2e/touch-sizing.spec.ts)
    // must not be lost by accident while adding touch-none.
    expect(thumbClass, "the Thumb's class string lost its coarse-pointer 44px ring").toContain(
      "coarse:after:-inset-4",
    );
  });
});
