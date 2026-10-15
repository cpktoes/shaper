import { describe, expect, it } from "vitest";
import { overviewSpecLines } from "@/components/template/build-overview-pdf";
import { DEFAULT_BOARD_SPEC, type OutlineSpec } from "./board";
import { LIVE_DESIGN_RULES, designSideProfile, summarizeDesign, type DesignSummaryFields } from "./design";
import { DEFAULT_FOIL_SPEC } from "./foil";
import { formatDim } from "./measure-display";
import { MEASURE_STATION_MM, buildOutline, sampleOutline } from "./outline";
import { buildRackBoardArt } from "./rack-art";
import { DEFAULT_RAIL_BAND_SPEC } from "./rail-bands";
import { DEFAULT_FALLBACK_ROCKER } from "./rocker";
import { outlineTileArt, silhouette } from "./screen-tiles";
import { computeTemplateLayout, computeTemplateMarks, markPlacements } from "./template";
import { inchesToMm, mm, mmToInches } from "./units";
import { DEFAULT_VOLUME_SPEC } from "./volume";
import { wingStepShape, type Wing } from "./wings";

/**
 * Every reader follows a winged board (quick 261014-wii, plan 02, 2026-10-15, D1).
 *
 * A wing is applied inside `buildOutline`, after the curve the shaper drew: the winged geometry's
 * `points` carry the step, and `sampleOutline` reads them. Every reader of a board's outline reads
 * one of those two, so a wing reaches all of them through the one builder — no reader was taught
 * about wings, and none needed to be. This file proves it reader by reader (the brief's F1 list):
 *
 * - the full-size template's marks and pages (`computeTemplateMarks`, `markPlacements`,
 *   `computeTemplateLayout`) — the Tail @ 12" mark a shaper cuts to;
 * - the Overview Sheet's spec lines (`overviewSpecLines`) — its Tail Width @ 12";
 * - the Board Rack's turned picture (`buildRackBoardArt`);
 * - the screen tiles (`silhouette`, `outlineTileArt`);
 * - the litres (`summarizeDesign`).
 *
 * (FINS' tail drawing reads the winged outline too: `lib/geometry/fins.test.ts` and
 * `e2e/wings.spec.ts` prove it.)
 *
 * The board: the default 6'0" with a stinger — 30" up, 1/2" deep, a 3/4" run, a 1" corner radius
 * asked for, placed by hand — so the step's fade reaches the 12" station and moves the tail width
 * there. Every expected value is read off the app's own functions (CLAUDE.md Rule 1).
 */

const BASE: OutlineSpec = DEFAULT_BOARD_SPEC.outline;
const STINGER: Wing = {
  station: inchesToMm(30),
  depth: inchesToMm(1 / 2),
  run: inchesToMm(3 / 4),
  radius: inchesToMm(1),
  lock: null,
  finOffset: mm(0),
};
const WINGED: OutlineSpec = { ...BASE, wings: [STINGER] };
const EMPTY: OutlineSpec = { ...BASE, wings: [] };

const plain = buildOutline(BASE);
const winged = buildOutline(WINGED);
const empty = buildOutline(EMPTY);

function fieldsOf(outline: OutlineSpec): DesignSummaryFields {
  return {
    outline,
    rails: DEFAULT_RAIL_BAND_SPEC,
    foil: DEFAULT_FOIL_SPEC,
    railsImportFoilThickness: true,
    volume: DEFAULT_VOLUME_SPEC,
    rocker: DEFAULT_FALLBACK_ROCKER,
    blank: null,
  };
}

/** The template's Tail @ 12" mark as the printed pages place it. */
function tailTwelveMark(geometry: ReturnType<typeof buildOutline>) {
  const layout = computeTemplateLayout(geometry, "letter");
  const placement = markPlacements(layout, computeTemplateMarks(geometry), geometry).find((p) => p.mark === "tailTwelve");
  if (!placement) throw new Error("no Tail @ 12 inch mark on the template");
  return placement;
}

/** The Overview Sheet's tail-width line. */
function tailWidthLine(outline: OutlineSpec, geometry: ReturnType<typeof buildOutline>): string {
  const line = overviewSpecLines(outline, geometry, "imperial").find((l) => l.startsWith("Tail Width @"));
  if (!line) throw new Error("no Tail Width line on the Overview Sheet");
  return line;
}

function rackArt(outline: OutlineSpec) {
  const geometry = buildOutline(outline);
  return buildRackBoardArt(designSideProfile(fieldsOf(outline), LIVE_DESIGN_RULES), geometry);
}

describe("the stinger really does move the 12-inch width (the premise)", () => {
  it("the winged board is narrower at 12 inches than the board without it", () => {
    expect(winged.tailWidthAt12in).toBeLessThan(plain.tailWidthAt12in);
    expect(sampleOutline(winged, MEASURE_STATION_MM)).toBeLessThan(sampleOutline(plain, MEASURE_STATION_MM));
  });
});

describe("the full-size template follows the wing", () => {
  it("the Tail @ 12 inch mark is drawn across the winged width, narrower than without the wing", () => {
    const mark = tailTwelveMark(winged);
    expect(mark.station).toBe(MEASURE_STATION_MM);
    expect(2 * mark.halfWidthExtent).toBe(2 * sampleOutline(winged, MEASURE_STATION_MM));
    expect(mark.halfWidthExtent).toBeLessThan(tailTwelveMark(plain).halfWidthExtent);
  });

  it("the pages still cover the whole board, tail to nose and stringer to rail", () => {
    const layout = computeTemplateLayout(winged, "letter");
    const starts = layout.pages.map((p) => p.stationRange[0]);
    const ends = layout.pages.map((p) => p.stationRange[1]);
    expect(Math.min(...starts)).toBeLessThanOrEqual(0);
    expect(Math.max(...ends)).toBeGreaterThanOrEqual(winged.length);
    expect(Math.max(...layout.pages.map((p) => p.halfWidthRange[1]))).toBeGreaterThanOrEqual(winged.halfWidePointWidth);
  });
});

describe("the Overview Sheet follows the wing", () => {
  it("its Tail Width @ 12 inch line prints the winged width", () => {
    const line = tailWidthLine(WINGED, winged);
    expect(line).toContain(formatDim(winged.tailWidthAt12in, "imperial"));
    expect(line).not.toBe(tailWidthLine(BASE, plain));
  });
});

describe("the Board Rack follows the wing", () => {
  const withWing = rackArt(WINGED);
  const without = rackArt(BASE);

  it("the turned picture of the winged board is not the plain board's", () => {
    expect(withWing.silhouette).not.toEqual(without.silhouette);
    expect(withWing.stations).not.toEqual(without.stations);
  });

  it("behind the stinger its half-width at each station is the winged outline's", () => {
    const behind = withWing.stations.filter((st) => st.station > inchesToMm(14) && st.station < inchesToMm(28));
    expect(behind.length).toBeGreaterThan(0);
    for (const st of behind) {
      expect(st.half).toBe(sampleOutline(winged, st.station));
      expect(st.half).toBeLessThan(sampleOutline(plain, st.station));
    }
  });
});

describe("the screen tiles follow the wing", () => {
  it("the TEMPLATE silhouette carries a point at every station of the step", () => {
    const stations = new Set(silhouette(winged).map((p) => p.station));
    for (const p of wingStepShape(STINGER).points) {
      expect(stations.has(p.station), `a point at ${mmToInches(mm(p.station)).toFixed(4)}"`).toBe(true);
    }
  });

  it("the TEMPLATE and SUMMARY tiles draw a different board", () => {
    expect(outlineTileArt(winged, "lying").board).not.toBe(outlineTileArt(plain, "lying").board);
    expect(outlineTileArt(winged, "standing").board).not.toBe(outlineTileArt(plain, "standing").board);
  });
});

describe("the litres follow the wing", () => {
  it("the winged board quotes fewer litres", () => {
    expect(summarizeDesign(fieldsOf(WINGED)).volumeLitres).toBeLessThan(summarizeDesign(fieldsOf(BASE)).volumeLitres);
  });
});

describe("no wings, no change: an empty wings list reads exactly like a board that never had one", () => {
  it("the outline itself", () => {
    expect(empty).toEqual(plain);
  });

  it("the template's mark and pages", () => {
    expect(tailTwelveMark(empty)).toEqual(tailTwelveMark(plain));
    expect(computeTemplateLayout(empty, "a4")).toEqual(computeTemplateLayout(plain, "a4"));
  });

  it("the Overview Sheet", () => {
    expect(overviewSpecLines(EMPTY, empty, "imperial")).toEqual(overviewSpecLines(BASE, plain, "imperial"));
    expect(overviewSpecLines(EMPTY, empty, "metric")).toEqual(overviewSpecLines(BASE, plain, "metric"));
  });

  it("the Board Rack", () => {
    expect(rackArt(EMPTY)).toEqual(rackArt(BASE));
  });

  it("the screen tiles", () => {
    expect(silhouette(empty)).toEqual(silhouette(plain));
    expect(outlineTileArt(empty, "lying")).toEqual(outlineTileArt(plain, "lying"));
  });

  it("the litres", () => {
    expect(summarizeDesign(fieldsOf(EMPTY)).volumeLitres).toBe(summarizeDesign(fieldsOf(BASE)).volumeLitres);
  });
});
