"use client";

/**
 * The order form's third sheet (PRNT-05, D-08, D-09, D-01) — a reference page at the back of the
 * print stack. It always shows the Flat example rail with its own stated thickness (D-08 stands
 * for the example rail), but the plan/side figure now draws only the legend lines the shaper left
 * ticked — on either screen, since RAILS → INSTRUCTIONS and the Summary's own mirrored ticks are
 * one shared set (D-01 overturns the legend half of the old "always every line" rule; the Flat
 * example rail half still stands). So two prints of the same board can differ if the shaper
 * changed his mind about which lines he wants to see. This component still holds no state of its
 * own to drift — it reads the one shared set through `useRailLegend()` rather than keeping a
 * second copy that could disagree with the screen.
 *
 * Rendered by `order-form.tsx` inside a third `<Sheet variant="instructions">`, conditional on
 * `usePrintRailInstructions()`, with the sheet's own `<PageMark>` — this component supplies only
 * the sheet's body: its own heading, the example rail, and the plan/side figure.
 */

import { useUnits } from "@/components/units-provider";
import { ExampleRailFigure, exampleRailThickness } from "@/components/rails/rail-instructions";
import { useRailLegend } from "@/components/rails/rail-legend-provider";
import { RailPlanSideFigure } from "@/components/rails/rail-plan-side-figure";
import { formatMark } from "@/lib/geometry/measure-display";

// D-08: the sheet is always the Flat rail, so its own stated example thickness (D-19) reads
// through the same pure `exampleRailThickness(false)` the drawing below is built from — the
// caption and the drawing now come from one number, so they can never drift apart.

export function RailInstructionsSheet() {
  const { system } = useUnits();
  const { visibleGroups } = useRailLegend();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div>
        <div className="font-display text-lg font-extrabold tracking-architectural text-surf-ink uppercase">
          Rail Band Instructions
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2 text-sm text-surf-ink-muted">
          <span>Example rail with mark definitions</span>
          <span>{formatMark(exampleRailThickness(false), system)}</span>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {/* Hard-set to false (D-08) — never the tab's own Flat/Domed toggle state, so ticking the
            box always prints the same rail regardless of what was last selected on screen. */}
        <ExampleRailFigure domed={false} />
      </div>
      {/* The shaper's own chosen lines (D-01) — shared with the RAILS tab's INSTRUCTIONS ticks and
          the Summary's own mirrored ticks below the print buttons, never a hard-coded "every line". */}
      <RailPlanSideFigure visibleGroups={visibleGroups} />
    </div>
  );
}
