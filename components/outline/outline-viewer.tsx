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
 */

import type { OutlineSpec } from "@/lib/geometry/board";
import type { FinMark } from "@/lib/geometry/fins";
import type { OutlineGeometry } from "@/lib/geometry/outline";
import { sampleOutline } from "@/lib/geometry/outline";
import { formatFeetInches, formatInchesFraction, inchesToMm, mm, mmToInches } from "@/lib/geometry/units";

const VIEW_W = 340;
const VIEW_H = 620;
const PAD_X = 30;
const PAD_Y = 24;
const MIN_GAP = 26;

interface OutlineViewerProps {
  geometry: OutlineGeometry;
  outline: OutlineSpec;
  showConstruction: boolean;
  /** The calculated fin marks, drawn on the template as one accent line per fin from trailing to
   * leading edge, with a dot at each end (Template.dc.html lines 178-182). Optional so the
   * viewer still renders standalone before fins are wired up. */
  finMarks?: FinMark[];
  /** Embedding-only display sizing used by the Summary dashboard (Template.dc.html line 769):
   * shrinks the three callout spans to the shared `--summary-font-callout` scale. Changes nothing
   * else — no geometry, no colours, no layout. Defaults to `false`, the outline screen's own
   * unchanged 14px/13px callouts. */
  compact?: boolean;
  /** Thumbnail-scale-only display sizing used by the setup screen's preset cards
   * (components/setup/preset-card.tsx): when true, skips the absolutely-positioned dimension
   * label/value and length overlay entirely, leaving the SVG path, construction lines, and fin
   * marks untouched. Changes nothing else — no geometry, no colours, no viewBox. Defaults to
   * `false`, every existing screen's unchanged callout overlay. */
  hideCallouts?: boolean;
}

interface RawCallout {
  pxTop: number;
  label: string;
  value: string;
  pinned: boolean;
}

export function OutlineViewer({
  geometry,
  outline,
  showConstruction,
  finMarks = [],
  compact = false,
  hideCallouts = false,
}: OutlineViewerProps) {
  const lengthIn = mmToInches(geometry.length);
  const cwIn = mmToInches(geometry.halfWidePointWidth);

  const scale = Math.min((VIEW_W / 2 - PAD_X) / cwIn, (VIEW_H - PAD_Y * 2) / lengthIn);
  const centerlineX = VIEW_W / 2;
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
  const refStationsIn = [12, lengthIn - 12, wpYIn, lengthIn / 2];
  const refLines = refStationsIn.map((stationIn) => {
    const hw = xAtStationIn(stationIn);
    return {
      x1: pxX(-hw),
      y1: lenToY(stationIn),
      x2: pxX(hw),
      y2: lenToY(stationIn),
    };
  });

  const centerWidthAtStationIn = 2 * xAtStationIn(lengthIn / 2);
  const wpFromCenterIn = wpYIn - lengthIn / 2;
  const calloutHalfGapIn = cwIn + 1.16;
  const namesPctLeft = `${((pxX(calloutHalfGapIn) / VIEW_W) * 100).toFixed(3)}%`;
  const valuesPctLeft = `${((pxX(-calloutHalfGapIn) / VIEW_W) * 100).toFixed(3)}%`;

  const rawCallouts: RawCallout[] = [
    {
      pxTop: lenToY(12),
      label: "Tail @ 12\"",
      value: formatInchesFraction(geometry.tailWidthAt12in),
      pinned: true,
    },
    {
      pxTop: lenToY(lengthIn - 12),
      label: "Nose @ 12\"",
      value: formatInchesFraction(geometry.noseWidthAt12in),
      pinned: true,
    },
    {
      pxTop: lenToY(wpYIn),
      label: "Widepoint",
      value: formatInchesFraction(outline.widePointWidth),
      pinned: false,
    },
    {
      pxTop: lenToY(lengthIn / 2),
      label: "Center",
      value: formatInchesFraction(mm(inchesToMm(centerWidthAtStationIn))),
      pinned: false,
    },
    {
      pxTop: (lenToY(wpYIn) + lenToY(lengthIn / 2)) / 2,
      label: "WP vs Center",
      value:
        Math.abs(wpFromCenterIn) < 1e-9
          ? "At center"
          : `${formatInchesFraction(inchesToMm(Math.abs(wpFromCenterIn)))} ${
              wpFromCenterIn > 0 ? "forward" : "back"
            }`,
      pinned: false,
    },
  ];

  // De-overlap pass: push unpinned callouts apart to a minimum gap, sorted by vertical
  // position; the two 12" station callouts are pinned and never move (they must stay
  // aligned with their dashed reference lines on the board).
  rawCallouts.sort((a, b) => a.pxTop - b.pxTop);
  for (let i = 1; i < rawCallouts.length; i++) {
    if (rawCallouts[i].pinned) continue;
    if (rawCallouts[i].pxTop - rawCallouts[i - 1].pxTop < MIN_GAP) {
      rawCallouts[i].pxTop = rawCallouts[i - 1].pxTop + MIN_GAP;
    }
  }
  for (let i = rawCallouts.length - 2; i >= 0; i--) {
    if (rawCallouts[i].pinned) continue;
    if (rawCallouts[i + 1].pxTop - rawCallouts[i].pxTop < MIN_GAP) {
      rawCallouts[i].pxTop = rawCallouts[i + 1].pxTop - MIN_GAP;
    }
  }

  const callouts = rawCallouts.map((c) => ({
    namesPctLeft,
    valuesPctLeft,
    pctTop: `${((c.pxTop / VIEW_H) * 100).toFixed(3)}%`,
    label: c.label,
    value: c.value,
  }));

  // Ported from the prototype's finMarksSvg (Template.dc.html lines 777-779): a line from
  // (pxX(lateral), lenToY(offTail)) to (pxX(leadingLateral), lenToY(leadingOffTail)) per fin mark.
  const finMarksSvg = finMarks.map((m) => ({
    x1: pxX(mmToInches(m.lateral)),
    y1: lenToY(mmToInches(m.offTail)),
    x2: pxX(mmToInches(m.leadingLateral)),
    y2: lenToY(mmToInches(m.leadingOffTail)),
  }));

  const lengthCalloutText = `${formatFeetInches(geometry.length)} (${formatInchesFraction(geometry.length)})`;
  const lengthCalloutPctLeft = `${((centerlineX / VIEW_W) * 100).toFixed(3)}%`;
  const lengthCalloutPctTop = `${((tipPy / VIEW_H) * 100).toFixed(3)}%`;

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

  return (
    <>
      <svg
        width={VIEW_W}
        height={VIEW_H}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="block h-full w-full"
      >
        <path d={outlinePath} fill="var(--outline-board-fill)" stroke="var(--outline-ink)" strokeWidth={2} />
        <line
          x1={centerlineX}
          y1={tipPy}
          x2={centerlineX}
          y2={tailPy}
          stroke="var(--outline-station-line)"
          strokeWidth={1}
          strokeDasharray="6 4"
        />
        {refLines.map((rl, i) => (
          <line
            key={i}
            x1={rl.x1}
            y1={rl.y1}
            x2={rl.x2}
            y2={rl.y2}
            stroke="var(--outline-station-line)"
            strokeWidth={1}
            strokeDasharray="6 4"
          />
        ))}
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
        {finMarksSvg.map((fm, i) => (
          <g key={i}>
            <line
              x1={fm.x1}
              y1={fm.y1}
              x2={fm.x2}
              y2={fm.y2}
              stroke="var(--outline-accent)"
              strokeWidth={2}
            />
            <circle cx={fm.x1} cy={fm.y1} r={3.5} fill="#1c1b19" />
            <circle cx={fm.x2} cy={fm.y2} r={3.5} fill="#1c1b19" />
          </g>
        ))}
      </svg>
      {!hideCallouts && (
      <div className="pointer-events-none absolute inset-0">
        {callouts.map((co, i) => (
          <div key={i}>
            <div
              className="absolute -translate-x-full -translate-y-1/2 pr-[5px] text-right font-bold whitespace-nowrap text-outline-ink"
              style={{
                left: co.valuesPctLeft,
                top: co.pctTop,
                fontSize: compact ? "var(--summary-font-callout, 10px)" : "14px",
              }}
            >
              {co.value}
            </div>
            <div
              className="absolute -translate-y-1/2 pl-1 font-bold tracking-[0.3px] whitespace-nowrap text-[#3a5f9e] uppercase"
              style={{
                left: co.namesPctLeft,
                top: co.pctTop,
                textShadow: "0 0 3px var(--outline-page-bg), 0 0 3px var(--outline-page-bg)",
                fontSize: compact ? "var(--summary-font-callout, 10px)" : "13px",
              }}
            >
              {co.label}
            </div>
          </div>
        ))}
        <div
          className="absolute text-center font-extrabold whitespace-nowrap text-outline-ink"
          style={{
            left: lengthCalloutPctLeft,
            top: lengthCalloutPctTop,
            transform: "translate(-50%, calc(-100% - 4px))",
            fontSize: compact ? "var(--summary-font-callout, 10px)" : "14px",
          }}
        >
          {lengthCalloutText}
        </div>
      </div>
      )}
    </>
  );
}
