/**
 * DATA tab: every placement number grouped by fin group and then by Trailing Edge / Leading
 * Edge, ported from reference/project/Fins.dc.html lines 449-478. Styling follows
 * components/rails/rail-data-table.tsx's card/heading conventions.
 */

import type { FinPlacementResult, FinTailShape } from "@/lib/geometry/fins";
import { formatFeetInches, formatInchesFraction, type Mm } from "@/lib/geometry/units";

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
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-surf-canvas pt-10 text-surf-black">
      <div className="mb-2.5 text-xl font-extrabold tracking-tight">
        {formatFeetInches(boardLength)} · {formatInchesFraction(tailWidth12, 16)} tail @12&quot; ·{" "}
        {FIN_SETUP_LABEL[finSetup] ?? finSetup} · {TAIL_SHAPE_LABEL[tailShape]} tail
        {result.isModified && <span className="text-surf-accent-orange-ink"> · Modified</span>}
      </div>
      <div className="mb-4 border-b-2 border-surf-muted/20 pb-4 text-sm font-normal text-surf-muted">
        {result.modelHeader}
      </div>
      {result.sections.map((sec) => (
        <div key={sec.label} className="mb-4">
          <div className="mb-2 text-[10px] font-display text-surf-black uppercase tracking-architectural font-extrabold">{sec.label}</div>
          {sec.groups.map((grp) => (
            <div key={grp.heading} className="mb-2 ml-3">
              <div className="mb-2 border-b border-surf-muted/20 pb-1 text-[10px] font-display text-surf-black uppercase tracking-architectural font-extrabold">
                {grp.heading}
              </div>
              {grp.rows.map((row) => (
                <div key={row.label} className="ml-2.5 flex justify-between py-1.5 text-sm">
                  <span className="text-surf-muted">{row.label}</span>
                  <span className="font-bold">{formatInchesFraction(row.value, 16)}</span>
                </div>
              ))}
              {grp.fullSpread !== null && (
                <div className="ml-[22px] flex justify-between py-1.5 text-sm">
                  <span className="text-surf-muted">
                    Full Spread <em>(*Full spread may be &gt;2x due to 1/16&quot; rounding)</em>
                  </span>
                  <span className="font-bold">{formatInchesFraction(grp.fullSpread, 16)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
