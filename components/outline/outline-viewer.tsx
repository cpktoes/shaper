/**
 * Live SVG outline viewer, ported from the prototype's render math
 * (reference/project/Template.dc.html lines 651-728) but computed in
 * millimetres and converted to inches only where the prototype's own scale
 * math expects inches.
 *
 * All SVG geometry is rendered through JSX attributes holding numbers
 * computed from lib/geometry — never string-built markup, never
 * `dangerouslySetInnerHTML`, no `document.write`/`window.open` (threat
 * T-QO-01; the prototype's print paths are out of scope for this screen).
 *
 * The callout system (chips, output rail, reference lines) implements the grammar locked in
 * `.planning/sketches/` 001-004: nothing inside the outline but faint lines, computed values read
 * out to the shared right-hand rail, and every input a named chip in the left gutter. All labels
 * are SVG `<text>` — there is no absolutely-positioned HTML overlay. Rails/gutters are canonical
 * constants imported from `components/viewer/callout-primitives.tsx`, never invented per call.
 */

import type { OutlineSpec } from "@/lib/geometry/board";
import type { FinMark } from "@/lib/geometry/fins";
import type { OutlineGeometry } from "@/lib/geometry/outline";
import { sampleOutline } from "@/lib/geometry/outline";
import { formatFeetInches, formatInchesFraction, inchesToMm, mm, mmToInches } from "@/lib/geometry/units";
import {
  CalloutChip,
  OUTLINE_CHIP_HEIGHT,
  OUTLINE_CHIP_RIGHT_X,
  OUTLINE_VIEW_HEIGHT,
  OUTLINE_VIEW_MIN_X,
  OUTLINE_VIEW_MIN_Y,
  OUTLINE_VIEW_WIDTH,
  OutputRail,
  outlineMaxHalfWidthPx,
} from "@/components/viewer/callout-primitives";

const VIEW_W = 340;
const VIEW_H = 620;
const PAD_Y = 24;
/** The board's own historic half-width bound (from the centreline), used only when the callout
 * system is hidden entirely (`hideCallouts`) — this keeps preset-card thumbnails pixel-identical
 * to their pre-callout-system rendering; nothing about the board's own coordinate space changed. */
const LEGACY_MAX_HALF_WIDTH_PX = VIEW_W / 2 - 30;
/** Vertical gap between the Widepoint chip and the leaderless WP Offset chip stacked beneath it. */
const CHIP_STACK_GAP = 6;
/** How far the static stringer/centreline overhangs the board's own tip/tail — a drafting nicety
 * (sketch 004's reference render), not load-bearing geometry. */
const STRINGER_OVERHANG = 8;

interface OutlineViewerProps {
  geometry: OutlineGeometry;
  outline: OutlineSpec;
  showConstruction: boolean;
  /** The calculated fin marks, drawn on the template as one accent line per fin from trailing to
   * leading edge, with a dot at each end (Template.dc.html lines 178-182). Optional so the
   * viewer still renders standalone before fins are wired up. */
  finMarks?: FinMark[];
  /** Thumbnail-scale-only display sizing used by the setup screen's preset cards
   * (components/setup/preset-card.tsx): when true, suppresses the entire callout system (chips,
   * output rail, reference lines, widepoint dots), leaving the SVG board outline path,
   * construction lines, and fin marks untouched, and keeps the board's original tight viewBox so
   * the thumbnail's scale/position never changes. Defaults to `false`, every existing screen's
   * unchanged callout and station-line overlay. */
  hideCallouts?: boolean;
  /** Outline-editor-only display gate (components/outline/outline-editor.tsx): when true, skips
   * drawing the calculated fin-mark lines/dots on the board outline, leaving the outline curve,
   * callouts, and construction lines untouched. Fin marks are still relevant on the printed
   * template (components/summary/board-summary.tsx) and the setup-screen thumbnails, so this is
   * an additive per-consumer gate, not a change to `finMarksSvg` itself. Defaults to `false`. */
  hideFinMarks?: boolean;
}

export function OutlineViewer({
  geometry,
  outline,
  showConstruction,
  finMarks = [],
  hideCallouts = false,
  hideFinMarks = false,
}: OutlineViewerProps) {
  const lengthIn = mmToInches(geometry.length);
  const cwIn = mmToInches(geometry.halfWidePointWidth);
  const centerlineX = VIEW_W / 2;

  // The callout system reserves gutter space on both sides of the board; when it's hidden
  // entirely, fall back to the board's original padding so hideCallouts renders (preset-card
  // thumbnails) never change.
  const maxHalfWidthPx = hideCallouts ? LEGACY_MAX_HALF_WIDTH_PX : outlineMaxHalfWidthPx(centerlineX);
  const scale = Math.min(maxHalfWidthPx / cwIn, (VIEW_H - PAD_Y * 2) / lengthIn);
  const tailPy = VIEW_H - PAD_Y;
  const tipPy = PAD_Y;
  const lenToY = (stationIn: number) => tailPy - stationIn * scale;
  const pxX = (halfWidthIn: number) => centerlineX + halfWidthIn * scale;

  const rightPx = geometry.points.map((p) => [
    pxX(mmToInches(p.halfWidth)),
    lenToY(mmToInches(p.station)),
  ]);
  const leftPx = geometry.points
    .slice()
    .reverse()
    .map((p) => [pxX(-mmToInches(p.halfWidth)), lenToY(mmToInches(p.station))]);
  const centerCloseIn = mmToInches(geometry.centreCloseStation);
  const centerClosePx = `${pxX(0).toFixed(2)} ${lenToY(centerCloseIn).toFixed(2)}`;
  const outlinePath = `M ${rightPx.map((p) => p.map((v) => v.toFixed(2)).join(" ")).join(" L ")} L ${leftPx
    .map((p) => p.map((v) => v.toFixed(2)).join(" "))
    .join(" L ")} L ${centerClosePx} Z`;

  const xAtStationIn = (stationIn: number) =>
    mmToInches(sampleOutline(geometry, inchesToMm(stationIn)));

  const wpYIn = mmToInches(geometry.widePointStation);
  const wpHalfWidthIn = xAtStationIn(wpYIn);
  const midHalfWidthIn = xAtStationIn(lengthIn / 2);
  const noseStationIn = lengthIn - 12;
  const tailStationIn = 12;
  const noseHalfWidthIn = xAtStationIn(noseStationIn);
  const tailHalfWidthIn = xAtStationIn(tailStationIn);

  const centerWidthAtStationIn = 2 * midHalfWidthIn;
  const wpFromCenterIn = wpYIn - lengthIn / 2;
  const wpOffsetText =
    Math.abs(wpFromCenterIn) < 1e-9
      ? "At center"
      : `${formatInchesFraction(inchesToMm(Math.abs(wpFromCenterIn)))} ${
          wpFromCenterIn > 0 ? "forward" : "back"
        }`;

  // Ported from the prototype's finMarksSvg (Template.dc.html lines 777-779): a line from
  // (pxX(lateral), lenToY(offTail)) to (pxX(leadingLateral), lenToY(leadingOffTail)) per fin mark.
  const finMarksSvg = finMarks.map((m) => ({
    x1: pxX(mmToInches(m.lateral)),
    y1: lenToY(mmToInches(m.offTail)),
    x2: pxX(mmToInches(m.leadingLateral)),
    y2: lenToY(mmToInches(m.leadingOffTail)),
  }));

  const lengthCalloutText = `${formatFeetInches(geometry.length)} (${formatInchesFraction(geometry.length)})`;

  const knotColors = ["var(--outline-ink)", "var(--outline-widepoint-knot)", "var(--outline-ink)"];
  const constructionDots: { cx: number; cy: number; color: string }[] = [];
  const constructionLines: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];

  geometry.knots.forEach((k, i) => {
    const stationIn = mmToInches(k.point.x);
    const halfWidthIn = mmToInches(k.point.y);
    for (const side of [1, -1]) {
      constructionDots.push({ cx: pxX(side * halfWidthIn), cy: lenToY(stationIn), color: knotColors[i] });
    }
  });
  geometry.handles.forEach((h) => {
    const fromStationIn = mmToInches(h.from.x);
    const fromHalfWidthIn = mmToInches(h.from.y);
    const toStationIn = mmToInches(h.to.x);
    const toHalfWidthIn = mmToInches(h.to.y);
    for (const side of [1, -1]) {
      constructionLines.push({
        x1: pxX(side * fromHalfWidthIn),
        y1: lenToY(fromStationIn),
        x2: pxX(side * toHalfWidthIn),
        y2: lenToY(toStationIn),
        color: "var(--outline-construction)",
      });
      constructionDots.push({
        cx: pxX(side * toHalfWidthIn),
        cy: lenToY(toStationIn),
        color: "var(--outline-construction)",
      });
    }
  });

  // Inputs: left gutter chips. Length sits at the nose tip; Widepoint leaders to the rail at its
  // own station; WP Offset carries no leader (grouped beneath Widepoint — sketch 004); Tail Block
  // only exists for tail shapes that actually have one (pin/round have none).
  const lengthChipY = tipPy;
  const widepointChipY = lenToY(wpYIn);
  const wpOffsetChipY = widepointChipY + OUTLINE_CHIP_HEIGHT + CHIP_STACK_GAP;
  const tailPodStationIn = mmToInches(geometry.tailPodStation);
  const tailBlockChipY = lenToY(tailPodStationIn);
  const halfTailBlockWidthIn = mmToInches(geometry.halfTailBlockWidth);
  const tailBlockValue = `${formatInchesFraction(mm(geometry.halfTailBlockWidth * 2))} wide`;

  const viewBox = hideCallouts
    ? `0 0 ${VIEW_W} ${VIEW_H}`
    : `${OUTLINE_VIEW_MIN_X} ${OUTLINE_VIEW_MIN_Y} ${OUTLINE_VIEW_WIDTH} ${OUTLINE_VIEW_HEIGHT}`;

  return (
    <svg
      width={hideCallouts ? VIEW_W : OUTLINE_VIEW_WIDTH}
      height={hideCallouts ? VIEW_H : OUTLINE_VIEW_HEIGHT}
      viewBox={viewBox}
      className="block h-full w-full"
    >
      <path d={outlinePath} fill="var(--outline-board-fill)" stroke="var(--outline-ink)" strokeWidth={2} />

      {!hideCallouts && (
        <>
          {/* Interior: faint lines only, never text (sketch 004). Stringer and the mid-length
              centreline are both static, so they share one dash; nose/tail 12" stations are
              derived, so they get the shorter uniform dash. The widepoint is an INPUT, so its
              station line carries the widepoint colour and its own dotted dash — on a board whose
              widepoint sits near centre the two lines are only a few pixels apart, so colour, not
              dash, is what actually tells them apart. */}
          <line
            x1={centerlineX}
            y1={tipPy - STRINGER_OVERHANG}
            x2={centerlineX}
            y2={tailPy + STRINGER_OVERHANG}
            stroke="var(--outline-station-line)"
            strokeWidth={1}
            strokeDasharray="var(--outline-stringer-dash)"
          />
          <line
            x1={pxX(-midHalfWidthIn)}
            y1={lenToY(lengthIn / 2)}
            x2={pxX(midHalfWidthIn)}
            y2={lenToY(lengthIn / 2)}
            stroke="var(--outline-station-line)"
            strokeWidth={1}
            strokeDasharray="var(--outline-stringer-dash)"
          />
          <line
            x1={pxX(-noseHalfWidthIn)}
            y1={lenToY(noseStationIn)}
            x2={pxX(noseHalfWidthIn)}
            y2={lenToY(noseStationIn)}
            stroke="var(--outline-station-line)"
            strokeWidth={1}
            strokeDasharray="var(--outline-station-dash)"
          />
          <line
            x1={pxX(-tailHalfWidthIn)}
            y1={lenToY(tailStationIn)}
            x2={pxX(tailHalfWidthIn)}
            y2={lenToY(tailStationIn)}
            stroke="var(--outline-station-line)"
            strokeWidth={1}
            strokeDasharray="var(--outline-station-dash)"
          />
          <line
            x1={pxX(-wpHalfWidthIn)}
            y1={lenToY(wpYIn)}
            x2={pxX(wpHalfWidthIn)}
            y2={lenToY(wpYIn)}
            stroke="var(--outline-widepoint-line)"
            strokeWidth={1}
            strokeDasharray="var(--outline-widepoint-dash)"
          />
          <circle cx={pxX(-wpHalfWidthIn)} cy={lenToY(wpYIn)} r={2.6} fill="var(--outline-widepoint-knot)" />
          <circle cx={pxX(wpHalfWidthIn)} cy={lenToY(wpYIn)} r={2.6} fill="var(--outline-widepoint-knot)" />
        </>
      )}

      {showConstruction && (
        <>
          {constructionLines.map((cl, i) => (
            <line key={i} x1={cl.x1} y1={cl.y1} x2={cl.x2} y2={cl.y2} stroke={cl.color} strokeWidth={1.5} />
          ))}
          {constructionDots.map((dt, i) => (
            <circle key={i} cx={dt.cx} cy={dt.cy} r={4} fill={dt.color} />
          ))}
        </>
      )}
      {!hideFinMarks &&
        finMarksSvg.map((fm, i) => (
          <g key={i}>
            <line
              x1={fm.x1}
              y1={fm.y1}
              x2={fm.x2}
              y2={fm.y2}
              stroke="var(--outline-accent)"
              strokeWidth={2}
            />
            <circle cx={fm.x1} cy={fm.y1} r={3.5} fill="var(--outline-ink)" />
            <circle cx={fm.x2} cy={fm.y2} r={3.5} fill="var(--outline-ink)" />
          </g>
        ))}

      {!hideCallouts && (
        <>
          {/* Outputs: one shared right rail — the derived widths appear nowhere else on the
              Summary dashboard, so these stay even in compact mode. */}
          <OutputRail
            edgeX={pxX(noseHalfWidthIn)}
            y={lenToY(noseStationIn)}
            value={formatInchesFraction(geometry.noseWidthAt12in)}
            station={'Nose @ 12"'}
          />
          <OutputRail
            edgeX={pxX(midHalfWidthIn)}
            y={lenToY(lengthIn / 2)}
            value={formatInchesFraction(mm(inchesToMm(centerWidthAtStationIn)))}
            station="Centre"
          />
          <OutputRail
            edgeX={pxX(tailHalfWidthIn)}
            y={lenToY(tailStationIn)}
            value={formatInchesFraction(geometry.tailWidthAt12in)}
            station={'Tail @ 12"'}
          />

          {/* Inputs: left gutter chips, each naming its own value (sketch 004). Shown in compact
              too — the Summary sheet is read at the blank, where the sidebar is not available, so
              the shaper needs the settings on the drawing itself. */}
          <>
              <CalloutChip
                x={OUTLINE_CHIP_RIGHT_X}
                y={lengthChipY}
                name="LENGTH"
                value={lengthCalloutText}
                leaderToX={centerlineX}
              />
              <CalloutChip
                x={OUTLINE_CHIP_RIGHT_X}
                y={widepointChipY}
                name="WIDEPOINT"
                value={formatInchesFraction(outline.widePointWidth)}
                nameColor="var(--outline-widepoint-knot)"
                leaderToX={pxX(-wpHalfWidthIn)}
              />
              <CalloutChip x={OUTLINE_CHIP_RIGHT_X} y={wpOffsetChipY} name="WP OFFSET" value={wpOffsetText} />
              {!geometry.tailBlockPinned && (
                <CalloutChip
                  x={OUTLINE_CHIP_RIGHT_X}
                  y={tailBlockChipY}
                  name="TAIL BLOCK"
                  value={tailBlockValue}
                  leaderToX={pxX(-halfTailBlockWidthIn)}
                />
              )}
          </>
        </>
      )}
    </svg>
  );
}
