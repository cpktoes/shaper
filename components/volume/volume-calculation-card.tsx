/**
 * The Volume Calculation card, ported from reference/project/Volume.dc.html lines 107-149.
 * Card-and-rows treatment follows components/rails/rail-data-table.tsx. Every number here comes
 * from `VolumeResult`; this component performs no arithmetic beyond unit formatting.
 */

import type { VolumeResult } from "@/lib/geometry/volume";
import { formatInchesFraction, MM_PER_INCH } from "@/lib/geometry/units";

const SQMM_PER_SQIN = MM_PER_INCH * MM_PER_INCH;

interface VolumeCalculationCardProps {
  result: VolumeResult;
  lengthDisplay: string;
  widthDisplayLabel: string;
  centerThicknessDisplayLabel: string;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-[#f3efe3] py-2 text-sm">
      <span className="text-[#8a8272]">{label}</span>
      <span className="font-bold text-outline-ink">{value}</span>
    </div>
  );
}

export function VolumeCalculationCard({
  result,
  lengthDisplay,
  widthDisplayLabel,
  centerThicknessDisplayLabel,
}: VolumeCalculationCardProps) {
  const areaSqIn = result.area / SQMM_PER_SQIN;
  const areaRowLabel = result.importingTemplate ? "Template Area" : "Board Area (estimated)";
  const areaSqInDisplay = `${areaSqIn.toFixed(1)} sq in${result.importingTemplate ? " (imported)" : ""}`;
  const weightedThicknessLabel = result.geomReady ? "Length-Weighted Effective Thickness" : "Weighted Thickness";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-xl border border-[#e4ddc9] bg-white p-5 text-[#1c1b19]">
      <div className="mb-4 text-xl font-extrabold text-outline-ink">Volume Calculation</div>
      <div className="flex w-full flex-col gap-0">
        {!result.importingTemplate && (
          <>
            <Row label="Board Length" value={lengthDisplay} />
            <Row label="Board Width" value={widthDisplayLabel} />
            <Row label="Center Thickness" value={centerThicknessDisplayLabel} />
          </>
        )}
        <Row label={areaRowLabel} value={areaSqInDisplay} />
        {result.geomReady && (
          <>
            <Row
              label="Tail Cross-Section Thickness"
              value={formatInchesFraction(result.tailCrossSectionThickness!)}
            />
            <Row
              label="Center Cross-Section Thickness"
              value={formatInchesFraction(result.centerCrossSectionThickness!)}
            />
            <Row
              label="Nose Cross-Section Thickness"
              value={formatInchesFraction(result.noseCrossSectionThickness!)}
            />
          </>
        )}
        <Row label={weightedThicknessLabel} value={formatInchesFraction(result.weightedThickness)} />

        <div className="mt-1.5 flex items-baseline justify-between border-t-2 border-[#e4ddc9] pt-3.5 pb-2">
          <span className="text-sm font-bold text-[#8a8272]">Estimated Volume</span>
          <span className="text-right">
            <span className="block text-[22px] font-extrabold text-outline-accent-strong">
              {result.volumeLitres.toFixed(2)} L
            </span>
            <span className="block text-[13px] font-semibold text-[#8a8272]">
              ({result.volumeCubicInches.toFixed(1)} cu in)
            </span>
          </span>
        </div>
      </div>
      <div className="mt-auto pt-4 text-[13px] leading-relaxed text-[#8a8272] italic">
        This is a rough estimate, not a 3D CAD model accurate calculation of volume. If comparing
        to a board of known dimensions and volume, you can tune the Board Type slider to calibrate
        for your purposes.
      </div>
    </div>
  );
}
