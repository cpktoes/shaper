import { describe, expect, it } from "vitest";
import {
  BOARD_LENGTH_RANGE_IN,
  DEFAULT_BOARD_SPEC,
  TAIL_PRESETS,
  WIDEPOINT_WIDTH_RANGE_IN,
  WIDE_BOARD_FROM_LENGTH_IN,
  WIDE_BOARD_WIDEPOINT_MAX_IN,
  holdOutlineToLength,
  widePointOffsetRangeIn,
  widePointWidthRangeIn,
  type OutlineSpec,
} from "./board";
import { buildOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { inchesToMm, mm, mmToInches } from "./units";

const BASE = DEFAULT_BOARD_SPEC.outline;
const IN = (v: number) => inchesToMm(v);
const board = (lengthIn: number, widthIn: number, offsetIn = 0): OutlineSpec => ({
  ...BASE,
  length: IN(lengthIn),
  widePointWidth: IN(widthIn),
  widePointOffset: IN(offsetIn),
});

describe("the range of boards the app makes (quick 261113-si7)", () => {
  it("runs from 4'0\" to 12'0\" long", () => {
    expect(BOARD_LENGTH_RANGE_IN).toEqual({ min: 48, max: 144 });
  });

  it("keeps 25\" as the widest a board under 8'0\" can be, and 16\" as the narrowest of all", () => {
    expect(WIDEPOINT_WIDTH_RANGE_IN).toEqual({ min: 16, max: 25 });
    expect(WIDE_BOARD_FROM_LENGTH_IN).toBe(96);
    expect(WIDE_BOARD_WIDEPOINT_MAX_IN).toBe(31);
  });
});

describe("widePointWidthRangeIn — the widest a board can be depends on its length", () => {
  it("is 16\"-25\" under 8'0\", up to a hair under it", () => {
    expect(widePointWidthRangeIn(IN(95.9375))).toEqual({ min: 16, max: 25 });
    expect(widePointWidthRangeIn(IN(48))).toEqual({ min: 16, max: 25 });
    expect(widePointWidthRangeIn(IN(60))).toEqual({ min: 16, max: 25 });
  });

  it("is 16\"-31\" from 8'0\" up — 8'0\" itself included (the founder's ruling)", () => {
    expect(widePointWidthRangeIn(IN(96))).toEqual({ min: 16, max: 31 });
    expect(widePointWidthRangeIn(IN(120))).toEqual({ min: 16, max: 31 });
    expect(widePointWidthRangeIn(IN(144))).toEqual({ min: 16, max: 31 });
  });

  it("holds the line at 8'0\" for a Metric board too: 243.8 cm is under it, 243.9 cm is over", () => {
    expect(widePointWidthRangeIn(mm(2438)).max).toBe(25);
    expect(widePointWidthRangeIn(mm(2439)).max).toBe(31);
    // 8'0" is 2438.4 mm — float slack must not push it under.
    expect(widePointWidthRangeIn(mm(8 * 12 * 25.4)).max).toBe(31);
  });

  it("reads a length that is not a number as a board under 8'0\"", () => {
    expect(widePointWidthRangeIn(mm(Number.NaN)).max).toBe(25);
    expect(widePointWidthRangeIn(mm(Number.POSITIVE_INFINITY)).max).toBe(25);
  });
});

describe("widePointOffsetRangeIn — the Offset never promises more than the drawing shows", () => {
  it("is ±8\" on a 4'0\" and ±11\" on a 4'6\"", () => {
    expect(widePointOffsetRangeIn(IN(48))).toEqual({ min: -8, max: 8 });
    expect(widePointOffsetRangeIn(IN(54))).toEqual({ min: -11, max: 11 });
  });

  it("is the full ±12\" from 4'8\" up", () => {
    for (const lengthIn of [56, 60, 72, 96, 144]) {
      expect(widePointOffsetRangeIn(IN(lengthIn)), `${lengthIn}"`).toEqual({ min: -12, max: 12 });
    }
  });

  it("lands on the slider's own 1/4\" grid", () => {
    expect(widePointOffsetRangeIn(IN(54.5))).toEqual({ min: -11.25, max: 11.25 });
    expect(widePointOffsetRangeIn(IN(54.4)).max).toBe(11);
  });

  it("never goes below zero", () => {
    expect(widePointOffsetRangeIn(IN(20))).toEqual({ min: 0, max: 0 });
    expect(Object.is(widePointOffsetRangeIn(IN(20)).min, 0)).toBe(true);
    expect(widePointOffsetRangeIn(mm(Number.NaN))).toEqual({ min: 0, max: 0 });
  });

  it("is exactly how far the outline lets the widest point travel (the 16\" end margin)", () => {
    // Slide the widest point as far toward the tail as the window allows, then far past it: the
    // drawing must not move the widest point any further than the window's own edge.
    for (const lengthIn of [48, 50, 54, 56]) {
      const { max } = widePointOffsetRangeIn(IN(lengthIn));
      const atEdge = buildOutline(board(lengthIn, 20, -max)).widePointStation;
      const pastEdge = buildOutline(board(lengthIn, 20, -40)).widePointStation;
      expect(mmToInches(atEdge), `${lengthIn}" at the window's edge`).toBeCloseTo(lengthIn / 2 - max, 6);
      expect(mmToInches(pastEdge), `${lengthIn}" far past it`).toBeCloseTo(16, 6);
      // From 4'8" up the window stops short of where the drawing would stop; nothing past 12" is offered.
      if (lengthIn >= 56) expect(max).toBe(12);
    }
  });
});

describe("holdOutlineToLength — a stored board is read for the length it has", () => {
  it("hands back the very same object for every preset", () => {
    for (const preset of BOARD_PRESETS) {
      expect(holdOutlineToLength(preset.outline), preset.id).toBe(preset.outline);
    }
    expect(holdOutlineToLength(BASE)).toBe(BASE);
  });

  it("hands back the very same object for boards inside the sizes the app made before", () => {
    for (const lengthIn of [60, 72, 96, 120]) {
      for (const widthIn of [16, 22, 25]) {
        for (const offsetIn of [-12, 0, 12]) {
          const spec = board(lengthIn, widthIn, offsetIn);
          expect(holdOutlineToLength(spec), `${lengthIn}x${widthIn} off ${offsetIn}`).toBe(spec);
        }
      }
    }
  });

  it("hands back the same object for a 12'0\" × 31\" and an 8'0\" × 31\" board", () => {
    const a = board(144, 31);
    const b = board(96, 31);
    expect(holdOutlineToLength(a)).toBe(a);
    expect(holdOutlineToLength(b)).toBe(b);
  });

  it("brings a 7'0\" board that is 31\" wide back 25\" wide, and moves nothing else", () => {
    const spec = board(84, 31, 3);
    const held = holdOutlineToLength(spec);
    expect(held).not.toBe(spec);
    expect(held.widePointWidth).toBe(IN(25));
    expect(held).toEqual({ ...spec, widePointWidth: IN(25) });
    // The stored board itself is untouched — lengthening it brings the width back.
    expect(spec.widePointWidth).toBe(IN(31));
    expect(holdOutlineToLength({ ...spec, length: IN(96) }).widePointWidth).toBe(IN(31));
  });

  it("holds a width just over 25\" on a board a hair under 8'0\", and lets 8'0\" keep it", () => {
    expect(holdOutlineToLength(board(95.9375, 28)).widePointWidth).toBe(IN(25));
    expect(holdOutlineToLength(board(96, 28)).widePointWidth).toBe(IN(28));
  });

  it("never raises a width", () => {
    const narrow = board(144, 16);
    expect(holdOutlineToLength(narrow)).toBe(narrow);
    expect(holdOutlineToLength(board(60, 18)).widePointWidth).toBe(IN(18));
  });

  it("brings a 4'0\" board with its widest point 12\" toward the tail back to 8\"", () => {
    const held = holdOutlineToLength(board(48, 20, -12));
    expect(held.widePointOffset).toBe(IN(-8));
    expect(held.widePointWidth).toBe(IN(20));
    expect(holdOutlineToLength(board(48, 20, 12)).widePointOffset).toBe(IN(8));
    // Inside the window, nothing moves.
    const inside = board(48, 20, -6);
    expect(holdOutlineToLength(inside)).toBe(inside);
  });

  it("leaves an Offset past 12\" alone on a board 4'8\" or longer (a hand-made file keeps drawing as it did)", () => {
    const spec = board(72, 20, 13);
    expect(holdOutlineToLength(spec)).toBe(spec);
  });

  it("changes no drawing for an Offset it holds: the outline already stops the widest point there", () => {
    const spec = board(48, 20, -12);
    const a = buildOutline(spec);
    const b = buildOutline(holdOutlineToLength(spec));
    expect(b.widePointStation).toBeCloseTo(a.widePointStation, 9);
    expect(b.area).toBeCloseTo(a.area, 6);
  });

  it("builds every tail kind on a 4'0\" and a 12'0\" × 31\" board with no NaN and a widest point of exactly the width", () => {
    for (const [lengthIn, widthIn] of [
      [48, 16],
      [48, 25],
      [144, 31],
    ] as const) {
      for (const kind of Object.keys(TAIL_PRESETS) as (keyof typeof TAIL_PRESETS)[]) {
        const t = TAIL_PRESETS[kind];
        const spec = { ...board(lengthIn, widthIn), tail: t.tail, tailAngle: t.tailAngle, tailFullness: t.tailFullness };
        const g = buildOutline(spec);
        expect(Number.isFinite(g.area), `${lengthIn}x${widthIn} ${kind}`).toBe(true);
        expect(g.halfWidePointWidth).toBeCloseTo(spec.widePointWidth / 2, 9);
      }
    }
  });
});
