"use client";

/**
 * The Volume Estimator screen shell, mirroring components/rails/rail-band-editor.tsx's aside +
 * main split and its outline-* palette tokens. No tab strip — the main column holds the single
 * calculation card. Reads everything from the shared design store.
 *
 * 09-03: moved onto the shared `DesignScreenShell` (the migration `outline-editor.tsx` and
 * `rocker-editor.tsx` already went through) with `simpleSidebar` (this screen's aside was always
 * one scrolling box with no inner scroll div and no dev footer, and that stays true) and
 * `phonePinned="none"` — VOLUME has no drawing that needs to stay in view while a slider moves, so
 * nothing is pinned on a phone: the card sits first, the controls follow beneath it, and the whole
 * screen is one vertical scroller (D-01).
 */

import { useDesign } from "@/components/design/design-store";
import { useUnits } from "@/components/units-provider";
import { DesignScreenShell } from "@/components/design/design-screen-shell";
import { formatDim, formatLength } from "@/lib/geometry/measure-display";
import { SIMPSON_PANEL_COUNT } from "@/lib/geometry/volume";
import { TabbedPanel } from "@/components/viewer/tabbed-panel";
import { VolumeCalculationCard } from "./volume-calculation-card";
import { VolumeControls } from "./volume-controls";

export function VolumeEstimator() {
  const {
    effectiveVolume,
    volumeResult,
    quotedVolumeLitres,
    updateVolume,
    toggleImportTemplateDimensions,
    toggleImportRailThickness,
  } = useDesign();
  const { system } = useUnits();

  return (
    <DesignScreenShell
      controls={
        <VolumeControls
          effectiveVolume={effectiveVolume}
          volumeResult={volumeResult}
          onChange={updateVolume}
          onToggleImportTemplateDimensions={toggleImportTemplateDimensions}
          onToggleImportRailThickness={toggleImportRailThickness}
        />
      }
      canvas={
        // Single region, so the tab labels rather than switches — same reasoning as the
        // Template screen.
        <TabbedPanel tabs={[{ id: "estimate" as const, label: "ESTIMATE" }]} active="estimate" panelClassName="overflow-y-auto">
          <VolumeCalculationCard
            result={volumeResult}
            quotedVolumeLitres={quotedVolumeLitres}
            crossSectionStationCount={SIMPSON_PANEL_COUNT + 1}
            lengthDisplay={formatLength(effectiveVolume.length, system)}
            widthDisplayLabel={formatDim(effectiveVolume.width, system)}
            centerThicknessDisplayLabel={formatDim(effectiveVolume.centerThickness, system)}
          />
        </TabbedPanel>
      }
      simpleSidebar
      phonePinned="none"
    />
  );
}
