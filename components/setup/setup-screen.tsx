"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BoardRack, type BoardRackEntry } from "@/components/setup/board-rack";
import type { SavedModel } from "@/components/setup/board-rack-card";
import { PresetCard } from "@/components/setup/preset-card";
import { ReplaceBoardDialog } from "@/components/setup/replace-board-dialog";
import { useDesign } from "@/components/design/design-store";
import { BOARD_PRESETS, type BoardPreset } from "@/lib/geometry/presets";
import { sortRackEntries, type InProgressRackEntry, type SavedRackEntry } from "@/lib/models/rack-order";

interface SetupScreenProps {
  /** Saved boards for the signed-in shaper (MODL-03), already validated by `app/page.tsx` — a
   * signed-out visitor or one with no saved boards gets an empty array, which `BoardRack`
   * renders as nothing at all (D-06). */
  models: SavedModel[];
}

/** Either kind of thing D-07/D-10's shared confirm can be about to replace the board with. */
type PendingReplacement = { kind: "preset"; preset: BoardPreset } | { kind: "model"; model: SavedModel };

/**
 * The setup screen — `/`'s entire content (D-05/D-06). Reads `applyPreset`/`applyModel` and
 * `hasBoardInProgress` from the shared `DesignProvider` (mounted in app/layout.tsx) exactly like
 * a `/design/*` screen reads its own slice, following the `outline-editor.tsx` client-screen
 * pattern. Layout follows the approved UI-SPEC: shadcn neutral-theme canvas + cards, with the
 * surf accent cyan as the one borrowed accent color, so the setup screen reads as part of the
 * same product as the dark-nav design screens rather than a second visual language.
 *
 * Dialog-open state and the pending replacement are plain `useState`, following the
 * `outline-editor.tsx` convention of view-only state staying local and never lifted into the
 * shared store (D-07/D-10's confirm gate is a view concern, not design data).
 */
export function SetupScreen({ models }: SetupScreenProps) {
  const { applyPreset, applyModel, hasBoardInProgress, modelId } = useDesign();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<PendingReplacement | null>(null);

  const goToEditor = () => router.push("/design/outline");

  // Compose one list — the in-progress entry (from the design store) plus one entry per saved
  // row (from props) — and run it through the single ordering rule (D-06/D-07) before handing
  // ordered `BoardRackEntry`s to `BoardRack`, which only renders (see that file's doc comment).
  const rackEntries: BoardRackEntry[] = useMemo(() => {
    type SortableEntry = InProgressRackEntry | (SavedRackEntry & { model: SavedModel });

    const entries: SortableEntry[] = models.map((model) => ({
      kind: "saved" as const,
      id: model.id,
      name: model.name,
      updatedAt: model.updatedAt,
      model,
    }));
    // Only a board with no saved home yet gets the "in progress — not saved" card. Once the
    // shaper saves it, modelId points at a row and the board is autosaving — its rack presence
    // is its own saved card (revalidated on every save), and a second card claiming "not saved"
    // would be both a duplicate and a lie.
    if (hasBoardInProgress && modelId === null) {
      entries.push({ kind: "in-progress" as const });
    }

    return sortRackEntries(entries).map((entry) =>
      entry.kind === "in-progress"
        ? { kind: "in-progress" as const }
        : { kind: "saved" as const, model: entry.model },
    );
  }, [models, hasBoardInProgress, modelId]);

  const handleSelectPreset = (preset: BoardPreset) => {
    if (!hasBoardInProgress) {
      applyPreset(preset);
      goToEditor();
      return;
    }
    setPending({ kind: "preset", preset });
    setConfirmOpen(true);
  };

  const handleSelectModel = (model: SavedModel) => {
    // The board that is already open in the design store: just continue it. Re-applying the
    // stored row here would silently roll the shaper back to the last-saved snapshot, losing
    // any edit newer than the last autosave flush — and confirming "replace your in-progress
    // board?" against itself is a nonsense question.
    if (model.id === modelId) {
      goToEditor();
      return;
    }
    if (!hasBoardInProgress) {
      applyModel(model.id, model.snapshot);
      goToEditor();
      return;
    }
    setPending({ kind: "model", model });
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (pending?.kind === "preset") {
      applyPreset(pending.preset);
    } else if (pending?.kind === "model") {
      applyModel(pending.model.id, pending.model.snapshot);
    }
    setConfirmOpen(false);
    setPending(null);
    goToEditor();
  };

  const handleCancel = (open: boolean) => {
    setConfirmOpen(open);
    if (!open) {
      setPending(null);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-surf-ground">
      <div className="mx-auto max-w-5xl px-6 pt-16 pb-16 md:px-8">
        <BoardRack entries={rackEntries} onSelectModel={handleSelectModel} onContinue={goToEditor} />
        <h1 className="text-3xl leading-[1.2] font-display text-surf-ink uppercase tracking-architectural font-extrabold">Shape a New Board</h1>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BOARD_PRESETS.map((preset) => (
            <PresetCard key={preset.id} preset={preset} onSelect={handleSelectPreset} />
          ))}
        </div>
      </div>
      <ReplaceBoardDialog
        open={confirmOpen}
        onOpenChange={handleCancel}
        onConfirm={handleConfirm}
        mode={pending?.kind === "model" ? "open-saved" : "preset"}
      />
    </div>
  );
}
