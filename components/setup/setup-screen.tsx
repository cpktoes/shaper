"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ContinueBoardCard } from "@/components/setup/continue-board-card";
import { PresetCard } from "@/components/setup/preset-card";
import { ReplaceBoardDialog } from "@/components/setup/replace-board-dialog";
import { useDesign } from "@/components/design/design-store";
import { BOARD_PRESETS, type BoardPreset } from "@/lib/geometry/presets";

/**
 * The setup screen — `/`'s entire content (D-05). Reads `applyPreset` and `hasBoardInProgress`
 * from the shared `DesignProvider` (mounted in app/layout.tsx) exactly like a `/design/*` screen
 * reads its own slice, following the `outline-editor.tsx` client-screen pattern. Layout follows
 * the approved UI-SPEC: shadcn neutral-theme canvas + cards, `outline-accent` amber as the one
 * borrowed accent color, so the setup screen reads as part of the same product as the dark-nav
 * design screens rather than a second visual language.
 *
 * Dialog-open state and the pending preset are plain `useState`, following the
 * `outline-editor.tsx` convention of view-only state staying local and never lifted into the
 * shared store (D-07's confirm gate is a view concern, not design data).
 */
export function SetupScreen() {
  const { applyPreset, hasBoardInProgress } = useDesign();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPreset, setPendingPreset] = useState<BoardPreset | null>(null);

  const goToEditor = () => router.push("/design/outline");

  const handleSelect = (preset: BoardPreset) => {
    if (!hasBoardInProgress) {
      applyPreset(preset);
      goToEditor();
      return;
    }
    setPendingPreset(preset);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (pendingPreset) {
      applyPreset(pendingPreset);
    }
    setConfirmOpen(false);
    setPendingPreset(null);
    goToEditor();
  };

  const handleCancel = (open: boolean) => {
    setConfirmOpen(open);
    if (!open) {
      setPendingPreset(null);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-surf-base">
      <div className="mx-auto max-w-5xl px-6 pt-16 pb-16 md:px-8">
        <h1 className="text-3xl leading-[1.2] font-display text-surf-black uppercase tracking-architectural font-extrabold">Shape a New Board</h1>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BOARD_PRESETS.map((preset) => (
            <PresetCard key={preset.id} preset={preset} onSelect={handleSelect} />
          ))}
          {hasBoardInProgress && <ContinueBoardCard onContinue={goToEditor} />}
        </div>
        {/* Phase 2 saved-boards section slots in here, below the preset grid, without a redesign. */}
      </div>
      <ReplaceBoardDialog open={confirmOpen} onOpenChange={handleCancel} onConfirm={handleConfirm} />
    </div>
  );
}
