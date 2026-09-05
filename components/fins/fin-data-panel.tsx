"use client";

/**
 * DATA tab: every placement number grouped by fin group and then by Trailing Edge / Leading
 * Edge, ported from reference/project/Fins.dc.html lines 449-478. Styling follows
 * components/rails/rail-data-table.tsx's card/heading conventions.
 */

import { useUnits } from "@/components/units-provider";
import type { FinPlacementResult, FinTailShape } from "@/lib/geometry/fins";
import { formatDim, formatLength, formatMark, stationLabel } from "@/lib/geometry/measure-display";
import type { Mm } from "@/lib/geometry/units";

const TAIL_SHAPE_LABEL: Record<FinTailShape, string> = {
  pin: "Pin",
  round: "Round",
  diamond: "Diamond",
  squash: "Squash",
  swallow: "Swallow",
};

const FIN_SETUP_LABEL: Record<string, string> = {
  single: "Single",
  twin: "Twin",
  thruster: "Thruster",
  "2plus1": "2+1",
  quad: "Quad",
};

interface FinDataPanelProps {
  result: FinPlacementResult;
  boardLength: Mm;
  tailWidth12: Mm;
  finSetup: string;
  tailShape: FinTailShape;
}

export function FinDataPanel({ result, boardLength, tailWidth12, finSetup, tailShape }: FinDataPanelProps) {
  const { system } = useUnits();
  // D-09: the board length and the tail width each carry their own unit either side of the
  // station, so a shaper reading two different measurements never mistakes one's unit for the
  // other's — the same own-unit-per-value rule every converted callout on this phase follows.
  const summaryLine = `${formatLength(boardLength, system)} · ${formatDim(tailWidth12, system)} tail @${
    system === "imperial" ? "" : " "
  }${stationLabel(system)} · ${FIN_SETUP_LABEL[finSetup] ?? finSetup} · ${TAIL_SHAPE_LABEL[tailShape]} tail`;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-10 text-surf-ink">
      <div className="mb-2.5 text-xl font-extrabold tracking-tight">
        {summaryLine}
        {result.isModified && <span className="text-surf-warning-ink"> · Modified</span>}
      </div>
      <div className="mb-4 border-b-2 border-surf-line-faint pb-4 text-sm font-normal text-surf-ink-muted">
        {result.modelHeader}
      </div>
      {result.sections.map((sec) => (
        <div key={sec.label} className="mb-4">
          <div className="mb-2 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold">{sec.label}</div>
          {sec.groups.map((grp) => (
            <div key={grp.heading} className="mb-2 ml-3">
              <div className="mb-2 border-b border-surf-line-faint pb-1 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold">
                {grp.heading}
              </div>
              {grp.rows.map((row) => (
                <div key={row.label} className="ml-2.5 flex justify-between py-1.5 text-sm">
                  <span className="text-surf-ink-muted">{row.label}</span>
                  <span className="font-bold">
                    {row.family === "dim" ? formatDim(row.value, system) : formatMark(row.value, system)}
                  </span>
                </div>
              ))}
              {grp.fullSpread !== null && grp.fullSpreadFamily !== null && (
                <div className="ml-[22px] flex justify-between py-1.5 text-sm">
                  <span className="text-surf-ink-muted">
                    Full Spread <em>(*Full spread may be &gt;2x due to 1/16&quot; rounding)</em>
                  </span>
                  <span className="font-bold">
                    {grp.fullSpreadFamily === "dim" ? formatDim(grp.fullSpread, system) : formatMark(grp.fullSpread, system)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
