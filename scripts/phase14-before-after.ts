/**
 * THE FOUNDER'S BEFORE-AND-AFTER FIGURES for each Phase 14 go-live (D-15): how the boards the
 * founder was told would move change, station numbers and litres, old curves against new.
 *
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/phase14-before-after.ts --step curves
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/phase14-before-after.ts --step curves --samples <dir>
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
 * `--samples <dir>` also writes one CSV per board into <dir> (created if missing) — a station every
 * 1/2" from the tail tip plus the nose tip, with the rocker, thickness and deck before and after,
 * all in inches — the curves the pictures are drawn from. Nothing is written anywhere else.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { DEFAULT_FIT_DEFAULTS, toFitSettings } from "@/lib/fit-defaults-preference";
import {
  boardFigures,
  boardProfileWith,
  compareFigures,
  RULES_BEFORE_CURVES,
  RULES_LIVE,
  type BoardFigures,
} from "@/lib/geometry/before-after";
import { DEFAULT_BLANK_CUT } from "@/lib/geometry/blank";
import { DEFAULT_BOARD_SPEC } from "@/lib/geometry/board";
import type { BoardSideProfile } from "@/lib/geometry/board-profile";
import { summarizeDesignWith, type DesignRules, type DesignSummaryFields } from "@/lib/geometry/design";
import { DEFAULT_FOIL_SPEC, type FoilStationKey } from "@/lib/geometry/foil";
import { formatMark } from "@/lib/geometry/measure-display";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { DEFAULT_RAIL_BAND_SPEC } from "@/lib/geometry/rail-bands";
import { DEFAULT_FALLBACK_ROCKER } from "@/lib/geometry/rocker";
import { formatSummaryLine } from "@/lib/geometry/summary-line";
import { formatTenthMm, inchesToMm, mm, mmToInches, type Mm } from "@/lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "@/lib/geometry/volume";

const SETTINGS = toFitSettings(DEFAULT_FIT_DEFAULTS);
const STATIONS: readonly { key: FoilStationKey; label: string }[] = [
  { key: "tailTip", label: "tail tip" },
  { key: "tail12", label: "tail 12\"" },
  { key: "center", label: "centre" },
  { key: "nose12", label: "nose 12\"" },
  { key: "noseTip", label: "nose tip" },
];
const ARCTIC = { vendor: "Arctic Foam", name: `9'4" G` } as const;

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

/** The six boards, in the order they print. */
function boards(): Board[] {
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

  const record = readSeedCatalog().find((blank) => blank.vendor === ARCTIC.vendor && blank.name === ARCTIC.name);
  if (!record) throw new Error(`The catalogue no longer carries ${ARCTIC.vendor} ${ARCTIC.name}.`);
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

function figureLines(board: Board, before: BoardFigures, after: BoardFigures): string[] {
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
    `  card: ${card(RULES_BEFORE_CURVES)} → ${card(RULES_LIVE)}`,
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

async function main(): Promise<void> {
  const { step, samples } = parseArgs(process.argv.slice(2));
  if (step !== "curves") {
    console.error(
      step === undefined
        ? "Say which go-live to compare: --step curves."
        : `There are no before-and-after figures for "${step}" yet — the one step this script knows is "curves".`,
    );
    process.exitCode = 1;
    return;
  }

  const outDir = samples === undefined ? undefined : path.resolve(process.cwd(), samples);
  if (outDir) mkdirSync(outDir, { recursive: true });

  const out: string[] = ["Phase 14 — today's curves → the new curves (station numbers and litres)", ""];
  for (const board of boards()) {
    const before = boardFigures(board.fields, RULES_BEFORE_CURVES, SETTINGS);
    const after = boardFigures(board.fields, RULES_LIVE, SETTINGS);
    out.push(...figureLines(board, before, after), "");
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
