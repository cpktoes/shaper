/**
 * CHECKS EVERY SAVED BOARD STILL OPENS — a read-only proof for Phase 12 (SPEC R9, D-07, D-14) that
 * the new way of cutting a board from its blank leaves every board a shaper has already saved intact:
 *
 * - every saved board parses (`parseSnapshot`, the same read the rack and every screen use) and its
 *   rack numbers — length, width, centre thickness, litres — can be worked out (`summarizeDesign`);
 * - every board saved under Phase 11 with a blank reopens with the five station thicknesses Phase 11
 *   showed: tail tip, tail 12", centre, nose 12" and nose tip. Phase 11's numbers are computed here
 *   from the STORED board — its tips and centre as saved, its two 12" values from Phase 11's own
 *   formula (`phase11TwelveInch`, pinned to tag v1.3 by a golden file) — never typed in, and the
 *   carried-over board's five are read off `buildBoardProfile`, the one side profile every screen
 *   reads. They must print identically in BOTH systems (Imperial 1/16", Metric whole mm).
 *
 * It also reports, for information only, how many carried boards no longer fit where they sit in
 * their blank under the new cut. The founder accepted that (D-14): such a board opens flagged
 * "doesn't fit" with the fix offered on ROCKER, and nothing about it fails this check.
 *
 * It writes nothing — one select, nothing else. A board is only re-stored in the new shape when the
 * shaper next saves, renames or duplicates it, and then with the same five numbers. It prints
 * exactly three lines:
 *   saved boards: N (v1 a, v2 b, v3 c, v4 d, v5 e); open: k of N
 *   Phase 11 boards with a blank: m; five station thicknesses kept: j of m
 *   carried boards that no longer fit where they sit: f of m
 * and exits 1 when a board does not open (k < N) or a Phase 11 board's five numbers moved (j < m),
 * printing only the failing boards' row ids. Never a snapshot, a board name, a user id or the
 * connection string. When the check itself fails (the database can't be reached, say) it prints one
 * fixed sentence with the error's kind and code only — never the driver's message, which can name
 * the database host — unless `--verbose` is added to the command, which appends that message for
 * debugging.
 *
 * Commands (D-20: nothing in package.json — no npm script, no dependency; `--no-install` means npx
 * can only ever run the tsx already in node_modules, never download one):
 *
 *   development, from the main checkout (reads .env.local — the Neon development branch):
 *     npx --no-install tsx scripts/check-saved-boards.ts
 *   development, from a worktree (names the main checkout's env file):
 *     CHECK_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install tsx scripts/check-saved-boards.ts
 *   production — the founder only (plan 12-10). The production env is pulled to a temporary file and
 *   deleted on exit:
 *     bash -c 'trap "rm -f .env.production.pull" EXIT; npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-saved-boards.ts'
 *
 * Which env file is read is controlled by `CHECK_ENV_FILE` (default `.env.local`, resolved from the
 * current directory), exactly as scripts/check-preference-columns.ts: when the file exists, any
 * DATABASE_URL / DATABASE_URL_UNPOOLED already in the shell is dropped first, because
 * `process.loadEnvFile` never overwrites a variable that already exists. The database client reads
 * DATABASE_URL the moment it loads, so it is imported only after the env file is loaded.
 */

import { existsSync } from "node:fs";
import path from "node:path";

async function main(): Promise<void> {
  const envFile = path.resolve(process.cwd(), process.env.CHECK_ENV_FILE ?? ".env.local");
  if (existsSync(envFile)) {
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_URL_UNPOOLED;
    process.loadEnvFile(envFile);
  } else if (process.env.CHECK_ENV_FILE) {
    throw new Error(`CHECK_ENV_FILE names ${process.env.CHECK_ENV_FILE}, which does not exist`);
  }
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "no DATABASE_URL — run this from the project folder that holds .env.local, or set CHECK_ENV_FILE",
    );
  }

  // Relative imports on purpose: the script always uses the lib/ files that sit next to it. The
  // database client is imported only now, after the env file is loaded.
  const { db } = await import("../lib/db/client");
  const { models } = await import("../lib/db/schema");
  const { designSnapshotSchema, hasPhase11Blank, parseSnapshot } = await import("../lib/models/design-snapshot");
  const { summarizeDesign } = await import("../lib/geometry/design");
  const { buildBoardProfile } = await import("../lib/geometry/board-profile");
  const { clampPlacement, nearestFittingPlacement, prepareBlank } = await import("../lib/geometry/blank-fit");
  const { phase11TwelveInch } = await import("../lib/geometry/phase11-foil");
  const { buildOutline, sampleOutline } = await import("../lib/geometry/outline");
  const { formatMark } = await import("../lib/geometry/measure-display");
  const { mm, UNITS_SYSTEMS } = await import("../lib/geometry/units");
  const { DEFAULT_FIT_DEFAULTS, toFitSettings } = await import("../lib/fit-defaults-preference");

  type Mm = import("../lib/geometry/units").Mm;
  type FoilStationKey = import("../lib/geometry/foil").FoilStationKey;
  type BoardBlank = import("../lib/geometry/blank").BoardBlank;

  const STATION_KEYS: readonly FoilStationKey[] = ["tailTip", "tail12", "center", "nose12", "noseTip"];
  const fitSettings = toFitSettings(DEFAULT_FIT_DEFAULTS);

  // Read-only: one select of every saved board's id and snapshot, nothing else.
  const rows = await db.select({ id: models.id, snapshot: models.snapshot }).from(models);

  const versions = new Map<number, number>();
  let opened = 0;
  const notOpened: string[] = [];
  let phase11Boards = 0;
  let kept = 0;
  const moved: string[] = [];
  let noLongerFits = 0;

  for (const row of rows) {
    const version = (row.snapshot as { version?: unknown } | null)?.version;
    if (typeof version === "number") versions.set(version, (versions.get(version) ?? 0) + 1);
    const phase11 = hasPhase11Blank(row.snapshot);
    if (phase11) phase11Boards++;

    let parsed: ReturnType<typeof parseSnapshot>;
    try {
      // Pin deck (no Tip Style passed): the Tip Style never moves any of the five thicknesses —
      // design-snapshot.test.ts proves it on every Phase 11 golden case — so one style checks both.
      parsed = parseSnapshot(row.snapshot);
      summarizeDesign(parsed);
      opened++;
    } catch {
      notOpened.push(row.id);
      if (phase11) moved.push(row.id);
      continue;
    }
    if (!phase11) continue;

    try {
      const carried = parsed.blank;
      // The blank exactly as it was stored — its two fine-tunes are the Phase 11 ones.
      const stored = designSnapshotSchema.parse(row.snapshot).design.blank as BoardBlank | null | undefined;
      if (!carried || !stored) {
        // The blank was dropped on open (a board length outside the app's range, WR-05), so the
        // board opens hand-set — its Phase 11 thicknesses are not what it shows.
        moved.push(row.id);
        continue;
      }
      const length = parsed.outline.length;
      const { foil } = parsed;
      const prepared = prepareBlank(carried.copy);

      // What Phase 11 showed at the five stations, worked out from the stored board.
      const phase11Board = {
        length,
        centerThickness: foil.center,
        noseTip: foil.noseTip,
        tailTip: foil.tailTip,
        nose12Offset: mm(stored.nose12Offset),
        tail12Offset: mm(stored.tail12Offset),
      };
      const before: Record<FoilStationKey, Mm> = {
        tailTip: foil.tailTip,
        tail12: phase11TwelveInch(prepared, phase11Board, carried.placement, "tail12"),
        center: foil.center,
        nose12: phase11TwelveInch(prepared, phase11Board, carried.placement, "nose12"),
        noseTip: foil.noseTip,
      };

      // What the carried-over board shows, its cut passed explicitly.
      const profile = buildBoardProfile({
        length,
        rocker: parsed.rocker,
        foil,
        blank: {
          prepared,
          placement: carried.placement,
          nose12Offset: carried.nose12Offset,
          tail12Offset: carried.tail12Offset,
          deckSkin: carried.deckSkin,
          tipStyle: carried.tipStyle,
          fineTuneSurface: carried.fineTuneSurface,
        },
      });

      const same = STATION_KEYS.every((key) =>
        UNITS_SYSTEMS.every(
          (system) => formatMark(profile.effectiveFoil[key], system) === formatMark(before[key], system),
        ),
      );
      if (same) kept++;
      else moved.push(row.id);

      // Informational (D-14 accepts it): does the carried board still fit where it sits?
      const outlineGeometry = buildOutline(parsed.outline);
      const ctx = {
        board: {
          length,
          centerThickness: foil.center,
          noseTip: foil.noseTip,
          tailTip: foil.tailTip,
          nose12Offset: carried.nose12Offset,
          tail12Offset: carried.tail12Offset,
          deckSkin: carried.deckSkin,
          tipStyle: carried.tipStyle,
          fineTuneSurface: carried.fineTuneSurface,
        },
        halfWidthAt: (station: Mm) => sampleOutline(outlineGeometry, station),
        widePointStation: outlineGeometry.widePointStation,
      };
      const where = clampPlacement(carried.placement, prepared.lengthMm, length);
      if (nearestFittingPlacement(prepared, ctx, fitSettings, carried.placement) !== where) noLongerFits++;
    } catch {
      moved.push(row.id);
    }
  }

  const byVersion = [1, 2, 3, 4, 5].map((v) => `v${v} ${versions.get(v) ?? 0}`).join(", ");
  console.log(`saved boards: ${rows.length} (${byVersion}); open: ${opened} of ${rows.length}`);
  console.log(`Phase 11 boards with a blank: ${phase11Boards}; five station thicknesses kept: ${kept} of ${phase11Boards}`);
  console.log(`carried boards that no longer fit where they sit: ${noLongerFits} of ${phase11Boards}`);

  if (notOpened.length > 0) console.log(`boards that do not open: ${notOpened.join(", ")}`);
  if (moved.length > 0) console.log(`Phase 11 boards whose five thicknesses moved: ${moved.join(", ")}`);
  if (opened < rows.length || kept < phase11Boards) process.exitCode = 1;
}

/**
 * A failure in words that never quote the database driver: its own message can name the database
 * host (`getaddrinfo ENOTFOUND ep-…neon.tech`), so by default only the error's kind (`name`) and
 * its `code`, when it has one, are printed. `--verbose` appends the driver's message for debugging.
 */
function describeFailure(error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  const rawCode =
    typeof error === "object" && error !== null && "code" in error ? (error as { code: unknown }).code : undefined;
  const kind = rawCode === undefined || rawCode === null ? name : `${name}, code ${String(rawCode)}`;
  if (process.argv.includes("--verbose")) {
    return `(${kind}): ${error instanceof Error ? error.message : String(error)}`;
  }
  return `(${kind}). Run again with --verbose to see the database driver's own message.`;
}

main().catch((error: unknown) => {
  console.error(`Could not check the saved boards ${describeFailure(error)}`);
  process.exitCode = 1;
});
