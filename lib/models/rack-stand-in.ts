/**
 * The Board Rack's practice rack for the browser suite (Phase 15, RESEARCH Pattern 8). The suite
 * runs signed out with no database, so it can never see a saved board; this builds stand-in boards
 * from the app's own presets and gates a test-only route, `/test-rack`, that shows the real home
 * screen holding them — one, fifteen or thirty boards, a swallow, hand-set boards and a long name.
 *
 * The route is honoured only outside a production build AND with `SHAPER_RACK_STAND_IN` exactly
 * "1". That flag is set only in `playwright.config.ts`'s `webServer.env`, which
 * `playwright.prod.config.ts` strips, and never in Vercel or any `.env` file. `app/test-rack/page.tsx`
 * passes the literal `process.env.NODE_ENV` (never through a variable), because that literal
 * property access is what Next inlines as the string `"production"` at build time — which is what
 * makes this route provably dead in a real build (T-15-13), proven by `e2e/prod/test-rack.spec.ts`.
 *
 * Pure: no React, browser or database import, and never the blank catalogue's disk reader — the
 * presets' own blanks ship with the app in `preset-blanks`, which is all this reads.
 */
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { inchesToMm } from "@/lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "@/lib/geometry/volume";
import { buildSnapshot, type DesignSnapshotFields } from "./design-snapshot";
import type { RackRow } from "./rack-models";

export const RACK_STAND_IN_ROUTE = "/test-rack";

export const RACK_STAND_IN_ENV = "SHAPER_RACK_STAND_IN";

/** How many boards `/test-rack` holds with no `?boards=` (or an unreadable one). */
export const RACK_STAND_IN_DEFAULT_COUNT = 15;

/** The most boards `/test-rack` will ever hold, however large `?boards=` is (T-15-14). */
export const RACK_STAND_IN_MAX_COUNT = 100;

/** The one board on the practice rack with a name long enough to test how a long name wraps. */
export const STAND_IN_LONG_NAME = "Uncle Bob's Overhead Point Break Rhino Chaser";

/**
 * True only when BOTH are true: `nodeEnv` is not the literal `"production"` string, and `flag` is
 * exactly `"1"` (not `"true"`, not a padded `" 1"`, not anything else). Every other combination —
 * including a real production build with the flag somehow set — is false.
 */
export function rackStandInRouteEnabled(input: { nodeEnv: string | undefined; flag: string | undefined }): boolean {
  return input.nodeEnv !== "production" && input.flag === "1";
}

/**
 * How many boards `?boards=` asks for: a whole number, clamped to 1-100. A repeated `?boards=` reads
 * the first; anything that isn't a plain whole number (missing, empty, "abc", "12abc") is 15.
 */
export function standInBoardCount(param: string | string[] | undefined): number {
  const value = Array.isArray(param) ? param[0] : param;
  if (value === undefined || !/^-?\d+$/.test(value.trim())) return RACK_STAND_IN_DEFAULT_COUNT;
  const count = Number.parseInt(value.trim(), 10);
  return Math.min(RACK_STAND_IN_MAX_COUNT, Math.max(1, count));
}

/**
 * The hand-set boards after the four presets, cycled in this order: which preset each one is a
 * copy of, its length in inches, and its name. `outline.length` is the only thing changed from the
 * preset, and the blank is removed (`blank: null`), so every one is a board the app itself draws.
 * The second slot is the long-named board on the first pass (row 5) and plainly named after that.
 */
const HAND_SET_RECIPES: readonly { preset: number; inches: number; name: string }[] = [
  { preset: 0, inches: 62, name: `Grom Stick 5'2"` },
  { preset: 2, inches: 92, name: `Point Break Mid 7'8"` },
  { preset: 1, inches: 64, name: "Groveler Fish" },
  { preset: 0, inches: 70, name: "Daily Driver" },
  { preset: 0, inches: 78, name: `Step-Up 6'6"` },
  { preset: 2, inches: 84, name: `Weekend Mid 7'0"` },
  { preset: 3, inches: 112, name: `Log 9'4"` },
  { preset: 1, inches: 68, name: `Twin Fish 5'8"` },
  { preset: 2, inches: 96, name: `Egg 8'0"` },
  { preset: 3, inches: 104, name: `Noserider 8'8"` },
  { preset: 0, inches: 74, name: `Summer Board 6'2"` },
  { preset: 3, inches: 100, name: `Cruiser 8'4"` },
];

/** The row index that carries `STAND_IN_LONG_NAME`. */
const LONG_NAME_ROW = 5;

/** The newest stand-in board's save time; each later row is one hour older. */
const NEWEST_SAVE_MS = Date.UTC(2026, 9, 4, 12);

const HOUR_MS = 3_600_000;

/** One stand-in board's design: the preset's own fields plus the defaults a saved board carries. */
function presetFields(presetIndex: number, name: string): DesignSnapshotFields {
  return {
    ...presetDesignFields(BOARD_PRESETS[presetIndex]),
    volume: DEFAULT_VOLUME_SPEC,
    finsImportTemplate: true,
    railsImportFoilThickness: true,
    boardName: name,
    finSystem: "fcs2",
  };
}

/** Row `i`'s name and design: the four presets first, then the hand-set recipes cycled. */
function standInBoard(i: number): { name: string; fields: DesignSnapshotFields } {
  if (i < BOARD_PRESETS.length) {
    const name = BOARD_PRESETS[i].name;
    return { name, fields: presetFields(i, name) };
  }
  const handSetIndex = i - BOARD_PRESETS.length;
  const recipe = HAND_SET_RECIPES[handSetIndex % HAND_SET_RECIPES.length];
  const pass = Math.floor(handSetIndex / HAND_SET_RECIPES.length);
  const name = i === LONG_NAME_ROW ? STAND_IN_LONG_NAME : pass === 0 ? recipe.name : `${recipe.name} #${pass + 1}`;
  const fields = presetFields(recipe.preset, name);
  return {
    name,
    fields: { ...fields, outline: { ...fields.outline, length: inchesToMm(recipe.inches) }, blank: null },
  };
}

/**
 * `count` stand-in saved boards, the newest first: ids `stand-in-01`, `stand-in-02`..., each saved
 * one hour before the last, so the rack's automatic order is the list order. Deterministic — the
 * same count always gives the same boards. Every row passes `rackModelsFromRows` (the same check a
 * real saved board passes), proven for every count from 1 to 100 by `rack-stand-in.test.ts`.
 */
export function standInRackRows(count: number): RackRow[] {
  return Array.from({ length: count }, (_, i) => {
    const { name, fields } = standInBoard(i);
    return {
      id: `stand-in-${String(i + 1).padStart(2, "0")}`,
      name,
      snapshot: JSON.parse(JSON.stringify(buildSnapshot(fields))),
      updatedAt: new Date(NEWEST_SAVE_MS - i * HOUR_MS),
    };
  });
}
