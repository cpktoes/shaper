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
 *
 * It also owns moving a board (15-09): every move is the one pure rule (`moveInOrder` on the saved
 * boards, the unsaved board refused before it — R9), shown at once and saved in the background by
 * `useRackOrder`, and said in the status pill (`RackStatus`, the rack's one live region). On a touch
 * screen a board is held and slid (the swipe rack), only while D-11's switch leaves the hold on.
 */

import { useCallback, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { deleteModel, duplicateModel, renameModel } from "@/app/design/actions";
import { useDesign } from "@/components/design/design-store";
import { useCoarsePointer } from "@/components/design/use-viewer-media";
import { DeleteConfirmDialog } from "@/components/setup/delete-confirm-dialog";
import { HoverRack } from "@/components/setup/hover-rack";
import { RackCaption } from "@/components/setup/rack-caption";
import { RACK_COPY, holdToMoveEnabled, rackHeadingLine, type RackKind } from "@/components/setup/rack-config";
import { RackStatus, useRackStatus, type RackStatusAvoid } from "@/components/setup/rack-status";
import { RenameDialog } from "@/components/setup/rename-dialog";
import { SwipeRack } from "@/components/setup/swipe-rack";
import { useRackBoards, type RackBoard, type RackBoardEntry } from "@/components/setup/use-rack-boards";
import { useRackOrder } from "@/components/setup/use-rack-order";
import { DROP_STRIP } from "@/lib/geometry/rack-layout";
import type { RackModel } from "@/lib/models/rack-models";
import {
  IN_PROGRESS_KEY,
  applyStoredOrder,
  moveInOrder,
  rackIndexToSavedIndex,
  savedIdsInOrder,
  turnedKeyAfterRemoval,
  turnedKeyOnArrival,
} from "@/lib/models/rack-order";

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
  /** The name of the board a finger is carrying (the swipe caption becomes the carrying line). */
  const [carrying, setCarrying] = useState<string | null>(null);
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  /** UI E09: the status pill never covers the caption's controls. On the swipe rack the empty band
   * between the floor and the caption's first line is where it goes when its usual place would. */
  const pillAvoid = useCallback((): RackStatusAvoid => {
    const section = sectionRef.current;
    if (!section) return { controls: [], centreY: null };
    const controls = Array.from(section.querySelectorAll("[data-rack-caption] button")).map((control) =>
      control.getBoundingClientRect(),
    );
    const scroller = section.querySelector("[data-rack-scroller]");
    const firstLine = section.querySelector("[data-rack-caption]")?.firstElementChild;
    if (!scroller || !firstLine) return { controls, centreY: null };
    const floor = scroller.getBoundingClientRect().bottom - DROP_STRIP;
    return { controls, centreY: (floor + firstLine.getBoundingClientRect().top) / 2 };
  }, []);
  const status = useRackStatus();
  const { announce } = status;
  // The shaper's order: their newest move at once, saved in the background; a failed save puts the
  // board back (the hook does) and says so here.
  const { order, commit, flush } = useRackOrder(rackOrder ?? null, () => announce(RACK_COPY.saveFailed));

  // The server can't know the pointer or the width, and the rack measures its own width, so the
  // rack itself mounts on the client only (server: false, client: true).
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  // D-04: a mouse hovers, a finger swipes — the pointer decides which rack, never the window's width
  // (CLAUDE.md Layout: the `coarse` pointer switch's new job). A touch screen of any size gets the
  // swipe rack; a mouse at any width, the hover rack. `turnedKey` lives here, so a device that turns
  // from one kind to the other keeps the same board turned.
  const kind: RackKind = useCoarsePointer() ? "swipe" : "hover";

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
        order,
      ),
    [entries, order],
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

  // Before Rename, Duplicate or Delete runs, a waiting order save goes out first: Server Actions run
  // one at a time, in order, so the order lands before the action re-reads the page (T-15-27).
  const handleRenameConfirm = async (name: string) => {
    flush();
    if (!renamingModel) return;
    await renameModel(renamingModel.id, name);
    // The board being renamed may be the one open in the editor right now — the shared store
    // still holds its old name, and the next autosave would write that stale name straight back
    // over the rename we just confirmed. Keeping the store in sync is what stops that.
    if (renamingModel.id === modelId) setBoardName(name);
  };

  const handleDeleteConfirm = async () => {
    flush();
    if (!deletingModel) return;
    const deleted = deletingModel;
    await deleteModel(deleted.id);
    // The deleted board may be the one open in the editor right now — the design stays on
    // screen exactly as it was (D-13 doesn't touch it), but modelId is cleared so the next Save
    // creates a fresh row instead of trying to write over one that no longer exists.
    if (modelId === deleted.id) setModelId(null);
    // Spoken, not shown; the turn — and the focus — go to the next board in order (the previous
    // when it was last), UI E10.
    announce(RACK_COPY.deleted(deleted.name), { visible: false });
    setFocusKey(turnedKeyAfterRemoval(keys, keys.filter((key) => key !== deleted.id), turnedKey));
  };

  const handleDuplicate = async (model: RackModel) => {
    flush();
    clearDuplicateError(model.id);
    try {
      await duplicateModel(model.id);
      // The copy stands beside its original (D-02, D-16) — said to a screen reader, no pill.
      announce(RACK_COPY.duplicated(model.name), { visible: false });
    } catch {
      setDuplicateErrors((prev) => ({ ...prev, [model.id]: RACK_COPY.duplicateFailed }));
      announce(RACK_COPY.duplicateFailed, { visible: false });
    }
  };

  /** Opens a board exactly as the old cards did: the saved board through the setup screen's
   * `handleSelectModel` (with its replace-board check), the unsaved one straight to the editor. */
  const openBoard = (board: RackBoard) => {
    if (board.model) onSelectModel(board.model);
    else onContinue();
  };

  /**
   * A board let go at rack place `toRackIndex` (R8, R9): the one pure rule moves it among the saved
   * boards — a place in front of the unsaved board becomes the first place behind it — the rack shows
   * the new order at once, saves it in the background and says so. The unsaved board itself is
   * refused, with the words saying why. Dropping a board where it already stands says nothing.
   */
  const handleMove = (key: string, toRackIndex: number): "moved" | "same" | "refused" => {
    if (key === IN_PROGRESS_KEY) {
      announce(RACK_COPY.unsavedStaysFirst);
      return "refused";
    }
    const board = boards.find((candidate) => candidate.key === key);
    if (!board) return "same";
    const ids = savedIdsInOrder(rackEntries);
    const next = moveInOrder(ids, key, rackIndexToSavedIndex(toRackIndex, hasInProgress));
    if (next.every((id, i) => id === ids[i])) return "same";
    commit(next);
    announce(RACK_COPY.moved(board.name));
    return "moved";
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
        variant={kind}
        onOpen={() => openBoard(board)}
        onRename={model ? () => setRenamingModel(model) : undefined}
        onDuplicate={model ? () => void handleDuplicate(model) : undefined}
        onDelete={model ? () => setDeletingModel(model) : undefined}
        duplicateError={model ? (duplicateErrors[model.id] ?? null) : null}
        carrying={kind === "swipe" ? carrying : null}
      />
    );
  };

  return (
    // A phone-width override brings this section's bottom gap down to 32px (the scale's step
    // for a gap between major stacked blocks), replacing the desktop's 48px.
    <section ref={sectionRef} aria-labelledby={headingId} className="mb-12 max-shell:mb-8">
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
      {/* On a short screen (D-06, height alone) the gap under the heading is 8, so the rack takes the
          screen; the swipe rack's own 16-dot top room tucks up into whichever gap applies. */}
      <div className="mt-6 max-shell:mt-4 [@media(max-height:500px)]:mt-2">
        {mounted ? (
          kind === "swipe" ? (
            <SwipeRack
              boards={boards}
              turnedKey={turnedKey}
              openKey={openKey}
              frozen={frozen}
              onTurn={setTurned}
              onOpen={handleOpenKey}
              caption={renderCaption}
              focusKey={focusKey}
              onMove={handleMove}
              holdEnabled={holdToMoveEnabled(kind)}
              onCarry={setCarrying}
            />
          ) : (
            <HoverRack
              boards={boards}
              turnedKey={turnedKey}
              openKey={openKey}
              frozen={frozen}
              onTurn={setTurned}
              onOpen={handleOpenKey}
              caption={renderCaption}
              focusKey={focusKey}
              onMove={handleMove}
            />
          )
        ) : (
          // The first-paint box, the rack's own height for each pointer, chosen in CSS because the
          // server can't know the pointer (UI-SPEC E11): one hover row on a computer, the swipe rack's
          // whole box on a touch screen — its 16-dot top room tucked into the gap, as the rack does —
          // so a phone's "Shape a New Board" never jumps when the rack draws in.
          <div aria-hidden="true" className="h-[520px] coarse:-mt-4 coarse:h-(--rack-swipe-h)" />
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
      <RackStatus message={status.message} visible={status.visible} fading={status.fading} serial={status.serial}
        avoid={pillAvoid}
      />
    </section>
  );
}
