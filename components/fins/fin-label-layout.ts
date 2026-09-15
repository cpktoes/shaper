import { CALLOUT_CHAR_PX, CALLOUT_PX } from "@/components/viewer/callout-primitives";

/**
 * Keeps two off-tail fin-height numbers on the fin drawing from printing on top of each other.
 *
 * Diagram layout, not board geometry — deliberately lives under `components/`, not
 * `lib/geometry/`, which CLAUDE.md Rule 1 reserves for pure geometry math (outline, rocker, rail
 * band, foil, fin placement, volume). This module never computes a fin's position on the board;
 * it only decides where a label that ALREADY has a position should draw its baseline so it stays
 * legible. Same reasoning `callout-primitives.tsx`'s own header gives for living outside
 * `lib/geometry/`.
 *
 * WHY THIS IS DRIVEN BY THE LABEL'S OWN SIZE, NOT THE SCREEN. `fin-viewer.tsx` staggers the three
 * off-tail heights sideways by tier and nudges them only 10 drawing units vertically — enough
 * while the callout text is small, and not enough once the drawing renders small and the pinned
 * 14 CSS px callout face grows to 20-33 drawing units. The nudge here is decided purely by each
 * label's own text and font size in the drawing's own units — never by how wide the screen is,
 * whether the pointer is a finger, or how short the viewport is. Those three questions belong to the
 * width/pointer/height switches CLAUDE.md keeps strictly apart, and none of them answers "is this
 * number wide enough, in the drawing's own units, to run into that one?" A phone held sideways
 * lands in the desktop shell and still needs this fix, because the drawing is short there and the
 * type is still large — a media query would miss exactly that case.
 */

/**
 * Estimated viewBox width of one character at the fin drawing's pinned callout face, in ems
 * (fractions of the font size). Derived from the shared `CALLOUT_CHAR_PX` / `CALLOUT_PX.name`
 * calibration (`components/viewer/callout-primitives.tsx`) rather than written as a literal, so
 * it tracks that shared calibration if it is ever retuned. Comfortably over the 0.45-0.56 em/char
 * measured for every imperial fraction string on this drawing, so the estimate is always over-wide
 * (never under-wide) for those strings. The metric millimetre form (`"159 mm"`) runs close to this
 * estimate rather than safely under it, which is why the browser test
 * (`e2e/phone-fins-labels.spec.ts`) measures the real ink for the metric case instead of trusting
 * this number.
 */
export const FIN_LABEL_CHAR_EM = CALLOUT_CHAR_PX / CALLOUT_PX.name;

/**
 * Minimum distance between two interacting labels' baselines, in ems. Measured on Inter bold (the
 * app's face): ink runs 0.76 em above the baseline and 0.11 em below it for any string carrying a
 * quote mark or a fraction. At this clearance, two adjacent labels leave
 * `1.05 - 0.76 - 0.11 = 0.18` em of visible air between their ink. Because the callout face is
 * pinned at 14 CSS px on every device (`CALLOUT_PX.value`), that air is always
 * `0.18 * 14 = 2.52` CSS px on screen, however small the drawing renders.
 */
export const FIN_LABEL_CLEARANCE_EM = 1.05;

/**
 * How far above its own dimension line's top a label's baseline may rise, in ems, so its ink
 * stays below the fin it describes rather than climbing into the fin mark above it.
 */
export const FIN_LABEL_INK_TOP_EM = 0.8;

/**
 * How far below its own dimension line's bottom a label's baseline may drop, in ems. Leaves room
 * for the measured 0.11 em ink descender so it stays above the tail line at the foot of the
 * drawing rather than printing through it.
 */
export const FIN_LABEL_INK_BOTTOM_EM = 0.15;

/** One off-tail height label as the fin drawing has already positioned it. */
export interface FinLabelBox {
  /** The label's right edge in drawing (viewBox) units — these labels are all `text-anchor="end"`. */
  x: number;
  /** The label's baseline as the drawing already computed it, before this rule runs. */
  y: number;
  /** The label's text, used only to estimate its width. */
  text: string;
  /** The top of this label's own dimension line. */
  lineTop: number;
  /** The bottom of this label's own dimension line (the tail line, for every off-tail label). */
  lineBottom: number;
}

/** Estimated width of `text` set at `fontSize` drawing units, in drawing units. */
export function estimateFinLabelWidth(text: string, fontSize: number): number {
  return text.length * FIN_LABEL_CHAR_EM * fontSize;
}

interface ResolvedLabel {
  x: number;
  y: number;
  width: number;
  lowerBound: number; // baseline may not go below this (near the tail)
  upperBound: number; // baseline may not go above this (near the fin)
}

/** Do two labels' estimated horizontal spans (`[x - width, x]`, anchor="end") overlap at all? */
function xRangesOverlap(a: ResolvedLabel, b: ResolvedLabel): boolean {
  const aLeft = a.x - a.width;
  const bLeft = b.x - b.width;
  return aLeft <= b.x && bLeft <= a.x;
}

/**
 * Nudges a set of off-tail height labels' baselines apart along their own dimension lines, only
 * when two of them would otherwise actually collide, and never further than their own line
 * permits.
 *
 * `labels` must already be in the order they should read down the page (front, then rear, then
 * centre, or whatever a caller's own rank produces) — this function does not sort them.
 *
 * The rule:
 * 1. Two labels interact only if their estimated x-ranges overlap. Non-overlapping labels are
 *    never moved and no order is forced between them — this predicate is load-bearing, because a
 *    plain monotone sweep with no gate would move the desktop labels too and break the screenshot
 *    baselines.
 * 2. Each label's bounds are `lineTop + FIN_LABEL_INK_TOP_EM * fontSize` (lower bound on the
 *    baseline, near the fin) and `lineBottom - FIN_LABEL_INK_BOTTOM_EM * fontSize` (upper bound,
 *    near the tail). A bound already violated by the label's own untouched baseline is relaxed to
 *    that untouched baseline, so the rule can never move a label to a WORSE position than where it
 *    started.
 * 3. Forward pass (in the given order): push each label down only as far as its interacting
 *    predecessors demand, clamped to its upper bound.
 * 4. Backward pass (in reverse): push each label up only as far as its interacting successors
 *    still demand, clamped to its lower bound.
 * 5. Bounds always win over clearance — if a clamp stops a label short of full clearance, it stops
 *    there rather than being pushed off the end of its own dimension line.
 *
 * Idempotent: feeding the rule its own answer returns that answer unchanged.
 */
export function layoutFinLabelBaselines(labels: FinLabelBox[], fontSize: number): number[] {
  const resolved: ResolvedLabel[] = labels.map((label) => {
    const width = estimateFinLabelWidth(label.text, fontSize);
    const rawLowerBound = label.lineTop + FIN_LABEL_INK_TOP_EM * fontSize; // near the fin
    const rawUpperBound = label.lineBottom - FIN_LABEL_INK_BOTTOM_EM * fontSize; // near the tail
    // Relax any bound the untouched baseline already violates, so the rule never makes a label
    // worse off than it started.
    const lowerBound = Math.min(rawLowerBound, label.y);
    const upperBound = Math.max(rawUpperBound, label.y);
    return { x: label.x, y: label.y, width, lowerBound, upperBound };
  });

  const clearance = FIN_LABEL_CLEARANCE_EM * fontSize;

  // Forward pass: push each label down as far as its interacting predecessors demand.
  for (let i = 1; i < resolved.length; i++) {
    const current = resolved[i]!;
    let minY = current.y;
    for (let j = 0; j < i; j++) {
      const predecessor = resolved[j]!;
      if (!xRangesOverlap(current, predecessor)) continue;
      minY = Math.max(minY, predecessor.y + clearance);
    }
    current.y = Math.min(Math.max(current.y, minY), current.upperBound);
  }

  // Backward pass: push each label up as far as its interacting successors still demand.
  for (let i = resolved.length - 2; i >= 0; i--) {
    const current = resolved[i]!;
    let maxY = current.y;
    for (let j = i + 1; j < resolved.length; j++) {
      const successor = resolved[j]!;
      if (!xRangesOverlap(current, successor)) continue;
      maxY = Math.min(maxY, successor.y - clearance);
    }
    current.y = Math.max(Math.min(current.y, maxY), current.lowerBound);
  }

  return resolved.map((r) => r.y);
}
