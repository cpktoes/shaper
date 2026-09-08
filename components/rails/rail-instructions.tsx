"use client";

/**
 * The rails screen's third tab (RAIL-02) — the teaching half of the screen. The DATA tab already
 * gives a shaper the rail band numbers; this tab shows what those numbers *are* on a real rail.
 *
 * `ExampleRailFigure` runs the same geometry chain every other rail section already runs
 * (`computeRailSection` -> `buildRailSegments`/`buildRailProfile`/`railPlotBounds`) against the
 * prototype's own fixed literal inputs (D-20), never `lib/geometry/rail-bands.ts` itself — that
 * module is untouched by this phase. `RailInstructions` is the tab body; for now it holds only
 * card 1 ("Understanding Rail Markings"). Later plans in this phase (08-03) add the plan/side
 * figure and the closing note as cards 2 and 3, beneath this one.
 */

import { useMemo, useState } from "react";
import { useUnits } from "@/components/units-provider";
import { formatMark } from "@/lib/geometry/measure-display";
import {
  buildRailProfile,
  buildRailSegments,
  computeRailSection,
  railPlotBounds,
  type RailSectionOutput,
} from "@/lib/geometry/rail-bands";
import { inchesToMm, type Mm } from "@/lib/geometry/units";
import { RailSectionPlot } from "./rail-section-plot";

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
function exampleRailThickness(domed: boolean): Mm {
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

  return <RailSectionPlot sectionKey="center" output={output} xAxisMin={output.bounds.xAxisMin} fit="height" />;
}

export function RailInstructions() {
  // Flat is the prototype's own default (D-18); the Flat/Domed toggle itself arrives in Task 2.
  const [domed] = useState(false);
  const { system } = useUnits();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-lg border border-surf-line-faint p-5">
        <div>
          <div className="text-lg leading-tight font-display text-surf-ink uppercase tracking-architectural font-extrabold">
            Understanding Rail Markings
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
    </div>
  );
}
