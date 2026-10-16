/**
 * Each wing's printed figures (quick 261015-sei, 2026-10-15, D1, P7, P8).
 *
 * The founder, after printing a winged swallow: "I also want to add the wing dimensions on all 3
 * export template options" — and, asked which numbers, "Same as WINGS card." So this file carries
 * the WINGS close-up card's own rule (`components/outline/wing-close-up.tsx`, the data card built
 * per wing): a head of `depth @ distance from the tail`, a RUN, a RADIUS (the radius actually drawn,
 * never the asked one) and, only for a wing locked to a fin's trailing edge, an OFFSET. The card
 * itself is left as it is (P7) — a test here pins every field against the card's own formula calls,
 * so the two can never drift apart unseen.
 *
 * Units, as on the card: a wing's POSITION is a dim (`formatDim`, centimetres to one decimal in
 * Metric); depth, run, radius and offset are marks (`formatMark` / `formatSignedMark`, whole
 * millimetres in Metric). The Overview Sheet, the Full Sized Template and the Paper Saver all print
 * these strings, computed once by the export dialog (P8), so the three can never disagree.
 *
 * Takes the wings as the board DRAWS them (`placedWings`) — it does not place them again. Lives in
 * its own file, not in `wings.ts`, because `outline.ts` imports `wings.ts` and `measure-display.ts`
 * imports `outline.ts`: formatting in `wings.ts` would be an import cycle (F8).
 *
 * Pure geometry — no React, browser or database imports (Rule 1).
 */

import { formatDim, formatMark, formatSignedMark } from "./measure-display";
import type { Mm, UnitsSystem } from "./units";
import { effectiveWingRadius, wingLockEdge, type Wing, type WingFinEdges } from "./wings";

/** One wing as a printout writes it. Every string is already in the shaper's units system. */
export interface WingFigures {
  /** 1 or 2 — the wing's number on its WINGS card. */
  number: number;
  /** True when the wing follows a fin's trailing edge (`wingLockEdge(w, i, edges) !== null`). */
  locked: boolean;
  /** Where the step leaves the curve, from the tail. */
  station: Mm;
  /** The card's head: `3/16" @ 7 1/2"` / `5 mm @ 19.1 cm`. */
  depthAtPosition: string;
  run: string;
  /** The radius actually drawn (`effectiveWingRadius`). */
  radius: string;
  /** `formatSignedMark(finOffset)` when locked, else null — an unlocked wing has no offset. */
  offset: string | null;
}

/** Each wing's printed figures, in the board's wing order (D1). */
export function wingFigures(wings: readonly Wing[], edges: WingFinEdges, system: UnitsSystem): WingFigures[] {
  return wings.map((w, i) => {
    // `· Fin` and the offset only for a lock its slot holds with its fins present (D1).
    const locked = wingLockEdge(w, i, edges) !== null;
    return {
      number: i + 1,
      locked,
      station: w.station,
      depthAtPosition: `${formatMark(w.depth, system)} @ ${formatDim(w.station, system)}`,
      run: formatMark(w.run, system),
      radius: formatMark(effectiveWingRadius(w), system),
      offset: locked ? formatSignedMark(w.finOffset, system) : null,
    };
  });
}

/** A wing's printed name (P1): `Wing 1 · Fin` for a locked wing, `Wing 2` for one placed by hand —
 * the card's name in the printouts' Title Case. */
export function wingPrintName(wing: Pick<WingFigures, "number" | "locked">): string {
  return wing.locked ? `Wing ${wing.number} · Fin` : `Wing ${wing.number}`;
}
