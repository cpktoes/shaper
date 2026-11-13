/**
 * The board a `.brd`'s closest fit opens as (quick 261113-et0, E1; the founder, 2026-11-13: "let's go with the editable
 * board ... continue with the board as close as possible under our controls, then add the fine tune adjustments to get even
 * closer"). The fit's outline, hand-set rocker and foil, no blank, and rails, fins and volume on the picks a new board starts
 * from, under the file's name without `.brd`. It opens through the same door a JSON board file does, so it is checked by the
 * same reader first: a board that file would refuse (a value outside its slider, a shape the rack can't draw) comes back
 * `null` rather than reaching the design.
 *
 * The defaults below are the ones the design store's `DEFAULT_DESIGN_STATE` makes for a new board. The bottom (quick 261113-gwr)
 * opens with the board when the fit found a cut: the fitted cuts ride in the snapshot's own optional `bottom` (Phase 17, D-24),
 * so they open on BOTTOM editable like any board's and need nothing new stored; a flat bottom leaves no key, exactly as a new
 * board's opening bottom does. Nothing is rounded: the board that opens holds the fit's own values,
 * so it draws the dashed lines the preview showed.
 *
 * Pure: no React, browser or database import (CLAUDE.md Rule 1).
 */
import { bottomHasCut, type BoardBottom } from "@/lib/geometry/bottom";
import type { BrdFit } from "@/lib/geometry/brd-fit";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "@/lib/geometry/fins";
import { DEFAULT_RAIL_BAND_SPEC } from "@/lib/geometry/rail-bands";
import { DEFAULT_VOLUME_SPEC } from "@/lib/geometry/volume";
import { readBoardEntry } from "./board-file";
import { buildSnapshot, type DesignSnapshotFields } from "./design-snapshot";

/** The file's name without a final `.brd`, in any case: the name the board opens under. */
export function brdBoardName(fileName: string): string {
  return fileName.replace(/\.brd$/i, "");
}

/**
 * The fields a new board starts from when it is the closest fit to `fileName`, or null when the board reader refuses them
 * (which the fit's own clamping means it never does). Read back through `readBoardEntry`, so its name is trimmed and cut to
 * the board-name limit exactly as a JSON file's is, and so is the bottom (the board reader's bounded, forgiving bottom rule).
 * `bottom` is the fitted bottom, carried only when it cuts something.
 */
export function brdBoardFields(
  fit: Pick<BrdFit, "outline" | "rocker" | "foil">,
  fileName: string,
  bottom?: BoardBottom | null,
): DesignSnapshotFields | null {
  const fields: DesignSnapshotFields = {
    outline: fit.outline,
    rocker: fit.rocker,
    foil: fit.foil,
    rails: DEFAULT_RAIL_BAND_SPEC,
    fins: DEFAULT_FIN_PLACEMENT_SPEC,
    volume: DEFAULT_VOLUME_SPEC,
    finsImportTemplate: true,
    railsImportFoilThickness: true,
    boardName: brdBoardName(fileName),
    finSystem: "fcs2",
    blank: null,
    ...(bottom && bottomHasCut(bottom) ? { bottom } : {}),
  };
  return readBoardEntry({ name: fields.boardName, design: buildSnapshot(fields) }, {})?.fields ?? null;
}
