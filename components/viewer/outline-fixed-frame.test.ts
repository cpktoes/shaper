import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

// `outline-viewer.tsx` reads `useUnits()` -> the real "use server" units-preference action -> the database
// client at import time. Stubbed as wing-view-layout.test.ts does; this file only needs the pure metrics.
vi.mock("@/app/actions/units", () => ({ saveUnitsPreference: async () => {} }));

import { FIXED_FRAME_REFERENCE, fixedFrameHalfWidth, fixedFrameScale } from "@/components/viewer/callout-primitives";
import { outlineViewMetrics } from "@/components/outline/outline-viewer";
import { BOARD_LENGTH_RANGE_IN, DEFAULT_BOARD_SPEC, WIDEPOINT_WIDTH_RANGE_IN, type OutlineSpec } from "@/lib/geometry/board";
import { buildOutline } from "@/lib/geometry/outline";
import { inchesToMm, mmToInches } from "@/lib/geometry/units";

/**
 * The order form's template window (quick 261113-si7, B4). The window (`fixedFrame`) is sized once, from the
 * widest-for-its-length board the app made before 4'0" boards existed (5'0" x 25"), so it never resizes around
 * whichever board is loaded. A 4'0" x 25" board draws wider than that window (140 units each side of the stringer
 * in a window 133 wide, its rails cut off by about 21); the fix is that such a board draws a little shorter in the
 * window instead of the window growing — which would draw every board smaller on every order form. These tests
 * hold both halves: every board the window was made for is bit for bit what it was, and the new short, wide one
 * is whole.
 *
 * `outline-viewer.tsx` keeps its frame constants module-private; they are read off the real source as text, the
 * idiom `drag-spacing.test.ts` uses, so this can never drift from what the viewer draws.
 */
const SOURCE = readFileSync(new URL("../outline/outline-viewer.tsx", import.meta.url), "utf8");
function readModuleConst(name: string): number {
  const match = SOURCE.match(new RegExp(`const ${name}\\s*=\\s*(\\d+(?:\\.\\d+)?)`));
  if (!match) throw new Error(`could not find "const ${name} = <number>" in outline-viewer.tsx — has it moved?`);
  return Number(match[1]);
}
const VIEW_W = readModuleConst("VIEW_W");
const VIEW_H = readModuleConst("VIEW_H");
const PAD_Y = readModuleConst("PAD_Y");
const CROP_PAD_X = readModuleConst("CROP_PAD_X");
/** `LEGACY_MAX_HALF_WIDTH_PX` is `VIEW_W / 2 - 30` in the source. */
const LEGACY_MAX_HALF_WIDTH_PX = VIEW_W / 2 - 30;

const board = (lengthIn: number, widthIn: number): OutlineSpec => ({
  ...DEFAULT_BOARD_SPEC.outline,
  length: inchesToMm(lengthIn),
  widePointWidth: inchesToMm(widthIn),
});

/** What a `hideCallouts` drawing's scale was before this change — the two-way fit, written out, read off the
 * built board the way the viewer reads it (its length and half-width back through millimetres). */
function scaleBefore(lengthIn: number, widthIn: number): number {
  const geometry = buildOutline(board(lengthIn, widthIn));
  return Math.min(LEGACY_MAX_HALF_WIDTH_PX / mmToInches(geometry.halfWidePointWidth), (VIEW_H - PAD_Y * 2) / mmToInches(geometry.length));
}

/** The window's half-width as it was computed before this change, written out. */
const FRAME_HALF_BEFORE = (25 / 2) * ((VIEW_H - PAD_Y * 2) / 60) + CROP_PAD_X;

describe("the order form's template window keeps its size", () => {
  it("is sized from 5'0\" x 25\", the widest-for-its-length board the app made before 4'0\" boards", () => {
    expect(FIXED_FRAME_REFERENCE).toEqual({ lengthIn: 60, widthIn: 25 });
    // ~133.17 units; the very same number, reached the very same way, as before.
    expect(fixedFrameHalfWidth(VIEW_H, PAD_Y, CROP_PAD_X)).toBe(FRAME_HALF_BEFORE);
    expect(FRAME_HALF_BEFORE).toBeCloseTo(133.17, 2);
  });

  it("does not follow the app's own shortest board or widest short board", () => {
    // A 4'0" minimum would have grown the window; the reference is its own named board.
    expect(BOARD_LENGTH_RANGE_IN.min).toBeLessThan(FIXED_FRAME_REFERENCE.lengthIn);
    expect(WIDEPOINT_WIDTH_RANGE_IN.max).toBe(FIXED_FRAME_REFERENCE.widthIn);
  });
});

describe("a board inside the sizes the window was made for draws exactly as before", () => {
  it("5'0\" x 25\" and every board 5'0\"-12'0\" x 16\"-25\" and 31\" has the scale it always had, bit for bit", () => {
    for (let lengthIn = 60; lengthIn <= 144; lengthIn += 6) {
      for (const widthIn of [16, 18, 20, 22, 24, 25]) {
        const geometry = buildOutline(board(lengthIn, widthIn));
        const withFrame = outlineViewMetrics(geometry, true, true).scale;
        expect(withFrame, `${lengthIn}" x ${widthIn}"`).toBe(scaleBefore(lengthIn, widthIn));
      }
    }
  });

  it("a wide, long board (8'0\" to 12'0\" x 31\") also keeps the scale it would have had", () => {
    for (const lengthIn of [96, 120, 144]) {
      const geometry = buildOutline(board(lengthIn, 31));
      expect(outlineViewMetrics(geometry, true, true).scale, `${lengthIn}"`).toBe(scaleBefore(lengthIn, 31));
    }
  });

  it("a drawing that is not in the fixed window (a preset card's thumbnail, the editor) is untouched", () => {
    for (const [lengthIn, widthIn] of [
      [48, 25],
      [60, 25],
      [72, 19],
    ] as const) {
      const geometry = buildOutline(board(lengthIn, widthIn));
      expect(outlineViewMetrics(geometry, true, false).scale).toBe(scaleBefore(lengthIn, widthIn));
      expect(outlineViewMetrics(geometry, false).scale).toBe((VIEW_H - PAD_Y * 2) / mmToInches(geometry.length));
    }
  });
});

describe("a 4'0\" x 25\" board is drawn whole in the window", () => {
  it("its rails stay inside the window less the crop pad, and its tip and tail inside the view's height", () => {
    const geometry = buildOutline(board(48, 25));
    const { scale } = outlineViewMetrics(geometry, true, true);
    const drawnHalf = mmToInches(geometry.halfWidePointWidth) * scale;
    // Held: before the fix this was 140 units, past the 119.2 the window leaves.
    expect(scaleBefore(48, 25) * mmToInches(geometry.halfWidePointWidth)).toBeGreaterThan(FRAME_HALF_BEFORE - CROP_PAD_X);
    expect(drawnHalf).toBeLessThanOrEqual(FRAME_HALF_BEFORE - CROP_PAD_X + 1e-9);
    expect(drawnHalf).toBeCloseTo(FRAME_HALF_BEFORE - CROP_PAD_X, 6);
    // The board is drawn whole along its length too, and a little shorter than the window's full height.
    const lengthDrawn = 48 * scale;
    expect(lengthDrawn).toBeLessThanOrEqual(VIEW_H - PAD_Y * 2 + 1e-9);
    expect(lengthDrawn).toBeLessThan(VIEW_H - PAD_Y * 2);
  });

  it("every board from 4'0\" to 5'0\" and 16\" to 25\" fits, and one narrow enough keeps the full-height scale", () => {
    for (let lengthIn = 48; lengthIn <= 60; lengthIn += 2) {
      for (const widthIn of [16, 20, 22, 25]) {
        const geometry = buildOutline(board(lengthIn, widthIn));
        const { scale } = outlineViewMetrics(geometry, true, true);
        expect(mmToInches(geometry.halfWidePointWidth) * scale, `${lengthIn}" x ${widthIn}"`).toBeLessThanOrEqual(
          FRAME_HALF_BEFORE - CROP_PAD_X + 1e-9,
        );
      }
    }
    // 4'0" x 16": half-width 8 x 11.92 = 95 units, well inside — its scale is the full-height one, untouched.
    expect(outlineViewMetrics(buildOutline(board(48, 16)), true, true).scale).toBe(scaleBefore(48, 16));
  });
});

describe("fixedFrameScale", () => {
  it("returns today's scale when the hold would only differ by a float's dust", () => {
    const today = 9.533333333333333;
    expect(fixedFrameScale(today, 12.5, 12.5 * today + 14, 14)).toBe(today);
    expect(fixedFrameScale(today, 12.5, 12.5 * (today + 1e-12) + 14, 14)).toBe(today);
  });

  it("holds the scale down when the board would draw past the window", () => {
    expect(fixedFrameScale(11.2, 12.5, 133.17, 14)).toBeCloseTo((133.17 - 14) / 12.5, 12);
  });

  it("leaves today's scale for a half-width that is not a number or not positive", () => {
    expect(fixedFrameScale(5, 0, 133.17, 14)).toBe(5);
    expect(fixedFrameScale(5, Number.NaN, 133.17, 14)).toBe(5);
  });
});
