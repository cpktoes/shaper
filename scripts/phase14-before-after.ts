/**
 * THE FOUNDER'S BEFORE-AND-AFTER FIGURES for each Phase 14 go-live (D-15): how the boards the
 * founder was told would move change, station numbers and litres, old curves against new.
 *
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/phase14-before-after.ts --step curves
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/phase14-before-after.ts --step curves --samples <dir>
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/phase14-before-after.ts --step tips
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/phase14-before-after.ts --step tips --samples <dir>
 *
 * run from the repository root. (Phase 12 D-20: nothing in package.json — no npm script, no
 * dependency; `--no-install` means npx can only run the tsx already in node_modules, never download
 * one.) It reads no database: the catalogue comes from the committed CSVs under db/seed/blanks/
 * through the tested reader, `lib/blanks/seed-files.ts`. Running it twice prints the same text.
 *
 * `--step curves` compares the curves the site drew before Phase 14 (`RULES_BEFORE_CURVES`) with
 * the live ones (`RULES_LIVE`), both through `lib/geometry/before-after.ts` — the same tested
 * comparison the saved-boards report uses — for six boards:
 *  - the four presets, each in its own blank, exactly as a preset card works them out;
 *  - the first board a visitor sees (the default board, no blank);
 *  - an Arctic board: 2" shorter than Arctic Foam 9'4" G, 2 1/2" centre, the default tips and cut,
 *    centred on the blank, the default outline at that length, default rails and volume.
 * For each it prints the five thicknesses and five rocker numbers before → after (Imperial, with
 * Metric beside), the largest move of any of the ten, the litres to three decimals and the card's
 * own line, and (in a blank) whether the board fits where it sits.
 *
 * `--step tips` compares the rules live after the first go-live — the new curves with today's 12"
 * blend at each tip (`RULES_BEFORE_TIPS`) — with the live ones, where each tip runs down steadily
 * from its own Thinning Start (`RULES_LIVE`, D-15). It prints:
 *  - the same six boards as the curves step (the first board a visitor sees has no blank, so it does
 *    not move at this step), each board in a blank with where each tip's thinning starts;
 *  - the fixture board (D-27): a 10'0" board on the Arctic Foam 10'9" LB slid to the tail end, 2 1/2"
 *    centre, the default tips and cut — each tip's start, the thickness every 1/2" over the last 30"
 *    of the tail, and the too-close sentence it would show with its tail start set by hand at 12";
 *  - the thin-centre board (D-20): the default 72" board at a 1" centre, how many blanks the list
 *    refuses each way and how many of those refusals say it runs out;
 *  - the stress set's summary (D-27), on the set as defined and again on the boards the app can
 *    build (no longer than its 10'0" limit): where the tips start, boards thinner than their tip,
 *    boards that rise toward a tip and the blanks they sit on, boards newly poking out of the blank,
 *    and boards newly refused or newly fitting where they sit.
 * Every figure is a count or a length in inches, worked out by the app's own functions.
 *
 * `--samples <dir>` also writes one CSV per board into <dir> (created if missing) — a station every
 * 1/2" from the tail tip plus the nose tip, with the rocker, thickness and deck before and after,
 * all in inches — the curves the pictures are drawn from. The tips step's files start `tips-`, so
 * they never overwrite the curves step's. Nothing is written anywhere else.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isPickable } from "@/lib/blanks/catalog";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { DEFAULT_FIT_DEFAULTS, toFitSettings } from "@/lib/fit-defaults-preference";
import {
  boardFigures,
  boardProfileWith,
  compareFigures,
  RULES_BEFORE_CURVES,
  RULES_BEFORE_TIPS,
  RULES_LIVE,
  type BoardFigures,
} from "@/lib/geometry/before-after";
import { DEFAULT_BLANK_CUT, type BlankRecord } from "@/lib/geometry/blank";
import {
  boardOnBlank,
  FIT_EPSILON_MM,
  fitAt,
  listBlanks,
  placementRange,
  type BoardOnBlank,
} from "@/lib/geometry/blank-fit";
import { formatThinningStart, thinningStartLine } from "@/lib/geometry/blank-reasons";
import { DEFAULT_BOARD_SPEC } from "@/lib/geometry/board";
import type { BoardSideProfile } from "@/lib/geometry/board-profile";
import { summarizeDesignWith, type DesignRules, type DesignSummaryFields } from "@/lib/geometry/design";
import { DEFAULT_FOIL_SPEC, type FoilStationKey } from "@/lib/geometry/foil";
import { formatMark } from "@/lib/geometry/measure-display";
import { buildOutline, MEASURE_STATION_MM, sampleOutline } from "@/lib/geometry/outline";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { DEFAULT_RAIL_BAND_SPEC } from "@/lib/geometry/rail-bands";
import { DEFAULT_FALLBACK_ROCKER, rockerStationPositions } from "@/lib/geometry/rocker";
import { formatSummaryLine } from "@/lib/geometry/summary-line";
import { formatTenthMm, inchesToMm, mm, mmToInches, type Mm } from "@/lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "@/lib/geometry/volume";
import { buildStressSet, type StressCase } from "@/lib/geometry/__fixtures__/phase14-stress-set";

const SETTINGS = toFitSettings(DEFAULT_FIT_DEFAULTS);
const STATIONS: readonly { key: FoilStationKey; label: string }[] = [
  { key: "tailTip", label: "tail tip" },
  { key: "tail12", label: "tail 12\"" },
  { key: "center", label: "centre" },
  { key: "nose12", label: "nose 12\"" },
  { key: "noseTip", label: "nose tip" },
];
const ARCTIC = { vendor: "Arctic Foam", name: `9'4" G` } as const;
/** The tips pictures' board (D-27): a 10'0" board on this blank, slid to the tail end. */
const FIXTURE = { vendor: "Arctic Foam", name: `10'9" LB` } as const;

interface Board {
  /** The heading printed above the board's figures. */
  title: string;
  /** The CSV file name under --samples. */
  file: string;
  fields: DesignSummaryFields;
}

function parseArgs(argv: readonly string[]): { step: string | undefined; samples: string | undefined } {
  const valueOf = (flag: string) => {
    const at = argv.indexOf(flag);
    if (at === -1) return undefined;
    const value = argv[at + 1];
    if (!value || value.startsWith("--")) throw new Error(`${flag} needs a value.`);
    return value;
  };
  return { step: valueOf("--step"), samples: valueOf("--samples") };
}

/** A catalogue record by maker and name, or a plain-English stop when the catalogue lost it. */
function recordOf(catalog: readonly BlankRecord[], which: { vendor: string; name: string }): BlankRecord {
  const record = catalog.find((blank) => blank.vendor === which.vendor && blank.name === which.name);
  if (!record) throw new Error(`The catalogue no longer carries ${which.vendor} ${which.name}.`);
  return record;
}

/** The six boards, in the order they print. */
function boards(catalog: readonly BlankRecord[]): Board[] {
  const presets = BOARD_PRESETS.map((preset) => {
    const fields: DesignSummaryFields = {
      ...presetDesignFields(preset),
      railsImportFoilThickness: true,
      volume: DEFAULT_VOLUME_SPEC,
    };
    const blank = fields.blank!;
    return {
      title: `${preset.name} preset — ${blank.copy.vendor} ${blank.copy.name}, ${formatMark(blank.placement, "imperial")} off centre`,
      file: `preset-${preset.id}.csv`,
      fields,
    };
  });

  const firstBoard: Board = {
    title: "The first board a visitor sees — no blank",
    file: "first-board.csv",
    fields: {
      outline: DEFAULT_BOARD_SPEC.outline,
      rails: DEFAULT_RAIL_BAND_SPEC,
      foil: DEFAULT_FOIL_SPEC,
      railsImportFoilThickness: true,
      volume: DEFAULT_VOLUME_SPEC,
      rocker: DEFAULT_FALLBACK_ROCKER,
      blank: null,
    },
  };

  const record = recordOf(catalog, ARCTIC);
  const length = mm(record.lengthMm - inchesToMm(2));
  const arctic: Board = {
    title: `An Arctic board — 2" shorter than ${ARCTIC.vendor} ${ARCTIC.name}, 2 1/2" centre, centred`,
    file: "arctic-9-4-g.csv",
    fields: {
      outline: { ...DEFAULT_BOARD_SPEC.outline, length },
      rails: DEFAULT_RAIL_BAND_SPEC,
      foil: { ...DEFAULT_FOIL_SPEC, center: inchesToMm(2.5) },
      railsImportFoilThickness: true,
      volume: DEFAULT_VOLUME_SPEC,
      rocker: DEFAULT_FALLBACK_ROCKER,
      blank: { copy: record, placement: mm(0), nose12Offset: mm(0), tail12Offset: mm(0), ...DEFAULT_BLANK_CUT },
    },
  };

  return [...presets, firstBoard, arctic];
}

/**
 * The fixture board (D-27): 10'0" — the app's longest — on the Arctic Foam 10'9" LB, slid to the
 * tail end of the slider (`placementRange(...).min`: a positive placement is toward the nose, D-08),
 * a 2 1/2" centre, the default tips and cut, no fine-tunes, both tips on Automatic.
 */
function fixtureBoard(catalog: readonly BlankRecord[]): Board {
  const record = recordOf(catalog, FIXTURE);
  const length = inchesToMm(120);
  return {
    title: `The fixture board — a 10'0" board on ${FIXTURE.vendor} ${FIXTURE.name}, slid to the tail end, 2 1/2" centre`,
    file: "tips-fixture-arctic-10-9-lb.csv",
    fields: {
      outline: { ...DEFAULT_BOARD_SPEC.outline, length },
      rails: DEFAULT_RAIL_BAND_SPEC,
      foil: { ...DEFAULT_FOIL_SPEC, center: inchesToMm(2.5) },
      railsImportFoilThickness: true,
      volume: DEFAULT_VOLUME_SPEC,
      rocker: DEFAULT_FALLBACK_ROCKER,
      blank: {
        copy: record,
        placement: placementRange(record.lengthMm, length).min,
        nose12Offset: mm(0),
        tail12Offset: mm(0),
        ...DEFAULT_BLANK_CUT,
      },
    },
  };
}

/** `2 1/2" (64 mm)` — a mark in Imperial with Metric beside it. */
function both(value: Mm): string {
  return `${formatMark(value, "imperial")} (${formatMark(value, "metric")})`;
}

/** `0.045" (1.1 mm)` — a small move, finer than a sixteenth. */
function fine(value: Mm): string {
  return `${mmToInches(value).toFixed(3)}" (${formatTenthMm(value)} mm)`;
}

function verdict(fits: boolean | null): string {
  return fits === null ? "no blank" : fits ? "fits" : "does not fit";
}

function figureLines(
  board: Board,
  before: BoardFigures,
  after: BoardFigures,
  rulesBefore: DesignRules,
  rulesAfter: DesignRules,
): string[] {
  const move = compareFigures(before, after);
  const lines = [`== ${board.title} ==`, `  board length ${formatMark(board.fields.outline.length, "imperial")}`];
  for (const { key, label } of STATIONS) {
    lines.push(
      `  ${label.padEnd(9)} thickness ${both(before.thicknessMm[key])} → ${both(after.thicknessMm[key])};` +
        ` rocker ${both(before.rockerMm[key])} → ${both(after.rockerMm[key])}`,
    );
  }
  const card = (rules: DesignRules) => formatSummaryLine(summarizeDesignWith(board.fields, rules), "imperial");
  lines.push(
    `  largest move of any of the ten station numbers: ${fine(mm(move.stationMoveMm))}`,
    `  litres ${before.litres.toFixed(3)} → ${after.litres.toFixed(3)} (${move.litresChange >= 0 ? "+" : ""}${(move.litresChange * 100).toFixed(2)}%)`,
    `  card: ${card(rulesBefore)} → ${card(rulesAfter)}`,
  );
  if (board.fields.blank) lines.push(`  in its blank where it sits: ${verdict(before.fits)} → ${verdict(after.fits)}`);
  return lines;
}

/** Every 1/2" from the tail tip, plus the nose tip itself when the steps miss it. */
function sampleStations(length: Mm): Mm[] {
  const out: Mm[] = [];
  for (let i = 0; inchesToMm(i * 0.5) <= length; i++) out.push(inchesToMm(i * 0.5));
  if (out[out.length - 1] !== length) out.push(length);
  return out;
}

function samplesCsv(before: BoardSideProfile, after: BoardSideProfile): string {
  const inches = (value: Mm) => mmToInches(value).toFixed(4);
  const rows = ["station_in,rocker_before_in,rocker_after_in,thickness_before_in,thickness_after_in,deck_before_in,deck_after_in"];
  for (const s of sampleStations(before.length)) {
    rows.push(
      [
        inches(s),
        inches(before.rockerAt(s)),
        inches(after.rockerAt(s)),
        inches(before.thicknessAt(s)),
        inches(after.thicknessAt(s)),
        inches(before.deckAt(s)),
        inches(after.deckAt(s)),
      ].join(","),
    );
  }
  return `${rows.join("\n")}\n`;
}

// ---------------------------------------------------------------------------------------------
// --step tips (plan 14-17): the 12" blend at each tip → the steady taper from each tip's start.
// ---------------------------------------------------------------------------------------------

/** A tip's start: `25 1/2" from the tip (Automatic)`. */
function startPhrase(fromTip: Mm, automatic: boolean): string {
  return `${formatThinningStart(fromTip, "imperial")} from the tip (${automatic ? "Automatic" : "set by hand"})`;
}

/** Where each tip's thinning starts under the live rule, for a board in a blank. */
function startLines(board: Board): string[] {
  const view = boardProfileWith(board.fields, RULES_LIVE).blank;
  if (!view) return [];
  const { nose, tail } = view.tips;
  return [
    `  thinning starts (after): tail ${startPhrase(tail.fromTip, tail.automatic)}; nose ${startPhrase(nose.fromTip, nose.automatic)}`,
  ];
}

/** The fixture board's own extras: the tail every 1/2" over its last 30", and the too-close sentence at 12". */
function fixtureLines(board: Board): string[] {
  const before = boardProfileWith(board.fields, RULES_BEFORE_TIPS);
  const after = boardProfileWith(board.fields, RULES_LIVE);
  const lines = [`  tail thickness every 1/2" over the last 30", from the tail tip — the 12" blend → the steady taper:`];
  for (let i = 0; i <= 60; i++) {
    const s = inchesToMm(i * 0.5);
    lines.push(
      `    ${formatMark(s, "imperial").padStart(7)}  ${formatMark(mm(before.thicknessAt(s)), "imperial").padStart(8)} → ` +
        `${formatMark(mm(after.thicknessAt(s)), "imperial").padEnd(8)} (${fine(mm(before.thicknessAt(s)))} → ${fine(mm(after.thicknessAt(s)))})`,
    );
  }
  const blank = board.fields.blank!;
  const handSet: DesignSummaryFields = { ...board.fields, blank: { ...blank, tailThinningStart: MEASURE_STATION_MM } };
  const tail = boardProfileWith(handSet, RULES_LIVE).blank!.tips.tail;
  lines.push(`  with its tail start set by hand at ${formatThinningStart(MEASURE_STATION_MM, "imperial")}: ${startPhrase(tail.fromTip, tail.automatic)}`);
  for (const system of ["imperial", "metric"] as const) {
    const sentence = thinningStartLine("tail", tail, board.fields.foil.tailTip, system);
    lines.push(`    too-close line (${system}): ${sentence ?? "none — the board runs down fine from there"}`);
  }
  return lines;
}

/** The default 72" board at a 1" centre (D-20): the whole list judged under each rule. */
function thinCentreLines(catalog: readonly BlankRecord[]): string[] {
  const outline = DEFAULT_BOARD_SPEC.outline;
  const geometry = buildOutline(outline);
  const centre = inchesToMm(1);
  const lines = [
    `== The thin-centre board — the default ${formatMark(outline.length, "imperial")} board at a ${formatMark(centre, "imperial")} centre, every blank in the catalogue ==`,
  ];
  const judged = (rules: DesignRules) => {
    const prepared = catalog.filter(isPickable).map((record) => rules.prepare(record));
    const list = listBlanks(
      prepared,
      {
        board: {
          length: outline.length,
          centerThickness: centre,
          noseTip: DEFAULT_FOIL_SPEC.noseTip,
          tailTip: DEFAULT_FOIL_SPEC.tailTip,
          nose12Offset: mm(0),
          tail12Offset: mm(0),
          ...DEFAULT_BLANK_CUT,
          tipRule: rules.tipRule,
        },
        halfWidthAt: (station: Mm) => sampleOutline(geometry, station),
        widePointStation: geometry.widePointStation,
      },
      SETTINGS,
    );
    const runsOut = list.wontFit.filter((verdict) => verdict.worst.kind === "runsOut").length;
    return `${list.fits.length} fit, ${list.wontFit.length} refused (${runsOut} of them because the board runs out of foam)`;
  };
  lines.push(`  the 12" blend: ${judged(RULES_BEFORE_TIPS)}`, `  the steady taper: ${judged(RULES_LIVE)}`);
  return lines;
}

/** The 1/8" grid every stress board is walked on, plus its five stations and centre (as tip-flow.test.ts). */
function stressSamples(length: number): number[] {
  const grid = inchesToMm(1 / 8);
  const out = new Set<number>();
  const steps = Math.floor(length / grid + 1e-9);
  for (let k = 0; k <= steps; k++) out.add(k * grid);
  out.add(length);
  out.add(length / 2);
  for (const { station } of rockerStationPositions(mm(length))) out.add(station);
  return [...out].sort((a, b) => a - b);
}

/** Thinner than its own tip setting by more than this counts (the research's 0.005"). */
const THIN_TOLERANCE_MM = inchesToMm(0.005);
/** A rise toward a tip worth counting: 1/64", as tip-flow.test.ts. */
const RISE_TOLERANCE_MM = inchesToMm(1 / 64);

interface StressMeasure {
  buildable: boolean;
  blank: string;
  thinBefore: boolean;
  thinAfter: boolean;
  riseBefore: boolean;
  riseAfter: boolean;
  newlyPokes: boolean;
  fitsBefore: boolean;
  fitsAfter: boolean;
  /** Each tip's start under the live rule, tail then nose. */
  starts: [number, number];
  /** For each tip whose start is further in than 12": its 12" thickness, after less before. */
  twelveRises: number[];
}

function measureStress(before: StressCase, after: StressCase): StressMeasure {
  const L = after.board.length;
  const blend = boardOnBlank(before.prepared, { ...before.board, tipRule: RULES_BEFORE_TIPS.tipRule }, before.placement);
  const steady = boardOnBlank(after.prepared, { ...after.board, tipRule: RULES_LIVE.tipRule }, after.placement);
  const samples = stressSamples(L);
  const thin = (onBlank: BoardOnBlank) =>
    samples.some(
      (s) =>
        (s <= L / 2 && onBlank.thicknessAt(s) < after.board.tailTip - THIN_TOLERANCE_MM) ||
        (s >= L / 2 && onBlank.thicknessAt(s) < after.board.noseTip - THIN_TOLERANCE_MM),
    );
  const riseAlong = (onBlank: BoardOnBlank, walk: readonly number[]) => {
    let lowest = Infinity;
    let rise = 0;
    for (const s of walk) {
      const value = onBlank.thicknessAt(s);
      lowest = Math.min(lowest, value);
      rise = Math.max(rise, value - lowest);
    }
    return rise;
  };
  const tailWalk = samples.filter((s) => s <= L / 2).reverse();
  const noseWalk = samples.filter((s) => s >= L / 2);
  const rises = (onBlank: BoardOnBlank) =>
    Math.max(riseAlong(onBlank, tailWalk), riseAlong(onBlank, noseWalk)) > RISE_TOLERANCE_MM;
  const poke = (onBlank: BoardOnBlank, s: number) => Math.max(-onBlank.deckOffAt(s), -onBlank.bottomOffAt(s));
  const fits = (onBlank: BoardOnBlank, entry: StressCase) =>
    fitAt(onBlank, entry.halfWidthAt, entry.widePointStation, SETTINGS).fits;
  const twelveRises: number[] = [];
  if (steady.tips.tail.reachesStation) {
    twelveRises.push(steady.thicknessAt(MEASURE_STATION_MM) - blend.thicknessAt(MEASURE_STATION_MM));
  }
  if (steady.tips.nose.reachesStation) {
    twelveRises.push(steady.thicknessAt(L - MEASURE_STATION_MM) - blend.thicknessAt(L - MEASURE_STATION_MM));
  }
  return {
    buildable: after.buildable,
    blank: `${after.record.vendor} ${after.record.name}`,
    thinBefore: thin(blend),
    thinAfter: thin(steady),
    riseBefore: rises(blend),
    riseAfter: rises(steady),
    newlyPokes: samples.some((s) => poke(steady, s) > FIT_EPSILON_MM && !(poke(blend, s) > FIT_EPSILON_MM)),
    fitsBefore: fits(blend, before),
    fitsAfter: fits(steady, after),
    starts: [steady.tips.tail.fromTip, steady.tips.nose.fromTip],
    twelveRises,
  };
}

/** The summary of one set of stress boards: counts and lengths in inches only. */
function stressLines(heading: string, measures: readonly StressMeasure[]): string[] {
  const starts = measures.flatMap((m) => m.starts);
  const between = (lo: number, hi: number) =>
    starts.filter((w) => w > inchesToMm(lo) + 1e-6 && w <= inchesToMm(hi) + 1e-6).length;
  const furthest = starts.length === 0 ? 0 : Math.max(...starts);
  const rises = measures.flatMap((m) => m.twelveRises).sort((a, b) => a - b);
  const median =
    rises.length === 0
      ? 0
      : rises.length % 2 === 1
        ? rises[(rises.length - 1) / 2]
        : (rises[rises.length / 2 - 1] + rises[rises.length / 2]) / 2;
  const blanksOf = (list: readonly StressMeasure[]) => [...new Set(list.map((m) => m.blank))].sort();
  const risingAfter = measures.filter((m) => m.riseAfter);
  return [
    `-- ${heading}: ${measures.length} boards, ${starts.length} tips --`,
    `  where the tips start (after): at 12" ${starts.filter((w) => w <= MEASURE_STATION_MM + 1e-6).length}; ` +
      `12-18" ${between(12, 18)}; 18-24" ${between(18, 24)}; 24-36" ${between(24, 36)}; ` +
      `further than 36" ${starts.filter((w) => w > inchesToMm(36) + 1e-6).length}; furthest ${formatMark(mm(furthest), "imperial")}; ` +
      `boards whose two tips start differently ${measures.filter((m) => m.starts[0] !== m.starts[1]).length}`,
    `  tips starting further in than 12": ${rises.length}; their 12" thickness rises by a median ` +
      `${fine(mm(median))}, at most ${fine(mm(rises.length === 0 ? 0 : rises[rises.length - 1]))}; ` +
      `rising ${rises.filter((r) => r > 0).length} of ${rises.length}`,
    `  boards thinner anywhere than their own tip setting (by more than 0.005"): ` +
      `${measures.filter((m) => m.thinBefore).length} → ${measures.filter((m) => m.thinAfter).length}`,
    `  boards that get thicker toward a tip (by more than 1/64"): ` +
      `${measures.filter((m) => m.riseBefore).length} on ${blanksOf(measures.filter((m) => m.riseBefore)).length} blanks → ` +
      `${risingAfter.length}${risingAfter.length === 0 ? "" : `, all on: ${blanksOf(risingAfter).join(", ")}`}`,
    `  boards newly poking out of their blank: ${measures.filter((m) => m.newlyPokes).length}`,
    `  where they sit: fit ${measures.filter((m) => m.fitsBefore).length} → ${measures.filter((m) => m.fitsAfter).length}; ` +
      `newly refused ${measures.filter((m) => m.fitsBefore && !m.fitsAfter).length}; ` +
      `newly fitting ${measures.filter((m) => !m.fitsBefore && m.fitsAfter).length}`,
  ];
}

/** The tips step's whole printout (and its CSVs under --samples). */
function tipsStep(catalog: readonly BlankRecord[], outDir: string | undefined): string[] {
  const out: string[] = [
    `Phase 14 — the 12" blend at each tip → the steady taper from each tip's Thinning Start (station numbers and litres)`,
    "",
  ];
  for (const board of [...boards(catalog), fixtureBoard(catalog)]) {
    const before = boardFigures(board.fields, RULES_BEFORE_TIPS, SETTINGS);
    const after = boardFigures(board.fields, RULES_LIVE, SETTINGS);
    out.push(...figureLines(board, before, after, RULES_BEFORE_TIPS, RULES_LIVE), ...startLines(board));
    if (board.file.startsWith("tips-fixture")) out.push(...fixtureLines(board));
    out.push("");
    if (outDir) {
      const csv = samplesCsv(boardProfileWith(board.fields, RULES_BEFORE_TIPS), boardProfileWith(board.fields, RULES_LIVE));
      writeFileSync(path.join(outDir, board.file.startsWith("tips-") ? board.file : `tips-${board.file}`), csv);
    }
  }

  out.push(...thinCentreLines(catalog), "");

  // The stress set (D-27), built once per rule's own preparation and paired board by board.
  const beforeSet = new Map(buildStressSet(catalog, RULES_BEFORE_TIPS.prepare).map((entry) => [entry.label, entry]));
  const measures = buildStressSet(catalog, RULES_LIVE.prepare).map((after) => {
    const before = beforeSet.get(after.label);
    if (!before) throw new Error(`The two rules built different test boards (${after.label}).`);
    return measureStress(before, after);
  });
  out.push(
    `== The stress set (D-27) — every pickable blank, a board 2" shorter, four centres, slid to either end and centred ==`,
    ...stressLines("the set as defined", measures),
    ...stressLines(`the boards the app can build (no longer than ${formatMark(inchesToMm(120), "imperial")})`, measures.filter((m) => m.buildable)),
  );
  if (outDir) out.push("", `curve samples written to ${outDir}`);
  return out;
}

async function main(): Promise<void> {
  const { step, samples } = parseArgs(process.argv.slice(2));
  if (step !== "curves" && step !== "tips") {
    console.error(
      step === undefined
        ? "Say which go-live to compare: --step curves or --step tips."
        : `There are no before-and-after figures for "${step}" — the two steps this script knows are "curves" and "tips".`,
    );
    process.exitCode = 1;
    return;
  }

  const outDir = samples === undefined ? undefined : path.resolve(process.cwd(), samples);
  if (outDir) mkdirSync(outDir, { recursive: true });
  const catalog = readSeedCatalog();

  if (step === "tips") {
    console.log(tipsStep(catalog, outDir).join("\n").trimEnd());
    return;
  }

  const out: string[] = ["Phase 14 — today's curves → the new curves (station numbers and litres)", ""];
  for (const board of boards(catalog)) {
    const before = boardFigures(board.fields, RULES_BEFORE_CURVES, SETTINGS);
    const after = boardFigures(board.fields, RULES_LIVE, SETTINGS);
    out.push(...figureLines(board, before, after, RULES_BEFORE_CURVES, RULES_LIVE), "");
    if (outDir) {
      const csv = samplesCsv(boardProfileWith(board.fields, RULES_BEFORE_CURVES), boardProfileWith(board.fields, RULES_LIVE));
      writeFileSync(path.join(outDir, board.file), csv);
    }
  }
  if (outDir) out.push(`curve samples written to ${outDir}`);
  console.log(out.join("\n").trimEnd());
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
