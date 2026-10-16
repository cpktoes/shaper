/**
 * Every word and number on a blank's card in ROCKER's PICK A BLANK popup (quick 261015-ve9, sketch
 * 015 B, the founder's rulings of 2026-10-15), in the shaper's chosen system.
 *
 * - The flat card (D-09): the header's right-hand figures — the blank's measured length, then its
 *   volume where the catalogue prints one (`6'2 3/4" · 55.1 L`) — and, directly under the drawing,
 *   the printed station table: columns Nose, N 12", Center, T 12", Tail (the catalogue's N0, N12, C,
 *   T12, T0), rows Width / Thick / Rocker, the catalogue's own figures with "—" where it prints none.
 * - The upright card (D-10): the facts beside the drawing — Length, Center width × thickness, Rocker
 *   nose · tail, and the 12" widths.
 * - The short-screen compact card (D-11): one line, center width × thickness and the nose rocker.
 *
 * Rule 2 (D-15): a blank's length reads through `formatLength`; widths are dims (`formatDim`,
 * centimetres to one decimal in Metric); thicknesses and rocker are marks (`formatMark`, whole
 * millimetres). The table's Metric headers follow the DATASHEET's own convention — the unit once in
 * the row label (`columnUnitSuffix`) and the 12" stations named through `stationLabel` (`N 30.5 cm`).
 * The rocker beside an upright card and in the compact line is the catalogue's printed N0 / T0 rocker
 * — the very figure the station table's Rocker row prints — through `blankTipRockers`, the same number
 * the nose-rocker filter and sort read (P-6, overruled by the founder 2026-10-16: printed figures
 * everywhere; the levelled curve's tip stands in only where the catalogue prints no tip rocker).
 *
 * No formula of its own; pure — no React, browser or database import (CLAUDE.md Rule 1).
 */
import type { BlankRecord } from "./blank";
import { blankTipRockers, type PreparedBlank } from "./blank-fit";
import { blankRowVolume } from "./blank-reasons";
import { printedBlankStations } from "./board-profile";
import type { FoilStationKey } from "./foil";
import {
  columnUnitSuffix,
  formatDim,
  formatDimBare,
  formatLength,
  formatMark,
  formatMarkBare,
  stationLabel,
} from "./measure-display";
import type { Mm, UnitsSystem } from "./units";

/** The DATASHEET's "no number here" mark. */
export const NO_FIGURE = "—";

/** The table's columns, nose to tail — the catalogue's N0, N12, C, T12, T0. */
const TABLE_STATIONS: readonly FoilStationKey[] = ["noseTip", "nose12", "center", "tail12", "tailTip"];

/** A printed value through `format`, or the "no number" mark. */
function orDash(value: Mm | null, format: (value: Mm) => string): string {
  return value === null ? NO_FIGURE : format(value);
}

/**
 * The flat card's header figures (D-09): `{length} · {volume}` — `6'2 3/4" · 55.1 L`, `188.9 cm ·
 * 55.1 L` — or the length alone where the catalogue prints no volume.
 */
export function cardFigures(record: Pick<BlankRecord, "lengthMm" | "volumeLitres">, system: UnitsSystem): string {
  const length = formatLength(record.lengthMm, system);
  const volume = blankRowVolume(record);
  return volume === null ? length : `${length} · ${volume}`;
}

/** The printed station table: the five station headers and three labelled rows of cells. */
export interface StationTable {
  headers: string[];
  rows: { label: string; cells: string[] }[];
}

/**
 * The printed station table under a flat card's drawing (D-09): the catalogue's own Width, Thick and
 * Rocker at N0, N12, C, T12 and T0 — no levelling, no estimate from the curve, a "—" wherever the
 * catalogue prints nothing (Marko Foam's 10'2" M prints no N12 or T12).
 */
export function stationTable(record: BlankRecord, system: UnitsSystem): StationTable {
  const printed = printedBlankStations(record);
  const station = stationLabel(system);
  const headers = ["Nose", `N ${station}`, "Center", `T ${station}`, "Tail"];
  const row = (label: string, pick: (key: FoilStationKey) => Mm | null, format: (value: Mm) => string) => ({
    label,
    cells: TABLE_STATIONS.map((key) => orDash(pick(key), format)),
  });
  return {
    headers,
    rows: [
      row(`Width${columnUnitSuffix("dim", system)}`, (key) => printed[key].width, (v) => formatDimBare(v, system)),
      row(`Thick${columnUnitSuffix("mark", system)}`, (key) => printed[key].thickness, (v) => formatMarkBare(v, system)),
      row(`Rocker${columnUnitSuffix("mark", system)}`, (key) => printed[key].rocker, (v) => formatMarkBare(v, system)),
    ],
  };
}

/**
 * The upright card's facts beside its drawing (D-10): Length; Center `{width} × {thickness}`; Rocker
 * `{nose} nose · {tail} tail` as the catalogue prints them (`blankTipRockers`); and the two 12" widths, labelled through
 * `stationLabel` (`12" widths`, `30.5 cm widths`). A "—" stands in for any printed figure missing.
 */
export function uprightFacts(prepared: PreparedBlank, system: UnitsSystem): { label: string; value: string }[] {
  const printed = printedBlankStations(prepared.record);
  const dim = (value: Mm | null) => orDash(value, (v) => formatDim(v, system));
  const mark = (value: Mm | null) => orDash(value, (v) => formatMark(v, system));
  const tips = blankTipRockers(prepared);
  return [
    { label: "Length", value: formatLength(prepared.lengthMm, system) },
    { label: "Center", value: `${dim(printed.center.width)} × ${mark(printed.center.thickness)}` },
    { label: "Rocker", value: `${mark(tips.nose)} nose · ${mark(tips.tail)} tail` },
    {
      label: `${stationLabel(system)} widths`,
      value: `${dim(printed.nose12.width)} nose · ${dim(printed.tail12.width)} tail`,
    },
  ];
}

/**
 * The short-screen compact card's one line (D-11): `{center width} × {center thickness} center ·
 * {nose rocker} nose`, the nose rocker as the catalogue prints it (`blankTipRockers`).
 */
export function compactLine(prepared: PreparedBlank, system: UnitsSystem): string {
  const printed = printedBlankStations(prepared.record);
  const width = orDash(printed.center.width, (v) => formatDim(v, system));
  const thickness = orDash(printed.center.thickness, (v) => formatMark(v, system));
  return `${width} × ${thickness} center · ${formatMark(blankTipRockers(prepared).nose, system)} nose`;
}
