"use client";

/**
 * The Board Rack (Phase 15) — the home page's section for the shaper's boards, above "Shape a New
 * Board" for anyone with saved boards or a board in progress. It replaces Phase 2's "Your Boards"
 * card grid: every board stands on its tail at one scale on one floor line, the unsaved board
 * first, and the board being looked at turns to show its outline with its caption under it.
 *
 * The heading reads `Board Rack`, with the count and a hint beside it, always shown (D-08) — both
 * phrasings of the hint are in the markup and the pointer picks which shows (`coarse:`), so even
 * the words are right on the first paint. The order is worked out here through `applyStoredOrder`,
 * the one ordering rule (`lib/models/rack-order.ts`): the unsaved board first, then the shaper's own
 * order if they have arranged the rack, else the most recently touched first (D-01 to D-03).
 *
 * This section owns which board is turned (`turnedKey`): on arrival, the board open in the editor
 * (or the first board) — D-07 — and when a board leaves the rack, the next one along. It also owns
 * D-13's Rename / Duplicate / Delete, unchanged from the old card grid: one `RenameDialog` and one
 * `DeleteConfirmDialog` for the whole rack, with the lifted state, and the per-board duplicate
 * error, now shown in the turned board's caption. While a dialog is open the rack holds still.
 *
 * Renders nothing at all with no boards: no heading, no rack, no hint (signed out, a failed or slow
 * board list, or simply no boards — `app/page.tsx`'s Suspense fallback passes `models={[]}`), so the
 * presets stand where the rack would have been. Before the rack mounts, the server renders the
 * heading, the line and an empty box of the rack's first-paint height, and the rack draws into it
 * from data already on the page — no spinner, no network wait. No notice, banner or "what's new"
 * announces the change (D-15).
 */

import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { deleteModel, duplicateModel, renameModel } from "@/app/design/actions";
import { useDesign } from "@/components/design/design-store";
import { DeleteConfirmDialog } from "@/components/setup/delete-confirm-dialog";
import { HoverRack } from "@/components/setup/hover-rack";
import { RackCaption } from "@/components/setup/rack-caption";
import { RACK_COPY, rackHeadingLine } from "@/components/setup/rack-config";
import { RenameDialog } from "@/components/setup/rename-dialog";
import { useRackBoards, type RackBoard, type RackBoardEntry } from "@/components/setup/use-rack-boards";
import type { RackModel } from "@/lib/models/rack-models";
import { IN_PROGRESS_KEY, applyStoredOrder, turnedKeyAfterRemoval, turnedKeyOnArrival } from "@/lib/models/rack-order";

export type BoardRackEntry = { kind: "in-progress" } | { kind: "saved"; model: RackModel };

interface BoardRackProps {
  entries: BoardRackEntry[];
  /** The shaper's stored order (D-03): saved board ids, or null / absent for the automatic order. */
  rackOrder?: readonly string[] | null;
  onSelectModel: (model: RackModel) => void;
  onContinue: () => void;
}

const subscribeToNothing = () => () => {};

/** Which board is turned, and the keys it was worked out against (React's "adjust state while
 * rendering" pattern: when the keys change, the turned board is worked out again during render). */
interface TurnState {
  joined: string;
  keys: readonly string[];
  turned: string | null;
}

export function BoardRack({ entries, rackOrder = null, onSelectModel, onContinue }: BoardRackProps) {
  // Read for delete (see handleDeleteConfirm below) and for rename (see handleRenameConfirm) —
  // renaming the board currently open in the editor changes the store's label too, or the next
  // autosave would silently write the old name back over the rename.
  const { modelId, setModelId, setBoardName } = useDesign();
  const [renamingModel, setRenamingModel] = useState<RackModel | null>(null);
  const [deletingModel, setDeletingModel] = useState<RackModel | null>(null);
  const [duplicateErrors, setDuplicateErrors] = useState<Record<string, string>>({});
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const headingId = useId();

  // The server can't know the pointer or the width, and the rack measures its own width, so the
  // rack itself mounts on the client only (server: false, client: true).
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  // The rack's order: the one rule in lib/models/rack-order.ts, never re-derived here.
  const rackEntries: RackBoardEntry[] = useMemo(
    () =>
      applyStoredOrder(
        entries.map((entry) =>
          entry.kind === "in-progress"
            ? { kind: "in-progress" as const }
            : {
                kind: "saved" as const,
                id: entry.model.id,
                name: entry.model.name,
                updatedAt: entry.model.updatedAt,
                model: entry.model,
              },
        ),
        rackOrder,
      ),
    [entries, rackOrder],
  );
  const boards = useRackBoards(rackEntries);

  const keys = boards.map((board) => board.key);
  const joined = keys.join("\n");
  const hasInProgress = keys.includes(IN_PROGRESS_KEY);
  const [turnState, setTurnState] = useState<TurnState>(() => ({
    joined,
    keys,
    turned: turnedKeyOnArrival(keys, modelId, hasInProgress),
  }));
  let turnedKey = turnState.turned;
  if (turnState.joined !== joined) {
    turnedKey = turnedKeyAfterRemoval(turnState.keys, keys, turnState.turned);
    // A turned board that left the rack (a delete) hands the turn — and the focus — to the next one.
    if (turnState.turned !== null && !keys.includes(turnState.turned) && turnedKey !== null) setFocusKey(turnedKey);
    setTurnState({ joined, keys, turned: turnedKey });
  }

  if (boards.length === 0) return null;

  const openKey = hasInProgress ? IN_PROGRESS_KEY : modelId;
  const frozen = renamingModel !== null || deletingModel !== null;

  const setTurned = (key: string) => {
    setTurnState((prev) => (prev.turned === key ? prev : { ...prev, turned: key }));
  };

  const clearDuplicateError = (id: string) => {
    setDuplicateErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleRenameConfirm = async (name: string) => {
    if (!renamingModel) return;
    await renameModel(renamingModel.id, name);
    // The board being renamed may be the one open in the editor right now — the shared store
    // still holds its old name, and the next autosave would write that stale name straight back
    // over the rename we just confirmed. Keeping the store in sync is what stops that.
    if (renamingModel.id === modelId) setBoardName(name);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingModel) return;
    await deleteModel(deletingModel.id);
    // The deleted board may be the one open in the editor right now — the design stays on
    // screen exactly as it was (D-13 doesn't touch it), but modelId is cleared so the next Save
    // creates a fresh row instead of trying to write over one that no longer exists.
    if (modelId === deletingModel.id) setModelId(null);
  };

  const handleDuplicate = async (model: RackModel) => {
    clearDuplicateError(model.id);
    try {
      await duplicateModel(model.id);
    } catch {
      setDuplicateErrors((prev) => ({ ...prev, [model.id]: RACK_COPY.duplicateFailed }));
    }
  };

  /** Opens a board exactly as the old cards did: the saved board through the setup screen's
   * `handleSelectModel` (with its replace-board check), the unsaved one straight to the editor. */
  const openBoard = (board: RackBoard) => {
    if (board.model) onSelectModel(board.model);
    else onContinue();
  };

  const handleOpenKey = (key: string) => {
    const board = boards.find((candidate) => candidate.key === key);
    if (board) openBoard(board);
  };

  const renderCaption = (board: RackBoard) => {
    const model = board.model;
    return (
      <RackCaption
        board={board}
        variant="hover"
        onOpen={() => openBoard(board)}
        onRename={model ? () => setRenamingModel(model) : undefined}
        onDuplicate={model ? () => void handleDuplicate(model) : undefined}
        onDelete={model ? () => setDeletingModel(model) : undefined}
        duplicateError={model ? (duplicateErrors[model.id] ?? null) : null}
      />
    );
  };

  return (
    // A phone-width override brings this section's bottom gap down to 32px (the scale's step
    // for a gap between major stacked blocks), replacing the desktop's 48px.
    <section aria-labelledby={headingId} className="mb-12 max-shell:mb-8">
      {/* The count and hint sit to the right of the heading on one muted line, and wrap under it on
          a very narrow screen rather than squeezing it. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        {/* The phone-width heading size below is one step smaller than the headline's own
            phone-width size in setup-screen.tsx, keeping the two sizes' order — both already
            exist in the app. */}
        <h2
          id={headingId}
          className="text-xl max-shell:text-base leading-[1.2] font-display text-surf-ink uppercase tracking-architectural font-bold"
        >
          {RACK_COPY.heading}
        </h2>
        <p className="text-xs leading-[1.4] font-semibold text-surf-ink-muted">
          <span className="coarse:hidden">{rackHeadingLine(boards.length, "hover")}</span>
          <span className="hidden coarse:inline">{rackHeadingLine(boards.length, "swipe")}</span>
        </p>
      </div>
      <div className="mt-6 max-shell:mt-4">
        {mounted ? (
          <HoverRack
            boards={boards}
            turnedKey={turnedKey}
            openKey={openKey}
            frozen={frozen}
            onTurn={setTurned}
            onOpen={handleOpenKey}
            caption={renderCaption}
            focusKey={focusKey}
          />
        ) : (
          <div aria-hidden="true" className="h-[520px]" />
        )}
      </div>
      <RenameDialog
        open={renamingModel !== null}
        onOpenChange={(next) => {
          if (!next) setRenamingModel(null);
        }}
        currentName={renamingModel?.name ?? ""}
        onRename={handleRenameConfirm}
      />
      <DeleteConfirmDialog
        open={deletingModel !== null}
        onOpenChange={(next) => {
          if (!next) setDeletingModel(null);
        }}
        boardName={deletingModel?.name ?? ""}
        onConfirm={handleDeleteConfirm}
      />
    </section>
  );
}
