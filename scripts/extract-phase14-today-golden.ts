/**
 * GENERATED FILE PRODUCER — writes lib/geometry/__fixtures__/phase14-today-golden.json: every number
 * the app shows today about a blank's curves, the four presets, the first board a visitor sees and a
 * slice of the Phase 14 stress set, recorded BEFORE Phase 14 changes how a blank's curves are drawn
 * (Phase 14 D-26, SPEC constraint 2). The output is generated and must never be hand-edited; re-run
 * this script.
 *
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-phase14-today-golden.ts
 *
 * run from the repository root. (Phase 12 D-20: nothing in package.json — no npm script, no
 * dependency; `--no-install` means npx can only run the tsx already in node_modules, never download
 * one. No database is involved: the catalogue is read from the committed CSVs under db/seed/blanks/
 * through the tested reader, `lib/blanks/seed-files.ts`.)
 *
 * It EXECUTES the live site's own code — commit ed39f4a7d47e8db81481b93c3bd7fe0c0e9e2220, what
 * Vercel serves today (D-26) — so every number in the fixture is the app's output, never a
 * transcription of it. That is only true while the code is still that commit's, so before computing
 * anything the script compares every non-test file that commit holds under lib/geometry/,
 * lib/blanks/, db/seed/blanks/ and lib/fit-defaults-preference.ts byte for byte with
 * `git show <commit>:<path>` (listed with `git ls-tree`) and refuses to run if any differs or is
 * missing. Once Phase 14 has changed any of them, regenerate the fixture against that commit itself:
 *
 *   git worktree add ../shaper-today ed39f4a7d47e8db81481b93c3bd7fe0c0e9e2220
 *   cp scripts/extract-phase14-today-golden.ts ../shaper-today/scripts/
 *   cp lib/geometry/__fixtures__/phase14-stress-set.ts ../shaper-today/lib/geometry/__fixtures__/
 *   cp lib/geometry/__fixtures__/phase14-today.ts ../shaper-today/lib/geometry/__fixtures__/
 *   cd ../shaper-today && npx --no-install tsx --tsconfig ./tsconfig.json \
 *     scripts/extract-phase14-today-golden.ts --out <this repo>/lib/geometry/__fixtures__/phase14-today-golden.json
 *
 * What it records (fixture keys):
 * - `blanks`: every blank in the seed catalogue, pickable or not, by value — so the tests rebuild
 *   every blank from the pin, and a later catalogue correction can never move a recorded number.
 * - `curves`: every pickable blank's levelled bottom, thickness and width at each of that curve's own
 *   printed stations and at the midpoint of every interval between them.
 * - `presets`: the four presets on their own blank copies (`presetDesignFields`) — five thicknesses,
 *   five rocker numbers, litres and a 1/2" sweep of rocker and thickness.
 * - `handSet`: the first board a visitor sees (the default hand-set board, no blank) — five
 *   thicknesses, five rocker numbers, litres and a 1" sweep.
 * - `stress`: every 5th board of the stress set (`buildStressSet`) plus every board on a blank whose
 *   thickest printed thickness is not at its C station — five thicknesses, five rocker numbers and
 *   the fit verdict with its worst shortfall.
 * - `hiddenStations`: every US Blanks blank that prints T6 and N6, each curve cut to T0, T12, C, N12
 *   and N0, with today's curve through those five read at every other printed station; identical
 *   curves merged.
 *
 * Every length is millimetres at full precision. Running it twice writes the same bytes.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isPickable } from "@/lib/blanks/catalog";
import { presetBlank, presetDesignFields } from "@/lib/blanks/preset-blanks";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import type { BlankRecord, BlankStation } from "@/lib/geometry/blank";
import { boardOnBlank, fitAt, prepareBlank } from "@/lib/geometry/blank-fit";
import { DEFAULT_BOARD_SPEC } from "@/lib/geometry/board";
import { buildBoardProfile, type BoardSideProfile } from "@/lib/geometry/board-profile";
import { summarizeDesign } from "@/lib/geometry/design";
import { DEFAULT_FOIL_SPEC } from "@/lib/geometry/foil";
import { preparePchip } from "@/lib/geometry/pchip";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { DEFAULT_RAIL_BAND_SPEC } from "@/lib/geometry/rail-bands";
import { DEFAULT_FALLBACK_ROCKER, rockerStationPositions, type RockerStationKey } from "@/lib/geometry/rocker";
import { presetSummary } from "@/lib/geometry/summary-line";
import { inchesToMm, mm, type Mm } from "@/lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "@/lib/geometry/volume";
import { buildStressSet, STRESS_FIT_SETTINGS } from "@/lib/geometry/__fixtures__/phase14-stress-set";

const COMMIT = "ed39f4a7d47e8db81481b93c3bd7fe0c0e9e2220";
const GUARDED_PATHS = ["lib/geometry", "lib/blanks", "db/seed/blanks", "lib/fit-defaults-preference.ts"] as const;
const DEFAULT_OUT = path.resolve(process.cwd(), "lib/geometry/__fixtures__/phase14-today-golden.json");
/**
 * The fixture must stay a reasonable size for a test to import. The plan estimated 450 KB; the
 * content the pin must hold (every blank by value, every interval's midpoint, the stress slice and
 * the hidden-station data) measures about 1.2 MB even with compact points, so the ceiling sits at
 * 1.5 MB — a guard against the file growing by accident, not a target.
 */
const SIZE_LIMIT_BYTES = 1536 * 1024;
/** The five labels the hidden-station test keeps; every other printed station is hidden. */
const KEPT_LABELS = ["T0", "T12", "C", "N12", "N0"] as const;

type FiveStations = Record<RockerStationKey, number>;
type Attribute = "rocker" | "thickness" | "width";
const ATTRIBUTES: readonly Attribute[] = ["rocker", "thickness", "width"];
const STATION_VALUE: Record<Attribute, (station: BlankStation) => Mm | null> = {
  rocker: (station) => station.rockerMm,
  thickness: (station) => station.thicknessMm,
  width: (station) => station.widthMm,
};

function parseOut(argv: readonly string[]): string {
  const at = argv.indexOf("--out");
  if (at === -1) return DEFAULT_OUT;
  const value = argv[at + 1];
  if (!value) throw new Error("--out needs a path.");
  return path.resolve(process.cwd(), value);
}

/**
 * Refuses to run unless every non-test file the live commit holds under the guarded paths is
 * byte-identical on disk — otherwise the fixture would not be recording what the site shows today.
 */
function assertTodaysCode(): void {
  const listed = execFileSync("git", ["ls-tree", "-r", "--name-only", COMMIT, "--", ...GUARDED_PATHS], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const files = listed
    .split("\n")
    .filter((file) => file !== "" && !file.endsWith(".test.ts"));
  if (files.length === 0) throw new Error(`git lists no files under the guarded paths at commit ${COMMIT}.`);
  const recipe =
    `The fixture can only be regenerated against commit ${COMMIT}: run \`git worktree add <dir> ${COMMIT}\`, ` +
    "copy this script into <dir>/scripts/ and lib/geometry/__fixtures__/phase14-stress-set.ts and " +
    "phase14-today.ts into <dir>/lib/geometry/__fixtures__/, and run it there with `--out <this repo's fixture path>`.";
  for (const file of files) {
    const onDiskPath = path.resolve(process.cwd(), file);
    if (!existsSync(onDiskPath)) {
      throw new Error(`${file} is missing here, so this script would not be recording today's numbers. ${recipe}`);
    }
    const atCommit = execFileSync("git", ["show", `${COMMIT}:${file}`], { maxBuffer: 64 * 1024 * 1024 });
    if (!readFileSync(onDiskPath).equals(atCommit)) {
      throw new Error(
        `${file} is not the live site's code (commit ${COMMIT}), so this script would not be recording today's numbers. ${recipe}`,
      );
    }
  }
}

/** A blank record as plain data, every field `BlankRecord` / `BlankStation` carries, in their order. */
function recordByValue(record: BlankRecord): BlankRecord {
  return {
    vendor: record.vendor,
    name: record.name,
    catalogSlug: record.catalogSlug,
    pdfPage: record.pdfPage,
    lengthMm: record.lengthMm,
    deckLengthMm: record.deckLengthMm,
    volumeLitres: record.volumeLitres,
    stations: record.stations.map((station) => ({
      label: station.label,
      fromTailMm: station.fromTailMm,
      rockerMm: station.rockerMm,
      thicknessMm: station.thicknessMm,
      widthMm: station.widthMm,
      flag: station.flag,
    })),
  };
}

/** One attribute's own printed station positions (an empty cell is not a station of that curve). */
function ownStations(record: BlankRecord, attribute: Attribute): number[] {
  return record.stations.filter((station) => STATION_VALUE[attribute](station) !== null).map((s) => s.fromTailMm);
}

/** The station points, then the midpoint of every interval between consecutive station points. */
function curveSamplePositions(stations: readonly number[]): number[] {
  const mids: number[] = [];
  for (let i = 0; i + 1 < stations.length; i++) mids.push((stations[i] + stations[i + 1]) / 2);
  return [...stations, ...mids];
}

function fiveFromProfile(profile: BoardSideProfile): { thicknessMm: FiveStations; rockerMm: FiveStations } {
  const thicknessMm = {} as FiveStations;
  const rockerMm = {} as FiveStations;
  for (const { key, station } of rockerStationPositions(profile.length)) {
    thicknessMm[key] = profile.thicknessAt(station);
    rockerMm[key] = profile.rockerAt(station);
  }
  return { thicknessMm, rockerMm };
}

/** Every `stepIn` inches from the tail tip, plus the nose tip itself when the steps miss it. */
function sweepStations(length: number, stepIn: number): number[] {
  const out: number[] = [];
  for (let i = 0; inchesToMm(i * stepIn) <= length; i++) out.push(inchesToMm(i * stepIn));
  if (out[out.length - 1] !== length) out.push(length);
  return out;
}

function sweep(profile: BoardSideProfile, stepIn: number) {
  return sweepStations(profile.length, stepIn).map((s) => ({
    s,
    rocker: profile.rockerAt(mm(s)),
    thickness: profile.thicknessAt(mm(s)),
  }));
}

/** True when the blank's thickest printed thickness is somewhere other than its C station. */
function thickestNotAtCentre(record: BlankRecord): boolean {
  const centre = record.stations.find((station) => station.label === "C");
  if (!centre || centre.thicknessMm === null) return true;
  let thickest = -Infinity;
  for (const station of record.stations) {
    if (station.thicknessMm !== null) thickest = Math.max(thickest, station.thicknessMm);
  }
  return thickest > centre.thicknessMm;
}

/**
 * `JSON.stringify(value, null, 2)`, except that an object or array holding only plain values (a
 * curve point, a station row, five station numbers, a shortfall) is written compactly on one line.
 * The same full-precision numbers, a third of the size, one point per line; deterministic.
 */
function formatJson(value: unknown, indent: string): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  const members: [string | null, unknown][] = Array.isArray(value)
    ? value.map((item) => [null, item])
    : Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined);
  if (members.length === 0) return Array.isArray(value) ? "[]" : "{}";
  if (members.every(([, item]) => item === null || typeof item !== "object")) return JSON.stringify(value);
  const inner = `${indent}  `;
  const lines = members.map(
    ([key, item]) => `${inner}${key === null ? "" : `${JSON.stringify(key)}: `}${formatJson(item, inner)}`,
  );
  const [open, close] = Array.isArray(value) ? ["[", "]"] : ["{", "}"];
  return `${open}\n${lines.join(",\n")}\n${indent}${close}`;
}

interface HiddenEntry {
  vendor: string;
  name: string;
  mergedCount: number;
  kept: { label: string; x: number; y: number }[];
  hidden: { label: string; x: number; printed: number; pchip: number }[];
}

function hiddenStationEntries(catalogue: readonly BlankRecord[], attribute: Attribute): HiddenEntry[] {
  const entries: HiddenEntry[] = [];
  const byKey = new Map<string, HiddenEntry>();
  for (const record of catalogue) {
    if (record.vendor !== "US Blanks") continue;
    const labels = new Set(record.stations.map((station) => station.label));
    if (!labels.has("T6") || !labels.has("N6")) continue;
    const own = record.stations.flatMap((station) => {
      const value = STATION_VALUE[attribute](station);
      return value === null ? [] : [{ label: station.label, x: station.fromTailMm, y: value }];
    });
    const keptSet = new Set<string>(KEPT_LABELS);
    const kept = own.filter((point) => keptSet.has(point.label));
    if (kept.length !== KEPT_LABELS.length) continue;
    const curve = preparePchip(kept);
    const hidden = own
      .filter((point) => !keptSet.has(point.label))
      .map((point) => ({ label: point.label, x: point.x, printed: point.y, pchip: curve.sample(point.x) }));
    const key = JSON.stringify([kept.map((p) => [p.x, p.y]), hidden.map((p) => [p.x, p.printed])]);
    const seen = byKey.get(key);
    if (seen) {
      seen.mergedCount += 1;
      continue;
    }
    const entry: HiddenEntry = { vendor: record.vendor, name: record.name, mergedCount: 1, kept, hidden };
    byKey.set(key, entry);
    entries.push(entry);
  }
  return entries;
}

async function main() {
  if (!existsSync(path.resolve(process.cwd(), "lib/geometry/blank-fit.ts"))) {
    throw new Error("Run this from the repository root (lib/geometry/blank-fit.ts not found here).");
  }
  const out = parseOut(process.argv.slice(2));
  assertTodaysCode();

  const catalogue = readSeedCatalog();
  const blanks = catalogue.map(recordByValue);

  // Today's three curves of every pickable blank.
  const curves = catalogue.filter(isPickable).map((record) => {
    const prepared = prepareBlank(record);
    const readers: Record<Attribute, (x: number) => number> = {
      rocker: (x) => prepared.rocker.sample(x),
      thickness: (x) => prepared.thickness.sample(x),
      width: (x) => prepared.width.sample(x),
    };
    const entry: Record<string, unknown> = { vendor: record.vendor, name: record.name };
    for (const attribute of ATTRIBUTES) {
      entry[attribute] = curveSamplePositions(ownStations(record, attribute)).map((x) => ({
        x,
        y: readers[attribute](x),
      }));
    }
    return entry;
  });

  // The four presets, each on its own blank copy.
  const presets = BOARD_PRESETS.map((preset) => {
    const fields = presetDesignFields(preset);
    const pick = presetBlank(preset);
    const profile = buildBoardProfile({
      length: fields.outline.length,
      rocker: fields.rocker,
      foil: fields.foil,
      blank: {
        prepared: prepareBlank(fields.blank.copy),
        placement: fields.blank.placement,
        nose12Offset: fields.blank.nose12Offset,
        tail12Offset: fields.blank.tail12Offset,
        deckSkin: fields.blank.deckSkin,
        tipStyle: fields.blank.tipStyle,
        fineTuneSurface: fields.blank.fineTuneSurface,
      },
    });
    return {
      id: preset.id,
      vendor: pick.copy.vendor,
      name: pick.copy.name,
      placementMm: pick.placement,
      boardLengthMm: fields.outline.length,
      ...fiveFromProfile(profile),
      litres: presetSummary(preset).volumeLitres,
      sweep: sweep(profile, 0.5),
    };
  });

  // The first board a visitor sees: the store's default design, no blank (DEFAULT_DESIGN_STATE).
  const handSetProfile = buildBoardProfile({
    length: DEFAULT_BOARD_SPEC.outline.length,
    rocker: DEFAULT_FALLBACK_ROCKER,
    foil: DEFAULT_FOIL_SPEC,
    blank: null,
  });
  const handSet = {
    boardLengthMm: DEFAULT_BOARD_SPEC.outline.length,
    ...fiveFromProfile(handSetProfile),
    litres: summarizeDesign({
      outline: DEFAULT_BOARD_SPEC.outline,
      rails: DEFAULT_RAIL_BAND_SPEC,
      foil: DEFAULT_FOIL_SPEC,
      railsImportFoilThickness: true,
      volume: DEFAULT_VOLUME_SPEC,
      rocker: DEFAULT_FALLBACK_ROCKER,
      blank: null,
    }).volumeLitres,
    sweep: sweep(handSetProfile, 1),
  };

  // A slice of the stress set.
  const stressSet = buildStressSet(catalogue, prepareBlank);
  const labels = new Set<string>();
  for (const stressCase of stressSet) {
    if (labels.has(stressCase.label)) throw new Error(`Two stress boards share the label ${stressCase.label}.`);
    labels.add(stressCase.label);
  }
  const stress = stressSet
    .filter((stressCase, index) => index % 5 === 0 || thickestNotAtCentre(stressCase.record))
    .map((stressCase) => {
      const onBlank = boardOnBlank(stressCase.prepared, stressCase.board, stressCase.placement);
      const thicknessMm = {} as FiveStations;
      const rockerMm = {} as FiveStations;
      for (const { key, station } of rockerStationPositions(stressCase.board.length)) {
        thicknessMm[key] = onBlank.thicknessAt(station);
        rockerMm[key] = onBlank.rockerAt(station);
      }
      const { fits, worst } = fitAt(onBlank, stressCase.halfWidthAt, stressCase.widePointStation, STRESS_FIT_SETTINGS);
      return {
        label: stressCase.label,
        vendor: stressCase.record.vendor,
        name: stressCase.record.name,
        boardLengthMm: stressCase.board.length,
        centerThicknessMm: stressCase.board.centerThickness,
        placementMm: stressCase.placement,
        buildable: stressCase.buildable,
        thicknessMm,
        rockerMm,
        fits,
        worst: { kind: worst.kind, station: worst.station, amount: worst.amount, ...(worst.cause ? { cause: worst.cause } : {}) },
      };
    });

  const hiddenStations = {
    rocker: hiddenStationEntries(catalogue, "rocker"),
    thickness: hiddenStationEntries(catalogue, "thickness"),
    width: hiddenStationEntries(catalogue, "width"),
  };

  const provenance =
    `GENERATED by scripts/extract-phase14-today-golden.ts running the live site's own code (commit ${COMMIT}) ` +
    "over db/seed/blanks/*.csv — never hand-edit; re-run the script";
  const golden = { provenance, commit: COMMIT, blanks, curves, presets, handSet, stress, hiddenStations };
  const text = `${formatJson(golden, "")}\n`;
  if (Buffer.byteLength(text) > SIZE_LIMIT_BYTES) {
    const parts = Object.entries(golden)
      .map(([key, value]) => `${key} ${Math.round(Buffer.byteLength(formatJson(value, "  ")) / 1024)} KB`)
      .join(", ");
    throw new Error(`The fixture would be ${Math.round(Buffer.byteLength(text) / 1024)} KB, over the ${SIZE_LIMIT_BYTES / 1024} KB ceiling (${parts}).`);
  }
  writeFileSync(out, text);

  const hiddenCount = (attribute: Attribute) =>
    `${hiddenStations[attribute].length} curves / ${hiddenStations[attribute].reduce((n, e) => n + e.hidden.length, 0)} hidden stations`;
  console.log(`blanks: ${blanks.length} (${catalogue.filter(isPickable).length} pickable)`);
  console.log(`curves: ${curves.length} blanks`);
  console.log(`presets: ${presets.length} (${presets.map((preset) => `${preset.id} ${preset.sweep.length} sweep points`).join(", ")})`);
  console.log(`handSet: ${handSet.sweep.length} sweep points`);
  console.log(
    `stress: ${stress.length} of ${stressSet.length} boards kept (${stress.filter((entry) => !entry.buildable).length} kept not buildable; ` +
      `${stressSet.filter((entry) => !entry.buildable).length} of the whole set not buildable)`,
  );
  console.log(
    `hiddenStations: rocker ${hiddenCount("rocker")}, thickness ${hiddenCount("thickness")}, width ${hiddenCount("width")}`,
  );
  console.log(`wrote ${path.relative(process.cwd(), out)} (${(Buffer.byteLength(text) / 1024).toFixed(1)} KB)`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
