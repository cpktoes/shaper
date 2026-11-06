"use client";

import { HashIcon, WarehouseIcon } from "lucide-react";
import { FinPlacementIcon } from "@/components/outline/fin-placement-icon";
import { BlankTopViewIcon, ContourStripesIcon, ViewerToolbarButton } from "@/components/viewer/toolbar-button";
import { COARSE_TOUCH_BOX } from "@/components/viewer/zoom-viewport";
import { cn } from "@/lib/utils";
import { THREE_D_COPY } from "./three-d-copy";

/** The toolbar's own dimming, for a button that must stay hoverable so its reason shows in its tooltip. */
const DIMMED_BUT_HOVERABLE =
  "aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:bg-surf-ground aria-disabled:hover:text-surf-ink-muted";

/**
 * What the 3D picture includes (Phase 16, D-35, UI-SPEC §6, §9): Fins, on when the screen opens; Blank, a see-through
 * ghost of the picked blank (D-08), off when it opens; Contour Stripes, bands of light in place of the foam's shading
 * (D-12), off when it opens; Wire View, the board drawn in thin lines on a plain foam (D-42), off when it opens; and
 * the Room, on when it opens: off, the bay goes and the board spins free on a plain ground (D-43, D-44).
 * Contour Stripes and Wire View each replace the foam's shading, so they are one look at a time. The founder,
 * 2026-11-04: "Move the fins and blank checkboxes to icons in the viewer. We already have a good fin icon." and of
 * Contour Stripes, "An icon too"; 2026-11-05: "Can we make this a toggle also (maybe the icon can be a # sign)."
 *
 * Its own module because `toolbar-button.test.ts` counts each file's buttons and the screen keeps its one Wide view
 * button. The switches are APPENDED after Wide view in the screen's one row, so nothing that exists moves (P-3).
 *
 * A press changes only the picture: never the board, never saved, never undoable, never the files (D-16, D-17). So a
 * locked board keeps them (UI-SPEC §9), and the view stays exactly as it is. A hand-set board has no blank, so Blank is
 * dimmed there with its reason in its tooltip and spoken description: `aria-disabled` rather than `disabled`, or the
 * tooltip would never show. They are live while the drawing loads (a press then applies when the board appears) and
 * dimmed only while a canvas message shows.
 */
export function ThreeDShowButtons({
  showFins,
  onShowFins,
  showBlank,
  onShowBlank,
  hasBlank,
  stripes,
  onStripes,
  wire,
  onWire,
  room,
  onRoom,
  disabled,
}: {
  showFins: boolean;
  onShowFins: (show: boolean) => void;
  showBlank: boolean;
  onShowBlank: (show: boolean) => void;
  /** Whether the board sits in a blank picked on ROCKER (`sideProfile.blank`); a hand-set board has none. */
  hasBlank: boolean;
  stripes: boolean;
  onStripes: (on: boolean) => void;
  wire: boolean;
  onWire: (on: boolean) => void;
  room: boolean;
  onRoom: (on: boolean) => void;
  /** True while a canvas message shows instead of the board (UI-SPEC §8): there is nothing to show. */
  disabled: boolean;
}) {
  return (
    <>
      <ViewerToolbarButton
        label={THREE_D_COPY.fins}
        pressed={showFins}
        disabled={disabled}
        onClick={() => onShowFins(!showFins)}
        data-three-d-show="fins"
        data-lock-exempt
        className={COARSE_TOUCH_BOX}
      >
        <FinPlacementIcon className="size-6" />
      </ViewerToolbarButton>
      <ViewerToolbarButton
        label={THREE_D_COPY.blank}
        title={hasBlank ? undefined : THREE_D_COPY.noBlankHint}
        pressed={hasBlank && showBlank}
        aria-disabled={hasBlank ? undefined : true}
        disabled={disabled}
        onClick={() => {
          if (hasBlank) onShowBlank(!showBlank);
        }}
        data-three-d-show="blank"
        data-lock-exempt
        className={cn(COARSE_TOUCH_BOX, DIMMED_BUT_HOVERABLE)}
      >
        <BlankTopViewIcon className="size-6" />
      </ViewerToolbarButton>
      <ViewerToolbarButton
        label={THREE_D_COPY.contourStripes}
        title={THREE_D_COPY.contourStripesTip}
        pressed={stripes}
        disabled={disabled}
        onClick={() => onStripes(!stripes)}
        data-three-d-show="stripes"
        data-lock-exempt
        className={COARSE_TOUCH_BOX}
      >
        <ContourStripesIcon className="size-6" />
      </ViewerToolbarButton>
      <ViewerToolbarButton
        label={THREE_D_COPY.wireView}
        title={THREE_D_COPY.wireViewTip}
        pressed={wire}
        disabled={disabled}
        onClick={() => onWire(!wire)}
        data-three-d-show="wire"
        data-lock-exempt
        className={COARSE_TOUCH_BOX}
      >
        <HashIcon className="size-6" />
      </ViewerToolbarButton>
      <ViewerToolbarButton
        label={THREE_D_COPY.room}
        title={THREE_D_COPY.roomTip}
        pressed={room}
        disabled={disabled}
        onClick={() => onRoom(!room)}
        data-three-d-show="room"
        data-lock-exempt
        className={COARSE_TOUCH_BOX}
      >
        <WarehouseIcon className="size-6" />
      </ViewerToolbarButton>
    </>
  );
}
