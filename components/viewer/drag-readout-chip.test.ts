import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source-contract test for the drag readout chip (D-17, 09-07 Task 2), mirroring
 * `drag-pick-wiring.test.ts`'s own idiom: read the real viewer source and assert a structural
 * property, since neither viewer can be rendered in this suite's `node` environment.
 *
 * (Since Phase 11 only the outline viewer draws the chip — the rocker's half below now proves it
 * is gone; see that describe's own comment.)
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

  // Quick task 260909-oge: the card steps clear of the board it is reading, through the one
  // shared rule both viewers call — pinned here so a future edit cannot quietly revert one
  // drawing to the old on-top-of-the-board placement while the other keeps the new one.
  it("calls the shared board-avoidance rule, not a private copy of it", () => {
    expect(source).toContain("placeReadoutClearOfBoard");
    expect(source).toContain("@/components/viewer/readout-placement");
  });

  it("builds its silhouette through boardSection, the shared rule's own input shape", () => {
    expect(source).toContain("boardSection");
  });

  it("carries the data-board-silhouette hook the browser tests depend on", () => {
    expect(source).toContain("data-board-silhouette");
  });
});

/**
 * The rocker drawing's side since Phase 11 (D-14): the readout card only ever read back the slider
 * a finger was steering by dragging a handle, and the handles retired with the Bezier they
 * steered — so the rocker drawing draws no readout card at all now. What this suite still guards
 * on it is the part that outlives the card: no bare conversion factor, never markup built from a
 * string (the blank's vendor and name now reach the drawing's accessible name — threat T-11-21),
 * and the silhouette hook the browser tests locate.
 */
describe("rocker-viewer.tsx: no drag readout chip since Phase 11 (D-14)", () => {
  const stripped = stripComments(readSource(ROCKER_VIEWER_PATH));

  it("renders no readout chip and keeps no touch-drag state to draw one from", () => {
    expect(stripped).not.toContain("data-readout-chip");
    expect(stripped).not.toMatch(/touchDragTarget|touchFingerBoard|readoutChip/);
    expect(stripped).not.toContain("placeReadoutClearOfBoard");
    expect(stripped).not.toContain("@/components/viewer/readout-placement");
  });

  it("never reaches for a bare imperial conversion factor or builds markup from a string", () => {
    expect(stripped).not.toMatch(/25\.4/);
    expect(stripped).not.toContain("dangerouslySetInnerHTML");
  });

  it("puts the blank's vendor and name only into a plain aria-label attribute", () => {
    expect(stripped).toMatch(/aria-label=\{ariaLabel\}/);
    expect(stripped).toContain("blank.record.vendor");
    expect(stripped).toContain("blank.record.name");
  });

  it("carries the data-board-silhouette hook the browser tests depend on", () => {
    expect(stripped).toContain("data-board-silhouette");
  });
});
