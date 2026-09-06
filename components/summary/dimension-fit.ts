/**
 * The order form's dimension-cell step-down rule (D-09).
 *
 * The seven dimension cells (`DimensionCell` in `order-form.tsx`) used to truncate an overrunning
 * value with CSS `text-overflow: ellipsis`. A shaper cuts foam to these numbers, so an ellipsis
 * that silently drops a digit is a correctness bug, not a cosmetic one (threat T-07-09). This
 * module replaces truncation with a step-down: a value that would overrun its cell at the sheet's
 * normal dimension type size prints one size down instead, and a value long enough to overrun
 * that steps down once more — never below the sheet's own 12px print-legibility floor.
 *
 * A pure function of the string's own length, deliberately: this module has no React, no browser
 * API and no units-system parameter (CLAUDE.md Rule 1), so it is testable under a runner that only
 * collects `.test.ts` files and — just as importantly — so the units system a value happened to be
 * formatted in can never leak into which class it receives. A metric string and an imperial string
 * of the same length must fit identically, because they sit in the identical CSS box.
 *
 * The three thresholds below are derived from the app's own board-dimension ranges
 * (`BOARD_LENGTH_RANGE_IN`, `WIDEPOINT_WIDTH_RANGE_IN` in `lib/geometry/board.ts`) and the rail
 * band thickness bounds (`components/rails/rail-controls.tsx`'s `NT_THICKNESS_BOUNDS`/
 * `CENTER_THICKNESS_BOUNDS`), run through the display boundary's own formatters
 * (`lib/geometry/measure-display.ts`) across every sixteenth of an inch in range — never
 * hand-typed. `dimension-fit.test.ts` is where that derivation lives and is re-run on every
 * change; the character-length ceilings recorded here are its answer:
 *
 * - Every Metric dimension-cell string this app can produce is 8 characters or fewer
 *   (`"304.8 cm"`, the longest board at its own length range's maximum) — the base size.
 * - The longest Imperial Nose/Widepoint/Tail/Offset strings run 9-10 characters
 *   (`"24 15/16""`, `"-11 15/16""`) — the first step down.
 * - The longest string of all is the Length cell in Imperial, at 11 characters
 *   (`"5'10 11/16""`) — the second step down.
 *
 * The CSS classes these names select are declared in `app/design/summary/order-form.css`, each
 * derived from `--order-form-dim` and each floored with the same `clamp()` minimum the rest of the
 * sheet's type scale uses.
 */

/** One step of the fit rule: every string of `maxLength` characters or fewer that has not already
 * matched an earlier (smaller) step in `DIMENSION_FIT_STEPS` receives `className`. `minPx` mirrors
 * that class's own `clamp()` floor in `order-form.css`, recorded here so a test can pin the
 * legibility guarantee without reading CSS (there is no DOM in this vitest config). */
export interface DimensionFitStep {
  maxLength: number;
  className: string;
  minPx: number;
}

/**
 * Ordered smallest-overrun-first. `dimensionValueFitClass` returns the first step whose
 * `maxLength` the value's length does not exceed, so a string exactly at a step's ceiling gets
 * that step's class rather than stepping down further (D-09's "adjacency" edge case).
 */
export const DIMENSION_FIT_STEPS: readonly DimensionFitStep[] = [
  { maxLength: 8, className: "order-form-dim", minPx: 14 },
  { maxLength: 10, className: "order-form-dim-step-1", minPx: 12 },
  { maxLength: Infinity, className: "order-form-dim-step-2", minPx: 12 },
];

/**
 * Which CSS class a dimension cell's value should print at, decided from the string alone. Never
 * receives, and must never need, the units system — the same string prints at the same size
 * regardless of which system produced it, because it sits in the identical CSS box either way.
 */
export function dimensionValueFitClass(value: string): string {
  // DIMENSION_FIT_STEPS's last entry has an Infinity ceiling, so this always finds a match — the
  // non-null assertion documents that guarantee rather than working around a real gap.
  const step = DIMENSION_FIT_STEPS.find((candidate) => value.length <= candidate.maxLength)!;
  return step.className;
}
