/**
 * Which blank to suggest for a board read from a `.brd` (quick 261113-gwo, the founder, 2026-11-13: "Maybe suggest a blank
 * (from each mfg?) that gets the rocker very close").
 *
 * For each blank maker: among the blanks the fitted board fits in by the app's own rules, the one whose rocker under the
 * board comes closest to the FILE's bottom line. A suggestion only; nothing here picks a blank for anybody.
 *
 * The method, measured end to end at plan time:
 *
 * - The board is built exactly as ROCKER's blank list judges a board with no blank picked yet (`brdBlankFitContext`: the
 *   fit's length, outline, centre thickness and two tips, no fine-tunes, the shaper's own Deck Skin and Tip Style), and the
 *   app's own `listBlanks` judges the whole catalogue against it with the shaper's own three fit rules.
 * - Each blank that FITS is read at the verdict's own placement (`boardOnBlank`), which is where Pick a Blank would lay the
 *   board, so the figures here are the very figures ROCKER shows after the pick.
 * - The gap is measured as lift off each line's own centre (the board's `rockerAt(s) - rockerAt(L/2)`; the file's
 *   `lineLowestAt(bottom, s) - lineLowestAt(bottom, L/2)`, the measure the ROCKER table uses), on the same 400-step grid the
 *   fit's own closeness uses, with the last inch at each tip left out. The blank with the smallest widest gap wins, per maker.
 * - The blank is chosen by its NATURAL rocker, and its Customize Rocker order is worked out afterwards for that one blank
 *   (`bendsToward`). Choosing by the bent result picks absurd blanks (a 7'8" blank bent two inches for a 5'7" board), so it
 *   is not done.
 *
 * Customize Rocker (`bendsToward`): one change per end, because a second change per end is millions of tries for little
 * more. A bend adds `amount x u^2` past its start, so with the board at a fixed placement its centre-referenced lift is the
 * natural lift plus `amount x g(s)`, where `g` is that one bend at 1 mm; searching every whole-inch start and every 1/16"
 * amount costs a few milliseconds that way, and the winner is then checked exactly (`withCustomRocker`, `boardOnBlank`), so
 * the figures shown are never the model's. The plain best-gap bend sometimes orders something odd (`-2"N7"`), so each end
 * takes the SMALLEST amount whose gap is within 1/32" of that end's best, then the start nearest the centre; and the order is
 * shown only when it brings the blank at least 1/16" closer than it is.
 *
 * Pure millimetres, nothing rounded. No React, browser or database import (CLAUDE.md Rule 1).
 */
import type { P2 } from "./bezier-fit";
import { DEFAULT_BLANK_CUT, type BlankRecord, type FitSettings, type TipStyle } from "./blank";
import {
  blankStationOf,
  boardOnBlank,
  listBlanks,
  type BoardFitContext,
  type BoardOnBlank,
  type PreparedBlank,
} from "./blank-fit";
import { BRD_FIT_TIP_SKIP_MM, lineLowestAt, type BrdFit } from "./brd-fit";
import {
  bendAt,
  floorOf,
  isNaturalSpec,
  naturalOf,
  normalizeSpec,
  ROCKER_BEND_MIN_FROM_TIP_IN,
  ROCKER_CHANGE_MAX_MM,
  withCustomRocker,
  type BlankRockerSpec,
  type RockerChange,
} from "./custom-rocker";
import { buildOutline, sampleOutline } from "./outline";
import { rockerStationPositions } from "./rocker";
import { inchesToMm, mm, mmToInches, type Mm } from "./units";

/** The stations the gap is read at across the board: the same steps the fit's own closeness uses. */
export const BRD_SUGGEST_STEPS = 400;
/** The smallest step of a Customize Rocker amount: 1/16". */
export const BRD_BEND_STEP_MM: Mm = inchesToMm(1 / 16);
/** An end's smallest amount is taken whose gap is within this of that end's best: 1/32". */
export const BRD_BEND_TIE_MM: Mm = inchesToMm(1 / 32);
/** An order is shown only when it brings the blank at least this much closer than the natural blank: 1/16". */
export const BRD_BEND_MIN_GAIN_MM: Mm = inchesToMm(1 / 16);

/** How the board would be cut from a blank: the shaper's own Deck Skin and Tip Style. */
export interface BrdBlankCut {
  deckSkin: Mm;
  tipStyle: TipStyle;
}

/**
 * The board ROCKER's blank list judges for a board with no blank picked: exactly what `useBlankList` builds, so the verdicts
 * here are the verdicts ROCKER gives the opened board.
 */
export function brdBlankFitContext(fit: Pick<BrdFit, "outline" | "foil">, cut: BrdBlankCut): BoardFitContext {
  const geometry = buildOutline(fit.outline);
  return {
    board: {
      length: fit.outline.length,
      centerThickness: fit.foil.center,
      noseTip: fit.foil.noseTip,
      tailTip: fit.foil.tailTip,
      nose12Offset: mm(0),
      tail12Offset: mm(0),
      deckSkin: cut.deckSkin,
      tipStyle: cut.tipStyle,
      fineTuneSurface: DEFAULT_BLANK_CUT.fineTuneSurface,
    },
    halfWidthAt: (station: Mm) => sampleOutline(geometry, station),
    widePointStation: geometry.widePointStation,
  };
}

/** How far a blank's rocker under the board is from the file's: the widest gap, and where it is (from the tail). */
export interface BrdRockerGap {
  largest: Mm;
  at: Mm;
}

/** The Customize Rocker order that brings a blank closer, and how close it then gets (checked exactly). */
export interface BrdBlankBends {
  spec: BlankRockerSpec;
  largest: Mm;
  at: Mm;
}

/** One maker's pick: the blank, where the board sits on it, how close it is and the order that brings it closer. */
export interface BrdBlankPick {
  record: BlankRecord;
  placement: Mm;
  gap: BrdRockerGap;
  /** The board's lift on this blank (off its own centre) at the four stations a shaper reads. */
  lift: Record<"noseTip" | "nose12" | "tail12" | "tailTip", Mm>;
  /** Null when no single change per end brings the blank at least 1/16" closer. */
  bends: BrdBlankBends | null;
}

/** One maker's answer: its pick, or null when no blank of its makes this board fit. */
export interface BrdBlankSuggestion {
  vendor: string;
  pick: BrdBlankPick | null;
}

// ---------------------------------------------------------------------------------------------------------------------
// The gap
// ---------------------------------------------------------------------------------------------------------------------

/** The stations the gap is read at, and the file's lift off its own centre at each. */
interface FileGrid {
  stations: number[];
  lift: number[];
}

function fileGridOf(bottom: readonly P2[], length: number): FileGrid {
  const centre = lineLowestAt(bottom, length / 2);
  const stations: number[] = [];
  for (let i = 0; i <= BRD_SUGGEST_STEPS; i++) {
    const s = (length * i) / BRD_SUGGEST_STEPS;
    if (s >= BRD_FIT_TIP_SKIP_MM && s <= length - BRD_FIT_TIP_SKIP_MM) stations.push(s);
  }
  return { stations, lift: stations.map((s) => lineLowestAt(bottom, s) - centre) };
}

/** The board's lift off its own centre at each grid station, on a blank. */
function boardLiftOn(onBlank: BoardOnBlank, grid: FileGrid, length: number): number[] {
  const centre = onBlank.rockerAt(length / 2);
  return grid.stations.map((s) => onBlank.rockerAt(s) - centre);
}

/** The widest gap between the board on a blank and the file, and where (the first on a tie). */
function gapOn(onBlank: BoardOnBlank, grid: FileGrid, length: number): BrdRockerGap {
  const lift = boardLiftOn(onBlank, grid, length);
  let largest = 0;
  let at = 0;
  for (let i = 0; i < lift.length; i++) {
    const d = Math.abs(lift[i] - grid.lift[i]);
    if (d > largest) {
      largest = d;
      at = grid.stations[i];
    }
  }
  return { largest: mm(largest), at: mm(at) };
}

// ---------------------------------------------------------------------------------------------------------------------
// Customize Rocker
// ---------------------------------------------------------------------------------------------------------------------

/** One candidate for an end: its start (whole inches in from the tip, null = the centre), amount in steps, and widest gap. */
interface BendTry {
  steps: number;
  fromTipIn: number | null;
  worst: number;
}

/**
 * The Customize Rocker order, one change per end, that brings `prepared` (laid at `placement`) closest to the file's bottom
 * line; null when the best order is not at least `BRD_BEND_MIN_GAIN_MM` closer than the natural blank. Every change sits
 * inside Customize Rocker's own limits: whole-inch start at least 3" in and short of the centre (or the centre), within
 * 2" either way, in whole 1/16", never under the blank's floor. The gap it reports is measured on the really bent blank.
 */
export function bendsToward(
  prepared: PreparedBlank,
  ctx: BoardFitContext,
  placement: Mm,
  bottom: readonly P2[],
): BrdBlankBends | null {
  const base = naturalOf(prepared);
  const L = ctx.board.length;
  const Lb = base.lengthMm;
  const grid = fileGridOf(bottom, L);
  const natural = boardOnBlank(base, ctx.board, placement);
  const naturalGap = gapOn(natural, grid, L);
  const p = natural.placement;

  const residual = boardLiftOn(natural, grid, L).map((lift, i) => grid.lift[i] - lift);
  const xOf = (s: number) => blankStationOf(mm(s), p, L, Lb);
  const xc = xOf(L / 2);
  const centreIn = Math.floor(mmToInches(mm(Lb / 2)) + 1e-9);
  const starts: (number | null)[] = [null];
  for (let f = ROCKER_BEND_MIN_FROM_TIP_IN; f < centreIn; f++) starts.push(f);
  const maxSteps = Math.round(ROCKER_CHANGE_MAX_MM / BRD_BEND_STEP_MM);

  const solveEnd = (end: "nose" | "tail", others: BlankRockerSpec): RockerChange[] => {
    const idx: number[] = [];
    grid.stations.forEach((s, i) => {
      if (end === "nose" ? s >= L / 2 : s <= L / 2) idx.push(i);
    });
    const changeAt = (fromTipIn: number | null, amount: number): RockerChange =>
      fromTipIn === null ? { end, amount: mm(amount) } : { end, amount: mm(amount), fromTip: inchesToMm(fromTipIn) };

    const tries: BendTry[] = [{ steps: 0, fromTipIn: null, worst: Math.max(...idx.map((i) => Math.abs(residual[i]))) }];
    for (const fromTipIn of starts) {
      // The change's shape at 1 mm: what it adds at each station, off what it adds at the centre.
      const unit = { changes: [changeAt(fromTipIn, 1)] };
      const atCentre = bendAt(unit, Lb, xc);
      const shape = idx.map((i) => bendAt(unit, Lb, xOf(grid.stations[i])) - atCentre);
      if (shape.every((g) => Math.abs(g) < 1e-12)) continue;
      const lowest = Math.round(floorOf(base, changeAt(fromTipIn, 0), others, BRD_BEND_STEP_MM) / BRD_BEND_STEP_MM);
      for (let k = lowest; k <= maxSteps; k++) {
        if (k === 0) continue;
        const amount = k * BRD_BEND_STEP_MM;
        let worst = 0;
        for (let j = 0; j < idx.length; j++) {
          const d = Math.abs(residual[idx[j]] - amount * shape[j]);
          if (d > worst) worst = d;
        }
        tries.push({ steps: k, fromTipIn, worst });
      }
    }
    const best = Math.min(...tries.map((t) => t.worst));
    const chosen = tries
      .filter((t) => t.worst <= best + BRD_BEND_TIE_MM + 1e-9)
      .sort(
        (a, b) =>
          Math.abs(a.steps) - Math.abs(b.steps) ||
          // The centre first, then the larger whole inch (nearer the centre).
          (a.fromTipIn === b.fromTipIn ? 0 : a.fromTipIn === null ? -1 : b.fromTipIn === null ? 1 : b.fromTipIn - a.fromTipIn) ||
          a.worst - b.worst,
      )[0];
    return chosen.steps === 0 ? [] : [changeAt(chosen.fromTipIn, chosen.steps * BRD_BEND_STEP_MM)];
  };

  const nose = solveEnd("nose", { changes: [] });
  const tail = solveEnd("tail", { changes: nose });
  const spec = normalizeSpec({ changes: [...nose, ...tail] }, Lb);
  if (isNaturalSpec(spec)) return null;

  const exact = gapOn(boardOnBlank(withCustomRocker(base, spec), ctx.board, p), grid, L);
  if (naturalGap.largest - exact.largest < BRD_BEND_MIN_GAIN_MM) return null;
  return { spec, largest: exact.largest, at: exact.at };
}

// ---------------------------------------------------------------------------------------------------------------------
// The suggestion
// ---------------------------------------------------------------------------------------------------------------------

export interface BrdBlankSuggestInput {
  /** Our fit of the file: its outline and foil are the board the blanks are judged against. */
  fit: Pick<BrdFit, "outline" | "foil">;
  /** The file's bottom line, (distance from the tail, height). */
  bottom: readonly P2[];
  /** The catalogue, every blank fitted once. */
  prepared: readonly PreparedBlank[];
  /** The makers to answer for (the ones the shaper shows), in the order to answer. */
  makers: readonly string[];
  cut: BrdBlankCut;
  settings: FitSettings;
}

/**
 * One suggestion per maker in `makers`, in that order: the blank that maker offers that the board fits in, whose rocker under
 * the board comes closest to the file's (on a tie the shorter blank), or no pick when none of its blanks fits.
 */
export function suggestBlanks(input: BrdBlankSuggestInput): BrdBlankSuggestion[] {
  const { fit, bottom, prepared, makers, cut, settings } = input;
  const ctx = brdBlankFitContext(fit, cut);
  const L = ctx.board.length;
  const grid = fileGridOf(bottom, L);
  const kept = prepared.filter((blank) => makers.includes(blank.record.vendor));
  const { fits } = listBlanks(kept, ctx, settings);

  const best = new Map<string, { verdict: (typeof fits)[number]; gap: BrdRockerGap; onBlank: BoardOnBlank }>();
  for (const verdict of fits) {
    const onBlank = boardOnBlank(verdict.prepared, ctx.board, verdict.placement);
    const gap = gapOn(onBlank, grid, L);
    const vendor = verdict.prepared.record.vendor;
    const known = best.get(vendor);
    if (!known || gap.largest < known.gap.largest) best.set(vendor, { verdict, gap, onBlank });
  }

  const stations = new Map(rockerStationPositions(mm(L)).map(({ key, station }) => [key, station]));
  return makers.map((vendor): BrdBlankSuggestion => {
    const winner = best.get(vendor);
    if (!winner) return { vendor, pick: null };
    const { verdict, gap, onBlank } = winner;
    const centre = onBlank.rockerAt(L / 2);
    const liftAt = (key: "noseTip" | "nose12" | "tail12" | "tailTip") => mm(onBlank.rockerAt(stations.get(key)!) - centre);
    return {
      vendor,
      pick: {
        record: verdict.prepared.record,
        placement: verdict.placement,
        gap,
        lift: { noseTip: liftAt("noseTip"), nose12: liftAt("nose12"), tail12: liftAt("tail12"), tailTip: liftAt("tailTip") },
        bends: bendsToward(verdict.prepared, ctx, verdict.placement, bottom),
      },
    };
  });
}
