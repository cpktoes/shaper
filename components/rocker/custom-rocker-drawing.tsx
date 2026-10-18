"use client";

/**
 * The Customize Rocker popup's drawing card (quick 261016-mkb, D-04, D-07, P-13): a card like a
 * PICK A BLANK card — the page background with a faint border, never the canvas colour (the founder,
 * round fifteen: "match the aesthetic to the rest of the site") — holding the heading, the toolbar's
 * icons in the drawing's upper right with the page's zoom control under them, the live drawing, and
 * one line under the drawing: the overlay's key, its two colour words in their colours.
 *
 * One drawing in both states (quick 261017-ojc, D-01, P-1, 2026-10-17 — the founder: "the edit custom
 * rocker viewer changes a ton with the show board on/off. I prefer the on view. Can we make the off
 * view match it?"): the popup never mounts the page's own viewer. Show my board, off by default every
 * time the popup opens (round nine), adds the board inside the same picture of the bent blank
 * (`boardInBlankFrame`, read off the DRAFT's side profile) and its figures beside the blank's, and the
 * heading says so (D-04).
 *
 * The switches are icons in the drawing's upper right, in the page's toolbar look (D-08, P-11): Show my
 * board everywhere, and on a phone a second, Dimensions (D-07 — the founder: "lets also add a toggle to
 * turn off dimensions when on a phone (so the user can see the board in a larger view)"), pressed by
 * default and On every time the popup opens (P-10). Off, every card, figure, title and tick goes and the
 * foam fills the drawing. Which screens get it is CLAUDE.md's two switches, never the pointer: below
 * the shell width (`max-shell`) and on a short screen (`[@media(max-height:500px)]`) — in CSS for the
 * icon, and in JavaScript for what the drawing does (`useBelowShellWidth`, `useShortScreen`, the same
 * queries, as ROCKER's TOP VIEW tab reads them), so a window widening past the line brings the figures
 * back even with the icon left off.
 *
 * One spec in, one drawing out (the founder's round-ten catch): the curve, the overlay and every
 * figure come from the ONE draft spec the popup hands down — never the board's own rocker.
 *
 * The drawing turns the way the page's does (P-13): on a touch screen it follows how the device is
 * held — upright, nose up; sideways, flat — and with a mouse it lies flat. There is no Rotate button.
 * The zoom starts again at 1x whenever the frame changes (a turn, Show my board or Dimensions), by the
 * provider's key, exactly as the page keys its own.
 */

import { RulerDimensionLineIcon } from "lucide-react";
import { useMemo } from "react";
import { useDesign } from "@/components/design/design-store";
import * as ViewerMedia from "@/components/design/use-viewer-media";
import { BoardInBlankIcon, ViewerToolbar, ViewerToolbarButton } from "@/components/viewer/toolbar-button";
import { COARSE_TOUCH_BOX, ViewerZoomControl, ViewerZoomProvider } from "@/components/viewer/zoom-viewport";
import type { PreparedBlank } from "@/lib/geometry/blank-fit";
import type { BlankRockerSpec } from "@/lib/geometry/custom-rocker";
import { boardInBlankFrame } from "@/lib/geometry/custom-rocker-art";
import { DIMENSIONS_LABEL, drawingHeading, OVERLAY_KEY, SHOW_BOARD_LABEL } from "@/lib/geometry/custom-rocker-text";
import { designSideProfile, LIVE_DESIGN_RULES } from "@/lib/geometry/design";
import { cn } from "@/lib/utils";
import { CustomRockerBlankView } from "./custom-rocker-blank-view";

const TONE_CLASS = { 1: "text-rocker-adjust-1", 2: "text-rocker-adjust-2" } as const;

export interface CustomRockerDrawingProps {
  /** The blank bent by `draftSpec`. */
  bent: PreparedBlank;
  /** The popup's draft, as a spec — the one spec every line and figure is drawn from. */
  draftSpec: BlankRockerSpec;
  showBoard: boolean;
  onShowBoardChange: (on: boolean) => void;
  /** D-07: the phone's Dimensions switch — On every time the popup opens (P-10). */
  dimensions: boolean;
  onDimensionsChange: (on: boolean) => void;
}

export function CustomRockerDrawing({
  bent,
  draftSpec,
  showBoard,
  onShowBoardChange,
  dimensions,
  onDimensionsChange,
}: CustomRockerDrawingProps) {
  const { outline, rocker, foil, blank } = useDesign();
  const coarse = ViewerMedia.useCoarsePointer();
  const portrait = ViewerMedia.usePortraitViewport();
  const orientation = coarse ? (portrait ? "vertical" : "horizontal") : "horizontal";
  // The same two lines the Dimensions icon's CSS shows it by (D-07): where it is not shown, the
  // figures are always drawn.
  const belowShellWidth = ViewerMedia.useBelowShellWidth();
  const shortScreen = ViewerMedia.useShortScreen();
  const dimensionsShown = dimensions || !(belowShellWidth || shortScreen);

  // With the board on: the draft's own side profile — the board's outline, rocker and foil, its blank
  // bent by the draft (measured at plan time: 2–8 ms a change, well under a frame) — carried into the
  // blank's frame so the board draws inside the same picture (quick 261017-ojc, P-3).
  const board = useMemo(
    () =>
      showBoard && blank
        ? boardInBlankFrame(designSideProfile({ outline, rocker, foil, blank: { ...blank, rocker: draftSpec } }, LIVE_DESIGN_RULES))
        : null,
    [showBoard, outline, rocker, foil, blank, draftSpec],
  );

  return (
    <div
      data-custom-rocker-drawing
      // P-9: on a short screen the card grows with the drawing (never under its 220), so the drawing
      // column scrolls rather than clipping — the RAILS rule B precedent.
      className="relative flex min-h-0 flex-1 flex-col gap-2 rounded-[10px] border border-surf-line-faint bg-surf-ground p-3 max-shell:p-2 [@media(max-height:500px)]:min-h-[220px] [@media(max-height:500px)]:flex-[1_0_auto] [@media(max-height:500px)]:p-2"
    >
      <ViewerZoomProvider key={`${orientation}|${showBoard}|${dimensionsShown}`}>
        {/* The band over the drawing (P-11): the heading top-left, the icons top-right and, with a
            mouse, the zoom row under them — so the drawing starts under the band and never slides
            beneath it. On a touch screen the zoom row only shows once zoomed in (a pinch does the
            zooming), and then floats over the drawing as on the page: the pointer decides whether
            the control draws, exactly as it does for the page's own (CLAUDE.md "Layout"). */}
        <div className="relative flex min-h-0 flex-1 flex-col [@media(max-height:500px)]:min-h-fit">
          {/* Whose figures the drawing carries (fast task 171; D-04), on the icons' 34-px row. */}
          <p
            data-custom-rocker-heading
            className="absolute top-0 left-0 z-10 flex h-[34px] items-center text-[10px] font-extrabold tracking-architectural text-surf-ink-muted uppercase"
          >
            {drawingHeading(showBoard)}
          </p>
          <ViewerToolbar>
            <ViewerToolbarButton
              label={SHOW_BOARD_LABEL}
              pressed={showBoard}
              onClick={() => onShowBoardChange(!showBoard)}
              data-show-board
              data-lock-exempt
              className={COARSE_TOUCH_BOX}
            >
              <BoardInBlankIcon className="size-6" />
            </ViewerToolbarButton>
            {/* DOM-after Show my board, so it lands to its left. Shown below the shell width and on a
                short screen — by width or height, never the pointer (D-07). */}
            <ViewerToolbarButton
              label={DIMENSIONS_LABEL}
              pressed={dimensions}
              onClick={() => onDimensionsChange(!dimensions)}
              data-show-dimensions
              data-lock-exempt
              className={cn(COARSE_TOUCH_BOX, "hidden max-shell:flex [@media(max-height:500px)]:flex")}
            >
              <RulerDimensionLineIcon className="size-6" />
            </ViewerToolbarButton>
          </ViewerToolbar>
          <ViewerZoomControl />
          <div className="relative mt-20 min-h-0 flex-1 coarse:mt-10 [@media(max-height:500px)]:min-h-fit">
            <CustomRockerBlankView
              bent={bent}
              spec={draftSpec}
              board={board}
              orientation={orientation}
              dimensions={dimensionsShown}
              scroll={shortScreen}
            />
          </div>
        </div>
      </ViewerZoomProvider>
      {/* The key, alone on its line under the drawing (D-08). */}
      <p data-custom-rocker-key className="text-xs leading-snug text-surf-ink-muted max-shell:text-[11px]">
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
    </div>
  );
}
