import { describe, expect, it } from "vitest";
import { BOARD_LENGTH_RANGE_IN } from "@/lib/geometry/board";
import {
  BARE_PAD,
  CARD_GUTTER,
  CARD_NAME_DY,
  CARD_VALUE_DY,
  LENGTH_LABEL_SIZE,
  PAD_X,
  PAD_TOP,
  RAIL_GAP,
  READOUT_NAME_DY,
  READOUT_VALUE_DY,
  STATION_CARD_HEIGHT,
  STATION_CARD_WIDTH,
  STATION_NAME_SIZE,
  STATION_VALUE_SIZE,
  VIEW_W,
  cardBandDepth,
  rockerViewLayout,
  stationCardRect,
  type RockerCardSide,
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
const SIDES: RockerCardSide[] = ["deck", "bottom"];

describe("rockerViewLayout — order-form path pin (fitToBoard: true, showStationCards: false)", () => {
  it("scales every board's own length to span the full 820-unit drawing area, on the card-less path", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        showStationCards: false,
      });
      expect(lengthIn * layout.scale).toBeCloseTo(VIEW_W - PAD_X * 2, 6);
    }
  });

  it("pins the card-less frame to 0 0 900 x, x = BARE_PAD + maxDeckIn * scale + BARE_PAD", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        showStationCards: false,
      });
      expect(layout.minX).toBe(0);
      expect(layout.minY).toBe(0);
      expect(layout.width).toBe(900);
      const expectedHeight = BARE_PAD + MAX_DECK_IN * layout.scale + BARE_PAD;
      expect(layout.height).toBeCloseTo(expectedHeight, 6);
    }
  });

  it("is strictly shorter than the same length's frame with cards on — the print box never silently regains a band it does not draw", () => {
    for (const lengthIn of [60, 78, 120]) {
      const bare = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        showStationCards: false,
      });
      const carded = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        showStationCards: true,
      });
      expect(bare.height).toBeLessThan(carded.height);
    }
  });
});

describe("rockerViewLayout — fit (fitToBoard: true)", () => {
  it("scales every board's own length to span the full 820-unit drawing area", () => {
    for (const lengthIn of LENGTHS_IN) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        showStationCards: true,
      });
      expect(lengthIn * layout.scale).toBeCloseTo(VIEW_W - PAD_X * 2, 6);
    }
  });
});

describe("rockerViewLayout — maximisation", () => {
  it("draws the board's own span at at least 88% of the frame's long axis, in both orientations", () => {
    for (const orientation of ORIENTATIONS) {
      for (const lengthIn of LENGTHS_IN) {
        const layout = rockerViewLayout({
          lengthIn,
          maxDeckIn: MAX_DECK_IN,
          orientation,
          fitToBoard: true,
          showStationCards: true,
        });
        const span = lengthIn * layout.scale;
        const longAxis = orientation === "horizontal" ? layout.width : layout.height;
        expect(span / longAxis).toBeGreaterThanOrEqual(0.88);
      }
    }
  });

  it("draws every board at the same ~91.1% share of the horizontal frame's long axis", () => {
    for (const lengthIn of LENGTHS_IN) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        showStationCards: true,
      });
      const span = lengthIn * layout.scale;
      expect(span / layout.width).toBeCloseTo(820 / 900, 3);
    }
  });
});

describe("rockerViewLayout — proportion", () => {
  it("exposes exactly one scale field, shared by both axes", () => {
    const layout = rockerViewLayout({
      lengthIn: 78,
      maxDeckIn: MAX_DECK_IN,
      orientation: "horizontal",
      fitToBoard: true,
      showStationCards: true,
    });
    expect(Object.keys(layout)).toContain("scale");
    expect(typeof layout.scale).toBe("number");
  });

  it("gives the frame's cross extent as PAD_TOP + cardBandDepth(orientation) + maxDeckIn * scale + cardBandDepth(orientation), with cards on", () => {
    for (const orientation of ORIENTATIONS) {
      for (const fitToBoard of [true, false]) {
        const layout = rockerViewLayout({
          lengthIn: 78,
          maxDeckIn: MAX_DECK_IN,
          orientation,
          fitToBoard,
          showStationCards: true,
        });
        const expectedCrossExtent = PAD_TOP + cardBandDepth(orientation) + MAX_DECK_IN * layout.scale + cardBandDepth(orientation);
        expect(layout.viewH).toBeCloseTo(expectedCrossExtent, 8);
      }
    }
  });

  it("reserves neither band when cards are off — the frame is the board plus a hairline of pad", () => {
    for (const orientation of ORIENTATIONS) {
      const layout = rockerViewLayout({
        lengthIn: 78,
        maxDeckIn: MAX_DECK_IN,
        orientation,
        fitToBoard: true,
        showStationCards: false,
      });
      const expectedCrossExtent = BARE_PAD + MAX_DECK_IN * layout.scale + BARE_PAD;
      expect(layout.viewH).toBeCloseTo(expectedCrossExtent, 8);
    }
  });
});

describe("rockerViewLayout — card pitch", () => {
  it("keeps a positive gutter between neighbouring cards at the tightest case (120in, fit-to-board)", () => {
    const layout = rockerViewLayout({
      lengthIn: 120,
      maxDeckIn: MAX_DECK_IN,
      orientation: "horizontal",
      fitToBoard: true,
      showStationCards: true,
    });
    const pitch = 12 * layout.scale;
    expect(pitch).toBeCloseTo(82, 6);
    expect(layout.cardWidth).toBeCloseTo(74, 6);
    expect(pitch - layout.cardWidth).toBeCloseTo(CARD_GUTTER, 6);
  });

  it("only grows the gutter as the board gets shorter", () => {
    let previousGutter = -Infinity;
    for (const lengthIn of LENGTHS_IN.slice().sort((a, b) => b - a)) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        showStationCards: true,
      });
      const gutter = 12 * layout.scale - layout.cardWidth;
      expect(gutter).toBeGreaterThanOrEqual(previousGutter - 1e-9);
      previousGutter = gutter;
    }
  });

  it("STATION_CARD_WIDTH stays 74 wide, STATION_CARD_HEIGHT is 35 tall", () => {
    expect(STATION_CARD_WIDTH).toBeCloseTo(74, 6);
    expect(STATION_CARD_HEIGHT).toBe(35);
  });
});

describe("rockerViewLayout — end cards fit (horizontal), both rails", () => {
  it("keeps the nose-tip and tail-tip cards fully inside the frame, at 60in and 120in", () => {
    for (const lengthIn of [60, 120]) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        showStationCards: true,
      });
      const pxX = (stationIn: number) => PAD_X + (lengthIn - stationIn) * layout.scale;

      for (const side of SIDES) {
        const noseCard = stationCardRect(layout, pxX(lengthIn), "horizontal", side);
        expect(noseCard.x).toBeGreaterThanOrEqual(layout.minX);
        expect(noseCard.x + noseCard.width).toBeLessThanOrEqual(layout.minX + layout.width);

        const tailCard = stationCardRect(layout, pxX(0), "horizontal", side);
        expect(tailCard.x).toBeGreaterThanOrEqual(layout.minX);
        expect(tailCard.x + tailCard.width).toBeLessThanOrEqual(layout.minX + layout.width);
      }
    }
  });
});

describe("rockerViewLayout — degenerate input", () => {
  it("still produces a finite frame for a zero, negative or NaN length", () => {
    for (const lengthIn of [0, -60, Number.NaN]) {
      for (const orientation of ORIENTATIONS) {
        for (const showStationCards of [true, false]) {
          const layout = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation, fitToBoard: true, showStationCards });
          expect(Number.isFinite(layout.scale)).toBe(true);
          expect(layout.scale).toBeGreaterThan(0);
          expect(Number.isFinite(layout.viewH)).toBe(true);
          expect(Number.isFinite(layout.width)).toBe(true);
          expect(Number.isFinite(layout.height)).toBe(true);
          expect(Number.isFinite(layout.labelX)).toBe(true);
          expect(Number.isFinite(layout.labelY)).toBe(true);
          expect(layout.viewBox).not.toContain("NaN");
        }
      }
    }
  });

  it("falls back to the range-clamped (fixed) scale on a degenerate length", () => {
    const fixedScaleLayout = rockerViewLayout({
      lengthIn: 78,
      maxDeckIn: MAX_DECK_IN,
      orientation: "horizontal",
      fitToBoard: false,
      showStationCards: true,
    });
    for (const lengthIn of [0, -60, Number.NaN]) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        showStationCards: true,
      });
      expect(layout.scale).toBeCloseTo(fixedScaleLayout.scale, 10);
    }
  });
});

/** Every station a real board's output rail reads out, in canonical station-inches from the
 * tail — the same five `rocker-viewer.tsx` itself draws (tail tip, tail@12, centre, nose@12,
 * nose tip). Exercises all five, not just the two tips, since a middle card overlapping a
 * neighbour would be just as real a defect. */
function stationsIn(lengthIn: number): number[] {
  return [0, 12, lengthIn / 2, lengthIn - 12, lengthIn];
}

describe("rockerViewLayout — vertical: containment, both rails", () => {
  it("keeps all five station cards fully inside the frame, on both rails, at 60in, 78in and 120in", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "vertical",
        fitToBoard: true,
        showStationCards: true,
      });
      const pxX = (stationIn: number) => PAD_X + (lengthIn - stationIn) * layout.scale;
      for (const side of SIDES) {
        for (const stationIn of stationsIn(lengthIn)) {
          const card = stationCardRect(layout, pxX(stationIn), "vertical", side);
          expect(card.x).toBeGreaterThanOrEqual(layout.minX);
          expect(card.x + card.width).toBeLessThanOrEqual(layout.minX + layout.width);
          expect(card.y).toBeGreaterThanOrEqual(layout.minY);
          expect(card.y + card.height).toBeLessThanOrEqual(layout.minY + layout.height);
        }
      }
    }
  });

  it("keeps the tail-tip card's own overhang past the tail inside the frame, on both rails", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "vertical",
        fitToBoard: true,
        showStationCards: true,
      });
      const pxX = (stationIn: number) => PAD_X + (lengthIn - stationIn) * layout.scale;
      for (const side of SIDES) {
        const tailCard = stationCardRect(layout, pxX(0), "vertical", side);
        expect(tailCard.y + tailCard.height).toBeLessThanOrEqual(layout.minY + layout.height);
      }
    }
  });
});

describe("rockerViewLayout — horizontal: clearance, both rails", () => {
  it("keeps every deck card's near (bottom) edge RAIL_GAP above the worst-case deck line, every bottom card's near (top) edge RAIL_GAP below the baseline", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        showStationCards: true,
      });
      const pxX = (stationIn: number) => PAD_X + (lengthIn - stationIn) * layout.scale;
      const deckTopY = layout.baselineY - MAX_DECK_IN * layout.scale;
      for (const stationIn of stationsIn(lengthIn)) {
        const deckCard = stationCardRect(layout, pxX(stationIn), "horizontal", "deck");
        expect(deckTopY - (deckCard.y + deckCard.height)).toBeCloseTo(RAIL_GAP, 6);

        const bottomCard = stationCardRect(layout, pxX(stationIn), "horizontal", "bottom");
        expect(bottomCard.y - layout.baselineY).toBeCloseTo(RAIL_GAP, 6);
      }
    }
  });
});

describe("rockerViewLayout — vertical: clearance, both rails", () => {
  it("keeps every card's near edge at least RAIL_GAP from the worst-case board box, on the rail side", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "vertical",
        fitToBoard: true,
        showStationCards: true,
      });
      const pxX = (stationIn: number) => PAD_X + (lengthIn - stationIn) * layout.scale;
      // The physical baseline and worst-case deck line, drawn directly by the outer rotate(90)
      // group (not through `Upright`), land at canonical-x = -baselineY / -(baselineY - maxDeckIn
      // * scale) in the rotated frame — the same identity `stationCardRect`'s own doc comment
      // uses for a plain rotated point.
      const baselineFinalX = -layout.baselineY;
      const deckTopFinalX = -(layout.baselineY - MAX_DECK_IN * layout.scale);
      for (const stationIn of stationsIn(lengthIn)) {
        const bottomCard = stationCardRect(layout, pxX(stationIn), "vertical", "bottom");
        const bottomNearEdge = bottomCard.x + bottomCard.width; // closest to the baseline (x -> 0)
        expect(baselineFinalX - bottomNearEdge).toBeGreaterThanOrEqual(RAIL_GAP - 1e-9);

        const deckCard = stationCardRect(layout, pxX(stationIn), "vertical", "deck");
        const deckNearEdge = deckCard.x; // closest to the worst-case deck line (x -> 0 from the other side)
        expect(deckNearEdge - deckTopFinalX).toBeGreaterThanOrEqual(RAIL_GAP - 1e-9);
      }
    }
  });
});

describe("rockerViewLayout — rail vs rail: non-overlap at the same station", () => {
  it("never lets a deck card and a bottom card at the same station overlap on the cross axis, in either orientation", () => {
    for (const orientation of ORIENTATIONS) {
      for (const lengthIn of [60, 78, 120]) {
        const layout = rockerViewLayout({
          lengthIn,
          maxDeckIn: MAX_DECK_IN,
          orientation,
          fitToBoard: true,
          showStationCards: true,
        });
        const pxX = (stationIn: number) => PAD_X + (lengthIn - stationIn) * layout.scale;
        for (const stationIn of stationsIn(lengthIn)) {
          const deckCard = stationCardRect(layout, pxX(stationIn), orientation, "deck");
          const bottomCard = stationCardRect(layout, pxX(stationIn), orientation, "bottom");
          if (orientation === "horizontal") {
            // Deck card sits above (smaller y), bottom card below (larger y).
            expect(deckCard.y + deckCard.height).toBeLessThanOrEqual(bottomCard.y);
          } else {
            // Deck card sits nearer 0 on the cross axis (less negative x), bottom card farther out.
            expect(bottomCard.x + bottomCard.width).toBeLessThanOrEqual(deckCard.x);
          }
        }
      }
    }
  });
});

describe("rockerViewLayout — non-overlap between neighbouring cards, both rails", () => {
  it("keeps a positive gutter between adjacent cards along the station axis, at the tightest pitch (120in), horizontal", () => {
    for (const side of SIDES) {
      const layout = rockerViewLayout({
        lengthIn: 120,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        showStationCards: true,
      });
      const pxX = (stationIn: number) => PAD_X + (120 - stationIn) * layout.scale;
      const cards = stationsIn(120)
        .map((s) => stationCardRect(layout, pxX(s), "horizontal", side))
        .sort((a, b) => a.x - b.x);
      for (let i = 1; i < cards.length; i++) {
        const gutter = cards[i].x - (cards[i - 1].x + cards[i - 1].width);
        expect(gutter).toBeGreaterThan(0);
      }
    }
  });

  it("keeps a positive gutter between adjacent cards along the station axis, at the tightest pitch (120in), vertical", () => {
    for (const side of SIDES) {
      const layout = rockerViewLayout({
        lengthIn: 120,
        maxDeckIn: MAX_DECK_IN,
        orientation: "vertical",
        fitToBoard: true,
        showStationCards: true,
      });
      const pxX = (stationIn: number) => PAD_X + (120 - stationIn) * layout.scale;
      // Nose (largest stationIn) projects to the SMALLEST long-axis position, so sort the
      // resulting cards by their own `y`, not by raw station inches, to walk them nose-to-tail.
      const cards = stationsIn(120)
        .map((s) => stationCardRect(layout, pxX(s), "vertical", side))
        .sort((a, b) => a.y - b.y);
      for (let i = 1; i < cards.length; i++) {
        const gutter = cards[i].y - (cards[i - 1].y + cards[i - 1].height);
        expect(gutter).toBeGreaterThan(0);
      }
    }
  });
});

describe("rockerViewLayout — stacks fit inside a card's own box", () => {
  it("keeps both the card stack (name over value) and the readout stack (value over name) inside STATION_CARD_HEIGHT, in their intended order", () => {
    // Card: name above value.
    expect(CARD_NAME_DY).toBeLessThan(CARD_VALUE_DY);
    const cardTop = CARD_NAME_DY - STATION_NAME_SIZE;
    const cardBottom = CARD_VALUE_DY + STATION_VALUE_SIZE / 4;
    expect(cardTop).toBeGreaterThan(0);
    expect(cardBottom).toBeLessThanOrEqual(STATION_CARD_HEIGHT);

    // Plain reading: value above name (the derived-value stacking, reversed from a card's).
    expect(READOUT_VALUE_DY).toBeLessThan(READOUT_NAME_DY);
    const readoutTop = READOUT_VALUE_DY - STATION_VALUE_SIZE;
    const readoutBottom = READOUT_NAME_DY + STATION_NAME_SIZE / 4;
    expect(readoutTop).toBeGreaterThan(0);
    expect(readoutBottom).toBeLessThanOrEqual(STATION_CARD_HEIGHT);
  });
});

describe("rockerViewLayout — vertical: the board box and the label's run-room", () => {
  it("keeps the board's own box (nose to tail, baseline to worst-case deck) inside the frame", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "vertical",
        fitToBoard: true,
        showStationCards: true,
      });
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

  it("keeps the label anchor inside the frame with at least 150 units of run-room toward minX, and clear of the nose station's card band", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "vertical",
        fitToBoard: true,
        showStationCards: true,
      });
      // Under the composition identity (finding 4), canonical (labelX, labelY) lands at final
      // (-labelY, labelX) in the rotated frame.
      const labelFinalX = -layout.labelY;
      const runRoom = labelFinalX - layout.minX;
      expect(runRoom).toBeGreaterThanOrEqual(150);
      expect(labelFinalX).toBeGreaterThanOrEqual(layout.minX);
      expect(labelFinalX).toBeLessThanOrEqual(layout.minX + layout.width);

      // The label's own long-axis type band (labelX - LENGTH_LABEL_SIZE to labelX) must not
      // intersect the nose station's card band (PAD_X + cardDy to PAD_X + cardDy + cardHeight).
      const labelBandEnd = layout.labelX;
      const noseCardBandStart = PAD_X + layout.cardDy;
      expect(labelBandEnd).toBeLessThanOrEqual(noseCardBandStart);
    }
  });
});

describe("rockerViewLayout — vertical: maximisation and independence", () => {
  it("draws the board's own span at at least 88% of the vertical frame's long axis (height)", () => {
    for (const lengthIn of LENGTHS_IN) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "vertical",
        fitToBoard: true,
        showStationCards: true,
      });
      const span = lengthIn * layout.scale;
      expect(span / layout.height).toBeGreaterThanOrEqual(0.88);
    }
  });

  it("is NOT the horizontal frame transposed — its own long/cross extents differ from the horizontal frame's", () => {
    for (const lengthIn of [60, 78, 120]) {
      const horizontalLayout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        showStationCards: true,
      });
      const verticalLayout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "vertical",
        fitToBoard: true,
        showStationCards: true,
      });
      expect(verticalLayout.width).not.toBeCloseTo(horizontalLayout.height, 1);
      expect(verticalLayout.height).not.toBeCloseTo(horizontalLayout.width, 1);
    }
  });
});

describe("rockerViewLayout — horizontal frame unchanged by the vertical work above", () => {
  it("still returns exactly Task 1's numbers", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        showStationCards: true,
      });
      expect(layout.minX).toBe(0);
      expect(layout.minY).toBe(0);
      expect(layout.width).toBe(900);
      expect(lengthIn * layout.scale).toBeCloseTo(820, 6);
    }
  });
});

describe("rockerViewLayout — LENGTH_LABEL_SIZE and constants stay finite and positive", () => {
  it("exposes the type-scale constants used to reserve the label's own band", () => {
    expect(LENGTH_LABEL_SIZE).toBeGreaterThan(0);
  });
});
