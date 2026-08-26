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
  /** The Summary dashboard's dense treatment: the same rows as the Volume screen, at the summary's
   * smaller type. What compact drops is chrome, not data — the closing estimate disclaimer. It
   * also used to drop a "Volume Calculation" heading, until that heading was removed from both
   * variants: the nav already names the screen and the summary card carries its own title. It
   * used to drop the
   * Center Thickness and the three cross-section rows too, which meant the Summary quietly showed
   * less than the Volume screen for exactly the case a shaper cares about: importing real geometry
   * from the template and rails. Defaults to `false`, the Volume screen's own full card. */
  compact?: boolean;
}

function Row({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: React.ReactNode;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        className="flex justify-between border-b border-surf-line-faint py-0.5"
        style={{ fontSize: "var(--summary-font-row, 11px)" }}
      >
        <span className="text-surf-ink-muted">{label}</span>
        <span className="font-bold text-surf-ink">{value}</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between border-b border-surf-line-faint py-2 text-sm">
      <span className="text-surf-ink-muted">{label}</span>
      <span className="font-bold text-surf-ink">{value}</span>
    </div>
  );
}

export function VolumeCalculationCard({
  result,
  lengthDisplay,
  widthDisplayLabel,
  centerThicknessDisplayLabel,
  compact = false,
}: VolumeCalculationCardProps) {
  const areaSqIn = result.area / SQMM_PER_SQIN;
  const areaRowLabel = result.importingTemplate ? "Template Area" : "Board Area (estimated)";
  const areaSqInDisplay = `${areaSqIn.toFixed(1)} sq in${result.importingTemplate ? " (imported)" : ""}`;
  const weightedThicknessLabel = result.geomReady ? "Length-Weighted Effective Thickness" : "Weighted Thickness";

  if (compact) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        {!result.importingTemplate && (
          <>
            <Row label="Board Length" value={lengthDisplay} compact />
            <Row label="Board Width" value={widthDisplayLabel} compact />
            <Row label="Center Thickness" value={centerThicknessDisplayLabel} compact />
          </>
        )}
        <Row label={areaRowLabel} value={areaSqInDisplay} compact />
        {result.geomReady && (
          <>
            <Row
              label="Tail Cross-Section Thickness"
              value={formatInchesFraction(result.tailCrossSectionThickness!)}
              compact
            />
            <Row
              label="Center Cross-Section Thickness"
              value={formatInchesFraction(result.centerCrossSectionThickness!)}
              compact
            />
            <Row
              label="Nose Cross-Section Thickness"
              value={formatInchesFraction(result.noseCrossSectionThickness!)}
              compact
            />
          </>
        )}
        <Row label={weightedThicknessLabel} value={formatInchesFraction(result.weightedThickness)} compact />

        <div className="mt-1 flex items-baseline justify-between border-t-2 border-surf-line-faint pt-1.5 pb-1">
          <span
            className="font-bold text-surf-ink-muted"
            style={{ fontSize: "var(--summary-font-label, 12px)" }}
          >
            Estimated Volume
          </span>
          <span className="text-right">
            <span
              className="block font-extrabold text-surf-ink"
              style={{ fontSize: "var(--summary-font-volume, 16px)" }}
            >
              {result.volumeLitres.toFixed(2)} L
            </span>
            <span className="block font-semibold text-surf-ink-muted" style={{ fontSize: "var(--summary-font-row, 11px)" }}>
              ({result.volumeCubicInches.toFixed(1)} cu in)
            </span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto text-surf-ink">
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

        <div className="mt-1.5 flex items-baseline justify-between border-t-2 border-surf-line-faint pt-3.5 pb-2">
          <span className="text-sm font-bold text-surf-ink-muted">Estimated Volume</span>
          <span className="text-right">
            <span className="block text-[22px] font-extrabold text-surf-ink">
              {result.volumeLitres.toFixed(2)} L
            </span>
            <span className="block text-[13px] font-semibold text-surf-ink-muted">
              ({result.volumeCubicInches.toFixed(1)} cu in)
            </span>
          </span>
        </div>
      </div>
      <div className="mt-auto pt-4 text-[13px] leading-relaxed text-surf-ink-muted italic">
        This is a rough estimate, not a 3D CAD model accurate calculation of volume. If comparing
        to a board of known dimensions and volume, you can tune the Board Type slider to calibrate
        for your purposes.
      </div>
    </div>
  );
}
