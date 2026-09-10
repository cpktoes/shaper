/**
 * Where the drag readout chip (D-17) sits while a finger shapes a point on TEMPLATE or ROCKER
 * (quick task 260909-oge — "for the tap sliders, can we make the data box that appears stay
 * OUTSIDE the outline shape?").
 *
 * This module decides where a CARD sits, never what shape a board is — it takes the board's
 * silhouette as plain numbers already computed by the viewer that's drawing it, and reads or
 * moves a card's box, nothing else. That is layout, not shaping math, which is why it lives here
 * beside `drag-selection.ts` in `components/viewer/` rather than under `lib/geometry/`
 * (CLAUDE.md's Rule 1 reserves that directory for the formulas that decide a board's own shape;
 * this module never reads a board spec and decides nothing about one — the same reasoning
 * `drag-selection.ts`'s own D-08 already recorded for the pick/drag state machine). It has no
 * React, DOM or `lib/geometry/` imports, so both viewers — and this file's own unit tests — share
 * one definition of "get this box clear of that silhouette" rather than two copies that could
 * quietly drift apart.
 *
 * Deliberately axis-neutral throughout (`alongAxis: "x" | "y"`, never `station`/`halfWidth` or
 * `station`/`height`): TEMPLATE draws its board's long axis on rendered y (vertical) and ROCKER on
 * rendered x (horizontal, the default) — and either viewer's own rotate button can flip that. One
 * rule serves both drawings and both orientations without knowing which is which.
 */

/** A box in rendered viewBox units, y down — the same space the chip's own box and the viewBox's
 * four numbers already live in. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One cross-section of the drawn board: `along` is where it sits on the board's long axis;
 * `min`/`max` are its two edges on the board's cross axis, already sorted so a caller never has
 * to know which edge is which. */
export interface BoardSection {
  readonly along: number;
  readonly min: number;
  readonly max: number;
}

/** The board's silhouette, as sampled cross-sections in rendered viewBox coordinates.
 * `alongAxis` names which rendered axis is "along the board" for THIS render — `"y"` for TEMPLATE
 * drawn vertical, `"x"` for ROCKER drawn horizontal (or TEMPLATE rotated, or ROCKER turned
 * vertical) — so the rule below can read the right numbers off `Rect` without caring which
 * viewer, or which orientation, handed it the silhouette. */
export interface BoardSilhouette {
  readonly alongAxis: "x" | "y";
  readonly sections: readonly BoardSection[];
}

/**
 * Less daylight than a quarter of the standing clearance (`idealMargin`) reads to a shaper as the
 * card touching the board, so a placement that tight is not worth taking — the rule would rather
 * leave the card where it is than offer a clearance that thin.
 */
export const MIN_CLEARANCE_FRACTION = 0.25;

/** Turns two already-mapped viewBox points — the board's two rail edges at one station — into one
 * cross-section, reading the along coordinate off the named axis and sorting the two cross values
 * so a caller never has to know which edge is which. */
export function boardSection(
  edgeA: { readonly x: number; readonly y: number },
  edgeB: { readonly x: number; readonly y: number },
  alongAxis: "x" | "y",
): BoardSection {
  const along = alongAxis === "x" ? edgeA.x : edgeA.y;
  const crossA = alongAxis === "x" ? edgeA.y : edgeA.x;
  const crossB = alongAxis === "x" ? edgeB.y : edgeB.x;
  return { along, min: Math.min(crossA, crossB), max: Math.max(crossA, crossB) };
}

/** A `Rect` read along/across the board's own axes, so the slide logic below never has to branch
 * on `alongAxis` itself — it only ever reads/writes `alongMin`/`alongMax`/`crossMin`/`crossMax`. */
interface AxisSpan {
  readonly alongMin: number;
  readonly alongMax: number;
  readonly crossMin: number;
  readonly crossMax: number;
}

function toAxisSpan(box: Rect, alongAxis: "x" | "y"): AxisSpan {
  return alongAxis === "x"
    ? { alongMin: box.x, alongMax: box.x + box.width, crossMin: box.y, crossMax: box.y + box.height }
    : { alongMin: box.y, alongMax: box.y + box.height, crossMin: box.x, crossMax: box.x + box.width };
}

function fromAxisSpan(span: AxisSpan, alongAxis: "x" | "y"): Rect {
  return alongAxis === "x"
    ? {
        x: span.alongMin,
        y: span.crossMin,
        width: span.alongMax - span.alongMin,
        height: span.crossMax - span.crossMin,
      }
    : {
        x: span.crossMin,
        y: span.alongMin,
        width: span.crossMax - span.crossMin,
        height: span.alongMax - span.alongMin,
      };
}

function axisPoint(
  point: { readonly x: number; readonly y: number },
  alongAxis: "x" | "y",
): { along: number; cross: number } {
  return alongAxis === "x" ? { along: point.x, cross: point.y } : { along: point.y, cross: point.x };
}

/** One candidate slide and the daylight it actually achieves against the board. */
interface Candidate {
  readonly span: AxisSpan;
  readonly gap: number;
}

/**
 * Pushes `box` clear of `silhouette`, never past `bounds`, following the finger.
 *
 * The rule, in order (full reasoning in the calling plan's `<behavior>` block):
 * - Read the box's span along the board and across it.
 * - Collect the sections the box could sit over — every section inside the box's own along-span
 *   widened by `idealMargin`, plus the nearest section on each side of that window, so a box
 *   straddling the gap between two samples still sees the board it straddles.
 * - No sections collected (the box is already past the nose or the tail) — return `box` unchanged.
 * - Take the widest cross-extent over the collected sections. Not overlapping the box's own
 *   cross-span — the card is already clear — return `box` unchanged.
 * - Otherwise slide across the board, trying the side the finger is nearer to first (ties go the
 *   low side), degrading to flush against `bounds` rather than being discarded, and accepting a
 *   side only if at least `idealMargin * MIN_CLEARANCE_FRACTION` of daylight survives.
 * - If neither side across the board works, try sliding along it instead, keeping the box's cross
 *   position exactly where it is — same degrade, same clearance test, nearer to the finger first.
 * - If nothing is accepted, return `box` unchanged: the card stays where it sits today rather than
 *   doing something worse.
 */
export function placeReadoutClearOfBoard(
  box: Rect,
  silhouette: BoardSilhouette,
  idealMargin: number,
  bounds: Rect,
  finger: { readonly x: number; readonly y: number },
): Rect {
  const { alongAxis } = silhouette;
  const boxSpan = toAxisSpan(box, alongAxis);
  const boundsSpan = toAxisSpan(bounds, alongAxis);
  const fingerAxis = axisPoint(finger, alongAxis);

  const sorted = [...silhouette.sections].sort((a, b) => a.along - b.along);
  const windowMin = boxSpan.alongMin - idealMargin;
  const windowMax = boxSpan.alongMax + idealMargin;

  const inWindow = sorted.filter((s) => s.along >= windowMin && s.along <= windowMax);
  const below = sorted.filter((s) => s.along < windowMin);
  const above = sorted.filter((s) => s.along > windowMax);
  const collected = [...inWindow];
  if (below.length > 0) collected.push(below[below.length - 1]);
  if (above.length > 0) collected.push(above[0]);

  if (collected.length === 0) {
    return box;
  }

  const crossMinAll = Math.min(...collected.map((s) => s.min));
  const crossMaxAll = Math.max(...collected.map((s) => s.max));

  const overlapsCross = boxSpan.crossMax > crossMinAll && boxSpan.crossMin < crossMaxAll;
  if (!overlapsCross) {
    return box;
  }

  const minClearance = idealMargin * MIN_CLEARANCE_FRACTION;
  const crossSpanWidth = boxSpan.crossMax - boxSpan.crossMin;

  function slideCrossLow(): Candidate {
    let crossMax = crossMinAll - idealMargin;
    let crossMin = crossMax - crossSpanWidth;
    if (crossMin < boundsSpan.crossMin) {
      crossMin = boundsSpan.crossMin;
      crossMax = crossMin + crossSpanWidth;
    }
    return { span: { ...boxSpan, crossMin, crossMax }, gap: crossMinAll - crossMax };
  }

  function slideCrossHigh(): Candidate {
    let crossMin = crossMaxAll + idealMargin;
    let crossMax = crossMin + crossSpanWidth;
    if (crossMax > boundsSpan.crossMax) {
      crossMax = boundsSpan.crossMax;
      crossMin = crossMax - crossSpanWidth;
    }
    return { span: { ...boxSpan, crossMin, crossMax }, gap: crossMin - crossMaxAll };
  }

  const distToLow = Math.abs(fingerAxis.cross - crossMinAll);
  const distToHigh = Math.abs(fingerAxis.cross - crossMaxAll);
  const crossOrder = distToLow <= distToHigh ? [slideCrossLow, slideCrossHigh] : [slideCrossHigh, slideCrossLow];

  for (const slide of crossOrder) {
    const candidate = slide();
    if (candidate.gap >= minClearance) {
      return fromAxisSpan(candidate.span, alongAxis);
    }
  }

  // Neither side across the board held. Keep the cross coordinate exactly where it is and try
  // sliding along the board instead — past the nearer end of the sections this box actually spans.
  const alongSpanWidth = boxSpan.alongMax - boxSpan.alongMin;
  const alongLow = Math.min(...collected.map((s) => s.along));
  const alongHigh = Math.max(...collected.map((s) => s.along));

  function slideAlongBefore(): Candidate {
    let alongMax = alongLow - idealMargin;
    let alongMin = alongMax - alongSpanWidth;
    if (alongMin < boundsSpan.alongMin) {
      alongMin = boundsSpan.alongMin;
      alongMax = alongMin + alongSpanWidth;
    }
    return { span: { ...boxSpan, alongMin, alongMax }, gap: alongLow - alongMax };
  }

  function slideAlongAfter(): Candidate {
    let alongMin = alongHigh + idealMargin;
    let alongMax = alongMin + alongSpanWidth;
    if (alongMax > boundsSpan.alongMax) {
      alongMax = boundsSpan.alongMax;
      alongMin = alongMax - alongSpanWidth;
    }
    return { span: { ...boxSpan, alongMin, alongMax }, gap: alongMin - alongHigh };
  }

  const distToBefore = Math.abs(fingerAxis.along - alongLow);
  const distToAfter = Math.abs(fingerAxis.along - alongHigh);
  const alongOrder =
    distToBefore <= distToAfter ? [slideAlongBefore, slideAlongAfter] : [slideAlongAfter, slideAlongBefore];

  for (const slide of alongOrder) {
    const candidate = slide();
    if (candidate.gap >= minClearance) {
      return fromAxisSpan(candidate.span, alongAxis);
    }
  }

  return box;
}
