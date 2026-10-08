/**
 * The setup screen's saved-board rack, from the rows the database hands back (Phase 2's promise,
 * WR-05): one corrupt snapshot drops that single card and keeps the rest — never the page.
 *
 * A row makes a card only when its snapshot parses (`parseSnapshot`) AND the card's own numbers can
 * be worked out from it (`summarizeDesign`, the very pipeline the card renders). Either one
 * throwing drops just that row, logged server-side with its id so a missing board is discoverable,
 * because a throw while the card renders would take the whole setup screen down with it — the one
 * screen from which the shaper could delete the board.
 *
 * Phase 15: a row also needs its rack art — the board standing on its tail and turning — worked out
 * by the very function the browser and the go-live report (D-13) call, `rackBoardFigures`. So a
 * board the rack can't draw is dropped here, on the server, by the same rule, never thrown in the
 * browser. The models handed back still carry no picture: the browser works the art out again from
 * each board's own snapshot.
 *
 * Pure: no React, browser or database import.
 */
import { LIVE_DESIGN_RULES, designSideProfile, summarizeDesign, type DesignSummary, type DesignSummaryFields } from "@/lib/geometry/design";
import { buildOutline } from "@/lib/geometry/outline";
import { buildRackBoardArt, type RackBoardArt } from "@/lib/geometry/rack-art";
import { hasPhase11Blank, parseSnapshot, type DesignSnapshotFields, type ParseSnapshotOptions } from "./design-snapshot";

/** A stored board row as the rack reads it. */
export interface RackRow {
  id: string;
  name: string;
  snapshot: unknown;
  updatedAt: Date;
  /** Whether the shaper locked this board (quick 261008-lsy); null, false or missing means unlocked. */
  locked?: boolean | null;
}

/** A stored board ready to be a rack card. */
export interface RackModel {
  id: string;
  name: string;
  snapshot: DesignSnapshotFields;
  updatedAt: Date;
  /** True only when the stored value is exactly true: a locked board can't be changed by accident. */
  locked: boolean;
}

/** A board's card numbers and its rack art, worked out together. */
export interface RackBoardFigures {
  summary: DesignSummary;
  art: RackBoardArt;
}

/**
 * The one way a board's rack figures are worked out: its card numbers (`summarizeDesign`) and its
 * rack art from its own side profile (`designSideProfile` under the live rules) and its own outline.
 * Throws when either can't be worked out.
 */
export function rackBoardFigures(fields: DesignSummaryFields): RackBoardFigures {
  const summary = summarizeDesign(fields);
  const art = buildRackBoardArt(designSideProfile(fields, LIVE_DESIGN_RULES), buildOutline(fields.outline));
  return { summary, art };
}

/** The boards that made the rack, and the ids of the ones left out, in the order they came. */
export interface RackModelsResult {
  models: RackModel[];
  dropped: string[];
}

/**
 * Every row that parses and whose rack figures can be worked out, plus the ids of the rows that
 * couldn't, each logged with its id only. `options` is handed straight to `parseSnapshot` (see
 * `rackModelsFromRows`).
 */
export function rackModelsAndDrops(
  rows: readonly RackRow[],
  log: (message: string, error: unknown) => void = (message, error) => console.error(message, error),
  options: ParseSnapshotOptions = {},
): RackModelsResult {
  const dropped: string[] = [];
  const models = rows.flatMap((row) => {
    try {
      const snapshot = parseSnapshot(row.snapshot, options);
      rackBoardFigures(snapshot);
      return [{ id: row.id, name: row.name, snapshot, updatedAt: row.updatedAt, locked: row.locked === true }];
    } catch (error) {
      log(`Shaper: dropped unparsable saved board ${row.id}`, error);
      dropped.push(row.id);
      return [];
    }
  });
  return { models, dropped };
}

/**
 * Whether a rack of these rows needs the shaper's Tip Style looked up: only when some row really holds
 * a Phase 11 blank — decided by the blank's shape, never the envelope's version number. The one
 * test `app/page.tsx` and `--rack-report` both make before looking it up.
 */
export function rackNeedsTipStyle(rows: readonly { snapshot: unknown }[]): boolean {
  return rows.some((row) => hasPhase11Blank(row.snapshot));
}

/**
 * `options` is handed straight to `parseSnapshot` for every row: a board saved under Phase 11 is
 * carried over to the new cut with the Tip Style it names — the shaper's own account default
 * (Phase 12 D-14), which the caller looks up once for the whole rack, and only when some row
 * actually holds a Phase 11 blank. Left out, a carried board takes Pin deck.
 *
 * Exactly `rackModelsAndDrops(rows, log, options).models`.
 */
export function rackModelsFromRows(
  rows: readonly RackRow[],
  log: (message: string, error: unknown) => void = (message, error) => console.error(message, error),
  options: ParseSnapshotOptions = {},
): RackModel[] {
  return rackModelsAndDrops(rows, log, options).models;
}
