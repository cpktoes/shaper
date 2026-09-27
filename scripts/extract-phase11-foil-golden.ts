/**
 * GENERATED FILE PRODUCER — writes lib/geometry/__fixtures__/phase11-foil-golden.json: the foil
 * Phase 11 derived for a set of boards laid on real catalogue blanks — five station thicknesses,
 * five rocker heights and the two un-tweaked 12" thicknesses per board — so that boards saved
 * under Phase 11 can be carried across to Phase 12's cut with their five station numbers exactly
 * as they were (Phase 12 D-07/D-14). The output is generated and must never be hand-edited;
 * re-run this script.
 *
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-phase11-foil-golden.ts
 *
 * run from the repository root. (D-20: nothing in package.json — no npm script, no dependency;
 * `--no-install` means npx can only run the tsx already in node_modules, never download one. No
 * database is involved: the catalogue is read from the committed CSVs under db/seed/blanks/
 * through the tested reader, `lib/blanks/seed-files.ts`.)
 *
 * It EXECUTES Phase 11's own `boardOnBlank`, so every number in the fixture is Phase 11's output,
 * never a transcription of it. That is only true while `lib/geometry/blank-fit.ts` and
 * `lib/geometry/pchip.ts` are still tag v1.3's code, so before computing anything the script
 * compares both files byte-for-byte with `git show v1.3:<path>` and refuses to run if either
 * differs. Once Phase 12 has changed `blank-fit.ts`, regenerate the fixture against v1.3 itself:
 *
 *   git worktree add ../shaper-v13 v1.3
 *   cp scripts/extract-phase11-foil-golden.ts ../shaper-v13/scripts/
 *   cd ../shaper-v13 && npx --no-install tsx --tsconfig ./tsconfig.json \
 *     scripts/extract-phase11-foil-golden.ts --out <this repo>/lib/geometry/__fixtures__/phase11-foil-golden.json
 *
 * The cases, in order: the four presets on their generated picks; a board shaped like the one
 * version-4 board with a blank in the development database; a deterministic sweep of every 4th
 * pickable catalogue blank (off-centre placements and saved fine-tunes included); and two cases
 * where Phase 11's never-below-the-tip guard binds right at the tail 12" station. Running it twice
 * writes the same bytes.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isPickable } from "@/lib/blanks/catalog";
import presetBlanks from "@/lib/blanks/preset-blanks.generated.json";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import type { BlankRecord } from "@/lib/geometry/blank";
import { placementRange, prepareBlank, type PreparedBlank } from "@/lib/geometry/blank-fit";
import { BOARD_LENGTH_RANGE_IN } from "@/lib/geometry/board";
import { MEASURE_STATION_MM } from "@/lib/geometry/outline";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { rockerStationPositions, type RockerStationKey } from "@/lib/geometry/rocker";
import { inchesToMm, mm, mmToInches, type Mm } from "@/lib/geometry/units";

const DEFAULT_OUT = path.resolve(process.cwd(), "lib/geometry/__fixtures__/phase11-foil-golden.json");
const GUARDED_FILES = ["lib/geometry/blank-fit.ts", "lib/geometry/pchip.ts"] as const;
const TAG = "v1.3";

/**
 * Phase 11's `boardOnBlank`, as this script calls it. Declared here rather than imported so the
 * script keeps type-checking after Phase 12 changes `BoardOnBlankInput`; it only ever RUNS against
 * tag v1.3's code, which the guard below enforces.
 */
type Phase11BoardOnBlank = (
  prepared: PreparedBlank,
  board: { length: Mm; centerThickness: Mm; noseTip: Mm; tailTip: Mm; nose12Offset: Mm; tail12Offset: Mm },
  placement: Mm,
) => {
  rockerAt(s: number): number;
  thicknessAt(s: number): number;
  derivedThicknessAt(s: number): number;
};

interface CaseInput {
  label: string;
  vendor: string;
  name: string;
  boardLengthMm: number;
  centerThicknessMm: number;
  noseTipMm: number;
  tailTipMm: number;
  placementMm: number;
  nose12OffsetMm: number;
  tail12OffsetMm: number;
}

type FiveStations = Record<RockerStationKey, number>;

interface GoldenCase extends CaseInput {
  thicknessMm: FiveStations;
  rockerMm: FiveStations;
  derived12Mm: { tail12: number; nose12: number };
}

function parseOut(argv: readonly string[]): string {
  const at = argv.indexOf("--out");
  if (at === -1) return DEFAULT_OUT;
  const value = argv[at + 1];
  if (!value) throw new Error("--out needs a path.");
  return path.resolve(process.cwd(), value);
}

/** Refuses to run unless the files that make Phase 11's foil are byte-identical to tag v1.3's. */
function assertPhase11Code(): void {
  for (const file of GUARDED_FILES) {
    const onDisk = readFileSync(path.resolve(process.cwd(), file));
    const atTag = execFileSync("git", ["show", `${TAG}:${file}`], { maxBuffer: 16 * 1024 * 1024 });
    if (!onDisk.equals(atTag)) {
      throw new Error(
        `${file} is not tag ${TAG}'s code, so this script would not be recording Phase 11's foil. ` +
          `The fixture can only be regenerated against tag ${TAG}: run \`git worktree add <dir> ${TAG}\`, ` +
          `copy this script into <dir>/scripts/, and run it there with \`--out <this repo's fixture path>\`.`,
      );
    }
  }
}

function findRecord(catalogue: readonly BlankRecord[], vendor: string, name: string): BlankRecord {
  const record = catalogue.find((blank) => blank.vendor === vendor && blank.name === name);
  if (!record) throw new Error(`${vendor} ${name} is not in the blank catalogue.`);
  if (!isPickable(record)) throw new Error(`${vendor} ${name} is not a pickable blank.`);
  return record;
}

function buildCases(catalogue: readonly BlankRecord[]): CaseInput[] {
  const cases: CaseInput[] = [];
  const defaultNoseTip = inchesToMm(5 / 16);
  const defaultTailTip = inchesToMm(1 / 4);

  // (a) The four presets on their generated picks, no fine-tune.
  const picks = presetBlanks.picks as Record<string, { vendor: string; name: string; placementMm: number }>;
  for (const preset of BOARD_PRESETS) {
    const pick = picks[preset.id];
    if (!pick) throw new Error(`The ${preset.name} preset has no pick in preset-blanks.generated.json.`);
    cases.push({
      label: `preset:${preset.id}`,
      vendor: pick.vendor,
      name: pick.name,
      boardLengthMm: preset.outline.length,
      centerThicknessMm: preset.foil.center,
      noseTipMm: preset.foil.noseTip,
      tailTipMm: preset.foil.tailTip,
      placementMm: pick.placementMm,
      nose12OffsetMm: 0,
      tail12OffsetMm: 0,
    });
  }

  // (b) Shaped like the one version-4 board with a blank in the development database
  // (12-RESEARCH.md Pattern 5).
  cases.push({
    label: "dev-board",
    vendor: "US Blanks",
    name: `6'8"RP`,
    boardLengthMm: inchesToMm(78),
    centerThicknessMm: inchesToMm(2.5),
    noseTipMm: defaultNoseTip,
    tailTipMm: defaultTailTip,
    placementMm: inchesToMm(5 / 16),
    nose12OffsetMm: 0,
    tail12OffsetMm: 0,
  });

  // (c) Every 4th pickable blank, a board 2" shorter than it. The centre, the placement and the
  // saved fine-tunes each cycle through three values, at different rates, so the sweep mixes them.
  const centres = [inchesToMm(2.25), inchesToMm(2.5), inchesToMm(2.75)];
  const tweaks: [number, number][] = [
    [0, 0],
    [inchesToMm(1 / 16), -inchesToMm(1 / 8)],
    [-inchesToMm(1 / 16), inchesToMm(1 / 8)],
  ];
  const minLength = inchesToMm(BOARD_LENGTH_RANGE_IN.min);
  const maxLength = inchesToMm(BOARD_LENGTH_RANGE_IN.max);
  const pickable = catalogue.filter(isPickable);
  let position = 0;
  for (let index = 0; index < pickable.length; index += 4) {
    const record = pickable[index];
    const boardLength = mm(record.lengthMm - inchesToMm(2));
    if (boardLength < minLength || boardLength > maxLength) continue;
    const range = placementRange(record.lengthMm, boardLength);
    const placements = [range.min, 0, range.max];
    const [nose, tail] = tweaks[Math.floor(position / 9) % 3];
    cases.push({
      label: `sweep:${index}`,
      vendor: record.vendor,
      name: record.name,
      boardLengthMm: boardLength,
      centerThicknessMm: centres[position % 3],
      noseTipMm: defaultNoseTip,
      tailTipMm: defaultTailTip,
      placementMm: placements[Math.floor(position / 3) % 3],
      nose12OffsetMm: nose,
      tail12OffsetMm: tail,
    });
    position++;
  }

  // (d) A tail tip thicker than the scaled foil at the tail 12", so Phase 11's never-below guard
  // binds AT the station, with a positive and a negative tail fine-tune on top.
  const guardBlank = findRecord(catalogue, "Marko Foam", `6'0" M-Regular`);
  for (const [label, tail12Offset] of [
    ["guard:tail-plus", inchesToMm(1 / 8)],
    ["guard:tail-minus", -inchesToMm(1 / 8)],
  ] as const) {
    cases.push({
      label,
      vendor: guardBlank.vendor,
      name: guardBlank.name,
      boardLengthMm: guardBlank.lengthMm,
      centerThicknessMm: inchesToMm(1.75),
      noseTipMm: defaultNoseTip,
      tailTipMm: inchesToMm(1.5),
      placementMm: 0,
      nose12OffsetMm: 0,
      tail12OffsetMm: tail12Offset,
    });
  }
  return cases;
}

async function main() {
  if (!existsSync(path.resolve(process.cwd(), "lib/geometry/blank-fit.ts"))) {
    throw new Error("Run this from the repository root (lib/geometry/blank-fit.ts not found here).");
  }
  const out = parseOut(process.argv.slice(2));
  assertPhase11Code();

  const { boardOnBlank } = (await import("@/lib/geometry/blank-fit")) as unknown as {
    boardOnBlank: Phase11BoardOnBlank;
  };
  const catalogue = readSeedCatalog();
  const golden: GoldenCase[] = [];
  for (const input of buildCases(catalogue)) {
    const prepared = prepareBlank(findRecord(catalogue, input.vendor, input.name));
    const length = mm(input.boardLengthMm);
    const onBlank = boardOnBlank(
      prepared,
      {
        length,
        centerThickness: mm(input.centerThicknessMm),
        noseTip: mm(input.noseTipMm),
        tailTip: mm(input.tailTipMm),
        nose12Offset: mm(input.nose12OffsetMm),
        tail12Offset: mm(input.tail12OffsetMm),
      },
      mm(input.placementMm),
    );
    const thicknessMm = {} as FiveStations;
    const rockerMm = {} as FiveStations;
    for (const { key, station } of rockerStationPositions(length)) {
      thicknessMm[key] = onBlank.thicknessAt(station);
      rockerMm[key] = onBlank.rockerAt(station);
    }
    golden.push({
      ...input,
      thicknessMm,
      rockerMm,
      derived12Mm: {
        tail12: onBlank.derivedThicknessAt(MEASURE_STATION_MM),
        nose12: onBlank.derivedThicknessAt(length - MEASURE_STATION_MM),
      },
    });
    const inches = (value: number) => mmToInches(mm(value)).toFixed(3);
    console.log(
      `${input.label}: ${input.vendor} ${input.name}, board ${inches(input.boardLengthMm)}"` +
        ` — thickness ${rockerStationPositions(length).map(({ key }) => inches(thicknessMm[key])).join(" · ")}`,
    );
  }

  const provenance =
    `GENERATED by scripts/extract-phase11-foil-golden.ts running tag ${TAG}'s own boardOnBlank ` +
    "(Phase 11's foil) over db/seed/blanks/*.csv — never hand-edit; re-run the script";
  writeFileSync(out, `${JSON.stringify({ provenance, cases: golden }, null, 2)}\n`);
  console.log(`wrote ${path.relative(process.cwd(), out)} (${golden.length} cases)`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
