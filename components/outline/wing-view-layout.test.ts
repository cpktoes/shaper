import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD_SPEC } from "@/lib/geometry/board";
import { buildOutline } from "@/lib/geometry/outline";
import { inchesToMm, mm, mmToInches } from "@/lib/geometry/units";
import { nextWing, outlineWithoutWings } from "@/lib/geometry/wings";
import {
  CLOSE_UP,
  TAIL_WINDOW_IN,
  WINDOW_ROOM_IN,
  closeUpFrame,
  spreadApart,
  widestHalfWidthIn,
  wingWindow,
} from "./wing-view-layout";

// The WINGS tab's view maths (quick 261014-wii, 2026-10-14, P4). The frame's expected numbers are
// derived from the sketch's own constants, never typed.

describe("wingWindow — the last 26 inches, growing once a wing passes 24 (sketch 014 B)", () => {
  const length = DEFAULT_BOARD_SPEC.outline.length;

  it("no wings shows the last 26 inches", () => {
    expect(wingWindow(length, [])).toEqual({ lo: 0, hi: inchesToMm(TAIL_WINDOW_IN) });
  });

  it("a wing at exactly 24 inches still shows 26", () => {
    expect(wingWindow(length, [inchesToMm(24)]).hi).toBe(inchesToMm(TAIL_WINDOW_IN));
  });

  it("a wing a millimetre past 24 inches grows the window to it plus 3 inches", () => {
    const station = mm(inchesToMm(24) + 1);
    expect(wingWindow(length, [inchesToMm(11), station]).hi).toBe(station + inchesToMm(WINDOW_ROOM_IN));
  });

  it("never reaches past the nose", () => {
    const short = inchesToMm(20);
    expect(wingWindow(short, []).hi).toBe(short);
    expect(wingWindow(length, [mm(length - 10)]).hi).toBe(length);
  });
});

describe("closeUpFrame — the sketch's closeUpSvg arithmetic", () => {
  it("frames the default board's one-wing window from the sketch's constants", () => {
    const outline = DEFAULT_BOARD_SPEC.outline;
    const wing = nextWing([], null, outline.length, "imperial");
    const winged = buildOutline({ ...outline, wings: [wing] });
    const base = buildOutline(outlineWithoutWings(outline));
    const { lo, hi } = wingWindow(outline.length, [wing.station]);
    const loIn = mmToInches(lo);
    const hiIn = mmToInches(hi);
    const widest = widestHalfWidthIn([winged.points, base.points], loIn, hiIn);
    const frame = closeUpFrame(loIn, hiIn, widest);

    const u = (CLOSE_UP.height - CLOSE_UP.padTop - CLOSE_UP.padBottom) / (hiIn - loIn);
    const cx = CLOSE_UP.gutterLeft + widest * u + CLOSE_UP.sideRoom;
    expect(frame.unitsPerInch).toBeCloseTo(u, 12);
    expect(frame.cx).toBeCloseTo(cx, 9);
    expect(frame.width).toBe(Math.ceil(cx + widest * u + CLOSE_UP.sideRoom + CLOSE_UP.railRight));
    expect(frame.valueX).toBeCloseTo(cx + widest * u + CLOSE_UP.valueOffset, 9);
    expect(frame.extensionEndX).toBeCloseTo(cx + widest * u + CLOSE_UP.extensionReach, 9);
    expect(frame.chipRightX).toBe(CLOSE_UP.gutterLeft - CLOSE_UP.chipInset);
    expect(frame.toY(loIn)).toBe(CLOSE_UP.height - CLOSE_UP.padBottom);
    expect(frame.toY(hiIn)).toBeCloseTo(CLOSE_UP.padTop, 9);
    expect(frame.stationDimX(1) - frame.stationDimX(0)).toBe(CLOSE_UP.stationDimStep);
    // The widest half-width in the window is the widest of the drawn curve there.
    expect(widest).toBeGreaterThan(mmToInches(winged.halfTailBlockWidth));
  });
});

describe("spreadApart — read-outs pushed apart, never down", () => {
  it("leaves labels that do not clash where they are", () => {
    expect(spreadApart([{ y: 100, half: 0 }, { y: 300, half: 0 }], 40)).toEqual([100, 300]);
  });

  it("pushes the upper of two close labels up", () => {
    expect(spreadApart([{ y: 300, half: 10 }, { y: 290, half: 10 }], 6)).toEqual([300, 300 - 10 - 6 - 10]);
  });

  it("jumps a label above a fixed block it would overlap", () => {
    const [y] = spreadApart([{ y: 210, half: 10 }], 6, [{ top: 200, bottom: 240 }]);
    expect(y).toBe(200 - 6 - 10);
  });

  it("never moves anything down, and answers in input order", () => {
    const items = [
      { y: 50, half: 5 },
      { y: 400, half: 5 },
      { y: 395, half: 5 },
      { y: 390, half: 5 },
    ];
    const out = spreadApart(items, 4, [{ top: 300, bottom: 320 }]);
    out.forEach((y, i) => expect(y).toBeLessThanOrEqual(items[i].y));
    expect(out[1]).toBe(400);
    expect(out[0]).toBe(50);
    expect(out[2]).toBeLessThan(out[1]);
    expect(out[3]).toBeLessThan(out[2]);
  });
});
