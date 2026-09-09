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

/**
 * Source-contract test for the pick/drag state machine's wiring (D-08, 260909-ktq): a shaper gets
 * one shared rule for "what a tap means" across both drawings, never a hand-mirrored copy per
 * viewer — asserted on source text, not by rendering, for the same reason as the describes above
 * (the `node` test environment, and the viewers' own import chain reaching the database client
 * through the design store).
 */
describe("outline-viewer.tsx: shares the pick/drag state machine, never re-implements it", () => {
  const source = readSource(OUTLINE_VIEWER_PATH);

  it("imports the shared pick/drag module rather than a hand-mirrored copy", () => {
    expect(source).toContain("@/components/viewer/drag-selection");
  });

  it("calls nextSelection at least twice — a press decides, a lift decides", () => {
    expect(source.match(/nextSelection\(/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("calls remoteDragPoint exactly once — one place computes the moved point", () => {
    expect(source.match(/remoteDragPoint\(/g)?.length).toBe(1);
  });

  it("measures the gesture's travel and hands it to the module, rather than its own threshold", () => {
    expect(source).toContain("travelPx");
  });

  it("renders data-selected, the picked-point hook the browser tests locate", () => {
    expect(source).toContain("data-selected");
  });

  it("still has exactly one onPointerDown handler", () => {
    expect(source.match(/onPointerDown/g)?.length).toBe(1);
  });

  it("still adds no mouse-specific or touch-specific handler beside the pointer handlers", () => {
    expect(source).not.toMatch(/onMouseDown|onTouchStart|onMouseMove|onTouchMove/);
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

/**
 * Source-contract test for the pick/drag state machine's wiring (D-08, 260909-ktq) — the rocker's
 * own copy of the assertions above. RED until Task 3 wires the rocker viewer the same way the
 * outline viewer already is.
 */
describe("rocker-viewer.tsx: shares the pick/drag state machine, never re-implements it", () => {
  const source = readSource(ROCKER_VIEWER_PATH);

  it("imports the shared pick/drag module rather than a hand-mirrored copy", () => {
    expect(source).toContain("@/components/viewer/drag-selection");
  });

  it("calls nextSelection at least twice — a press decides, a lift decides", () => {
    expect(source.match(/nextSelection\(/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("calls remoteDragPoint exactly once — one place computes the moved point", () => {
    expect(source.match(/remoteDragPoint\(/g)?.length).toBe(1);
  });

  it("measures the gesture's travel and hands it to the module, rather than its own threshold", () => {
    expect(source).toContain("travelPx");
  });

  it("renders data-selected, the picked-point hook the browser tests locate", () => {
    expect(source).toContain("data-selected");
  });

  it("still has exactly one onPointerDown handler", () => {
    expect(source.match(/onPointerDown/g)?.length).toBe(1);
  });

  it("still adds no mouse-specific or touch-specific handler beside the pointer handlers", () => {
    expect(source).not.toMatch(/onMouseDown|onTouchStart|onMouseMove|onTouchMove/);
  });
});
