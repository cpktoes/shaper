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
 *
 * **The two drawings share the sheet's height (quick 260910-kz2, PRNT-05).** On a small enough
 * page the heading, the example rail and the plan/side figure together no longer all fit at their
 * natural size. Before this, the figure had no way to shrink in height at all — it is width-driven
 * only — so it stayed pinned at its own cap while the example rail's own `min-h-0` band gave up
 * every pixel of the shortfall, all the way to zero: the sheet quietly clipped itself with no
 * second page and no warning, and the one drawing whose entire job is naming every mark on the page
 * was the one drawing that vanished. Now the heading stays fixed, and the two drawings sit in their
 * own column below it (load-bearing: a percentage height resolves against its flex CONTAINER, so
 * without this wrapper `FIGURE_MAX_BODY_SHARE_PERCENT%` would mean "of the whole sheet body,
 * heading included", and the heading's own fixed height would push the example rail negative on a
 * page about 150 dots wider than the real floor). Inside that column the figure is capped at
 * `min(FIGURE_MAX_CARD_HEIGHT_PX px, FIGURE_MAX_BODY_SHARE_PERCENT%)` and asked for at
 * `fit="height"`, and the example rail keeps exactly the flexible, centred band it always had — so
 * above about 536 dots of page area the pixel cap wins and nothing moves from today, and below it
 * the two drawings shrink together instead of one of them being the designated victim. Measured at
 * plan time (`260910-kz2-PLAN.md`), the sheet's heading and page mark alone need about 268 dots of
 * page area to fit — narrower than any paper a printer actually takes — so this is recorded as the
 * fix's honest floor, not silently overlooked.
 */

import { useUnits } from "@/components/units-provider";
import { ExampleRailFigure, exampleRailThickness } from "@/components/rails/rail-instructions";
import { useRailLegend } from "@/components/rails/rail-legend-provider";
import { FIGURE_MAX_CARD_HEIGHT_PX, RailPlanSideFigure } from "@/components/rails/rail-plan-side-figure";
import { formatMark } from "@/lib/geometry/measure-display";

// D-08: the sheet is always the Flat rail, so its own stated example thickness (D-19) reads
// through the same pure `exampleRailThickness(false)` the drawing below is built from — the
// caption and the drawing now come from one number, so they can never drift apart.

// The figure may take at most this share of the height the two drawings share below the heading;
// the example rail keeps the rest (quick 260910-kz2). Chosen by measurement, not taste: the cap
// first has any effect at a page area of about 536 dots, which is 24 dots clear of 560 — the
// narrowest page either `e2e/summary-print-touch-box.spec.ts` or `e2e/summary-rail-key.spec.ts`
// measures — so every page that prints correctly today prints identically after this. A larger
// share would eat that margin; a smaller one would start changing pages that already print fine.
const FIGURE_MAX_BODY_SHARE_PERCENT = 85;

export function RailInstructionsSheet() {
  const { system } = useUnits();
  const { visibleGroups } = useRailLegend();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex-none">
        <div className="font-display text-lg font-extrabold tracking-architectural text-surf-ink uppercase">
          Rail Band Instructions
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2 text-sm text-surf-ink-muted">
          <span>Example rail with mark definitions</span>
          <span>{formatMark(exampleRailThickness(false), system)}</span>
        </div>
      </div>
      {/* The two drawings' own shared column (quick 260910-kz2) — see this file's head comment for
          why this wrapper is load-bearing rather than tidiness. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex min-h-0 flex-1 items-center justify-center">
          {/* Hard-set to false (D-08) — never the tab's own Flat/Domed toggle state, so ticking
              the box always prints the same rail regardless of what was last selected on screen. */}
          <ExampleRailFigure domed={false} />
        </div>
        <div
          className="flex min-h-0 w-full items-center justify-center"
          style={{ height: `min(${FIGURE_MAX_CARD_HEIGHT_PX}px, ${FIGURE_MAX_BODY_SHARE_PERCENT}%)` }}
        >
          {/* The shaper's own chosen lines (D-01) — shared with the RAILS tab's INSTRUCTIONS ticks
              and the Summary's own mirrored ticks below the print buttons, never a hard-coded
              "every line". Also NAMES them: `showLineKey` is asked for here and only here (quick
              260910-jfp) — the RAILS tab shows the same nine names as ticks already, so it does not
              repeat them. `fit="height"` (quick 260910-kz2) is what lets this box's own height,
              rather than only its width, decide the drawing's size. */}
          <RailPlanSideFigure visibleGroups={visibleGroups} showLineKey fit="height" />
        </div>
      </div>
    </div>
  );
}
