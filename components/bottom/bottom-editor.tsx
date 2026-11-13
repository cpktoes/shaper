"use client";

import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import { useDesign } from "@/components/design/design-store";
import { DesignScreenShell } from "@/components/design/design-screen-shell";
import { BoardNameTab } from "@/components/design/board-name-tab";
import { bandBoardName } from "@/components/design/board-name-copy";
import { sliderValue } from "@/components/design/slider-row";
import { Slider } from "@/components/ui/slider";
import { useUnits } from "@/components/units-provider";
import { TabbedPanel } from "@/components/viewer/tabbed-panel";
import { bottomStationSlider, formatBottomStation } from "@/lib/geometry/blank-reasons";
import { bottomFloorFlags, cutKind, type BottomChannelsSpec, type BottomCutName, type BottomSectionKey } from "@/lib/geometry/bottom";
import type { BottomCutKey, SectionHeight } from "@/lib/geometry/bottom-draw";
import { sideProfileRise } from "@/lib/geometry/bottom-side-view";
import { sideProfileLines } from "@/lib/geometry/side-profile";
import type { Mm } from "@/lib/geometry/units";
import { BOTTOM_COPY, BOTTOM_SECTION_NAME } from "./bottom-copy";
import { BottomControls } from "./bottom-controls";
import { BottomData } from "./bottom-data";
import { BottomGuide } from "./bottom-guide";
import { BottomSection } from "./bottom-section";
import { BottomSideView } from "./bottom-side-view";
import { BottomTopView } from "./bottom-top-view";
import { useViewerSplit } from "./viewer-split";
import { createSectionStationStore, SectionStationContext, useSectionStation, useSetSectionStation } from "./section-station";

type BottomPage = "viewer" | "data" | "guide";

/** The phone's NOSE · CENTER · TAIL row, in the order the board is drawn (nose left). */
const PHONE_SECTIONS: readonly BottomSectionKey[] = ["nose", "center", "tail"];

/**
 * BOTTOM, the eighth design screen (Phase 17, D-01): the board's bottom contours — pick a cut for the nose, the center
 * and the tail, and see it from below, across the board at a station, from the side, and in DATA's numbers. VIEWER's
 * three drawings are the board from below, the cross-section and, since quick 261112-ogx, the side view (`ViewerDrawings`). A third tab, GUIDE, says
 * what every cut is, what it does and how it is shaped, each drawn on the open board (D-17).
 *
 * Everything drawn comes from the store's one bottom (`resolvedBottom`, `bottomBoard`) through the pure drawings in
 * `lib/geometry/bottom-draw.ts` and DATA's numbers in `bottom.ts` — no foam off is worked out here or in any component
 * below (D-05, CLAUDE.md Rule 1). The panel writes the store through its BOTTOM actions only.
 *
 * View state stays here, never in the store, the way RAILS keeps its own (`rail-band-editor.tsx`): which tab is open,
 * which cut is live (the last section touched — it owns the drawings' lower-rail marks and the ruler; the page opens on
 * CENTER), where the section is taken (the wide point when the page opens), the section's Height (×4 when the page opens),
 * the side view's Height (×1 when the page opens — true proportions, the least room: the founder, 2026-11-12) and
 * whether the finished rail from RAILS is drawn (off when the page opens). None of it is saved with the board or is an
 * undo step (UI-SPEC §14), and all of it is view-only, so a locked board keeps it (`data-lock-exempt`, UI-SPEC §7).
 *
 * One station is shared four ways (D-12, UI-SPEC §3.6): the top view's cutting line (a drag or a tap), the section, the
 * side view's station line (also a drag or a tap) and the `Section at` slider under them all — the cutting line's keyboard
 * path. Moving any one moves the others. It is held in a small store of its own (`section-station.ts`) that only those
 * read, so a drag redraws them and nothing else on the screen.
 *
 * The three drawings share the card's height (`bottomViewerSplit`, measured by `useViewerSplit`): the side view takes only
 * the height its drawing needs at its Height (never more than 40% of the room), and the board from below and the
 * cross-section share the rest 1.25 to 1, the board from below never taller than its board needs. All three keep one
 * length scale, so the section's station line runs straight through the board from below and the side view.
 *
 * On an upright phone (D-27, UI-SPEC §6) the drawing is pinned over the controls at 66% of the screen, the folder's card
 * the same height on every tab, and VIEWER's card opens with RAILS' NOSE · CENTER · TAIL row: the section tapped is the
 * live one, and its card is the one drawn beneath (the channels are TAIL's). The row and the one-card rule are CSS
 * behind the layout's width line — nothing here reads the window — so a computer, and a phone held sideways, keep all
 * three cards and no row.
 *
 * On a short screen — a phone held sideways, by height alone — the three drawings keep a floor between them rather than
 * being squeezed into what is left under the top bar, the folder's cards grow with what they hold (`growOnShortScreen`,
 * RAILS' own rule) and the drawing column scrolls; DATA and GUIDE grow the same way and scroll with the column, so
 * nothing scrolls inside something that scrolls.
 *
 * The floor scan (`bottomFloorFlags`, 50–75 ms on a full bottom) runs once here, on deferred copies so a drag keeps its
 * thumb under the finger, and feeds both the panel's sentence and DATA's note and cells — never a second scan.
 */
export function BottomEditor() {
  const { bottom, bottomBoard, resolvedBottom, bottomSections, pickBottomCut, setChannelCount, boardName, modelId } = useDesign();
  const [activePage, setActivePage] = useState<BottomPage>("viewer");
  // The live cut: the page opens on CENTER (UI-SPEC §1); a press in a card, or a pick, makes that section live.
  const [live, setLive] = useState<BottomCutKey>("center");
  // Where the section is taken: the wide point when the page opens (a store of its own, read by the three that show it).
  const [stationStore] = useState(() => createSectionStationStore({ follow: "wide" }));
  // ×4 when the page opens, kept while on the page, never saved (D-13).
  const [height, setHeight] = useState<SectionHeight>(4);
  // The side view's Height: ×1 when the page opens (true proportions, the least room), kept while on the page, never saved.
  const [sideHeight, setSideHeight] = useState<SectionHeight>(1);
  // The finished rail from RAILS: off when the page opens (D-13), never saved.
  const [showFinishedRail, setShowFinishedRail] = useState(false);

  const flagsBottom = useDeferredValue(resolvedBottom);
  const flagsBoard = useDeferredValue(bottomBoard);
  const flagsSections = useDeferredValue(bottomSections);
  const floorFlags = useMemo(() => bottomFloorFlags(flagsBottom, flagsBoard, flagsSections), [flagsBottom, flagsBoard, flagsSections]);
  // The scan has caught up once every deferred copy is the board as it is now; until then the flags are the last board's.
  const floorScanSettled = flagsBottom === resolvedBottom && flagsBoard === bottomBoard && flagsSections === bottomSections;

  // Stable while the board is unchanged, so nothing but a pick redraws the panel (`BottomControls` is memoised).
  const handlePick = useCallback(
    (section: BottomSectionKey, name: BottomCutName) => {
      pickBottomCut(section, name);
      setLive(section);
      // A cut picked moves the section to its deepest (sketch lines 1120-1121); a flat leaves the section where it is.
      if (cutKind(name) !== "flat") stationStore.set({ follow: section });
    },
    [pickBottomCut, stationStore],
  );

  // A count picked in the CHANNELS block (D-10): the channels become the live cut, and opening a set from None moves the
  // section to their Deepest (sketch line 1127); switching between counts, or to None, leaves the section where it is.
  const openingCount = bottom.channels.count;
  const handleChannelCount = useCallback(
    (count: BottomChannelsSpec["count"]) => {
      const opening = openingCount === 0 && count > 0;
      setChannelCount(count);
      setLive("channels");
      if (opening) stationStore.set({ follow: "channels" });
    },
    [openingCount, setChannelCount, stationStore],
  );

  const shownName = bandBoardName(modelId, boardName);
  // The section the phone's row shows as picked: the live one, the channels being TAIL's own block.
  const phoneSection: BottomSectionKey = live === "channels" ? "tail" : live;

  return (
    <SectionStationContext.Provider value={stationStore}>
      <DesignScreenShell
        // Three drawings to hold in the sketch's 66% (UI-SPEC § Already done): the side view takes only what its drawing needs.
        phonePinned="66dvh"
        controls={
          <BottomControls
            live={live}
            onLive={setLive}
            onPick={handlePick}
            onChannelCount={handleChannelCount}
            floorFlags={floorFlags}
            floorScanSettled={floorScanSettled}
            showFinishedRail={showFinishedRail}
            onShowFinishedRail={setShowFinishedRail}
            // The row is VIEWER's, so only VIEWER narrows the cards beneath to one; DATA and GUIDE show all three.
            phoneSection={activePage === "viewer" ? phoneSection : undefined}
          />
        }
        canvas={
          <TabbedPanel
            tabs={[
              { id: "viewer" as const, label: BOTTOM_COPY.viewerTab },
              { id: "data" as const, label: BOTTOM_COPY.dataTab },
              { id: "guide" as const, label: BOTTOM_COPY.guideTab },
            ]}
            active={activePage}
            onSelect={setActivePage}
            compactOnPhone={activePage === "viewer" ? "drawing" : "text"}
            // On an upright phone the card is the pinned height on every tab — 66% of the screen less the column's
            // rims, the strip and the folder's border (UI-SPEC §6) — so VIEWER, DATA and GUIDE never move the controls
            // beneath, and DATA and GUIDE scroll inside it.
            panelClassName="max-shell:h-[calc(66dvh-40px)] max-shell:flex-none"
            // A phone held sideways: the cards grow with their content and the drawing column scrolls (RAILS' rule).
            growOnShortScreen
            trailing={(strip) => <BoardNameTab touchClearance={strip.touchClearance} />}
          >
            {activePage === "viewer" && (
              <ViewerDrawings
                live={live}
                onLive={setLive}
                phoneSection={phoneSection}
                boardName={shownName}
                height={height}
                onHeight={setHeight}
                sideHeight={sideHeight}
                onSideHeight={setSideHeight}
                showFinishedRail={showFinishedRail}
              />
            )}
            {activePage === "data" && (
              // On a short screen the tables take their own height and the column scrolls, not a box inside it.
              <div className="flex min-h-0 flex-1 flex-col print:hidden [@media(max-height:500px)]:flex-none">
                <BottomData floorFlags={floorFlags} />
              </div>
            )}
            {activePage === "guide" && (
              // The cards scroll inside the folder, never the page (D-17). Words and pictures for the screen only.
              // On a short screen they take their own height and scroll with the drawing column.
              <div className="flex min-h-0 flex-1 flex-col print:hidden [@media(max-height:500px)]:flex-none">
                <BottomGuide />
              </div>
            )}
          </TabbedPanel>
        }
      />
    </SectionStationContext.Provider>
  );
}

/**
 * VIEWER's three drawings (quick 261112-ogx; the founder, 2026-11-12): the board from below, the cross-section and the
 * side view, then `Section at`. They share the card's height by `bottomViewerSplit` — the side view takes what its drawing
 * needs at its Height (x1 when the page opens), the board from below and the cross-section share the rest as they always
 * did — so it is measured here, from the boxes themselves, never from the window.
 *
 * On a short screen the three keep a floor between them (UI-SPEC §6) and the column scrolls to the rest. The floor was 360
 * dots for two drawings; measured on a sideways iPhone (844 x 390) and Pixel 7 (863 x 360) at ×1, 470 leaves the board from
 * below 153 dots, the cross-section 123 and the side view 44 (460 left the board from below at 148, under the 150 the
 * sideways spec holds it to).
 */
function ViewerDrawings({
  live,
  onLive,
  phoneSection,
  boardName,
  height,
  onHeight,
  sideHeight,
  onSideHeight,
  showFinishedRail,
}: {
  live: BottomCutKey;
  onLive: (live: BottomCutKey) => void;
  phoneSection: BottomSectionKey;
  boardName: string;
  height: SectionHeight;
  onHeight: (height: SectionHeight) => void;
  sideHeight: SectionHeight;
  onSideHeight: (height: SectionHeight) => void;
  showFinishedRail: boolean;
}) {
  const { bottomBoard, resolvedBottom, sideProfile } = useDesign();
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Both side profiles, worked out once per bottom (the same lines the split's rise and the drawing read).
  const lines = useMemo(() => sideProfileLines(resolvedBottom, bottomBoard, sideProfile), [resolvedBottom, bottomBoard, sideProfile]);
  const rise = useMemo(() => sideProfileRise(lines), [lines]);
  const split = useViewerSplit(wrapperRef, { board: bottomBoard, rise, factor: sideHeight });
  return (
    <div
      ref={wrapperRef}
      data-bottom-live={live}
      className="flex min-h-0 flex-1 flex-col gap-2 print:hidden [@media(max-height:500px)]:min-h-[470px]"
    >
      {/* Phone only: RAILS' NOSE · CENTER · TAIL row (`rail-band-editor.tsx`), copied — which section's
          controls show beneath the pinned drawing, and the live cut. Hidden at the layout's width line.
          It only changes what is seen, so a locked board keeps it (`data-lock-exempt`). */}
      <div data-bottom-phone-sections className="hidden flex-none gap-1.5 pt-[11px] max-shell:flex" role="tablist">
        {PHONE_SECTIONS.map((section) => {
          const on = section === phoneSection;
          return (
            <button
              key={section}
              type="button"
              role="tab"
              aria-selected={on}
              data-lock-exempt
              onClick={() => onLive(section)}
              className={
                "cursor-pointer rounded-t-lg border px-2 py-0.5 text-xs font-display font-bold tracking-architectural uppercase " +
                // Touch-only: a 44-dot hit area centred on the 22-dot tab (RAILS' own).
                "coarse:relative coarse:after:absolute coarse:after:inset-x-0 coarse:after:top-1/2 coarse:after:h-11 coarse:after:-translate-y-1/2 coarse:after:z-10 coarse:after:content-[''] " +
                (on
                  ? "border-surf-line border-b-0 bg-surf-tab-active text-surf-ink"
                  : "border-transparent bg-transparent text-surf-ink-muted")
              }
            >
              {BOTTOM_SECTION_NAME[section]}
            </button>
          );
        })}
      </div>
      <BottomTopView live={live} boardName={boardName} boxHeight={split?.top} />
      <BottomSection height={height} onHeight={onHeight} live={live} showFinishedRail={showFinishedRail} />
      <BottomSideView lines={lines} board={bottomBoard} split={split} height={sideHeight} onHeight={onSideHeight} boardName={boardName} />
      <SectionAtRow length={bottomBoard.length} />
    </div>
  );
}

/**
 * `Section at` (UI-SPEC §3.6): the word and the app's accent slider, the track the distance from the nose (nose left, as
 * the top view draws the board), 1/2" steps (Metric 10 mm) through `bottomStationSlider`, filled from the nose to the
 * dot. It speaks `Section at` and its value `36" from the tail`. The cutting line's keyboard path: moving it moves the
 * line, and dragging the line moves it. View-only, so a locked board keeps it (`data-lock-exempt`).
 */
function SectionAtRow({ length }: { length: Mm }) {
  const { system } = useUnits();
  const station = useSectionStation();
  const setStation = useSetSectionStation();
  const view = bottomStationSlider(station, length, system);
  return (
    // On a computer the floating Undo and Redo pair sits over the card's bottom-right corner once there is something to
    // take back (`phone-undo-bar.tsx`, 16 dots in from the window's corner); the row stops short of it, so the track's
    // tail end can always be reached. A phone's pair floats over the controls, below the pinned drawing.
    <div data-bottom-section-at data-lock-exempt className="flex flex-none items-center gap-2 pt-2 max-shell:pt-1 shell:pr-[72px]">
      <span className="text-xs whitespace-nowrap text-surf-ink-muted font-normal">{BOTTOM_COPY.sectionAt}</span>
      <Slider
        data-lock-exempt
        className="slider-accent flex-1"
        value={view.value}
        min={view.min}
        max={view.max}
        step={view.step}
        onValueChange={(v) => setStation({ at: view.toMm(sliderValue(v)) })}
        thumbAriaLabel={BOTTOM_COPY.sectionAt}
        thumbAriaValueText={BOTTOM_COPY.sectionAtValue(formatBottomStation(station, system))}
      />
    </div>
  );
}
