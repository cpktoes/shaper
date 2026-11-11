"use client";

/**
 * The order form's BOTTOM CONTOURS page (Phase 17, D-29; UI-SPEC §8) — a sheet of its own, printed only when the
 * bottom has a cut, so a flat board's order form is the two pages it always was.
 *
 * A shaper takes this page to the bay and cuts the bottom from it, so it carries everything the BOTTOM screen shows,
 * with nothing left to remember:
 *
 * 1. **The bottom from above**, nose left, the page's full width: the shade and a line at every sixteenth, every pencil
 *    line a shaper would rule, the fins, the wide point and the front fins ticked above the board, and under it one row
 *    for each cut with its Start, Deepest and End ticked. A dotted line crosses the board at each cut's deepest
 *    station — where that cut's section below is taken.
 * 2. **A cross-section for each cut** at its deepest station — Nose, Center, Tail, Channels — two across (one cut alone
 *    takes the width), drawn tall enough to read (`HEIGHT ×4`, written on the drawing) with the readings a shaper would
 *    take with a gauge. Under each, the same numbers in words, so nothing depends on a label finding room on a drawing.
 * 3. **The two tables from BOTTOM's DATA tab** — the depths under a straightedge every 6", and the layout marks off the
 *    stringer — in the order form's table dress. When the page cannot hold them they move, whole, to a sheet of their
 *    own (`bottom-sheet-fit.ts` decides; the order form numbers its pages from the same answer). Never dropped.
 * 4. **How to shape it**: the GUIDE's own note for each cut, word for word.
 *
 * Every shape is `lib/geometry/bottom-draw.ts`'s and every number goes through `lib/geometry/units.ts` (CLAUDE.md Rules
 * 1 and 2); this file only paints. The drawings are written in their own fixed dots rather than measured from a
 * screen, so the server, the first paint and the printer all draw the same page; and all of their ink is an SVG fill
 * or stroke, because a printer drops background colours.
 *
 * Rendered by `order-form.tsx` inside `<Sheet variant="bottom">`, with the sheet's own head strip and page mark — like
 * `rail-instructions-sheet.tsx`, this supplies only the body.
 */

import { useId, useMemo, type CSSProperties } from "react";
import { BOTTOM_COPY, bottomDepthCell, layoutMarkColumnName, wingWords } from "@/components/bottom/bottom-copy";
import { useDesign } from "@/components/design/design-store";
import { useUnits } from "@/components/units-provider";
import { DimensionLine, ViewerZoomUnitProvider } from "@/components/viewer/callout-primitives";
import type { BottomDataRow } from "@/lib/geometry/bottom";
import {
  bottomContourLines,
  bottomFinLines,
  bottomPencilLines,
  bottomSection,
  bottomShadeBands,
  placeRailLabels,
  polylinesPathData,
  sectionGauges,
  sectionHeightLabel,
  SECTION_WORDS_MIN_BOX,
  shadePathData,
  topViewFrame,
  topViewMarks,
  topViewX,
  topViewY,
  type BoardToDrawing,
  type Gauge,
} from "@/lib/geometry/bottom-draw";
import { BOTTOM_PRINT_CHANNELS, BOTTOM_PRINT_SECTION, type BottomPrintCut } from "@/lib/geometry/bottom-print";
import { columnUnitSuffix, formatDimBare, formatLength, formatMark, formatMarkBare } from "@/lib/geometry/measure-display";
import { silhouette } from "@/lib/geometry/screen-tiles";
import { mm, type UnitsSystem } from "@/lib/geometry/units";
import { placedWings } from "@/lib/geometry/wings";
import { cn } from "@/lib/utils";
import {
  BOTTOM_SECTION_BOX,
  BOTTOM_TOP_VIEW,
  bottomSheetStationsLine,
  bottomTopViewBox,
  placeSheetGaugeLabels,
  type BottomSheetLayout,
} from "./bottom-sheet-fit";
import { FormBox } from "./order-form-primitives";

/** The page's own few words — everything else on it is the BOTTOM screen's wording or the GUIDE's. */
export const BOTTOM_SHEET_COPY = {
  /** Before a section's gauge readings. */
  atTheDeepest: "At the deepest:",
  /** The How to shape box's caption — the GUIDE cards' own heading. */
  howToShape: "How to shape",
  /** The page mark's title for the page, and for the tables' own sheet. */
  pageTitle: "Bottom Contours",
  tablesPageTitle: "Bottom Contours · Tables",
} as const;

/**
 * The drawings' words, in the pictures' own dots: a name 10, a value 11.5 — a touch over the BOTTOM screen's 9 and 11,
 * because paper is read at arm's length in a shaping bay and a picture's dots print close to one for one here.
 */
const LABEL_DOTS = 10;
const VALUE_DOTS = 11.5;
/** The first line of gauge values sits this many dots under the straightedge (`sectionGauges`' own 2 + 13). */
const GAUGE_LINE_ONE = 15;
/** Where `HEIGHT ×4` sits on a section, in the picture's own dots: above the slab's break line, which peaks 11 dots
 * down in the shortest box. */
const HEIGHT_LABEL_BASELINE = 8;
/** The shade's strength per 1/32" level, as on the screen's top view. */
const SHADE_OPACITY = 0.04;

/** A name on a drawing: small spaced capitals. */
const LABEL_STYLE = {
  fontFamily: "var(--font-body)",
  fontWeight: 700,
  letterSpacing: "0.12em",
  fill: "var(--outline-callout-label)",
  fontSize: LABEL_DOTS,
} as const;
/** A value beside a name. */
const VALUE_STYLE = { fontWeight: 500, letterSpacing: 0, fontSize: VALUE_DOTS, fill: "var(--outline-callout-label)" } as const;

/** The drawings print hollow, as the order form's own outline does: no fill inside the board's line. */
const HOLLOW = { "--outline-board-fill": "transparent" } as CSSProperties;

/**
 * A label's width in dots, for keeping two labels apart (`placeRailLabels`) — the screen's own estimate, 6.4 dots a
 * letter of a spaced capital name at 9 dots and 6.2 a figure at 11, scaled to this page's sizes; never a browser
 * measurement, so every paint and every printer lays the labels out the same way.
 */
function labelWidth(name: string, value: string): number {
  return name.length * 6.4 * (LABEL_DOTS / 9) + (value.length + 1) * 6.2 * (VALUE_DOTS / 11);
}

/** A cut's row name under the board. */
function rowName(cut: BottomPrintCut): string {
  return (cut.key === "channels" ? BOTTOM_PRINT_CHANNELS : BOTTOM_PRINT_SECTION[cut.key]).toUpperCase();
}

/** Part 1: the bottom from above. */
function TopView({ layout }: { layout: BottomSheetLayout }) {
  const { system } = useUnits();
  const { bottomBoard: board, resolvedBottom: resolved, outlineGeometry, finPlacement, outline } = useDesign();
  const clipId = useId();
  const cuts = layout.cuts;

  const box = useMemo(() => bottomTopViewBox(board, cuts.length), [board, cuts.length]);
  const frame = useMemo(() => topViewFrame(board, box.boardBoxWidth, box.frameHeight), [board, box]);
  // The board's millimetres to this picture's dots: the screen's own frame, read in dots and set right of the gutter.
  const X = (station: number) => BOTTOM_TOP_VIEW.gutter + topViewX(frame, station) / frame.px;
  const Y = (across: number) => topViewY(frame, across) / frame.px;
  const paths = useMemo(() => {
    const map: BoardToDrawing = (s, y) => ({
      x: BOTTOM_TOP_VIEW.gutter + topViewX(frame, s) / frame.px,
      y: topViewY(frame, y) / frame.px,
    });
    const edge = silhouette(outlineGeometry).map(({ station: s, w }) => [s, w] as const);
    return {
      board: `${polylinesPathData([edge], map)}Z`,
      shade: bottomShadeBands(resolved, board).map((level) => ({ index: level.index, d: shadePathData(level.rects, map) })),
      contours: bottomContourLines(resolved, board).map((level) => ({ index: level.index, d: polylinesPathData(level.lines, map) })),
      // No cut is "live" on paper: every pencil line is drawn alike.
      pencil: bottomPencilLines(resolved, board, null).map((line) => ({
        key: `${line.column}:${line.kind}`,
        kind: line.kind,
        d: polylinesPathData(line.runs, map),
      })),
    };
  }, [frame, outlineGeometry, resolved, board]);
  const fins = useMemo(() => bottomFinLines(finPlacement), [finPlacement]);
  const upperMarks = useMemo(() => topViewMarks(board, resolved, null, finPlacement, system).upper, [board, resolved, finPlacement, system]);
  // Each cut's Start, Deepest and End, taped from its own nearest tip — the screen's lower rail, once per cut.
  const rows = useMemo(
    () =>
      cuts.flatMap((cut) => {
        const lower = topViewMarks(board, resolved, cut.key, finPlacement, system).lower;
        return lower ? [{ cut, lower }] : [];
      }),
    [cuts, board, resolved, finPlacement, system],
  );

  const edgeAt = (station: number) => board.railAt(mm(station));
  const yRail = frame.padTop / frame.px - 6;
  const upper = placeRailLabels(
    upperMarks.map((m) => ({ x: X(m.station) - BOTTOM_TOP_VIEW.gutter, text: `${m.name} · ${m.value}` })),
    box.boardBoxWidth,
    (text) => labelWidth(text, ""),
  );

  return (
    <FormBox
      caption={BOTTOM_SHEET_COPY.pageTitle}
      captionRight={BOTTOM_COPY.topViewNoseLeft(
        formatLength(outline.length, system),
        wingWords(placedWings(outline.wings ?? [], outlineGeometry), system),
      )}
      variant="flush"
      bodyClassName="px-1.5 py-1"
    >
      {/* The page's one part that may give way: if a board ever needs more room than the fit rule counted, this
          picture draws a little smaller rather than a table losing its last row. */}
      <div data-bottom-sheet-part="top" className="relative min-h-0 w-full" style={{ aspectRatio: `${BOTTOM_TOP_VIEW.width} / ${box.height}` }}>
        <svg
          data-bottom-sheet-top-view
          role="img"
          aria-label="The bottom from above, nose left, with every cut's start, deepest point and end"
          viewBox={`0 ${box.top} ${BOTTOM_TOP_VIEW.width} ${box.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 block h-full w-full"
        >
          <defs>
            <clipPath id={clipId}>
              <path d={paths.board} />
            </clipPath>
          </defs>
          <path d={paths.board} fill="var(--outline-board-fill)" stroke="var(--outline-ink)" strokeWidth={1.1} />
          <g clipPath={`url(#${clipId})`}>
            <g data-bottom-sheet-shade fill="var(--outline-bottom-shade)" fillOpacity={SHADE_OPACITY}>
              {paths.shade.map((level) => (
                <path key={level.index} d={level.d} />
              ))}
            </g>
            <g fill="none" stroke="var(--outline-station-line)" strokeWidth={1}>
              {paths.contours.map((level) => (
                <path key={level.index} d={level.d} />
              ))}
            </g>
            <line
              x1={X(board.length)}
              y1={Y(0)}
              x2={X(0)}
              y2={Y(0)}
              stroke="var(--outline-station-line)"
              strokeWidth={1}
              style={{ strokeDasharray: "var(--outline-stringer-dash)" }}
            />
            <line
              x1={X(board.widePoint)}
              y1={Y(-edgeAt(board.widePoint))}
              x2={X(board.widePoint)}
              y2={Y(edgeAt(board.widePoint))}
              stroke="var(--outline-station-line)"
              strokeWidth={1}
              style={{ strokeDasharray: "var(--outline-widepoint-dash)" }}
            />
            <line
              x1={X(board.frontFins)}
              y1={Y(-edgeAt(board.frontFins))}
              x2={X(board.frontFins)}
              y2={Y(edgeAt(board.frontFins))}
              stroke="var(--outline-station-line)"
              strokeWidth={1}
              style={{ strokeDasharray: "var(--outline-station-dash)" }}
            />
            {paths.pencil.map((line) =>
              line.kind === "trough" ? (
                <path
                  key={line.key}
                  d={line.d}
                  fill="none"
                  stroke="var(--outline-station-line)"
                  strokeWidth={1}
                  style={{ strokeDasharray: "var(--outline-trough-dash)" }}
                />
              ) : (
                <path key={line.key} d={line.d} fill="none" stroke="var(--outline-pencil-line)" strokeWidth={1} />
              ),
            )}
            {/* Each cut's deepest station, dotted across the board: where its section below is taken. */}
            {rows.map(({ cut, lower }) => (
              <line
                key={cut.key}
                data-bottom-sheet-deepest={cut.key}
                x1={X(lower.deepest)}
                y1={Y(-edgeAt(lower.deepest))}
                x2={X(lower.deepest)}
                y2={Y(edgeAt(lower.deepest))}
                stroke="var(--outline-ink)"
                strokeWidth={1}
                style={{ strokeDasharray: "var(--outline-trough-dash)" }}
              />
            ))}
          </g>
          <g stroke="var(--color-surf-accent-ink)" strokeWidth={2.5} strokeLinecap="round">
            {fins.map((fin, i) => (
              <line key={i} x1={X(fin.from[0])} y1={Y(fin.from[1])} x2={X(fin.to[0])} y2={Y(fin.to[1])} />
            ))}
          </g>
          {/* Above the board: the wide point and the front fins. */}
          {upperMarks.map((m, i) => (
            <g key={m.key} data-bottom-sheet-mark={m.key}>
              <line
                x1={X(m.station)}
                y1={Y(-edgeAt(m.station)) - 3}
                x2={X(m.station)}
                y2={yRail + 3}
                stroke="var(--outline-callout-label)"
                strokeWidth={1}
              />
              {upper[i].show && (
                <text x={BOTTOM_TOP_VIEW.gutter + upper[i].textX} y={yRail} textAnchor={upper[i].anchor} style={LABEL_STYLE}>
                  {upper[i].text}
                </text>
              )}
            </g>
          ))}
          {/* Under the board: a row for each cut, its span ruled from Start to End and the three stations ticked. */}
          {rows.map(({ cut, lower }, r) => {
            const y = box.rowsTop + r * BOTTOM_TOP_VIEW.row;
            const xs = lower.marks.map((m) => X(m.station));
            const placed = placeRailLabels(
              lower.marks.map((m, i) => ({ x: xs[i] - BOTTOM_TOP_VIEW.gutter, text: m.name })),
              box.boardBoxWidth,
              (text) => labelWidth(text, lower.marks.find((m) => m.name === text)!.value),
            );
            return (
              <g key={cut.key} data-bottom-sheet-row={cut.key}>
                <text x={0} y={y + 8} style={LABEL_STYLE}>
                  {rowName(cut)}
                </text>
                <line x1={Math.min(...xs)} y1={y + 5} x2={Math.max(...xs)} y2={y + 5} stroke="var(--outline-ink)" strokeWidth={1} />
                {lower.marks.map((m, i) => (
                  <g key={m.key}>
                    <line x1={xs[i]} y1={y + 1} x2={xs[i]} y2={y + 9} stroke="var(--outline-ink)" strokeWidth={1} />
                    {placed[i].show && (
                      <text x={BOTTOM_TOP_VIEW.gutter + placed[i].textX} y={y + 19} textAnchor={placed[i].anchor} style={LABEL_STYLE}>
                        {m.name} <tspan style={VALUE_STYLE}>{m.value}</tspan>
                      </text>
                    )}
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </FormBox>
  );
}

/** A gauge reading in the screen's own words: `1/4" at the stringer`, `3/8" in the channel`. */
function gaugeWords(gauge: Gauge, system: UnitsSystem): string {
  const value = formatMark(gauge.value, system);
  switch (gauge.kind) {
    case "stringer":
      return BOTTOM_COPY.gaugeAtStringer(value);
    case "railLift":
      return BOTTOM_COPY.gaugeRailLift(value);
    case "stringerLeft":
      return BOTTOM_COPY.gaugeStringerLeft(value);
    case "channel":
      return BOTTOM_COPY.gaugeInChannel(value);
    case "trough":
      return BOTTOM_COPY.gaugeInTrough(value);
  }
}

/** Part 2, one of: the cross-section at a cut's deepest station, and the same numbers in words under it. */
function SectionFigure({ cut, lone }: { cut: BottomPrintCut; lone: boolean }) {
  const { system } = useUnits();
  const { bottomBoard: board, resolvedBottom: resolved, bottomSectionAt } = useDesign();
  const box = lone ? BOTTOM_SECTION_BOX.lone : BOTTOM_SECTION_BOX.pair;
  // The litres' own section at this station: the printed section ends its foam where the CNC file ends it (D-40).
  const seam = useMemo(() => bottomSectionAt(cut.deepest), [bottomSectionAt, cut.deepest]);
  const drawing = useMemo(() => bottomSection(resolved, board, cut.deepest, 4, box, { live: null, seam }), [resolved, board, cut.deepest, box, seam]);
  const gauges = useMemo(() => sectionGauges(drawing, resolved, board, system), [drawing, resolved, board, system]);

  // The drawing is worked out in the screen's units (1000 across); one dot is `px` of them. The picture is written in
  // dots, with the screen's shapes scaled into it, so a dashed line's pattern is its token's own, in dots.
  const { px } = drawing;
  const dot = 1 / px;
  const spec = cut.key === "channels" ? resolved.channels : resolved[cut.key];
  const stationsLine = bottomSheetStationsLine(cut.key, { start: spec.start, deepest: spec.deepest, end: spec.end }, board, system);
  const readings = [...new Set(gauges.map((gauge) => gaugeWords(gauge, system)))];
  // Each gauge's value, settled where it stands clear in this box (`placeSheetGaugeLabels`): the screen's own place
  // first, else the number alone beside its tick, else the words under the picture alone.
  const values = useMemo(() => {
    const inputs = gauges.flatMap((gauge) => {
      const bare = formatMark(gauge.value, system);
      return gauge.labels.map((label) => ({
        x: label.x * dot,
        y: label.y * dot,
        anchor: label.anchor,
        text: label.words ? gaugeWords(gauge, system) : bare,
        bare,
        tickX: gauge.lines.reduce((near, line) => (Math.abs(line.x - label.x) < Math.abs(near - label.x) ? line.x : near), gauge.lines[0].x) * dot,
      }));
    });
    const lineOne = drawing.y0 * dot + GAUGE_LINE_ONE;
    return placeSheetGaugeLabels(inputs, { width: box.width, height: drawing.height * dot }, lineOne, VALUE_DOTS);
  }, [gauges, system, dot, drawing.y0, drawing.height, box.width]);
  const valueStyle = {
    fontFamily: "var(--font-body)",
    fontWeight: 500,
    fill: "var(--outline-ink)",
    fontSize: VALUE_DOTS,
    fontVariantNumeric: "tabular-nums",
  } as const;

  return (
    <FormBox caption={cut.head} variant="flush" className="flex-none" bodyClassName="px-1.5 pt-1 pb-1">
      <svg
        data-bottom-sheet-section={cut.key}
        role="img"
        aria-label={`${cut.head}: the cross-section at its deepest station`}
        viewBox={`0 0 ${box.width} ${drawing.height * dot}`}
        className="block h-auto w-full"
      >
        {/* How much taller than life the cut is drawn, in the picture's top-left corner where the screen writes it —
            not beside the cut's name, because the longest names (`Center: Continuous Belly / Rolled Mid`) fill a
            two-across box's caption row on their own and the row never wraps. */}
        <text data-bottom-sheet-height={cut.key} x={0} y={HEIGHT_LABEL_BASELINE} style={LABEL_STYLE}>
          {sectionHeightLabel(drawing)}
        </text>
        <g transform={`scale(${dot})`}>
          {drawing.pieces.map((d, i) => (
            <path key={i} d={d} fill="var(--outline-board-fill)" stroke="var(--outline-ink)" strokeWidth={1.1 * px} />
          ))}
          {drawing.breakPath && (
            <>
              <path d={drawing.breakPath} fill="none" stroke="var(--surf-panel)" strokeWidth={7 * px} />
              <path d={drawing.breakPath} fill="none" stroke="var(--outline-ink)" strokeWidth={px} />
            </>
          )}
        </g>
        {drawing.stringer && (
          <line
            x1={drawing.stringer.x * dot}
            y1={drawing.stringer.y1 * dot}
            x2={drawing.stringer.x * dot}
            y2={drawing.stringer.y2 * dot}
            stroke="var(--outline-station-line)"
            strokeWidth={1}
            style={{ strokeDasharray: "var(--outline-stringer-dash)" }}
          />
        )}
        {/* The straightedge: the planed bottom, laid rail to rail. */}
        <line
          x1={drawing.straightedge.x1 * dot}
          y1={drawing.straightedge.y * dot}
          x2={drawing.straightedge.x2 * dot}
          y2={drawing.straightedge.y * dot}
          stroke="var(--outline-ink)"
          strokeWidth={1}
          style={{ strokeDasharray: "var(--outline-station-dash)" }}
        />
        {box.width >= SECTION_WORDS_MIN_BOX && (
          <text x={drawing.straightedge.x1 * dot} y={drawing.y0 * dot + 13} style={LABEL_STYLE}>
            {BOTTOM_COPY.planedBottom}
          </text>
        )}
        <g transform={`scale(${dot})`}>
          <ViewerZoomUnitProvider value={px}>
            {gauges.map((gauge, g) => (
              <g key={`${gauge.kind}-${g}`} data-bottom-sheet-gauge={gauge.kind}>
                {gauge.extensions.map((e, i) => (
                  <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="var(--outline-station-line)" strokeWidth={px} />
                ))}
                {gauge.lines.map((line, i) => (
                  <DimensionLine key={i} x1={line.x} y1={line.y1} x2={line.x} y2={line.y2} />
                ))}
              </g>
            ))}
          </ViewerZoomUnitProvider>
        </g>
        {values.map(
          (value, i) =>
            value && (
              <text key={i} data-bottom-sheet-gauge-value="" x={value.x} y={value.y} textAnchor={value.anchor} style={valueStyle}>
                {value.text}
              </text>
            ),
        )}
      </svg>
      <p data-bottom-sheet-stations={cut.key} className="mt-0.5 font-bold text-surf-ink leading-tight order-form-micro">
        {stationsLine}
      </p>
      <p data-bottom-sheet-readings={cut.key} className="text-surf-ink-muted leading-tight order-form-micro">
        {BOTTOM_SHEET_COPY.atTheDeepest} {readings.join(" · ")}
      </p>
    </FormBox>
  );
}

/** DATA's own row label (`components/bottom/bottom-data.tsx`); the depth cells are DATA's one function, `bottomDepthCell`. */
function rowLabel(row: BottomDataRow, system: UnitsSystem): string {
  if (row.label === "tail") return BOTTOM_COPY.rowTail;
  if (row.label === "nose") return BOTTOM_COPY.rowNoseTip;
  return formatDimBare(row.station, system);
}

/** The order form's table dress — the PLANING table's own classes, with a heading free to wrap on a narrow table. */
const TABLE = "w-full border-collapse tabular-nums";
const HEAD_CELL = "pb-0.5 pl-1.5 text-right align-bottom font-extrabold text-surf-ink leading-tight";
const HEAD_STATION = "pb-0.5 text-left align-bottom font-extrabold text-surf-ink leading-tight";
const ROW = "border-b border-surf-line-faint leading-tight";
const STATION_CELL = "whitespace-nowrap py-px pr-1.5 text-left font-bold text-surf-ink";
const CELL = "whitespace-nowrap py-px pl-1.5 text-right";
const HEAD_ROW_STYLE = { fontSize: "var(--summary-font-label, 12px)" } as const;
/**
 * Side by side, every heading stands two lines tall whether or not its words wrap — so the two tables' rows line up
 * station for station across the page, and the page is the same height on every sheet it prints on.
 */
const TWO_LINE_HEAD = { height: "2.75em" } as const;
const ROW_STYLE = { fontSize: "var(--summary-font-row, 11px)" } as const;

/** The depths under a straightedge: DATA's first table. */
function DepthsTable({ layout, beside = false }: { layout: BottomSheetLayout; beside?: boolean }) {
  const { system } = useUnits();
  const columns = BOTTOM_COPY.depthsColumns;
  const headers = [
    `${columns.width}${columnUnitSuffix("dim", system)}`,
    `${columns.deepest}${columnUnitSuffix("mark", system)}`,
    `${columns.railLift}${columnUnitSuffix("mark", system)}`,
    `${columns.stringerLeft}${columnUnitSuffix("mark", system)}`,
  ];
  return (
    <FormBox
      caption={BOTTOM_COPY.depthsHeading}
      // Beside the marks table this box carries the same second span in its caption row, empty: the marks' caption has
      // words there in a taller line, and without it the two tables' rows would sit three dots out of step.
      captionRight={beside ? <span aria-hidden>&nbsp;</span> : undefined}
      variant="flush"
      className="flex-none"
      bodyClassName="px-1.5 py-1"
    >
      <table data-bottom-sheet-depths className={TABLE}>
        <thead>
          <tr className="border-b-2 border-surf-line-faint" style={HEAD_ROW_STYLE}>
            <th scope="col" className={HEAD_STATION} style={beside ? TWO_LINE_HEAD : undefined}>
              {`${columns.station}${columnUnitSuffix("dim", system)}`}
            </th>
            {headers.map((header) => (
              <th key={header} scope="col" className={HEAD_CELL} style={beside ? TWO_LINE_HEAD : undefined}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {layout.dataRows.map((row) => {
            // The rows a shaper measures from — within reach of the wide point and the front fins — in full ink.
            const cell = cn(CELL, row.reference !== null ? "font-bold text-surf-ink" : "text-surf-ink-muted");
            return (
              <tr key={row.station} data-bottom-sheet-row-at={row.label} className={ROW} style={ROW_STYLE}>
                <th scope="row" className={STATION_CELL}>
                  {rowLabel(row, system)}
                </th>
                <td className={cell}>{row.width === null ? BOTTOM_COPY.emptyCell : formatDimBare(row.width, system)}</td>
                <td className={cell}>{bottomDepthCell(row.deepest, system)}</td>
                <td className={cell}>{bottomDepthCell(row.railLift, system)}</td>
                <td className={cell}>{row.stringerLeft === null ? BOTTOM_COPY.emptyCell : formatMarkBare(row.stringerLeft, system)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </FormBox>
  );
}

/** The layout marks off the stringer: DATA's second table, a column for each line a shaper rules. */
function MarksTable({ layout, beside = false }: { layout: BottomSheetLayout; beside?: boolean }) {
  const { system } = useUnits();
  const { marks, dataRows } = layout;
  // DATA's heading is `Layout marks · off the stringer` (with `(mm)` in Metric): the name is the box's caption, the rest
  // sits opposite it, where a unit keeps its own lower case.
  const [name, ...rest] = BOTTOM_COPY.marksHeading(system === "metric").split(" · ");
  return (
    <FormBox caption={name} captionRight={rest.join(" · ")} variant="flush" className="flex-none" bodyClassName="px-1.5 py-1">
      <table data-bottom-sheet-marks className={TABLE}>
        <thead>
          <tr className="border-b-2 border-surf-line-faint" style={HEAD_ROW_STYLE}>
            <th scope="col" className={HEAD_STATION} style={beside ? TWO_LINE_HEAD : undefined}>
              {`${BOTTOM_COPY.depthsColumns.station}${columnUnitSuffix("dim", system)}`}
            </th>
            {marks.columns.map((column) => (
              <th key={column.key} scope="col" className={HEAD_CELL} style={beside ? TWO_LINE_HEAD : undefined}>
                {layoutMarkColumnName(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {marks.rows.map((markRow, r) => {
            const row = dataRows[r];
            const cell = cn(CELL, row.reference !== null ? "font-bold text-surf-ink" : "text-surf-ink-muted");
            return (
              <tr key={markRow.station} className={ROW} style={ROW_STYLE}>
                <th scope="row" className={STATION_CELL}>
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
    </FormBox>
  );
}

/** Part 3: the two tables — side by side when the marks table is narrow, otherwise one above the other. */
function Tables({ layout, beside }: { layout: BottomSheetLayout; beside: boolean }) {
  const columns = layout.marks.columns.length;
  if (columns === 0) {
    return (
      <div data-bottom-sheet-part="tables" className="flex flex-none flex-col gap-1">
        <DepthsTable layout={layout} />
      </div>
    );
  }
  if (!beside) {
    return (
      <div data-bottom-sheet-part="tables" className="flex flex-none flex-col gap-1">
        <DepthsTable layout={layout} />
        <MarksTable layout={layout} />
      </div>
    );
  }
  return (
    <div data-bottom-sheet-part="tables" data-beside className="flex flex-none items-start gap-1">
      {/* Each table takes the width its columns ask for: five for the depths, the station and a column a mark. */}
      <div className="flex min-w-0 flex-col" style={{ flex: "5.5 1 0%" }}>
        <DepthsTable layout={layout} beside />
      </div>
      <div className="flex min-w-0 flex-col" style={{ flex: `${columns + 1.5} 1 0%` }}>
        <MarksTable layout={layout} beside />
      </div>
    </div>
  );
}

/** Part 4: how to shape each cut — the GUIDE's own words. */
function Notes({ layout }: { layout: BottomSheetLayout }) {
  return (
    <FormBox caption={BOTTOM_SHEET_COPY.howToShape} variant="flush" className="flex-none" bodyClassName="gap-[3px] px-1.5 py-1">
      <div data-bottom-sheet-part="notes" className="flex flex-col gap-[3px]">
        {layout.notes.map((note) => (
          <p key={note.head} className="text-surf-ink-muted leading-tight order-form-micro">
            <span className="font-bold text-surf-ink">{note.head}.</span> {note.how}
          </p>
        ))}
      </div>
    </FormBox>
  );
}

/** The BOTTOM CONTOURS page's body: the four parts, top to bottom — the tables here unless they took their own sheet. */
export function BottomContoursSheet({ layout }: { layout: BottomSheetLayout }) {
  const lone = layout.cuts.length === 1;
  return (
    <div data-bottom-sheet className="flex min-h-0 flex-1 flex-col gap-1" style={HOLLOW}>
      <TopView layout={layout} />
      <div data-bottom-sheet-part="sections" className={cn("grid flex-none gap-1", lone ? "grid-cols-1" : "grid-cols-2")}>
        {layout.cuts.map((cut) => (
          <SectionFigure key={cut.key} cut={cut} lone={lone} />
        ))}
      </div>
      {!layout.tablesOnOwnSheet && <Tables layout={layout} beside={layout.tablesBeside} />}
      <Notes layout={layout} />
    </div>
  );
}

/**
 * The tables' own sheet, for a board whose cuts fill the page: the same two tables at the page's full width, with
 * DATA's own notes on how to read them — as many as the fit rule found room for under the tables
 * (`layout.tableNotes`; the longest board with the most columns of marks leaves room for none, and keeps every row).
 */
export function BottomTablesSheet({ layout }: { layout: BottomSheetLayout }) {
  return (
    <div data-bottom-tables-sheet className="flex min-h-0 flex-1 flex-col gap-1">
      <Tables layout={layout} beside={false} />
      {layout.tableNotes.length > 0 && (
        <div data-bottom-sheet-part="table-notes" className="flex flex-none flex-col gap-[3px] px-0.5 pt-0.5 text-surf-ink-muted leading-tight order-form-micro">
          {layout.tableNotes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      )}
    </div>
  );
}
