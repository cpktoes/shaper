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
 * `--thin-tips` (Phase 13 item 4, read-only, counts only): one more line after the usual three —
 *   saved boards with a thickness under {floor}: k of N (a tip under it: t)
 * {floor} is the fit check's own floor (`MIN_FOIL_THICKNESS_MM`, formatted). N is every board that
 * opens; k counts a board any of whose five stored foil values sits under the floor; t counts, of
 * those, the ones whose nose or tail tip does. Never changes the exit code.
 *
 * `--curves-report` (Phase 14 D-18, read-only, counts and maxima only): after the lines above, how
 * far every saved board's numbers move when its curves are drawn the new way. Each board that opens
 * is worked out twice through `lib/geometry/before-after.ts` — under the curves the site drew before
 * Phase 14 and under the live ones — and the moves are summed in two groups, boards in a blank and
 * hand-set boards: how many were compared, the largest move of any of the ten station numbers (five
 * thicknesses, five rocker numbers), how many move more than 1/16" and more than 1/32", the median
 * and largest litres change in percent and how many move more than 1%, and how many "fits" verdicts
 * go from fits to refused and from refused to fits. Phase 11 boards are left to the five-thicknesses
 * line above. It never prints a board, a board name, a user id or the connection string, and never
 * changes the exit code; a board the comparison cannot work out is counted, never described.
 *
 * `--tips-report` (Phase 14 D-18, read-only, counts and maxima only): the same comparison for the
 * second go-live, how each tip is thinned. Each board that opens is worked out twice — under the
 * rules live after the first go-live (the new curves with today's 12" blend at the tips,
 * `RULES_BEFORE_TIPS`) and under the live ones (the steady taper from each tip's Thinning Start,
 * `RULES_LIVE`) — with every board's own stored starts. It prints the same summary lines for boards
 * in a blank and for hand-set boards, plus two tips lines for the boards in a blank: how many have a
 * tip whose thinning starts further in than 12", and the largest rise of a 12" thickness. Phase 11
 * boards are left to the five-thicknesses line above. Like the curves report it never prints a
 * board, a board name, a user id or the connection string, and never changes the exit code. Both
 * flags may be given together.
 *
 * `--rack-report` (Phase 15 D-13, read-only, counts and board ids only): the founder's check before
 * the Board Rack goes live that the rack can draw every board saved on the site. Every account's
 * boards are run through exactly what the home page runs for that shaper (`rackReport` in
 * lib/models/rack-report.ts: `rackModelsAndDrops`, its parse and its rack picture), with the
 * shaper's own Tip Style for a rack holding a Phase 11 board — read from their account and resolved
 * by the page's own rule (`carryOverTipStyle`; code review IN-06). The one input the page has that
 * this cannot is the shaper's browser cookie, so a Tip Style picked signed out and never saved to the
 * account reads as the account has it. Three more lines are printed:
 *   saved boards: N; the rack can draw: k of N
 *   accounts with saved boards: A; boards per account: n1, n2, ...
 *   boards the rack would leave out: <ids>        (or: none)
 * and, only when an account's Tip Style could not be read (the page then falls back the same way):
 *   Tip Styles that could not be read (Pin deck used): n
 * The boards-per-account counts are sorted from most to fewest and carry no ids: the owner column is
 * read only to group and count, and is never printed. It never prints a board name, a snapshot, a user id or
 * the connection string, and the rack's own per-board log is silenced. It exits 1 only when a board
 * that opens in the check above is left out by the rack — a board that already does not open is
 * that check's failure, not this one's.
 *
 * Commands (D-20: nothing in package.json — no npm script, no dependency; `--no-install` means npx
 * can only ever run the tsx already in node_modules, never download one):
 *
 *   development, from the main checkout (reads .env.local — the Neon development branch):
 *     npx --no-install tsx scripts/check-saved-boards.ts
 *     npx --no-install tsx scripts/check-saved-boards.ts --thin-tips
 *   development, from a worktree (names the main checkout's env file):
 *     CHECK_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install tsx scripts/check-saved-boards.ts
 *   production — the founder only (plan 12-10). The production env is pulled to a temporary file and
 *   deleted on exit:
 *     bash -c 'trap "rm -f .env.production.pull" EXIT; npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-saved-boards.ts --thin-tips'
 *   production, the curves report — the founder only (plan 14-07), the same temporary-file recipe:
 *     bash -c 'trap "rm -f .env.production.pull" EXIT; npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-saved-boards.ts --curves-report'
 *   production, the tips report — the founder only (plan 14-18), the same temporary-file recipe:
 *     bash -c 'trap "rm -f .env.production.pull" EXIT; npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-saved-boards.ts --tips-report'
 *   production, the rack report — the founder only (plan 15-13), the same temporary-file recipe:
 *     bash -c 'trap "rm -f .env.production.pull" EXIT; npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-saved-boards.ts --rack-report'
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
  const {
    clampPlacement,
    FIT_EPSILON_MM,
    MIN_FOIL_THICKNESS_MM,
    nearestFittingPlacement,
    prepareBlank,
    thinningStartsOf,
  } = await import("../lib/geometry/blank-fit");
  const { phase11TwelveInch } = await import("../lib/geometry/phase11-foil");
  const { buildOutline, sampleOutline } = await import("../lib/geometry/outline");
  const { formatMark } = await import("../lib/geometry/measure-display");
  const { mm, UNITS_SYSTEMS } = await import("../lib/geometry/units");
  const { DEFAULT_FIT_DEFAULTS, carryOverTipStyle, toFitSettings } = await import("../lib/fit-defaults-preference");
  const { readFitDefaultsPreference } = await import("../lib/db/queries");
  const {
    boardFigures,
    compareFigures,
    movesReportLines,
    RULES_BEFORE_CURVES,
    RULES_BEFORE_TIPS,
    RULES_LIVE,
    summarizeMoves,
    tipsReportLines,
  } = await import("../lib/geometry/before-after");
  const { accountsNeedingTipStyle, rackReport } = await import("../lib/models/rack-report");

  type Mm = import("../lib/geometry/units").Mm;
  type TipStyle = import("../lib/geometry/blank").TipStyle;
  type FitDefaultsPreference = import("../lib/fit-defaults-preference").FitDefaultsPreference;
  type FoilStationKey = import("../lib/geometry/foil").FoilStationKey;
  type BoardBlank = import("../lib/geometry/blank").BoardBlank;

  const STATION_KEYS: readonly FoilStationKey[] = ["tailTip", "tail12", "center", "nose12", "noseTip"];
  const fitSettings = toFitSettings(DEFAULT_FIT_DEFAULTS);
  const thinTipsFlag = process.argv.includes("--thin-tips");
  const curvesReportFlag = process.argv.includes("--curves-report");
  const tipsReportFlag = process.argv.includes("--tips-report");
  const rackReportFlag = process.argv.includes("--rack-report");
  const floor = MIN_FOIL_THICKNESS_MM - FIT_EPSILON_MM;

  // Read-only: one select of every saved board's id, owner and snapshot, nothing else. The owner
  // column is read only so `--rack-report` can count boards per account; it is never printed.
  const rows = await db.select({ id: models.id, clerkUserId: models.clerkUserId, snapshot: models.snapshot })
    .from(models);

  const versions = new Map<number, number>();
  let opened = 0;
  let thinBoards = 0;
  let thinTipBoards = 0;
  const notOpened: string[] = [];
  let phase11Boards = 0;
  let kept = 0;
  const moved: string[] = [];
  let noLongerFits = 0;
  type BoardMove = import("../lib/geometry/before-after").BoardMove;
  const blankMoves: BoardMove[] = [];
  const handSetMoves: BoardMove[] = [];
  let notCompared = 0;
  const tipsBlankMoves: BoardMove[] = [];
  const tipsHandSetMoves: BoardMove[] = [];
  let tipsNotCompared = 0;

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

    // --thin-tips (Phase 13 item 4): counts only, never affects the exit code.
    if (STATION_KEYS.some((key) => parsed.foil[key] < floor)) {
      thinBoards++;
      if (parsed.foil.noseTip < floor || parsed.foil.tailTip < floor) thinTipBoards++;
    }

    // --curves-report (Phase 14 D-18): counts only, never affects the exit code. Phase 11 boards
    // are the five-thicknesses line's job, not this report's.
    if (curvesReportFlag && !phase11) {
      try {
        const move = compareFigures(
          boardFigures(parsed, RULES_BEFORE_CURVES, fitSettings),
          boardFigures(parsed, RULES_LIVE, fitSettings),
        );
        (parsed.blank ? blankMoves : handSetMoves).push(move);
      } catch {
        notCompared++;
      }
    }
    // --tips-report (Phase 14 D-18): the same, from the 12" blend to the steady taper. `boardFigures`
    // reads each board's own stored Thinning Starts. Counts only, never affects the exit code.
    if (tipsReportFlag && !phase11) {
      try {
        const move = compareFigures(
          boardFigures(parsed, RULES_BEFORE_TIPS, fitSettings),
          boardFigures(parsed, RULES_LIVE, fitSettings),
        );
        (parsed.blank ? tipsBlankMoves : tipsHandSetMoves).push(move);
      } catch {
        tipsNotCompared++;
      }
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
          ...thinningStartsOf(carried),
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
          ...thinningStartsOf(carried),
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
  if (thinTipsFlag) {
    console.log(
      `saved boards with a thickness under ${formatMark(MIN_FOIL_THICKNESS_MM, "imperial")}: ${thinBoards} of ${opened} ` +
        `(a tip under it: ${thinTipBoards})`,
    );
  }
  if (curvesReportFlag) {
    for (const line of movesReportLines("Boards in a blank, today's curves → the new curves", summarizeMoves(blankMoves))) {
      console.log(line);
    }
    for (const line of movesReportLines("Hand-set boards, today's curves → the new curves", summarizeMoves(handSetMoves))) {
      console.log(line);
    }
    console.log("Phase 11 boards are covered by the five-thicknesses line above, not counted here");
    if (notCompared > 0) console.log(`boards the curves report could not compare: ${notCompared}`);
  }
  if (tipsReportFlag) {
    const tipsBlank = summarizeMoves(tipsBlankMoves);
    for (const line of movesReportLines("Boards in a blank, the 12\" blend → the steady taper", tipsBlank)) {
      console.log(line);
    }
    for (const line of tipsReportLines(tipsBlank)) console.log(line);
    for (const line of movesReportLines(
      "Hand-set boards, the 12\" blend → the steady taper",
      summarizeMoves(tipsHandSetMoves),
    )) {
      console.log(line);
    }
    console.log("Phase 11 boards are covered by the five-thicknesses line above, not counted here");
    if (tipsNotCompared > 0) console.log(`boards the tips report could not compare: ${tipsNotCompared}`);
  }

  // --rack-report (Phase 15 D-13): the home page's own path, account by account, with each account's
  // own Tip Style (code review IN-06). The name is never read (an empty one is passed) and the rack's
  // per-board log is silenced, so nothing about a board but its id can reach this terminal; an
  // account id is only ever a key in the Tip Style lookup, never printed.
  let rackLeavesOutAnOpeningBoard = false;
  if (rackReportFlag) {
    const tipStyles = new Map<string, TipStyle>();
    let tipStylesUnread = 0;
    for (const account of accountsNeedingTipStyle(rows)) {
      let saved: FitDefaultsPreference | null = null;
      try {
        saved = await readFitDefaultsPreference(account);
      } catch {
        // As on the page: a failed read falls back (here, with no cookie, to Pin deck).
        tipStylesUnread += 1;
      }
      tipStyles.set(account, carryOverTipStyle({ signedIn: true, account: saved, browser: null }));
    }
    const report = rackReport(rows, tipStyles);
    console.log(`saved boards: ${report.saved}; the rack can draw: ${report.drawn} of ${report.saved}`);
    console.log(
      `accounts with saved boards: ${report.perAccount.length}; boards per account: ${report.perAccount.length > 0 ? report.perAccount.join(", ") : "none"}`,
    );
    console.log(`boards the rack would leave out: ${report.dropped.length > 0 ? report.dropped.join(", ") : "none"}`);
    if (tipStylesUnread > 0) console.log(`Tip Styles that could not be read (Pin deck used): ${tipStylesUnread}`);
    const didNotOpen = new Set(notOpened);
    rackLeavesOutAnOpeningBoard = report.dropped.some((id) => !didNotOpen.has(id));
  }

  if (notOpened.length > 0) console.log(`boards that do not open: ${notOpened.join(", ")}`);
  if (moved.length > 0) console.log(`Phase 11 boards whose five thicknesses moved: ${moved.join(", ")}`);
  if (opened < rows.length || kept < phase11Boards || rackLeavesOutAnOpeningBoard) process.exitCode = 1;
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
