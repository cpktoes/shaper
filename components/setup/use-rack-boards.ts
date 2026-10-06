"use client";

/**
 * Every board on the Board Rack (Phase 15), worked out once per list change: its card numbers and
 * its rack art — the board standing on its tail and turning — from its OWN data through
 * `rackBoardFigures`, the same pipeline the server already ran on it and the same one TEMPLATE and
 * ROCKER draw from. A saved board reads its own stored snapshot; the unsaved board reads the design
 * store's own fields, live. Nothing here is a cached picture: the paths the rack draws are computed
 * from these figures every time the rack draws (R1, the SPEC's prohibition).
 *
 * A board whose figures can't be worked out is dropped (not drawn, not counted, not a gap) and
 * logged, never thrown during render — so one bad board can never take the home page down, the one
 * screen from which the shaper could delete it (WR-05; this is the third place it can be dropped,
 * after the server's `rackModelsAndDrops` and the old card's own summary).
 */

import { useMemo } from "react";
import { useDesign } from "@/components/design/design-store";
import { RACK_COPY } from "@/components/setup/rack-config";
import type { DesignSummary, DesignSummaryFields } from "@/lib/geometry/design";
import type { RackBoardArt } from "@/lib/geometry/rack-art";
import { rackBoardFigures, type RackBoardFigures, type RackModel } from "@/lib/models/rack-models";
import { IN_PROGRESS_KEY, type InProgressRackEntry, type SavedRackEntry } from "@/lib/models/rack-order";

/** One board as the rack draws it. */
export interface RackBoard {
  /** The saved board's id, or `IN_PROGRESS_KEY` for the unsaved board. */
  key: string;
  kind: "saved" | "in-progress";
  /** The name the rack shows: the saved name, or the store's name (`Untitled Board` when blank). */
  name: string;
  summary: DesignSummary;
  art: RackBoardArt;
  /** The stored board, or null for the unsaved board. */
  model: RackModel | null;
}

/** A rack entry as the rack receives it, already in the order it shows. */
export type RackBoardEntry = InProgressRackEntry | (SavedRackEntry & { model: RackModel });

/** The board's figures, or null when they can't be worked out — logged, never thrown. */
function figuresOrNull(label: string, fields: DesignSummaryFields): RackBoardFigures | null {
  try {
    return rackBoardFigures(fields);
  } catch (error) {
    console.error(`Shaper: dropped the rack board for ${label} — its numbers could not be worked out`, error);
    return null;
  }
}

/**
 * The rack's boards, in the order given, each with its numbers and art. A saved board's figures are
 * worked out once per list change; the unsaved board's whenever the design store's fields change.
 */
export function useRackBoards(entries: readonly RackBoardEntry[]): RackBoard[] {
  const { outline, rails, foil, rocker, blank, railsImportFoilThickness, volume, boardName } = useDesign();

  // Saved boards: from their own stored snapshots, once per list.
  const savedFigures = useMemo(() => {
    const figures = new Map<string, RackBoardFigures | null>();
    for (const entry of entries) {
      if (entry.kind === "saved") figures.set(entry.id, figuresOrNull(`saved board ${entry.id}`, entry.model.snapshot));
    }
    return figures;
  }, [entries]);

  // The unsaved board: from the design store's own fields (there is no stored row to read yet).
  const hasInProgress = entries.some((entry) => entry.kind === "in-progress");
  const inProgressFigures = useMemo(
    () =>
      hasInProgress
        ? figuresOrNull("the board in progress", { outline, rails, foil, rocker, blank, railsImportFoilThickness, volume })
        : null,
    [hasInProgress, outline, rails, foil, rocker, blank, railsImportFoilThickness, volume],
  );

  return useMemo(() => {
    const boards: RackBoard[] = [];
    for (const entry of entries) {
      if (entry.kind === "in-progress") {
        if (!inProgressFigures) continue;
        boards.push({
          key: IN_PROGRESS_KEY,
          kind: "in-progress",
          name: boardName.trim().length > 0 ? boardName : RACK_COPY.untitled,
          summary: inProgressFigures.summary,
          art: inProgressFigures.art,
          model: null,
        });
        continue;
      }
      const figures = savedFigures.get(entry.id);
      if (!figures) continue;
      boards.push({
        key: entry.id,
        kind: "saved",
        name: entry.model.name,
        summary: figures.summary,
        art: figures.art,
        model: entry.model,
      });
    }
    return boards;
  }, [entries, savedFigures, inProgressFigures, boardName]);
}
