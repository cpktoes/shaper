"use client";

/**
 * The INSTRUCTIONS tab's "Turning Marks Into Rail Bands" figure (RAIL-05, D-01/D-02) — the
 * prototype's own fixed example board: a plan-view PNG traced with hand-drawn deck-mark, rail-mark
 * and tuck overlays, a side-view SVG strip carrying the same marks, the `@12"`/`@Center`/`@12"`
 * station labels and the "Taper Tuck to a Sharp Edge" note. It is a teaching illustration of a
 * generic board, never the shaper's own outline (D-01) — nothing here reads the design store.
 *
 * The ported data (the path strings, the viewBoxes, the colour/width/dash maps) lives in
 * `rail-reference-paths.ts`, pinned against the prototype's own source by a parity test. This
 * file is presentation only: it lays the four columns out as one box that fits its container's
 * width up to the prototype's own rendered size (never the prototype's own hard-coded `0.7492`
 * transform, UI-SPEC "The figure's fit") — a shaper needs the whole example board on screen at
 * once, not stretched wide enough to run off the bottom of the column — filters the ported paths
 * by `visibleGroups`, and reads its two literal figures — the station labels and the tail-distance
 * range — through the display boundary (RAIL-06).
 */

import type { ReactNode } from "react";
import { useUnits } from "@/components/units-provider";
import { formatDim, stationLabel } from "@/lib/geometry/measure-display";
import { inchesToMm, type UnitsSystem } from "@/lib/geometry/units";
import {
  GATEABLE_RAIL_REFERENCE_GROUPS,
  PLAN_REF_PATHS,
  PLAN_REF_VIEWBOX,
  REF_DASH_PX,
  REF_GROUP_SCREEN_COLORS,
  REF_GROUP_DEFAULT_WIDTH,
  REF_GROUP_WIDTHS,
  SIDE_REF_PATHS,
  SIDE_REF_VIEWBOX,
  type RailReferenceGroup,
  type RailReferencePath,
} from "./rail-reference-paths";

/** The bottom-tuck-to-hard-edge distance range (Step 3's own copy, and this figure's taper note,
 * D-04) — a position along the board, so it's a dim: composed through the display boundary with
 * the unit carried once at the end of the range, mirroring `templateNameBlockDimsText`'s own
 * "strip the earlier end's redundant unit" idiom (`components/template/build-template-pdf.ts`).
 * Imperial reproduces the prototype's own `16-22"` verbatim; Metric reads centimetres end to end.
 * Never hand-typed, never a conversion factor inlined here — `inchesToMm`/`formatDim` do the job. */
const TAPER_TUCK_RANGE_IN = { from: 16, to: 22 } as const;

/** Exported so `RailInstructions` (Task 3) composes the identical range for Step 3's own copy,
 * rather than a second, potentially-drifting composition of the same two literal inches. */
export function formatTaperTuckRange(system: UnitsSystem): string {
  const from = formatDim(inchesToMm(TAPER_TUCK_RANGE_IN.from), system);
  const to = formatDim(inchesToMm(TAPER_TUCK_RANGE_IN.to), system);
  const fromBare = system === "metric" ? from.replace(/ cm$/, "") : from.replace(/"$/, "");
  return `${fromBare}-${to}`;
}

interface RailReferenceLegendEntry {
  key: RailReferenceGroup;
  label: string;
  color: string;
}

/** The prototype's own nine legend entries (Rails.dc.html lines 1290-1298), in its own order —
 * D-03's "all nine start ticked" is the caller's (`RailInstructions`) local state, not this list. */
export const RAIL_REFERENCE_LEGEND: RailReferenceLegendEntry[] = [
  { key: "deckMark1", label: "Deck Marks 1", color: REF_GROUP_SCREEN_COLORS.deckMark1 },
  { key: "deckBand1", label: "Deck Band 1", color: REF_GROUP_SCREEN_COLORS.deckBand1 },
  { key: "deckMark3", label: "Deck Marks 3", color: REF_GROUP_SCREEN_COLORS.deckMark3 },
  { key: "deckBand2", label: "Deck Band 2", color: REF_GROUP_SCREEN_COLORS.deckBand2 },
  { key: "deckMark3Full", label: "Deck Mark 3 Center (full board)", color: REF_GROUP_SCREEN_COLORS.deckMark3Full },
  { key: "railMark1", label: "Rail Marks 1", color: REF_GROUP_SCREEN_COLORS.railMark1 },
  { key: "railBand1", label: "Rail Band 1", color: REF_GROUP_SCREEN_COLORS.railBand1 },
  { key: "railTuck1", label: "Rail Tucks 1", color: REF_GROUP_SCREEN_COLORS.railTuck1 },
  { key: "tuckBlend", label: "Tuck blend to hard tail", color: REF_GROUP_SCREEN_COLORS.tuckBlend },
];

/** Every gateable group, for a caller (the third print sheet, 08-05) that wants every line drawn
 * regardless of any on-screen tick state — the fixed reference sheet is always "every legend line
 * drawn" (D-08), never borrowed from this tab's own ticked set. */
export const ALL_RAIL_REFERENCE_GROUPS: Set<RailReferenceGroup> = new Set(GATEABLE_RAIL_REFERENCE_GROUPS);

// The prototype's own 499x630 layout box (Rails.dc.html line 417), before its hard-coded
// `scale(0.7492)` — ported here as proportions of one box that fits its container, never that
// literal transform (UI-SPEC "The figure's fit"). The note column's true visual footprint (the
// "Taper Tuck..." text) is roughly 144px wide inside that same box; the prototype achieves this by
// giving the column itself only an 8px flex-basis and letting the note text overflow into the
// box's own unused right margin (justify-content: center over-provisions 499px of width for 357px
// of packed columns). That overflow trick has no responsive equivalent, so this port gives the
// note column its own honest share of the width instead — the column widths below sum back to the
// prototype's own 499px total, so the whole figure keeps its original proportions.
const FIGURE_HEIGHT = 630;
const FIGURE_GAP = 14;
const FIGURE_COLUMNS = { plan: 223, label: 19, side: 65, note: 150 } as const;
const FIGURE_CONTENT_WIDTH =
  FIGURE_COLUMNS.plan + FIGURE_COLUMNS.label + FIGURE_COLUMNS.side + FIGURE_COLUMNS.note + FIGURE_GAP * 3;

// The prototype's own rendered size for this whole figure (Rails.dc.html lines 415-417): its
// 499x630 layout box sat inside a 500px-tall frame at a hard-coded `scale(0.7492)`, so it actually
// drew at 630 * 0.7492 = 472px tall. That is the ceiling this figure now scales up to, so the
// whole example board stays on screen instead of stretching to fill an arbitrarily wide column.
// The width is derived from the height and the two existing layout constants above, never typed
// by hand, so it can never drift out of the 499:630 ratio those columns already sum to (it lands
// on 373.85px, the prototype's own frame width).
const FIGURE_MAX_RENDERED_HEIGHT = 472;
const FIGURE_MAX_RENDERED_WIDTH = (FIGURE_MAX_RENDERED_HEIGHT * FIGURE_CONTENT_WIDTH) / FIGURE_HEIGHT;

function widthPercent(column: number): string {
  return `${(column / FIGURE_CONTENT_WIDTH) * 100}%`;
}

/** Renders one ported path array, filtered by `visibleGroups` — the side view's own `black` board
 * outline is never gated (the prototype's `show` map hardcodes it `true`, Rails.dc.html line
 * 1386), so it always renders regardless of the legend. */
function refPathElements(paths: RailReferencePath[], visibleGroups: Set<RailReferenceGroup>): ReactNode[] {
  return paths
    .filter((p) => p.group === "black" || visibleGroups.has(p.group))
    .map((p, i) => (
      <path
        key={`${p.group}-${i}`}
        d={p.d}
        fill="none"
        stroke={REF_GROUP_SCREEN_COLORS[p.group]}
        strokeWidth={REF_GROUP_WIDTHS[p.group] ?? REF_GROUP_DEFAULT_WIDTH}
        strokeDasharray={REF_DASH_PX[p.dash] ?? "none"}
      />
    ));
}

/** A label's font size, tied to the figure's own container width rather than the viewport's — the
 * same `clamp(min, N cqw, max)` idiom `app/design/summary/order-form.css` already establishes for
 * a surface that scales as one box. This needs no change for the new render-size cap above: at the
 * capped `FIGURE_MAX_RENDERED_WIDTH` (373.85px) this clamp computes to 373.85 * 0.032 = 11.96px,
 * which is the prototype's own 16px label at its own 0.7492 rendering (16 * 0.7492 = 11.99px). The
 * container query already tracks the capped box, so the cap brings the labels to the prototype's
 * size automatically. */
const LABEL_FONT_SIZE = "clamp(9px, 3.2cqw, 20px)";

/**
 * The plan and side reference figure (RAIL-05). `visibleGroups` decides which of the nine
 * gateable line families draw — the board outline, side strip and station labels are unaffected
 * by the set and always render (RAIL-05 empty-state: unticking every box never blanks the box).
 */
export function RailPlanSideFigure({ visibleGroups }: { visibleGroups: Set<RailReferenceGroup> }) {
  const { system } = useUnits();

  return (
    // Pinned to the prototype's own literal light values in every theme (UI-SPEC Color) — the
    // PNG background cannot invert for a dark theme, so this one card stays light on purpose, the
    // same reasoning app/globals.css's @media print block already pins Daylight tokens for print.
    <div className="mx-auto w-full rounded-lg border border-surf-line-faint bg-surf-ground p-3.5">
      <div
        className="@container relative mx-auto w-full"
        style={{ aspectRatio: `${FIGURE_CONTENT_WIDTH} / ${FIGURE_HEIGHT}`, maxWidth: `${FIGURE_MAX_RENDERED_WIDTH}px` }}
      >
        <div className="absolute inset-0 flex" style={{ gap: `${(FIGURE_GAP / FIGURE_CONTENT_WIDTH) * 100}%` }}>
          <div className="relative h-full flex-none" style={{ width: widthPercent(FIGURE_COLUMNS.plan) }}>
            <img
              src="/rail-bands-plan-bg.png"
              alt="Plan and side view of an example board showing where the rail sections sit"
              className="absolute inset-0 h-full w-full"
            />
            <svg
              viewBox={PLAN_REF_VIEWBOX}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              {refPathElements(PLAN_REF_PATHS, visibleGroups)}
            </svg>
          </div>

          <div
            className="relative h-full flex-none text-surf-ink"
            style={{ width: widthPercent(FIGURE_COLUMNS.label), fontSize: LABEL_FONT_SIZE }}
          >
            <span
              className="absolute inset-x-0 text-center whitespace-nowrap"
              style={{ top: "19.01%", transform: "translateY(-50%)" }}
            >
              {stationLabel(system)}
            </span>
            <span
              className="absolute inset-x-0 top-1/2 text-center whitespace-nowrap"
              style={{ transform: "translateY(-50%)" }}
            >
              @Center
            </span>
            <span
              className="absolute inset-x-0 text-center whitespace-nowrap"
              style={{ top: "81.23%", transform: "translateY(-50%)" }}
            >
              {stationLabel(system)}
            </span>
          </div>

          <div className="relative h-full flex-none" style={{ width: widthPercent(FIGURE_COLUMNS.side) }}>
            <svg
              viewBox={SIDE_REF_VIEWBOX}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              {refPathElements(SIDE_REF_PATHS, visibleGroups)}
            </svg>
          </div>

          <div className="relative h-full flex-none" style={{ width: widthPercent(FIGURE_COLUMNS.note) }}>
            <div
              className="absolute left-0 text-surf-ink"
              style={{ top: "62%", fontSize: LABEL_FONT_SIZE, lineHeight: 1.4 }}
            >
              Taper Tuck to
              <br />
              a Sharp Edge at
              <br />
              {formatTaperTuckRange(system)} off Tail
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
