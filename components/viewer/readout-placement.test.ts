import { describe, expect, it } from "vitest";
import {
  boardSection,
  MIN_CLEARANCE_FRACTION,
  placeReadoutClearOfBoard,
  type BoardSection,
  type BoardSilhouette,
  type Rect,
} from "./readout-placement";

/**
 * Unit tests for the drag readout chip's placement rule (quick task 260909-oge). One test per
 * line of the plan's own `<behavior>` block — see `readout-placement.ts`'s own doc comment for the
 * rule this pins down.
 */

const IDEAL_MARGIN = 24;

/** A board running straight along the axis, every section the same width, so the numbers in each
 * test are easy to reason about. `alongAxis: "y"` mirrors TEMPLATE's own vertical default. */
function straightBoard(alongAxis: "x" | "y", crossMin: number, crossMax: number, alongs: number[]): BoardSilhouette {
  const sections: BoardSection[] = alongs.map((along) => ({ along, min: crossMin, max: crossMax }));
  return { alongAxis, sections };
}

const WIDE_BOUNDS: Rect = { x: -1000, y: -1000, width: 2000, height: 2000 };

describe("boardSection", () => {
  it("reads the along coordinate off the named axis and sorts its two cross values", () => {
    const alongX = boardSection({ x: 10, y: 5 }, { x: 10, y: -5 }, "x");
    expect(alongX).toEqual({ along: 10, min: -5, max: 5 });

    const alongY = boardSection({ x: 5, y: 20 }, { x: -5, y: 20 }, "y");
    expect(alongY).toEqual({ along: 20, min: -5, max: 5 });
  });
});

describe("placeReadoutClearOfBoard", () => {
  it("leaves a box already clear of the board with identical numbers", () => {
    const board = straightBoard("y", -10, 10, [0, 50, 100]);
    const box: Rect = { x: 50, y: 40, width: 30, height: 20 };
    const finger = { x: 0, y: 50 };
    const result = placeReadoutClearOfBoard(box, board, IDEAL_MARGIN, WIDE_BOUNDS, finger);
    expect(result).toEqual(box);
  });

  it("slides low when the finger is on the low side, landing exactly idealMargin clear", () => {
    const board = straightBoard("y", -10, 10, [0, 50, 100]);
    // Box centred on the board (crosses it), finger on the low (negative-x) side.
    const box: Rect = { x: -5, y: 40, width: 10, height: 20 };
    const finger = { x: -50, y: 50 };
    const result = placeReadoutClearOfBoard(box, board, IDEAL_MARGIN, WIDE_BOUNDS, finger);
    // Slid to the low side: box's near edge sits idealMargin clear of the board's low edge (-10).
    expect(result.x + result.width).toBeCloseTo(-10 - IDEAL_MARGIN, 6);
    expect(result.width).toBe(box.width);
    expect(result.height).toBe(box.height);
    expect(result.y).toBe(box.y);
  });

  it("slides high when the finger is on the high side (the mirror case)", () => {
    const board = straightBoard("y", -10, 10, [0, 50, 100]);
    const box: Rect = { x: -5, y: 40, width: 10, height: 20 };
    const finger = { x: 50, y: 50 };
    const result = placeReadoutClearOfBoard(box, board, IDEAL_MARGIN, WIDE_BOUNDS, finger);
    expect(result.x).toBeCloseTo(10 + IDEAL_MARGIN, 6);
    expect(result.width).toBe(box.width);
  });

  it("degrades to flush against bounds when the nearer side cannot hold the ideal clearance but can hold the box", () => {
    const board = straightBoard("y", -10, 10, [0, 50, 100]);
    const box: Rect = { x: -5, y: 40, width: 10, height: 20 };
    const finger = { x: -50, y: 50 };
    // Bounds leave exactly 10 units of room below the board's low edge (-10) — enough to hold
    // the box itself (width 10) flush against the bounds, with 10 units of clearance surviving:
    // less than the ideal margin (24) but well above the minimum-clearance floor (24 * 0.25 = 6).
    const tightBounds: Rect = { x: -30, y: -1000, width: 2000, height: 2000 };
    const result = placeReadoutClearOfBoard(box, board, IDEAL_MARGIN, tightBounds, finger);
    // Flush against the bounds' own low edge.
    expect(result.x).toBeCloseTo(-30, 6);
    expect(result.x + result.width).toBeCloseTo(-20, 6);
    // The clearance that survives (-10 - (-20) = 10) clears the board, but short of the ideal 24.
    const survivingClearance = -10 - (result.x + result.width);
    expect(survivingClearance).toBeGreaterThanOrEqual(MIN_CLEARANCE_FRACTION * IDEAL_MARGIN);
    expect(survivingClearance).toBeLessThan(IDEAL_MARGIN);
  });

  it("flips to the far side when the nearer side cannot hold the box at all", () => {
    const board = straightBoard("y", -10, 10, [0, 50, 100]);
    const box: Rect = { x: -5, y: 40, width: 10, height: 20 };
    const finger = { x: -50, y: 50 };
    // Bounds leave less than the box's own width (10) of room below the board's low edge (-10) —
    // not even flush against the bounds can hold the box without overlapping the board, so the
    // low side is rejected outright and the box flips to the high side instead, which has plenty
    // of room and lands at the full ideal margin.
    const tightLowBounds: Rect = { x: -10.1, y: -1000, width: 2000.1, height: 2000 };
    const result = placeReadoutClearOfBoard(box, board, IDEAL_MARGIN, tightLowBounds, finger);
    expect(result.x).toBeCloseTo(10 + IDEAL_MARGIN, 6);
  });

  it("moves past the nearer end of the board when there is no room on either side", () => {
    const board = straightBoard("y", -10, 10, [0, 50, 100]);
    const box: Rect = { x: -5, y: 40, width: 10, height: 20 };
    const finger = { x: 0, y: 30 };
    // Bounds pinch the cross axis so tightly (width 20.2, centred on the board) that neither the
    // low nor the high slide can clear the minimum-clearance threshold.
    const pinchedBounds: Rect = { x: -10.1, y: -1000, width: 20.2, height: 2000 };
    const result = placeReadoutClearOfBoard(box, board, IDEAL_MARGIN, pinchedBounds, finger);
    // Cross position is unchanged (still centred on the board); it moved ALONG instead, clear of
    // the lowest section (along: 0) toward the finger's own (lower) along position.
    expect(result.x).toBe(box.x);
    expect(result.y + result.height).toBeCloseTo(0 - IDEAL_MARGIN, 6);
  });

  it("returns the box unchanged when there is no room anywhere", () => {
    const board = straightBoard("y", -10, 10, [0, 50, 100]);
    const box: Rect = { x: -5, y: 40, width: 10, height: 20 };
    const finger = { x: 0, y: 30 };
    // Pinched on both axes: no cross room, and no along room either (the board runs the whole
    // length of a bounds only slightly taller than the box itself, both ends already tight).
    const noRoomBounds: Rect = { x: -10.1, y: -0.1, width: 20.2, height: 100.2 };
    const result = placeReadoutClearOfBoard(box, board, IDEAL_MARGIN, noRoomBounds, finger);
    expect(result).toEqual(box);
  });

  it("gives mirror-image answers for alongAxis 'x' and alongAxis 'y'", () => {
    const boardY = straightBoard("y", -10, 10, [0, 50, 100]);
    const boxY: Rect = { x: -5, y: 40, width: 10, height: 20 };
    const fingerY = { x: -50, y: 50 };
    const resultY = placeReadoutClearOfBoard(boxY, boardY, IDEAL_MARGIN, WIDE_BOUNDS, fingerY);

    // The same problem with x and y swapped throughout.
    const boardX = straightBoard("x", -10, 10, [0, 50, 100]);
    const boxX: Rect = { x: 40, y: -5, width: 20, height: 10 };
    const fingerX = { x: 50, y: -50 };
    const resultX = placeReadoutClearOfBoard(boxX, boardX, IDEAL_MARGIN, WIDE_BOUNDS, fingerX);

    expect(resultX.y).toBeCloseTo(resultY.x, 6);
    expect(resultX.x).toBeCloseTo(resultY.y, 6);
    expect(resultX.width).toBeCloseTo(resultY.height, 6);
    expect(resultX.height).toBeCloseTo(resultY.width, 6);
  });

  it("gives the same answer regardless of the order sections arrive in", () => {
    const box: Rect = { x: -5, y: 40, width: 10, height: 20 };
    const finger = { x: -50, y: 50 };
    const sortedBoard = straightBoard("y", -10, 10, [0, 50, 100]);
    const shuffledBoard: BoardSilhouette = {
      alongAxis: "y",
      sections: [sortedBoard.sections[2], sortedBoard.sections[0], sortedBoard.sections[1]],
    };
    const sortedResult = placeReadoutClearOfBoard(box, sortedBoard, IDEAL_MARGIN, WIDE_BOUNDS, finger);
    const shuffledResult = placeReadoutClearOfBoard(box, shuffledBoard, IDEAL_MARGIN, WIDE_BOUNDS, finger);
    expect(shuffledResult).toEqual(sortedResult);
  });

  it("still sees the board when the box spans the gap between two sampled sections (bracketing)", () => {
    // Sections sampled only at 0 and 100 — a box sitting at along 45..55 falls in the gap between
    // them, but is still bracketed by both (idealMargin widens the window enough to catch section
    // 0, and the "nearest on each side" rule catches section 100 too).
    const board = straightBoard("y", -10, 10, [0, 100]);
    const box: Rect = { x: -5, y: 45, width: 10, height: 10 };
    const finger = { x: -50, y: 50 };
    const result = placeReadoutClearOfBoard(box, board, IDEAL_MARGIN, WIDE_BOUNDS, finger);
    // The board was seen and the box slid clear of it — not left in place.
    expect(result).not.toEqual(box);
    expect(result.x + result.width).toBeCloseTo(-10 - IDEAL_MARGIN, 6);
  });
});

describe("MIN_CLEARANCE_FRACTION", () => {
  it("is one quarter — anything tighter reads as touching the board", () => {
    expect(MIN_CLEARANCE_FRACTION).toBe(0.25);
  });
});
