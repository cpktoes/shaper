import { describe, expect, it } from "vitest";
import { phase16Boards, phase16SurfaceBoards } from "./__fixtures__/phase16-boards";
import {
  BOTTOM_SECTIONS,
  DEFAULT_BOTTOM,
  foamOff,
  resolveBottom,
  startingCut,
  type BoardBottom,
  type BottomBoard,
  type BottomCutName,
  type BottomSectionKey,
} from "./bottom";
import {
  bottomRailLift,
  deriveEffectiveRails,
  designBottomBoard,
  designFinPlacement,
  designSideProfile,
  LIVE_DESIGN_RULES,
  railAnchorStations,
  railBandsOnTheBottom,
  railsOnTheBottom,
  type DesignSummaryFields,
} from "./design";
import { finishedRail } from "./finished-rail";
import { buildOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { computeRailBands, type RailSectionKey } from "./rail-bands";
import {
  RAIL_BOTTOM_LINE_PIECES,
  finishedRailOnBottom,
  railBottomFall,
  railBottomLine,
  railBottomLowest,
  railPointOnBottom,
  railSectionBottom,
} from "./rail-bottom";
import { inchesToMm, mm, type Mm } from "./units";

/**
 * RAILS draws the rail on the bottom the cut leaves (Phase 17, D-41). Every expected figure here is the app's own —
 * `foamOff` at the anchor, the bands of `railsOnTheBottom`'s rails — never a typed number.
 */

const SECTIONS: RailSectionKey[] = ["tail", "center", "nose"];
const all = phase16Boards();
const fieldsOf = (id: string): DesignSummaryFields => {
  const preset = BOARD_PRESETS.find((p) => p.id === id)!;
  return all.find((b) => b.label === `${id}|asis|${preset.rails.tailHardEdge ? "hard" : "soft"}`)!.fields;
};

function railsSetup(fields: DesignSummaryFields, names: Partial<Record<BottomSectionKey, BottomCutName>>) {
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const board: BottomBoard = designBottomBoard(fields.outline, buildOutline(fields.outline), profile, designFinPlacement(fields));
  const bottom: BoardBottom = structuredClone(DEFAULT_BOTTOM);
  for (const section of BOTTOM_SECTIONS) {
    const name = names[section];
    if (name) bottom[section] = startingCut(section, name, board);
  }
  const resolved = resolveBottom(bottom, board);
  const effectiveRails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const anchors = railAnchorStations(profile.effectiveFoil, fields.outline.length);
  const rails = railsOnTheBottom(effectiveRails, bottomRailLift(resolved, board), anchors);
  const flatBands = computeRailBands(effectiveRails);
  const liftedBands = computeRailBands(rails);
  const bands = railBandsOnTheBottom(liftedBands, resolved, board, anchors);
  return { board, resolved, anchors, effectiveRails, rails, flatBands, liftedBands, bands };
}

describe("railBandsOnTheBottom — which sections stand on a cut bottom (D-41)", () => {
  it("a flat bottom on all 102 boards hands the bands back as the same object, no section carrying a bottom", () => {
    const boards = phase16SurfaceBoards();
    expect(boards).toHaveLength(102);
    for (const { fields } of boards) {
      const { bands, liftedBands, rails, effectiveRails } = railsSetup(fields, {});
      expect(rails).toBe(effectiveRails);
      expect(bands).toBe(liftedBands);
      for (const key of SECTIONS) expect(bands[key].bottom).toBeUndefined();
    }
  });

  it("a concave alone lifts no rail: the bands come back untouched (D-41: a concave changes nothing on RAILS)", () => {
    const { bands, liftedBands } = railsSetup(fieldsOf("shortboard"), { center: "Deep Single Concave" });
    expect(bands).toBe(liftedBands);
  });

  it("the Fish's Panel Vee: only the tail stands on a cut bottom, its lift the foam off at the rail", () => {
    const { bands, liftedBands, board, resolved, anchors } = railsSetup(fieldsOf("fish"), { tail: "Panel Vee" });
    const tail = bands.tail.bottom!;
    expect(tail.lift).toBe(foamOff(resolved, board, anchors.tail, board.railAt(anchors.tail)));
    expect(tail.lift).toBeGreaterThan(0);
    expect(bands.center).toBe(liftedBands.center);
    expect(bands.nose).toBe(liftedBands.nose);
    // everything but the bottom is the lifted rail's own output
    const { bottom: _bottom, ...rest } = bands.tail;
    expect(_bottom).toBeDefined();
    expect(rest).toEqual(liftedBands.tail);
  });

  it("the bottom across is the foam off at each distance in from the rail, less the lift: 0 at the apex", () => {
    const { bands, board, resolved, anchors } = railsSetup(fieldsOf("fish"), { tail: "Panel Vee" });
    const { across, lift } = bands.tail.bottom!;
    const rail = board.railAt(anchors.tail);
    expect(across[across.length - 1]).toEqual({ x: 0, y: 0 });
    for (let k = 1; k < across.length; k++) expect(across[k].x).toBeGreaterThan(across[k - 1].x);
    expect(across[0].x).toBeLessThan(bands.tail.bounds.xAxisMin);
    for (const p of across) {
      expect(p.y).toBeCloseTo(foamOff(resolved, board, anchors.tail, mm(Math.abs(rail + p.x))) - lift, 9);
    }
  });

  it("a vee's bottom falls away from the rail toward the stringer — the angle under the rail", () => {
    for (const [id, names, key] of [
      ["fish", { tail: "Panel Vee" }, "tail"],
      ["midlength", { tail: "Rolled Vee" }, "tail"],
      ["longboard", { center: "Continuous Belly / Rolled Mid" }, "center"],
    ] as const) {
      const { bands } = railsSetup(fieldsOf(id), names);
      const bottom = bands[key].bottom!;
      // inside the plot, every step in toward the stringer is no higher than the one outboard of it
      const inPlot = bottom.across.filter((p) => p.x >= bands[key].bounds.xAxisMin);
      for (let k = 1; k < inPlot.length; k++) expect(inPlot[k - 1].y).toBeLessThanOrEqual(inPlot[k].y + 1e-9);
      expect(railBottomLowest(bottom, bands[key].bounds.xAxisMin)).toBeLessThan(0);
    }
  });
});

describe("railPointOnBottom — the rail stands on the planed bottom, never floats above it", () => {
  const { bands } = railsSetup(fieldsOf("fish"), { tail: "Panel Vee" });
  const output = bands.tail;
  const bottom = output.bottom!;
  const T = output.boardThickness;

  it("a point on the bottom lands on the planed bottom; the deck and the apex's own column do not move", () => {
    for (const x of [-1, -2.5, -4, -6].map((v) => mm(inchesToMm(v)))) {
      expect(railPointOnBottom(bottom, T, { x, y: mm(0) })).toEqual({ x, y: railBottomFall(bottom, x) });
      expect(railPointOnBottom(bottom, T, { x, y: T }).y).toBeCloseTo(T, 12);
    }
    const apex = { x: mm(0), y: mm(T / 3) };
    expect(railPointOnBottom(bottom, T, apex)).toBe(apex);
  });

  it("every band end that sits on the rail's bottom sits on the drawn bottom line after the map", () => {
    const conn = output.segments.find((s) => s.key === "bottomConn")!;
    const line = railBottomLine(bottom, conn.p1.x, conn.p2.x);
    expect(line[0]).toEqual(railPointOnBottom(bottom, T, conn.p1));
    expect(line[line.length - 1]).toEqual(railPointOnBottom(bottom, T, conn.p2));
    for (const seg of output.segments) {
      for (const p of [seg.p1, seg.p2]) {
        if (p.y !== 0) continue;
        expect(railPointOnBottom(bottom, T, p).y).toBeCloseTo(railBottomFall(bottom, p.x), 12);
      }
    }
  });

  it("the drawn line runs through the bottom's own samples between its two ends", () => {
    const from = mm(inchesToMm(-6));
    const to = mm(inchesToMm(-0.5));
    const line = railBottomLine(bottom, from, to);
    expect(line[0].x).toBe(from);
    expect(line[line.length - 1].x).toBe(to);
    for (let k = 1; k < line.length - 1; k++) expect(bottom.across).toContainEqual(line[k]);
  });

  it("the finished rail stands on the same bottom: its ends are moved by the same map and its flats follow the cut", () => {
    const rail = finishedRail(output, output.bounds.xAxisMin);
    const onBottom = finishedRailOnBottom(rail, bottom, T);
    expect(onBottom.start).toEqual(railPointOnBottom(bottom, T, rail.start));
    const lastOf = (r: typeof rail) => r.steps[r.steps.length - 1].to;
    expect(lastOf(onBottom)).toEqual(railPointOnBottom(bottom, T, lastOf(rail)));
    const lines = rail.steps.filter((s) => s.kind === "line").length;
    expect(onBottom.steps.length).toBe(rail.steps.length + lines * (RAIL_BOTTOM_LINE_PIECES - 1));
  });
});

describe("railSectionBottom and railBottomFall", () => {
  const { flatBands } = railsSetup(fieldsOf("fish"), {});
  it("a straight lift across reads straight, and is held beyond the samples", () => {
    const lift = mm(inchesToMm(0.2));
    const slope = 0.01;
    const bottom = railSectionBottom(flatBands.tail, lift, (d: Mm) => mm(lift - slope * d));
    for (const x of [-1, -3.3, -5].map((v) => mm(inchesToMm(v)))) expect(railBottomFall(bottom, x)).toBeCloseTo(slope * x, 9);
    expect(railBottomFall(bottom, mm(-1e6))).toBe(bottom.across[0].y);
    expect(railBottomFall(bottom, mm(5))).toBe(0);
    expect(railBottomLowest(bottom, mm(inchesToMm(-2)))).toBeCloseTo(slope * inchesToMm(-2), 9);
  });
});
