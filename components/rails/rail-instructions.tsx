"use client";

/**
 * The rails screen's third tab (RAIL-02) — the teaching half of the screen. The DATA tab already
 * gives a shaper the rail band numbers; this tab shows what those numbers *are* on a real rail.
 *
 * `ExampleRailFigure` runs the same geometry chain every other rail section already runs
 * (`computeRailSection` -> `buildRailSegments`/`buildRailProfile`/`railPlotBounds`) against the
 * prototype's own fixed literal inputs (D-20), never `lib/geometry/rail-bands.ts` itself — that
 * module is untouched by this phase. `RailInstructions` is the tab body: card 1 ("Understanding
 * Rail Markings" — fixed at the prototype's own 350px height, ported from Rails.dc.html line 359,
 * so the example rail always has a real box to draw in), card 2 ("Turning Marks Into Rail Bands"
 * — the three steps, the nine-item legend and the plan/side figure) and card 3 (the closing note),
 * matching the prototype's own three-card page (D-02).
 */

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useUnits } from "@/components/units-provider";
import { TwoOptionToggle } from "@/components/viewer/two-option-toggle";
import { formatMark } from "@/lib/geometry/measure-display";
import {
  buildRailProfile,
  buildRailSegments,
  computeRailSection,
  railPlotBounds,
  type RailSectionOutput,
} from "@/lib/geometry/rail-bands";
import { inchesToMm, type Mm } from "@/lib/geometry/units";
import { buildRailCallouts, deOverlapCallouts, RAIL_CALLOUT_AXIS_CLEARANCE, RAIL_CALLOUT_MIN_GAP } from "./rail-callouts";
import { RAIL_REFERENCE_LEGEND, RailPlanSideFigure, formatTaperTuckRange } from "./rail-plan-side-figure";
import type { RailReferenceGroup } from "./rail-reference-paths";
import { RailSectionPlot, railPlotProjection } from "./rail-section-plot";

type FlatDomed = "flat" | "domed";

// D-20: the prototype's own "Understanding Rail Markings" example (Rails.dc.html lines 1358-1362)
// — a fixed literal input, never derived from the board the shaper is designing. The prototype's
// `halveDeckMark1` call-site flag is deliberately not passed: `computeSection`'s own parameter
// list (line 704) has no such key, so it is inert in the reference and porting it would invent
// behaviour the prototype never executed (D-20, REQUIREMENTS.md Out of Scope).
const EXAMPLE_RAIL_BOARD_THICKNESS_IN = 3.5;
const EXAMPLE_RAIL_RAIL_THICKNESS_IN = 3;
const EXAMPLE_RAIL_DOMED_BAND_BASE_IN = 6;

/** The example rail's own thickness for the given state (D-19's "stated example thickness") —
 * board thickness (3 1/2") when Flat, rail thickness (3") when Domed. Read through `formatMark`
 * wherever it is shown; never composed as a raw string. */
export function exampleRailThickness(domed: boolean): Mm {
  return inchesToMm(domed ? EXAMPLE_RAIL_RAIL_THICKNESS_IN : EXAMPLE_RAIL_BOARD_THICKNESS_IN);
}

/** Runs the example rail's geometry chain for one state (Flat when `domed` is false, Domed when
 * true) and renders it through the same `RailSectionPlot` every other rail section uses. */
export function ExampleRailFigure({ domed }: { domed: boolean }) {
  const output: RailSectionOutput = useMemo(() => {
    const thickness = exampleRailThickness(domed);
    const domedBandBase = inchesToMm(EXAMPLE_RAIL_DOMED_BAND_BASE_IN);
    const result = computeRailSection({
      thickness,
      ratioTopPercent: 60,
      family: 3,
      domedBandBase,
      scale: 1,
      cornerCutOffsetOverride: null,
      removeCornerCut: false,
      singleTuck: false,
      bottomTuck3Override: null,
      symmetrical: false,
      hardEdge: false,
    });
    const opts = {
      boardThickness: inchesToMm(EXAMPLE_RAIL_BOARD_THICKNESS_IN),
      railThicknessVal: inchesToMm(EXAMPLE_RAIL_RAIL_THICKNESS_IN),
      domedBandBase,
    };
    const profile = buildRailProfile(result, thickness, domed, opts);
    const segments = buildRailSegments(result, thickness, domed, opts);
    const bounds = railPlotBounds(result, { domed, thickness, ...opts });
    return {
      domed,
      boardThickness: opts.boardThickness,
      railThicknessClamped: opts.railThicknessVal,
      thicknessEff: thickness,
      result,
      profile,
      segments,
      bounds,
      dataGroups: [],
    };
  }, [domed]);

  // Names only, never a value (D-19) — built from this example rail's own output, in the same
  // pixel space RailSectionPlot itself draws in, then pushed apart so no two labels overlap.
  const callouts = useMemo(() => {
    const projection = railPlotProjection(output, output.bounds.xAxisMin);
    const raw = buildRailCallouts(output, output.thicknessEff, projection);
    return deOverlapCallouts(raw, RAIL_CALLOUT_MIN_GAP, projection.py(0) - RAIL_CALLOUT_AXIS_CLEARANCE);
  }, [output]);

  return (
    <RailSectionPlot sectionKey="center" output={output} xAxisMin={output.bounds.xAxisMin} fit="height" callouts={callouts} />
  );
}

/** The prototype's own heading class (byte-for-byte, matching `rail-controls.tsx`'s "Rail Band
 * Calculator" heading), reused for both INSTRUCTIONS card titles. */
const CARD_HEADING_CLASS =
  "text-lg leading-tight font-display text-surf-ink uppercase tracking-architectural font-extrabold";

export function RailInstructions() {
  // Flat is the prototype's own default (D-18).
  const [flatDomed, setFlatDomed] = useState<FlatDomed>("flat");
  const domed = flatDomed === "domed";
  const { system } = useUnits();

  // All nine legend items start ticked (D-03). Screen-only UI state: it never reaches the design
  // store, never marks a board dirty, and is never read outside this component — the printed
  // sheet (08-05) asks RailPlanSideFigure's own "every gateable group" constant for every line
  // instead of borrowing this tab's own ticked set (D-08).
  const [visibleGroups, setVisibleGroups] = useState<Set<RailReferenceGroup>>(
    () => new Set(RAIL_REFERENCE_LEGEND.map((entry) => entry.key)),
  );

  function toggleGroup(key: RailReferenceGroup) {
    setVisibleGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      {/* Fixed at the prototype's own 350px height (Rails.dc.html line 359), not a proportional
          share of the column: a percentage/flex-1 height has nothing definite to resolve against
          in a column that already overflows (card 2 alone runs 1644px), so it would collapse to
          its heading's own height and leave the example rail with no box to draw in — which is
          exactly what was happening before this fix. `flex-none` stops it shrinking back down. */}
      <div className="flex h-[350px] flex-none flex-col gap-3 rounded-lg border border-surf-line-faint p-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className={CARD_HEADING_CLASS}>Understanding Rail Markings</div>
            <TwoOptionToggle
              options={["flat", "domed"] as const}
              labels={["Flat", "Domed"] as const}
              value={flatDomed}
              onChange={setFlatDomed}
            />
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2 border-b border-surf-line-faint pb-3 text-sm text-surf-ink-muted">
            <span>Example rail with mark definitions</span>
            <span>{formatMark(exampleRailThickness(domed), system)}</span>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <ExampleRailFigure domed={domed} />
        </div>
      </div>

      <div className="flex flex-none flex-col gap-3 rounded-lg border border-surf-line-faint p-5">
        <div className={CARD_HEADING_CLASS}>Turning Marks Into Rail Bands</div>

        <div className="border-b border-surf-line-faint pb-3 text-sm text-surf-ink-muted">
          <p>Toggle on/off Markings and Bands using the check boxes.</p>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            <li>
              Use Deck Marks (solid lines) as a guide to blend the Deck Bands into the nose and tail (dashed
              lines) smoothly. The green Deck Mark 3 Center (full board) line is an example of what the band
              would look like without tapering.
            </li>
            <li>
              Use Rail Marks (solid lines) as a guide to blend the rail side of the Deck Bands toward the nose
              and tail (dashed line).
            </li>
            <li>
              The Bottom Tuck (solid line) band should blend into a hard edge around {formatTaperTuckRange(system)}{" "}
              from the tail (dashed line).
            </li>
          </ol>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {RAIL_REFERENCE_LEGEND.map((entry) => (
            <label
              key={entry.key}
              className="flex cursor-pointer items-center gap-1.5 text-sm text-surf-ink-muted"
            >
              <Checkbox checked={visibleGroups.has(entry.key)} onCheckedChange={() => toggleGroup(entry.key)} />
              <span
                className="inline-block h-[9px] w-[9px] flex-shrink-0 rounded-full"
                style={{ background: entry.color }}
              />
              {entry.label}
            </label>
          ))}
        </div>

        <RailPlanSideFigure visibleGroups={visibleGroups} />
      </div>

      <div className="flex-none rounded-lg border border-surf-line-faint p-4 text-xs text-surf-ink-muted italic">
        This rail band calculator is intended to provide a quantitative aspect to shaping consistent surfboard
        rails. It&rsquo;s recommended to understand how rail shapes affects surfboard performance, and how these
        marks can result in producing your desired outcome.
      </div>
    </div>
  );
}
