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

/** Every station a real board's output rail reads out, in canonical station-inches from the
 * tail — the same five `rocker-viewer.tsx` itself draws (tail tip, tail@12, centre, nose@12,
 * nose tip). Task 2's own containment/clearance/non-overlap tests exercise all five, not just
 * the two tips, since a middle card overlapping a neighbour would be just as real a defect. */
function stationsIn(lengthIn: number): number[] {
  return [0, 12, lengthIn / 2, lengthIn - 12, lengthIn];
}

describe("rockerViewLayout — vertical: containment", () => {
  it("keeps all five station cards fully inside the frame, at 60in, 78in and 120in", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation: "vertical", fitToBoard: true });
      const pxX = (stationIn: number) => PAD_X + (lengthIn - stationIn) * layout.scale;
      for (const stationIn of stationsIn(lengthIn)) {
        const card = stationCardRect(layout, pxX(stationIn), "vertical");
        expect(card.x).toBeGreaterThanOrEqual(layout.minX);
        expect(card.x + card.width).toBeLessThanOrEqual(layout.minX + layout.width);
        expect(card.y).toBeGreaterThanOrEqual(layout.minY);
        expect(card.y + card.height).toBeLessThanOrEqual(layout.minY + layout.height);
      }
    }
  });

  it("keeps the tail-tip card's own overhang past the tail inside the frame (today it runs off the end)", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation: "vertical", fitToBoard: true });
      const pxX = (stationIn: number) => PAD_X + (lengthIn - stationIn) * layout.scale;
      const tailCard = stationCardRect(layout, pxX(0), "vertical");
      expect(tailCard.y + tailCard.height).toBeLessThanOrEqual(layout.minY + layout.height);
    }
  });
});

describe("rockerViewLayout — vertical: clearance", () => {
  it("keeps every card's near edge at least RAIL_GAP from the baseline, on the rail side", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation: "vertical", fitToBoard: true });
      const pxX = (stationIn: number) => PAD_X + (lengthIn - stationIn) * layout.scale;
      // The physical baseline, drawn directly by the outer rotate(90) group (not through
      // `Upright`), lands at canonical-x = -baselineY in the rotated frame — the same identity
      // `stationCardRect`'s own doc comment uses for a plain rotated point.
      const baselineFinalX = -layout.baselineY;
      for (const stationIn of stationsIn(lengthIn)) {
        const card = stationCardRect(layout, pxX(stationIn), "vertical");
        const nearEdge = card.x + card.width; // the edge closest to the rail/baseline (x -> 0)
        expect(baselineFinalX - nearEdge).toBeGreaterThanOrEqual(RAIL_GAP - 1e-9);
      }
    }
  });
});

describe("rockerViewLayout — vertical: the board box and the label's run-room", () => {
  it("keeps the board's own box (nose to tail, baseline to worst-case deck) inside the frame", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation: "vertical", fitToBoard: true });
      const pxX = (stationIn: number) => PAD_X + (lengthIn - stationIn) * layout.scale;
      const pxY = (heightIn: number) => layout.baselineY - heightIn * layout.scale;
      // The board's own path is drawn directly (not through `Upright`), so canonical (x, y) maps
      // to final (-y, x) under the plain rotate(90) group.
      const corners = [
        { x: pxX(lengthIn), y: pxY(0) }, // nose tip, baseline
        { x: pxX(0), y: pxY(0) }, // tail tip, baseline
        { x: pxX(lengthIn), y: pxY(MAX_DECK_IN) }, // nose tip, worst-case deck
        { x: pxX(0), y: pxY(MAX_DECK_IN) }, // tail tip, worst-case deck
      ];
      for (const c of corners) {
        const finalX = -c.y;
        const finalY = c.x;
        expect(finalX).toBeGreaterThanOrEqual(layout.minX);
        expect(finalX).toBeLessThanOrEqual(layout.minX + layout.width);
        expect(finalY).toBeGreaterThanOrEqual(layout.minY);
        expect(finalY).toBeLessThanOrEqual(layout.minY + layout.height);
      }
    }
  });

  it("leaves at least 150 units of run-room from the length label's anchor toward the frame's far cross edge", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation: "vertical", fitToBoard: true });
      // The label's own Upright anchor is canonical (PAD_X, PAD_TOP - 8); under the composition
      // identity (finding 4) it lands at final (-(PAD_TOP - 8), PAD_X) — see `rocker-viewer.tsx`'s
      // own `<Upright x={PAD_X} y={PAD_TOP - 8}>` call.
      const labelFinalX = -(PAD_TOP - 8);
      const runRoom = labelFinalX - layout.minX;
      expect(runRoom).toBeGreaterThanOrEqual(150);
    }
  });
});

describe("rockerViewLayout — vertical: non-overlap", () => {
  it("keeps a positive gutter between adjacent cards along the station axis, at the tightest pitch (120in)", () => {
    const layout = rockerViewLayout({ lengthIn: 120, maxDeckIn: MAX_DECK_IN, orientation: "vertical", fitToBoard: true });
    const pxX = (stationIn: number) => PAD_X + (120 - stationIn) * layout.scale;
    // Nose (largest stationIn) projects to the SMALLEST long-axis position, so sort the resulting
    // cards by their own `y`, not by raw station inches, to walk them nose-to-tail.
    const cards = stationsIn(120)
      .map((s) => stationCardRect(layout, pxX(s), "vertical"))
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < cards.length; i++) {
      const gutter = cards[i].y - (cards[i - 1].y + cards[i - 1].height);
      expect(gutter).toBeGreaterThan(0);
    }
  });
});

describe("rockerViewLayout — vertical: maximisation and independence", () => {
  it("draws the board's own span at at least 88% of the vertical frame's long axis (height)", () => {
    for (const lengthIn of LENGTHS_IN) {
      const layout = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation: "vertical", fitToBoard: true });
      const span = lengthIn * layout.scale;
      expect(span / layout.height).toBeGreaterThanOrEqual(0.88);
    }
  });

  it("is NOT the horizontal frame transposed — its own long/cross extents differ from the horizontal frame's", () => {
    for (const lengthIn of [60, 78, 120]) {
      const horizontalLayout = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation: "horizontal", fitToBoard: true });
      const verticalLayout = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation: "vertical", fitToBoard: true });
      expect(verticalLayout.width).not.toBeCloseTo(horizontalLayout.height, 1);
      expect(verticalLayout.height).not.toBeCloseTo(horizontalLayout.width, 1);
    }
  });
});

describe("rockerViewLayout — horizontal frame unchanged by the vertical work above", () => {
  it("still returns exactly Task 1's numbers", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation: "horizontal", fitToBoard: true });
      expect(layout.minX).toBe(0);
      expect(layout.minY).toBe(0);
      expect(layout.width).toBe(900);
      expect(lengthIn * layout.scale).toBeCloseTo(820, 6);
    }
  });
});
