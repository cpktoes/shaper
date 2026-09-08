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
import { ExampleRailFigure } from "@/components/rails/rail-instructions";
import {
  ALL_RAIL_REFERENCE_GROUPS,
  RailPlanSideFigure,
} from "@/components/rails/rail-plan-side-figure";
import { formatMark } from "@/lib/geometry/measure-display";
import { inchesToMm } from "@/lib/geometry/units";

// D-08: the sheet is always the Flat rail, so its own stated example thickness (D-19) is always
// the board's own 3 1/2" — the same literal `rail-instructions.tsx`'s own
// EXAMPLE_RAIL_BOARD_THICKNESS_IN encodes for the Flat case. Duplicated here deliberately rather
// than imported: this component's own contract (rail-instructions-sheet.test.ts) is that it never
// reaches back into rail-instructions.tsx for anything beyond ExampleRailFigure itself — the sheet
// is fixed and self-contained, not a mirror of the tab's own state.
const EXAMPLE_RAIL_FLAT_THICKNESS_IN = 3.5;

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
          <span>{formatMark(inchesToMm(EXAMPLE_RAIL_FLAT_THICKNESS_IN), system)}</span>
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
