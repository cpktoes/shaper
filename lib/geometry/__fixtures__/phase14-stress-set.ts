/**
 * The Phase 14 stress set (D-27), exactly as the phase's research built it — shared by the pin of
 * today's numbers (`scripts/extract-phase14-today-golden.ts`), the curves tests and the tips tests,
 * so every one of them judges the same boards.
 *
 * For every pickable blank, in the order it is handed in: a board 2" shorter than the blank; centres
 * of 2 1/4", 2 1/2", 2 3/4" and 3"; the out-of-the-box tips (`DEFAULT_FOIL_SPEC`: 1/2" nose, 5/8"
 * tail) and cut (`DEFAULT_BLANK_CUT`), no fine-tunes; the default outline stretched to the board's
 * length; kept only when the blank passes the list's two floors (`floorCheck`) with the default fit
 * settings; and laid at three placements — the tail end, the centre and the nose end of the slider
 * (`placementRange`). Boards longer than the app's 10'0" limit are kept — the set as defined — and
 * each case says whether the app could build it (`buildable`).
 *
 * Test-only: no React, browser or database import, and nothing outside the tests and the pin's
 * generator imports this file.
 */
import { isPickable } from "@/lib/blanks/catalog";
import { DEFAULT_FIT_DEFAULTS, toFitSettings } from "@/lib/fit-defaults-preference";
import { DEFAULT_BLANK_CUT, type BlankRecord, type FitSettings } from "../blank";
import { floorCheck, placementRange, type BoardOnBlankInput, type PreparedBlank } from "../blank-fit";
import { BOARD_LENGTH_RANGE_IN, DEFAULT_BOARD_SPEC } from "../board";
import { DEFAULT_FOIL_SPEC } from "../foil";
import { buildOutline, sampleOutline } from "../outline";
import { inchesToMm, mm, type Mm } from "../units";

/** The fit rules every stress board is judged by: the app's out-of-the-box Fit & Tip Defaults. */
export const STRESS_FIT_SETTINGS: FitSettings = toFitSettings(DEFAULT_FIT_DEFAULTS);

/** The four target centres, in inches, each converted through `inchesToMm`. */
const STRESS_CENTRES_IN = [2.25, 2.5, 2.75, 3] as const;

/** One stress board: a blank, the board cut from it, and where it sits. */
export interface StressCase {
  /** `vendor|name|centre in inches|place` — unique across the set. */
  label: string;
  record: BlankRecord;
  prepared: PreparedBlank;
  board: BoardOnBlankInput;
  placement: Mm;
  centreIn: number;
  place: "tail" | "centre" | "nose";
  /** Whether the board's length is inside the app's own length limits (`BOARD_LENGTH_RANGE_IN`). */
  buildable: boolean;
  /** The board outline's half-width at a station (what `sampleOutline` returns). */
  halfWidthAt: (station: Mm) => Mm;
  widePointStation: Mm;
}

/**
 * Builds the stress set from `records` (non-pickable records are skipped), preparing each blank
 * with `prepare` — the caller's choice of rule, so the same set can be judged under today's curves
 * and under any later one.
 */
export function buildStressSet(
  records: readonly BlankRecord[],
  prepare: (record: BlankRecord) => PreparedBlank,
): StressCase[] {
  const minLength = inchesToMm(BOARD_LENGTH_RANGE_IN.min);
  const maxLength = inchesToMm(BOARD_LENGTH_RANGE_IN.max);
  const cases: StressCase[] = [];
  for (const record of records) {
    if (!isPickable(record)) continue;
    const prepared = prepare(record);
    const length = mm(prepared.lengthMm - inchesToMm(2));
    const buildable = length >= minLength && length <= maxLength;
    const geometry = buildOutline({ ...DEFAULT_BOARD_SPEC.outline, length });
    const halfWidthAt = (station: Mm) => sampleOutline(geometry, station);
    const range = placementRange(prepared.lengthMm, length);
    const places = [
      { place: "tail", placement: range.min },
      { place: "centre", placement: mm(0) },
      { place: "nose", placement: range.max },
    ] as const;
    for (const centreIn of STRESS_CENTRES_IN) {
      const board: BoardOnBlankInput = {
        length,
        centerThickness: inchesToMm(centreIn),
        noseTip: DEFAULT_FOIL_SPEC.noseTip,
        tailTip: DEFAULT_FOIL_SPEC.tailTip,
        nose12Offset: mm(0),
        tail12Offset: mm(0),
        ...DEFAULT_BLANK_CUT,
      };
      if (!floorCheck(prepared, board, STRESS_FIT_SETTINGS).passes) continue;
      for (const { place, placement } of places) {
        cases.push({
          label: `${record.vendor}|${record.name}|${centreIn}|${place}`,
          record,
          prepared,
          board,
          placement,
          centreIn,
          place,
          buildable,
          halfWidthAt,
          widePointStation: geometry.widePointStation,
        });
      }
    }
  }
  return cases;
}
