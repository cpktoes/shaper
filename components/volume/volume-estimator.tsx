"use client";

/**
 * The Volume Estimator screen shell, mirroring components/rails/rail-band-editor.tsx's aside +
 * main split and its outline-* palette tokens. No tab strip — the main column holds the single
 * calculation card. Reads everything from the shared design store.
 */

import { useDesign } from "@/components/design/design-store";
import { formatFeetInches, formatInchesFraction } from "@/lib/geometry/units";
import { VolumeCalculationCard } from "./volume-calculation-card";
import { VolumeControls } from "./volume-controls";

export function VolumeEstimator() {
  const { effectiveVolume, volumeResult, updateVolume, toggleImportTemplateDimensions, toggleImportRailThickness } =
    useDesign();

  return (
    <div className="flex min-h-0 w-full flex-1 flex-nowrap">
      <aside className="h-full min-h-0 w-full max-w-[400px] flex-1 basis-[340px] overflow-y-auto border-r border-surf-line-faint bg-surf-sidebar p-10 text-surf-ink">
        <VolumeControls
          effectiveVolume={effectiveVolume}
          volumeResult={volumeResult}
          onChange={updateVolume}
          onToggleImportTemplateDimensions={toggleImportTemplateDimensions}
          onToggleImportRailThickness={toggleImportRailThickness}
        />
      </aside>
      <main className="flex h-full min-h-0 min-w-0 flex-1 basis-[480px] flex-col gap-5 bg-surf-canvas px-12 py-8">
        <VolumeCalculationCard
          result={volumeResult}
          lengthDisplay={formatFeetInches(effectiveVolume.length)}
          widthDisplayLabel={formatInchesFraction(effectiveVolume.width)}
          centerThicknessDisplayLabel={formatInchesFraction(effectiveVolume.centerThickness)}
        />
      </main>
    </div>
  );
}
