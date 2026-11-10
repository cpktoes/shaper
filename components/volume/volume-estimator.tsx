"use client";

/**
 * The Volume Estimator screen shell, mirroring components/rails/rail-band-editor.tsx's aside +
 * main split and its outline-* palette tokens. Two tabs (Phase 18): ESTIMATE, the calculation card,
 * and GUIDE, what each control and figure on the page is. Reads everything from the shared design store.
 *
 * 09-03: moved onto the shared `DesignScreenShell` (the migration `outline-editor.tsx` and
 * `rocker-editor.tsx` already went through) with `simpleSidebar` (this screen's aside was always
 * one scrolling box with no inner scroll div and no dev footer, and that stays true) and
 * `phonePinned="none"` — VOLUME has no drawing that needs to stay in view while a slider moves, so
 * nothing is pinned on a phone: the card sits first, the controls follow beneath it, and the whole
 * screen is one vertical scroller (D-01).
 */

import { useState } from "react";
import { useDesign } from "@/components/design/design-store";
import { useUnits } from "@/components/units-provider";
import { DesignScreenShell } from "@/components/design/design-screen-shell";
import { formatDim, formatLength } from "@/lib/geometry/measure-display";
import { SIMPSON_PANEL_COUNT } from "@/lib/geometry/volume";
import { BoardNameTab } from "@/components/design/board-name-tab";
import { TabbedPanel } from "@/components/viewer/tabbed-panel";
import { VolumeGuide } from "@/components/guide/volume-guide";
import { VolumeCalculationCard } from "./volume-calculation-card";
import { VolumeControls } from "./volume-controls";

export function VolumeEstimator() {
  const {
    effectiveVolume,
    volumeResult,
    quotedVolumeLitres,
    updateVolume,
    toggleImportDesignedBoard,
  } = useDesign();
  const { system } = useUnits();
  // Phase 18 (D-01): ESTIMATE, then GUIDE. Which tab is open is view state, never saved.
  const [activeTab, setActiveTab] = useState<"estimate" | "guide">("estimate");

  return (
    <DesignScreenShell
      controls={
        <VolumeControls
          effectiveVolume={effectiveVolume}
          volumeResult={volumeResult}
          onChange={updateVolume}
          onToggleImportDesignedBoard={toggleImportDesignedBoard}
        />
      }
      canvas={
        // Phase 18: two tabs, so the strip switches — GUIDE last (D-01). While GUIDE is open the folder
        // grows with its cards on a short screen, as every page's GUIDE does.
        <TabbedPanel
          tabs={[
            { id: "estimate" as const, label: "ESTIMATE" },
            { id: "guide" as const, label: "GUIDE" },
          ]}
          active={activeTab}
          onSelect={setActiveTab}
          panelClassName="overflow-y-auto"
          compactOnPhone="text"
          growOnShortScreen={activeTab === "guide"}
          // Quick 261008-raw: the board's name at the band's right end.
          trailing={(strip) => <BoardNameTab touchClearance={strip.touchClearance} />}
        >
          {activeTab === "guide" ? (
            <VolumeGuide />
          ) : (
            <VolumeCalculationCard
              result={volumeResult}
              quotedVolumeLitres={quotedVolumeLitres}
              crossSectionStationCount={SIMPSON_PANEL_COUNT + 1}
              lengthDisplay={formatLength(effectiveVolume.length, system)}
              widthDisplayLabel={formatDim(effectiveVolume.width, system)}
              centerThicknessDisplayLabel={formatDim(effectiveVolume.centerThickness, system)}
            />
          )}
        </TabbedPanel>
      }
      simpleSidebar
      // Phase 18 (D-28): while GUIDE is open a phone pins the drawing area at 66% of the screen, so the
      // cards scroll inside it and the page never does; ESTIMATE keeps the one scrolling column it always had.
      phonePinned={activeTab === "guide" ? "66dvh" : "none"}
    />
  );
}
