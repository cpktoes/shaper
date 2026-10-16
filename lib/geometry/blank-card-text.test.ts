import { describe, expect, it } from "vitest";
import { isPickable } from "@/lib/blanks/catalog";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { blankTipRockers, prepareBlank, type PreparedBlank } from "./blank-fit";
import { cardFigures, compactLine, NO_FIGURE, stationTable, uprightFacts } from "./blank-card-text";
import { blankRowVolume } from "./blank-reasons";
import { printedBlankStations } from "./board-profile";
import {
  formatDim,
  formatDimBare,
  formatLength,
  formatMark,
  formatMarkBare,
  stationLabel,
} from "./measure-display";
import { UNITS_SYSTEMS, type Mm, type UnitsSystem } from "./units";

// Every word and number on a blank's card (quick 261015-ve9, D-09 to D-11, D-15). Every expected
// string is composed here from the app's own formatters over a real seeded record — never a
// converted number typed by hand (CLAUDE.md Rule 1).

const PICKABLE: PreparedBlank[] = readSeedCatalog()
  .filter(isPickable)
  .map((record) => prepareBlank(record));

const WITH_VOLUME = PICKABLE.find((p) => p.record.volumeLitres !== null)!;
const NO_VOLUME = PICKABLE.find((p) => p.record.volumeLitres === null)!;
/** A blank that prints no N12 / T12 station at all. */
const NO_TWELVES = PICKABLE.find((p) => !p.record.stations.some((s) => s.label === "N12"))!;
const FULL = PICKABLE.find((p) => {
  const printed = printedBlankStations(p.record);
  return Object.values(printed).every((v) => v.width !== null && v.thickness !== null && v.rocker !== null);
})!;

const dash = (value: Mm | null, format: (v: Mm) => string) => (value === null ? NO_FIGURE : format(value));

describe("the real records the tests read", () => {
  it("found a blank with a volume, one without, one with no 12\" stations and one fully printed", () => {
    expect(WITH_VOLUME).toBeDefined();
    expect(NO_VOLUME).toBeDefined();
    expect(NO_TWELVES).toBeDefined();
    expect(FULL).toBeDefined();
    expect(NO_FIGURE).toBe("—");
  });
});

describe("cardFigures — the flat card's header figures (D-09)", () => {
  it.each(UNITS_SYSTEMS)("length then litres where printed, the length alone otherwise — %s", (system) => {
    expect(cardFigures(WITH_VOLUME.record, system)).toBe(
      `${formatLength(WITH_VOLUME.lengthMm, system)} · ${blankRowVolume(WITH_VOLUME.record)}`,
    );
    expect(cardFigures(NO_VOLUME.record, system)).toBe(formatLength(NO_VOLUME.lengthMm, system));
  });

  it("reads feet and inches in Imperial and centimetres in Metric", () => {
    expect(cardFigures(WITH_VOLUME.record, "imperial")).toMatch(/^\d+'\d+( \d+\/\d+)?" · \d+\.\d L$/);
    expect(cardFigures(WITH_VOLUME.record, "metric")).toMatch(/^\d+\.\d cm · \d+\.\d L$/);
    expect(cardFigures(NO_VOLUME.record, "metric")).toMatch(/^\d+\.\d cm$/);
  });
});

describe("stationTable — the printed station table (D-09, D-15)", () => {
  it("names the five stations nose to tail, the 12\" stations through stationLabel", () => {
    expect(stationTable(FULL.record, "imperial").headers).toEqual(["Nose", `N 12"`, "Center", `T 12"`, "Tail"]);
    expect(stationTable(FULL.record, "metric").headers).toEqual(["Nose", "N 30.5 cm", "Center", "T 30.5 cm", "Tail"]);
    for (const system of UNITS_SYSTEMS) {
      expect(stationTable(FULL.record, system).headers[1]).toBe(`N ${stationLabel(system)}`);
    }
  });

  it("labels the rows Width / Thick / Rocker, with the unit in the label in Metric", () => {
    expect(stationTable(FULL.record, "imperial").rows.map((r) => r.label)).toEqual(["Width", "Thick", "Rocker"]);
    expect(stationTable(FULL.record, "metric").rows.map((r) => r.label)).toEqual([
      "Width (cm)",
      "Thick (mm)",
      "Rocker (mm)",
    ]);
  });

  it.each(UNITS_SYSTEMS)("prints the catalogue's own figures nose to tail, widths as dims and the rest as marks — %s", (system) => {
    for (const p of [FULL, NO_TWELVES, WITH_VOLUME]) {
      const printed = printedBlankStations(p.record);
      const order = [printed.noseTip, printed.nose12, printed.center, printed.tail12, printed.tailTip];
      const [width, thick, rocker] = stationTable(p.record, system).rows;
      expect(width.cells).toEqual(order.map((v) => dash(v.width, (x) => formatDimBare(x, system))));
      expect(thick.cells).toEqual(order.map((v) => dash(v.thickness, (x) => formatMarkBare(x, system))));
      expect(rocker.cells).toEqual(order.map((v) => dash(v.rocker, (x) => formatMarkBare(x, system))));
    }
  });

  it("a blank with no 12\" stations reads a dash in both 12\" columns", () => {
    const { rows } = stationTable(NO_TWELVES.record, "imperial");
    for (const row of rows) {
      expect(row.cells[1]).toBe(NO_FIGURE);
      expect(row.cells[3]).toBe(NO_FIGURE);
    }
  });
});

describe("uprightFacts — the upright card's facts (D-10)", () => {
  it.each(UNITS_SYSTEMS)("Length, Center, Rocker and the 12\" widths through the display boundary — %s", (system) => {
    for (const p of [FULL, NO_TWELVES]) {
      const printed = printedBlankStations(p.record);
      const tips = blankTipRockers(p);
      const dim = (v: Mm | null) => dash(v, (x) => formatDim(x, system));
      const mark = (v: Mm | null) => dash(v, (x) => formatMark(x, system));
      expect(uprightFacts(p, system)).toEqual([
        { label: "Length", value: formatLength(p.lengthMm, system) },
        { label: "Center", value: `${dim(printed.center.width)} × ${mark(printed.center.thickness)}` },
        { label: "Rocker", value: `${mark(tips.nose)} nose · ${mark(tips.tail)} tail` },
        { label: `${stationLabel(system)} widths`, value: `${dim(printed.nose12.width)} nose · ${dim(printed.tail12.width)} tail` },
      ]);
    }
  });

  it("dashes the 12\" widths of a blank that prints none", () => {
    expect(uprightFacts(NO_TWELVES, "imperial")[3].value).toBe(`${NO_FIGURE} nose · ${NO_FIGURE} tail`);
  });
});

describe("compactLine — the short-screen card's one line (D-11)", () => {
  it.each(UNITS_SYSTEMS)("center width × thickness and the nose rocker — %s", (system: UnitsSystem) => {
    for (const p of [FULL, NO_TWELVES, WITH_VOLUME]) {
      const printed = printedBlankStations(p.record);
      expect(compactLine(p, system)).toBe(
        `${dash(printed.center.width, (x) => formatDim(x, system))} × ${dash(printed.center.thickness, (x) => formatMark(x, system))} center · ${formatMark(blankTipRockers(p).nose, system)} nose`,
      );
    }
  });
});
