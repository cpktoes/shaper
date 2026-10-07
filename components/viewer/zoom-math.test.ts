import { describe, expect, it } from "vitest";
import {
  baseFit,
  clientToUser,
  DEFAULT_MAX_ZOOM,
  formatViewBox,
  formatZoomLevel,
  normaliseWheelDelta,
  parseViewBox,
  snapZoom,
  stepZoom,
  WHEEL_BURST_GAP_MS,
  WHEEL_STEP_PX,
  wheelStep,
  zoomAt,
  zoomedView,
  type ClientSize,
  type ViewRect,
  type ZoomState,
} from "./zoom-math";

/**
 * Unit tests for the drawing viewers' zoom maths (quick 261007-fnz). The figures are ROCKER's own,
 * measured at plan time on a 1280×800 computer: the side view's frame is 900 × 353.44 drawing
 * units, drawn in an 804 × 614 box (M1, M11).
 */

const ROCKER_BASE: ViewRect = { x: 0, y: 0, width: 900, height: 353.44 };
const ROCKER_CLIENT: ClientSize = { width: 804, height: 614 };
/** A box with the frame's own shape, so neither axis is ever letterboxed. */
const SAME_ASPECT_CLIENT: ClientSize = { width: 900 * 0.8, height: 353.44 * 0.8 };
const ONE: ZoomState = { zoom: 1, center: null };

function inside(view: ViewRect, base: ViewRect) {
  const eps = 1e-9;
  if (view.width <= base.width) {
    expect(view.x).toBeGreaterThanOrEqual(base.x - eps);
    expect(view.x + view.width).toBeLessThanOrEqual(base.x + base.width + eps);
  } else {
    expect(view.x + view.width / 2).toBeCloseTo(base.x + base.width / 2, 9);
  }
  if (view.height <= base.height) {
    expect(view.y).toBeGreaterThanOrEqual(base.y - eps);
    expect(view.y + view.height).toBeLessThanOrEqual(base.y + base.height + eps);
  } else {
    expect(view.y + view.height / 2).toBeCloseTo(base.y + base.height / 2, 9);
  }
}

describe("snapZoom / stepZoom / formatZoomLevel", () => {
  it("rounds to the nearest half step and clamps to [1, maxZoom]", () => {
    expect(snapZoom(2.3, 10)).toBe(2.5);
    expect(snapZoom(2.2, 10)).toBe(2);
    expect(snapZoom(0.4, 10)).toBe(1);
    expect(snapZoom(Number.NaN, 10)).toBe(1);
    expect(snapZoom(Number.POSITIVE_INFINITY, 10)).toBe(1);
    expect(snapZoom(14, 10)).toBe(10);
    expect(snapZoom(4.4, 4)).toBe(4);
  });

  it("floors a maxZoom that is not a half step to one", () => {
    expect(snapZoom(9, 3.7)).toBe(3.5);
    expect(snapZoom(9, 0.3)).toBe(1);
  });

  it("steps half a level at a time, never below 1 or above the maximum", () => {
    expect(stepZoom(1, -1, 10)).toBe(1);
    expect(stepZoom(9.5, 3, 10)).toBe(10);
    expect(stepZoom(1, 1, 10)).toBe(1.5);
    expect(stepZoom(3, -2, DEFAULT_MAX_ZOOM)).toBe(2);
  });

  it("writes the level the way the control shows it", () => {
    expect(formatZoomLevel(1)).toBe("1x");
    expect(formatZoomLevel(2.5)).toBe("2.5x");
    expect(formatZoomLevel(10)).toBe("10x");
  });
});

describe("parseViewBox / formatViewBox", () => {
  it("reads ROCKER's own viewBox string", () => {
    expect(parseViewBox("0.00 0.00 900.00 353.44")).toEqual(ROCKER_BASE);
    expect(parseViewBox("-104,-16,514,638")).toEqual({ x: -104, y: -16, width: 514, height: 638 });
  });

  it("returns null for a malformed string", () => {
    expect(parseViewBox("")).toBeNull();
    expect(parseViewBox("0 0 900")).toBeNull();
    expect(parseViewBox("0 0 abc 353")).toBeNull();
    expect(parseViewBox("0 0 0 353")).toBeNull();
    expect(parseViewBox("0 0 900 -1")).toBeNull();
  });

  it("round-trips the four numbers", () => {
    const s = "0.00 0.00 900.00 353.44";
    expect(parseViewBox(formatViewBox(parseViewBox(s) as ViewRect))).toEqual(parseViewBox(s));
    const odd: ViewRect = { x: 12.3456, y: -7.25, width: 100.5, height: 33.125 };
    expect(parseViewBox(formatViewBox(odd))).toEqual(odd);
  });
});

describe("baseFit / zoomedView", () => {
  it("is the meet fit, and 0 until the box is measured", () => {
    expect(baseFit(ROCKER_BASE, ROCKER_CLIENT)).toBeCloseTo(804 / 900, 12);
    expect(baseFit(ROCKER_BASE, { width: 0, height: 0 })).toBe(0);
  });

  it("returns the base rectangle itself at zoom 1", () => {
    expect(zoomedView(ROCKER_BASE, ROCKER_CLIENT, ONE)).toBe(ROCKER_BASE);
  });

  it("returns the base rectangle while the box is unmeasured", () => {
    expect(zoomedView(ROCKER_BASE, { width: 0, height: 0 }, { zoom: 3, center: null })).toBe(ROCKER_BASE);
  });

  it("at zoom 3 is the box's own shape, a third of the fitted size, inside the base", () => {
    const fit = baseFit(ROCKER_BASE, ROCKER_CLIENT);
    const view = zoomedView(ROCKER_BASE, ROCKER_CLIENT, { zoom: 3, center: { x: 5, y: 5 } });
    expect(view.width).toBeCloseTo(ROCKER_CLIENT.width / (fit * 3), 9);
    expect(view.height).toBeCloseTo(ROCKER_CLIENT.height / (fit * 3), 9);
    inside(view, ROCKER_BASE);
    expect(view.x).toBe(ROCKER_BASE.x);
  });

  it("centres an axis where the zoomed view is still wider than the base", () => {
    // 614 / (0.893 × 1.5) ≈ 458 units tall, more than the frame's 353.44.
    const view = zoomedView(ROCKER_BASE, ROCKER_CLIENT, { zoom: 1.5, center: { x: 100, y: 0 } });
    expect(view.height).toBeGreaterThan(ROCKER_BASE.height);
    inside(view, ROCKER_BASE);
  });
});

describe("clientToUser", () => {
  it("undoes the letterboxed meet mapping of the base", () => {
    // 804 × 614 box, 900 × 353.44 frame: fit 0.8933, the frame drawn 315.7 px tall, centred.
    const fit = 804 / 900;
    const top = (614 - 353.44 * fit) / 2;
    const p = clientToUser(ROCKER_BASE, ROCKER_CLIENT, 402, top + 100 * fit);
    expect(p.x).toBeCloseTo(450, 9);
    expect(p.y).toBeCloseTo(100, 9);
  });
});

describe("zoomAt", () => {
  it("holds the point under the pointer still, stepping 1 → 1.5 → … → 6", () => {
    const px = 300;
    const py = 120;
    let state: ZoomState = ONE;
    const start = clientToUser(zoomedView(ROCKER_BASE, SAME_ASPECT_CLIENT, state), SAME_ASPECT_CLIENT, px, py);
    for (let z = 1.5; z <= 6; z += 0.5) {
      state = zoomAt(ROCKER_BASE, SAME_ASPECT_CLIENT, state, z, px, py);
      expect(state.zoom).toBe(z);
      const now = clientToUser(zoomedView(ROCKER_BASE, SAME_ASPECT_CLIENT, state), SAME_ASPECT_CLIENT, px, py);
      expect(Math.abs(now.x - start.x)).toBeLessThan(1e-9);
      expect(Math.abs(now.y - start.y)).toBeLessThan(1e-9);
    }
  });

  it("holds the point along the board in ROCKER's own letterboxed box", () => {
    const px = 120;
    const py = 300;
    // Across the board (y) the screen keeps the view centred on the frame until it is shorter than
    // it (and then clamped to its edge for a step); from then on the very point first under the
    // pointer is back under it (`ZoomState.anchor`).
    let state: ZoomState = ONE;
    const start = clientToUser(ROCKER_BASE, ROCKER_CLIENT, px, py);
    for (let z = 1.5; z <= 6; z += 0.5) {
      state = zoomAt(ROCKER_BASE, ROCKER_CLIENT, state, z, px, py);
      const view = zoomedView(ROCKER_BASE, ROCKER_CLIENT, state);
      const now = clientToUser(view, ROCKER_CLIENT, px, py);
      expect(Math.abs(now.x - start.x)).toBeLessThan(1e-9);
      if (view.height < ROCKER_BASE.height) expect(Math.abs(now.y - start.y)).toBeLessThan(1e-9);
    }
  });

  it("brings a point the clamp slid off the pointer back under it once the clamp lets go", () => {
    const px = 120;
    const py = 420;
    const start = clientToUser(ROCKER_BASE, ROCKER_CLIENT, px, py);
    let state: ZoomState = ONE;
    let slipped = 0;
    for (let z = 1.5; z <= 6; z += 0.5) {
      state = zoomAt(ROCKER_BASE, ROCKER_CLIENT, state, z, px, py);
      const now = clientToUser(zoomedView(ROCKER_BASE, ROCKER_CLIENT, state), ROCKER_CLIENT, px, py);
      slipped = Math.max(slipped, Math.abs(now.y - start.y));
    }
    expect(slipped).toBeGreaterThan(1);
    const now = clientToUser(zoomedView(ROCKER_BASE, ROCKER_CLIENT, state), ROCKER_CLIENT, px, py);
    expect(Math.abs(now.x - start.x)).toBeLessThan(1e-9);
    expect(Math.abs(now.y - start.y)).toBeLessThan(1e-9);
  });

  it("forgets that point once the pointer moves", () => {
    const at2 = zoomAt(ROCKER_BASE, ROCKER_CLIENT, ONE, 2, 120, 420);
    const shown = clientToUser(zoomedView(ROCKER_BASE, ROCKER_CLIENT, at2), ROCKER_CLIENT, 300, 300);
    const at3 = zoomAt(ROCKER_BASE, ROCKER_CLIENT, at2, 3, 300, 300);
    const now = clientToUser(zoomedView(ROCKER_BASE, ROCKER_CLIENT, at3), ROCKER_CLIENT, 300, 300);
    expect(Math.abs(now.x - shown.x)).toBeLessThan(1e-9);
    expect(Math.abs(now.y - shown.y)).toBeLessThan(1e-9);
  });

  it("keeps the view inside the frame near its edge (the clamp wins)", () => {
    let state: ZoomState = ONE;
    for (let z = 1.5; z <= 10; z += 0.5) {
      state = zoomAt(ROCKER_BASE, ROCKER_CLIENT, state, z, 1, 1);
      inside(zoomedView(ROCKER_BASE, ROCKER_CLIENT, state), ROCKER_BASE);
    }
    state = zoomAt(ROCKER_BASE, ROCKER_CLIENT, state, 4, 803, 613);
    inside(zoomedView(ROCKER_BASE, ROCKER_CLIENT, state), ROCKER_BASE);
  });

  it("goes back to the whole drawing at 1", () => {
    const zoomed = zoomAt(ROCKER_BASE, ROCKER_CLIENT, ONE, 4, 200, 200);
    expect(zoomAt(ROCKER_BASE, ROCKER_CLIENT, zoomed, 1, 10, 10)).toEqual({ zoom: 1, center: null });
    expect(zoomAt(ROCKER_BASE, ROCKER_CLIENT, zoomed, 0.5, 10, 10)).toEqual({ zoom: 1, center: null });
  });

  it("changes nothing while the box is unmeasured", () => {
    expect(zoomAt(ROCKER_BASE, { width: 0, height: 0 }, ONE, 3, 10, 10)).toBe(ONE);
  });
});

describe("wheel feel", () => {
  it("normalises line and page deltas to pixels", () => {
    expect(normaliseWheelDelta(-3, 1, 800)).toBe(-48);
    expect(normaliseWheelDelta(1, 2, 800)).toBe(800);
    expect(normaliseWheelDelta(-100, 0, 800)).toBe(-100);
  });

  it("takes one step in the event's direction after a quiet spell, whatever its size", () => {
    const quiet = { sum: 0, lastMs: -Infinity };
    expect(wheelStep(quiet, -3, 1000).steps).toBe(1);
    expect(wheelStep(quiet, -100, 1000).steps).toBe(1);
    expect(wheelStep(quiet, 250, 1000).steps).toBe(-1);
    expect(wheelStep(quiet, 0, 1000).steps).toBe(0);
    const later = wheelStep({ sum: 40, lastMs: 0 }, -3, WHEEL_BURST_GAP_MS + 1);
    expect(later.steps).toBe(1);
    expect(later.acc.sum).toBe(0);
  });

  it("takes one step per WHEEL_STEP_PX inside a burst", () => {
    let acc = wheelStep({ sum: 0, lastMs: -Infinity }, -4, 0).acc;
    let total = 0;
    let t = 0;
    for (let i = 0; i < 50; i++) {
      t += 16;
      const r = wheelStep(acc, -10, t);
      acc = r.acc;
      total += r.steps;
    }
    expect(total).toBe(Math.trunc(500 / WHEEL_STEP_PX));
    expect(acc.lastMs).toBe(t);
    const back = wheelStep({ sum: 0, lastMs: 0 }, 2 * WHEEL_STEP_PX + 5, 10);
    expect(back.steps).toBe(-2);
    expect(back.acc.sum).toBe(5);
  });
});
