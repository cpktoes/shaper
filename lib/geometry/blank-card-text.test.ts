import { describe, expect, it } from "vitest";
import { isPickable } from "@/lib/blanks/catalog";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { blankTipRockers, prepareBlank, type PreparedBlank } from "./blank-fit";
import { cardFigures, cardNaturalRockerLabel, compactLine, NO_FIGURE, stationTable, uprightFacts } from "./blank-card-text";
import { blankRowVolume } from "./blank-reasons";
import { printedBlankStations } from "./board-profile";
import { customPrintedStations, orderedTipRockers, withCustomRocker, type BlankRockerSpec } from "./custom-rocker";
import { customRockerRowLabel, naturalRockerRowLabel } from "./custom-rocker-text";
import {
  formatDim,
  formatDimBare,
  formatLength,
  formatMark,
  formatMarkBare,
  stationLabel,
} from "./measure-display";
import { inchesToMm, UNITS_SYSTEMS, type Mm, type UnitsSystem } from "./units";

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

  it.each(UNITS_SYSTEMS)("the Rocker row quotes the same printed N0 / T0 the table's Rocker row prints — %s", (system) => {
    // The founder overruled P-6 on 2026-10-16: printed figures everywhere.
    let checked = 0;
    for (const p of [FULL, NO_TWELVES]) {
      const printed = printedBlankStations(p.record);
      if (printed.noseTip.rocker === null || printed.tailTip.rocker === null) continue;
      checked++;
      const mark = (v: Mm) => formatMark(v, system);
      expect(uprightFacts(p, system)[2].value).toBe(
        `${mark(printed.noseTip.rocker)} nose · ${mark(printed.tailTip.rocker)} tail`,
      );
    }
    expect(checked).toBeGreaterThan(0);
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

// A saved blank's card (quick 261016-mkb plan 03, D-03): its rocker as ordered. Specs are built with
// `inchesToMm`; every expected figure comes from the app's own functions.
const NOSE_UP_TAIL_DOWN: BlankRockerSpec = {
  changes: [
    { end: "nose", amount: inchesToMm(1 / 4), fromTip: inchesToMm(18) },
    { end: "tail", amount: inchesToMm(-1 / 8) },
  ],
};

describe("a saved blank's card — its rocker as ordered (quick 261016-mkb, D-03)", () => {
  it.each(UNITS_SYSTEMS)("no rocker, or a natural one, leaves the table exactly as today — %s", (system) => {
    for (const p of [FULL, NO_TWELVES]) {
      expect(stationTable(p.record, system, undefined)).toEqual(stationTable(p.record, system));
      expect(stationTable(p.record, system, { changes: [] })).toEqual(stationTable(p.record, system));
    }
  });

  it("the card's natural row is the DATASHEET's label in the founder's short form, NAT (P-20)", () => {
    expect(cardNaturalRockerLabel("imperial")).toBe("NAT Rocker");
    expect(cardNaturalRockerLabel("metric")).toBe("NAT Rocker (mm)");
    for (const system of UNITS_SYSTEMS) {
      expect(cardNaturalRockerLabel(system)).toBe(naturalRockerRowLabel(system).replace("Natural", "NAT"));
    }
  });

  it.each(UNITS_SYSTEMS)("reads Width, Thick, then NAT Rocker over Custom Rocker — %s", (system) => {
    for (const p of [FULL, NO_TWELVES]) {
      const printed = printedBlankStations(p.record);
      const ordered = customPrintedStations(p.record, NOSE_UP_TAIL_DOWN);
      const keys = ["noseTip", "nose12", "center", "tail12", "tailTip"] as const;
      const table = stationTable(p.record, system, NOSE_UP_TAIL_DOWN);
      const plain = stationTable(p.record, system);
      expect(table.headers).toEqual(plain.headers);
      expect(table.rows.map((r) => r.label)).toEqual([
        plain.rows[0].label,
        plain.rows[1].label,
        cardNaturalRockerLabel(system),
        customRockerRowLabel(system),
      ]);
      expect(table.rows.slice(0, 3)).toEqual([plain.rows[0], plain.rows[1], { ...plain.rows[2], label: cardNaturalRockerLabel(system) }]);
      expect(table.rows[3].cells).toEqual(keys.map((k) => dash(ordered[k].rocker, (x) => formatMarkBare(x, system))));
      // The bend shows at the tips: the nose up, the tail down.
      if (printed.noseTip.rocker !== null) expect(ordered.noseTip.rocker!).toBeGreaterThan(printed.noseTip.rocker);
      if (printed.tailTip.rocker !== null) expect(ordered.tailTip.rocker!).toBeLessThan(printed.tailTip.rocker);
    }
  });

  it.each(UNITS_SYSTEMS)("the upright facts and the compact line read the tips as ordered — %s", (system) => {
    for (const p of [FULL, NO_TWELVES]) {
      const bent = withCustomRocker(p, NOSE_UP_TAIL_DOWN);
      const tips = orderedTipRockers(bent);
      const mark = (v: Mm) => formatMark(v, system);
      expect(uprightFacts(bent, system, NOSE_UP_TAIL_DOWN)[2].value).toBe(`${mark(tips.nose)} nose · ${mark(tips.tail)} tail`);
      // Handed the natural blank and the rocker, it bends it to read the same figures.
      expect(uprightFacts(p, system, NOSE_UP_TAIL_DOWN)).toEqual(uprightFacts(bent, system, NOSE_UP_TAIL_DOWN));
      expect(compactLine(bent, system, NOSE_UP_TAIL_DOWN).endsWith(` · ${mark(tips.nose)} nose`)).toBe(true);
      // Without a rocker, exactly as today.
      expect(uprightFacts(p, system)).toEqual(uprightFacts(p, system, undefined));
      expect(compactLine(p, system)).toBe(compactLine(p, system, { changes: [] }));
    }
  });
});
