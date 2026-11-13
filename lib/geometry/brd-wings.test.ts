import { describe, expect, it } from "vitest";
import { brdText } from "../export/brd";
import { readAnyBrd } from "../export/brd-read";
import type { P2 } from "./bezier-fit";
import { buildBoardSurface } from "./board-surface";
import { BRD_WING_POCKET_MIN_MM, BRD_WING_STEP_MAX_MM, findBrdWings } from "./brd-wings";
import { designCrossSectionInput, designSideProfile, deriveEffectiveRails, LIVE_DESIGN_RULES, type DesignSummaryFields } from "./design";
import { buildOutline } from "./outline";
import { inchesToMm, mm } from "./units";
import { MAX_WINGS, WING_RUN_RANGE_IN, type Wing } from "./wings";
import { phase16Boards, phase16WingBoards } from "./__fixtures__/phase16-boards";

/**
 * Finding a wing in a file's outline (quick 261113-hyy). The proof with a known answer is the app's own export: a board with
 * a wing is written with the app's `.brd` writer, read back by the forgiving reader, and its wing must be found. The proof
 * that a smooth outline never grows one is every wingless export plus hand-made hips of every size a hip can be.
 */

const IN = inchesToMm(1);

function ascii(text: string): Uint8Array {
  return Uint8Array.from(text, (ch) => ch.charCodeAt(0));
}

/** A board's outline as a `.brd` file carries it: written by the app, read back. */
function exportedOutline(fields: DesignSummaryFields): P2[] {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const surface = buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length),
    geometry,
    rockerAt: profile.rockerAt,
  });
  const read = readAnyBrd(ascii(brdText(surface).text));
  if (!read.ok) throw new Error("the app's own file would not read");
  return read.board.outline;
}

/** The outline as the fit draws it for the preset: the right half from the stringer to the nose. */
function drawnOutline(outline: DesignSummaryFields["outline"]): P2[] {
  const points = buildOutline(outline).points.map((p): P2 => [p.station, p.halfWidth]);
  return points[0][1] > 1e-6 ? [[points[0][0], 0], ...points] : points;
}

const PLAIN = phase16Boards().find((b) => b.label === "shortboard|asis|hard")!.fields;
const WING_BOARDS = phase16WingBoards();
const wingBoard = (label: string) => WING_BOARDS.find((b) => b.label === label)!;
const smoothstep = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

describe("findBrdWings: a file with no wing never grows one", () => {
  it("finds nothing in any of the app's 20 exported wingless boards with a Hard Edge", () => {
    const hard = phase16Boards().filter((b) => b.label.endsWith("|hard"));
    expect(hard).toHaveLength(20);
    for (const board of hard) expect(findBrdWings(exportedOutline(board.fields)), board.label).toEqual([]);
  }, 120_000);

  it("finds nothing in a smooth hip, 1/16 to 1/4 inch over 2 to 8 inches, ending 14 inches from the tail", () => {
    const base = drawnOutline(PLAIN.outline);
    for (const [h, width] of [
      [1 / 32, 2],
      [1 / 16, 2],
      [1 / 16, 4],
      [1 / 8, 4],
      [1 / 8, 6],
      [1 / 4, 8],
    ] as const) {
      const end = 14 * IN;
      const start = end - width * IN;
      const hip = base.map(([x, y]): P2 => [x, y - h * IN * (1 - smoothstep((x - start) / (end - start)))]);
      expect(findBrdWings(hip), `hip ${h}" over ${width}"`).toEqual([]);
    }
  });

  it("finds nothing in an empty or one-point outline", () => {
    expect(findBrdWings([])).toEqual([]);
    expect(findBrdWings([[0, 10]])).toEqual([]);
  });

  it("holds its line 25 times above a wingless board's own wobble: 1/32 inch is the dip, 3 inches the longest step", () => {
    expect(BRD_WING_POCKET_MIN_MM).toBeCloseTo(IN / 32, 12);
    expect(BRD_WING_STEP_MAX_MM).toBeCloseTo((WING_RUN_RANGE_IN.max + 1) * IN, 12);
  });
});

describe("findBrdWings: a wing is found, measured in the WINGS tab's terms", () => {
  const near = (got: number, want: number, within = IN / 16) => expect(Math.abs(got - want)).toBeLessThanOrEqual(within);
  const trueWing = (label: string, k = 0): Wing => wingBoard(label).fields.outline.wings![k];

  it.each(["wing|shortboard|one", "wing|shortboard|deep", "wing|shortboard|square", "wing|shortboard|infade"])(
    "%s: station, depth and run within 1/16 inch of the truth",
    (label) => {
      const found = findBrdWings(exportedOutline(wingBoard(label).fields));
      expect(found).toHaveLength(1);
      const truth = trueWing(label);
      near(found[0].station, truth.station);
      near(found[0].depth, truth.depth);
      near(found[0].run, truth.run);
      expect(found[0].inner).toBeCloseTo(found[0].station - found[0].run, 9);
      expect(found[0].dip).toBeGreaterThanOrEqual(BRD_WING_POCKET_MIN_MM);
    },
    120_000,
  );

  it("finds a square 1/16 inch step at 11 inches on a drawn outline", () => {
    const wing: Wing = { station: mm(11 * IN), depth: mm(IN / 16), run: mm(0), radius: mm(0), lock: null, finOffset: mm(0) };
    const found = findBrdWings(drawnOutline({ ...PLAIN.outline, wings: [wing] }));
    expect(found).toHaveLength(1);
    expect(Math.abs(found[0].station - 11 * IN)).toBeLessThan(0.1);
    expect(Math.abs(found[0].depth - IN / 16)).toBeLessThan(0.1);
    expect(found[0].run).toBeLessThan(0.1);
  });

  it("finds two wings in the app's own two-wing board, nose-most first, the way the WINGS tab numbers them", () => {
    const label = "wing|shortboard|two";
    const found = findBrdWings(exportedOutline(wingBoard(label).fields));
    expect(found).toHaveLength(2);
    expect(found[0].station).toBeGreaterThan(found[1].station);
    near(found[0].station, trueWing(label, 0).station);
    near(found[1].station, trueWing(label, 1).station, IN / 4);
  }, 120_000);

  it("never finds more than the app's two wings: three square steps give the two deepest", () => {
    const base = drawnOutline(PLAIN.outline);
    // Each step takes the outline in tailward of its station, all the way to the tail: a staircase narrowing to the tail.
    const steps = [
      { at: 7 * IN, depth: IN / 8 },
      { at: 13 * IN, depth: IN / 4 },
      { at: 20 * IN, depth: (3 * IN) / 8 },
    ];
    const outline: P2[] = [];
    for (const [x, y] of base) {
      const take = steps.reduce((sum, s) => sum + (x < s.at ? s.depth : 0), 0);
      outline.push([x, y - take]);
    }
    // The square steps themselves: a second point at each station, before the outline climbs again.
    for (const s of steps) {
      const index = outline.findIndex(([x]) => x >= s.at);
      const prev = outline[index - 1];
      outline.splice(index, 0, [s.at - 1e-3, prev[1]], [s.at, prev[1] + s.depth]);
    }
    const found = findBrdWings(outline);
    expect(found).toHaveLength(MAX_WINGS);
    expect(found[0].station).toBeGreaterThan(found[1].station);
  });
});
