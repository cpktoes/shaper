import { describe, expect, it } from "vitest";
import { DEFAULT_BOTTOM, pickCut, resolveBottom, type BoardBottom, type BottomBoard } from "./bottom";
import { stationAtPointer, topViewFrame, topViewX, type SectionHeight } from "./bottom-draw";
import {
  SIDE_PROFILE_APART,
  SIDE_VIEW_MOST,
  SIDE_VIEW_ROOM_ABOVE,
  SIDE_VIEW_ROOM_BELOW,
  TOP_VIEW_SHARE,
  bottomViewerSplit,
  sideProfileParts,
  sideProfileRailRuns,
  sideProfileRise,
  sideViewFrame,
  sideViewPaths,
  sideViewStationSpan,
} from "./bottom-side-view";
import { designBottomBoard, designFinPlacement, designSideProfile, LIVE_DESIGN_RULES } from "./design";
import { buildOutline } from "./outline";
import { sideProfileLines } from "./side-profile";
import { phase16Boards } from "./__fixtures__/phase16-boards";

const found = phase16Boards().find((b) => b.label === "shortboard|asis|hard");
if (!found) throw new Error("no shortboard fixture");
const geometry = buildOutline(found.fields.outline);
const profile = designSideProfile(found.fields, LIVE_DESIGN_RULES);
const board: BottomBoard = designBottomBoard(found.fields.outline, geometry, profile, designFinPlacement(found.fields));

const linesOf = (bottom: BoardBottom) => sideProfileLines(resolveBottom(bottom, board), board, profile);
const flat = linesOf(DEFAULT_BOTTOM);
const deepSingle = linesOf(pickCut(DEFAULT_BOTTOM, "center", "Deep Single Concave", board));
const rolledVee = linesOf(pickCut(DEFAULT_BOTTOM, "tail", "Rolled Vee", board));

const rise = sideProfileRise(deepSingle);
const split = (width: number, height: number, factor: SectionHeight, r = rise) => bottomViewerSplit({ width, height, board, rise: r, factor });

describe("sideProfileRise, sideProfileParts and sideProfileRailRuns", () => {
  it("reads the rise as the highest deck less the lowest bottom line", () => {
    for (const lines of [flat, deepSingle, rolledVee]) {
      const high = Math.max(...lines.points.map((p) => p.deck));
      const low = Math.min(...lines.points.flatMap((p) => [p.stringerBottom, p.railBottom]));
      expect(sideProfileRise(lines)).toBeCloseTo(high - low, 9);
    }
  });

  it("is one line on a flat bottom and two on a Deep Single and a Rolled Vee", () => {
    expect(sideProfileParts(flat)).toBe(false);
    expect(sideProfileParts(deepSingle)).toBe(true);
    expect(sideProfileParts(rolledVee)).toBe(true);
    expect(sideProfileRailRuns(flat)).toEqual([]);
  });

  it("starts every Deep Single run on a point close to the stringer, with the rail below the stringer's height inside", () => {
    const runs = sideProfileRailRuns(deepSingle);
    expect(runs.length).toBeGreaterThan(0);
    for (const run of runs) {
      const inner = run.filter((p) => Math.abs(p.railBottom - p.stringerBottom) > SIDE_PROFILE_APART);
      expect(inner.length).toBeGreaterThan(0);
      for (const p of inner) expect(p.railBottom).toBeLessThan(p.stringerBottom);
    }
  });

  it("puts the Rolled Vee's rail above the stringer in the tail run", () => {
    const run = sideProfileRailRuns(rolledVee)[0];
    const inner = run.filter((p) => Math.abs(p.railBottom - p.stringerBottom) > SIDE_PROFILE_APART);
    expect(inner.length).toBeGreaterThan(0);
    for (const p of inner) expect(p.railBottom).toBeGreaterThan(p.stringerBottom);
    expect(run[0].station).toBeLessThan(board.length / 2);
  });
});

describe("bottomViewerSplit", () => {
  it("on a very tall box gives the board from below exactly what its board needs at the width-bound scale", () => {
    const s = split(860, 2000, 1)!;
    const kw = (0.9 * 860) / board.length;
    expect(s.top).toBe(Math.ceil(board.widePointWidth * kw + 76));
    expect(s.side).toBe(Math.ceil(rise * kw * 1 + SIDE_VIEW_ROOM_ABOVE + SIDE_VIEW_ROOM_BELOW));
    expect(s.top + s.side + s.section).toBe(2000);
  });

  it("on a computer-sized box is height-bound, top : section 1.25 : 1, the side box its drawing plus its room", () => {
    const s = split(860, 460, 1)!;
    expect(s.top + s.side + s.section).toBe(460);
    expect(Math.abs(s.top / s.section - 1.25)).toBeLessThan(0.05);
    expect(Math.abs(s.top - TOP_VIEW_SHARE * (460 - s.side))).toBeLessThanOrEqual(1);
    expect(Math.abs(s.side - (rise * s.kDots + SIDE_VIEW_ROOM_ABOVE + SIDE_VIEW_ROOM_BELOW))).toBeLessThanOrEqual(1);
    expect(s.kDots).toBeCloseTo(s.frame.k / s.frame.px, 9);
  });

  it("makes the side box taller at x4 and the other two shorter, and caps it at 40% on a short box at x8", () => {
    const one = split(860, 460, 1)!;
    const four = split(860, 460, 4)!;
    expect(four.side).toBeGreaterThan(one.side);
    expect(four.top).toBeLessThan(one.top);
    expect(four.section).toBeLessThan(one.section);
    expect(Math.abs(four.top / four.section - 1.25)).toBeLessThan(0.06);
    const wide = split(860, 900, 8)!;
    expect(wide.side).toBeLessThanOrEqual(SIDE_VIEW_MOST * 900);
    const frame = sideViewFrame(deepSingle, { kDots: wide.kDots, length: board.length }, { width: 860, height: wide.side }, 8);
    expect(frame.heightDrawn).toBeLessThan(8);
    expect(frame.heightDrawn).toBeGreaterThan(1);
  });

  it("is null when the box is 40 dots wide or less, or has no room", () => {
    expect(split(40, 460, 1)).toBeNull();
    expect(split(860, 60, 1)).toBeNull();
    expect(split(860, 70, 1)).toBeNull();
  });
});

describe("sideViewFrame", () => {
  const s = split(860, 460, 1)!;
  const frame = sideViewFrame(deepSingle, { kDots: s.kDots, length: board.length }, { width: 860, height: s.side }, 1);
  const top = topViewFrame(board, 860, s.top);

  it("stands every station at the board from below's x, and gives the station back from the pointer", () => {
    for (const station of [0, 300, 912.5, board.length]) {
      expect(frame.x(station)).toBeCloseTo(topViewX(top, station), 2);
      expect(Math.abs(stationAtPointer(frame.x(station), frame) - station)).toBeLessThan(0.5);
    }
  });

  it("draws the factor asked at x1 and x4 when it fits, and puts the block in its room", () => {
    expect(frame.heightDrawn).toBeCloseTo(1, 2);
    const four = bottomViewerSplit({ width: 860, height: 460, board, rise, factor: 4 })!;
    const f4 = sideViewFrame(deepSingle, { kDots: four.kDots, length: board.length }, { width: 860, height: four.side }, 4);
    expect(Math.abs(f4.heightDrawn - 4) / 4).toBeLessThan(0.02);
    const highest = Math.max(...deepSingle.points.map((p) => p.deck));
    const lowest = Math.min(...deepSingle.points.flatMap((p) => [p.stringerBottom, p.railBottom]));
    const above = (f4.y(highest) / f4.px);
    const below = (f4.height - f4.y(lowest)) / f4.px;
    expect(above).toBeGreaterThanOrEqual(SIDE_VIEW_ROOM_ABOVE - 0.5);
    expect(below).toBeGreaterThanOrEqual(SIDE_VIEW_ROOM_BELOW - 0.5);
    expect(above).toBeLessThan(SIDE_VIEW_ROOM_ABOVE + 3);
  });

  it("writes one closed board path and a rail path only where the lines part", () => {
    const paths = sideViewPaths(deepSingle, frame);
    expect(paths.board.startsWith("M")).toBe(true);
    expect(paths.board.endsWith("Z")).toBe(true);
    expect(paths.rail).not.toBeNull();
    expect(sideViewPaths(flat, frame).rail).toBeNull();
  });

  it("reads the station line's span between the deck and the lower bottom line", () => {
    const span = sideViewStationSpan(deepSingle, frame, board.widePoint);
    expect(span.x).toBeCloseTo(frame.x(board.widePoint), 6);
    expect(span.yDeck).toBeLessThan(span.yBottom);
  });
});
