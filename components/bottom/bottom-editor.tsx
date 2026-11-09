"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
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
import type { Mm } from "@/lib/geometry/units";
import { BOTTOM_COPY } from "./bottom-copy";
import { BottomControls } from "./bottom-controls";
import { BottomData } from "./bottom-data";
import { BottomGuide } from "./bottom-guide";
import { BottomSection } from "./bottom-section";
import { BottomTopView } from "./bottom-top-view";
import { createSectionStationStore, SectionStationContext, useSectionStation, useSetSectionStation } from "./section-station";

type BottomPage = "viewer" | "data" | "guide";

/**
 * BOTTOM, the eighth design screen (Phase 17, D-01): the board's bottom contours — pick a cut for the nose, the center
 * and the tail, and see it from below, across the board at a station, and in DATA's numbers. A third tab, GUIDE, says
 * what every cut is, what it does and how it is shaped, each drawn on the open board (D-17).
 *
 * Everything drawn comes from the store's one bottom (`resolvedBottom`, `bottomBoard`) through the pure drawings in
 * `lib/geometry/bottom-draw.ts` and DATA's numbers in `bottom.ts` — no foam off is worked out here or in any component
 * below (D-05, CLAUDE.md Rule 1). The panel writes the store through its BOTTOM actions only.
 *
 * View state stays here, never in the store, the way RAILS keeps its own (`rail-band-editor.tsx`): which tab is open,
 * which cut is live (the last section touched — it owns the drawings' lower-rail marks and the ruler; the page opens on
 * CENTER), where the section is taken (the wide point when the page opens), the Height (×4 when the page opens) and
 * whether the finished rail from RAILS is drawn (off when the page opens). None of it is saved with the board or is an
 * undo step (UI-SPEC §14), and all of it is view-only, so a locked board keeps it (`data-lock-exempt`, UI-SPEC §7).
 *
 * One station is shared three ways (D-12, UI-SPEC §3.6): the top view's cutting line (a drag or a tap), the section,
 * and the `Section at` slider under it — the cutting line's keyboard path. Moving any one moves the other two. It is
 * held in a small store of its own (`section-station.ts`) that only those three read, so a drag redraws them and
 * nothing else on the screen.
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
  // The finished rail from RAILS: off when the page opens (D-13), never saved.
  const [showFinishedRail, setShowFinishedRail] = useState(false);

  const flagsBottom = useDeferredValue(resolvedBottom);
  const flagsBoard = useDeferredValue(bottomBoard);
  const flagsSections = useDeferredValue(bottomSections);
  const floorFlags = useMemo(() => bottomFloorFlags(flagsBottom, flagsBoard, flagsSections), [flagsBottom, flagsBoard, flagsSections]);

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

  return (
    <SectionStationContext.Provider value={stationStore}>
      <DesignScreenShell
        // Two drawings to hold, so the sketch's 66% (UI-SPEC § Already done) — the phone's own layout is 17-14's.
        phonePinned="66dvh"
        controls={
          <BottomControls
            live={live}
            onLive={setLive}
            onPick={handlePick}
            onChannelCount={handleChannelCount}
            floorFlags={floorFlags}
            showFinishedRail={showFinishedRail}
            onShowFinishedRail={setShowFinishedRail}
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
            trailing={(strip) => <BoardNameTab touchClearance={strip.touchClearance} />}
          >
            {activePage === "viewer" && (
              // The two drawings share the card, the top view a little the larger, then `Section at` (sketch line
              // 299-311). BOTTOM is not printable: a shaper's paper is the order form (UI-SPEC §13).
              <div data-bottom-live={live} className="flex min-h-0 flex-1 flex-col gap-2 print:hidden">
                <BottomTopView live={live} boardName={shownName} />
                <BottomSection height={height} onHeight={setHeight} live={live} showFinishedRail={showFinishedRail} />
                <SectionAtRow length={bottomBoard.length} />
              </div>
            )}
            {activePage === "data" && (
              <div className="flex min-h-0 flex-1 flex-col print:hidden">
                <BottomData floorFlags={floorFlags} />
              </div>
            )}
            {activePage === "guide" && (
              // The cards scroll inside the folder, never the page (D-17). Words and pictures for the screen only.
              <div className="flex min-h-0 flex-1 flex-col print:hidden">
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
