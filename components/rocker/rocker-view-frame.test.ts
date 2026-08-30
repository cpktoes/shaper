import { describe, expect, it } from "vitest";
import { BOARD_LENGTH_RANGE_IN } from "@/lib/geometry/board";
import {
  PAD_X,
  PAD_TOP,
  RAIL_GAP,
  RAIL_LABEL_HEIGHT,
  STATION_CARD_HEIGHT,
  STATION_CARD_WIDTH,
  VIEW_W,
  rockerViewLayout,
  stationCardRect,
  type RockerViewOrientation,
} from "./rocker-view-frame";

/** The worst-case deck height (`ROCKER_LIFT_RANGE_IN.max + FOIL_THICKNESS_RANGE_IN.max`) this
 * viewer always reserves on the frame's cross axis — matches planner finding 5's own 14in. */
const MAX_DECK_IN = 14;

/** Board lengths from 60in (5'0") to 120in (10'0") in 6in steps, matching the plan's own sweep. */
const LENGTHS_IN = Array.from(
  { length: (BOARD_LENGTH_RANGE_IN.max - BOARD_LENGTH_RANGE_IN.min) / 6 + 1 },
  (_, i) => BOARD_LENGTH_RANGE_IN.min + i * 6,
);

const ORIENTATIONS: RockerViewOrientation[] = ["horizontal", "vertical"];

describe("rockerViewLayout — legacy pin (fitToBoard: false)", () => {
  it("returns a length-independent frame, matching the order form's path today", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation: "horizontal", fitToBoard: false });
      expect(layout.scale).toBeCloseTo((VIEW_W - PAD_X * 2) / BOARD_LENGTH_RANGE_IN.max, 10);
      expect(layout.minX).toBe(0);
      expect(layout.minY).toBe(0);
      expect(layout.width).toBe(900);
      expect(layout.height).toBeCloseTo(199.666666, 5);
    }
  });
});

describe("rockerViewLayout — fit (fitToBoard: true)", () => {
  it("scales every board's own length to span the full 820-unit drawing area", () => {
    for (const lengthIn of LENGTHS_IN) {
      const layout = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation: "horizontal", fitToBoard: true });
      expect(lengthIn * layout.scale).toBeCloseTo(VIEW_W - PAD_X * 2, 6);
    }
  });
});

describe("rockerViewLayout — maximisation", () => {
  it("draws the board's own span at at least 88% of the frame's long axis, in both orientations", () => {
    for (const orientation of ORIENTATIONS) {
      for (const lengthIn of LENGTHS_IN) {
        const layout = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation, fitToBoard: true });
        const span = lengthIn * layout.scale;
        const longAxis = orientation === "horizontal" ? layout.width : layout.height;
        expect(span / longAxis).toBeGreaterThanOrEqual(0.88);
      }
    }
  });

  it("draws every board at the same ~91.1% share of the horizontal frame's long axis", () => {
    for (const lengthIn of LENGTHS_IN) {
      const layout = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation: "horizontal", fitToBoard: true });
      const span = lengthIn * layout.scale;
      expect(span / layout.width).toBeCloseTo(820 / 900, 3);
    }
  });
});

describe("rockerViewLayout — proportion", () => {
  it("exposes exactly one scale field, shared by both axes", () => {
    const layout = rockerViewLayout({ lengthIn: 78, maxDeckIn: MAX_DECK_IN, orientation: "horizontal", fitToBoard: true });
    expect(Object.keys(layout)).toContain("scale");
    expect(typeof layout.scale).toBe("number");
  });

  it("gives the frame's cross extent as PAD_TOP + maxDeckIn * scale + RAIL_GAP + RAIL_LABEL_HEIGHT", () => {
    for (const orientation of ORIENTATIONS) {
      for (const fitToBoard of [true, false]) {
        const layout = rockerViewLayout({ lengthIn: 78, maxDeckIn: MAX_DECK_IN, orientation, fitToBoard });
        const expectedCrossExtent = PAD_TOP + MAX_DECK_IN * layout.scale + RAIL_GAP + RAIL_LABEL_HEIGHT;
        expect(layout.viewH).toBeCloseTo(expectedCrossExtent, 8);
      }
    }
  });
});

describe("rockerViewLayout — card pitch", () => {
  it("keeps a positive gutter between neighbouring cards at the tightest case (120in, fit-to-board)", () => {
    const layout = rockerViewLayout({ lengthIn: 120, maxDeckIn: MAX_DECK_IN, orientation: "horizontal", fitToBoard: true });
    const pitch = 12 * layout.scale;
    expect(pitch).toBeCloseTo(82, 6);
    expect(layout.cardWidth).toBeCloseTo(74, 6);
    expect(pitch - layout.cardWidth).toBeCloseTo(8, 6);
  });

  it("only grows the gutter as the board gets shorter", () => {
    let previousGutter = -Infinity;
    for (const lengthIn of LENGTHS_IN.slice().sort((a, b) => b - a)) {
      const layout = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation: "horizontal", fitToBoard: true });
      const gutter = 12 * layout.scale - layout.cardWidth;
      expect(gutter).toBeGreaterThanOrEqual(previousGutter - 1e-9);
      previousGutter = gutter;
    }
  });

  it("STATION_CARD_WIDTH stays 74, derived from the narrowest pitch across the whole length range", () => {
    expect(STATION_CARD_WIDTH).toBeCloseTo(74, 6);
    expect(STATION_CARD_HEIGHT).toBe(50);
  });
});

describe("rockerViewLayout — end cards fit (horizontal)", () => {
  it("keeps the nose-tip and tail-tip cards fully inside the frame, at 60in and 120in", () => {
    for (const lengthIn of [60, 120]) {
      const layout = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation: "horizontal", fitToBoard: true });
      const pxX = (stationIn: number) => PAD_X + (lengthIn - stationIn) * layout.scale;

      const noseCard = stationCardRect(layout, pxX(lengthIn), "horizontal");
      expect(noseCard.x).toBeGreaterThanOrEqual(layout.minX);
      expect(noseCard.x + noseCard.width).toBeLessThanOrEqual(layout.minX + layout.width);

      const tailCard = stationCardRect(layout, pxX(0), "horizontal");
      expect(tailCard.x).toBeGreaterThanOrEqual(layout.minX);
      expect(tailCard.x + tailCard.width).toBeLessThanOrEqual(layout.minX + layout.width);
    }
  });
});

describe("rockerViewLayout — degenerate input", () => {
  it("still produces a finite frame for a zero, negative or NaN length", () => {
    for (const lengthIn of [0, -60, Number.NaN]) {
      for (const orientation of ORIENTATIONS) {
        const layout = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation, fitToBoard: true });
        expect(Number.isFinite(layout.scale)).toBe(true);
        expect(layout.scale).toBeGreaterThan(0);
        expect(Number.isFinite(layout.viewH)).toBe(true);
        expect(Number.isFinite(layout.width)).toBe(true);
        expect(Number.isFinite(layout.height)).toBe(true);
        expect(layout.viewBox).not.toContain("NaN");
      }
    }
  });

  it("falls back to the range-clamped (fixed) scale on a degenerate length", () => {
    const fixedScaleLayout = rockerViewLayout({ lengthIn: 78, maxDeckIn: MAX_DECK_IN, orientation: "horizontal", fitToBoard: false });
    for (const lengthIn of [0, -60, Number.NaN]) {
      const layout = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation: "horizontal", fitToBoard: true });
      expect(layout.scale).toBeCloseTo(fixedScaleLayout.scale, 10);
    }
  });
});
