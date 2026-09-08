"use client";

/**
 * The order form's third sheet (PRNT-05, D-08, D-09) — a fixed reference page at the back of the
 * print stack. It always shows the Flat example rail with every mark named and the plan/side
 * figure with every legend line drawn, whatever the INSTRUCTIONS tab's own Flat/Domed switch and
 * legend ticks are set to on screen: two prints of the same board are the same sheet. This
 * component takes no props that vary its content and holds no state of its own to reflect — it
 * composes the exact same pieces the INSTRUCTIONS tab renders (`ExampleRailFigure`,
 * `RailPlanSideFigure`) so the printed sheet can never drift from the screen that explains it.
 *
 * Rendered by `order-form.tsx` inside a third `<Sheet variant="instructions">`, conditional on
 * `usePrintRailInstructions()`, with the sheet's own `<PageMark>` — this component supplies only
 * the sheet's body: its own heading, the example rail, and the plan/side figure.
 */

import { useUnits } from "@/components/units-provider";
import { ExampleRailFigure, exampleRailThickness } from "@/components/rails/rail-instructions";
import {
  ALL_RAIL_REFERENCE_GROUPS,
  RailPlanSideFigure,
} from "@/components/rails/rail-plan-side-figure";
import { formatMark } from "@/lib/geometry/measure-display";

// D-08: the sheet is always the Flat rail, so its own stated example thickness (D-19) reads
// through the same pure `exampleRailThickness(false)` the drawing below is built from — the
// caption and the drawing now come from one number, so they can never drift apart.

export function RailInstructionsSheet() {
  const { system } = useUnits();

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
      {/* Every gateable group, always (D-08) — never the tab's own legend tick state. */}
      <RailPlanSideFigure visibleGroups={ALL_RAIL_REFERENCE_GROUPS} />
    </div>
  );
}
