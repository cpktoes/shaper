"use client";

/**
 * D-06's saved-boards section — rendered ABOVE the preset grid on `/` for a signed-in shaper with
 * an in-progress board and/or saved boards. Takes an already-ordered list of entries (the caller
 * — `setup-screen.tsx` — runs `sortRackEntries` before handing them here; this component still
 * only renders that order, never re-derives it) and renders one card per entry in the same wrap
 * the preset grid uses (UI-SPEC board-rack "overflow"): many boards wrap to more rows, never
 * scroll or clip.
 *
 * Renders nothing at all when it has no entries to show (UI-SPEC board-rack "empty": there is no
 * empty-rack state to design, because the rack simply doesn't render). That same `null` return is
 * also what a slow-loading query degrades into: `app/page.tsx` wraps its board-listing Server
 * Component (`BoardRackData`) in `<Suspense fallback={<SetupScreen models={[]} />}>`, and an empty
 * `models` array produces an empty entries list here — so a slow board-list read shows the plain
 * preset screen for a moment rather than a spinner (UI-SPEC board-rack "loading").
 *
 * This component also owns D-13's Rename/Duplicate/Delete behavior — a single `RenameDialog` and
 * a single `DeleteConfirmDialog` instance for the whole rack, following the same lifted-state
 * convention `setup-screen.tsx` uses for the replace-board confirm, rather than one dialog pair
 * per card. Duplicate is instant with no dialog, so its failure state lives per-card instead
 * (`duplicateErrors`, keyed by row id) — a visible, retryable error beside that one card, never a
 * silent no-op (UI-SPEC rack-card-menu "error").
 */

import { useState } from "react";
import { deleteModel, duplicateModel, renameModel } from "@/app/design/actions";
import { useDesign } from "@/components/design/design-store";
import { BoardRackCard, type SavedModel } from "@/components/setup/board-rack-card";
import { DeleteConfirmDialog } from "@/components/setup/delete-confirm-dialog";
import { RenameDialog } from "@/components/setup/rename-dialog";

export type BoardRackEntry = { kind: "in-progress" } | { kind: "saved"; model: SavedModel };

interface BoardRackProps {
  entries: BoardRackEntry[];
  onSelectModel: (model: SavedModel) => void;
  onContinue: () => void;
}

export function BoardRack({ entries, onSelectModel, onContinue }: BoardRackProps) {
  // Only read for the one case that needs care on delete (see handleDeleteConfirm below) — a
  // rename never touches the store at all (D-13: only the row's label changes).
  const { modelId, setModelId } = useDesign();
  const [renamingModel, setRenamingModel] = useState<SavedModel | null>(null);
  const [deletingModel, setDeletingModel] = useState<SavedModel | null>(null);
  const [duplicateErrors, setDuplicateErrors] = useState<Record<string, string>>({});

  if (entries.length === 0) return null;

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
  };

  const handleDeleteConfirm = async () => {
    if (!deletingModel) return;
    await deleteModel(deletingModel.id);
    // The deleted board may be the one open in the editor right now — the design stays on
    // screen exactly as it was (D-13 doesn't touch it), but modelId is cleared so the next Save
    // creates a fresh row instead of trying to write over one that no longer exists.
    if (modelId === deletingModel.id) setModelId(null);
  };

  const handleDuplicate = async (model: SavedModel) => {
    clearDuplicateError(model.id);
    try {
      await duplicateModel(model.id);
    } catch {
      setDuplicateErrors((prev) => ({ ...prev, [model.id]: "Couldn't duplicate — try again." }));
    }
  };

  return (
    <div className="mb-12">
      <h2 className="text-xl leading-[1.2] font-display text-surf-ink uppercase tracking-architectural font-bold">
        Your Boards
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {entries.map((entry) =>
          entry.kind === "in-progress" ? (
            <BoardRackCard key="in-progress" variant="in-progress" onSelect={onContinue} />
          ) : (
            <BoardRackCard
              key={entry.model.id}
              model={entry.model}
              onSelect={onSelectModel}
              onRename={() => setRenamingModel(entry.model)}
              onDuplicate={() => void handleDuplicate(entry.model)}
              onDelete={() => setDeletingModel(entry.model)}
              duplicateError={duplicateErrors[entry.model.id] ?? null}
            />
          ),
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
    </div>
  );
}
