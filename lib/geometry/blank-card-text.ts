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
 * A saved blank's card (quick 261016-mkb plan 03, D-03, 2026-10-16) reads its rocker as ordered: the
 * table keeps Width and Thick and reads Natural Rocker (the catalogue's printed figures) over Custom
 * Rocker (`customPrintedStations`), the adjustment itself written once, on the name line, never here;
 * the upright facts and the compact line read the tips as ordered (`orderedTipRockers`). With no
 * rocker, or a natural one, every word is exactly as before.
 *
 * No formula of its own; pure — no React, browser or database import (CLAUDE.md Rule 1).
 */
import type { BlankRecord } from "./blank";
import { blankTipRockers, type PreparedBlank } from "./blank-fit";
import { blankRowVolume } from "./blank-reasons";
import { printedBlankStations } from "./board-profile";
import {
  customPrintedStations,
  isNaturalSpec,
  orderedTipRockers,
  rockerSpecOf,
  sameRockerSpec,
  withCustomRocker,
  type BlankRockerSpec,
} from "./custom-rocker";
import { customRockerRowLabel, naturalRockerRowLabel } from "./custom-rocker-text";
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
export function stationTable(record: BlankRecord, system: UnitsSystem, rocker?: BlankRockerSpec | null): StationTable {
  const printed = printedBlankStations(record);
  const station = stationLabel(system);
  const headers = ["Nose", `N ${station}`, "Center", `T ${station}`, "Tail"];
  const row = (label: string, pick: (key: FoilStationKey) => Mm | null, format: (value: Mm) => string) => ({
    label,
    cells: TABLE_STATIONS.map((key) => orDash(pick(key), format)),
  });
  const width = row(`Width${columnUnitSuffix("dim", system)}`, (key) => printed[key].width, (v) => formatDimBare(v, system));
  const thick = row(`Thick${columnUnitSuffix("mark", system)}`, (key) => printed[key].thickness, (v) => formatMarkBare(v, system));
  const mark = (v: Mm) => formatMarkBare(v, system);
  if (isNaturalSpec(rocker)) {
    return { headers, rows: [width, thick, row(`Rocker${columnUnitSuffix("mark", system)}`, (key) => printed[key].rocker, mark)] };
  }
  // A saved blank (D-03): the catalogue's printed figures over the figures as ordered — the
  // DATASHEET's own Custom Rocker label under the card's short `NAT Rocker` (P-20).
  const ordered = customPrintedStations(record, rocker);
  return {
    headers,
    rows: [
      width,
      thick,
      row(cardNaturalRockerLabel(system), (key) => printed[key].rocker, mark),
      row(customRockerRowLabel(system), (key) => ordered[key].rocker, mark),
    ],
  };
}

/**
 * A saved card's Natural Rocker row label, in the founder's accepted short form (D-02: "NAT is an
 * accepted short form where room is tight") — `NAT Rocker`, `NAT Rocker (mm)`. Measured (P-20, quick
 * 261016-mkb, 2026-10-17) on a 290-dot card in Imperial: a maker's table already reaches the card's
 * inner edge (278 of 278 dots); `Natural Rocker`, wrapped onto two lines and set a little tighter,
 * still runs 3 dots past it (281), while `NAT Rocker` lands exactly on it (278). In Metric either
 * fits no wider than a maker's own card (283 against 292), so the one short form reads in both.
 */
export function cardNaturalRockerLabel(system: UnitsSystem): string {
  return naturalRockerRowLabel(system).replace(/^Natural /, "NAT ");
}

/**
 * The tips a card quotes: as the catalogue prints them with no rocker (`blankTipRockers`), as ordered
 * with one (`orderedTipRockers`) — the blank bent by it here unless it already is (quick 261016-mkb).
 */
function cardTips(prepared: PreparedBlank, rocker?: BlankRockerSpec | null): { nose: Mm; tail: Mm } {
  if (isNaturalSpec(rocker)) return blankTipRockers(prepared);
  const bent = sameRockerSpec(rockerSpecOf(prepared), rocker) ? prepared : withCustomRocker(prepared, rocker);
  return orderedTipRockers(bent);
}

/**
 * The upright card's facts beside its drawing (D-10): Length; Center `{width} × {thickness}`; Rocker
 * `{nose} nose · {tail} tail` as the catalogue prints them (`blankTipRockers`), or as ordered on a
 * saved blank; and the two 12" widths, labelled through `stationLabel` (`12" widths`, `30.5 cm
 * widths`). A "—" stands in for any printed figure missing.
 */
export function uprightFacts(
  prepared: PreparedBlank,
  system: UnitsSystem,
  rocker?: BlankRockerSpec | null,
): { label: string; value: string }[] {
  const printed = printedBlankStations(prepared.record);
  const dim = (value: Mm | null) => orDash(value, (v) => formatDim(v, system));
  const mark = (value: Mm | null) => orDash(value, (v) => formatMark(v, system));
  const tips = cardTips(prepared, rocker);
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
 * {nose rocker} nose`, the nose rocker as the catalogue prints it (`blankTipRockers`), or as ordered
 * on a saved blank.
 */
export function compactLine(prepared: PreparedBlank, system: UnitsSystem, rocker?: BlankRockerSpec | null): string {
  const printed = printedBlankStations(prepared.record);
  const width = orDash(printed.center.width, (v) => formatDim(v, system));
  const thickness = orDash(printed.center.thickness, (v) => formatMark(v, system));
  return `${width} × ${thickness} center · ${formatMark(cardTips(prepared, rocker).nose, system)} nose`;
}
