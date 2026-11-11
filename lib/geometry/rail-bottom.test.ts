import { describe, expect, it } from "vitest";
import { phase16Boards, phase16SurfaceBoards } from "./__fixtures__/phase16-boards";
import {
  BOTTOM_SECTIONS,
  DEFAULT_BOTTOM,
  channelFoamOff,
  channelWallsAt,
  foamOff,
  resolveBottom,
  sectionsFoamOff,
  startingChannels,
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
import { finishedRail, type FinishedRail } from "./finished-rail";
import type { Point2D } from "./board";
import { buildOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { computeRailBands, type RailSectionKey } from "./rail-bands";
import {
  RAIL_BOTTOM_LINE_PIECES,
  RAIL_CHANNEL_STEP,
  finishedRailOnBottom,
  railBottomFall,
  railBottomLine,
  railBottomLowest,
  railDrawnBottom,
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

/* ============ G-17-6: the channels are the last cut, straight up at each wall (the founder, 2026-11-10) ============ */

/** A wall is read this close either side, as RAILS reads it. */
const GAP = 1e-6;

/** RAILS for a board with the named cuts and a set of channels picked as the store picks them, the channels' numbers
 * then changed by `change` — every figure the app's own. */
function channelsSetup(
  label: string,
  names: Partial<Record<BottomSectionKey, BottomCutName>>,
  count: 4 | 6 | 8,
  change: (channels: BoardBottom["channels"]) => Partial<BoardBottom["channels"]> = () => ({}),
) {
  const fields = all.find((b) => b.label === label)!.fields;
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const board: BottomBoard = designBottomBoard(fields.outline, buildOutline(fields.outline), profile, designFinPlacement(fields));
  const bottom: BoardBottom = structuredClone(DEFAULT_BOTTOM);
  for (const section of BOTTOM_SECTIONS) {
    const name = names[section];
    if (name) bottom[section] = startingCut(section, name, board);
  }
  const started = startingChannels(count, board, bottom.channels);
  bottom.channels = { ...started, ...change(started) };
  const resolved = resolveBottom(bottom, board);
  const effectiveRails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const anchors = railAnchorStations(profile.effectiveFoil, fields.outline.length);
  const rails = railsOnTheBottom(effectiveRails, bottomRailLift(resolved, board), anchors);
  const liftedBands = computeRailBands(rails);
  const bands = railBandsOnTheBottom(liftedBands, resolved, board, anchors);
  return { board, resolved, anchors, effectiveRails, rails, liftedBands, bands };
}

type ChannelsSetup = ReturnType<typeof channelsSetup>;

/** The channel's depth `y` out from the stringer at a section's anchor. */
const channelAt = (c: ChannelsSetup, key: RailSectionKey, y: number) =>
  channelFoamOff(c.resolved.channels, c.board, c.resolved.wingRule, c.anchors[key], mm(y));

/** Every wall of this side of the stringer that stands inside a section's plot: its x on RAILS and its step — the
 * floor at its deepest just inboard less the next channel's peak just outboard, each the one number's own channel term. */
function standingWalls(c: ChannelsSetup, key: RailSectionKey): { x: Mm; step: number; deep: number; shallow: number }[] {
  const rail = c.board.railAt(c.anchors[key]);
  return channelWallsAt(c.resolved.channels, c.board, c.resolved.wingRule, c.anchors[key])
    .map((w) => {
      const deep = channelAt(c, key, w - GAP);
      const shallow = channelAt(c, key, w + GAP);
      return { x: mm(-(rail - w)), step: deep - shallow, deep, shallow };
    })
    .filter((wall) => wall.step > GAP && wall.x > c.bands[key].bounds.xAxisMin && wall.x < 0);
}

/** The finished rail's every end point, the start first. */
const endsOf = (rail: FinishedRail): Point2D[] => [rail.start, ...rail.steps.map((s) => s.to)];

/** The index (in `endsOf`) of the apex — the end at the curve's largest x; the underside is every end after it. */
function apexIndex(rail: FinishedRail): number {
  const ends = endsOf(rail);
  let best = 1;
  for (let i = 1; i < ends.length; i++) if (ends[i].x > ends[best].x) best = i;
  return best;
}

/** Where two consecutive points stand at the same x, the second's index — or -1. */
const pairAt = (points: Point2D[], x: number, from = 1) => {
  for (let i = Math.max(1, from); i < points.length; i++) if (points[i].x === x && points[i - 1].x === x) return i;
  return -1;
};

/** The underside of a finished rail as a fine line (its curves sampled 2,000 times a step), from the apex inward. */
function undersideLine(rail: FinishedRail): Point2D[] {
  const apex = apexIndex(rail);
  const ends = endsOf(rail);
  const line: Point2D[] = [ends[apex]];
  for (let i = apex; i < rail.steps.length; i++) {
    const a = ends[i];
    const step = rail.steps[i];
    if (step.kind === "line") {
      line.push(step.to);
      continue;
    }
    for (let k = 1; k <= 2000; k++) {
      const t = k / 2000;
      const u = 1 - t;
      line.push(
        step.kind === "quad"
          ? { x: mm(u * u * a.x + 2 * u * t * step.control.x + t * t * step.to.x), y: mm(u * u * a.y + 2 * u * t * step.control.y + t * t * step.to.y) }
          : {
              x: mm(u ** 3 * a.x + 3 * u * u * t * step.c1.x + 3 * u * t * t * step.c2.x + t ** 3 * step.to.x),
              y: mm(u ** 3 * a.y + 3 * u * u * t * step.c1.y + 3 * u * t * t * step.c2.y + t ** 3 * step.to.y),
            },
      );
    }
  }
  return line;
}

/** A fine line's height at `x`: straight between the two points either side of it, the first such pair met. */
function heightOn(line: Point2D[], x: number): number {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    if (Math.min(a.x, b.x) <= x && x <= Math.max(a.x, b.x)) {
      return b.x === a.x ? Math.max(a.y, b.y) : a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
    }
  }
  throw new Error(`no point of the line at x = ${x}`);
}

describe("G-17-6 — RAILS cuts the channels straight up into the thin bottom line (the founder, 2026-11-10)", () => {
  it("the Fish with a Rolled Vee and eight channels at Off Stringer 3\": every wall in the plot is two points at its own x, the deep floor first, apart by exactly the wall's step", () => {
    const fish = channelsSetup("fish|asis|hard", { tail: "Rolled Vee" }, 8, () => ({ offStringer: mm(inchesToMm(3)) }));
    const section = fish.bands.tail;
    const line = railBottomLine(section.bottom!, section.bounds.xAxisMin, mm(0));
    const walls = standingWalls(fish, "tail");
    expect(walls.length).toBe(4);
    for (const wall of walls) {
      const i = pairAt(line, wall.x);
      expect(i).toBeGreaterThan(0);
      expect(Math.abs(line[i - 1].y - line[i].y - wall.step)).toBeLessThan(1e-9);
      // the floor at its deepest is the vee's fall plus the channel's own depth, the peak the vee's fall plus its own
      expect(line[i - 1].y).toBeCloseTo(railBottomFall(section.bottom!, wall.x) + wall.deep, 9);
      expect(line[i].y).toBeCloseTo(railBottomFall(section.bottom!, wall.x) + wall.shallow, 9);
    }
  });
});

describe("G-17-6 — RAILS cuts the channels straight up into the Finished Rail (the founder, 2026-11-10)", () => {
  it("the Fish with a Rolled Vee and eight channels at Off Stringer 3\": two consecutive ends at every wall, the floor inboard of it the vee's fall plus the channel's depth (no chord)", () => {
    const fish = channelsSetup("fish|asis|hard", { tail: "Rolled Vee" }, 8, () => ({ offStringer: mm(inchesToMm(3)) }));
    const section = fish.bands.tail;
    const rail = finishedRailOnBottom(finishedRail(section, section.bounds.xAxisMin), section.bottom!, section.boardThickness);
    const ends = endsOf(rail);
    const apex = apexIndex(rail);
    const walls = standingWalls(fish, "tail");
    expect(walls.length).toBe(4);
    for (const wall of walls) {
      const i = pairAt(ends, wall.x, apex + 1);
      expect(i).toBeGreaterThan(apex);
      // walking toward the stringer: the next channel's peak first, then straight up to the floor at its deepest
      expect(Math.abs(ends[i].y - ends[i - 1].y - wall.step)).toBeLessThan(1e-6);
      expect(Math.abs(ends[i].y - (railBottomFall(section.bottom!, wall.x) + wall.deep))).toBeLessThan(1e-6);
    }
  });

  it("the Fish with a Rolled Vee and the starting eight: every wall in the plot, the one about 4.2\" in from the rail too, is drawn whole on the thick line", () => {
    const fish = channelsSetup("fish|asis|hard", { tail: "Rolled Vee" }, 8);
    const section = fish.bands.tail;
    const rail = finishedRailOnBottom(finishedRail(section, section.bounds.xAxisMin), section.bottom!, section.boardThickness);
    const ends = endsOf(rail);
    const apex = apexIndex(rail);
    const walls = standingWalls(fish, "tail");
    expect(walls.length).toBeGreaterThan(0);
    for (const wall of walls) {
      const i = pairAt(ends, wall.x, apex + 1);
      expect(i).toBeGreaterThan(apex);
      expect(Math.abs(ends[i].y - ends[i - 1].y - wall.step)).toBeLessThan(1e-6);
    }
  });

  it("the Longboard (the rolled rail) with a Rolled Vee and six channels: where the tuck's curve crosses a channel it is drawn in pieces no longer than 1/64\", each end the higher of the rail on the vee and the channel's floor; a wall under the curve drops by the floor's height above the rail there", () => {
    const longboard = channelsSetup("longboard|asis|soft", { tail: "Rolled Vee" }, 6);
    const section = longboard.bands.tail;
    const bottom = section.bottom!;
    const T = section.boardThickness;
    const plain = finishedRail(section, section.bounds.xAxisMin);
    // the rail on the vee alone: the same section's bottom without its channels
    const { channelCut: cut, ...veeOnly } = bottom;
    expect(cut).toBeDefined();
    const onVee = finishedRailOnBottom(plain, veeOnly, T);
    const reference = undersideLine(onVee);
    const drawn = finishedRailOnBottom(plain, bottom, T);
    const ends = endsOf(drawn);
    const apex = apexIndex(drawn);
    const floorAt = (x: number) => Math.min(railDrawnBottom(bottom, mm(x)), T);

    // a wall under the tuck's curve: inside the x-span of one of the vee-only rail's underside curves
    const curveSpans: [number, number][] = [];
    const veeEnds = endsOf(onVee);
    for (let i = apexIndex(onVee); i < onVee.steps.length; i++) {
      if (onVee.steps[i].kind !== "line") {
        curveSpans.push([Math.min(veeEnds[i].x, onVee.steps[i].to.x), Math.max(veeEnds[i].x, onVee.steps[i].to.x)]);
      }
    }
    const underCurve = standingWalls(longboard, "tail").filter((w) => curveSpans.some(([lo, hi]) => lo < w.x && w.x < hi));
    expect(underCurve.length).toBeGreaterThan(0);

    const cutXs = cut!.filter((p) => p.y !== 0).map((p) => p.x);
    const [lo, hi] = [Math.min(...cutXs), Math.max(...cutXs)];
    let checked = 0;
    for (let i = apex + 1; i < ends.length; i++) {
      if (Math.max(ends[i - 1].x, ends[i].x) < lo || Math.min(ends[i - 1].x, ends[i].x) > hi) continue;
      // inside the channels' span every piece is a short straight line
      expect(drawn.steps[i - 1].kind).toBe("line");
      expect(Math.abs(ends[i].x - ends[i - 1].x)).toBeLessThanOrEqual(RAIL_CHANNEL_STEP + 1e-9);
      if (ends[i].x === ends[i - 1].x) continue; // the second point of a wall: checked below
      expect(Math.abs(ends[i].y - Math.max(heightOn(reference, ends[i].x), floorAt(ends[i].x)))).toBeLessThan(1e-3);
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
    for (const wall of underCurve) {
      const railThere = heightOn(reference, wall.x);
      const fall = railBottomFall(bottom, wall.x);
      const top = Math.min(fall + wall.deep, T);
      const foot = Math.max(railThere, Math.min(fall + wall.shallow, T));
      const i = pairAt(ends, wall.x, apex + 1);
      if (top > railThere + 1e-3) {
        expect(i).toBeGreaterThan(apex);
        expect(Math.abs(ends[i].y - ends[i - 1].y - (top - foot))).toBeLessThan(1e-3);
      } else {
        // the floor is below the rail there: the rail is drawn, no wall
        expect(i).toBe(-1);
      }
    }
  });

  it("across the stringer: every wall pair stands where the cut read through |rail − p| jumps, the two values either side in x order", () => {
    const fish = channelsSetup("fish|asis|hard", { tail: "Rolled Vee" }, 8);
    const cut = fish.bands.tail.bottom!.channelCut!;
    const rail = fish.board.railAt(fish.anchors.tail);
    const cutIn = (p: number) => channelAt(fish, "tail", Math.abs(rail - p));
    let far = 0;
    let pairs = 0;
    for (let i = 1; i < cut.length; i++) {
      expect(cut[i].x).toBeGreaterThanOrEqual(cut[i - 1].x);
      if (cut[i].x !== cut[i - 1].x) continue;
      pairs++;
      const p = -cut[i].x;
      expect(cut[i - 1].y).toBe(cutIn(p + GAP));
      expect(cut[i].y).toBe(cutIn(p - GAP));
      expect(Math.abs(cut[i - 1].y - cut[i].y)).toBeGreaterThan(GAP);
      if (p > rail) far++;
    }
    // every wall within the reach, both sides of the stringer, has its pair
    const walls = channelWallsAt(fish.resolved.channels, fish.board, fish.resolved.wingRule, fish.anchors.tail);
    const reach = -cut[0].x;
    const expected = [...new Set(walls.flatMap((w) => [rail - w, rail + w]))].filter(
      (p) => p > 0 && p < reach && Math.abs(cutIn(p + GAP) - cutIn(p - GAP)) > GAP,
    );
    expect(pairs).toBe(expected.length);
    for (const p of expected) expect(pairAt(cut, -p)).toBeGreaterThan(0);
    expect(far).toBeGreaterThan(0);
  });

  it("the deck: eight channels 1/2\" deep on the Shortboard's thin tail never draw the underside above the section's thickness", () => {
    const shortboard = channelsSetup("shortboard|asis|hard", { tail: "Rolled Vee" }, 8, () => ({ depth: mm(inchesToMm(1 / 2)) }));
    let lifted = 0;
    for (const key of SECTIONS) {
      const section = shortboard.bands[key];
      if (!section.bottom) continue;
      lifted++;
      const T = section.boardThickness;
      const rail = finishedRailOnBottom(finishedRail(section, section.bounds.xAxisMin), section.bottom, T);
      for (const p of endsOf(rail).slice(apexIndex(rail))) expect(p.y).toBeLessThanOrEqual(T + 1e-9);
      for (const p of railBottomLine(section.bottom, section.bounds.xAxisMin, mm(0))) expect(p.y).toBeLessThanOrEqual(T + 1e-9);
    }
    expect(lifted).toBeGreaterThan(0);
  });

  it("the deck, where a channel would reach it: the floor is drawn at the thickness, never above, on both lines", () => {
    const { flatBands } = railsSetup(fieldsOf("fish"), {});
    const section = flatBands.tail;
    const T = section.boardThickness;
    const lift = mm(inchesToMm(0.2));
    // a cut twice the rail's own thickness from 1" to 3" in from the rail: it would stand far above the deck
    const bottom = railSectionBottom(section, lift, (d: Mm) => mm(lift - 0.01 * d), {
      cutIn: (d: Mm) => (d > inchesToMm(1) && d < inchesToMm(3) ? mm(T * 2) : mm(0)),
      wallsIn: [mm(inchesToMm(1)), mm(inchesToMm(3))],
    });
    const rail = finishedRailOnBottom(finishedRail({ ...section, bottom }, section.bounds.xAxisMin), bottom, T);
    const underside = endsOf(rail).slice(apexIndex(rail));
    expect(Math.max(...underside.map((p) => p.y))).toBeCloseTo(T, 9);
    for (const p of underside) expect(p.y).toBeLessThanOrEqual(T + 1e-9);
    const line = railBottomLine(bottom, section.bounds.xAxisMin, mm(0));
    expect(Math.max(...line.map((p) => p.y))).toBeCloseTo(T, 9);
    for (const p of line) expect(p.y).toBeLessThanOrEqual(T + 1e-9);
  });

  it("a board with a vee and no channels carries no channel cut: RAILS draws it exactly as before", () => {
    const { bands } = railsSetup(fieldsOf("fish"), { tail: "Rolled Vee" });
    expect(bands.tail.bottom).toBeDefined();
    expect("channelCut" in bands.tail.bottom!).toBe(false);
  });

  it("the bottom under the rail is the vee's alone: its lift and its fall are the sections' number, no channel in them", () => {
    const fish = channelsSetup("fish|asis|hard", { tail: "Rolled Vee" }, 8, () => ({ offStringer: mm(inchesToMm(3)) }));
    const rail = fish.board.railAt(fish.anchors.tail);
    const bottom = fish.bands.tail.bottom!;
    expect(bottom.lift).toBe(sectionsFoamOff(fish.resolved, fish.board, fish.anchors.tail, rail));
    for (const p of bottom.across) {
      expect(p.y).toBe(mm(sectionsFoamOff(fish.resolved, fish.board, fish.anchors.tail, mm(Math.abs(rail + p.x))) - bottom.lift));
    }
  });
});
