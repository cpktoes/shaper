/**
 * The before-and-after comparison behind the founder's pictures and the saved-boards report
 * (Phase 14 D-15, D-18): how far a board's five station thicknesses, five rocker numbers and litres
 * move, and whether its "fits" verdict changes, when the same stored board is worked out under the
 * curves the site drew before Phase 14 and under the live ones.
 *
 * Both sides come from the one pipeline every screen reads (`buildBoardProfile` for the stations,
 * `summarizeDesignWith` for the litres, `fitAt` for the verdict) with only the rules swapped — never
 * from a second calculation that could drift from what a shaper sees. The scripts
 * (`scripts/phase14-before-after.ts`, `scripts/check-saved-boards.ts --curves-report`) only feed
 * boards in and print what comes out.
 *
 * Pure: no React, browser API or database import (CLAUDE.md Rule 1), unit-tested in
 * before-after.test.ts.
 */
import { fitAt, prepareBlank, prepareBlankPchip, thinningStartsOf } from "./blank-fit";
import type { FitSettings } from "./blank";
import { buildBoardProfile, type BoardSideProfile } from "./board-profile";
import { summarizeDesignWith, type DesignRules, type DesignSummaryFields } from "./design";
import type { FoilStationKey } from "./foil";
import { formatMark } from "./measure-display";
import { buildOutline, sampleOutline } from "./outline";
import { DEFAULT_FALLBACK_ROCKER } from "./rocker";
import { inchesToMm, mm, type Mm } from "./units";

/**
 * The curves the live site drew before Phase 14, kept by name (D-25): a blank's catalogue rows
 * drawn with pchip straight through the printed values, a board with no blank drawn with pchip
 * through its five stations, and each tip eased in over the last 12" with Phase 12's S-blend.
 * Reproduces every number pinned from the live site (D-26) exactly.
 */
export const RULES_BEFORE_CURVES: DesignRules = { prepare: prepareBlankPchip, handSetCurve: "pchip", tipRule: "blend" };

/**
 * The curves every screen draws from Phase 14 on (D-13): the square-root rise for a bottom and the
 * square-root fall for a thickness or a width, for a blank's curves and a hand-set board alike, and
 * each tip run down steadily from its own Thinning Starts point (D-01) — exactly what
 * `summarizeDesign` uses.
 */
export const RULES_LIVE: DesignRules = { prepare: prepareBlank, handSetCurve: "root", tipRule: "steady" };

/** The five station keys, tail to nose. */
const STATION_KEYS: readonly FoilStationKey[] = ["tailTip", "tail12", "center", "nose12", "noseTip"];

/** One board's figures under one set of rules. */
export interface BoardFigures {
  /** The five station thicknesses — what RAILS reads. */
  thicknessMm: Record<FoilStationKey, Mm>;
  /** The rocker at the five stations. */
  rockerMm: Record<FoilStationKey, Mm>;
  /** The litres the board's cards and VOLUME quote. */
  litres: number;
  /** Whether the board fits its blank where it sits; null for a board with no blank. */
  fits: boolean | null;
}

/**
 * The board's side profile under a chosen set of rules — exactly the profile `summarizeDesignWith`
 * builds for the same board and rules, so stations, litres and pictures all describe one board.
 */
export function boardProfileWith(fields: DesignSummaryFields, rules: DesignRules): BoardSideProfile {
  const { blank } = fields;
  return buildBoardProfile({
    length: fields.outline.length,
    rocker: fields.rocker ?? DEFAULT_FALLBACK_ROCKER,
    foil: fields.foil,
    blank: blank
      ? {
          prepared: rules.prepare(blank.copy),
          placement: blank.placement,
          nose12Offset: blank.nose12Offset,
          tail12Offset: blank.tail12Offset,
          deckSkin: blank.deckSkin,
          tipStyle: blank.tipStyle,
          fineTuneSurface: blank.fineTuneSurface,
          tipRule: rules.tipRule,
          ...thinningStartsOf(blank),
        }
      : null,
    handSetCurve: rules.handSetCurve,
  });
}

/**
 * A board's five thicknesses, five rocker numbers, litres and fit verdict under `rules`. The verdict
 * is judged at the board's own placement (clamped on read, as every screen does) with `settings`'
 * width margin and planer depth; a board with no blank has no verdict.
 */
export function boardFigures(fields: DesignSummaryFields, rules: DesignRules, settings: FitSettings): BoardFigures {
  const profile = boardProfileWith(fields, rules);
  let fits: boolean | null = null;
  if (profile.blank) {
    const outline = buildOutline(fields.outline);
    fits = fitAt(profile.blank.onBlank, (s) => sampleOutline(outline, s), outline.widePointStation, settings).fits;
  }
  return {
    thicknessMm: { ...profile.effectiveFoil },
    rockerMm: { ...profile.stationRocker },
    litres: summarizeDesignWith(fields, rules).volumeLitres,
    fits,
  };
}

/** How one board moved from `before` to `after`. */
export interface BoardMove {
  /** The largest move of any of the ten station numbers (five thicknesses, five rocker), either way. */
  stationMoveMm: number;
  /** The litres change as a fraction of the before figure, signed (0.01 is 1% more). */
  litresChange: number;
  /** What happened to the fit verdict; `noBlank` when either side has none. */
  verdict: "same" | "nowRefused" | "nowFits" | "noBlank";
}

/** Compares one board's figures under two sets of rules. */
export function compareFigures(before: BoardFigures, after: BoardFigures): BoardMove {
  let stationMoveMm = 0;
  for (const key of STATION_KEYS) {
    stationMoveMm = Math.max(
      stationMoveMm,
      Math.abs(after.thicknessMm[key] - before.thicknessMm[key]),
      Math.abs(after.rockerMm[key] - before.rockerMm[key]),
    );
  }
  const litresChange = (after.litres - before.litres) / before.litres;
  let verdict: BoardMove["verdict"];
  if (before.fits === null || after.fits === null) verdict = "noBlank";
  else if (before.fits === after.fits) verdict = "same";
  else verdict = before.fits ? "nowRefused" : "nowFits";
  return { stationMoveMm, litresChange, verdict };
}

/** Counts and maxima over many boards' moves — nothing that could identify a board. */
export interface MovesReport {
  boards: number;
  /** Boards compared with a blank on both sides. */
  withBlank: number;
  maxStationMoveMm: number;
  /** Boards whose largest station move is more than 1/16". */
  overSixteenth: number;
  /** Boards whose largest station move is more than 1/32". */
  overThirtySecond: number;
  /** The median size of the litres change, either way, in percent. */
  litresMedianPct: number;
  /** The largest size of the litres change, either way, in percent. */
  litresMaxPct: number;
  /** Boards whose litres move more than 1% either way. */
  overOnePct: number;
  /** Boards that fit before and do not fit after. */
  nowRefused: number;
  /** Boards that did not fit before and fit after. */
  nowFits: number;
}

/** A sixteenth and a thirty-second of an inch — the report's two station thresholds. */
const SIXTEENTH_MM = inchesToMm(1 / 16);
const THIRTY_SECOND_MM = inchesToMm(1 / 32);
/** The litres threshold, in percent. */
const LITRES_THRESHOLD_PCT = 1;

/** Sums many boards' moves into counts and maxima. An empty list reports zeros. */
export function summarizeMoves(moves: readonly BoardMove[]): MovesReport {
  const litresPct = moves.map((move) => Math.abs(move.litresChange) * 100).sort((a, b) => a - b);
  const middle = Math.floor(litresPct.length / 2);
  const litresMedianPct =
    litresPct.length === 0
      ? 0
      : litresPct.length % 2 === 1
        ? litresPct[middle]
        : (litresPct[middle - 1] + litresPct[middle]) / 2;
  return {
    boards: moves.length,
    withBlank: moves.filter((move) => move.verdict !== "noBlank").length,
    maxStationMoveMm: moves.reduce((max, move) => Math.max(max, move.stationMoveMm), 0),
    overSixteenth: moves.filter((move) => move.stationMoveMm > SIXTEENTH_MM).length,
    overThirtySecond: moves.filter((move) => move.stationMoveMm > THIRTY_SECOND_MM).length,
    litresMedianPct,
    litresMaxPct: litresPct.length === 0 ? 0 : litresPct[litresPct.length - 1],
    overOnePct: litresPct.filter((pct) => pct > LITRES_THRESHOLD_PCT).length,
    nowRefused: moves.filter((move) => move.verdict === "nowRefused").length,
    nowFits: moves.filter((move) => move.verdict === "nowFits").length,
  };
}

/**
 * The report in plain English, four lines under `heading`: counts, the largest station move in
 * Imperial (as the saved-boards check's other lines print), and percentages to two decimals.
 * Nothing about any one board — no blank, no name, no id.
 */
export function movesReportLines(heading: string, report: MovesReport): string[] {
  return [
    `${heading}: ${report.boards} boards compared (${report.withBlank} with a blank both ways)`,
    `  largest move of any station number: ${formatMark(mm(report.maxStationMoveMm), "imperial")}; ` +
      `boards moving more than 1/16": ${report.overSixteenth}; more than 1/32": ${report.overThirtySecond}`,
    `  litres change: median ${report.litresMedianPct.toFixed(2)}%, largest ${report.litresMaxPct.toFixed(2)}%; ` +
      `boards moving more than 1%: ${report.overOnePct}`,
    `  fit verdicts: fits before, refused now: ${report.nowRefused}; refused before, fits now: ${report.nowFits}`,
  ];
}
