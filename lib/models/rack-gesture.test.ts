import { describe, expect, it } from "vitest";
import {
  CAPTION_GLIDE_MS,
  DROP_MS,
  EDGE_MAX_STEP,
  EDGE_ZONE,
  HOLD_MS,
  HOVER_REST_MS,
  LIFT_MS,
  MOUSE_DRAG_THRESHOLD,
  SETTLE_MS,
  SLOT_SLIDE_MS,
  STATUS_HOLD_MS,
  STATUS_IN_MS,
  STATUS_OUT_MS,
  SWELL_FROM_MS,
  SWELL_SCALE,
  SWIPE_SETTLE_MS,
  TOUCH_SWIPE_THRESHOLD,
  easeOut,
  edgeScrollStep,
  holdSwell,
  hoverPressOutcome,
  swellScale,
  swipePressOutcome,
  tween,
} from "./rack-gesture";

describe("UI-SPEC §5 / §12: every rack timing in one place", () => {
  it("keeps the figures the sketches settled", () => {
    expect({
      HOLD_MS,
      SWELL_FROM_MS,
      SWELL_SCALE,
      MOUSE_DRAG_THRESHOLD,
      TOUCH_SWIPE_THRESHOLD,
      EDGE_ZONE,
      EDGE_MAX_STEP,
      HOVER_REST_MS,
      SWIPE_SETTLE_MS,
      SETTLE_MS,
      SLOT_SLIDE_MS,
      CAPTION_GLIDE_MS,
      LIFT_MS,
      DROP_MS,
      STATUS_IN_MS,
      STATUS_HOLD_MS,
      STATUS_OUT_MS,
    }).toEqual({
      HOLD_MS: 420,
      SWELL_FROM_MS: 120,
      SWELL_SCALE: 1.06,
      MOUSE_DRAG_THRESHOLD: 6,
      TOUCH_SWIPE_THRESHOLD: 8,
      EDGE_ZONE: 46,
      EDGE_MAX_STEP: 12,
      HOVER_REST_MS: 180,
      SWIPE_SETTLE_MS: 120,
      SETTLE_MS: 200,
      SLOT_SLIDE_MS: 110,
      CAPTION_GLIDE_MS: 160,
      LIFT_MS: 100,
      DROP_MS: 120,
      STATUS_IN_MS: 120,
      STATUS_HOLD_MS: 4000,
      STATUS_OUT_MS: 200,
    });
  });
});

describe("The hover rack: a mouse drags after 6 dots, a touch never drags (D-05)", () => {
  it("waits up to the threshold, then drags with a mouse or a pen", () => {
    expect(hoverPressOutcome("mouse", 0)).toBe("pending");
    expect(hoverPressOutcome("mouse", 6)).toBe("pending");
    expect(hoverPressOutcome("mouse", 7)).toBe("drag");
    expect(hoverPressOutcome("pen", 7)).toBe("drag");
  });

  it("treats a finger on the hover rack as a tap only, however far it moves", () => {
    expect(hoverPressOutcome("touch", 0)).toBe("tap-only");
    expect(hoverPressOutcome("touch", 50)).toBe("tap-only");
  });
});

describe("The swipe rack: hold to move, move first to swipe", () => {
  it("is a swipe when the finger moves over 8 dots before the hold completes", () => {
    expect(swipePressOutcome(100, 9, true)).toBe("swipe");
    expect(swipePressOutcome(100, 8, true)).toBe("pending");
    expect(swipePressOutcome(900, 9, false)).toBe("swipe");
  });

  it("is a hold at 420 ms of keeping still", () => {
    expect(swipePressOutcome(419, 3, true)).toBe("pending");
    expect(swipePressOutcome(420, 3, true)).toBe("held");
  });

  it("never holds while the hold is switched off (D-11)", () => {
    expect(swipePressOutcome(900, 3, false)).toBe("pending");
  });

  it("swells the held board from 120 ms to full at 420 ms", () => {
    expect(holdSwell(0)).toBe(0);
    expect(holdSwell(120)).toBe(0);
    expect(holdSwell(270)).toBe(0.5);
    expect(holdSwell(420)).toBe(1);
    expect(holdSwell(2000)).toBe(1);
    expect(swellScale(0)).toBe(1);
    expect(swellScale(420)).toBeCloseTo(SWELL_SCALE, 12);
    expect(swellScale(270)).toBeCloseTo(1 + (SWELL_SCALE - 1) / 2, 12);
  });
});

describe("SPEC constraint 8: easing, and no motion when a shaper asks for less", () => {
  it("eases out from 0 to 1", () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(0.5)).toBe(1 - 0.5 ** 3);
    expect(easeOut(-1)).toBe(0);
    expect(easeOut(2)).toBe(1);
  });

  it("jumps straight to the end with reduced motion", () => {
    expect(tween(0, 90, 50, 200, true)).toBe(90);
    expect(tween(0, 90, 0, 200, true)).toBe(90);
  });

  it("starts at from and ends at to, and never overshoots between", () => {
    expect(tween(0, 90, 0, 200, false)).toBe(0);
    expect(tween(0, 90, 200, 200, false)).toBe(90);
    expect(tween(0, 90, 500, 200, false)).toBe(90);
    for (let elapsed = 0; elapsed <= 200; elapsed += 10) {
      const forward = tween(0, 90, elapsed, 200, false);
      expect(forward).toBeGreaterThanOrEqual(0);
      expect(forward).toBeLessThanOrEqual(90);
      const back = tween(90, 10, elapsed, 200, false);
      expect(back).toBeGreaterThanOrEqual(10);
      expect(back).toBeLessThanOrEqual(90);
    }
    expect(tween(0, 90, 100, 0, false)).toBe(90);
  });
});

describe("Edge scroll while carrying a board", () => {
  it("scrolls left near the left edge and right near the right, ramping to 12 dots a frame", () => {
    expect(edgeScrollStep(0, 390)).toBe(-EDGE_MAX_STEP);
    expect(edgeScrollStep(23, 390)).toBe(-EDGE_MAX_STEP / 2);
    expect(edgeScrollStep(200, 390)).toBe(0);
    expect(edgeScrollStep(EDGE_ZONE, 390)).toBe(0);
    expect(edgeScrollStep(390 - 23, 390)).toBe(EDGE_MAX_STEP / 2);
    expect(edgeScrollStep(390, 390)).toBe(EDGE_MAX_STEP);
  });

  it("never scrolls faster than the cap past either edge", () => {
    expect(edgeScrollStep(-40, 390)).toBe(-EDGE_MAX_STEP);
    expect(edgeScrollStep(500, 390)).toBe(EDGE_MAX_STEP);
  });
});
