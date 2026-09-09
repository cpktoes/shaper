import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source-contract test for the delegated drag pick (D-15, PHON-04, 09-07 Task 1), in the house
 * idiom `components/viewer/toolbar-button.test.ts` and `components/viewer/drag-spacing.test.ts`
 * already use: read the real viewer source files and assert a structural property, since neither
 * viewer can be rendered here — `vitest.config.ts` runs `components/**\/*.test.ts` in the `node`
 * environment (no DOM), and the two viewers' own import chains pull in the DB client through the
 * design store, the same reason `drag-spacing.test.ts` scrapes `outline-viewer.tsx`'s source
 * instead of importing it.
 *
 * RED (this commit): every assertion below fails against today's per-circle `onPointerDown`
 * wiring — RESEARCH.md's own Pitfall 2. GREEN (the next commit) rewires both viewers to the one
 * delegated pick per drawing and this file goes green with no further edits.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OUTLINE_VIEWER_PATH = join(REPO_ROOT, "components/outline/outline-viewer.tsx");
const ROCKER_VIEWER_PATH = join(REPO_ROOT, "components/rocker/rocker-viewer.tsx");

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

describe("outline-viewer.tsx: one delegated drag pick, finger-sized zones, no long-press popup", () => {
  const source = readSource(OUTLINE_VIEWER_PATH);

  it("delegates the drag-start pick to nearestOutlineDragTarget", () => {
    expect(source).toContain("nearestOutlineDragTarget");
  });

  it("has exactly one onPointerDown handler — one pick per drawing, not one per point", () => {
    expect(source.match(/onPointerDown/g)?.length).toBe(1);
  });

  it("adds no mouse-specific or touch-specific handler beside the pointer handlers", () => {
    expect(source).not.toMatch(/onMouseDown|onTouchStart|onMouseMove|onTouchMove/);
  });

  it("suppresses the iOS long-press callout on every hit circle and the root svg", () => {
    expect(source.match(/WebkitTouchCallout/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("marks select-none in at least two places (hit circles and the root svg)", () => {
    expect(source.match(/select-none/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("imports the measured phone hit radius instead of keeping a private 15px constant", () => {
    expect(source).toContain("OUTLINE_DRAG_HIT_COARSE_PX");
    expect(source).not.toMatch(/const DRAG_HIT_PX = 15/);
  });

  it("chooses the hit radius by pointer type via useCoarsePointer", () => {
    expect(source).toContain("useCoarsePointer");
  });
});

describe("rocker-viewer.tsx: one delegated drag pick, finger-sized zones, no long-press popup", () => {
  const source = readSource(ROCKER_VIEWER_PATH);

  it("delegates the drag-start pick to nearestSideProfileDragTarget", () => {
    expect(source).toContain("nearestSideProfileDragTarget");
  });

  it("has exactly one onPointerDown handler — one pick per drawing, not one per point", () => {
    expect(source.match(/onPointerDown/g)?.length).toBe(1);
  });

  it("adds no mouse-specific or touch-specific handler beside the pointer handlers", () => {
    expect(source).not.toMatch(/onMouseDown|onTouchStart|onMouseMove|onTouchMove/);
  });

  it("suppresses the iOS long-press callout on every hit circle and the root svg", () => {
    expect(source.match(/WebkitTouchCallout/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("marks select-none in at least two places (hit circles and the root svg)", () => {
    expect(source.match(/select-none/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("imports the measured phone hit radius instead of keeping a private 15px constant", () => {
    expect(source).toContain("SIDE_PROFILE_DRAG_HIT_COARSE_PX");
    expect(source).not.toMatch(/const DRAG_HIT_PX = 15/);
  });

  it("chooses the hit radius by pointer type via useCoarsePointer", () => {
    expect(source).toContain("useCoarsePointer");
  });
});
