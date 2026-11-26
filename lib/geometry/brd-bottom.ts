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
 *     their own 1/16" steps (a belly's Off Stringer, its flat panel, moves like the Tri-Plane's: every 1/4" over 0" to 9", then every
 *     1/16" within reach of the best; quick 261116-jqz, D-04). A move is made only when it brings the fit at least 0.1 mm closer (`BRD_BOTTOM_MOVE_GAIN_MM`), so
 *     a slider the file cannot see stays at the name's own starting number. Every move is made the way a drag makes it
 *     (`storeCutStation` and `keepStationsInOrder`, the moved one winning), and sits on its slider's own step and inside its
 *     own range, imported from the code that owns them. (This is the grid search: stage 6 then leaves the steps.)
 *  5. **Compares every other name** of each section with its sliders free too (an Egg's flat nose against a Reverse Vee
 *     nose, a Panel Vee against a double concave), then chooses: a cut that is not in the seed must bring the fit 0.25 mm
 *     closer (`BRD_BOTTOM_EXTRA_CUT_MM`) or the seed's names stay. Measured: at 0.1 mm a round trip gained a spurious 1/16" nose cut;
 *     at 0.25 mm every round trip came back.
 *     The Tri-Plane Hull Center is reached for last (`chooseBrdBottom`, the founder, 2026-11-16): it is kept only when it
 *     scores `BRD_BOTTOM_TRI_PLANE_MM` (1 mm) closer than the closest bottom without one, and in a tie or near tie any
 *     other name wins. Measured on the founder's twelve files: 92Log and Scoop-Noserider come in with a Continuous Belly
 *     instead (the Tri-Plane led by 0.55 and 0.09 mm), and so does quadtesting (0.86 mm; its vee tail is deeper than the
 *     Panel Vee reaches, so either centre cut stands in for it). A 7/16" or deeper Tri-Plane the app wrote itself still
 *     comes back as one, 1.5 to 2.85 mm clear.
 *     **The Spiral Vee on its own** (quick 261124-x9h, the founder, 2026-11-24, spike 004: "I'd also like to tackle the spiral
 *     vee issue (double concave inside a vee tail)"). The names are swapped one section at a time, so when the closest
 *     bottoms hold a centre double concave over a tail Spiral Vee, the Spiral Vee with nothing in the centre (the cut that
 *     draws a double running out through a vee tail) is two swaps away and was never tried. So beside each of the four closest
 *     (the refined seed and the three refined in full) that holds that pair, two more bottoms are offered, both with their
 *     sliders free: that bottom with the centre flat, and the Spiral Vee afresh from its own starting numbers at its closest
 *     depth, under a flat centre (`spiralVeeAlone`). The choice above then runs unchanged. Measured through the real import on
 *     the founder's twelve files: SAtwin opens as a Spiral Vee alone, 0.39 mm off at the widest where it was 1.61 mm (as an
 *     Early Double Concave over a Panel Vee that stopped short of the tail); the other eleven open exactly as before; about
 *     0.1 s more on SAtwin, nothing on the others.
 *  6. **Polishes the chosen bottom** (quick 261116-tqs, the founder, 2026-11-16: "let the fit land anywhere", after asking for the
 *     worst miss under half a millimetre). Stages 4 and 5 stay on BOTTOM's own steps (that grid chooses the names, and its rules
 *     stand exactly as written above). Once the names and the order of rails and bottom are settled, `polishBrdBottom` moves
 *     each fitted cut's Start, Deepest At, End, Depth and across marks (a single's Off Rail, a belly's and the Tri-Plane's Off
 *     Stringer, a double's Trough At, Off Rail and Off Stringer) to whatever value brings the same score closest, between steps and
 *     with no 0.1 mm bar, inside every control's own range. The numbers are stored as found; BOTTOM shows them rounded to its own
 *     steps. Smoothness, Vee Lift and Closes to a point stay the name's own. It runs once, on the winning order's bottom only:
 *     polished inside every one of a file's up to three bottom fits it changed which order won on the founder's longboard (its
 *     bottom went from 2.39 to 3.65 mm). Measured through the real import on the founder's twelve files, the widest miss fell
 *     from 1.04 to 0.49 mm (the Fryer), 0.95 to 0.55 (the Round Tail), 0.83 to 0.54 (the Groveler), 0.66 to 0.40 (SAtri) and
 *     2.14 to 1.58 mm (92Log), and no file got worse. What stays out of reach is the model, not the search: a belly across, a
 *     29 mm vee past Depth's half inch, the wobble in a file's flat sections. (A double inside a vee tail was once on this
 *     list; it was the name choice, not the model: the Spiral Vee as it is draws SAtwin's tail to 0.39 mm, spike 004, and
 *     stage 5 now offers it.)
 *  7. **Tries the nose once more with a Rail Roll** (quick 261125-mf8, the founder, 2026-11-25, after spikes 005 and 006:
 *     "Rail Roll sounds good ... Looks like both the bottom and rails get a better fit with it, so maybe we proceed"). His three
 *     longboard and noserider files turn the bottom up outside the nose concave, which no name could draw. So once the polish of
 *     stage 6 is done and its guard has run, a file whose widest bottom miss is still over 1 mm (`BRD_BOTTOM_NOSE_RETRY_MM`) has
 *     its nose replaced by a Blended Nose Concave at its starting numbers, 1/16" deep, with a 1/8" Rail Roll
 *     (`BRD_BOTTOM_NOSE_RETRY_ROLL_IN`), and the three cuts are polished once more with the roll free as one more slider
 *     (first step 1/16", `BRD_BOTTOM_POLISH_ROLL_IN`, held to the slider's 0 to 1/2"). The answer is kept when its shown figure
 *     (the widest plus the typical miss, measured on the file's own sections) is lower: by `BRD_BOTTOM_EXTRA_CUT_MM` (0.25 mm)
 *     when the retry changed the nose's name, by more than rounding noise when the nose already was a Blended Nose Concave
 *     (spike 005's own bar, which the founder's approved table was measured with). Under the 1 mm gate a file opens exactly as
 *     before: without it, the roll went onto files that already fit. The roll is never in the seed, the grid search, the name
 *     choice, the Tri-Plane rule, the Spiral Vee offer, the rails-first try or the order choice: offered to the grid, it flipped
 *     the founder's testLB to rails first (spike 005, step 5). Measured through the real import on his twelve files: 92Log
 *     1.58 / 0.44 to 1.28 / 0.38 mm (its Flat Entry now a Blended Nose Concave with an 11/64" roll), Scoop-Noserider 1.18 / 0.36
 *     to 1.01 / 0.37 (19/64"), testLB 2.08 / 0.26 to 1.45 / 0.21 (its Teardrop now a Blended Nose Concave, 7/64"); the other nine
 *     identical; those three take about 0.5 to 1.3 s longer to open. The limits, measured on the app's own boards: a small roll
 *     (1/8" or 3/16" on the Mid-length) opens with a centre belly standing in for it, under the gate; a board that does come
 *     back with its roll usually keeps a leftover 1/16" centre cut, the belly or single the name choice read the roll as; a
 *     Longboard, read rails first, hides most of its roll in the rail; a Slight Single Concave Entry with a roll came back as a
 *     Rolled Belly Entry; and the one retry, from 1/16", can lose what a deeper fitted nose had.
 *
 * **Between the file's sections.** An AkuShaper file holds only 3 to 5 usable sections, and a slider fitted to so few can fade
 * a cut in and out between two of them where nothing is measured (measured: a 7/16" nose concave fading from nothing to full
 * depth in 2 1/2" between two of the Fryer's sections). So stage 4 and 5 compare the bottom also at stations between
 * sections no more than 6" apart (`BRD_BOTTOM_BLEND_MAX_IN`): the blend of the two neighbouring sections at the same share of
 * the window. That is how a 3D program draws a board between its sections (the founder's finding of 2026-11-10, recorded in
 * `lib/export/brd.ts`), so it is the file as those programs draw it. The figures SHOWN are measured only on the file's own
 * sections, with this app's own slow `sectionsFoamOff`.
 *
 * **Where our rail begins** (quick 261113-kvo). The window above stops at nine-tenths of the way out, but a soft rolled rail begins
 * well inside that and then reads as a belly (the founder's own longboard, 5.25 mm off). Once the rails are fitted
 * (`brd-rails.ts`), a section's window may stop where our finished rail begins instead, when that is more than 1/4" inside the
 * nine-tenths line, and the bottom is read again on those widths: `brdBottomSections`, `brdBottomBlends` and `fitBottomToBrd`
 * take an optional window per section and read exactly today's when none is given.
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
  FLAT_CUT_NAMES,
  TAIL_VEE_NAMES,
  cutFoamOffParts,
  cutKind,
  fadeAt,
  isTailVee,
  keepStationsInOrder,
  railRollAcross,
  railRollAlong,
  resolveBottom,
  resolveCut,
  sectionsFoamOff,
  startingCut,
  storeCutStation,
  takesRailRoll,
  tidyRailRoll,
  type BoardBottom,
  type BottomBoard,
  type BottomCutKind,
  type BottomCutName,
  type BottomCutSpec,
  type BottomSectionKey,
} from "./bottom";
import { BRD_FIT_TIP_SKIP_MM, type BrdFit } from "./brd-fit";
import { designBottomBoard, designFinPlacement, designSideProfile, LIVE_DESIGN_RULES } from "./design";
import type { FinPlacementSpec } from "./fins";
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
/**
 * The Tri-Plane Hull Center is the rarest bottom (the founder, 2026-11-16: "tri-hull should be the rarest bottom type"). It is
 * kept only when it scores at least this much closer than the closest bottom without one; in a tie, or a near tie, any other
 * name wins. Measured on the founder's twelve files: the Tri-Plane was this much closer than the closest bottom without one,
 * on the fit's own score, on 92Log 0.55 mm, Scoop-Noserider 0.09 mm and quadtesting 0.86 mm, and never closer on the other nine.
 * At 0.5 mm 92Log and quadtesting keep it, at 0.75 mm quadtesting does, and from 1 mm all three come in as a belly.
 */
export const BRD_BOTTOM_TRI_PLANE_MM: Mm = mm(1);
/** A slider moves only when that brings the fit at least this much closer. */
export const BRD_BOTTOM_MOVE_GAIN_MM: Mm = mm(0.1);
/** The fit also compares the bottom between two of the file's sections that stand further apart than this (inches). */
export const BRD_BOTTOM_BLEND_MAX_IN = 6;
/** A station slider is swept at this spacing first (inches), then at every slider step near the best. */
export const BRD_BOTTOM_STATION_COARSE_IN = 4;
/**
 * The polish's first steps (quick 261116-tqs; each halves until it is `BRD_BOTTOM_POLISH_STOP` of itself): 1" for a station
 * (twice BOTTOM's own 1/2" step), 1/32" for a depth (half its old 1/16" step) and 1/4" for an across mark (four 1/16" steps).
 * Measured on the founder's twelve files: smaller first steps stalled in the first valley, larger ones cost time for no gain.
 */
export const BRD_BOTTOM_POLISH_STATION_IN = 1;
export const BRD_BOTTOM_POLISH_DEPTH_IN = 1 / 32;
export const BRD_BOTTOM_POLISH_MARK_IN = 1 / 4;
/** The polish stops halving a step once it is this share of its first step (a thousandth: well under 0.01 mm on a station). */
export const BRD_BOTTOM_POLISH_STOP = 1 / 1000;
/** Nelder-Mead restarts after the coordinate search (measured: two found what the Round Tail and the Fryer needed). */
export const BRD_BOTTOM_POLISH_RESTARTS = 2;
/** An across mark is swept at this spacing first (inches), then at every 1/16" near the best. */
export const BRD_BOTTOM_MARK_COARSE_IN = 1 / 4;
/** A rising section whose height halfway across is under this share of its rise at the end reads as a belly, not a vee. */
export const BRD_BOTTOM_BELLY_SHARE = 1 / 3;
/**
 * The nose is tried once more with a Rail Roll (quick 261125-mf8, stage 7 of the header) only on a file whose widest bottom miss
 * is still over this after the polish. Measured: without it the roll went onto files that already fit (spike 005); with it the
 * eight of the founder's twelve files already under it open exactly as before, in the same time.
 */
export const BRD_BOTTOM_NOSE_RETRY_MM: Mm = mm(1);
/** The Rail Roll the nose retry starts from (inches): spike 005's measured start. */
export const BRD_BOTTOM_NOSE_RETRY_ROLL_IN = 1 / 8;
/** The Rail Roll's first polish step (inches), a Depth's own 1/16" grid step: spike 005's measured step. */
export const BRD_BOTTOM_POLISH_ROLL_IN = 1 / 16;

/**
 * How many Depth steps there are: 1/16" to 1/2" (D-06). The fit's own depth grid stays 1/16" even though BOTTOM's Depth slider
 * steps 1/64" since quick 261116-tqs (D-09), so the names are chosen exactly as before; the polish then lands anywhere.
 */
const DEPTH_STEPS = Math.round(BOTTOM_DEPTH_RANGE_IN.max / BOTTOM_MARK_STEP_IN);
/** One Depth step, millimetres. */
const DEPTH_STEP_MM: Mm = inchesToMm(BOTTOM_MARK_STEP_IN);
/** A move or a trial counts as closer only by more than this (rounding noise). */
const NOISE = 1e-9;
/** The polish's rounds of coordinate and pair steps, at most. */
const POLISH_ROUNDS = 30;
/** Repeats of one coordinate step in one direction while it keeps helping, at most. */
const POLISH_RUN = 20;
/** Nelder-Mead steps a restart, per slider, at most. */
const POLISH_SIMPLEX_ITERATIONS = 400;
/** A Nelder-Mead restart is done once its best and worst corners are this close (millimetres of score). */
const POLISH_SIMPLEX_SPREAD = 1e-7;
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
  /** How far out the bottom is read here: `BRD_BOTTOM_WINDOW` x reach, or less where our fitted rail begins (quick 261113-kvo). */
  window: Mm;
  /** The 25 distances out from the stringer the bottom is read at: 0 to `window`. */
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
 * stringer to the widest point (each point further out than the last), read at 25 equal steps of the window. `windows[i]`, where
 * given, is how far out `sections[i]` is read instead of `BRD_BOTTOM_WINDOW` x its reach (quick 261113-kvo); it is never wider.
 */
export function brdBottomSections(
  sections: readonly BrdSectionLine[],
  length: Mm,
  windows?: readonly (Mm | undefined)[],
): BrdBottomSection[] {
  const out: BrdBottomSection[] = [];
  for (const [index, section] of sections.entries()) {
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
    const usual = BRD_BOTTOM_WINDOW * reach;
    const asked = windows?.[index];
    const window = asked !== undefined && asked > 0 && asked < usual ? asked : usual;
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
      window: mm(window),
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
 * (`ceil(gap / 6") - 1` of them, evenly spaced): at the share `t` of the way, the reach is the two reaches blended (and the window, where
 * a section's was narrowed, likewise), the 25
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
      // Today's width (nine-tenths of the blended reach) unless a section was narrowed, then the two widths blended the same way.
      const usual = a.window === BRD_BOTTOM_WINDOW * a.reach && b.window === BRD_BOTTOM_WINDOW * b.reach;
      const window = usual ? BRD_BOTTOM_WINDOW * reach : a.window + t * (b.window - a.window);
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
 * The board the bottom is measured against: the fit's own outline, rocker and foil, with no blank, and the fins the board opens
 * with (`brdBoardFields` opens a board with exactly these), so it is the board that opens. `fins` are the fins fitted to a file
 * that carries them (quick 261113-qyz); a tail cut's Deepest At (and a channel's Start and Deepest At) is stored from the front
 * fins, so the bottom must be fitted and measured with the fins in place that open with it. Left out, it is a new board's fins,
 * exactly as before.
 */
export function brdFittedBottomBoard(fit: Pick<BrdFit, "outline" | "rocker" | "foil">, fins?: FinPlacementSpec): BottomBoard {
  const profile = designSideProfile({ outline: fit.outline, rocker: fit.rocker, foil: fit.foil, blank: null }, LIVE_DESIGN_RULES);
  return designBottomBoard(fit.outline, buildOutline(fit.outline), profile, designFinPlacement({ outline: fit.outline, fins }));
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
  /**
   * A fast nose concave's Rail Roll (quick 261125-mf8): its share across the board at each point (`railRollAcross`; it depends
   * on the cut's marks only, so it is reused like `base`), and the roll x its share along the board at each section
   * (`railRollAlong`). Both null for a cut with no roll, or one that goes the slow way (which carries its roll in `base`).
   */
  rollAcross: Float64Array | null;
  rollMult: Float64Array | null;
}

/** The buffers a trial is worked into, so no array is allocated per trial. */
interface Buffers {
  base: Float64Array;
  mult: Float64Array;
  rollAcross: Float64Array;
  rollMult: Float64Array;
}

/**
 * The scorer over `targets` (the read sections and the blends), with the slider refinement. A cut's work at a point is exactly
 * its depth x its fade along the board at that station x its work at full fade and 1 mm depth (true of every cut but one that
 * closes to a point, whose half-width depends on the station), so a trial of a station or the depth costs one `fadeAt` per
 * section and a trial of an across mark one rebuilt base. A nose concave's Rail Roll (quick 261125-mf8) is one more such
 * product beside it: the roll x its share along the board at each section x its share across at each point, worked out by
 * the very two functions the slow maths multiplies (`railRollAlong`, `railRollAcross`). Exported for the tests, which hold it
 * to the slow `sectionsFoamOff` to a billionth of a millimetre.
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
  const newBuffers = (): Buffers => ({ base: new Float64Array(2 * P), mult: new Float64Array(NS), rollAcross: new Float64Array(P), rollMult: new Float64Array(NS) });
  const trialBuffers = newBuffers();
  const evalBuffers: Record<BottomSectionKey, Buffers> = { nose: newBuffers(), center: newBuffers(), tail: newBuffers() };

  /** A cut's work at every point: at its own depth (`unitDepth` false) or at full fade and 1 mm depth (true). */
  const fullParts = (key: BottomSectionKey, spec: BottomCutSpec, out: Float64Array, unitDepth: boolean) => {
    const cut = resolveCut(key, spec, board);
    // At unit depth the roll is left out: it is its own height, not a share of the depth, and the fast form adds it apart.
    const c = unitDepth
      ? { ...cut, start: mm(L), deepest: mm(0), end: mm(0), depth: mm(1), veeLift: mm(cut.depth > 0 ? cut.veeLift / cut.depth : 0), railRoll: mm(0) }
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
    if (flat) return { spec, flat, slow: false, base: ZERO_BASE, mult: ZERO_MULT, marks: "", rollAcross: null, rollMult: null };
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
      if (c.railRoll > 0) {
        let rollAcross = into.rollAcross;
        if (prev && prev.rollAcross && !prev.flat && !prev.slow && prev.marks === marks) rollAcross = prev.rollAcross;
        else {
          for (let i = 0; i < NS; i++) {
            for (let j = 0; j < J; j++) rollAcross[i * J + j] = railRollAcross(c, board, "narrowest", mm(st[i]), mm(ys[i * J + j]));
          }
        }
        const rollMult = into.rollMult;
        for (let i = 0; i < NS; i++) rollMult[i] = c.railRoll * railRollAlong(c, mm(st[i]));
        return { spec, flat, slow, base, mult, marks, rollAcross, rollMult };
      }
    }
    return { spec, flat, slow, base, mult, marks, rollAcross: null, rollMult: null };
  };
  /** The state a trial's cut keeps once it is chosen: its own copies of whatever lived in a shared buffer. */
  const keep = (state: CutState, shared: Buffers): CutState =>
    state.flat
      ? state
      : {
          ...state,
          base: state.base === shared.base ? state.base.slice() : state.base,
          mult: state.mult.slice(),
          rollAcross: state.rollAcross && state.rollAcross === shared.rollAcross ? state.rollAcross.slice() : state.rollAcross,
          rollMult: state.rollMult ? state.rollMult.slice() : null,
        };

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
          let lift = ma * a.base[q + 1] + mb * b.base[q + 1] + mc * c.base[q + 1];
          // A nose concave's Rail Roll (quick 261125-mf8): only a cut that carries one has these, so the old sums run as before.
          if (a.rollAcross !== null) lift += a.rollMult![i] * a.rollAcross[i * J + j];
          if (b.rollAcross !== null) lift += b.rollMult![i] * b.rollAcross[i * J + j];
          if (c.rollAcross !== null) lift += c.rollMult![i] * c.rollAcross[i * J + j];
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
          kind === "double"
            ? ["troughAt", "offRail"]
            : kind === "single"
              ? ["offRail"]
              : kind === "belly" || s[key].spec.name === "Tri-Plane Hull Center"
                ? ["offStringer"]
                : [];
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

  /**
   * The polish (quick 261116-tqs, the founder: "let the fit land anywhere"): the chosen cuts' sliders moved to whatever values
   * bring the same score closest, between steps on every axis. It never changes a cut's name, and never moves a flat section.
   * Per cut that is not flat: Start, Deepest At and End (as stations from the tail, each kept inside the board and the three
   * kept in order the way a drag keeps them), Depth (1/16" to 1/2", the shallowest the grid chose among, so a polished cut never
   * shrinks into one the name choice never weighed), and the across marks inside BOTTOM's own ranges: a single's Off Rail, a
   * belly's and the Tri-Plane's Off Stringer, a double's Trough At, Off Rail and Off Stringer. Smoothness, Vee Lift, Closes to a
   * point and By hand's two trough ends stay as they are.
   *
   * The search is a coordinate descent with repeats, then the neighbouring pairs moved together (the score is a largest-gap
   * score, so a gain often needs two sliders to move at once), halving the steps until each is a thousandth of its first
   * (`BRD_BOTTOM_POLISH_STOP`), then `BRD_BOTTOM_POLISH_RESTARTS` Nelder-Mead restarts. Every trial is scored by `value`, the
   * fit's own score, one trial buffer per section because all three cuts can change in one trial. A trial counts when it is
   * closer by more than rounding noise: there is no `BRD_BOTTOM_MOVE_GAIN_MM` bar here. Bounded: at most
   * `POLISH_ROUNDS` rounds of at most `POLISH_RUN` repeats a coordinate and a direction, and at most
   * `POLISH_SIMPLEX_ITERATIONS` x n Nelder-Mead steps a restart, n being at most 22 sliders. Never worse than `specs`:
   * when no trial beats them, they come back untouched.
   *
   * `rollFree` (quick 261125-mf8, off unless asked; only the nose retry of `polishBrdBottom` asks): a nose concave gains its
   * Rail Roll as one more slider, the last of the list, first step 1/16" (`BRD_BOTTOM_POLISH_ROLL_IN`), held to BOTTOM's 0 to
   * 1/2" and stored with no key at 0. Left off, a roll comes back exactly as it went in.
   */
  const polish = (specs: Specs, rollFree = false): { specs: Specs; value: number } => {
    const IN = inchesToMm(1);
    const startValue = valueOfSpecs(specs);
    type PolishField = "start" | "deepest" | "end" | "depth" | "offRail" | "offStringer" | "troughAt" | "railRoll";
    const fields: { key: BottomSectionKey; field: PolishField }[] = [];
    for (const key of ["tail", "center", "nose"] as const) {
      const kind = cutKind(specs[key].name);
      if (kind === "flat" || specs[key].depth <= 0) continue;
      for (const field of ["start", "deepest", "end", "depth"] as const) fields.push({ key, field });
      const marks: PolishField[] =
        kind === "double"
          ? ["troughAt", "offRail", "offStringer"]
          : kind === "single"
            ? ["offRail"]
            : kind === "belly" || specs[key].name === "Tri-Plane Hull Center"
              ? ["offStringer"]
              : [];
      for (const field of marks) fields.push({ key, field });
      if (rollFree && takesRailRoll(key, specs[key].name)) fields.push({ key, field: "railRoll" });
    }
    if (fields.length === 0) return { specs, value: startValue };

    const isStation = (f: PolishField): f is "start" | "deepest" | "end" => f === "start" || f === "deepest" || f === "end";
    // Every value in inches: a station from the tail, a depth, a mark.
    const x0 = fields.map(({ key, field }) => (isStation(field) ? resolveCut(key, specs[key], board)[field] : (specs[key][field] ?? 0)) / IN);
    const step0 = fields.map(({ field }) =>
      isStation(field)
        ? BRD_BOTTOM_POLISH_STATION_IN
        : field === "depth"
          ? BRD_BOTTOM_POLISH_DEPTH_IN
          : field === "railRoll"
            ? BRD_BOTTOM_POLISH_ROLL_IN
            : BRD_BOTTOM_POLISH_MARK_IN,
    );
    const heldTo = (field: PolishField, inches: number): number => {
      if (isStation(field)) return Math.min(L, Math.max(0, inches * IN));
      if (field === "depth") return Math.min(BOTTOM_DEPTH_RANGE_IN.max * IN, Math.max(BOTTOM_MARK_STEP_IN * IN, inches * IN));
      const range = BOTTOM_MARK_RANGES_IN[field];
      return Math.min(range.max * IN, Math.max(range.min * IN, inches * IN));
    };
    const build = (x: readonly number[]): Specs => {
      const out: Specs = { nose: specs.nose, center: specs.center, tail: specs.tail };
      for (const key of ["tail", "center", "nose"] as const) {
        let spec: BottomCutSpec | null = null;
        fields.forEach(({ key: k, field }, i) => {
          if (k !== key) return;
          const at = heldTo(field, x[i]);
          const base: BottomCutSpec = spec ?? { ...specs[key] };
          spec = isStation(field) ? { ...base, ...storeCutStation(key, field, mm(at), board) } : { ...base, [field]: mm(at) };
        });
        // A Rail Roll that landed on 0 stores no key (`tidyRailRoll`); a cut with none, or a roll that is there, is untouched.
        if (spec) out[key] = tidyRailRoll(key, keepStationsInOrder(key, spec, "deepest", board, "narrowest"));
      }
      return out;
    };

    const states: Record<BottomSectionKey, CutState> = {
      nose: keep(prepare("nose", specs.nose, null, newBuffers()), trialBuffers),
      center: keep(prepare("center", specs.center, null, newBuffers()), trialBuffers),
      tail: keep(prepare("tail", specs.tail, null, newBuffers()), trialBuffers),
    };
    const trialSet: Record<BottomSectionKey, Buffers> = { nose: newBuffers(), center: newBuffers(), tail: newBuffers() };
    const score = (x: readonly number[]): number => {
      const trial = build(x);
      return value({
        nose: prepare("nose", trial.nose, states.nose, trialSet.nose),
        center: prepare("center", trial.center, states.center, trialSet.center),
        tail: prepare("tail", trial.tail, states.tail, trialSet.tail),
      });
    };

    let x = [...x0];
    let best = score(x);
    let step = [...step0];
    for (let round = 0; round < POLISH_ROUNDS; round++) {
      let improved = false;
      for (let i = 0; i < x.length; i++) {
        for (const dir of [1, -1]) {
          for (let run = 0; run < POLISH_RUN; run++) {
            const y = [...x];
            y[i] += dir * step[i];
            const v = score(y);
            if (!(v < best - NOISE)) break;
            best = v;
            x = y;
            improved = true;
          }
        }
      }
      // Neighbouring pairs together: a largest-gap score often needs two sliders to move at once.
      for (let i = 0; i + 1 < x.length; i++) {
        for (const a of [1, -1]) {
          for (const b of [1, -1]) {
            const y = [...x];
            y[i] += a * step[i];
            y[i + 1] += b * step[i + 1];
            const v = score(y);
            if (v < best - NOISE) {
              best = v;
              x = y;
              improved = true;
            }
          }
        }
      }
      if (!improved) {
        step = step.map((q) => q / 2);
        if (step.every((q, i) => q < BRD_BOTTOM_POLISH_STOP * step0[i])) break;
      }
    }

    // Nelder-Mead restarts from the best found, each with a smaller starting simplex.
    const n = x.length;
    for (let restart = 0; restart < BRD_BOTTOM_POLISH_RESTARTS; restart++) {
      let simplex = [x, ...x.map((_, i) => x.map((v, j) => (j === i ? v + step0[i] * 0.5 ** restart : v)))];
      let vals = simplex.map(score);
      for (let it = 0; it < POLISH_SIMPLEX_ITERATIONS * n; it++) {
        const order = vals.map((_, i) => i).sort((a, b) => vals[a] - vals[b]);
        simplex = order.map((i) => simplex[i]);
        vals = order.map((i) => vals[i]);
        if (vals[n] - vals[0] < POLISH_SIMPLEX_SPREAD) break;
        const centroid = new Array<number>(n).fill(0);
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centroid[j] += simplex[i][j] / n;
        const along = (a: number) => centroid.map((c, j) => c + a * (simplex[n][j] - c));
        const reflected = along(-1);
        const reflectedValue = score(reflected);
        if (reflectedValue < vals[0]) {
          const expanded = along(-2);
          const expandedValue = score(expanded);
          if (expandedValue < reflectedValue) {
            simplex[n] = expanded;
            vals[n] = expandedValue;
          } else {
            simplex[n] = reflected;
            vals[n] = reflectedValue;
          }
        } else if (reflectedValue < vals[n - 1]) {
          simplex[n] = reflected;
          vals[n] = reflectedValue;
        } else {
          const contracted = along(0.5);
          const contractedValue = score(contracted);
          if (contractedValue < vals[n]) {
            simplex[n] = contracted;
            vals[n] = contractedValue;
          } else {
            for (let i = 1; i <= n; i++) {
              simplex[i] = simplex[i].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j]));
              vals[i] = score(simplex[i]);
            }
          }
        }
      }
      if (vals[0] < best) {
        best = vals[0];
        x = simplex[0];
      }
    }

    // Never worse than what came in (the clamp to a control's own range can move a hand-written value).
    if (!(best < startValue - NOISE)) return { specs, value: startValue };
    return { specs: build(x), value: best };
  };

  return { refine, valueOfSpecs, polish };
}

/* ============ the whole fit ============ */

/** How many of the three sections hold a cut. */
const cutsIn = (specs: Specs): number => BOTTOM_SECTIONS.filter((key) => cutKind(specs[key].name) !== "flat").length;

/**
 * The fit's choice from its pool (`seed` is the refined seed, which is in the pool): the Tri-Plane Hull Center is reached for
 * last, so its candidates stay only when the pool holds nothing else, or when the closest of them scores at least
 * `BRD_BOTTOM_TRI_PLANE_MM` below the closest other (a Tri-Plane seed is never saved by the seed's stickiness). Then today's
 * rule, unchanged: among the candidates within `BRD_BOTTOM_EXTRA_CUT_MM` of the closest, the fewest cuts, the seed kept when
 * it is among them and has the fewest, else the closest of the fewest.
 */
export function chooseBrdBottom<T extends { specs: Record<BottomSectionKey, BottomCutSpec>; value: number }>(pool: readonly T[], seed: T): T {
  const isTriPlane = (p: T) => p.specs.center.name === "Tri-Plane Hull Center";
  const others = pool.filter((p) => !isTriPlane(p));
  let kept = pool;
  if (others.length > 0) {
    const closestOther = Math.min(...others.map((p) => p.value));
    const closestTri = Math.min(...pool.filter(isTriPlane).map((p) => p.value));
    kept = closestTri <= closestOther - BRD_BOTTOM_TRI_PLANE_MM ? pool : others;
  }
  const closest = Math.min(...kept.map((p) => p.value));
  const near = kept.filter((p) => p.value <= closest + BRD_BOTTOM_EXTRA_CUT_MM);
  const fewest = Math.min(...near.map((p) => cutsIn(p.specs)));
  return near.includes(seed) && cutsIn(seed.specs) === fewest ? seed : near.filter((p) => cutsIn(p.specs) === fewest).sort((a, b) => a.value - b.value)[0];
}

/** The bottom the fit chose, measured on the file's own sections (see `measureBrdBottom`). */
export interface BrdBottomFit {
  bottom: BoardBottom;
  sections: BrdBottomSection[];
  closeness: { largest: Mm; typical: Mm; station: Mm; across: Mm };
}

/**
 * The Spiral Vee on its own, offered beside a close candidate that has a centre double concave over a tail Spiral Vee (the
 * founder, 2026-11-24, quick 261124-x9h, spike 004). A file whose double concave runs out through a vee tail, with nothing
 * cut in the centre, is drawn by the Spiral Vee alone; but the fit swaps one section's name at a time, so from a centre
 * double over a Spiral Vee, "no centre cut and a Spiral Vee" is two swaps away and was never scored. Two candidates, each
 * with its sliders free: that same bottom with the centre flat, and the Spiral Vee afresh from its own starting numbers at
 * whichever Depth step scores closest, under a flat centre. Nothing for any other candidate. The choice rules then weigh them
 * like any other candidate (`chooseBrdBottom`, unchanged).
 */
function spiralVeeAlone(specs: Specs, scorer: ReturnType<typeof brdBottomScorer>, board: BottomBoard): { specs: Specs; value: number }[] {
  if (specs.tail.name !== "Spiral Vee" || cutKind(specs.center.name) !== "double") return [];
  const flatCenter = startingCut("center", FLAT_CUT_NAMES.center, board);
  let fresh: Specs | null = null;
  let freshValue = Infinity;
  for (let steps = 1; steps <= DEPTH_STEPS; steps++) {
    const tried: Specs = { ...specs, center: flatCenter, tail: specOfPick("tail", { name: "Spiral Vee", steps }, board, "Spiral Vee") };
    const value = scorer.valueOfSpecs(tried);
    if (value < freshValue) {
      freshValue = value;
      fresh = tried;
    }
  }
  return [scorer.refine({ ...specs, center: flatCenter }), scorer.refine(fresh!)];
}

/**
 * Fits BOTTOM's three cuts to the sections of a file on `board0` (the board that opens: `brdFittedBottomBoard`): the seed
 * (stage 1, over the file's own sections), the refined seed, then every other name of each section put in its place with its
 * sliders free, the closest three refined in full, the Spiral Vee on its own beside any of those four that has a centre double
 * over a tail Spiral Vee (`spiralVeeAlone`, quick 261124-x9h), and the choice (the seed's names unless another cut brings the
 * fit `BRD_BOTTOM_EXTRA_CUT_MM` closer; of those within that, the fewest cuts). Null when the file has no section the fit can
 * use.
 */
export function fitBottomToBrd(
  sections: readonly BrdSectionLine[],
  board0: BottomBoard,
  windows?: readonly (Mm | undefined)[],
): BrdBottomFit | null {
  const read = brdBottomSections(sections, board0.length, windows);
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
  // The Spiral Vee on its own, for a close candidate with a centre double over a tail Spiral Vee (quick 261124-x9h).
  const spiral = pool.slice(0, 1 + FULL_NEIGHBOURS).flatMap((candidate) => spiralVeeAlone(candidate.specs, scorer, board));
  pool.push(...spiral);
  const chosen = chooseBrdBottom(pool, best);

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

/**
 * The chosen bottom polished at any value (quick 261116-tqs): the same scorer the fit used, over the same read sections and
 * blends (`sections` are the fit's own, which carry the windows they were read at), with every cut's sliders free to land
 * between their steps. Names are never changed; channels and wings are untouched. `board0` is the board the fit was made on
 * (`brdFittedBottomBoard`), so Deepest At is stored from the same fins.
 *
 * The search is scored the fit's way, which reads a nearly flat section (every gap within `BRD_BOTTOM_FLAT_MM`) as exactly flat
 * so a file's rounding never invents a concave. The figure a shaper is shown is measured against the file's own bottom instead,
 * so a polished bottom is kept only when that shown figure (the widest miss plus the typical one, as the fit scores) is no worse
 * than the grid answer's. Measured: the founder's twelve files all pass; a file the app wrote itself, whose grid answer is
 * already within 0.02 mm, would otherwise have been pulled to 0.39 mm by the flat reading, and it now comes back as it was.
 *
 * Then the one exception to "names are never changed" (quick 261125-mf8, stage 7 of the header): a file whose widest miss is
 * still over `BRD_BOTTOM_NOSE_RETRY_MM` has its nose tried once more as a Blended Nose Concave, 1/16" deep, with a 1/8" Rail
 * Roll, polished with the roll free, and kept only when its shown figure is lower by `BRD_BOTTOM_EXTRA_CUT_MM` (the nose's name
 * changed) or by more than rounding noise (it already was a Blended Nose Concave). A file under the gate comes back exactly
 * as it did before.
 */
export function polishBrdBottom(bottom: BoardBottom, sections: readonly BrdBottomSection[], board0: BottomBoard): BoardBottom {
  const scorer = brdBottomScorer(board0, brdBottomBlends(sections));
  const { specs } = scorer.polish({ nose: bottom.nose, center: bottom.center, tail: bottom.tail });
  const polished = { ...bottom, nose: specs.nose, center: specs.center, tail: specs.tail };
  const shown = (b: BoardBottom): number => {
    const { largest, typical } = measureBrdBottom(b, sections, board0).closeness;
    return largest + typical;
  };
  const today = shown(polished) <= shown(bottom) + NOISE ? polished : bottom;

  // The nose tried once more with a Rail Roll, only on a file still over the millimetre gate.
  if (!(measureBrdBottom(today, sections, board0).closeness.largest > BRD_BOTTOM_NOSE_RETRY_MM)) return today;
  const nose: BottomCutSpec = {
    ...startingCut("nose", "Blended Nose Concave", board0),
    depth: inchesToMm(BOTTOM_MARK_STEP_IN),
    railRoll: inchesToMm(BRD_BOTTOM_NOSE_RETRY_ROLL_IN),
  };
  const more = scorer.polish({ nose, center: today.center, tail: today.tail }, true).specs;
  const tried: BoardBottom = { ...today, nose: more.nose, center: more.center, tail: more.tail };
  const bar = today.nose.name === nose.name ? NOISE : BRD_BOTTOM_EXTRA_CUT_MM;
  return shown(tried) < shown(today) - bar ? tried : today;
}
