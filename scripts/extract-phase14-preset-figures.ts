/**
 * GENERATED FILE PRODUCER — writes lib/geometry/__fixtures__/phase14-preset-figures.json: what each
 * of the four preset cards shows, recorded from the LIVE app — its five thicknesses and five rocker
 * numbers off the side profile the board is drawn with, and its litres (`summarizeDesign`, as the card
 * works them out). The output is generated and must never be hand-edited;
 * re-run this script.
 *
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-phase14-preset-figures.ts --step curves
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-phase14-preset-figures.ts --step tips
 *
 * run from the repository root. `--step` is required and names which Phase 14 go-live the record is
 * taken at (D-27): `curves` (go-live 1) or `tips` (go-live 2). Unlike the pin of today's numbers
 * (scripts/extract-phase14-today-golden.ts), this script has no guard on the code it runs: it is
 * MEANT to be re-run against the app as it stands at each go-live, so a card's litres are always
 * re-measured from the app and never typed. (Phase 12 D-20: nothing in package.json — no npm script,
 * no dependency; `--no-install` means npx can only run the tsx already in node_modules. No database
 * is involved: each preset opens on its own blank copy from lib/blanks/preset-blanks.generated.json.)
 *
 * For each preset in BOARD_PRESETS, the board is what clicking the card opens, sitting in the blank
 * it opened in when the Phase 14 records were taken (`recordedPresetDesignFields`, with
 * `railsImportFoilThickness: true` and `DEFAULT_VOLUME_SPEC` as the store's defaults supply) — the
 * same board the record's own test reads, so a preset's later blank pick never rewrites the record
 * (quick 261102-gec; before it this script read the live pick, which disagreed with its test for
 * the Longboard from 2026-10-03, when the Longboard moved to the 9'4"B): its side profile from `buildBoardProfile` on the blank prepared with
 * `prepareBlank` (with any Thinning Starts the preset's blank stores, through `thinningStartsOf` — none
 * today, so both tips read Automatic), `thicknessMm` from that profile's `effectiveFoil` and `rockerMm` from its
 * `stationRocker`, tail tip to nose tip. Every length is millimetres at full precision. Running it
 * twice writes the same bytes.
 */
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { recordedPresetDesignFields } from "@/lib/geometry/__fixtures__/phase14-preset-blanks";
import { thinningStartsOf } from "@/lib/geometry/blank-fit";
import { prepareBoardBlank } from "@/lib/geometry/custom-rocker";
import { buildBoardProfile } from "@/lib/geometry/board-profile";
import type { FoilStationKey } from "@/lib/geometry/foil";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { summarizeDesign } from "@/lib/geometry/design";
import { DEFAULT_VOLUME_SPEC } from "@/lib/geometry/volume";
import { mm, mmToInches } from "@/lib/geometry/units";

const OUTPUT = path.resolve(process.cwd(), "lib/geometry/__fixtures__/phase14-preset-figures.json");
const STEPS = ["curves", "tips"] as const;
type Step = (typeof STEPS)[number];
/** The five stations, tail tip to nose tip — the order every record is written in. */
const KEYS: readonly FoilStationKey[] = ["tailTip", "tail12", "center", "nose12", "noseTip"];

function parseStep(argv: readonly string[]): Step {
  const at = argv.indexOf("--step");
  const value = at === -1 ? undefined : argv[at + 1];
  if (value === undefined) throw new Error("--step is required: --step curves or --step tips.");
  const step = STEPS.find((candidate) => candidate === value);
  if (!step) throw new Error(`--step must be curves or tips, not "${value}".`);
  return step;
}

function inOrder(record: Record<FoilStationKey, number>): Record<FoilStationKey, number> {
  const out = {} as Record<FoilStationKey, number>;
  for (const key of KEYS) out[key] = record[key];
  return out;
}

function main() {
  if (!existsSync(path.resolve(process.cwd(), "lib/geometry/blank-fit.ts"))) {
    throw new Error("Run this from the repository root (lib/geometry/blank-fit.ts not found here).");
  }
  const step = parseStep(process.argv.slice(2));

  const presets = BOARD_PRESETS.map((preset) => {
    // Quick 261102-gec: the board in the blank the record was first taken on — the very board its
    // test reads (`recordedPresetDesignFields`, lib/geometry/__fixtures__/phase14-preset-blanks.ts) —
    // so a preset's later blank pick (the Longboard's, 2026-10-03) never rewrites the record.
    const fields = recordedPresetDesignFields(preset);
    const profile = buildBoardProfile({
      length: fields.outline.length,
      rocker: fields.rocker,
      foil: fields.foil,
      blank: {
        prepared: prepareBoardBlank(fields.blank),
        placement: fields.blank.placement,
        nose12Offset: fields.blank.nose12Offset,
        tail12Offset: fields.blank.tail12Offset,
        deckSkin: fields.blank.deckSkin,
        tipStyle: fields.blank.tipStyle,
        fineTuneSurface: fields.blank.fineTuneSurface,
        ...thinningStartsOf(fields.blank),
      },
    });
    return {
      id: preset.id,
      thicknessMm: inOrder(profile.effectiveFoil),
      rockerMm: inOrder(profile.stationRocker),
      litres: summarizeDesign({ ...fields, railsImportFoilThickness: true, volume: DEFAULT_VOLUME_SPEC }).volumeLitres,
    };
  });

  const provenance =
    `GENERATED by scripts/extract-phase14-preset-figures.ts --step ${step} from the live app ` +
    "(recordedPresetDesignFields, buildBoardProfile on prepareBlank, summarizeDesign) — never hand-edit; re-run the script";
  writeFileSync(OUTPUT, `${JSON.stringify({ provenance, step, presets }, null, 2)}\n`);

  for (const preset of presets) {
    const thickness = KEYS.map((key) => mmToInches(mm(preset.thicknessMm[key])).toFixed(4)).join(" ");
    const rocker = KEYS.map((key) => mmToInches(mm(preset.rockerMm[key])).toFixed(4)).join(" ");
    console.log(`${preset.id}: ${preset.litres.toFixed(2)} L · thickness in ${thickness} · rocker in ${rocker}`);
  }
  console.log(`wrote ${path.relative(process.cwd(), OUTPUT)} (step ${step})`);
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
