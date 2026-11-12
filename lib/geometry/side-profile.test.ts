import { describe, expect, it } from "vitest";
import {
  DEFAULT_BOTTOM,
  bottomDataRows,
  pickCut,
  resolveBottom,
  startingChannels,
  type BoardBottom,
  type BottomBoard,
} from "./bottom";
import {
  designBottomBoard,
  designFinPlacement,
  designSideProfile,
  LIVE_DESIGN_RULES,
  type DesignSummaryFields,
} from "./design";
import { buildOutline } from "./outline";
import { formatInchesFraction, inchesToMm, mm } from "./units";
import { phase16Boards } from "./__fixtures__/phase16-boards";
import { SIDE_PROFILE_STEP, sideProfileAt, sideProfileLines, sideProfileStations } from "./side-profile";

/**
 * The two side profiles on the fixture boards. Boards are built once at module scope: a build takes a moment. Every
 * expected number is read through the app's own readers (DATA's rows, `formatInchesFraction`), never typed.
 */
const BOARDS = phase16Boards();

function boardOf(label: string) {
  const found = BOARDS.find((b) => b.label === label);
  if (!found) throw new Error(`no board ${label}`);
  const fields: DesignSummaryFields = found.fields;
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const board: BottomBoard = designBottomBoard(fields.outline, geometry, profile, designFinPlacement(fields));
  return { board, profile };
}

const shortboard = boardOf("shortboard|asis|hard");

const deepSingle = (board: BottomBoard): BoardBottom => pickCut(DEFAULT_BOTTOM, "center", "Deep Single Concave", board);
const rolledVee = (board: BottomBoard): BoardBottom => pickCut(DEFAULT_BOTTOM, "tail", "Rolled Vee", board);

function linesOf(bottom: BoardBottom, which = shortboard) {
  const resolved = resolveBottom(bottom, which.board);
  return { resolved, lines: sideProfileLines(resolved, which.board, which.profile) };
}

describe("a flat bottom", () => {
  const { lines } = linesOf(DEFAULT_BOTTOM);

  it("draws one line: the stringer, the rail and the planed bottom are the same", () => {
    for (const p of lines.points) {
      expect(p.stringerBottom).toBe(p.planedBottom);
      expect(p.railBottom).toBe(p.planedBottom);
    }
  });

  it("has both thicknesses equal to the thickest planed station, 2 1/4 inches on the 6'2\" Shortboard", () => {
    const planed = Math.max(...lines.points.map((p) => shortboard.profile.thicknessAt(p.station)));
    expect(lines.stringerThickness).toBeCloseTo(planed, 9);
    expect(lines.maxThickness).toBeCloseTo(planed, 9);
    expect(formatInchesFraction(lines.stringerThickness)).toBe(formatInchesFraction(lines.maxThickness));
    expect(formatInchesFraction(lines.maxThickness)).toBe(`2 1/4"`);
  });

  it("has a deck that is exactly the rocker plus the planed thickness", () => {
    for (const p of lines.points) expect(p.deck).toBe(p.planedBottom + shortboard.profile.thicknessAt(p.station));
  });
});

describe("a Deep Single Concave", () => {
  const bottom = deepSingle(shortboard.board);
  const { resolved, lines } = linesOf(bottom);

  it("lifts the stringer's line above the rail's all through the cut", () => {
    // Start and End are stations from the tail, Start toward the nose; read either way round.
    const from = Math.min(resolved.center.start, resolved.center.end);
    const to = Math.max(resolved.center.start, resolved.center.end);
    const inside = lines.points.filter((p) => p.station > from + 1 && p.station < to - 1);
    expect(inside.length).toBeGreaterThan(10);
    for (const p of inside) expect(p.stringerBottom).toBeGreaterThanOrEqual(p.railBottom);
  });

  it("parts the two lines by more than a millimetre at its deepest", () => {
    const deepest = sideProfileAt(resolved, shortboard.board, shortboard.profile, resolved.center.deepest);
    expect(deepest.stringerBottom - deepest.railBottom).toBeGreaterThan(1);
  });

  it("leaves the stringer thinner than the side profile's maximum, 2 1/8 inches against 2 1/4", () => {
    expect(lines.stringerThickness).toBeLessThan(lines.maxThickness);
    expect(formatInchesFraction(lines.stringerThickness)).toBe(`2 1/8"`);
    expect(formatInchesFraction(lines.maxThickness)).toBe(`2 1/4"`);
  });

  it("is not moved by channels, at either line", () => {
    const withChannels: BoardBottom = { ...bottom, channels: startingChannels(4, shortboard.board, bottom.channels) };
    const channelled = linesOf(withChannels).lines;
    expect(channelled.points).toEqual(lines.points);
    expect(channelled.stringerThickness).toBe(lines.stringerThickness);
    expect(channelled.maxThickness).toBe(lines.maxThickness);
  });

  it("agrees with DATA's own rows: the stringer left and the rail lift", () => {
    const rows = bottomDataRows(resolved, shortboard.board).filter((row) => row.stringerLeft !== null);
    expect(rows.length).toBeGreaterThan(3);
    for (const row of rows) {
      const p = sideProfileAt(resolved, shortboard.board, shortboard.profile, row.station);
      expect(shortboard.board.thicknessAt(row.station) - p.stringerFoamOff).toBe(row.stringerLeft);
      expect(p.railFoamOff).toBe(row.railLift);
    }
  });
});

describe("a Rolled Vee", () => {
  const bottom = rolledVee(shortboard.board);
  const { resolved, lines } = linesOf(bottom);

  it("takes nothing off the stringer", () => {
    for (const p of lines.points) expect(p.stringerFoamOff).toBe(0);
  });

  it("lifts the rail's line above the stringer's, by more than a millimetre at the tail cut's deepest", () => {
    for (const p of lines.points) expect(p.railBottom).toBeGreaterThanOrEqual(p.stringerBottom);
    const deepest = sideProfileAt(resolved, shortboard.board, shortboard.profile, resolved.tail.deepest);
    expect(deepest.railBottom - deepest.stringerBottom).toBeGreaterThan(1);
  });

  it("keeps the stringer's thickness the maximum", () => {
    expect(lines.stringerThickness).toBeCloseTo(lines.maxThickness, 9);
  });

  it("agrees with DATA's own rail lift", () => {
    for (const row of bottomDataRows(resolved, shortboard.board)) {
      const p = sideProfileAt(resolved, shortboard.board, shortboard.profile, row.station);
      expect(p.railFoamOff).toBe(row.railLift);
      if (row.stringerLeft !== null) expect(shortboard.board.thicknessAt(row.station) - p.stringerFoamOff).toBe(row.stringerLeft);
    }
  });
});

describe("stations and clamping", () => {
  it("rises from the tail to the length in steps no wider than a quarter inch, the length once", () => {
    const stations = sideProfileStations(shortboard.board);
    expect(stations[0]).toBe(0);
    expect(stations[stations.length - 1]).toBe(shortboard.board.length);
    stations.forEach((s, i) => {
      if (i > 0) {
        expect(s).toBeGreaterThan(stations[i - 1]);
        expect(s - stations[i - 1]).toBeLessThanOrEqual(SIDE_PROFILE_STEP + 1e-9);
      }
    });
    expect(SIDE_PROFILE_STEP).toBeCloseTo(inchesToMm(1 / 4), 12);
  });

  it("does not repeat the length when it lands on a step", () => {
    const stations = sideProfileStations({ length: mm(SIDE_PROFILE_STEP * 4) });
    expect(stations).toHaveLength(5);
  });

  it("reads a station past either end as the end itself", () => {
    const { resolved } = linesOf(deepSingle(shortboard.board));
    const at = (s: number) => sideProfileAt(resolved, shortboard.board, shortboard.profile, mm(s));
    expect(at(-10)).toEqual(at(0));
    expect(at(shortboard.board.length + 10)).toEqual(at(shortboard.board.length));
  });
});

describe.each(["shortboard|swallow|hard", "shortboard|diamond|hard", "fish|asis|hard"])("every number on %s", (label) => {
  const which = boardOf(label);
  const bottoms: [string, BoardBottom][] = [
    ["flat", DEFAULT_BOTTOM],
    ["Deep Single", deepSingle(which.board)],
    ["Rolled Vee", rolledVee(which.board)],
  ];

  it.each(bottoms)("is finite, %s, with a deck above both bottom lines", (_name, bottom) => {
    const { lines } = linesOf(bottom, which);
    for (const p of lines.points) {
      expect(Object.values(p).every(Number.isFinite)).toBe(true);
      expect(p.deck).toBeGreaterThan(Math.min(p.stringerBottom, p.railBottom) - 1e-9);
    }
    expect(Number.isFinite(lines.stringerThickness)).toBe(true);
    expect(Number.isFinite(lines.maxThickness)).toBe(true);
    expect(lines.maxThickness).toBeGreaterThanOrEqual(lines.stringerThickness);
  });
});
