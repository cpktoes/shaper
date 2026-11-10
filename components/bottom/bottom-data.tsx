"use client";

import { useMemo } from "react";
import { useDesign } from "@/components/design/design-store";
import { useUnits } from "@/components/units-provider";
import {
  BOTTOM_DATA_DEPTH_SHOWN,
  BOTTOM_SECTIONS,
  bottomDataRows,
  bottomLayoutMarks,
  bottomLitresLine,
  stringerAtCenter,
  type BottomDataRow,
  type BottomFloorFlag,
} from "@/lib/geometry/bottom";
import { columnUnitSuffix, formatDimBare, formatMark, formatMarkBare } from "@/lib/geometry/measure-display";
import type { Mm, UnitsSystem } from "@/lib/geometry/units";
import { cn } from "@/lib/utils";
import { BOTTOM_COPY, dataFloorNote, layoutMarkColumnName, layoutMarksNote, referenceRowsNote } from "./bottom-copy";

/** A depth this small reads `—` (`BOTTOM_DATA_DEPTH_SHOWN`, the sketch's 0.25 mm): nothing is cut there. */
function depthCell(value: Mm, system: UnitsSystem): string {
  return value < BOTTOM_DATA_DEPTH_SHOWN ? BOTTOM_COPY.emptyCell : formatMarkBare(value, system);
}

function rowLabel(row: BottomDataRow, system: UnitsSystem): string {
  if (row.label === "tail") return BOTTOM_COPY.rowTail;
  if (row.label === "nose") return BOTTOM_COPY.rowNoseTip;
  return formatDimBare(row.station, system);
}

/** RAILS' table dress (`components/rails/rail-data-table.tsx`): the header cells, the sticky station cell, a cell. */
const HEAD_CELL = "border-b-2 border-surf-line-faint pb-2 font-extrabold whitespace-nowrap text-surf-ink";
const HEAD_STATION = "sticky left-0 z-10 bg-surf-panel pr-3 text-left";
const ROW_STATION =
  "sticky left-0 z-10 border-b border-surf-line-faint bg-surf-panel py-1.5 pr-3 text-left font-bold whitespace-nowrap text-surf-ink";
const CELL = "border-b border-surf-line-faint py-1.5 pl-2 text-right whitespace-nowrap";
/** The group heading over each table (10/800 ink caps). */
const GROUP_HEADING = "mt-4 mb-2 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold";
/** The layout-marks table's minimum width (UI-SPEC §4): 96 for the station column and 72 a mark. */
const MARKS_STATION_WIDTH = 96;
const MARKS_COLUMN_WIDTH = 72;

/**
 * A table's own box: it scrolls sideways on a narrow phone, with RAILS' 24-dot fade at its right edge.
 *
 * The page above is a column that scrolls down, and a box that scrolls sideways is one a column may squeeze to nothing
 * — which is what an upright phone's pinned card did: both tables shrank to their headings and the rows went out of
 * sight (found at 17-13's look). So on a phone, upright or held sideways, the box keeps its table's full height
 * (ROCKER's datasheet rule, `rocker-datasheet.tsx`) and the page scrolls instead. Behind the layout's width line and the
 * short-screen query, so a computer's DATA is drawn exactly as it was.
 */
const TABLE_SCROLLER =
  "overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] max-shell:shrink-0 [@media(max-height:500px)]:shrink-0";

/**
 * DATA (Phase 17, D-15, D-16, D-34; UI-SPEC §4): no readouts in the viewer — the numbers live here.
 *
 * First the line that says what the contours cost — `Foam off … L · … L now, … L before contours · the stringer finishes
 * … at the center, planed … · contours only take foam away.` — whose `now` is VOLUME's own litres figure and whose `Foam
 * off` is the printed `before` less the printed `now` (`bottomLitresLine`), so the two screens can never disagree.
 *
 * Then two real `<table>`s in RAILS' dress, the station cell ink and sticky, the cells muted, the rows within 3" of the
 * wide point and the front fins all ink:
 * - **Depths under a straightedge** at the tail, every 6" and the nose tip — Width, Deepest cut, Rail lift, Stringer
 *   left — each `Stringer left` cell where a concave meets the 1/4" floor at the stringer in warning ink (D-09, D-40);
 * - **Layout marks · off the stringer** (D-16), only when a cut has a mark: one column per mark in shop order —
 *   `Nose edge`, `Center flat`, `Center trough`, `Center edge`, `Tail flat` …, then `Flat edge` and `Wall 1` … `Wall 4`
 *   (`bottomLayoutMarks`) — so the sheet alone lays the bottom out station by station; a wall reads `—` ahead of its own
 *   channel's start.
 *
 * Under the tables the sketch's three notes (12/400 muted), and the floor note in warning ink when a cut meets the floor
 * — the panel's own sentence for that cut (`floorWarning`, the orchestrator's ruling at 17-09), so colour is never the
 * only signal and there is never a third wording. The floor flags are the editor's one scan, shared with the panel.
 * Widths and stations are dims, depths, marks and the stringer marks (CLAUDE.md Rule 2); Metric headers carry their
 * unit (`columnUnitSuffix`).
 */
export function BottomData({ floorFlags }: { floorFlags: BottomFloorFlag[] }) {
  const { system } = useUnits();
  const { bottomBoard: board, resolvedBottom: resolved, finPlacement, quotedVolumeLitres, quotedVolumeLitresBeforeBottom } = useDesign();
  const rows = useMemo(() => bottomDataRows(resolved, board), [resolved, board]);
  const marks = useMemo(() => bottomLayoutMarks(resolved, board), [resolved, board]);
  const stringer = useMemo(() => stringerAtCenter(resolved, board), [resolved, board]);
  const litres = bottomLitresLine(quotedVolumeLitres, quotedVolumeLitresBeforeBottom);
  const columns = BOTTOM_COPY.depthsColumns;
  const frontPair = finPlacement.marks.some((m) => m.role === "front");

  const headers = [
    `${columns.station}${columnUnitSuffix("dim", system)}`,
    `${columns.width}${columnUnitSuffix("dim", system)}`,
    `${columns.deepest}${columnUnitSuffix("mark", system)}`,
    `${columns.railLift}${columnUnitSuffix("mark", system)}`,
    `${columns.stringerLeft}${columnUnitSuffix("mark", system)}`,
  ];
  // The floor notes in shop order, each the panel's own sentence named for its cut.
  const floorNotes = [...BOTTOM_SECTIONS, "channels" as const]
    .map((section) =>
      dataFloorNote(
        floorFlags.find((flag) => flag.section === section),
        section === "channels" ? "" : resolved[section].name,
        board,
        system,
      ),
    )
    .filter((note): note is string => note !== null);

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
      <h3 className={GROUP_HEADING}>{BOTTOM_COPY.depthsHeading}</h3>
      {/* Sideways on a narrow phone, never a dropped column — RAILS' scroller and its 24-dot fade, which lands on the
          table's own 24 dots of end room so it never dims the last column. */}
      <div className={TABLE_SCROLLER}>
        <div className="min-w-[504px] pr-[24px]">
          <table data-bottom-depths className="w-full border-collapse text-sm tabular-nums">
            <thead>
              <tr>
                {headers.map((header, i) => (
                  <th key={header} scope="col" className={cn(HEAD_CELL, i === 0 ? HEAD_STATION : "pl-2 text-right")}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const ink = row.reference !== null;
                const cell = cn(CELL, ink ? "font-bold text-surf-ink" : "text-surf-ink-muted");
                return (
                  <tr key={row.station} data-bottom-row={row.label} data-reference={row.reference ?? undefined}>
                    <th scope="row" className={ROW_STATION}>
                      {rowLabel(row, system)}
                    </th>
                    <td className={cell}>{row.width === null ? BOTTOM_COPY.emptyCell : formatDimBare(row.width, system)}</td>
                    <td className={cell}>{depthCell(row.deepest, system)}</td>
                    <td className={cell}>{depthCell(row.railLift, system)}</td>
                    {/* At the floor (D-09, D-40: a concave holding the stringer at 1/4") the cell reads in warning ink —
                        the DATASHEET's own treatment — and the floor note under the tables names it in words. */}
                    <td data-bottom-floor-cell={row.atFloor ? "" : undefined} className={cn(cell, row.atFloor && "text-surf-warning-ink")}>
                      {row.stringerLeft === null ? BOTTOM_COPY.emptyCell : formatMarkBare(row.stringerLeft, system)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {marks.columns.length > 0 && (
        <>
          <h3 className={GROUP_HEADING}>{BOTTOM_COPY.marksHeading(system === "metric")}</h3>
          <div className={TABLE_SCROLLER}>
            <div className="pr-[24px]" style={{ minWidth: MARKS_STATION_WIDTH + MARKS_COLUMN_WIDTH * marks.columns.length + 24 }}>
              <table data-bottom-marks className="w-full border-collapse text-sm tabular-nums">
                <thead>
                  <tr>
                    <th scope="col" className={cn(HEAD_CELL, HEAD_STATION)}>
                      {`${columns.station}${columnUnitSuffix("dim", system)}`}
                    </th>
                    {marks.columns.map((column) => (
                      <th key={column.key} scope="col" data-bottom-mark-column={column.key} className={cn(HEAD_CELL, "pl-2 text-right")}>
                        {layoutMarkColumnName(column)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {marks.rows.map((markRow, r) => {
                    const row = rows[r];
                    const ink = row.reference !== null;
                    const cell = cn(CELL, ink ? "font-bold text-surf-ink" : "text-surf-ink-muted");
                    return (
                      <tr key={markRow.station} data-bottom-mark-row={row.label} data-reference={row.reference ?? undefined}>
                        <th scope="row" className={ROW_STATION}>
                          {rowLabel(row, system)}
                        </th>
                        {markRow.cells.map((value, c) => (
                          <td key={marks.columns[c].key} className={cell}>
                            {value === null ? BOTTOM_COPY.emptyCell : formatMarkBare(value, system)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div data-bottom-notes className="mt-3 flex max-w-prose flex-col gap-2 text-xs text-surf-ink-muted">
        <p>{BOTTOM_COPY.depthsNote}</p>
        {marks.columns.length > 0 && <p>{layoutMarksNote(resolved.channels, system)}</p>}
        <p>{referenceRowsNote(board, frontPair, system)}</p>
        {floorNotes.map((note) => (
          <p key={note} data-bottom-floor-note className="text-surf-warning-ink">
            {note}
          </p>
        ))}
      </div>
    </div>
  );
}
