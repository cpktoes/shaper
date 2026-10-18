import { describe, expect, it, vi } from "vitest";

// `outline-viewer.tsx` (for `outlineViewBoxSize`) reads `useUnits()` -> the real "use server"
// units-preference action -> the database client at import time. Stubbed as rail-callouts.test.ts
// does; this file only needs the VIEWER's pure frame size, never a render.
vi.mock("@/app/actions/units", () => ({ saveUnitsPreference: async () => {} }));

import { MIN_PINNED_FIT_SCALE } from "@/components/viewer/callout-primitives";
import { DEFAULT_BOARD_SPEC, type OutlineSpec } from "@/lib/geometry/board";
import { buildOutline } from "@/lib/geometry/outline";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { outlineViewBoxSize } from "./outline-viewer";
import { inchesToMm, mm, mmToInches } from "@/lib/geometry/units";
import { NO_FIN_EDGES, nextWing, outlineWithoutWings } from "@/lib/geometry/wings";
import {
  CLOSE_UP,
  CLOSE_UP_CORNER_PX,
  TAIL_WINDOW_IN,
  WINDOW_ROOM_IN,
  WING_CARD_LABEL_PX,
  WING_CARD_PX,
  closeUpFrame,
  spreadApart,
  widestHalfWidthIn,
  wingCardHeightPx,
  wingWindow,
} from "./wing-view-layout";

// The WINGS tab's view maths (quick 261014-wii, 2026-10-14, P4; the one frame, quick 261015-my3,
// 2026-10-15, D6). The frame's expected numbers are F5's, measured in a real browser at plan time.

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


/** A board's two-wing window as the close-up frames it: the wings the sidebar's "+ Add a wing" and
 * "+ Add wing 2" make, or, `grownTo` given, wing 1 carried to that station so the window grows. */
function boardWindow(outline: OutlineSpec, grownTo?: number) {
  const g0 = buildOutline(outlineWithoutWings(outline));
  const w1 = nextWing([], NO_FIN_EDGES, g0, "imperial");
  const w2 = nextWing([w1], NO_FIN_EDGES, buildOutline({ ...outline, wings: [w1] }), "imperial");
  const wings = grownTo === undefined ? [w1, w2] : [{ ...w1, station: inchesToMm(grownTo) }, w2];
  const winged = buildOutline({ ...outline, wings });
  const { lo, hi } = wingWindow(outline.length, wings.map((w) => w.station));
  const loIn = mmToInches(lo);
  const hiIn = mmToInches(hi);
  return {
    loIn,
    hiIn,
    widest: widestHalfWidthIn([winged.points, g0.points], loIn, hiIn),
    tailBlock: !winged.tailBlockPinned,
  };
}

/** The default board's one-wing window (widest 9.20"), with its tail block. */
function defaultWindow() {
  const outline = DEFAULT_BOARD_SPEC.outline;
  const wing = nextWing([], NO_FIN_EDGES, buildOutline(outline), "imperial");
  const winged = buildOutline({ ...outline, wings: [wing] });
  const base = buildOutline(outlineWithoutWings(outline));
  const { lo, hi } = wingWindow(outline.length, [wing.station]);
  const loIn = mmToInches(lo);
  const hiIn = mmToInches(hi);
  return { loIn, hiIn, widest: widestHalfWidthIn([winged.points, base.points], loIn, hiIn) };
}

const MIN_FIT = MIN_PINNED_FIT_SCALE;
const fine = CLOSE_UP_CORNER_PX.fine;
const coarse = CLOSE_UP_CORNER_PX.coarse;
const pxPerInch = (f: { unitsPerInch: number; fit: number }) => f.unitsPerInch * f.fit;

describe("closeUpFrame — the one frame, as large as it can be (quick 261015-my3, D6, F5)", () => {
  it("the default board's 26-inch window is 9.20 inches at its widest", () => {
    const { loIn, hiIn, widest } = defaultWindow();
    expect(loIn).toBe(0);
    expect(hiIn).toBe(26);
    expect(widest).toBeCloseTo(9.2, 2);
  });

  it("1280 x 800 (box 804 x 614, a mouse): the board at the window's middle, the cards just left of it, no top pad", () => {
    const { loIn, hiIn, widest } = defaultWindow();
    const f = closeUpFrame(loIn, hiIn, widest, { tailBlock: true, box: { width: 804, height: 614 }, corner: fine, minFit: MIN_FIT });
    // Centred (the founder, 2026-10-15): the stringer is the frame's middle, and the cards' gutter is
    // what lies left of the board — wider than the card needs (the hug's 143.2).
    expect(Math.abs(f.cx - f.width / 2)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(f.gutterLeft - 180.7)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(f.fit - 0.99)).toBeLessThanOrEqual(0.002);
    expect(Math.abs(pxPerInch(f) - 22.09)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(f.width - 811.9)).toBeLessThanOrEqual(1);
    expect(f.padTop).toBe(8);
    expect(f.padBottom).toBe(32);
    expect(f.chipRightX).toBeCloseTo(f.gutterLeft - CLOSE_UP.chipInset, 9);
    expect(f.toY(hiIn)).toBeCloseTo(8, 9);
    expect(f.toY(loIn)).toBe(CLOSE_UP.height - 32);
  });

  it("1024 x 768 (box 548 x 582, a mouse): the corner rule moves the board's top below the toolbar and zoom row", () => {
    const { loIn, hiIn, widest } = defaultWindow();
    const f = closeUpFrame(loIn, hiIn, widest, { tailBlock: true, box: { width: 548, height: 582 }, corner: fine, minFit: MIN_FIT });
    expect(f.padTop).toBeGreaterThanOrEqual(87);
    expect(f.padTop).toBeLessThanOrEqual(89);
    expect(Math.abs(f.fit - 0.939)).toBeLessThanOrEqual(0.002);
    expect(Math.abs(pxPerInch(f) - 18.06)).toBeLessThanOrEqual(0.1);
    expect(f.padTop * f.fit).toBeGreaterThanOrEqual(fine.height + CLOSE_UP.cornerClearPx);
  });

  it("an upright iPhone (box 380 x 389, a finger): the gutter at the floor, the board's top below the toolbar", () => {
    const { loIn, hiIn, widest } = defaultWindow();
    const f = closeUpFrame(loIn, hiIn, widest, { tailBlock: true, box: { width: 380, height: 389 }, corner: coarse, minFit: MIN_FIT });
    expect(Math.abs(f.gutterLeft - 203.8)).toBeLessThanOrEqual(0.5);
    expect(f.padTop).toBeGreaterThanOrEqual(64);
    expect(f.padTop).toBeLessThanOrEqual(66);
    expect(Math.abs(pxPerInch(f) - 12.44)).toBeLessThanOrEqual(0.1);
  });

  it("a sideways iPhone (box 482 x 293): bound by its height, the same size (10.54 px per inch), shifted left just enough to clear the four-button touch toolbar", () => {
    const { loIn, hiIn, widest } = defaultWindow();
    const box = { width: 482, height: 293 };
    const f = closeUpFrame(loIn, hiIn, widest, { tailBlock: true, box, corner: coarse, minFit: MIN_FIT });
    expect(f.padTop).toBe(8);
    expect(Math.abs(pxPerInch(f) - 10.54)).toBeLessThanOrEqual(0.05);
    // Quick 261018-e6w: the touch corner is now 154 wide (the fin-placement button joined the
    // toolbar), so the board no longer sits in the middle — it leaves the corner's width plus the
    // clearance on its right, and its stringer is left of the frame's middle.
    const boardRight = f.toX(widest) * f.fit;
    expect(box.width - boardRight).toBeGreaterThanOrEqual(coarse.width + CLOSE_UP.cornerClearPx - 1e-6);
    expect(f.cx).toBeLessThan(f.width / 2);
  });

  it("a wide window (box 1150 x 720, the founder's): the board centred at the hug's size, the cards beside it", () => {
    const { loIn, hiIn, widest } = defaultWindow();
    const box = { width: 1150, height: 720 };
    const f = closeUpFrame(loIn, hiIn, widest, { tailBlock: true, box, corner: fine, minFit: MIN_FIT });
    expect(Math.abs(f.cx - f.width / 2)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(pxPerInch(f) - 25.91)).toBeLessThanOrEqual(0.05);
    expect(f.padTop).toBe(8);
    // The cards sit just left of the board's side room, not at the frame's left edge.
    expect(f.chipRightX).toBeCloseTo(f.toX(-widest) - CLOSE_UP.sideRoom - CLOSE_UP.chipInset, 9);
  });

  it("where the window has no spare width (1024 x 768, an upright iPhone) the board keeps its size and sits as near the middle as its cards allow", () => {
    const { loIn, hiIn, widest } = defaultWindow();
    for (const [box, corner, ppi] of [
      [{ width: 548, height: 582 }, fine, 18.06],
      [{ width: 380, height: 389 }, coarse, 12.45],
    ] as const) {
      const f = closeUpFrame(loIn, hiIn, widest, { tailBlock: true, box, corner, minFit: MIN_FIT });
      expect(Math.abs(pxPerInch(f) - ppi)).toBeLessThanOrEqual(0.1);
      // Right of the middle, because at the middle the cards would not fit: they would cross their
      // 8-unit margin at the frame's left edge.
      expect(f.cx).toBeGreaterThan(f.width / 2);
      const cardLeft = f.chipRightX - WING_CARD_PX.width / Math.max(f.fit, MIN_FIT);
      expect(cardLeft).toBeGreaterThanOrEqual(CLOSE_UP.cardMargin - 1e-6);
      expect(cardLeft - (f.cx - f.width / 2)).toBeLessThan(CLOSE_UP.cardMargin);
    }
  });

  it("the bottom pad is 16 with no tail block and 32 with one (the words under the tail, D3)", () => {
    const { loIn, hiIn, widest } = defaultWindow();
    const box = { width: 804, height: 614 };
    expect(closeUpFrame(loIn, hiIn, widest, { tailBlock: false, box, corner: fine, minFit: MIN_FIT }).padBottom).toBe(16);
    expect(closeUpFrame(loIn, hiIn, widest, { tailBlock: true, box, corner: fine, minFit: MIN_FIT }).padBottom).toBe(32);
    const noBlock = closeUpFrame(loIn, hiIn, widest, { tailBlock: false, box, corner: fine, minFit: MIN_FIT });
    expect(noBlock.toY(loIn)).toBe(CLOSE_UP.height - 16);
  });

  it("an unmeasured box (0 x 0) builds pass 1 alone: no top pad, the gutter at the floor", () => {
    const { loIn, hiIn, widest } = defaultWindow();
    const f = closeUpFrame(loIn, hiIn, widest, { tailBlock: true, box: { width: 0, height: 0 }, corner: fine, minFit: MIN_FIT });
    const floor = CLOSE_UP.chipInset + WING_CARD_PX.width / MIN_FIT + CLOSE_UP.cardMargin;
    expect(f.padTop).toBe(8);
    expect(f.gutterLeft).toBeCloseTo(floor, 9);
    expect(f.fit).toBe(0);
    const u = (CLOSE_UP.height - 8 - 32) / (hiIn - loIn);
    expect(f.unitsPerInch).toBeCloseTo(u, 12);
    expect(f.width).toBeCloseTo(floor + 2 * widest * u + 2 * CLOSE_UP.sideRoom, 1);
    expect(closeUpFrame(loIn, hiIn, widest, { tailBlock: true, minFit: MIN_FIT }).gutterLeft).toBeCloseTo(floor, 9);
  });

  // The five boards' windows (26" and grown) over the six boxes of F1, each with its own corner.
  const BOARDS: [string, OutlineSpec][] = [
    ["default", DEFAULT_BOARD_SPEC.outline],
    ...BOARD_PRESETS.map((p) => [p.name, p.outline] as [string, OutlineSpec]),
  ];
  const BOXES = [
    { name: "1280 x 800", width: 804, height: 614, corner: fine },
    { name: "1024 x 768", width: 548, height: 582, corner: fine },
    { name: "iPhone upright", width: 380, height: 389, corner: coarse },
    { name: "Pixel upright", width: 402, height: 505, corner: coarse },
    { name: "Pixel sideways", width: 492, height: 263, corner: coarse },
    { name: "iPhone sideways", width: 482, height: 293, corner: coarse },
  ];
  const CASES = BOARDS.flatMap(([name, outline]) =>
    [undefined, 34, 50].flatMap((grownTo) =>
      BOXES.map((box) => ({ label: `${name}, ${grownTo === undefined ? "26-inch window" : `wing at ${grownTo}"`}, ${box.name}`, outline, grownTo, box })),
    ),
  );

  it.each(CASES)("$label: never below pass 1, the card inside its gutter, the board clear of the corner, nothing wider than the box", ({ outline, grownTo, box }) => {
    const { loIn, hiIn, widest, tailBlock } = boardWindow(outline, grownTo);
    const f = closeUpFrame(loIn, hiIn, widest, { tailBlock, box, corner: box.corner, minFit: MIN_FIT });
    // Pass 1 by hand: the gutter at the floor, no top pad.
    const padBottom = tailBlock ? CLOSE_UP.padBottomTailBlock : CLOSE_UP.padBottom;
    const u1 = (CLOSE_UP.height - CLOSE_UP.padTop - padBottom) / (hiIn - loIn);
    const w1 = CLOSE_UP.chipInset + WING_CARD_PX.width / MIN_FIT + CLOSE_UP.cardMargin + 2 * widest * u1 + 2 * CLOSE_UP.sideRoom;
    const fit1 = Math.min(box.width / w1, box.height / CLOSE_UP.height);
    expect(f.fit).toBeGreaterThanOrEqual(fit1 - 1e-4);
    // The card, 120 px at the final fit (floored), inside its gutter with the inset and margin.
    expect(WING_CARD_PX.width / Math.max(f.fit, MIN_FIT)).toBeLessThanOrEqual(f.gutterLeft - CLOSE_UP.chipInset - CLOSE_UP.cardMargin + 1e-9);
    // Whenever the corner rule fired, the board's top sits below the corner block.
    if (f.padTop > CLOSE_UP.padTop) {
      expect(f.padTop * f.fit).toBeGreaterThanOrEqual(box.corner.height + CLOSE_UP.cornerClearPx - 1e-6);
    } else {
      const boardRight = f.toX(widest) * f.fit;
      expect(box.width - boardRight).toBeGreaterThanOrEqual(box.corner.width + CLOSE_UP.cornerClearPx - 1e-6);
    }
    // The frame is the box's own shape or narrower, and the board is inside it.
    expect(f.width * f.fit).toBeLessThanOrEqual(box.width + 0.01);
    expect(CLOSE_UP.height * f.fit).toBeLessThanOrEqual(box.height + 0.01);
    // (The width is cut to two decimals, down, so at most a hundredth comes off the side room.)
    expect(f.toX(widest) + CLOSE_UP.sideRoom).toBeLessThanOrEqual(f.width + 0.01);
    expect(f.toX(-widest) - CLOSE_UP.sideRoom).toBeCloseTo(f.gutterLeft, 9);
    // Centred where there is room: the stringer is the middle, or right of it only by what the
    // cards need, or left of it only by what keeps an unpadded board clear of the toolbar corner.
    const cardLeft = f.chipRightX - WING_CARD_PX.width / Math.max(f.fit, MIN_FIT);
    const centred = Math.abs(f.cx - f.width / 2) <= 0.01;
    const heldByCards = f.cx > f.width / 2 && cardLeft - (f.cx - f.width / 2) < CLOSE_UP.cardMargin;
    const heldByCorner =
      f.cx < f.width / 2 &&
      f.padTop === CLOSE_UP.padTop &&
      Math.abs(box.width - f.toX(widest) * f.fit - (box.corner.width + CLOSE_UP.cornerClearPx)) <= 1e-6;
    expect(centred || heldByCards || heldByCorner).toBe(true);
  });
});

describe("the close-up's data cards (D4)", () => {
  it("a card's height: the head alone, or the head, a row per value and the foot", () => {
    expect(wingCardHeightPx(0)).toBe(32);
    expect(wingCardHeightPx(2)).toBe(70);
    expect(wingCardHeightPx(3)).toBe(86);
  });

  it("the card is 120 px wide, and the longest row label leaves room for its value", () => {
    expect(WING_CARD_PX.width).toBe(120);
    const room = WING_CARD_PX.width - 2 * WING_CARD_PX.inset - WING_CARD_PX.labelGap - WING_CARD_LABEL_PX.OFFSET;
    expect(room).toBeGreaterThan(48);
  });
});


describe("spreadApart — read-outs pushed apart (down only to clear a block's near side or to stay inside the drawing)", () => {
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

  it("with no block in reach and no bounds, never moves anything down, and answers in input order", () => {
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

  // Quick 261015-hz7 (D7, D9): the nearer side of a block, and the drawing's bounds.
  it("an item on a block, nearer its tail side, lands below it when there is room", () => {
    const [y] = spreadApart([{ y: 235, half: 10 }], 6, [{ top: 200, bottom: 240 }]);
    expect(y).toBe(240 + 6 + 10);
  });

  it("... and above it when below would run into an item already placed", () => {
    const out = spreadApart(
      [
        { y: 235, half: 10 },
        { y: 262, half: 10 },
      ],
      6,
      [{ top: 200, bottom: 240 }],
    );
    expect(out[1]).toBe(262);
    expect(out[0]).toBe(200 - 6 - 10);
  });

  it("... and above it when below would pass the bottom bound", () => {
    const [y] = spreadApart([{ y: 235, half: 10 }], 6, [{ top: 200, bottom: 240 }], { bottom: 260 });
    expect(y).toBe(200 - 6 - 10);
  });

  it("a tie goes below", () => {
    const [y] = spreadApart([{ y: 220, half: 10 }], 6, [{ top: 200, bottom: 240 }]);
    expect(y).toBe(240 + 6 + 10);
  });

  it("with bounds.top, a chain that would pass the top is laid down from it in order, every gap kept", () => {
    const items = [
      { y: 30, half: 0 },
      { y: 25, half: 0 },
      { y: 20, half: 0 },
    ];
    const out = spreadApart(items, 40, [], { top: 10 });
    expect(Math.min(...out)).toBeGreaterThanOrEqual(10);
    const sorted = [...out].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(40 - 1e-9);
    // Station order kept: the item nearest the tail stays lowest.
    expect(out[0]).toBeGreaterThan(out[1]);
    expect(out[1]).toBeGreaterThan(out[2]);
  });

  it("laid down from the top, an item jumps below any block it would then overlap", () => {
    const out = spreadApart([{ y: 5, half: 0 }], 10, [{ top: 15, bottom: 50 }], { top: 20 });
    expect(out[0]).toBe(50 + 10);
  });

  it("with bounds.bottom, nothing is placed below it", () => {
    const out = spreadApart(
      [
        { y: 500, half: 10 },
        { y: 480, half: 10 },
      ],
      6,
      [],
      { bottom: 450 },
    );
    expect(out[0] + 10).toBeLessThanOrEqual(450);
    expect(out[1]).toBeLessThan(out[0]);
  });
});

describe("outlineViewBoxSize — the VIEWER's own frame, which the close-up's line weights read (quick 261015-my3, D1, D8, F1)", () => {
  it("the default board upright is 514 x 638", () => {
    const g = buildOutline(DEFAULT_BOARD_SPEC.outline);
    expect(outlineViewBoxSize(g, "vertical")).toEqual({ width: 514, height: 638 });
  });

  it("the Fish, wide enough to widen the frame, is 533.3 x 638 upright", () => {
    const fish = BOARD_PRESETS.find((p) => p.id === "fish")!;
    const size = outlineViewBoxSize(buildOutline(fish.outline), "vertical");
    expect(size.width).toBeCloseTo(533.3, 1);
    expect(size.height).toBe(638);
  });

  it("the default board turned is 729.6 x 367.35 (F1's 367.4, to one decimal)", () => {
    const size = outlineViewBoxSize(buildOutline(DEFAULT_BOARD_SPEC.outline), "horizontal");
    expect(size.width).toBeCloseTo(729.6, 1);
    expect(size.height).toBeCloseTo(367.35, 2);
  });
});
