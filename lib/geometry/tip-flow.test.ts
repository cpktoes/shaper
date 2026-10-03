import { describe, expect, it } from "vitest";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { buildStressSet, STRESS_FIT_SETTINGS, type StressCase } from "./__fixtures__/phase14-stress-set";
import type { BlankRecord } from "./blank";
import {
  boardOnBlank,
  FIT_EPSILON_MM,
  fitAt,
  MIN_FOIL_THICKNESS_MM,
  prepareBlank,
  type BoardOnBlank,
} from "./blank-fit";
import { MEASURE_STATION_MM } from "./outline";
import { rockerStationPositions } from "./rocker";
import { inchesToMm, mm } from "./units";

// The tips step (Phase 14 D-01, D-03, D-14, D-27) proven on the stress set the research built —
// every pickable blank, a board 2" shorter, four centres, slid to either end and centred — and again
// on the boards the app can actually build. Every comparison is between the live steady taper and
// today's 12" S-blend computed in this same test (`tipRule: "blend"`), against the tip settings and
// the floor each board carries. The exception list is computed from the catalogue's own printed
// thicknesses, never typed. 1/64", 1e-9 mm and FIT_EPSILON_MM are tolerances, not measured figures.

const CATALOG = readSeedCatalog();
const ALL = buildStressSet(CATALOG, prepareBlank);
const SETS: { name: string; cases: readonly StressCase[] }[] = [
  { name: "the stress set as defined", cases: ALL },
  { name: "the boards the app can build", cases: ALL.filter((entry) => entry.buildable) },
];

/** The 1/8" grid every half is walked on. */
const GRID_MM = inchesToMm(1 / 8);
/** A rise toward a tip worth reporting: well under one printed 1/16" step, well over float noise. */
const HUMP_MM = inchesToMm(1 / 64);
/** The slack for comparisons that should hold exactly up to float rounding. */
const EXACT_MM = 1e-9;
/** Long-running tests: the whole stress set is walked, and this machine may be busy. */
const SLOW = 120_000;

/** The board stations every check reads: the 1/8" grid, the five stations and the centre, tail to nose. */
function samplesOf(length: number): number[] {
  const out = new Set<number>();
  const steps = Math.floor(length / GRID_MM + 1e-9);
  for (let k = 0; k <= steps; k++) out.add(k * GRID_MM);
  out.add(length);
  out.add(length / 2);
  for (const { station } of rockerStationPositions(mm(length))) out.add(station);
  return [...out].sort((a, b) => a - b);
}

/** A blank's printed thicknesses, tail to nose. */
function printedThickness(record: BlankRecord): { x: number; y: number; label: string }[] {
  return record.stations
    .filter((station) => station.thicknessMm !== null)
    .map((station) => ({ x: station.fromTailMm as number, y: station.thicknessMm as number, label: station.label }))
    .sort((a, b) => a.x - b.x);
}

/** Acceptance 3's exception (D-14): the blank's thickest printed station is not its centre. */
function thickestIsNotCentre(record: BlankRecord): boolean {
  const printed = printedThickness(record);
  const thickest = Math.max(...printed.map((point) => point.y));
  const centre = printed.find((point) => point.label === "C");
  return centre === undefined || centre.y < thickest;
}

/** The printed thickness never rises walking away from the (first) thickest station, either way. */
function fallsSteadily(record: BlankRecord): { falls: boolean; at: number } {
  const printed = printedThickness(record);
  let top = 0;
  for (let i = 1; i < printed.length; i++) if (printed[i].y > printed[top].y) top = i;
  let falls = true;
  for (let i = top; i > 0; i--) if (printed[i - 1].y > printed[i].y) falls = false;
  for (let i = top; i < printed.length - 1; i++) if (printed[i + 1].y > printed[i].y) falls = false;
  return { falls, at: printed[top].x };
}

/** How far the thickness rises anywhere walking from `from` along `walk` (largest rise over the lowest so far). */
function riseAlong(onBlank: BoardOnBlank, walk: readonly number[]): number {
  let lowest = Infinity;
  let rise = 0;
  for (const s of walk) {
    const value = onBlank.thicknessAt(s);
    lowest = Math.min(lowest, value);
    rise = Math.max(rise, value - lowest);
  }
  return rise;
}

/** The largest single-step rise walking along `walk` — for the exact never-rises check. */
function stepRiseAlong(onBlank: BoardOnBlank, walk: readonly number[]): number {
  let rise = -Infinity;
  for (let i = 1; i < walk.length; i++) {
    rise = Math.max(rise, onBlank.thicknessAt(walk[i]) - onBlank.thicknessAt(walk[i - 1]));
  }
  return rise;
}

/** One stress board, measured once under the live rule (Automatic) and under today's 12" blend. */
interface Measured {
  entry: StressCase;
  /** Where a sample is thinner than that half's own tip setting, or null. */
  thinnerThanTip: string | null;
  /** Where a sample is under the 1/4" floor, or null. */
  underFloor: string | null;
  /** Where the steady board pokes out of the blank and the blend board does not, or null. */
  newlyPokes: string | null;
  fitsBlend: boolean;
  fitsSteady: boolean;
  /** The largest rise walking from the centre to either tip (Automatic). */
  rise: number;
  /** The largest step rise walking from the board station over the blank's thickest printed station to each tip. */
  riseFromThickest: number;
  tailStart: number;
  noseStart: number;
}

let measured: Measured[] | null = null;

/** Every stress board measured once (the buildable subset is the same boards, filtered). */
function measureAll(): Measured[] {
  if (measured) return measured;
  measured = ALL.map((entry) => {
    const { prepared, board, placement } = entry;
    const L = board.length;
    const steady = boardOnBlank(prepared, board, placement);
    const blend = boardOnBlank(prepared, { ...board, tipRule: "blend" }, placement);
    const samples = samplesOf(L);

    let thinnerThanTip: string | null = null;
    let underFloor: string | null = null;
    let newlyPokes: string | null = null;
    for (const s of samples) {
      const t = steady.thicknessAt(s);
      if (thinnerThanTip === null) {
        if (s <= L / 2 && t < board.tailTip - EXACT_MM) thinnerThanTip = `${t} < tail tip ${board.tailTip} at ${s}`;
        if (s >= L / 2 && t < board.noseTip - EXACT_MM) thinnerThanTip = `${t} < nose tip ${board.noseTip} at ${s}`;
      }
      if (underFloor === null && t < MIN_FOIL_THICKNESS_MM - EXACT_MM) underFloor = `${t} at ${s}`;
      const poke = (onBlank: BoardOnBlank) => Math.max(-onBlank.deckOffAt(s), -onBlank.bottomOffAt(s));
      if (newlyPokes === null && poke(steady) > FIT_EPSILON_MM && !(poke(blend) > FIT_EPSILON_MM)) {
        newlyPokes = `${poke(steady)} at ${s} (blend ${poke(blend)})`;
      }
    }

    const tailWalk = samples.filter((s) => s <= L / 2).reverse();
    const noseWalk = samples.filter((s) => s >= L / 2);
    const rise = Math.max(riseAlong(steady, tailWalk), riseAlong(steady, noseWalk));

    // The board station over the blank's thickest printed station, kept on the board.
    const top = fallsSteadily(entry.record);
    let riseFromThickest = -Infinity;
    if (top.falls) {
      const sTop = Math.min(L, Math.max(0, top.at - (prepared.lengthMm - L) / 2 - steady.placement));
      const toTail = [sTop, ...samples.filter((s) => s < sTop).reverse()];
      const toNose = [sTop, ...samples.filter((s) => s > sTop)];
      riseFromThickest = Math.max(stepRiseAlong(steady, toTail), stepRiseAlong(steady, toNose));
    }

    const judge = (onBlank: BoardOnBlank) =>
      fitAt(onBlank, entry.halfWidthAt, entry.widePointStation, STRESS_FIT_SETTINGS).fits;

    return {
      entry,
      thinnerThanTip,
      underFloor,
      newlyPokes,
      fitsBlend: judge(blend),
      fitsSteady: judge(steady),
      rise,
      riseFromThickest,
      tailStart: steady.tips.tail.fromTip,
      noseStart: steady.tips.nose.fromTip,
    };
  });
  return measured;
}

function measuredFor(cases: readonly StressCase[]): Measured[] {
  const wanted = new Set(cases.map((entry) => entry.label));
  return measureAll().filter((m) => wanted.has(m.entry.label));
}

/** Labels, shortened for a failure message. */
function listed(items: readonly string[]): string[] {
  return items.length > 20 ? [...items.slice(0, 20), `... and ${items.length - 20} more`] : [...items];
}

describe('acceptance 4: a start at 12" gives the same five numbers as before the tips step', () => {
  for (const { name, cases } of SETS) {
    it(`${name}: both starts set by hand at 12" read the blend's five thicknesses and five rocker numbers exactly`, () => {
      expect(cases.length).toBeGreaterThan(0);
      const moved: string[] = [];
      for (const { prepared, board, placement, label } of cases) {
        const at12 = boardOnBlank(
          prepared,
          { ...board, noseThinningStart: MEASURE_STATION_MM, tailThinningStart: MEASURE_STATION_MM },
          placement,
        );
        const blend = boardOnBlank(prepared, { ...board, tipRule: "blend" }, placement);
        expect([at12.tips.tail.fromTip, at12.tips.nose.fromTip]).toEqual([MEASURE_STATION_MM, MEASURE_STATION_MM]);
        for (const { key, station } of rockerStationPositions(board.length)) {
          if (!Object.is(at12.thicknessAt(station), blend.thicknessAt(station))) moved.push(`${label} thickness ${key}`);
          if (!Object.is(at12.rockerAt(station), blend.rockerAt(station))) moved.push(`${label} rocker ${key}`);
        }
      }
      expect(listed(moved)).toEqual([]);
    }, SLOW);
  }
});

describe(
  "acceptance 3: on Automatic no board is thinner than its tip, none under the floor, none newly poking or refused, and none humps except blanks printed that way (D-14, D-27)",
  () => {
    for (const { name, cases } of SETS) {
      it(`${name}: no board is thinner anywhere than its own tip setting, and none is under the 1/4" floor`, () => {
        const results = measuredFor(cases);
        expect(results.length).toBe(cases.length);
        expect(listed(results.filter((m) => m.thinnerThanTip).map((m) => `${m.entry.label}: ${m.thinnerThanTip}`))).toEqual([]);
        expect(listed(results.filter((m) => m.underFloor).map((m) => `${m.entry.label}: ${m.underFloor}`))).toEqual([]);
      }, SLOW);

      it(`${name}: no board newly pokes out of its blank, and no board that fits under the blend is refused`, () => {
        const results = measuredFor(cases);
        expect(listed(results.filter((m) => m.newlyPokes).map((m) => `${m.entry.label}: ${m.newlyPokes}`))).toEqual([]);
        expect(listed(results.filter((m) => m.fitsBlend && !m.fitsSteady).map((m) => m.entry.label))).toEqual([]);
      }, SLOW);

      it(`${name}: a board gets thicker toward a tip only on a blank whose thickest printed station is not its centre`, ({
        annotate,
      }) => {
        const results = measuredFor(cases);
        const humps = results.filter((m) => m.rise > HUMP_MM);
        const outsideExceptions = humps.filter((m) => !thickestIsNotCentre(m.entry.record));
        expect(listed(outsideExceptions.map((m) => `${m.entry.label}: rises ${m.rise}`))).toEqual([]);
        expect(humps.length).toBeGreaterThan(0);

        // Exactly: where the printed thickness falls steadily away from its thickest station, the
        // board never gets thicker walking from over that station to either tip.
        const steadyBlanks = results.filter((m) => m.riseFromThickest !== -Infinity);
        expect(steadyBlanks.length).toBeGreaterThan(0);
        const rises = steadyBlanks.filter((m) => m.riseFromThickest > EXACT_MM);
        expect(listed(rises.map((m) => `${m.entry.label}: rises ${m.riseFromThickest}`))).toEqual([]);

        // Counted for the record, never asserted as typed numbers.
        const starts = results.flatMap((m) => [m.tailStart, m.noseStart]);
        const inches = (lo: number, hi: number) =>
          starts.filter((w) => w > inchesToMm(lo) + 1e-6 && w <= inchesToMm(hi) + 1e-6).length;
        const at12 = starts.filter((w) => Math.abs(w - MEASURE_STATION_MM) <= 1e-6).length;
        const humpBlanks = [...new Set(humps.map((m) => `${m.entry.record.vendor} ${m.entry.record.name}`))];
        annotate(
          `boards ${results.length}; tips ${starts.length}: at 12" ${at12}, 12-18" ${inches(12, 18)}, ` +
            `18-24" ${inches(18, 24)}, 24-36" ${inches(24, 36)}, over 36" ${starts.filter((w) => w > inchesToMm(36) + 1e-6).length}, ` +
            `furthest ${Math.max(...starts) / inchesToMm(1)}"; boards whose two tips differ ` +
            `${results.filter((m) => m.tailStart !== m.noseStart).length}; ` +
            `rise over 1/64": ${humps.length} (${humpBlanks.join(", ")}), at or under: ${results.length - humps.length}; ` +
            `largest rise ${Math.max(...results.map((m) => m.rise)) / inchesToMm(1)}"; ` +
            `fit under the blend ${results.filter((m) => m.fitsBlend).length}, under the steady taper ` +
            `${results.filter((m) => m.fitsSteady).length}; boards whose printed thickness falls steadily ${steadyBlanks.length}`,
        );
      }, SLOW);
    }
  },
);
