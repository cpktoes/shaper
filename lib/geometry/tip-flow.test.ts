import { describe, expect, it } from "vitest";
import { isPickable } from "@/lib/blanks/catalog";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { buildStressSet, STRESS_FIT_SETTINGS, type StressCase } from "./__fixtures__/phase14-stress-set";
import { DEFAULT_BLANK_CUT, type BlankRecord } from "./blank";
import {
  blankStationOf,
  boardOnBlank,
  clampPlacement,
  FIT_EPSILON_MM,
  fitAt,
  judgeBlank,
  listBlanks,
  MIN_FOIL_THICKNESS_MM,
  placementRange,
  prepareBlank,
  runsOutCause,
  tweakExceedsDeckSkin,
  type BoardFitContext,
  type BoardOnBlank,
  type BoardOnBlankInput,
} from "./blank-fit";
import { formatShortfall } from "./blank-reasons";
import { DEFAULT_BOARD_SPEC } from "./board";
import { DEFAULT_FOIL_SPEC } from "./foil";
import { buildOutline, MEASURE_STATION_MM, sampleOutline } from "./outline";
import { rockerStationPositions } from "./rocker";
import { automaticStart, THINNING_START_MIN_MM, THINNING_START_STEP_MM, type PlanerCut } from "./tip-taper";
import { inchesToMm, mm, type Mm } from "./units";

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

// ---------------------------------------------------------------------------------------------
// Plan 14-13: the runs-out reason, Automatic's independence and smoothness, and the list's cost.
// ---------------------------------------------------------------------------------------------

/** The least foam a board may be anywhere, with the fit check's own slack — as `runsOutCause` reads it. */
const FLOOR_MM = MIN_FOIL_THICKNESS_MM - FIT_EPSILON_MM;
const SIXTEENTH_MM = inchesToMm(1 / 16);

/** The default outline at a length and centre, out-of-the-box tips and cut, no fine-tunes, on Automatic. */
function defaultContext(length: Mm, centre: Mm): BoardFitContext {
  const geometry = buildOutline({ ...DEFAULT_BOARD_SPEC.outline, length });
  return {
    board: {
      length,
      centerThickness: centre,
      noseTip: DEFAULT_FOIL_SPEC.noseTip,
      tailTip: DEFAULT_FOIL_SPEC.tailTip,
      nose12Offset: mm(0),
      tail12Offset: mm(0),
      ...DEFAULT_BLANK_CUT,
    },
    halfWidthAt: (s: Mm) => sampleOutline(geometry, s),
    widePointStation: geometry.widePointStation,
  };
}

/** Every pickable blank in the catalogue, prepared once on the live rule. */
const PREPARED = CATALOG.filter(isPickable).map((record) => prepareBlank(record));

interface RunsOutVerdict {
  label: string;
  onBlank: BoardOnBlank;
  station: number;
  cause: string | undefined;
  reason: string;
}

/** The runs-out verdicts the whole catalogue gives a board, each with its board laid where it was judged. */
function runsOutVerdicts(ctx: BoardFitContext): RunsOutVerdict[] {
  const out: RunsOutVerdict[] = [];
  const copyBoard = { length: ctx.board.length, widePointStation: ctx.widePointStation, centerThickness: ctx.board.centerThickness };
  for (const prepared of PREPARED) {
    const verdict = judgeBlank(prepared, ctx, STRESS_FIT_SETTINGS);
    if (verdict.fits || verdict.worst.kind !== "runsOut") continue;
    out.push({
      label: `${prepared.record.vendor}|${prepared.record.name}`,
      onBlank: boardOnBlank(prepared, ctx.board, verdict.placement),
      station: verdict.worst.station,
      cause: verdict.worst.cause,
      reason: formatShortfall(verdict.worst, copyBoard, "imperial"),
    });
  }
  return out;
}

describe("the runs-out reason names a start set too close (UI-SPEC §10)", () => {
  it("a tail tip set under the floor reads tipSetting anywhere inside that tip's own taper — past 12\" too, when Automatic starts further in", () => {
    // A tail tip a sixteenth under the floor on every stress board; those whose Automatic tail start
    // is past 12" are classified at a station between 12" and that start, where the old 12" reading
    // would have said thinCenter.
    let checked = 0;
    for (const { prepared, board, placement, label } of ALL) {
      const thin: BoardOnBlankInput = { ...board, tailTip: mm(MIN_FOIL_THICKNESS_MM - SIXTEENTH_MM) };
      const onBlank = boardOnBlank(prepared, thin, placement);
      expect(onBlank.tips.tail.automatic).toBe(true);
      const start = onBlank.tips.tail.fromTip;
      if (!(start > MEASURE_STATION_MM + EXACT_MM)) continue;
      const station = (MEASURE_STATION_MM + start) / 2;
      expect(runsOutCause(onBlank, station), label).toBe("tipSetting");
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  }, SLOW);

  it("a good tip with its start set by hand at 6\" runs out at that start and reads thinningStart; a runs-out at the other end, left on Automatic, never blames it — the reason names the end that caused it", () => {
    // The default 72" board at a 1" centre: on Automatic it runs out nowhere in the catalogue (D-20).
    const ctx = defaultContext(inchesToMm(72), inchesToMm(1));
    const L = ctx.board.length;
    for (const end of ["tail", "nose"] as const) {
      const key = end === "tail" ? "tailThinningStart" : "noseThinningStart";
      const byHand: BoardFitContext = { ...ctx, board: { ...ctx.board, [key]: THINNING_START_MIN_MM } };
      const verdicts = runsOutVerdicts(byHand);
      expect(end === "tail" ? byHand.board.tailTip : byHand.board.noseTip).toBeGreaterThanOrEqual(FLOOR_MM);
      // A blank whose nearest-to-fitting placement slides the board until the end left on Automatic
      // runs out on its own is that end's reason, never the start set by hand at the other end.
      const atHandSetEnd = verdicts.filter((v) => (end === "tail" ? v.station < L / 2 : v.station > L / 2));
      const atOtherEnd = verdicts.filter((v) => !atHandSetEnd.includes(v));
      expect(atHandSetEnd.length).toBeGreaterThan(atOtherEnd.length);
      for (const v of atOtherEnd) expect(v.cause, v.label).not.toBe("thinningStart");
      for (const v of atHandSetEnd) {
        const view = v.onBlank.tips[end];
        expect(view.automatic, v.label).toBe(false);
        expect(view.fromTip, v.label).toBe(THINNING_START_MIN_MM);
        // Where the hand-set start decides the thickness: at that start or nearer the tip.
        const fromThatTip = end === "tail" ? v.station : L - v.station;
        expect(fromThatTip, v.label).toBeLessThanOrEqual(view.fromTip + EXACT_MM);
        expect(v.onBlank.derivedThicknessAt(v.station), v.label).toBeLessThan(FLOOR_MM);
        expect(v.onBlank.automaticThicknessAt(v.station), v.label).toBeGreaterThanOrEqual(FLOOR_MM);
        expect(v.cause, v.label).toBe("thinningStart");
        expect(v.reason.endsWith(`— your ${end} thinning starts too close to the tip`), v.reason).toBe(true);
      }
    }
  }, SLOW);

  it("a negative 12\" fine-tune on a start set by hand at 12\" keeps its own blame: fineTune, not thinningStart", () => {
    // Both starts set by hand at the 12" station, a nose tweak that takes the 12" station a sixteenth
    // under the floor: the start set by hand is not what leaves too little there.
    let checked = 0;
    for (const { prepared, board, placement, label } of ALL.filter((entry) => entry.place === "centre")) {
      const at12: BoardOnBlankInput = {
        ...board,
        noseThinningStart: MEASURE_STATION_MM,
        tailThinningStart: MEASURE_STATION_MM,
      };
      const station = board.length - MEASURE_STATION_MM;
      const untweaked = boardOnBlank(prepared, at12, placement);
      if (untweaked.derivedThicknessAt(station) < FLOOR_MM) continue;
      const nose12Offset = mm(MIN_FOIL_THICKNESS_MM - SIXTEENTH_MM - untweaked.derivedThicknessAt(station));
      const onBlank = boardOnBlank(prepared, { ...at12, nose12Offset }, placement);
      expect(onBlank.thicknessAt(station), label).toBeLessThan(FLOOR_MM);
      expect(runsOutCause(onBlank, station), label).toBe("fineTune");
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  }, SLOW);

  it("a board that still runs out where Automatic finds no steady start keeps thinCenter — on Automatic and with a start set by hand alike", () => {
    // A centre a sixteenth over the floor: the parallel cut is under the tip settings everywhere off
    // the centre, so Automatic finds no steady start and the board runs out on the parallel cut itself.
    const ctx = defaultContext(inchesToMm(72), mm(MIN_FOIL_THICKNESS_MM + SIXTEENTH_MM));
    const verdicts = runsOutVerdicts(ctx);
    expect(verdicts.length).toBeGreaterThan(0);
    for (const v of verdicts) {
      expect(v.onBlank.automaticThicknessAt(v.station), v.label).toBeLessThan(FLOOR_MM);
      expect(v.cause, v.label).toBe("thinCenter");
      // The same board with the start at that end set by hand at 6": Automatic would not have had
      // enough foam there either, so the start is not blamed.
      const key = v.station <= ctx.board.length / 2 ? "tailThinningStart" : "noseThinningStart";
      const byHand = boardOnBlank(v.onBlank.prepared, { ...ctx.board, [key]: THINNING_START_MIN_MM }, v.onBlank.placement);
      expect(runsOutCause(byHand, v.station), v.label).toBe("thinCenter");
    }
    expect(verdicts.some((v) => !v.onBlank.tips.tail.automaticFound || !v.onBlank.tips.nose.automaticFound)).toBe(true);
  }, SLOW);
});

/** Whether Automatic moved this tip's start further in than the 12" station. */
const movedIn = (start: number) => start - MEASURE_STATION_MM > EXACT_MM;

/** The stress boards on whose placement Automatic starts at least one tip further in than 12". */
function movedInCases(): { entry: StressCase; onBlank: BoardOnBlank }[] {
  return ALL.map((entry) => ({ entry, onBlank: boardOnBlank(entry.prepared, entry.board, entry.placement) })).filter(
    ({ onBlank }) => movedIn(onBlank.tips.tail.automaticStart) || movedIn(onBlank.tips.nose.automaticStart),
  );
}

/** The four 1/4" stations from tail tip to nose tip, the nose tip included. */
function quarterStations(length: number): number[] {
  const step = inchesToMm(1 / 4);
  const out: number[] = [];
  for (let k = 0; k * step <= length + 1e-9; k++) out.push(Math.min(length, k * step));
  if (out[out.length - 1] < length) out.push(length);
  return out;
}

describe("Automatic reads only the planer cut, and the tweak, the skin and Tip Style keep their meanings (D-04, D-23, R7)", () => {
  const EIGHTH_MM = inchesToMm(1 / 8);
  const TWEAKS: readonly { nose: number; tail: number }[] = [
    { nose: 0, tail: 0 },
    { nose: EIGHTH_MM, tail: EIGHTH_MM },
    { nose: -EIGHTH_MM, tail: -EIGHTH_MM },
    { nose: EIGHTH_MM, tail: -EIGHTH_MM },
    { nose: -EIGHTH_MM, tail: EIGHTH_MM },
  ];

  it("each tip's Automatic start is identical across Tip Style, Deck Skin, the fine-tune surface and both 12\" tweaks, on every stress board whose start moved in past 12\"", () => {
    const cases = movedInCases();
    expect(cases.length).toBeGreaterThan(0);
    const moved: string[] = [];
    for (const { entry, onBlank } of cases) {
      const want = [onBlank.tips.tail.automaticStart, onBlank.tips.nose.automaticStart];
      for (const tipStyle of ["pinDeck", "bottom"] as const) {
        for (const deckSkin of [inchesToMm(1 / 8), inchesToMm(1 / 4)]) {
          for (const fineTuneSurface of ["deck", "bottom"] as const) {
            for (const { nose, tail } of TWEAKS) {
              const board: BoardOnBlankInput = {
                ...entry.board,
                tipStyle,
                deckSkin: mm(deckSkin),
                fineTuneSurface,
                nose12Offset: mm(nose),
                tail12Offset: mm(tail),
              };
              const got = boardOnBlank(entry.prepared, board, entry.placement).tips;
              if (!Object.is(got.tail.automaticStart, want[0]) || !Object.is(got.nose.automaticStart, want[1])) {
                moved.push(`${entry.label} ${tipStyle} skin ${deckSkin} ${fineTuneSurface} tweaks ${nose}/${tail}`);
              }
            }
          }
        }
      }
    }
    expect(listed(moved)).toEqual([]);
  }, SLOW);

  it("a 12\" tweak on a start moved in past 12\" is a nudge on top of the taper: the 12\" thickness is the taper's plus the tweak, on either surface", () => {
    let checked = 0;
    for (const { entry, onBlank: untweaked } of movedInCases()) {
      const L = entry.board.length;
      const ends = [
        { moved: movedIn(untweaked.tips.tail.fromTip), station: MEASURE_STATION_MM, key: "tail12Offset" as const },
        { moved: movedIn(untweaked.tips.nose.fromTip), station: L - MEASURE_STATION_MM, key: "nose12Offset" as const },
      ];
      for (const { moved, station, key } of ends) {
        if (!moved) continue;
        // The taper, not the planer cut, sets the 12" thickness on this tip.
        expect(untweaked.tipThinningAt(station), entry.label).not.toBe(0);
        for (const fineTuneSurface of ["deck", "bottom"] as const) {
          for (const tweak of [EIGHTH_MM, -EIGHTH_MM]) {
            const tweaked = boardOnBlank(
              entry.prepared,
              { ...entry.board, fineTuneSurface, [key]: mm(tweak) },
              entry.placement,
            );
            expect(tweaked.tips.tail.fromTip, entry.label).toBe(untweaked.tips.tail.fromTip);
            expect(tweaked.tips.nose.fromTip, entry.label).toBe(untweaked.tips.nose.fromTip);
            const expected = untweaked.derivedThicknessAt(station) + tweak;
            expect(Math.abs(tweaked.thicknessAt(station) - expected), entry.label).toBeLessThanOrEqual(EXACT_MM);
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  }, SLOW);

  it("with a start moved in past 12\", Tip Style changes only which surface the thinning comes off: the thickness is identical at every 1/4\" station", () => {
    let thinned = 0;
    const wrong: string[] = [];
    for (const { entry } of movedInCases()) {
      const pin = boardOnBlank(entry.prepared, { ...entry.board, tipStyle: "pinDeck" }, entry.placement);
      const bottom = boardOnBlank(entry.prepared, { ...entry.board, tipStyle: "bottom" }, entry.placement);
      const skin = entry.board.deckSkin;
      const off = (a: number, b: number) => !(Math.abs(a - b) <= EXACT_MM);
      for (const s of quarterStations(entry.board.length)) {
        const at = `${entry.label} at ${s}`;
        const thinning = pin.tipThinningAt(s);
        if (!Object.is(bottom.thicknessAt(s), pin.thicknessAt(s))) wrong.push(`${at}: thickness differs`);
        if (!Object.is(bottom.tipThinningAt(s), thinning)) wrong.push(`${at}: thinning differs`);
        // Pin deck: off the bottom, the deck untouched. Bottom: off the deck, the bottom untouched.
        if (off(pin.bottomOffAt(s), pin.centerGap + thinning)) wrong.push(`${at}: Pin deck bottom`);
        if (off(pin.deckOffAt(s), skin)) wrong.push(`${at}: Pin deck deck`);
        if (off(bottom.deckOffAt(s), skin + thinning)) wrong.push(`${at}: Bottom deck`);
        if (off(bottom.bottomOffAt(s), bottom.centerGap)) wrong.push(`${at}: Bottom bottom`);
        if (thinning !== 0) thinned++;
      }
    }
    expect(listed(wrong)).toEqual([]);
    expect(thinned).toBeGreaterThan(0);
  }, SLOW);

  it("a tip that needs more foam than the planer cut leaves: Pin deck drops that tip's rocker below the Bottom style's, and under Bottom the deck rises above the blank's and the fit check says thin — as before", () => {
    let lower = 0;
    let overSkin = 0;
    let thinAtTheTip = 0;
    for (const entry of ALL) {
      const L = entry.board.length;
      const pin = boardOnBlank(entry.prepared, { ...entry.board, tipStyle: "pinDeck" }, entry.placement);
      const bottom = boardOnBlank(entry.prepared, { ...entry.board, tipStyle: "bottom" }, entry.placement);
      let deckRises = false;
      for (const tip of [0, L]) {
        const thinning = pin.tipThinningAt(tip);
        if (!(thinning < -FIT_EPSILON_MM)) continue;
        expect(pin.rockerAt(tip), `${entry.label} at ${tip}`).toBeLessThan(bottom.rockerAt(tip));
        lower++;
        if (bottom.deckOffAt(tip) < -FIT_EPSILON_MM) deckRises = true;
      }
      if (!deckRises) continue;
      overSkin++;
      const result = fitAt(bottom, entry.halfWidthAt, entry.widePointStation, STRESS_FIT_SETTINGS);
      expect(result.fits, entry.label).toBe(false);
      // The board pokes out through the deck, so the worst is that thin place — unless the board is
      // also too wide somewhere by more.
      expect(result.worst.kind === "thin" || result.worst.kind === "wide", entry.label).toBe(true);
      if (result.worst.kind === "thin" && (result.worst.station === 0 || result.worst.station === L)) thinAtTheTip++;
    }
    expect(lower).toBeGreaterThan(0);
    expect(overSkin).toBeGreaterThan(0);
    expect(thinAtTheTip).toBeGreaterThan(0);
  }, SLOW);

  it("at either end of the Placement slider Automatic is worked out from the blank at that placement, the list's verdict is the fit check there, and the two ends can differ", () => {
    // Automatic's start, worked out here straight from the blank's own thickness curve at a placement.
    const automaticAt = (entry: StressCase, placement: number) => {
      const { prepared, board } = entry;
      const L = board.length;
      const u = (s: number) => blankStationOf(mm(s), mm(placement), L, prepared.lengthMm);
      const drop = prepared.thickness.sample(u(L / 2)) - board.centerThickness;
      const tail: PlanerCut = {
        at: (d) => prepared.thickness.sample(u(d)) - drop,
        slopeAt: (d) => prepared.thickness.slopeAt(u(d)),
      };
      const nose: PlanerCut = {
        at: (d) => prepared.thickness.sample(u(L - d)) - drop,
        slopeAt: (d) => -prepared.thickness.slopeAt(u(L - d)),
      };
      return { tail: automaticStart(tail, board.tailTip, L).start, nose: automaticStart(nose, board.noseTip, L).start };
    };

    let ends = 0;
    let differ = 0;
    let judged = 0;
    for (const entry of ALL) {
      if (entry.place === "centre") {
        // The list's verdict is exactly the fit check at its own placement, the board on Automatic.
        const ctx: BoardFitContext = {
          board: entry.board,
          halfWidthAt: entry.halfWidthAt,
          widePointStation: entry.widePointStation,
        };
        const verdict = judgeBlank(entry.prepared, ctx, STRESS_FIT_SETTINGS);
        const there = boardOnBlank(entry.prepared, entry.board, verdict.placement);
        expect(there.tips.tail.automatic && there.tips.nose.automatic).toBe(true);
        const check = fitAt(there, entry.halfWidthAt, entry.widePointStation, STRESS_FIT_SETTINGS);
        expect(check.fits, entry.label).toBe(verdict.fits);
        expect(check.worst, entry.label).toEqual(verdict.worst);
        judged++;
        continue;
      }
      if (entry.placement === 0) continue;
      const onBlank = boardOnBlank(entry.prepared, entry.board, entry.placement);
      const want = automaticAt(entry, onBlank.placement);
      expect(onBlank.tips.tail.fromTip, entry.label).toBe(want.tail);
      expect(onBlank.tips.nose.fromTip, entry.label).toBe(want.nose);
      ends++;
      if (entry.place === "nose") {
        const other = ALL.find((e) => e.place === "tail" && e.record === entry.record && e.centreIn === entry.centreIn);
        if (other) {
          const atTail = boardOnBlank(other.prepared, other.board, other.placement).tips;
          if (atTail.tail.fromTip !== onBlank.tips.tail.fromTip || atTail.nose.fromTip !== onBlank.tips.nose.fromTip) differ++;
        }
      }
    }
    expect(judged).toBeGreaterThan(0);
    expect(ends).toBeGreaterThan(0);
    expect(differ).toBeGreaterThan(0);
  }, SLOW);
});

describe("Automatic does not flicker, the list stays fast, and the deck-tweak shortcut stays honest (D-23)", () => {
  it("sliding the placement end to end in 1/16\" steps, each tip's Automatic start never turns back and never jumps more than 1/2\" in one step", ({
    annotate,
  }) => {
    // The (blank, centre) pairs whose Automatic start passes 12" at any of their three placements.
    const pairs = new Map<string, StressCase>();
    const qualifying = new Set<string>();
    for (const entry of ALL) {
      const key = `${entry.record.vendor}|${entry.record.name}|${entry.centreIn}`;
      if (entry.place === "centre") pairs.set(key, entry);
      const tips = boardOnBlank(entry.prepared, entry.board, entry.placement).tips;
      if (movedIn(tips.tail.automaticStart) || movedIn(tips.nose.automaticStart)) qualifying.add(key);
    }
    expect(qualifying.size).toBeGreaterThan(0);

    const step = inchesToMm(1 / 16);
    const wrong: string[] = [];
    let steps = 0;
    let moves = 0;
    let largest = 0;
    for (const key of qualifying) {
      const entry = pairs.get(key);
      expect(entry, key).toBeDefined();
      if (!entry) continue;
      const { prepared, board } = entry;
      const { min, max } = placementRange(prepared.lengthMm, board.length);
      const placements: number[] = [];
      for (let k = 0; min + k * step < max - 1e-9; k++) placements.push(clampPlacement(mm(min + k * step), prepared.lengthMm, board.length));
      placements.push(max);
      for (const end of ["tail", "nose"] as const) {
        let previous: number | null = null;
        let direction = 0;
        for (const placement of placements) {
          const view = boardOnBlank(prepared, board, mm(placement)).tips[end];
          expect(view.automatic).toBe(true);
          const start = view.fromTip;
          if (previous !== null) {
            steps++;
            const change = start - previous;
            largest = Math.max(largest, Math.abs(change));
            if (Math.abs(change) > THINNING_START_STEP_MM + EXACT_MM) wrong.push(`${key} ${end} jumps ${change} at ${placement}`);
            if (change !== 0) {
              moves++;
              if (direction !== 0 && Math.sign(change) !== direction) wrong.push(`${key} ${end} turns back at ${placement}`);
              direction = Math.sign(change);
            }
          }
          previous = start;
        }
      }
    }
    expect(listed(wrong)).toEqual([]);
    expect(moves).toBeGreaterThan(0);
    annotate(
      `pairs ${qualifying.size}; 1/16" steps ${steps}; steps where a start moved ${moves}; ` +
        `largest single move ${largest / inchesToMm(1)}"`,
    );
  }, SLOW);

  it("the whole catalogue's list for the default 72\" board at 2 1/2\" on Automatic takes under a second (Phase 12's runaway was 1.3 s)", ({
    annotate,
  }) => {
    const ctx = defaultContext(inchesToMm(72), inchesToMm(2.5));
    expect(ctx.board.noseThinningStart).toBeUndefined();
    expect(ctx.board.tailThinningStart).toBeUndefined();
    const started = performance.now();
    const result = listBlanks(PREPARED, ctx, STRESS_FIT_SETTINGS);
    const elapsed = performance.now() - started;
    expect(result.fits.length + result.wontFit.length).toBeGreaterThan(0);
    annotate(`listBlanks on Automatic: ${elapsed.toFixed(1)} ms for ${PREPARED.length} blanks`);
    expect(elapsed).toBeLessThan(1000);
  }, SLOW);

  it("under Bottom on Automatic no tip's thinning ever reaches the 12\" stations — the property the deck-tweak shortcut relies on", () => {
    const over: string[] = [];
    for (const entry of ALL) {
      const L = entry.board.length;
      const onBlank = boardOnBlank(entry.prepared, { ...entry.board, tipStyle: "bottom" }, entry.placement);
      expect(onBlank.tips.tail.automatic && onBlank.tips.nose.automatic).toBe(true);
      for (const station of [MEASURE_STATION_MM, L - MEASURE_STATION_MM]) {
        const thinning = onBlank.tipThinningAt(station);
        if (thinning > EXACT_MM) over.push(`${entry.label} at ${station}: ${thinning}`);
      }
    }
    expect(listed(over)).toEqual([]);
  }, SLOW);

  it("the one conservative corner still refuses at once: Bottom, a Deck tweak over the skin, the nose start set by hand at 24\"", () => {
    const { board } = defaultContext(inchesToMm(72), inchesToMm(2.5));
    const corner: BoardOnBlankInput = {
      ...board,
      tipStyle: "bottom",
      fineTuneSurface: "deck",
      nose12Offset: mm(board.deckSkin + SIXTEENTH_MM),
      noseThinningStart: inchesToMm(24),
    };
    expect(tweakExceedsDeckSkin(corner)).toBe(true);
  });
});
