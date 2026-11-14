import { describe, expect, it } from "vitest";
import { readoutRowShiftsLeftPx, readoutShiftLeftPx } from "./readout-clear";

describe("readoutShiftLeftPx — a station read-out slides clear of the toolbar over the drawing's top-right corner", () => {
  const clear = { width: 210, height: 52 };
  const drawingWidth = 820;
  const gap = 12;

  it("a read-out under the toolbar moves left by exactly what puts its right edge a gap clear of the toolbar's left edge", () => {
    const readout = { left: 640, right: 700, top: 10, bottom: 44 };
    const shift = readoutShiftLeftPx({ readout, clear, drawingWidth, gap });
    expect(shift).toBe(700 - (drawingWidth - clear.width - gap));
    expect(readout.right - shift).toBe(drawingWidth - clear.width - gap);
  });

  it("a read-out already clear does not move: left of the toolbar by the gap, or below it by the gap", () => {
    expect(readoutShiftLeftPx({ readout: { left: 500, right: 598, top: 10, bottom: 44 }, clear, drawingWidth, gap })).toBe(0);
    expect(readoutShiftLeftPx({ readout: { left: 640, right: 700, top: 64, bottom: 98 }, clear, drawingWidth, gap })).toBe(0);
  });

  it("a read-out a hair inside the gap still moves, by that hair", () => {
    const readout = { left: 540, right: 599, top: 10, bottom: 44 };
    expect(readoutShiftLeftPx({ readout, clear, drawingWidth, gap })).toBeCloseTo(1, 9);
  });

  it("no toolbar, no move", () => {
    const readout = { left: 700, right: 800, top: 0, bottom: 30 };
    expect(readoutShiftLeftPx({ readout, clear: { width: 0, height: 0 }, drawingWidth, gap })).toBe(0);
  });
});

describe("readoutRowShiftsLeftPx — the row spreads toward the nose when the tail read-out slides clear", () => {
  const clear = { width: 210, height: 52 };
  const drawingWidth = 820;
  const gap = 10;
  const box = (centre: number, half: number) => ({ left: centre - half, right: centre + half, top: 10, bottom: 44 });

  it("a long board: only the tail read-out moves, the others stay on their stations", () => {
    const row = [box(150, 50), box(400, 40), box(700, 60)];
    expect(readoutRowShiftsLeftPx(row, clear, drawingWidth, gap)).toEqual([0, 0, 760 - (820 - 210 - 10)]);
  });

  it("a short board: the slid tail read-out pushes the centre one along by the overlap and the gap, and the nose one stays clear", () => {
    const row = [box(150, 50), box(560, 40), box(700, 60)];
    const shifts = readoutRowShiftsLeftPx(row, clear, drawingWidth, gap);
    const tailRight = 760 - shifts[2];
    expect(tailRight).toBe(600);
    const tailLeft = 640 - shifts[2];
    // centre's right (600) + gap must sit at the tail's new left
    expect(600 + gap - tailLeft).toBeGreaterThan(0);
    expect(shifts[1]).toBe(600 + gap - tailLeft);
    expect(560 + 40 - shifts[1] + gap).toBeCloseTo(tailLeft, 9);
    expect(shifts[0]).toBe(0);
  });

  it("a very short board: the push reaches the nose read-out too", () => {
    const row = [box(420, 50), box(560, 40), box(700, 60)];
    const shifts = readoutRowShiftsLeftPx(row, clear, drawingWidth, gap);
    expect(shifts[2]).toBeGreaterThan(0);
    expect(shifts[1]).toBeGreaterThan(0);
    expect(shifts[0]).toBeGreaterThan(0);
    // One gap between each neighbour, in a row.
    expect(row[1].right - shifts[1] + gap).toBeCloseTo(row[2].left - shifts[2], 9);
    expect(row[0].right - shifts[0] + gap).toBeCloseTo(row[1].left - shifts[1], 9);
  });

  it("nothing under the toolbar: no read-out moves", () => {
    expect(readoutRowShiftsLeftPx([box(150, 50), box(400, 40), box(540, 50)], clear, drawingWidth, gap)).toEqual([0, 0, 0]);
  });
});
