/**
 * The tail cut (quick 261103-gcm, the founder, 2026-11-03): a board's litres and its Template Area
 * count the tail TEMPLATE draws. A swallow's notch is air; a diamond's V is foam.
 *
 * TEMPLATE draws the outline as `silhouette()` (screen-tiles.ts): the right half tail to nose from the
 * outline's points, the left half back, then one closing point on the stringer at `centreCloseStation`.
 * For a diamond that closing point is the tip, behind the tail block, so the V between them is foam the
 * points leave out. For a swallow it is the crotch, ahead of the tail, so the notch between the two
 * tail points is air the points count as foam.
 *
 * Every expected figure here is a relation read off the app's own functions — the drawing's shoelace,
 * today's litres pipeline, Simpson on the litres' own stations. No millimetre or litre is typed
 * (CLAUDE.md Rule 1).
 */
import { describe, expect, it } from "vitest";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { DEFAULT_BOARD_SPEC, TAIL_PRESETS, type OutlineSpec, type TailShape } from "./board";
import {
  crossSectionFoam,
  deriveEffectiveRails,
  deriveTemplateValues,
  designSideProfile,
  LIVE_DESIGN_RULES,
  summarizeDesign,
  type DesignSummaryFields,
} from "./design";
import { buildOutline, foamHalfWidth, outlinePlanArea, sampleOutline, tailCutStation, type OutlineGeometry } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { DEFAULT_RAIL_BAND_SPEC } from "./rail-bands";
import { silhouette } from "./screen-tiles";
import { cubicMmToLitres, inchesToMm, mm, type Mm } from "./units";
import {
  computeCrossSectionVolume,
  computeCrossSectionVolumeWith,
  crossSectionStations,
  DEFAULT_VOLUME_SPEC,
  RAIL_CHARACTER_FADE,
  SIMPSON_PANEL_COUNT,
  simpsonIntegrate,
  type CrossSectionVolumeInput,
} from "./volume";
import { WING_DEPTH_RANGE_IN, WING_POSITION_MIN_IN, WING_RUN_RANGE_IN } from "./wings";

const TAIL_KINDS = ["squash", "pin", "round", "diamond", "swallow"] as const satisfies readonly TailShape["kind"][];

/** The first board a visitor sees, as a summary's fields. */
const FIRST_BOARD: DesignSummaryFields = {
  outline: DEFAULT_BOARD_SPEC.outline,
  rocker: DEFAULT_BOARD_SPEC.rocker,
  foil: DEFAULT_BOARD_SPEC.foil,
  rails: DEFAULT_RAIL_BAND_SPEC,
  volume: DEFAULT_VOLUME_SPEC,
  railsImportFoilThickness: true,
  blank: null,
};

const BASES: [string, DesignSummaryFields][] = [
  ...BOARD_PRESETS.map(
    (preset): [string, DesignSummaryFields] => [
      preset.name,
      { ...presetDesignFields(preset), railsImportFoilThickness: true, volume: DEFAULT_VOLUME_SPEC },
    ],
  ),
  ["the first board", FIRST_BOARD],
];

/** A tail button applies its preset's tail, angle and fullness at once (outline-controls.tsx). */
function withTailButton(outline: OutlineSpec, kind: TailShape["kind"]): OutlineSpec {
  const preset = TAIL_PRESETS[kind];
  return { ...outline, tail: preset.tail, tailAngle: preset.tailAngle, tailFullness: preset.tailFullness };
}

/** The 30 boards: each base as opened and with each of the five tail buttons. */
const BOARDS: [string, DesignSummaryFields][] = BASES.flatMap(([name, fields]): [string, DesignSummaryFields][] => [
  [`${name} as opened`, fields],
  ...TAIL_KINDS.map((kind): [string, DesignSummaryFields] => [
    `${name}, ${kind} button`,
    { ...fields, outline: withTailButton(fields.outline, kind) },
  ]),
]);

/** One wing as far back as a wing goes, as deep and as long as one goes, square-cornered. */
function wingAt(inches: number) {
  return {
    station: inchesToMm(inches),
    depth: inchesToMm(WING_DEPTH_RANGE_IN.max),
    run: inchesToMm(WING_RUN_RANGE_IN.max),
    radius: mm(0),
    lock: null,
    finOffset: mm(0),
  };
}

const FISH = BOARD_PRESETS.find((preset) => preset.name === "Fish");
if (!FISH) throw new Error("no Fish preset");

/** Outlines for the geometry checks: every board above, plus a winged Fish (its wing inside the
 * notch's reach) and a winged diamond on the first board. */
const OUTLINES: [string, OutlineSpec][] = [
  ...BOARDS.map(([name, fields]): [string, OutlineSpec] => [name, fields.outline]),
  ["the Fish with a wing at its rearmost place", { ...FISH.outline, wings: [wingAt(WING_POSITION_MIN_IN)] }],
  [
    "the first board, diamond button, with a wing at 6 inches",
    { ...withTailButton(DEFAULT_BOARD_SPEC.outline, "diamond"), wings: [wingAt(6)] },
  ],
];

type Cut = "none" | "diamond" | "swallow";

/** What the drawing does at the tail, read straight off its closing point against its first point. */
function cutOf(g: OutlineGeometry): Cut {
  const first = g.points[0];
  if (g.centreCloseStation < first.station) return "diamond";
  if (g.centreCloseStation > first.station) return "swallow";
  return "none";
}

/** The drawing's own area: the shoelace of TEMPLATE's closed outline. */
function shoelace(g: OutlineGeometry): number {
  const pts = silhouette(g);
  let twice = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    twice += p.station * q.w - q.station * p.w;
  }
  return Math.abs(twice) / 2;
}

/** The triangle between the closing edges and the outline's first point, both sides together. */
function cutTriangle(g: OutlineGeometry): number {
  const first = g.points[0];
  return Math.abs(first.station - g.centreCloseStation) * first.halfWidth;
}

function relGap(a: number, b: number): number {
  return Math.abs(a - b) / Math.abs(b);
}

/** Every whole millimetre from the tail to the nose, and every outline point's station. */
function checkStations(g: OutlineGeometry): Mm[] {
  const whole = Array.from({ length: Math.floor(g.length) + 1 }, (_, i) => mm(i));
  return [...whole, ...g.points.map((p) => p.station)];
}

/** Simpson over the litres' own stations, one piece either side of the corner when there is one. */
function simpsonOnStations(values: number[], length: number, cut: number): number {
  if (!(cut > 0 && cut < length)) return simpsonIntegrate(values, length / SIMPSON_PANEL_COUNT);
  const stations = crossSectionStations(mm(length), mm(cut));
  const m = stations.indexOf(mm(cut));
  return (
    simpsonIntegrate(values.slice(0, m + 1), cut / m) +
    simpsonIntegrate(values.slice(m), (length - cut) / (SIMPSON_PANEL_COUNT - m))
  );
}

/** Everything the cross-section volume needs from a board except how wide its foam is. */
function volumeBase(fields: DesignSummaryFields): Omit<CrossSectionVolumeInput, "halfWidthAt"> {
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  return {
    foil: profile.effectiveFoil,
    thicknessAt: profile.thicknessAt,
    rails: deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness),
    length: fields.outline.length,
  };
}

/** Today's reading: the litres pipeline reading the outline through `sampleOutline`, on the even
 * stations, with no tail cut. */
function todaysReading(fields: DesignSummaryFields, g: OutlineGeometry) {
  return computeCrossSectionVolume({ ...volumeBase(fields), halfWidthAt: (s) => sampleOutline(g, s) });
}

describe("where the tail cut's corner sits", () => {
  it.each(BOARDS)("%s: at the diamond's tail block, the swallow's crotch, and nowhere for any other tail", (_name, fields) => {
    const g = buildOutline(fields.outline);
    const kind = fields.outline.tail.kind;
    if (kind === "diamond") {
      expect(tailCutStation(g)).toBe(g.points[0].station);
      expect(tailCutStation(g)).toBe(g.effectiveDiamondDepth);
    } else if (kind === "swallow") {
      expect(tailCutStation(g)).toBe(g.centreCloseStation);
    } else {
      expect(tailCutStation(g)).toBe(0);
    }
  });
});

describe("the foam on one side of the stringer follows the tail TEMPLATE draws", () => {
  it.each(OUTLINES)("%s: the drawn curve itself wherever there is no cut", (_name, outline) => {
    const g = buildOutline(outline);
    const corner = tailCutStation(g);
    for (const station of checkStations(g)) {
      if (station < corner) continue;
      expect(Object.is(foamHalfWidth(g, station), sampleOutline(g, station)), `station ${station}`).toBe(true);
    }
  });

  it.each(OUTLINES.filter(([, outline]) => cutOf(buildOutline(outline)) === "diamond"))(
    "%s: inside the diamond's V the foam runs straight from the tip to the tail block",
    (_name, outline) => {
      const g = buildOutline(outline);
      const first = g.points[0];
      const close = g.centreCloseStation;
      for (const station of checkStations(g)) {
        if (station >= first.station) continue;
        const foam = foamHalfWidth(g, station);
        if (station <= close) {
          expect(foam).toBe(0);
          continue;
        }
        const cross = foam * (first.station - close) - first.halfWidth * (station - close);
        expect(Math.abs(cross), `station ${station}`).toBeLessThanOrEqual(1e-9 * first.halfWidth * first.station);
      }
    },
  );

  it.each(OUTLINES.filter(([, outline]) => cutOf(buildOutline(outline)) === "swallow"))(
    "%s: inside the swallow's notch the air taken out is the straight notch edge, and the foam is never below 0",
    (_name, outline) => {
      const g = buildOutline(outline);
      const first = g.points[0];
      const close = g.centreCloseStation;
      // The notch edge's two ends: the full tail point at the tail end, nothing at the crotch.
      expect(sampleOutline(g, first.station) - foamHalfWidth(g, first.station)).toBe(first.halfWidth);
      expect(foamHalfWidth(g, close)).toBe(sampleOutline(g, close));
      for (const station of checkStations(g)) {
        if (station >= close) continue;
        const foam = foamHalfWidth(g, station);
        expect(foam, `station ${station}`).toBeGreaterThanOrEqual(0);
        if (foam === 0) continue;
        const edge = sampleOutline(g, station) - foam;
        const cross = edge * (close - first.station) - first.halfWidth * (close - station);
        expect(Math.abs(cross), `station ${station}`).toBeLessThanOrEqual(1e-9 * first.halfWidth * close);
      }
    },
  );
});

describe("the outline's plan area is the area TEMPLATE draws", () => {
  it.each(OUTLINES)("%s: equals the drawing's shoelace", (_name, outline) => {
    const g = buildOutline(outline);
    expect(relGap(outlinePlanArea(g), shoelace(g))).toBeLessThanOrEqual(1e-9);
  });

  it.each(OUTLINES)("%s: is the curve's own area with no cut, gains the V, loses the notch", (_name, outline) => {
    const g = buildOutline(outline);
    const cut = cutOf(g);
    if (cut === "none") {
      expect(Object.is(outlinePlanArea(g), g.area)).toBe(true);
    } else if (cut === "diamond") {
      expect(outlinePlanArea(g)).toBeGreaterThan(g.area);
      expect(relGap(outlinePlanArea(g) - g.area, cutTriangle(g))).toBeLessThanOrEqual(1e-9);
    } else {
      expect(outlinePlanArea(g)).toBeLessThan(g.area);
      expect(relGap(g.area - outlinePlanArea(g), cutTriangle(g))).toBeLessThanOrEqual(1e-9);
    }
  });

  it.each(OUTLINES)("%s: VOLUME's Template Area is the drawing's own area", (_name, outline) => {
    const g = buildOutline(outline);
    expect(relGap(deriveTemplateValues(outline, g).area, shoelace(g))).toBeLessThanOrEqual(1e-9);
  });
});

describe("the litres' 51 cross-sections land on the tail cut's corner", () => {
  it.each(BOARDS)("%s: with no cut they are today's even stations exactly", (_name, fields) => {
    const length = fields.outline.length;
    const stations = crossSectionStations(length, mm(0));
    expect(stations).toHaveLength(SIMPSON_PANEL_COUNT + 1);
    stations.forEach((station, i) => expect(Object.is(station, mm(i * (length / SIMPSON_PANEL_COUNT)))).toBe(true));
  });

  const CUT_BOARDS = BOARDS.filter(([, fields]) => cutOf(buildOutline(fields.outline)) !== "none");

  it("eleven of the thirty boards have a tail cut: the Fish as opened and every diamond and swallow button", () => {
    expect(CUT_BOARDS).toHaveLength(1 + 2 * BASES.length);
  });

  it.each(CUT_BOARDS)("%s: 51 stations from the tail end to the nose, one exactly on the corner, an even count of panels either side", (_name, fields) => {
    const g = buildOutline(fields.outline);
    const length = fields.outline.length;
    const cut = tailCutStation(g);
    const stations = crossSectionStations(length, cut);
    expect(stations).toHaveLength(SIMPSON_PANEL_COUNT + 1);
    expect(stations[0]).toBe(0);
    expect(stations[SIMPSON_PANEL_COUNT]).toBe(length);
    for (let i = 1; i < stations.length; i++) expect(stations[i]).toBeGreaterThan(stations[i - 1]);
    const m = stations.indexOf(cut);
    expect(m).toBeGreaterThanOrEqual(2);
    expect(m % 2).toBe(0);
    expect(SIMPSON_PANEL_COUNT - m).toBeGreaterThanOrEqual(2);
    expect((SIMPSON_PANEL_COUNT - m) % 2).toBe(0);
  });

  it.each(CUT_BOARDS)("%s: Simpson on those stations finds the whole V or notch, and the cut adds no sampling error", (_name, fields) => {
    const g = buildOutline(fields.outline);
    const length = fields.outline.length;
    const cut = tailCutStation(g);
    const stations = crossSectionStations(length, cut);
    const m = stations.indexOf(cut);
    const h1 = cut / m;
    const foam = stations.map((s) => 2 * foamHalfWidth(g, s));
    const curve = stations.map((s) => 2 * sampleOutline(g, s));
    const drawn = shoelace(g);
    const planOnStations = simpsonOnStations(foam, length, cut);
    let curvesOwnGap: number;
    if (cutOf(g) === "diamond") {
      const v = simpsonIntegrate(foam.slice(0, m + 1), h1);
      expect(relGap(v, outlinePlanArea(g) - g.area)).toBeLessThanOrEqual(1e-9);
      curvesOwnGap = simpsonIntegrate(curve.slice(m), (length - cut) / (SIMPSON_PANEL_COUNT - m)) - g.area;
    } else {
      const notch = simpsonIntegrate(
        stations.slice(0, m + 1).map((_s, i) => curve[i] - foam[i]),
        h1,
      );
      expect(relGap(notch, g.area - outlinePlanArea(g))).toBeLessThanOrEqual(1e-9);
      curvesOwnGap = simpsonOnStations(curve, length, cut) - g.area;
    }
    expect(Math.abs(planOnStations - drawn - curvesOwnGap)).toBeLessThanOrEqual(1e-9 * drawn);
  });
});

describe("the litres count the tail as drawn", () => {
  const UNCUT = BOARDS.filter(([, fields]) => cutOf(buildOutline(fields.outline)) === "none");
  const SWALLOWS = BOARDS.filter(([, fields]) => cutOf(buildOutline(fields.outline)) === "swallow");
  const DIAMONDS = BOARDS.filter(([, fields]) => cutOf(buildOutline(fields.outline)) === "diamond");

  it("nineteen boards have no cut, six are swallows and five diamonds", () => {
    expect([UNCUT.length, SWALLOWS.length, DIAMONDS.length]).toEqual([19, 1 + BASES.length, BASES.length]);
  });

  it.each(UNCUT)("%s: square, pin and round tails read exactly today's litres, section by section", (_name, fields) => {
    const g = buildOutline(fields.outline);
    const today = todaysReading(fields, g);
    expect(Object.is(summarizeDesign(fields).volumeLitres, today.volumeLitres)).toBe(true);
    const now = computeCrossSectionVolume({ ...volumeBase(fields), ...crossSectionFoam(g) });
    expect(now.stationAreas).toHaveLength(today.stationAreas.length);
    now.stationAreas.forEach((area, i) => expect(Object.is(area, today.stationAreas[i]), `station ${i}`).toBe(true));
  });

  it.each(SWALLOWS)("%s: a swallow's quoted litres leave out its notch", (_name, fields) => {
    const g = buildOutline(fields.outline);
    expect(summarizeDesign(fields).volumeLitres).toBeLessThan(todaysReading(fields, g).volumeLitres);
  });

  it.each(SWALLOWS)("%s: the notch's walls are square cuts through the board, and only the notch's stations change", (_name, fields) => {
    const g = buildOutline(fields.outline);
    const base = volumeBase(fields);
    const foam = crossSectionFoam(g);
    // Read under the rule before D-34, by name: since then a station narrower than its rail also counts the foam
    // its fitted ring adds, so the plain wall arithmetic holds only where the rail is cut, as it was.
    const now = computeCrossSectionVolumeWith({ ...base, ...foam }, RAIL_CHARACTER_FADE);
    const curve = computeCrossSectionVolumeWith(
      { ...base, cutStation: foam.cutStation, halfWidthAt: (s) => sampleOutline(g, s) },
      RAIL_CHARACTER_FADE,
    );
    expect(now.stations).toEqual(crossSectionStations(fields.outline.length, tailCutStation(g)));
    const m = now.stations.indexOf(tailCutStation(g));
    const thicknessAt = base.thicknessAt!;
    let thickest = 0;
    for (let i = 0; i < now.stations.length; i++) {
      const station = now.stations[i];
      if (i >= m) {
        expect(Object.is(now.stationAreas[i], curve.stationAreas[i]), `station ${i}`).toBe(true);
        continue;
      }
      const thickness = thicknessAt(station);
      thickest = Math.max(thickest, thickness);
      const removed = curve.stationAreas[i] - now.stationAreas[i];
      const wall = 2 * (sampleOutline(g, station) - foamHalfWidth(g, station)) * thickness;
      expect(removed, `station ${i}`).toBeLessThanOrEqual(wall * (1 + 1e-9));
      if (foamHalfWidth(g, station) > 0) expect(relGap(removed, wall), `station ${i}`).toBeLessThanOrEqual(1e-9);
    }
    const fall = curve.volumeLitres - now.volumeLitres;
    expect(fall).toBeGreaterThan(0);
    expect(fall).toBeLessThanOrEqual(cubicMmToLitres((g.area - outlinePlanArea(g)) * thickest));
  });

  it.each(DIAMONDS)("%s: a diamond's quoted litres count its V", (_name, fields) => {
    const g = buildOutline(fields.outline);
    expect(summarizeDesign(fields).volumeLitres).toBeGreaterThan(todaysReading(fields, g).volumeLitres);
  });

  it.each(DIAMONDS)("%s: the V's foam is no more than its width times its thickness, and only the V's stations change", (_name, fields) => {
    const g = buildOutline(fields.outline);
    const base = volumeBase(fields);
    const foam = crossSectionFoam(g);
    const now = computeCrossSectionVolume({ ...base, ...foam });
    const curve = computeCrossSectionVolume({ ...base, cutStation: foam.cutStation, halfWidthAt: (s) => sampleOutline(g, s) });
    const m = now.stations.indexOf(tailCutStation(g));
    const thicknessAt = base.thicknessAt!;
    let thickest = 0;
    for (let i = 0; i < now.stations.length; i++) {
      const station = now.stations[i];
      if (i >= m) {
        expect(Object.is(now.stationAreas[i], curve.stationAreas[i]), `station ${i}`).toBe(true);
        continue;
      }
      if (i === 0) {
        expect(now.stationAreas[i]).toBe(0);
        continue;
      }
      const thickness = thicknessAt(station);
      thickest = Math.max(thickest, thickness);
      expect(now.stationAreas[i], `station ${i}`).toBeGreaterThan(0);
      expect(now.stationAreas[i], `station ${i}`).toBeLessThanOrEqual(2 * foamHalfWidth(g, station) * thickness * (1 + 1e-9));
    }
    const rise = now.volumeLitres - curve.volumeLitres;
    expect(rise).toBeGreaterThan(0);
    expect(rise).toBeLessThanOrEqual(cubicMmToLitres((outlinePlanArea(g) - g.area) * thickest));
  });
});
