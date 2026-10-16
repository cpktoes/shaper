"use client";

import { LocateFixedIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { useDesign } from "@/components/design/design-store";
import type { ViewerOrientation } from "@/components/viewer/callout-primitives";
import { ViewerToolbar, ViewerToolbarButton } from "@/components/viewer/toolbar-button";
import { ViewerZoomControl, ViewerZoomProvider } from "@/components/viewer/zoom-viewport";
import type { OutlineSpec } from "@/lib/geometry/board";
import { WingCloseUp } from "./wing-close-up";

/**
 * The WINGS tab's content on the TEMPLATE page (quick 261014-wii, 2026-10-14, D3, P9): its own
 * toolbar and the tail close up. Lives in its own file so `outline-editor.tsx` keeps exactly the
 * toolbar-button count `components/viewer/toolbar-button.test.ts` pins.
 *
 * One pop-up, not two (quick 261015-hz7, D6): the founder, 2026-10-15 — "There's currently two
 * popups. I only want the second one." The floating "No wings yet" card that sat over the empty tab
 * is gone, so the empty ADD WINGS tab draws the bare tail with no wing; the sidebar's "+ Add a wing"
 * (on a phone, in the stacked controls under the drawing) is the way in, and the "Dial in your wing
 * placement" pop-up still opens every time a board goes from no wings to one.
 *
 * The toolbar has only the two buttons sketch 014's WINGS toolbar has, drawn exactly like the
 * VIEWER's: Show/Hide construction lines (the wings' grab points follow it, D5) and wide view.
 * The close-up is never turned (P4). The handlers are the editor's, so the two tabs share one
 * construction setting and one wide view.
 *
 * Zoom, like the VIEWER (quick 261015-my3, 2026-10-15, D7) — the founder: "wings tab also needs zoom
 * capabilities like the viewer." The panel holds its own `ViewerZoomProvider` (a provider renders no
 * element, so the layout is untouched), and the zoom row sits under the toolbar's icons exactly as on
 * the VIEWER. The panel unmounts when the tab changes, so each tab starts at 1x; nothing is saved.
 */
export interface WingsPanelProps {
  outline: OutlineSpec;
  showConstruction: boolean;
  onToggleConstruction: () => void;
  showFins: boolean;
  wideView: boolean;
  onToggleWideView: () => void;
  /** Which way the VIEWER tab draws the board, so the close-up's lines match its weight (D1). */
  viewerOrientation: ViewerOrientation;
}

export function WingsPanel({
  outline,
  showConstruction,
  onToggleConstruction,
  showFins,
  wideView,
  onToggleWideView,
  viewerOrientation,
}: WingsPanelProps) {
  const { outlineGeometry, baseOutlineGeometry, finPlacement, updateOutline, locked: boardLocked, wingFinEdges } =
    useDesign();

  return (
    <div className="relative flex min-h-0 flex-1">
      <ViewerZoomProvider>
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
      {/* The zoom level and its buttons, in their own row under the icons (D7). */}
      <ViewerZoomControl />

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
          viewerOrientation={viewerOrientation}
        />
      </div>
      </ViewerZoomProvider>
    </div>
  );
}
