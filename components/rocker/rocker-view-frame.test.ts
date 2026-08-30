import { describe, expect, it } from "vitest";
import { BOARD_LENGTH_RANGE_IN } from "@/lib/geometry/board";
import {
  BARE_PAD,
  BOTTOM_RAIL_GAP,
  CARD_GUTTER,
  CARD_NAME_DY,
  CARD_VALUE_DY,
  COMPACT_BOTTOM_BAND,
  COMPACT_CAP,
  COMPACT_DECK_BAND,
  COMPACT_EDGE_GUTTER,
  COMPACT_READING_GUTTER,
  ORDER_FORM_ROCKER_BOX_PX,
  PAD_X,
  RAIL_GAP,
  RAIL_LABEL_CAP_RATIO,
  RAIL_LABEL_EDGE_GUTTER,
  RAIL_LABEL_GAP,
  RAIL_LABEL_SIZE,
  READOUT_NAME_DY,
  READOUT_VALUE_DY,
  STATION_CARD_HEIGHT,
  STATION_CARD_WIDTH,
  STATION_NAME_SIZE,
  STATION_VALUE_SIZE,
  VIEW_W,
  bottomCardBandDepth,
  cardBandDepth,
  cardPinScale,
  compactRailReadingXs,
  compactValuePrintPx,
  compactValueWidth,
  maxCardPinScale,
  railLabelBandDepth,
  rockerViewLayout,
  stationCardRect,
  type RockerCardSide,
  type RockerStationRails,
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

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Characterisation pin (quick task 260830-2dy, Task 1) — the exact `viewBox` strings the
// UNMODIFIED module produced for the Summary order form's own two paths (`"compact"`, the
// order form's own rocker box; `"none"`, drawn nowhere in production but pinned anyway since it
// shares the "no rail titles" contract), captured before any of this task's edits. This plan's
// rail titles are drawn only under `stationRails === "full"` — if that work ever leaks into
// either of these paths, one of these literals goes red.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const PRINT_PATH_VIEWBOX_PIN: Record<RockerStationRails, Record<RockerViewOrientation, Record<number, string>>> = {
  full: { horizontal: {}, vertical: {} }, // unused — "full" is not a print path and carries no pin
  compact: {
    horizontal: {
      60: "0.00 0.00 900.00 249.89",
      78: "0.00 0.00 900.00 205.74",
      120: "0.00 0.00 900.00 154.23",
    },
    vertical: {
      60: "0.00 0.00 900.00 249.89",
      78: "0.00 0.00 900.00 205.74",
      120: "0.00 0.00 900.00 154.23",
    },
  },
  none: {
    horizontal: {
      60: "0.00 0.00 900.00 207.33",
      78: "0.00 0.00 900.00 163.18",
      120: "0.00 0.00 900.00 111.67",
    },
    vertical: {
      60: "-207.33 32.00 207.33 836.00",
      78: "-163.18 32.00 163.18 836.00",
      120: "-111.67 32.00 111.67 836.00",
    },
  },
};

describe("rockerViewLayout — print-path characterisation pin (compact/none viewBox, captured pre-change)", () => {
  it("holds the 'compact' and 'none' viewBox strings to literals captured from the unmodified module, both orientations", () => {
    for (const stationRails of ["compact", "none"] as const) {
      for (const orientation of ORIENTATIONS) {
        for (const lengthIn of [60, 78, 120]) {
          const layout = rockerViewLayout({
            lengthIn,
            maxDeckIn: MAX_DECK_IN,
            orientation,
            fitToBoard: true,
            stationRails,
          });
          expect(layout.viewBox).toBe(PRINT_PATH_VIEWBOX_PIN[stationRails][orientation][lengthIn]);
        }
      }
    }
  });
});

describe("rockerViewLayout — order-form path pin (fitToBoard: true, stationRails: \"none\")", () => {
  it("scales every board's own length to span the full 820-unit drawing area, on the card-less path", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        stationRails: "none",
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
        stationRails: "none",
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
        stationRails: "none",
      });
      const carded = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        stationRails: "full",
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
        stationRails: "full",
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
          stationRails: "full",
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
        stationRails: "full",
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
      stationRails: "full",
    });
    expect(Object.keys(layout)).toContain("scale");
    expect(typeof layout.scale).toBe("number");
  });

  it("gives the frame's cross extent as railLabelBandDepth(orientation) + cardBandDepth(orientation) + maxDeckIn * scale + bottomCardBandDepth(orientation) + railLabelBandDepth(orientation), with cards on", () => {
    for (const orientation of ORIENTATIONS) {
      for (const fitToBoard of [true, false]) {
        const layout = rockerViewLayout({
          lengthIn: 78,
          maxDeckIn: MAX_DECK_IN,
          orientation,
          fitToBoard,
          stationRails: "full",
        });
        // The two card bands are NOT the same depth: the bottom rail clears the baseline the
        // board's own curve touches, so it carries BOTTOM_RAIL_GAP where the deck rail carries
        // RAIL_GAP. The two rail-title bands (one per side, quick task 260830-2dy) ARE the same
        // depth — `railLabelBandDepth` takes no side argument, only an orientation.
        const expectedCrossExtent =
          railLabelBandDepth(orientation) +
          cardBandDepth(orientation) +
          MAX_DECK_IN * layout.scale +
          bottomCardBandDepth(orientation) +
          railLabelBandDepth(orientation);
        expect(layout.viewH).toBeCloseTo(expectedCrossExtent, 8);
      }
    }
  });

  it("makes the bottom band exactly BOTTOM_RAIL_GAP - RAIL_GAP deeper than the deck band, in both orientations", () => {
    for (const orientation of ORIENTATIONS) {
      expect(bottomCardBandDepth(orientation) - cardBandDepth(orientation)).toBeCloseTo(
        BOTTOM_RAIL_GAP - RAIL_GAP,
        8,
      );
    }
  });

  it("reserves neither band when cards are off — the frame is the board plus a hairline of pad", () => {
    for (const orientation of ORIENTATIONS) {
      const layout = rockerViewLayout({
        lengthIn: 78,
        maxDeckIn: MAX_DECK_IN,
        orientation,
        fitToBoard: true,
        stationRails: "none",
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
      stationRails: "full",
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
        stationRails: "full",
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
        stationRails: "full",
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
        for (const stationRails of ["full", "none"] as const) {
          const layout = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation, fitToBoard: true, stationRails });
          expect(Number.isFinite(layout.scale)).toBe(true);
          expect(layout.scale).toBeGreaterThan(0);
          expect(Number.isFinite(layout.viewH)).toBe(true);
          expect(Number.isFinite(layout.width)).toBe(true);
          expect(Number.isFinite(layout.height)).toBe(true);
          expect(Number.isFinite(layout.railLabelSize)).toBe(true);
          expect(Number.isFinite(layout.deckLabelY)).toBe(true);
          expect(Number.isFinite(layout.bottomLabelY)).toBe(true);
          expect(Number.isFinite(layout.labelStationX)).toBe(true);
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
      stationRails: "full",
    });
    for (const lengthIn of [0, -60, Number.NaN]) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        stationRails: "full",
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
        stationRails: "full",
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
        stationRails: "full",
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
  it("keeps every deck card's near (bottom) edge RAIL_GAP above the worst-case deck line, every bottom card's near (top) edge BOTTOM_RAIL_GAP below the baseline", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        stationRails: "full",
      });
      const pxX = (stationIn: number) => PAD_X + (lengthIn - stationIn) * layout.scale;
      const deckTopY = layout.baselineY - MAX_DECK_IN * layout.scale;
      for (const stationIn of stationsIn(lengthIn)) {
        const deckCard = stationCardRect(layout, pxX(stationIn), "horizontal", "deck");
        expect(deckTopY - (deckCard.y + deckCard.height)).toBeCloseTo(RAIL_GAP, 6);

        const bottomCard = stationCardRect(layout, pxX(stationIn), "horizontal", "bottom");
        expect(bottomCard.y - layout.baselineY).toBeCloseTo(BOTTOM_RAIL_GAP, 6);
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
        stationRails: "full",
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
          stationRails: "full",
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
        stationRails: "full",
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
        stationRails: "full",
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

describe("rockerViewLayout — vertical: the board box's own containment", () => {
  it("keeps the board's own box (nose to tail, baseline to worst-case deck) inside the frame", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "vertical",
        fitToBoard: true,
        stationRails: "full",
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
});

describe("rockerViewLayout — vertical: maximisation and independence", () => {
  it("draws the board's own span at at least 88% of the vertical frame's long axis (height)", () => {
    for (const lengthIn of LENGTHS_IN) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "vertical",
        fitToBoard: true,
        stationRails: "full",
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
        stationRails: "full",
      });
      const verticalLayout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "vertical",
        fitToBoard: true,
        stationRails: "full",
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
        stationRails: "full",
      });
      expect(layout.minX).toBe(0);
      expect(layout.minY).toBe(0);
      expect(layout.width).toBe(900);
      expect(lengthIn * layout.scale).toBeCloseTo(820, 6);
    }
  });
});

describe("rockerViewLayout — RAIL_LABEL_* constants stay finite and positive", () => {
  it("exposes the type-scale and band constants used to reserve each rail title's own band", () => {
    for (const value of [RAIL_LABEL_SIZE, RAIL_LABEL_GAP, RAIL_LABEL_EDGE_GUTTER, RAIL_LABEL_CAP_RATIO]) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
  });
});

describe("railLabelBandDepth", () => {
  it("is finite and positive in both orientations, and equals RAIL_LABEL_GAP + maxCardPinScale(orientation) * RAIL_LABEL_SIZE + RAIL_LABEL_EDGE_GUTTER", () => {
    for (const orientation of ORIENTATIONS) {
      const depth = railLabelBandDepth(orientation);
      expect(Number.isFinite(depth)).toBe(true);
      expect(depth).toBeGreaterThan(0);
      expect(depth).toBeCloseTo(
        RAIL_LABEL_GAP + maxCardPinScale(orientation) * RAIL_LABEL_SIZE + RAIL_LABEL_EDGE_GUTTER,
        10,
      );
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Compact rails (quick task 260829-vus) — the Summary order form's own bare-value rail grammar.
// ─────────────────────────────────────────────────────────────────────────────────────────────

describe("rockerViewLayout — compact rails: frame geometry", () => {
  it("returns a 900-wide frame whose height is COMPACT_DECK_BAND + maxDeckIn * scale + COMPACT_BOTTOM_BAND, with two finite compactRows", () => {
    for (const lengthIn of [60, 78, 120]) {
      for (const orientation of ORIENTATIONS) {
        const layout = rockerViewLayout({
          lengthIn,
          maxDeckIn: MAX_DECK_IN,
          orientation,
          fitToBoard: true,
          stationRails: "compact",
        });
        expect(layout.width).toBe(VIEW_W);
        const expectedHeight = COMPACT_DECK_BAND + MAX_DECK_IN * layout.scale + COMPACT_BOTTOM_BAND;
        expect(layout.height).toBeCloseTo(expectedHeight, 6);
        expect(layout.viewH).toBeCloseTo(expectedHeight, 6);
        for (const row of [layout.compactRows.deck, layout.compactRows.bottom]) {
          expect(Number.isFinite(row.textY)).toBe(true);
          expect(Number.isFinite(row.leaderStartY)).toBe(true);
          expect(Number.isFinite(row.kneeY)).toBe(true);
        }
      }
    }
  });

  it("is horizontal-only by contract: vertical orientation returns the identical layout to horizontal", () => {
    for (const lengthIn of [60, 78, 120]) {
      const horizontalLayout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        stationRails: "compact",
      });
      const verticalLayout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "vertical",
        fitToBoard: true,
        stationRails: "compact",
      });
      expect(verticalLayout).toEqual(horizontalLayout);
    }
  });
});

describe("rockerViewLayout — compact rails: row bands", () => {
  it("holds the bottom rail's four rocker figures on ONE shared baseline, each row's deepest/highest glyph inside its own band", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        stationRails: "compact",
      });
      const { deck, bottom } = layout.compactRows;

      // Bottom rail: one row, one baseline — the aligned-row contract itself. Its cap-top clears
      // the baseline by COMPACT_CURVE_GAP so no glyph touches the board box.
      const bottomCapTop = bottom.textY - COMPACT_CAP;
      expect(bottomCapTop).toBeGreaterThan(layout.baselineY);

      // Deck row's highest glyph (cap-top) stays inside COMPACT_DECK_BAND, i.e. at or below the
      // frame's own top edge (y = 0).
      const deckCapTop = deck.textY - COMPACT_CAP;
      expect(deckCapTop).toBeGreaterThanOrEqual(0);
      expect(deckCapTop).toBeLessThanOrEqual(COMPACT_DECK_BAND);

      // Bottom row's deepest glyph (its own baseline, no descender) stays inside
      // COMPACT_BOTTOM_BAND, measured up from the frame's own bottom edge.
      const bottomBandFloor = layout.baselineY + COMPACT_BOTTOM_BAND;
      expect(bottomBandFloor - bottom.textY).toBeCloseTo(COMPACT_EDGE_GUTTER, 6);
    }
  });
});

describe("rockerViewLayout — compact rails: printed type size", () => {
  it("prints at least 11.9px (9pt) for the representative trio (60in/5.0in, 78in/5.5in, 120in/6.5in)", () => {
    const trio: { lengthIn: number; maxDeckIn: number }[] = [
      { lengthIn: 60, maxDeckIn: 5.0 },
      { lengthIn: 78, maxDeckIn: 5.5 },
      { lengthIn: 120, maxDeckIn: 6.5 },
    ];
    for (const { lengthIn, maxDeckIn } of trio) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn,
        orientation: "horizontal",
        fitToBoard: true,
        stationRails: "compact",
      });
      expect(compactValuePrintPx(layout)).toBeGreaterThanOrEqual(11.9);
    }
  });

  it("prints at least 10.67px (8pt) across every lengthIn x maxDeckIn combination in the documented sweep", () => {
    for (const lengthIn of [60, 78, 120]) {
      for (const maxDeckIn of [4, 5, 6, 7, 8]) {
        const layout = rockerViewLayout({
          lengthIn,
          maxDeckIn,
          orientation: "horizontal",
          fitToBoard: true,
          stationRails: "compact",
        });
        expect(compactValuePrintPx(layout)).toBeGreaterThanOrEqual(10.67);
      }
    }
  });

  it("is width-bound (~0.5017 px per user unit) at the representative trio", () => {
    for (const { lengthIn, maxDeckIn } of [
      { lengthIn: 60, maxDeckIn: 5.0 },
      { lengthIn: 78, maxDeckIn: 5.5 },
      { lengthIn: 120, maxDeckIn: 6.5 },
    ]) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn,
        orientation: "horizontal",
        fitToBoard: true,
        stationRails: "compact",
      });
      expect(ORDER_FORM_ROCKER_BOX_PX.width / layout.width).toBeCloseTo(0.5017, 3);
    }
  });
});

describe("compactValueWidth", () => {
  it("returns a wider width for a longer fractional inch string than a short one, both positive and finite", () => {
    const wide = compactValueWidth('2 15/16"');
    const narrow = compactValueWidth('5"');
    expect(Number.isFinite(wide)).toBe(true);
    expect(Number.isFinite(narrow)).toBe(true);
    expect(narrow).toBeGreaterThan(0);
    expect(wide).toBeGreaterThan(narrow);
  });
});

describe("compactRailReadingXs", () => {
  it("keeps every returned text box inside the frame's own x range, including a tip reading whose natural centre sits PAD_X from the frame edge", () => {
    const layout = rockerViewLayout({
      lengthIn: 60,
      maxDeckIn: MAX_DECK_IN,
      orientation: "horizontal",
      fitToBoard: true,
      stationRails: "compact",
    });
    const readings = [{ stationX: PAD_X, width: 48 }];
    const [x] = compactRailReadingXs(layout, readings);
    expect(x - readings[0].width / 2).toBeGreaterThanOrEqual(layout.minX);
    expect(x + readings[0].width / 2).toBeLessThanOrEqual(layout.minX + layout.width);
  });

  it("returns the station centres untouched when nothing collides", () => {
    const layout = rockerViewLayout({
      lengthIn: 78,
      maxDeckIn: MAX_DECK_IN,
      orientation: "horizontal",
      fitToBoard: true,
      stationRails: "compact",
    });
    const readings = [
      { stationX: 200, width: 40 },
      { stationX: 500, width: 40 },
      { stationX: 800, width: 40 },
    ];
    const xs = compactRailReadingXs(layout, readings);
    expect(xs).toEqual(readings.map((r) => r.stationX));
  });

  it("leaves at least COMPACT_READING_GUTTER of clear space between two readings whose natural centres collide", () => {
    const layout = rockerViewLayout({
      lengthIn: 78,
      maxDeckIn: MAX_DECK_IN,
      orientation: "horizontal",
      fitToBoard: true,
      stationRails: "compact",
    });
    const readings = [
      { stationX: 400, width: 60 },
      { stationX: 420, width: 60 },
    ];
    const xs = compactRailReadingXs(layout, readings);
    const gutter = xs[1] - readings[1].width / 2 - (xs[0] + readings[0].width / 2);
    expect(gutter).toBeGreaterThanOrEqual(COMPACT_READING_GUTTER - 1e-9);
  });

  it("distributes the shortfall of a deliberately over-subscribed row (four 300-unit-wide readings crowded together) without letting any pair overlap by more than a rounding epsilon, and keeps every box inside the frame", () => {
    // A frame wide enough to hold four 300-unit readings once separated (2000 units — well past
    // any real compact frame, which is always 900 wide) so the two required outcomes — no
    // overlap, and full containment — are both achievable; the frame this row is actually drawn
    // on in production never carries readings this wide (a real reading tops out around 98
    // units, see `compactValueWidth`'s own module comment), so this is a stress test of the sweep
    // itself, not a real-board scenario.
    const baseLayout = rockerViewLayout({
      lengthIn: 78,
      maxDeckIn: MAX_DECK_IN,
      orientation: "horizontal",
      fitToBoard: true,
      stationRails: "compact",
    });
    const layout = { ...baseLayout, minX: 0, width: 2000 };
    const readings = [
      { stationX: 400, width: 300 },
      { stationX: 420, width: 300 },
      { stationX: 440, width: 300 },
      { stationX: 460, width: 300 },
    ];
    const xs = compactRailReadingXs(layout, readings);
    for (let i = 0; i < xs.length; i++) {
      expect(xs[i] - readings[i].width / 2).toBeGreaterThanOrEqual(layout.minX - 1e-6);
      expect(xs[i] + readings[i].width / 2).toBeLessThanOrEqual(layout.minX + layout.width + 1e-6);
    }
    for (let i = 1; i < xs.length; i++) {
      const overlap = xs[i - 1] + readings[i - 1].width / 2 - (xs[i] - readings[i].width / 2);
      expect(overlap).toBeLessThanOrEqual(1e-6);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Card-pin scale (quick task 260830-03j) — holding a constant on-screen card size nose-up, the
// way `callout-primitives.tsx`'s `pinnedCalloutSizes` already does for the TEMPLATE screen.
// ─────────────────────────────────────────────────────────────────────────────────────────────

describe("maxCardPinScale", () => {
  it("horizontal resolves to exactly 1 — STATION_CARD_WIDTH already saturates the tightest pitch", () => {
    expect(maxCardPinScale("horizontal")).toBe(1);
  });

  it("vertical resolves to the station-pitch ceiling, greater than 2 and finite", () => {
    const expected =
      (12 * (VIEW_W - 2 * PAD_X)) / BOARD_LENGTH_RANGE_IN.max / STATION_CARD_HEIGHT -
      CARD_GUTTER / STATION_CARD_HEIGHT;
    const actual = maxCardPinScale("vertical");
    expect(Number.isFinite(actual)).toBe(true);
    expect(actual).toBeCloseTo(expected, 8);
    expect(actual).toBeGreaterThan(2);
  });
});

describe("cardPinScale", () => {
  it("lands the value row on the target px at a representative vertical fit scale (~1.597 at fitScale 0.674, target 14)", () => {
    const result = cardPinScale(0.674, 14, "vertical");
    expect(result).toBeCloseTo(1.597, 2);
    expect(STATION_VALUE_SIZE * result * 0.674).toBeCloseTo(14, 2);
  });

  it("returns exactly 1 for horizontal at every fit scale and target — the ceiling clamps it", () => {
    for (const fitScale of [0.2, 0.5, 1.0, 2.0]) {
      for (const targetValuePx of [11, 14, 20]) {
        expect(cardPinScale(fitScale, targetValuePx, "horizontal")).toBe(1);
      }
    }
  });

  it("never returns below 1, and never above the orientation's own ceiling", () => {
    for (const orientation of ORIENTATIONS) {
      const ceiling = maxCardPinScale(orientation);
      for (const fitScale of [0.1, 0.3, 0.674, 1, 3]) {
        for (const targetValuePx of [8, 11, 14, 20, 40]) {
          const result = cardPinScale(fitScale, targetValuePx, orientation);
          expect(result).toBeGreaterThanOrEqual(1);
          expect(result).toBeLessThanOrEqual(ceiling);
        }
      }
    }
  });

  it("returns 1 for a zero, negative, NaN or Infinity fit scale — never a NaN card", () => {
    for (const fitScale of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(cardPinScale(fitScale, 14, "vertical")).toBe(1);
      expect(cardPinScale(fitScale, 14, "horizontal")).toBe(1);
    }
  });
});

describe("rockerViewLayout — cardScale default (unpinned)", () => {
  it("with cardScale omitted, cardWidth/cardHeight/cardDy/railY/deckRailY match today's unpinned values at every length, both orientations", () => {
    for (const orientation of ORIENTATIONS) {
      for (const lengthIn of [60, 78, 120]) {
        const omitted = rockerViewLayout({
          lengthIn,
          maxDeckIn: MAX_DECK_IN,
          orientation,
          fitToBoard: true,
          stationRails: "full",
        });
        const explicit = rockerViewLayout({
          lengthIn,
          maxDeckIn: MAX_DECK_IN,
          orientation,
          fitToBoard: true,
          stationRails: "full",
          cardScale: 1,
        });
        expect(omitted).toEqual(explicit);
        expect(omitted.cardWidth).toBe(STATION_CARD_WIDTH);
        expect(omitted.cardHeight).toBe(STATION_CARD_HEIGHT);
      }
    }
  });
});

describe("rockerViewLayout — cardScale applies and echoes", () => {
  it("at cardScale: 2 vertical, cardWidth and cardHeight are exactly doubled and cardScale echoes what was applied", () => {
    const layout = rockerViewLayout({
      lengthIn: 78,
      maxDeckIn: MAX_DECK_IN,
      orientation: "vertical",
      fitToBoard: true,
      stationRails: "full",
      cardScale: 2,
    });
    expect(layout.cardWidth).toBe(STATION_CARD_WIDTH * 2);
    expect(layout.cardHeight).toBe(STATION_CARD_HEIGHT * 2);
    expect(layout.cardScale).toBe(2);
  });

  it("passing cardScale: 3 vertical clamps the applied scale to maxCardPinScale('vertical')", () => {
    const ceiling = maxCardPinScale("vertical");
    const layout = rockerViewLayout({
      lengthIn: 78,
      maxDeckIn: MAX_DECK_IN,
      orientation: "vertical",
      fitToBoard: true,
      stationRails: "full",
      cardScale: 3,
    });
    expect(layout.cardScale).toBeCloseTo(ceiling, 10);
    expect(layout.cardWidth).toBeCloseTo(STATION_CARD_WIDTH * ceiling, 6);
  });
});

describe("rockerViewLayout — cardScale cannot reach compact/none", () => {
  it("stationRails 'compact' and 'none' return an identical layout for cardScale 1, 1.6 and 2.2", () => {
    for (const stationRails of ["compact", "none"] as const) {
      for (const lengthIn of [60, 78, 120]) {
        for (const orientation of ORIENTATIONS) {
          const base = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation, fitToBoard: true, stationRails });
          for (const cardScale of [1, 1.6, 2.2]) {
            const scaled = rockerViewLayout({
              lengthIn,
              maxDeckIn: MAX_DECK_IN,
              orientation,
              fitToBoard: true,
              stationRails,
              cardScale,
            });
            expect(scaled).toEqual(base);
          }
        }
      }
    }
  });
});

describe("rockerViewLayout — vertical: clearance holds at every card scale", () => {
  it("keeps each rail's cards exactly their own gap from the board box at cardScale 1, 1.6 and the ceiling", () => {
    const ceiling = maxCardPinScale("vertical");
    for (const lengthIn of [60, 78, 120]) {
      for (const cardScale of [1, 1.6, ceiling]) {
        const layout = rockerViewLayout({
          lengthIn,
          maxDeckIn: MAX_DECK_IN,
          orientation: "vertical",
          fitToBoard: true,
          stationRails: "full",
          cardScale,
        });
        const pxX = (stationIn: number) => PAD_X + (lengthIn - stationIn) * layout.scale;
        const baselineFinalX = -layout.baselineY;
        const deckTopFinalX = -(layout.baselineY - MAX_DECK_IN * layout.scale);
        for (const stationIn of stationsIn(lengthIn)) {
          const bottomCard = stationCardRect(layout, pxX(stationIn), "vertical", "bottom");
          const bottomNearEdge = bottomCard.x + bottomCard.width;
          expect(baselineFinalX - bottomNearEdge).toBeCloseTo(BOTTOM_RAIL_GAP, 6);

          const deckCard = stationCardRect(layout, pxX(stationIn), "vertical", "deck");
          const deckNearEdge = deckCard.x;
          expect(deckNearEdge - deckTopFinalX).toBeCloseTo(RAIL_GAP, 6);
        }
      }
    }
  });
});

describe("rockerViewLayout — cardType stays inside cardHeight at every scale", () => {
  it("keeps both the card stack and readout stack inside layout.cardHeight, in their intended order, at cardScale 1, 1.6 and the ceiling", () => {
    const ceiling = maxCardPinScale("vertical");
    for (const cardScale of [1, 1.6, ceiling]) {
      const layout = rockerViewLayout({
        lengthIn: 78,
        maxDeckIn: MAX_DECK_IN,
        orientation: "vertical",
        fitToBoard: true,
        stationRails: "full",
        cardScale,
      });
      const { cardType, cardHeight } = layout;

      expect(cardType.cardNameDy).toBeLessThan(cardType.cardValueDy);
      const cardTop = cardType.cardNameDy - cardType.nameSize;
      const cardBottom = cardType.cardValueDy + cardType.valueSize / 4;
      expect(cardTop).toBeGreaterThan(0);
      expect(cardBottom).toBeLessThanOrEqual(cardHeight);

      expect(cardType.readoutValueDy).toBeLessThan(cardType.readoutNameDy);
      const readoutTop = cardType.readoutValueDy - cardType.valueSize;
      const readoutBottom = cardType.readoutNameDy + cardType.nameSize / 4;
      expect(readoutTop).toBeGreaterThan(0);
      expect(readoutBottom).toBeLessThanOrEqual(cardHeight);
    }
  });

  it("keeps cardType.valueSize / cardType.nameSize equal to STATION_VALUE_SIZE / STATION_NAME_SIZE at every scale", () => {
    const ceiling = maxCardPinScale("vertical");
    for (const cardScale of [1, 1.6, ceiling]) {
      const layout = rockerViewLayout({
        lengthIn: 78,
        maxDeckIn: MAX_DECK_IN,
        orientation: "vertical",
        fitToBoard: true,
        stationRails: "full",
        cardScale,
      });
      expect(layout.cardType.valueSize / layout.cardType.nameSize).toBeCloseTo(
        STATION_VALUE_SIZE / STATION_NAME_SIZE,
        10,
      );
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Rail titles (quick task 260830-2dy) — "Thickness" over the deck rail, "Rocker" over the bottom
// one, both decided entirely by this module (Rule 1); `rocker-viewer.tsx` only paints them.
// ─────────────────────────────────────────────────────────────────────────────────────────────

describe("rockerViewLayout — rail titles: horizontal containment", () => {
  it("keeps the deck title's glyph top at least RAIL_LABEL_EDGE_GUTTER inside minY, and bottomLabelY at least RAIL_LABEL_EDGE_GUTTER inside minY + height, across the length sweep and card scales 1, 1.6 and the horizontal ceiling", () => {
    for (const lengthIn of LENGTHS_IN) {
      for (const cardScale of [1, 1.6, maxCardPinScale("horizontal")]) {
        const layout = rockerViewLayout({
          lengthIn,
          maxDeckIn: MAX_DECK_IN,
          orientation: "horizontal",
          fitToBoard: true,
          stationRails: "full",
          cardScale,
        });
        const deckGlyphTop = layout.deckLabelY - layout.railLabelSize * RAIL_LABEL_CAP_RATIO;
        expect(deckGlyphTop - layout.minY).toBeGreaterThanOrEqual(RAIL_LABEL_EDGE_GUTTER - 1e-9);
        expect(layout.minY + layout.height - layout.bottomLabelY).toBeGreaterThanOrEqual(
          RAIL_LABEL_EDGE_GUTTER - 1e-9,
        );
      }
    }
  });
});

describe("rockerViewLayout — rail titles: vertical containment", () => {
  it("keeps both titles' final anchors and glyph extents (baseline and cap top) inside the frame, at 60in/78in/120in and card scales 1, 1.6 and the vertical ceiling", () => {
    const ceiling = maxCardPinScale("vertical");
    for (const lengthIn of [60, 78, 120]) {
      for (const cardScale of [1, 1.6, ceiling]) {
        const layout = rockerViewLayout({
          lengthIn,
          maxDeckIn: MAX_DECK_IN,
          orientation: "vertical",
          fitToBoard: true,
          stationRails: "full",
          cardScale,
        });
        const cap = layout.railLabelSize * RAIL_LABEL_CAP_RATIO;
        // Composition identity (finding 4): canonical (x, y) lands at final (-y, x).
        const points = [
          { x: layout.labelStationX, y: layout.deckLabelY }, // deck title baseline
          { x: layout.labelStationX, y: layout.deckLabelY - cap }, // deck title cap top
          { x: layout.labelStationX, y: layout.bottomLabelY }, // bottom title baseline
          { x: layout.labelStationX, y: layout.bottomLabelY - cap }, // bottom title cap top
        ];
        for (const p of points) {
          const finalX = -p.y;
          const finalY = p.x;
          expect(finalX).toBeGreaterThanOrEqual(layout.minX);
          expect(finalX).toBeLessThanOrEqual(layout.minX + layout.width);
          expect(finalY).toBeGreaterThanOrEqual(layout.minY);
          expect(finalY).toBeLessThanOrEqual(layout.minY + layout.height);
        }
      }
    }
  });
});

describe("rockerViewLayout — rail titles: clearance from their own rail, both orientations", () => {
  it("keeps the deck title's glyph edge exactly RAIL_LABEL_GAP clear of the deck rail's ceiling-sized far edge, and the bottom title's glyph edge exactly RAIL_LABEL_GAP clear of the bottom rail's, at every card scale", () => {
    for (const orientation of ORIENTATIONS) {
      const ceiling = maxCardPinScale(orientation);
      const maxCardWidth = STATION_CARD_WIDTH * ceiling;
      const maxCardHeight = STATION_CARD_HEIGHT * ceiling;
      for (const lengthIn of [60, 78, 120]) {
        for (const cardScale of [1, 1.6, ceiling]) {
          const layout = rockerViewLayout({
            lengthIn,
            maxDeckIn: MAX_DECK_IN,
            orientation,
            fitToBoard: true,
            stationRails: "full",
            cardScale,
          });
          const deckRailFarY =
            layout.deckTickEndY - (orientation === "horizontal" ? maxCardHeight : maxCardWidth);
          const bottomRailFarY =
            layout.tickEndY + (orientation === "horizontal" ? maxCardHeight : maxCardWidth);
          const cap = layout.railLabelSize * RAIL_LABEL_CAP_RATIO;

          expect(deckRailFarY - layout.deckLabelY).toBeCloseTo(RAIL_LABEL_GAP, 8);
          expect(layout.bottomLabelY - cap - bottomRailFarY).toBeCloseTo(RAIL_LABEL_GAP, 8);
        }
      }
    }
  });
});

describe("rockerViewLayout — rail titles: centring on the board's middle station", () => {
  it("gives labelStationX exactly PAD_X + (lengthIn * scale) / 2 in horizontal", () => {
    for (const lengthIn of LENGTHS_IN) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        stationRails: "full",
      });
      expect(layout.labelStationX).toBeCloseTo(PAD_X + (lengthIn * layout.scale) / 2, 10);
    }
  });

  it("keeps labelStationX within half a railLabelSize of PAD_X + (lengthIn * scale) / 2 in vertical", () => {
    for (const lengthIn of [60, 78, 120]) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "vertical",
        fitToBoard: true,
        stationRails: "full",
      });
      const nominal = PAD_X + (lengthIn * layout.scale) / 2;
      expect(Math.abs(layout.labelStationX - nominal)).toBeLessThanOrEqual(layout.railLabelSize / 2);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// The three paths this fix must not disturb (quick task 260830-03j, Task 2) — protecting each by
// its own name rather than this task's, so a later change that breaks one of these fails loudly.
// ─────────────────────────────────────────────────────────────────────────────────────────────

const ALL_STATION_RAILS: RockerStationRails[] = ["full", "compact", "none"];
const PIN_SCALES = [1, 1.3, 1.6, 2.2];

describe("rockerViewLayout — frame invariance across the card scale (protects threat T-03J-02)", () => {
  it("keeps minX, minY, width, height and viewBox IDENTICAL for cardScale 1, 1.3, 1.6 and 2.2, in both orientations and all three rail grammars — the frame -> fit -> card size -> frame loop stays closed off because the frame is reserved at the ceiling, never at the live scale", () => {
    for (const orientation of ORIENTATIONS) {
      for (const stationRails of ALL_STATION_RAILS) {
        for (const lengthIn of [60, 78, 120]) {
          const base = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation, fitToBoard: true, stationRails });
          for (const cardScale of PIN_SCALES) {
            const scaled = rockerViewLayout({
              lengthIn,
              maxDeckIn: MAX_DECK_IN,
              orientation,
              fitToBoard: true,
              stationRails,
              cardScale,
            });
            expect(scaled.minX).toBe(base.minX);
            expect(scaled.minY).toBe(base.minY);
            expect(scaled.width).toBe(base.width);
            expect(scaled.height).toBe(base.height);
            expect(scaled.viewBox).toBe(base.viewBox);
          }
        }
      }
    }
  });
});

describe("rockerViewLayout — horizontal is byte-identical at every card scale", () => {
  it("deep-equals the default-scale horizontal 'full' layout for cardScale 1, 1.6 and 2.2, across the length sweep — every field, not just the frame", () => {
    for (const lengthIn of LENGTHS_IN) {
      const base = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "horizontal",
        fitToBoard: true,
        stationRails: "full",
      });
      for (const cardScale of [1, 1.6, 2.2]) {
        const scaled = rockerViewLayout({
          lengthIn,
          maxDeckIn: MAX_DECK_IN,
          orientation: "horizontal",
          fitToBoard: true,
          stationRails: "full",
          cardScale,
        });
        expect(scaled).toEqual(base);
      }
    }
  });
});

describe("rockerViewLayout — the print path cannot be reached by the card-pin scale", () => {
  it("'compact' and 'none' deep-equal the default-scale layout at every card scale, both orientations, across the length sweep", () => {
    for (const stationRails of ["compact", "none"] as const) {
      for (const orientation of ORIENTATIONS) {
        for (const lengthIn of LENGTHS_IN) {
          const base = rockerViewLayout({ lengthIn, maxDeckIn: MAX_DECK_IN, orientation, fitToBoard: true, stationRails });
          for (const cardScale of PIN_SCALES) {
            const scaled = rockerViewLayout({
              lengthIn,
              maxDeckIn: MAX_DECK_IN,
              orientation,
              fitToBoard: true,
              stationRails,
              cardScale,
            });
            expect(scaled).toEqual(base);
          }
        }
      }
    }
  });

  it("compactValuePrintPx still clears the 9pt (11.9px) bar at every card scale — the Summary order form prints from this path", () => {
    for (const { lengthIn, maxDeckIn } of [
      { lengthIn: 60, maxDeckIn: 5.0 },
      { lengthIn: 78, maxDeckIn: 5.5 },
      { lengthIn: 120, maxDeckIn: 6.5 },
    ]) {
      for (const cardScale of PIN_SCALES) {
        const layout = rockerViewLayout({
          lengthIn,
          maxDeckIn,
          orientation: "horizontal",
          fitToBoard: true,
          stationRails: "compact",
          cardScale,
        });
        expect(compactValuePrintPx(layout)).toBeGreaterThanOrEqual(11.9);
      }
    }
  });
});

describe("rockerViewLayout — cards never collide at the ceiling scale (mirrors the non-overlap and vertical-containment suites above)", () => {
  it("keeps a positive gutter between adjacent cards along the station axis, and every card fully inside the frame on both axes, at cardScale = maxCardPinScale('vertical')", () => {
    const ceiling = maxCardPinScale("vertical");
    for (const lengthIn of LENGTHS_IN) {
      const layout = rockerViewLayout({
        lengthIn,
        maxDeckIn: MAX_DECK_IN,
        orientation: "vertical",
        fitToBoard: true,
        stationRails: "full",
        cardScale: ceiling,
      });
      const pxX = (stationIn: number) => PAD_X + (lengthIn - stationIn) * layout.scale;
      for (const side of SIDES) {
        const cards = stationsIn(lengthIn)
          .map((s) => stationCardRect(layout, pxX(s), "vertical", side))
          .sort((a, b) => a.y - b.y);

        for (let i = 1; i < cards.length; i++) {
          const gutter = cards[i].y - (cards[i - 1].y + cards[i - 1].height);
          expect(gutter).toBeGreaterThan(0);
        }

        for (const card of cards) {
          expect(card.x).toBeGreaterThanOrEqual(layout.minX);
          expect(card.x + card.width).toBeLessThanOrEqual(layout.minX + layout.width);
          expect(card.y).toBeGreaterThanOrEqual(layout.minY);
          expect(card.y + card.height).toBeLessThanOrEqual(layout.minY + layout.height);
        }
      }
    }
  });
});
