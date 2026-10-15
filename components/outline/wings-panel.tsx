"use client";

import { LocateFixedIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useDesign } from "@/components/design/design-store";
import { useControlsLocked } from "@/components/design/use-controls-locked";
import { ViewerToolbar, ViewerToolbarButton } from "@/components/viewer/toolbar-button";
import type { OutlineSpec } from "@/lib/geometry/board";
import { cn } from "@/lib/utils";
import { WingCloseUp } from "./wing-close-up";

/**
 * The WINGS tab's content on the TEMPLATE page (quick 261014-wii, 2026-10-14, D3, P9): its own
 * toolbar, the tail close up, and — while the board has no wing — a card offering the first one.
 * Lives in its own file so `outline-editor.tsx` keeps exactly the toolbar-button count
 * `components/viewer/toolbar-button.test.ts` pins.
 *
 * The toolbar has only the two buttons sketch 014's WINGS toolbar has, drawn exactly like the
 * VIEWER's: Show/Hide construction lines (the wings' grab points follow it, D5) and wide view.
 * The close-up has no zoom and is never turned (P4). The handlers are the editor's, so the two tabs
 * share one construction setting and one wide view.
 */
export interface WingsPanelProps {
  outline: OutlineSpec;
  onAddWing: () => void;
  showConstruction: boolean;
  onToggleConstruction: () => void;
  showFins: boolean;
  wideView: boolean;
  onToggleWideView: () => void;
}

export function WingsPanel({
  outline,
  onAddWing,
  showConstruction,
  onToggleConstruction,
  showFins,
  wideView,
  onToggleWideView,
}: WingsPanelProps) {
  const { outlineGeometry, baseOutlineGeometry, finPlacement, updateOutline, locked: boardLocked, wingFinEdges } =
    useDesign();
  const locked = useControlsLocked();
  const wingCount = outline.wings?.length ?? 0;

  return (
    <div className="relative flex min-h-0 flex-1">
      <ViewerToolbar>
        <ViewerToolbarButton
          onClick={onToggleConstruction}
          pressed={showConstruction}
          label={showConstruction ? "Hide construction lines" : "Show construction lines"}
        >
          <LocateFixedIcon className="size-6" />
        </ViewerToolbarButton>
        <ViewerToolbarButton
          onClick={onToggleWideView}
          pressed={wideView}
          label={wideView ? "Show the sidebar" : "Hide the sidebar for a wider view"}
          title={wideView ? "Show the sidebar" : "Wide view"}
          // As the VIEWER's own: a phone has no sidebar to hide (09-REVIEW.md CR-01).
          className="max-shell:hidden"
        >
          {wideView ? <PanelLeftOpenIcon className="size-6" /> : <PanelLeftCloseIcon className="size-6" />}
        </ViewerToolbarButton>
      </ViewerToolbar>

      <div className="relative h-full min-h-0 w-full min-w-0">
        <WingCloseUp
          geometry={outlineGeometry}
          baseGeometry={baseOutlineGeometry}
          outline={outline}
          finMarks={finPlacement.marks}
          showFins={showFins}
          showConstruction={showConstruction}
          // Plan 02 (D5): the grab points write the whole wings list back. A locked board has none —
          // no handler, no grab areas, no press handling (the VIEWER's own rule); the store's lock
          // guard backs it.
          onWingsChange={boardLocked ? undefined : (wings) => updateOutline({ wings })}
          edges={wingFinEdges}
        />
      </div>

      {wingCount === 0 && (
        // The empty tab (sketch 014's own card): a centred card over the bare tail, with the same
        // "+ Add a wing" the sidebar carries, in the Next button's accent fill.
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
          <div
            data-wings-empty
            className="pointer-events-auto max-w-xs rounded-lg border border-surf-line bg-surf-panel p-5 text-center shadow-sm"
          >
            <div className="text-sm font-display font-extrabold uppercase tracking-architectural text-surf-ink">
              No wings yet
            </div>
            <p className="mt-2 text-sm text-surf-ink-muted">
              A wing is a step in the outline near the fins. Add one, then dial it in against the fin placement.
            </p>
            <button
              type="button"
              disabled={locked}
              onClick={onAddWing}
              className={cn(
                buttonVariants(),
                "mt-4 w-full border-surf-on-accent bg-surf-accent text-surf-on-accent hover:bg-surf-accent/85",
              )}
            >
              + Add a wing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
