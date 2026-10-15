import { describe, expect, it } from "vitest";
import { MIN_PINNED_FIT_SCALE, pinnedCalloutSizes } from "@/components/viewer/callout-primitives";
import { DEFAULT_BOARD_SPEC } from "@/lib/geometry/board";
import { buildOutline } from "@/lib/geometry/outline";
import { inchesToMm, mm, mmToInches } from "@/lib/geometry/units";
import { nextWing, outlineWithoutWings } from "@/lib/geometry/wings";
import {
  CLOSE_UP,
  CLOSE_UP_COMPACT,
  TAIL_WINDOW_IN,
  WINDOW_ROOM_IN,
  closeUpFrame,
  spreadApart,
  useCompactFrame,
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

describe("the compact frame — the close-up fitting itself on a phone and a narrow window (plan 02, P13)", () => {
  /** The default board's one-wing window, as the close-up frames it (F27). */
  function defaultWindow() {
    const outline = DEFAULT_BOARD_SPEC.outline;
    const wing = nextWing([], null, outline.length, "imperial");
    const winged = buildOutline({ ...outline, wings: [wing] });
    const base = buildOutline(outlineWithoutWings(outline));
    const { lo, hi } = wingWindow(outline.length, [wing.station]);
    const loIn = mmToInches(lo);
    const hiIn = mmToInches(hi);
    return { loIn, hiIn, widest: widestHalfWidthIn([winged.points, base.points], loIn, hiIn) };
  }

  // TEMPLATE's drawing boxes with the tab strip tabbed (plan 01, F22), measured at plan time (F27).
  const BOXES = [
    { name: "iPhone upright (390 x 844)", w: 380, h: 508.0, compact: true },
    { name: "Pixel upright (412 x 915)", w: 402, h: 554.9, compact: true },
    { name: "iPhone sideways (844 x 390)", w: 482, h: 293, compact: true },
    { name: "Pixel sideways (863 x 360)", w: 491.5, h: 263, compact: true },
    { name: "computer 1024 x 768", w: 548, h: 582, compact: true },
    { name: "computer 1280 x 800", w: 804, h: 614, compact: false },
  ];

  it.each(BOXES)("$name: compact is $compact", ({ w, h, compact }) => {
    const { loIn, hiIn, widest } = defaultWindow();
    const full = closeUpFrame(loIn, hiIn, widest);
    expect(useCompactFrame(w, h, full.width, MIN_PINNED_FIT_SCALE)).toBe(compact);
  });

  it("an unmeasured box keeps the full frame", () => {
    expect(useCompactFrame(0, 0, 882, MIN_PINNED_FIT_SCALE)).toBe(false);
  });

  it("is decided by the full frame's fit against the floor, nothing else", () => {
    const { loIn, hiIn, widest } = defaultWindow();
    const full = closeUpFrame(loIn, hiIn, widest);
    const atFloor = full.width * MIN_PINNED_FIT_SCALE;
    const roomy = 10000;
    expect(useCompactFrame(atFloor + 1, roomy, full.width, MIN_PINNED_FIT_SCALE)).toBe(false);
    expect(useCompactFrame(atFloor - 1, roomy, full.width, MIN_PINNED_FIT_SCALE)).toBe(true);
    expect(useCompactFrame(roomy, CLOSE_UP.height * MIN_PINNED_FIT_SCALE - 1, full.width, MIN_PINNED_FIT_SCALE)).toBe(true);
  });

  it("closeUpFrame(..., true) is built from the compact constants", () => {
    const { loIn, hiIn, widest } = defaultWindow();
    const frame = closeUpFrame(loIn, hiIn, widest, true);
    const c = CLOSE_UP_COMPACT;
    const u = (c.height - c.padTop - c.padBottom) / (hiIn - loIn);
    const cx = c.gutterLeft + widest * u + c.sideRoom;
    expect(frame.unitsPerInch).toBeCloseTo(u, 12);
    expect(frame.width).toBe(Math.ceil(cx + widest * u + c.sideRoom + c.railRight));
    expect(frame.valueX).toBeCloseTo(cx + widest * u + c.valueOffset, 9);
    expect(frame.chipRightX).toBe(c.gutterLeft - c.chipInset);
    expect(frame.toY(hiIn)).toBeCloseTo(c.padTop, 9);
    // Narrower than the full frame, and every inch drawn bigger.
    const full = closeUpFrame(loIn, hiIn, widest);
    expect(frame.width).toBeLessThan(full.width);
    expect(frame.unitsPerInch).toBeGreaterThan(full.unitsPerInch);
  });

  it("its chip column holds a WING chip at the pinned floor, left edge inside the drawing", () => {
    const { loIn, hiIn, widest } = defaultWindow();
    const frame = closeUpFrame(loIn, hiIn, widest, true);
    const { chipW } = pinnedCalloutSizes(MIN_PINNED_FIT_SCALE);
    expect(frame.chipRightX - chipW).toBeGreaterThanOrEqual(0);
  });
});
