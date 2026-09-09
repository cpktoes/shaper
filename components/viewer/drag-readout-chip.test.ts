import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source-contract test for the drag readout chip (D-17, 09-07 Task 2), mirroring
 * `drag-pick-wiring.test.ts`'s own idiom: read the real viewer source and assert a structural
 * property, since neither viewer can be rendered in this suite's `node` environment.
 *
 * RED (this commit): every assertion fails — neither viewer yet draws a readout chip at all.
 * GREEN (the next commit): both viewers gain a touch-only chip built from `CalloutChipFrame` and
 * `CALLOUT_PX`, inked in the accent colour, and this file goes green with no further edits.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OUTLINE_VIEWER_PATH = join(REPO_ROOT, "components/outline/outline-viewer.tsx");
const ROCKER_VIEWER_PATH = join(REPO_ROOT, "components/rocker/rocker-viewer.tsx");

/** Strips `//` line comments and `/* *\/` block comments, the same helper
 * `toolbar-button.test.ts` uses — needed here so a doc comment mentioning "25.4" in prose (there
 * is none today, but a future editor could add one) never trips the banned-formatter check. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

describe("outline-viewer.tsx: the drag readout chip", () => {
  const source = readSource(OUTLINE_VIEWER_PATH);
  const stripped = stripComments(source);

  it("reuses CalloutChipFrame and CALLOUT_PX rather than a new chip component", () => {
    expect(source).toContain("CalloutChipFrame");
    expect(source).toContain("CALLOUT_PX");
  });

  it("inks the live reading in the accent colour", () => {
    expect(source).toContain("surf-accent-ink");
  });

  it("renders only for a touch pointer", () => {
    expect(source).toContain('"touch"');
  });

  it("actually reads touchDragTarget to decide what to draw, not only to set/clear it", () => {
    // 09-07 Task 1 already sets/clears this state (3 occurrences: the declaration and the two
    // pointer handlers); Task 2 has to READ it too, to find the chip's own anchor and text.
    expect(source.match(/touchDragTarget/g)?.length ?? 0).toBeGreaterThan(3);
  });

  it("never reaches for a bare imperial conversion factor or builds markup from a string", () => {
    expect(stripped).not.toMatch(/25\.4/);
    expect(stripped).not.toContain("dangerouslySetInnerHTML");
  });
});

describe("rocker-viewer.tsx: the drag readout chip", () => {
  const source = readSource(ROCKER_VIEWER_PATH);
  const stripped = stripComments(source);

  it("reuses CalloutChipFrame and CALLOUT_PX rather than a new chip component", () => {
    expect(source).toContain("CalloutChipFrame");
    expect(source).toContain("CALLOUT_PX");
  });

  it("inks the live reading in the accent colour", () => {
    expect(source).toContain("surf-accent-ink");
  });

  it("renders only for a touch pointer", () => {
    expect(source).toContain('"touch"');
  });

  it("actually reads touchDragTarget to decide what to draw, not only to set/clear it", () => {
    expect(source.match(/touchDragTarget/g)?.length ?? 0).toBeGreaterThan(3);
  });

  it("never reaches for a bare imperial conversion factor or builds markup from a string", () => {
    expect(stripped).not.toMatch(/25\.4/);
    expect(stripped).not.toContain("dangerouslySetInnerHTML");
  });
});
