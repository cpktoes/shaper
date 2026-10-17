"use client";

/**
 * The Customize Rocker popup's drawing card (quick 261016-mkb, D-04, D-07, P-3, P-13): a card like a
 * PICK A BLANK card — the page background with a faint border, never the canvas colour (the founder,
 * round fifteen: "match the aesthetic to the rest of the site") — holding the live drawing, the page's
 * zoom control in its corner, and one line under the drawing: the overlay's key, its two colour words
 * in their colours, and the Show my board chip.
 *
 * Show my board, off by default every time the popup opens (round nine): off, the blank alone with its
 * own five stations (`CustomRockerBlankView`); on, the board in the bent blank with the board's five
 * stations exactly as the page draws them — the page's own `RockerViewer`, handed the DRAFT's side
 * profile and the overlay in the board's frame (P-3).
 *
 * One spec in, one drawing out (the founder's round-ten catch): the curve, the overlay and every
 * figure come from the ONE draft spec the popup hands down — never the board's own rocker.
 *
 * The drawing turns the way the page's does (P-13): on a touch screen it follows how the device is
 * held — upright, nose up; sideways, flat — and with a mouse it lies flat. There is no Rotate button.
 * The zoom starts again at 1x whenever the frame changes (a turn, or Show my board), by the
 * provider's key, exactly as the page keys its own.
 */

import { useMemo } from "react";
import { useDesign } from "@/components/design/design-store";
import * as ViewerMedia from "@/components/design/use-viewer-media";
import { ViewerZoomControl, ViewerZoomProvider } from "@/components/viewer/zoom-viewport";
import type { PreparedBlank } from "@/lib/geometry/blank-fit";
import type { BlankRockerSpec } from "@/lib/geometry/custom-rocker";
import { boardFrameOverlay } from "@/lib/geometry/custom-rocker-art";
import { drawingHeading, OVERLAY_KEY, SHOW_BOARD_LABEL } from "@/lib/geometry/custom-rocker-text";
import { designSideProfile, LIVE_DESIGN_RULES } from "@/lib/geometry/design";
import { cn } from "@/lib/utils";
import { CHIP_CLASS, CHIP_OFF, CHIP_ON } from "./blank-filter-bar";
import { CustomRockerBlankView } from "./custom-rocker-blank-view";
import { RockerViewer } from "./rocker-viewer";

const TONE_CLASS = { 1: "text-rocker-adjust-1", 2: "text-rocker-adjust-2" } as const;

export interface CustomRockerDrawingProps {
  /** The blank bent by `draftSpec`. */
  bent: PreparedBlank;
  /** The popup's draft, as a spec — the one spec every line and figure is drawn from. */
  draftSpec: BlankRockerSpec;
  showBoard: boolean;
  onShowBoardChange: (on: boolean) => void;
}

export function CustomRockerDrawing({ bent, draftSpec, showBoard, onShowBoardChange }: CustomRockerDrawingProps) {
  const { outline, rocker, foil, blank } = useDesign();
  const coarse = ViewerMedia.useCoarsePointer();
  const portrait = ViewerMedia.usePortraitViewport();
  const orientation = coarse ? (portrait ? "vertical" : "horizontal") : "horizontal";

  // With the board on: the draft's own side profile — the board's outline, rocker and foil, its blank
  // bent by the draft (measured at plan time: 2–8 ms a change, well under a frame).
  const profile = useMemo(
    () =>
      showBoard && blank
        ? designSideProfile({ outline, rocker, foil, blank: { ...blank, rocker: draftSpec } }, LIVE_DESIGN_RULES)
        : null,
    [showBoard, outline, rocker, foil, blank, draftSpec],
  );
  const boardOverlay = useMemo(
    () => (profile?.blank ? boardFrameOverlay(draftSpec, profile.blank) : undefined),
    [profile, draftSpec],
  );

  return (
    <div
      data-custom-rocker-drawing
      className="relative flex min-h-0 flex-1 flex-col gap-2 rounded-[10px] border border-surf-line-faint bg-surf-ground p-3 max-shell:p-2 [@media(max-height:500px)]:p-2 [@media(max-height:500px)]:min-h-[220px]"
    >
      <ViewerZoomProvider key={`${orientation}|${showBoard}`}>
        {/* The zoom control's band: with a mouse the − 1x + row always shows, so the drawing starts
            under it and never slides beneath it; on a touch screen the row only appears once zoomed
            in (a pinch does the zooming), so the drawing keeps the band — the pointer decides whether
            the control draws, exactly as it does for the page's own (CLAUDE.md "Layout"). */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* Whose figures the drawing carries (fast task 171). With a mouse it sits in the zoom
              control's band, top-left; on a touch screen that band is gone, so it takes a line of
              its own above the drawing. */}
          <p
            data-custom-rocker-heading
            className="absolute top-0 left-0 z-10 text-[10px] font-extrabold tracking-architectural text-surf-ink-muted uppercase coarse:static coarse:mb-1"
          >
            {drawingHeading(showBoard)}
          </p>
          <div className="relative mt-10 min-h-0 flex-1 coarse:mt-0">
            {profile ? (
              <RockerViewer
                profile={profile}
                blank={profile.blank ?? undefined}
                orientation={orientation}
                fitToBoard
                overlay={boardOverlay}
              />
            ) : (
              <CustomRockerBlankView bent={bent} spec={draftSpec} orientation={orientation} />
            )}
          </div>
          <ViewerZoomControl placement="corner" />
        </div>
      </ViewerZoomProvider>
      {/* One line under the drawing: the key beside the chip, never wrapping the chip under it — on a
          phone that second line would come straight out of the drawing's pinned height. */}
      <div className="flex items-center justify-between gap-3">
        <p data-custom-rocker-key className="min-w-0 flex-1 text-xs leading-snug text-surf-ink-muted max-shell:text-[11px]">
          {OVERLAY_KEY.map((part, i) =>
            part.tone ? (
              <span key={i} className={TONE_CLASS[part.tone]}>
                {part.text}
              </span>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </p>
        <button
          type="button"
          data-lock-exempt
          data-show-board
          aria-pressed={showBoard}
          aria-label={SHOW_BOARD_LABEL}
          onClick={() => onShowBoardChange(!showBoard)}
          className={cn(CHIP_CLASS, showBoard ? CHIP_ON : CHIP_OFF)}
        >
          {SHOW_BOARD_LABEL}: {showBoard ? "On" : "Off"}
        </button>
      </div>
    </div>
  );
}
