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
 * Pure: no React, browser or database import.
 */
import { summarizeDesign } from "@/lib/geometry/design";
import { parseSnapshot, type DesignSnapshotFields, type ParseSnapshotOptions } from "./design-snapshot";

/** A stored board row as the rack reads it. */
export interface RackRow {
  id: string;
  name: string;
  snapshot: unknown;
  updatedAt: Date;
}

/** A stored board ready to be a rack card. */
export interface RackModel {
  id: string;
  name: string;
  snapshot: DesignSnapshotFields;
  updatedAt: Date;
}

/**
 * `options` is handed straight to `parseSnapshot` for every row: a board saved under Phase 11 is
 * carried over to the new cut with the Tip Style it names — the shaper's own account default
 * (Phase 12 D-14), which the caller looks up once for the whole rack, and only when some row
 * actually holds a Phase 11 blank. Left out, a carried board takes Pin deck.
 */
export function rackModelsFromRows(
  rows: readonly RackRow[],
  log: (message: string, error: unknown) => void = (message, error) => console.error(message, error),
  options: ParseSnapshotOptions = {},
): RackModel[] {
  return rows.flatMap((row) => {
    try {
      const snapshot = parseSnapshot(row.snapshot, options);
      summarizeDesign(snapshot);
      return [{ id: row.id, name: row.name, snapshot, updatedAt: row.updatedAt }];
    } catch (error) {
      log(`Shaper: dropped unparsable saved board ${row.id}`, error);
      return [];
    }
  });
}
