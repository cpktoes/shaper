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

import { ExampleRailFigure } from "@/components/rails/rail-instructions";
import {
  ALL_RAIL_REFERENCE_GROUPS,
  RailPlanSideFigure,
} from "@/components/rails/rail-plan-side-figure";

export function RailInstructionsSheet() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="font-display text-lg font-extrabold tracking-architectural text-surf-ink uppercase">
        Rail Band Instructions
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
