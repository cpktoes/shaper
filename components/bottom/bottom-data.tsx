"use client";

import { useMemo } from "react";
import { useDesign } from "@/components/design/design-store";
import { useUnits } from "@/components/units-provider";
import {
  BOTTOM_DATA_DEPTH_SHOWN,
  bottomDataRows,
  bottomLitresLine,
  stringerAtCenter,
  type BottomDataRow,
} from "@/lib/geometry/bottom";
import { columnUnitSuffix, formatDimBare, formatMark, formatMarkBare } from "@/lib/geometry/measure-display";
import type { Mm, UnitsSystem } from "@/lib/geometry/units";
import { cn } from "@/lib/utils";
import { BOTTOM_COPY } from "./bottom-copy";

/** A depth this small reads `—` (`BOTTOM_DATA_DEPTH_SHOWN`, the sketch's 0.25 mm): nothing is cut there. */
function depthCell(value: Mm, system: UnitsSystem): string {
  return value < BOTTOM_DATA_DEPTH_SHOWN ? BOTTOM_COPY.emptyCell : formatMarkBare(value, system);
}

function rowLabel(row: BottomDataRow, system: UnitsSystem): string {
  if (row.label === "tail") return BOTTOM_COPY.rowTail;
  if (row.label === "nose") return BOTTOM_COPY.rowNoseTip;
  return formatDimBare(row.station, system);
}

/**
 * DATA, its first part (Phase 17, D-15, D-16, D-34; UI-SPEC §4): no readouts in the viewer — the numbers live here.
 * First the line that says what the contours cost — `Foam off … L · … L now, … L before contours · the stringer
 * finishes … at the center, planed … · contours only take foam away.` — whose `now` is VOLUME's own litres figure and
 * whose `Foam off` is the printed `before` less the printed `now` (`bottomLitresLine`), so the two screens can never
 * disagree and the line always adds up as read. Then the depths under a straightedge at the tail, every 6" and the nose
 * tip, a real `<table>` in RAILS' dress: the station cell ink and sticky, the cells muted, the rows within 3" of the
 * wide point and the front fins all ink. Widths and stations are dims, depths and the stringer marks (CLAUDE.md
 * Rule 2); Metric headers carry their unit (`columnUnitSuffix`).
 *
 * The layout-marks table, the notes and the floor's cells are 17-10's.
 */
export function BottomData() {
  const { system } = useUnits();
  const { bottomBoard: board, resolvedBottom: resolved, quotedVolumeLitres, quotedVolumeLitresBeforeBottom } = useDesign();
  const rows = useMemo(() => bottomDataRows(resolved, board), [resolved, board]);
  const stringer = useMemo(() => stringerAtCenter(resolved, board), [resolved, board]);
  const litres = bottomLitresLine(quotedVolumeLitres, quotedVolumeLitresBeforeBottom);
  const columns = BOTTOM_COPY.depthsColumns;

  const headers = [
    `${columns.station}${columnUnitSuffix("dim", system)}`,
    `${columns.width}${columnUnitSuffix("dim", system)}`,
    `${columns.deepest}${columnUnitSuffix("mark", system)}`,
    `${columns.railLift}${columnUnitSuffix("mark", system)}`,
    `${columns.stringerLeft}${columnUnitSuffix("mark", system)}`,
  ];

  return (
    <div data-bottom-data className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-2">
      <p data-bottom-litres className="max-w-prose text-xs text-surf-ink-muted">
        {BOTTOM_COPY.dataFirstLine(
          litres.foamOff,
          litres.now,
          litres.before,
          formatMark(stringer.left, system),
          formatMark(stringer.planed, system),
        )}
      </p>
      <h3 className="mt-4 mb-2 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold">
        {BOTTOM_COPY.depthsHeading}
      </h3>
      {/* Sideways on a narrow phone, never a dropped column — RAILS' scroller and its 24-dot fade, which lands on the
          table's own 24 dots of end room so it never dims the last column. */}
      <div className="overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]">
        <div className="min-w-[504px] pr-[24px]">
          <table data-bottom-depths className="w-full border-collapse text-sm tabular-nums">
            <thead>
              <tr>
                {headers.map((header, i) => (
                  <th
                    key={header}
                    scope="col"
                    className={cn(
                      "border-b-2 border-surf-line-faint pb-2 font-extrabold whitespace-nowrap text-surf-ink",
                      i === 0 ? "sticky left-0 z-10 bg-surf-panel pr-3 text-left" : "pl-2 text-right",
                    )}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const ink = row.reference !== null;
                const cell = cn("border-b border-surf-line-faint py-1.5 pl-2 text-right whitespace-nowrap", ink ? "font-bold text-surf-ink" : "text-surf-ink-muted");
                return (
                  <tr key={row.station} data-bottom-row={row.label} data-reference={row.reference ?? undefined}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-surf-line-faint bg-surf-panel py-1.5 pr-3 text-left font-bold whitespace-nowrap text-surf-ink"
                    >
                      {rowLabel(row, system)}
                    </th>
                    <td className={cell}>{row.width === null ? BOTTOM_COPY.emptyCell : formatDimBare(row.width, system)}</td>
                    <td className={cell}>{depthCell(row.deepest, system)}</td>
                    <td className={cell}>{depthCell(row.railLift, system)}</td>
                    <td className={cell}>{row.stringerLeft === null ? BOTTOM_COPY.emptyCell : formatMarkBare(row.stringerLeft, system)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
