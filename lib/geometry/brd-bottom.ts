/**
 * The closest bottom BOTTOM's own controls can make to the bottom of a board read from a `.brd` (quick 261113-gwr; the
 * founder, 2026-11-13, after seeing the editable board's pictures: "It looks promising, so we should then try to fit
 * bottom contours and rail shapes too").
 *
 * The amendment, the same day, once he had read how the first measurements came out: "On bottom, can you adjust our
 * starting and ending sliders to get a better fit for the Fryers and Scoop nose boards?" So the fit does not stop at each
 * cut's name and depth: it also moves each cut's Start, Deepest At and End along the board, and the one or two across marks
 * that shape the chosen cut, on BOTTOM's own slider steps.
 *
 * In a shaper's words, what it does:
 *  1. **Reads the bottom of each cross-section** the file holds: the bottom's height across the width, from the stringer out
 *     to nine-tenths of the way to the rail (`BRD_BOTTOM_WINDOW`), against the height at the stringer. The window stops short
 *     of the rail because from there out the file's rail turns up; this app's rails are fitted separately (the next task), and
 *     a soft rolled rail still reads as a belly until they are (the founder's own longboard file is the honest limit).
 *  2. **Calls a section flat** when its bottom never strays more than 1 mm from the stringer's height
 *     (`BRD_BOTTOM_FLAT_MM`). This app's own writer draws its sections to within 1 mm, AkuShaper's near-flat sections stray
 *     0.5 to 0.84 mm, the smallest real contour in the four sample files is 1.33 mm and the smallest depth the Depth slider
 *     makes is 1/16" (1.59 mm), so 1 mm never invents a concave out of a file's rounding and never loses a real one.
 *  3. **Seeds** the fit by trying every bottom the three menus and the Depth slider make at each name's starting numbers
 *     (41 choices a section, 68,921 bottoms — exact, from precomputed parts, dropping a bottom the moment it cannot win),
 *     over the file's own sections. A cut must earn a tenth of a millimetre to be in the seed (`BRD_BOTTOM_PREFER_MM`):
 *     among the bottoms that are as close, the one with the fewest cuts, then the least depth, wins, so a tie never
 *     invents a cut.
 *  4. **Moves the sliders.** Each cut's Start, Deepest At and End are tried over BOTTOM's own station grid (every 4", then
 *     every step near the best one), at the depth and one Depth step either side, then its Depth, then its across marks on
 *     their own 1/16" steps. A move is made only when it brings the fit at least 0.1 mm closer (`BRD_BOTTOM_MOVE_GAIN_MM`), so
 *     a slider the file cannot see stays at the name's own starting number. Every move is made the way a drag makes it
 *     (`storeCutStation` and `keepStationsInOrder`, the moved one winning), and sits on its slider's own step and inside its
 *     own range, imported from the code that owns them.
 *  5. **Compares every other name** of each section with its sliders free too (an Egg's flat nose against a Reverse Vee
 *     nose, a Panel Vee against a double concave), then chooses: a cut that is not in the seed must bring the fit 0.25 mm
 *     closer (`BRD_BOTTOM_EXTRA_CUT_MM`) or the seed's names stay. Measured: at 0.1 mm a round trip gained a spurious 1/16" nose cut;
 *     at 0.25 mm every round trip came back.
 *
 * **Between the file's sections.** An AkuShaper file holds only 3 to 5 usable sections, and a slider fitted to so few can fade
 * a cut in and out between two of them where nothing is measured (measured: a 7/16" nose concave fading from nothing to full
 * depth in 2 1/2" between two of the Fryer's sections). So stage 4 and 5 compare the bottom also at stations between
 * sections no more than 6" apart (`BRD_BOTTOM_BLEND_MAX_IN`): the blend of the two neighbouring sections at the same share of
 * the window. That is how a 3D program draws a board between its sections (the founder's finding of 2026-11-10, recorded in
 * `lib/export/brd.ts`), so it is the file as those programs draw it. The figures SHOWN are measured only on the file's own
 * sections, with this app's own slow `sectionsFoamOff`.
 *
 * Never channels, never wings, at any stage. A cut's Smoothness, Vee Lift and Closes to a point stay the name's own. Once the
 * sliders move, two names of one kind in one section are the same cut with different starting numbers (a Deep or a Shallow
 * Single Concave, a Panel or a Rolled Vee), so the name shown may be either; the kind, the depth and the sliders are what the
 * fit stands behind. Pure: no React, browser or database import (CLAUDE.md Rule 1); every length is millimetres, every
 * inch figure goes through `inchesToMm`.
 */
import type { P2 } from "./bezier-fit";
import { bottomStationSlider } from "./blank-reasons";
import {
  BOTTOM_CUT_NAMES,
  BOTTOM_DEPTH_RANGE_IN,
  BOTTOM_FLOOR,
  BOTTOM_MARK_RANGES_IN,
  BOTTOM_MARK_STEP_IN,
  BOTTOM_SECTIONS,
  DEFAULT_BOTTOM,
  TAIL_VEE_NAMES,
  cutFoamOffParts,
  cutKind,
  fadeAt,
  isTailVee,
  keepStationsInOrder,
  resolveBottom,
  resolveCut,
  sectionsFoamOff,
  startingCut,
  storeCutStation,
  type BoardBottom,
  type BottomBoard,
  type BottomCutKind,
  type BottomCutName,
  type BottomCutSpec,
  type BottomSectionKey,
} from "./bottom";
import { BRD_FIT_TIP_SKIP_MM, type BrdFit } from "./brd-fit";
import { designBottomBoard, designFinPlacement, designSideProfile, LIVE_DESIGN_RULES } from "./design";
import { buildOutline } from "./outline";
import { inchesToMm, mm, type Mm } from "./units";

/* ============ the constants (each one measured; see the header) ============ */

/** How far out the bottom is read: from the stringer to this share of the section's widest reach. */
export const BRD_BOTTOM_WINDOW = 0.9;
/** The window is read at this many equal steps (so 25 points a section). */
export const BRD_BOTTOM_ACROSS_STEPS = 24;
/** A section whose bottom never strays more than this from the stringer's height is flat. */
export const BRD_BOTTOM_FLAT_MM: Mm = mm(1);
/** A cut must bring the seed this much closer to be in it: among bottoms within this, the fewest cuts win. */
export const BRD_BOTTOM_PREFER_MM: Mm = mm(0.1);
/** A cut that is not in the seed must bring the final fit this much closer to be chosen. */
export const BRD_BOTTOM_EXTRA_CUT_MM: Mm = mm(0.25);
/** A slider moves only when that brings the fit at least this much closer. */
export const BRD_BOTTOM_MOVE_GAIN_MM: Mm = mm(0.1);
/** The fit also compares the bottom between two of the file's sections that stand further apart than this (inches). */
export const BRD_BOTTOM_BLEND_MAX_IN = 6;
/** A station slider is swept at this spacing first (inches), then at every slider step near the best. */
export const BRD_BOTTOM_STATION_COARSE_IN = 4;
/** An across mark is swept at this spacing first (inches), then at every 1/16" near the best. */
export const BRD_BOTTOM_MARK_COARSE_IN = 1 / 4;
/** A rising section whose height halfway across is under this share of its rise at the end reads as a belly, not a vee. */
export const BRD_BOTTOM_BELLY_SHARE = 1 / 3;

/** How many Depth steps there are: 1/16" to 1/2" (D-06). */
const DEPTH_STEPS = Math.round(BOTTOM_DEPTH_RANGE_IN.max / BOTTOM_MARK_STEP_IN);
/** One Depth step, millimetres. */
const DEPTH_STEP_MM: Mm = inchesToMm(BOTTOM_MARK_STEP_IN);
/** A move or a trial counts as closer only by more than this (rounding noise). */
const NOISE = 1e-9;
/** The neighbours (every other name of a section) refined in full: the three closest. */
const FULL_NEIGHBOURS = 3;
/** A section whose station is this much closer to a tip than the skipped inch is still kept: the file rounds a written 1". */
const TIP_ALLOWANCE_MM = 0.5;

/* ============ the file's bottom at each section ============ */

/** One cross-section as the reader hands it over: its station and the half section sampled (out, up), stringer bottom first. */
export interface BrdSectionLine {
  station: Mm;
  points: readonly P2[];
}

/** What a section's bottom measures, in the founder's kinds: a kind and a depth (0 for a flat). */
export interface BrdBottomReading {
  kind: BottomCutKind;
  depth: Mm;
}

/** One read section of the file: where it stands, how far out it reaches, its bottom's height across, and (once measured) ours. */
export interface BrdBottomSection {
  station: Mm;
  /** The section's widest reach, out from the stringer. */
  reach: Mm;
  /** The 25 distances out from the stringer the bottom is read at: 0 to `BRD_BOTTOM_WINDOW` x reach. */
  across: Mm[];
  /** The file's own bottom at each: its height less the height at the stringer, + up (toward the deck). */
  file: Mm[];
  /** Every |file| within `BRD_BOTTOM_FLAT_MM`: the fit then treats it as exactly flat. */
  flat: boolean;
  reads: BrdBottomReading;
  /** Our bottom at the same points, the same way (`[]` until `measureBrdBottom`). */
  ours: Mm[];
  /** The widest gap between the file's and ours in this section, and where across (0 until measured). */
  gap: { largest: Mm; across: Mm };
}

/** What the search scores against at one station: a read section's or a blend's. */
export interface BrdBottomTarget {
  station: Mm;
  across: Mm[];
  target: Mm[];
}

/**
 * What a section's bottom measures, in the founder's kinds (it describes the file, it never picks the fit): flat when every
 * value is within `BRD_BOTTOM_FLAT_MM`; a double when the bottom stands above the stringer and falls again outboard (the
 * troughs); a vee or a belly when it ends higher than the stringer (a belly when it is still under a third of its rise halfway
 * across: a straight vee reads 0.5, a rolled vee 0.37, a full belly 0.28); else a single concave.
 */
export function readBrdBottom(across: readonly number[], file: readonly number[]): BrdBottomReading {
  void across;
  const T = BRD_BOTTOM_FLAT_MM;
  if (file.length === 0 || file.every((v) => Math.abs(v) <= T)) return { kind: "flat", depth: mm(0) };
  const end = file[file.length - 1];
  const top = Math.max(...file);
  const low = Math.min(...file);
  if (top > T && top - end > T) return { kind: "double", depth: mm(top) };
  if (end > T) {
    const halfway = file[Math.floor((file.length - 1) / 2)];
    return { kind: halfway < BRD_BOTTOM_BELLY_SHARE * end ? "belly" : "vee", depth: mm(end) };
  }
  return { kind: "single", depth: mm(Math.max(0, -low)) };
}

/**
 * The file's bottom at each usable section, tail to nose. A section is dropped when it has fewer than two points, when it
 * stands within the skipped inch of a tip (the file rounds its tips there: `BRD_FIT_TIP_SKIP_MM`, less half a millimetre for
 * the file's own rounding of a station written at exactly 1"), or when it has no width. The bottom is the run from the
 * stringer to the widest point (each point further out than the last), read at 25 equal steps of the window.
 */
export function brdBottomSections(sections: readonly BrdSectionLine[], length: Mm): BrdBottomSection[] {
  const out: BrdBottomSection[] = [];
  for (const section of sections) {
    const points = section.points;
    if (points.length < 2) continue;
    const near = BRD_FIT_TIP_SKIP_MM - TIP_ALLOWANCE_MM;
    if (section.station < near || section.station > length - near) continue;
    let apex = 0;
    for (let k = 1; k < points.length; k++) if (points[k][0] > points[apex][0]) apex = k;
    const run: P2[] = [];
    for (let k = 0; k <= apex; k++) if (run.length === 0 || points[k][0] > run[run.length - 1][0]) run.push(points[k]);
    const reach = run[run.length - 1][0];
    if (run.length < 2 || !(reach > 0)) continue;
    const window = BRD_BOTTOM_WINDOW * reach;
    const first = run[0][1];
    const across: Mm[] = [];
    const file: Mm[] = [];
    for (let j = 0; j <= BRD_BOTTOM_ACROSS_STEPS; j++) {
      const x = (window * j) / BRD_BOTTOM_ACROSS_STEPS;
      across.push(mm(x));
      file.push(mm(heightAt(run, x) - first));
    }
    out.push({
      station: section.station,
      reach: mm(reach),
      across,
      file,
      flat: file.every((v) => Math.abs(v) <= BRD_BOTTOM_FLAT_MM),
      reads: readBrdBottom(across, file),
      ours: [],
      gap: { largest: mm(0), across: mm(0) },
    });
  }
  return out.sort((a, b) => a.station - b.station);
}

/** A run's height at `x`: straight lines between its points, its end value past either end. */
function heightAt(run: readonly P2[], x: number): number {
  for (let k = 0; k + 1 < run.length; k++) {
    const [x0, y0] = run[k];
    const [x1, y1] = run[k + 1];
    if (x >= x0 && x <= x1) return x1 === x0 ? y0 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return x <= run[0][0] ? run[0][1] : run[run.length - 1][1];
}

/** What the fit scores against at a read section: all zeros when it is flat, else the file's own bottom. */
const targetOf = (section: BrdBottomSection): Mm[] => (section.flat ? section.file.map(() => mm(0)) : section.file);

/**
 * The read sections' targets, and between each two neighbouring ones more than `BRD_BOTTOM_BLEND_MAX_IN` apart the blends
 * (`ceil(gap / 6") - 1` of them, evenly spaced): at the share `t` of the way, the reach is the two reaches blended, the 25
 * across stations are the same shares of the window, and each target is `(1 - t)` of the first section's plus `t` of the
 * second's (their flat-tested targets, so two flat sections blend flat). None before the first read section or after the last.
 * Why: a 3D program draws a board between two of its sections as their blend, so this is the file as those programs draw it,
 * and without it the sliders overfit an AkuShaper file's few sections.
 */
export function brdBottomBlends(sections: readonly BrdBottomSection[]): BrdBottomTarget[] {
  const out: BrdBottomTarget[] = [];
  for (let i = 0; i < sections.length; i++) {
    const a = sections[i];
    out.push({ station: a.station, across: a.across, target: targetOf(a) });
    if (i + 1 === sections.length) break;
    const b = sections[i + 1];
    const targetA = targetOf(a);
    const targetB = targetOf(b);
    const n = Math.ceil((b.station - a.station) / inchesToMm(BRD_BOTTOM_BLEND_MAX_IN));
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const reach = a.reach + t * (b.reach - a.reach);
      const window = BRD_BOTTOM_WINDOW * reach;
      out.push({
        station: mm(a.station + t * (b.station - a.station)),
        across: a.across.map((_, j) => mm((window * j) / BRD_BOTTOM_ACROSS_STEPS)),
        target: targetA.map((v, j) => mm((1 - t) * v + t * targetB[j])),
      });
    }
  }
  return out;
}

/* ============ the board the fit is measured on ============ */

/**
 * The board the bottom is measured against: the fit's own outline, rocker and foil, with no blank, and the fins on the picks a
 * new board starts from (`brdBoardFields` opens a board with exactly these), so it is the board that opens.
 */
export function brdFittedBottomBoard(fit: Pick<BrdFit, "outline" | "rocker" | "foil">): BottomBoard {
  const profile = designSideProfile({ outline: fit.outline, rocker: fit.rocker, foil: fit.foil, blank: null }, LIVE_DESIGN_RULES);
  return designBottomBoard(fit.outline, buildOutline(fit.outline), profile, designFinPlacement({ outline: fit.outline }));
}

/** A name and a number of Depth steps, per section. */
export type BrdBottomPicks = Record<BottomSectionKey, { name: BottomCutName; steps: number }>;

type Specs = Record<BottomSectionKey, BottomCutSpec>;

/** One pick as a stored cut: the name's starting numbers (a center single built for the picked tail, D-42) at that depth. */
function specOfPick(key: BottomSectionKey, pick: { name: BottomCutName; steps: number }, board: BottomBoard, tail: BottomCutName): BottomCutSpec {
  const spec = startingCut(key, pick.name, board, key === "center" ? tail : undefined);
  return cutKind(pick.name) === "flat" ? spec : { ...spec, depth: inchesToMm(pick.steps * BOTTOM_MARK_STEP_IN) };
}

/** The picks as a bottom: the default bottom (no channels, Narrowest wings) with the three cuts replaced. */
export function brdBottomFromPicks(picks: BrdBottomPicks, board: BottomBoard): BoardBottom {
  return bottomOfSpecs({
    nose: specOfPick("nose", picks.nose, board, picks.tail.name),
    center: specOfPick("center", picks.center, board, picks.tail.name),
    tail: specOfPick("tail", picks.tail, board, picks.tail.name),
  });
}

function bottomOfSpecs(specs: Specs): BoardBottom {
  return { ...structuredClone(DEFAULT_BOTTOM), nose: specs.nose, center: specs.center, tail: specs.tail };
}

/** The board with its along-the-board readers remembered per station: the search only ever asks at the same few stations. */
function rememberBoard(board: BottomBoard): BottomBoard {
  const remember = <R>(read: (s: Mm) => R): ((s: Mm) => R) => {
    const seen = new Map<number, R>();
    return (s) => {
      let value = seen.get(s);
      if (value === undefined) {
        value = read(s);
        seen.set(s, value);
      }
      return value;
    };
  };
  return {
    ...board,
    railAt: remember(board.railAt),
    curveAt: remember(board.curveAt),
    narrowestAt: remember(board.narrowestAt),
    foamAt: remember(board.foamAt),
    thicknessAt: remember(board.thicknessAt),
    notchInner: remember(board.notchInner),
  };
}

/* ============ stage 1: the seed ============ */

interface Choice {
  name: BottomCutName;
  steps: number;
  /** Its place in its menu. */
  menu: number;
  /** concave, lift per point (interleaved); a center single has a second set for a tail that is a vee. */
  parts: Float64Array[];
}

/**
 * Every bottom the three menus and the Depth slider make at the names' starting numbers, scored over `targets`, from parts
 * worked out once. A bottom is dropped the moment its largest gap exceeds the best value so far plus
 * `BRD_BOTTOM_PREFER_MM`; of the rest, those within `BRD_BOTTOM_PREFER_MM` of the best are ranked by the fewest cuts, then the
 * fewest Depth steps, then menu order (nose, center, tail), then value. Returns that bottom's picks.
 */
function seedSearch(board: BottomBoard, targets: readonly BrdBottomTarget[]): BrdBottomPicks {
  const P = targets.reduce((n, t) => n + t.across.length, 0);
  const section = new Int32Array(P);
  const first = new Uint8Array(P);
  const target = new Float64Array(P);
  const cap = new Float64Array(P);
  const rail = new Uint8Array(P);
  const station = new Float64Array(P);
  const across = new Float64Array(P);
  let q = 0;
  targets.forEach((t, i) => {
    const thick = Math.max(0, board.thicknessAt(t.station) - BOTTOM_FLOOR);
    const railOk = board.railAt(t.station) > 0 ? 1 : 0;
    t.across.forEach((y, j) => {
      section[q] = i;
      first[q] = j === 0 ? 1 : 0;
      target[q] = t.target[j];
      cap[q] = thick;
      rail[q] = railOk;
      station[q] = t.station;
      across[q] = y;
      q++;
    });
  });

  const options = {} as Record<BottomSectionKey, Choice[]>;
  for (const key of BOTTOM_SECTIONS) {
    options[key] = [];
    BOTTOM_CUT_NAMES[key].forEach((name, menu) => {
      const flat = cutKind(name) === "flat";
      for (let steps = flat ? 0 : 1; steps <= (flat ? 0 : DEPTH_STEPS); steps++) {
        // Only a center single reads the tail (D-42): it needs one set of parts for a tail that is not a vee and one for a vee.
        const tails: (BottomCutName | undefined)[] = key === "center" && cutKind(name) === "single" ? [undefined, TAIL_VEE_NAMES[0]] : [undefined];
        const parts = tails.map((tail) => {
          const out = new Float64Array(2 * P);
          if (flat) return out;
          const spec = { ...startingCut(key, name, board, tail), depth: inchesToMm(steps * BOTTOM_MARK_STEP_IN) };
          const cut = resolveCut(key, spec, board);
          for (let p = 0; p < P; p++) {
            const r = cutFoamOffParts(cut, board, "narrowest", mm(station[p]), mm(across[p]));
            out[2 * p] = r.concave;
            out[2 * p + 1] = r.lift;
          }
          return out;
        });
        options[key].push({ name, steps, menu, parts });
      }
    });
  }

  let best = Infinity;
  interface Kept {
    value: number;
    n: number;
    c: number;
    t: number;
    cuts: number;
    steps: number;
    order: number;
  }
  let kept: Kept[] = [];
  options.nose.forEach((on, n) =>
    options.center.forEach((oc, c) =>
      options.tail.forEach((ot, t) => {
        const a = on.parts[0];
        const b = oc.parts.length > 1 && isTailVee(ot.name) ? oc.parts[1] : oc.parts[0];
        const d = ot.parts[0];
        const limit = best + BRD_BOTTOM_PREFER_MM;
        let largest = 0;
        let sum = 0;
        let at0 = 0;
        for (let p = 0; p < P; p++) {
          let foam = 0;
          if (rail[p]) {
            const concave = a[2 * p] + b[2 * p] + d[2 * p];
            const lift = a[2 * p + 1] + b[2 * p + 1] + d[2 * p + 1];
            foam = Math.min(Math.max(0, concave), cap[p]) + Math.max(0, lift);
          }
          if (first[p]) at0 = foam;
          const gap = Math.abs(target[p] - (foam - at0));
          sum += gap;
          if (gap > largest) {
            largest = gap;
            if (largest > limit) return;
          }
        }
        const value = largest + sum / P;
        const cuts = [on, oc, ot].filter((o) => cutKind(o.name) !== "flat").length;
        kept.push({ value, n, c, t, cuts, steps: on.steps + oc.steps + ot.steps, order: on.menu * 100 + oc.menu * 10 + ot.menu });
        if (value < best) best = value;
        // The best only ever falls, so what is far above it now can never be chosen.
        if (kept.length > 4000) kept = kept.filter((k) => k.value <= best + BRD_BOTTOM_PREFER_MM);
      }),
    ),
  );
  const winner = kept
    .filter((k) => k.value <= best + BRD_BOTTOM_PREFER_MM)
    .sort((x, y) => x.cuts - y.cuts || x.steps - y.steps || x.order - y.order || x.value - y.value)[0];
  const pick = (o: Choice) => ({ name: o.name, steps: o.steps });
  return { nose: pick(options.nose[winner.n]), center: pick(options.center[winner.c]), tail: pick(options.tail[winner.t]) };
}

/* ============ stage 2: the sliders ============ */

/** What a trial or a refinement is built from: one cut as the search holds it. */
interface CutState {
  spec: BottomCutSpec;
  flat: boolean;
  /** A cut that closes to a point (the Teardrop's) is worked out point by point; every other is its fast form. */
  slow: boolean;
  /** The cut's work at each point at full fade and 1 mm depth (concave, lift interleaved); the cut itself for a slow one. */
  base: Float64Array;
  /** Depth x fade at each section (1 for a slow cut). */
  mult: Float64Array;
  /** What `base` depends on: when this is unchanged, `base` is too. */
  marks: string;
}

/** A buffer pair a trial is worked into, so no array is allocated per trial. */
interface Buffers {
  base: Float64Array;
  mult: Float64Array;
}

/**
 * The scorer over `targets` (the read sections and the blends), with the slider refinement. A cut's work at a point is exactly
 * its depth x its fade along the board at that station x its work at full fade and 1 mm depth (true of every cut but one that
 * closes to a point, whose half-width depends on the station), so a trial of a station or the depth costs one `fadeAt` per
 * section and a trial of an across mark one rebuilt base. Exported for the tests, which hold it to the slow
 * `sectionsFoamOff` to a billionth of a millimetre.
 */
export function brdBottomScorer(board0: BottomBoard, targets: readonly BrdBottomTarget[]) {
  const board = rememberBoard(board0);
  const L = board.length;
  const NS = targets.length;
  const J = NS > 0 ? targets[0].across.length : 0;
  const P = NS * J;
  const st = targets.map((t) => t.station);
  const ys = new Float64Array(P);
  const target = new Float64Array(P);
  targets.forEach((t, i) => {
    for (let j = 0; j < J; j++) {
      ys[i * J + j] = t.across[j];
      target[i * J + j] = t.target[j];
    }
  });
  const cap = st.map((s) => Math.max(0, board.thicknessAt(mm(s)) - BOTTOM_FLOOR));
  const rail = st.map((s) => board.railAt(mm(s)) > 0);
  // BOTTOM's own station slider grid, from the nose in half inches; `toMm` is the station from the tail a drag stores.
  const grid = bottomStationSlider(mm(0), L, "imperial");
  const nGrid = Math.round((grid.max - grid.min) / grid.step);
  const stationAt = (k: number): Mm => grid.toMm(grid.min + k * grid.step);
  const coarseStations = Math.max(1, Math.round(BRD_BOTTOM_STATION_COARSE_IN / grid.step));

  const ZERO_BASE = new Float64Array(2 * P);
  const ZERO_MULT = new Float64Array(NS);
  const newBuffers = (): Buffers => ({ base: new Float64Array(2 * P), mult: new Float64Array(NS) });
  const trialBuffers = newBuffers();
  const evalBuffers: Record<BottomSectionKey, Buffers> = { nose: newBuffers(), center: newBuffers(), tail: newBuffers() };

  /** A cut's work at every point: at its own depth (`unitDepth` false) or at full fade and 1 mm depth (true). */
  const fullParts = (key: BottomSectionKey, spec: BottomCutSpec, out: Float64Array, unitDepth: boolean) => {
    const cut = resolveCut(key, spec, board);
    const c = unitDepth
      ? { ...cut, start: mm(L), deepest: mm(0), end: mm(0), depth: mm(1), veeLift: mm(cut.depth > 0 ? cut.veeLift / cut.depth : 0) }
      : cut;
    for (let i = 0; i < NS; i++) {
      for (let j = 0; j < J; j++) {
        const r = cutFoamOffParts(c, board, "narrowest", mm(st[i]), mm(ys[i * J + j]));
        out[2 * (i * J + j)] = r.concave;
        out[2 * (i * J + j) + 1] = r.lift;
      }
    }
  };

  // The Spiral Vee's lift is its Vee Lift, not its depth, so the base at unit depth carries Vee Lift / depth.
  const marksKey = (s: BottomCutSpec) =>
    `${s.name}|${s.offRail}|${s.offStringer}|${s.troughAt}|${s.depth > 0 ? s.veeLift / s.depth : 0}|${s.smoothness}|${s.closesToPoint}`;

  /** A cut ready to score. Its base is `prev`'s when only its stations or depth changed, else worked into `into`. */
  const prepare = (key: BottomSectionKey, spec: BottomCutSpec, prev: CutState | null, into: Buffers): CutState => {
    const flat = cutKind(spec.name) === "flat" || spec.depth <= 0;
    if (flat) return { spec, flat, slow: false, base: ZERO_BASE, mult: ZERO_MULT, marks: "" };
    const slow = spec.closesToPoint;
    const marks = marksKey(spec);
    let base = into.base;
    if (prev && !prev.flat && !prev.slow && !slow && prev.marks === marks) base = prev.base;
    else fullParts(key, spec, base, !slow);
    const mult = into.mult;
    if (slow) mult.fill(1);
    else {
      const c = resolveCut(key, spec, board);
      for (let i = 0; i < NS; i++) mult[i] = c.depth * fadeAt(c.start, c.deepest, c.end, st[i], L);
    }
    return { spec, flat, slow, base, mult, marks };
  };
  /** The state a trial's cut keeps once it is chosen: its own copies of whatever lived in a shared buffer. */
  const keep = (state: CutState, shared: Buffers): CutState =>
    state.flat ? state : { ...state, base: state.base === shared.base ? state.base.slice() : state.base, mult: state.mult.slice() };

  /** largest + typical gap against the targets, or Infinity once the largest gap passes `limit`. */
  const value = (s: Record<BottomSectionKey, CutState>, limit = Infinity): number => {
    const a = s.nose;
    const b = s.center;
    const c = s.tail;
    let largest = 0;
    let sum = 0;
    for (let i = 0; i < NS; i++) {
      const ma = a.flat ? 0 : a.mult[i];
      const mb = b.flat ? 0 : b.mult[i];
      const mc = c.flat ? 0 : c.mult[i];
      let at0 = 0;
      for (let j = 0; j < J; j++) {
        const q = 2 * (i * J + j);
        let foam = 0;
        if (rail[i]) {
          const concave = ma * a.base[q] + mb * b.base[q] + mc * c.base[q];
          const lift = ma * a.base[q + 1] + mb * b.base[q + 1] + mc * c.base[q + 1];
          foam = Math.min(Math.max(0, concave), cap[i]) + Math.max(0, lift);
        }
        if (j === 0) at0 = foam;
        const gap = Math.abs(target[i * J + j] - (foam - at0));
        sum += gap;
        if (gap > largest) {
          largest = gap;
          if (largest > limit) return Infinity;
        }
      }
    }
    return largest + sum / P;
  };

  /** The value of three stored cuts, none refined. */
  const valueOfSpecs = (specs: Specs): number =>
    value({
      nose: prepare("nose", specs.nose, null, evalBuffers.nose),
      center: prepare("center", specs.center, null, evalBuffers.center),
      tail: prepare("tail", specs.tail, null, evalBuffers.tail),
    });

  /**
   * Moves the sliders of the cuts in `keys` (tail, center, nose by default), up to `rounds` rounds, until nothing moves. Per
   * cut: Start, then Deepest At, then End over BOTTOM's station grid (every 4", then every step within 3 1/2" of the best), each
   * candidate made as a drag makes it and tried at the cut's depth and one Depth step either side; then Depth, every step; then the
   * across marks that shape that cut. A move is kept only when it brings the whole fit at least `BRD_BOTTOM_MOVE_GAIN_MM` closer.
   */
  const refine = (specs: Specs, keys: readonly BottomSectionKey[] = ["tail", "center", "nose"], rounds = 3): { specs: Specs; value: number } => {
    const s: Record<BottomSectionKey, CutState> = {
      nose: keep(prepare("nose", specs.nose, null, newBuffers()), trialBuffers),
      center: keep(prepare("center", specs.center, null, newBuffers()), trialBuffers),
      tail: keep(prepare("tail", specs.tail, null, newBuffers()), trialBuffers),
    };
    let current = value(s);
    const trial = (key: BottomSectionKey, spec: BottomCutSpec): number => {
      const saved = s[key];
      s[key] = prepare(key, spec, saved, trialBuffers);
      const v = value(s, current + 1);
      s[key] = saved;
      return v;
    };
    /** Makes a chosen candidate the cut for good. */
    const adopt = (key: BottomSectionKey, spec: BottomCutSpec, v: number) => {
      s[key] = keep(prepare(key, spec, s[key], newBuffers()), trialBuffers);
      current = v;
    };
    for (let round = 0; round < rounds; round++) {
      let moved = false;
      for (const key of keys) {
        const kind = cutKind(s[key].spec.name);
        if (kind === "flat") continue;

        for (const field of ["start", "deepest", "end"] as const) {
          const at = (k: number) => keepStationsInOrder(key, { ...s[key].spec, ...storeCutStation(key, field, stationAt(k), board) }, field, board, "narrowest");
          const steps0 = Math.round(s[key].spec.depth / DEPTH_STEP_MM);
          const depths = [steps0 - 1, steps0, steps0 + 1].filter((d) => d >= 1 && d <= DEPTH_STEPS);
          let bestK = -1;
          let bestValue = current;
          let bestSpec: BottomCutSpec | null = null;
          const tryStation = (k: number) => {
            const candidate = at(k);
            for (const d of depths) {
              const spec = d === steps0 ? candidate : { ...candidate, depth: inchesToMm(d * BOTTOM_MARK_STEP_IN) };
              const v = trial(key, spec);
              if (v < bestValue - NOISE) {
                bestValue = v;
                bestSpec = spec;
                bestK = k;
              }
            }
          };
          for (let k = 0; k <= nGrid; k += coarseStations) tryStation(k);
          if (bestK >= 0) {
            const k0 = bestK;
            for (let k = Math.max(0, k0 - coarseStations + 1); k <= Math.min(nGrid, k0 + coarseStations - 1); k++) if (k !== k0) tryStation(k);
          }
          if (bestSpec && bestValue < current - BRD_BOTTOM_MOVE_GAIN_MM) {
            adopt(key, bestSpec, bestValue);
            moved = true;
          }
        }

        {
          let bestValue = current;
          let bestSpec: BottomCutSpec | null = null;
          for (let d = 1; d <= DEPTH_STEPS; d++) {
            const spec = { ...s[key].spec, depth: inchesToMm(d * BOTTOM_MARK_STEP_IN) };
            const v = trial(key, spec);
            if (v < bestValue - NOISE) {
              bestValue = v;
              bestSpec = spec;
            }
          }
          if (bestSpec && bestValue < current - BRD_BOTTOM_MOVE_GAIN_MM) {
            adopt(key, bestSpec, bestValue);
            moved = true;
          }
        }

        const marks: ("offRail" | "offStringer" | "troughAt")[] =
          kind === "double" ? ["troughAt", "offRail"] : kind === "single" ? ["offRail"] : s[key].spec.name === "Tri-Plane Hull Center" ? ["offStringer"] : [];
        for (const field of marks) {
          const { min, max } = BOTTOM_MARK_RANGES_IN[field];
          const make = (x: number): BottomCutSpec => {
            const spec = { ...s[key].spec, [field]: inchesToMm(x) };
            return kind === "double" ? keepStationsInOrder(key, spec, "deepest", board, "narrowest") : spec;
          };
          let bestX = -1;
          let bestValue = current;
          let bestSpec: BottomCutSpec | null = null;
          const tryMark = (x: number) => {
            const spec = make(x);
            const v = trial(key, spec);
            if (v < bestValue - NOISE) {
              bestValue = v;
              bestSpec = spec;
              bestX = x;
            }
          };
          for (let k = 0; min + k * BRD_BOTTOM_MARK_COARSE_IN <= max + NOISE; k++) tryMark(min + k * BRD_BOTTOM_MARK_COARSE_IN);
          if (bestX >= 0) {
            const reach = Math.round(BRD_BOTTOM_MARK_COARSE_IN / BOTTOM_MARK_STEP_IN) - 1;
            for (let d = -reach; d <= reach; d++) {
              const x = bestX + d * BOTTOM_MARK_STEP_IN;
              if (d !== 0 && x >= min - NOISE && x <= max + NOISE) tryMark(x);
            }
          }
          if (bestSpec && bestValue < current - BRD_BOTTOM_MOVE_GAIN_MM) {
            adopt(key, bestSpec, bestValue);
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
    return { specs: { nose: s.nose.spec, center: s.center.spec, tail: s.tail.spec }, value: current };
  };

  return { refine, valueOfSpecs };
}

/* ============ the whole fit ============ */

/** How many of the three sections hold a cut. */
const cutsIn = (specs: Specs): number => BOTTOM_SECTIONS.filter((key) => cutKind(specs[key].name) !== "flat").length;

/** The bottom the fit chose, measured on the file's own sections (see `measureBrdBottom`). */
export interface BrdBottomFit {
  bottom: BoardBottom;
  sections: BrdBottomSection[];
  closeness: { largest: Mm; typical: Mm; station: Mm; across: Mm };
}

/**
 * Fits BOTTOM's three cuts to the sections of a file on `board0` (the board that opens: `brdFittedBottomBoard`): the seed
 * (stage 1, over the file's own sections), the refined seed, then every other name of each section put in its place with its
 * sliders free, the closest three refined in full, and the choice (the seed's names unless another cut brings the fit
 * `BRD_BOTTOM_EXTRA_CUT_MM` closer; of those within that, the fewest cuts). Null when the file has no section the fit can use.
 */
export function fitBottomToBrd(sections: readonly BrdSectionLine[], board0: BottomBoard): BrdBottomFit | null {
  const read = brdBottomSections(sections, board0.length);
  if (read.length === 0) return null;
  const board = rememberBoard(board0);
  const seedPicks = seedSearch(
    board,
    read.map((r): BrdBottomTarget => ({ station: r.station, across: r.across, target: targetOf(r) })),
  );
  const seed: Specs = {
    nose: specOfPick("nose", seedPicks.nose, board, seedPicks.tail.name),
    center: specOfPick("center", seedPicks.center, board, seedPicks.tail.name),
    tail: specOfPick("tail", seedPicks.tail, board, seedPicks.tail.name),
  };

  const scorer = brdBottomScorer(board, brdBottomBlends(read));
  const best = scorer.refine(seed);

  // Every other name of every section, at its starting numbers and best depth with the others as refined, then refined.
  const neighbours: { specs: Specs; value: number }[] = [];
  for (const key of BOTTOM_SECTIONS) {
    for (const name of BOTTOM_CUT_NAMES[key]) {
      if (name === best.specs[key].name) continue;
      const flat = cutKind(name) === "flat";
      let pick: Specs | null = null;
      let pickValue = Infinity;
      for (let steps = flat ? 0 : 1; steps <= (flat ? 0 : DEPTH_STEPS); steps++) {
        const specs = { ...best.specs, [key]: specOfPick(key, { name, steps }, board, best.specs.tail.name) };
        const v = scorer.valueOfSpecs(specs);
        if (v < pickValue) {
          pickValue = v;
          pick = specs;
        }
      }
      neighbours.push(flat ? scorer.refine(pick!) : scorer.refine(pick!, [key], 2));
    }
  }
  neighbours.sort((a, b) => a.value - b.value);
  const pool = [best, ...neighbours.slice(0, FULL_NEIGHBOURS).map((n) => scorer.refine(n.specs)), ...neighbours.slice(FULL_NEIGHBOURS)];
  const closest = Math.min(...pool.map((p) => p.value));
  const near = pool.filter((p) => p.value <= closest + BRD_BOTTOM_EXTRA_CUT_MM);
  const fewest = Math.min(...near.map((p) => cutsIn(p.specs)));
  const chosen =
    near.includes(best) && cutsIn(best.specs) === fewest ? best : near.filter((p) => cutsIn(p.specs) === fewest).sort((a, b) => a.value - b.value)[0];

  return measureBrdBottom(bottomOfSpecs(chosen.specs), read, board0);
}

/* ============ what is shown ============ */

/**
 * `bottom` measured against the file's own sections, the plain slow way (`sectionsFoamOff`, so what is shown is the app's own
 * number): per section our height across the same 25 points and the widest gap against the file's OWN bottom (not the
 * flat-tested target, so an egg's 0.84 mm drawing wobble is reported); overall the widest gap, the mean gap over every point and
 * where the widest is.
 */
export function measureBrdBottom(bottom: BoardBottom, sections: readonly BrdBottomSection[], board: BottomBoard): BrdBottomFit {
  const resolved = resolveBottom(bottom, board);
  let largest = 0;
  let sum = 0;
  let count = 0;
  let where = { station: mm(0), across: mm(0) };
  const measured = sections.map((section): BrdBottomSection => {
    const at0 = sectionsFoamOff(resolved, board, section.station, mm(0));
    const ours = section.across.map((y) => mm(sectionsFoamOff(resolved, board, section.station, y) - at0));
    let widest = 0;
    let widestAt = 0;
    ours.forEach((v, j) => {
      const gap = Math.abs(section.file[j] - v);
      sum += gap;
      count++;
      if (gap > widest) {
        widest = gap;
        widestAt = section.across[j];
      }
    });
    if (widest > largest) {
      largest = widest;
      where = { station: section.station, across: mm(widestAt) };
    }
    return { ...section, ours, gap: { largest: mm(widest), across: mm(widestAt) } };
  });
  return {
    bottom,
    sections: measured,
    closeness: { largest: mm(largest), typical: mm(count > 0 ? sum / count : 0), station: where.station, across: where.across },
  };
}

/**
 * How much the bottom's concaves lift the stringer at a station: the foam it takes off at the stringer itself, which is
 * non-zero only under a concave (a vee, a belly and a flat never touch the stringer). The finished stringer is the planed one
 * plus this, so a board that is to finish on the file's stringer is planed that much lower.
 */
export function brdStringerLift(bottom: BoardBottom, board: BottomBoard): (station: Mm) => Mm {
  const resolved = resolveBottom(bottom, board);
  return (station) => sectionsFoamOff(resolved, board, station, mm(0));
}
