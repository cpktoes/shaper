/**
 * Every plain-English sentence the blank screens compose around a number (Phase 11, 11-UI-SPEC
 * Copywriting Contract): why a blank won't fit, where the board sits on its blank, what went wrong
 * with a floor, why the list is empty, the list's intro line, a row's meta line and the offer line.
 *
 * They all live here, tested in both systems, so no component ever composes copy around a raw
 * number (CLAUDE.md Rule 2). Every number goes through the display boundary in
 * `measure-display.ts` — `formatMark` for amounts, thicknesses, placements and the settings;
 * `formatLength` for a board's or a blank's length; `formatDim` for a distance along the board;
 * `stationLabel` for the 12" station — and every inch figure below is authored through `units.ts`.
 *
 * Product strings use American spelling (`center`, `catalog`) and straight ASCII inch marks,
 * exactly as the UI-SPEC prints them. Catalogue names are passed through as data, never altered.
 *
 * Pure — no React, browser or database import (CLAUDE.md Rule 1).
 */
import type { BlankRecord, BlankShortfall, FitSettings } from "./blank";
import {
  formatDim,
  formatDimBare,
  formatLength,
  formatMark,
  measureSlider,
  stationLabel,
  type MeasureSliderView,
} from "./measure-display";
import { MEASURE_STATION_MM } from "./outline";
import { inchesToMm, mm, mmToInches, type Mm, type UnitsSystem } from "./units";

/**
 * How close to a named place a failure must be to be called by that place's name — the widepoint,
 * a tip, a 12" station, the center (`(researcher's choice — founder may overrule)` in the UI-SPEC).
 */
export const REASON_SNAP_MM = inchesToMm(1);

/** Float slack on the snap, so a station exactly 1" from a named place still snaps to it. */
const SNAP_SLACK_MM = 1e-9;

/** The flag's two headlines (11-UI-SPEC "The flag and the offer"). */
export const FLAG_HEADLINES = {
  /** F1, F3, F4, F5: the blank fits at no placement, or no longer passes a floor. */
  doesNotFit: "This blank doesn't fit your board",
  /** F2: the blank fits somewhere else along its length, just not where the board sits now. */
  notHere: "Doesn't fit at this placement",
} as const;

/** F5's added sentence, when no blank in any catalogue fits (so there is no offer). */
export const NOTHING_FITS_SENTENCE = "No blank in the three catalogs fits this board right now.";

/** The smallest step each system prints: 1/16" or 1 mm. */
function smallestStep(system: UnitsSystem): Mm {
  return system === "metric" ? mm(1) : inchesToMm(1 / 16);
}

/**
 * An amount of foam, through `formatMark` — or `under 1/16"` / `under 1 mm` when it would print as
 * zero, so a real shortfall never reads `0"`.
 */
function formatAmount(amount: Mm, system: UnitsSystem): string {
  const printed = formatMark(amount, system);
  if (printed === formatMark(mm(0), system)) return `under ${formatMark(smallestStep(system), system)}`;
  return printed;
}

/** Where along the board a shortfall is, first match wins (11-UI-SPEC "Reason vocabulary"). */
function formatWhere(
  shortfall: BlankShortfall,
  board: { length: Mm; widePointStation: Mm },
  system: UnitsSystem,
): string {
  const s = shortfall.station;
  const L = board.length;
  const near = (place: number) => Math.abs(s - place) <= REASON_SNAP_MM + SNAP_SLACK_MM;
  if (shortfall.kind === "wide" && near(board.widePointStation)) return "at the widepoint";
  if (near(L)) return "at the nose tip";
  if (near(0)) return "at the tail tip";
  if (near(L - MEASURE_STATION_MM)) return `${stationLabel(system)} from the nose`;
  if (near(MEASURE_STATION_MM)) return `${stationLabel(system)} from the tail`;
  if (near(L / 2)) return "at the center";
  const fromNose = L - s;
  return fromNose < s
    ? `${formatDim(mm(fromNose), system)} from the nose`
    : `${formatDim(mm(s), system)} from the tail`;
}

/**
 * The reason line under a WON'T FIT row and in the flag (D-06, R12): `{amount} too thin {where}` or
 * `{amount} too wide {where}` — e.g. `1/8" too thin 12" from the nose` / `3 mm too thin 30.5 cm
 * from the nose`, `1/2" too wide at the widepoint`. `station` is measured from the board's tail tip.
 * Every reason names a station and an amount.
 */
export function formatShortfall(
  shortfall: BlankShortfall,
  board: { length: Mm; widePointStation: Mm },
  system: UnitsSystem,
): string {
  const what = shortfall.kind === "wide" ? "too wide" : "too thin";
  return `${formatAmount(shortfall.amount, system)} ${what} ${formatWhere(shortfall, board, system)}`;
}

/**
 * The placement slider's value text (R3): `1/2" toward nose`, `1/4" toward tail`, `13 mm toward
 * nose` — and exactly `centered` whenever the amount prints as zero in the chosen system.
 * Placement is stored positive toward the nose (D-08).
 */
export function formatPlacement(placement: Mm, system: UnitsSystem): string {
  const printed = formatMark(mm(Math.abs(placement)), system);
  if (printed === formatMark(mm(0), system)) return "centered";
  return `${printed} ${placement > 0 ? "toward nose" : "toward tail"}`;
}

/**
 * The placement slider (R3): built on `measureSlider` with the placement NEGATED, so the slider's
 * left end is the most nose-ward placement — matching the drawing's nose-left view and the
 * nose-first order of every list on the screen (`(researcher's choice — founder may overrule)` in
 * the UI-SPEC). `toMm` negates back, so a drag to the left raises the stored, nose-positive
 * placement. Step 1/16" / 1 mm; bounds round inward, never past the range.
 *
 * Both ends sit on the step grid SYMMETRICALLY about zero (IN-01): the slider snaps to
 * `min + k·step`, so an end that is off the grid (a US Blanks length such as 72.748" leaves a
 * reach that is not a whole sixteenth) would put every reachable position off the grid and the
 * thumb could never land exactly on centred. Imperial rounds each end's reach inward to a whole
 * 1/16" here; Metric's `metricSliderRange` already rounds each end inward to a whole millimetre.
 * Either way zero is always a step on the grid, and `formatPlacement` then reads `centered`.
 */
export function placementSlider(
  placement: Mm,
  range: { min: Mm; max: Mm },
  system: UnitsSystem,
): MeasureSliderView {
  const negate = (value: number) => (value === 0 ? 0 : -value);
  const step = 1 / 16;
  /** A reach, in inches, rounded inward onto the 1/16" grid (the same 1e-9 nudge as every grid
   * rounding in `units.ts`, so a reach exactly on the grid never loses a step to float noise). */
  const onGrid = (reachIn: number) => Math.floor(Math.max(0, reachIn) / step + 1e-9) * step;
  const noseReachIn = mmToInches(range.max);
  const tailReachIn = negate(mmToInches(range.min));
  const rangeIn =
    system === "imperial"
      ? { min: negate(onGrid(noseReachIn)), max: onGrid(tailReachIn) }
      : { min: negate(noseReachIn), max: tailReachIn };
  const view = measureSlider(mm(negate(placement)), rangeIn, step, 1, system);
  // `view.value` is already the negated placement in the slider's own unit; only `toMm` turns back.
  return { ...view, toMm: (dragged: number) => mm(negate(view.toMm(dragged))) };
}

/**
 * The flag body for a picked blank that no longer passes a floor (F3, F4): `It's 1 1/2" too short —
 * you've asked for at least 2" of spare length.` / `It's 1/8" too thin at the center — you've asked
 * for at least 3/8" of spare thickness.` `required` is the shaper's own setting.
 */
export function floorShortfallMessage(
  kind: "length" | "center",
  shortBy: Mm,
  required: Mm,
  system: UnitsSystem,
): string {
  const amount = formatAmount(shortBy, system);
  const setting = formatMark(required, system);
  return kind === "length"
    ? `It's ${amount} too short — you've asked for at least ${setting} of spare length.`
    : `It's ${amount} too thin at the center — you've asked for at least ${setting} of spare thickness.`;
}

/**
 * The empty list's heading and body (E1, E2, E3), naming the board's number, the catalogue's best
 * and the setting that ruled every blank out. `kind` is `listBlanks`'s `emptyReason`.
 */
export function emptyListMessage(
  kind: "length" | "thickness" | "both",
  numbers: {
    boardLength: Mm;
    longest: Mm;
    centre: Mm;
    thickestCenter: Mm;
    settings: Pick<FitSettings, "extraLength" | "extraCenterThickness">;
  },
  system: UnitsSystem,
): { heading: string; body: string } {
  const extraLength = formatMark(numbers.settings.extraLength, system);
  const extraCenter = formatMark(numbers.settings.extraCenterThickness, system);
  if (kind === "length") {
    return {
      heading: "No blank is long enough",
      body:
        `Your board is ${formatLength(numbers.boardLength, system)} and the longest blank in the three ` +
        `catalogs is ${formatLength(numbers.longest, system)}, so none leaves the ${extraLength} of spare ` +
        `length you've asked for. Shorten the board on the TEMPLATE screen, or ask for less spare length.`,
    };
  }
  if (kind === "thickness") {
    return {
      heading: "No blank is thick enough",
      body:
        `Your center is ${formatMark(numbers.centre, system)} and the thickest blank is ` +
        `${formatMark(numbers.thickestCenter, system)} at the center, so none leaves the ${extraCenter} of ` +
        `spare thickness you've asked for. Try a thinner center, or ask for less spare thickness.`,
    };
  }
  return {
    heading: "No blank passes both rules",
    body: `Nothing in the three catalogs is both ${extraLength} longer and ${extraCenter} thicker at the center than your board.`,
  };
}

/** The line above the list, live from the shaper's two floor settings (D-04). */
export function listIntro(
  settings: Pick<FitSettings, "extraLength" | "extraCenterThickness">,
  system: UnitsSystem,
): string {
  return (
    `Shortest first. Each is at least ${formatMark(settings.extraLength, system)} longer and ` +
    `${formatMark(settings.extraCenterThickness, system)} thicker at the center than your board. ` +
    `Greyed blanks don't fit somewhere — the line under each says where.`
  );
}

/**
 * A blank row's second line: `{vendor} · {length} · {centre} center` — the blank's measured length
 * through `formatLength` (the same formatter as the board's own length, so the two compare
 * directly) and its printed centre-station thickness. A record with no centre thickness (never a
 * pickable one) shows vendor and length only.
 */
export function blankRowMeta(
  record: Pick<BlankRecord, "vendor" | "lengthMm" | "stations">,
  system: UnitsSystem,
): string {
  const head = `${record.vendor} · ${formatLength(record.lengthMm, system)}`;
  const centre = record.stations.find((station) => station.label === "C")?.thicknessMm ?? null;
  return centre === null ? head : `${head} · ${formatMark(centre, system)} center`;
}

/** Curly quotes an iPhone types (’ ‘ ” “) folded to straight ones, so `6’2` finds `6'2"`. */
function foldQuotes(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

/**
 * The list's search (11-UI-SPEC §2 state B): a case-insensitive substring over `{vendor} {name}`,
 * curly quotes folded to straight ones on both sides first. An empty (or all-space) query matches
 * every blank. Plain `String.prototype.includes` — the shaper's text is never turned into a
 * regular expression, so `(`, `*` or `[` are read literally and can never throw (T-11-31).
 */
export function matchesBlankSearch(record: Pick<BlankRecord, "vendor" | "name">, query: string): boolean {
  const needle = foldQuotes(query.trim()).toLowerCase();
  if (needle === "") return true;
  return foldQuotes(`${record.vendor} ${record.name}`).toLowerCase().includes(needle);
}

/**
 * A row's volume, where the catalogue prints one: `34.0 L` — one decimal, read the same in both
 * systems (CLAUDE.md Rule 2). Null when the catalogue has no volume, so nothing takes its place.
 */
export function blankRowVolume(record: Pick<BlankRecord, "volumeLitres">): string | null {
  return record.volumeLitres === null ? null : `${record.volumeLitres.toFixed(1)} L`;
}

/**
 * The line under the ROCKER subtitle: `Length and width from TEMPLATE: 5'10" × 19 1/2"`, and in
 * Metric `… 177.8 × 49.5 cm` — the unit carried once, at the end of the line (the house rule for
 * running text). The length reads through `formatLength` (the same formatter a blank's length reads
 * through, so the two compare directly), the width through `formatDim`.
 */
export function boardLine(length: Mm, width: Mm, system: UnitsSystem): string {
  const lengthText = system === "metric" ? formatDimBare(length, system) : formatLength(length, system);
  return `Length and width from TEMPLATE: ${lengthText} × ${formatDim(width, system)}`;
}

/** The offer beside a flag: `Closest blank that fits: {vendor} {name}, {length}`. */
export function offerLine(record: Pick<BlankRecord, "vendor" | "name" | "lengthMm">, system: UnitsSystem): string {
  return `Closest blank that fits: ${record.vendor} ${record.name}, ${formatLength(record.lengthMm, system)}`;
}
