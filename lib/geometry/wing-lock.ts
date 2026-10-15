/**
 * A wing locked to the front fin (quick 261014-wii, 2026-10-14, D8, P2, P3).
 *
 * The founder's rule, 2026-10-14: "When marking your off-rail fin measurements on a board with
 * wings, you always mark from the true, actual rail line directly adjacent to where the fin is
 * sitting, not the hypothetical original continuous rail line. Mark your distance up from the tail
 * first to find your fore/aft positioning; from that exact horizontal line, measure inward from the
 * physical edge of the foam to set your rail gap. Fins listen to the closest piece of physical rail
 * next to them."
 *
 * So the fins are placed on the WINGED outline, exactly as Import Template places them on the drawn
 * outline (`deriveEffectiveFins` plus `importedFinTailFromOutline`), and a wing locked to the front
 * fin's trailing or leading edge sits at that edge plus the shaper's offset. The loop is real in one
 * corner only: on a narrow tail (a 12" width of 12.5" or less) the McKee front and centre fins move
 * with the 12" width, so a locked wing whose step crosses the 12" station moves its own target.
 * `resolveWingStations` settles it as a short fixed point — every locked wing, whatever the fin
 * model, capped at three passes; everywhere else it settles in one.
 *
 * The resolved station is NOT snapped to 1/16" (P3, a deliberate departure, measured F19): the
 * offset is on the grid, the fin edge is the FINS page's own number, and snapping their sum moved
 * the default board's trailing-locked step 0.023" nose-ward of the fin's trailing edge — the
 * trailing mark then sat on the step's slope and read a rail 0.0345" narrower, which breaks the
 * founder's own example (a wing AT the trailing edge leaves the trailing mark on the wider rail). A
 * snap would also have to pick a grid by unit system, which CLAUDE.md Rule 2 forbids for stored
 * data. The screen still reads the station in 1/16" (or tenths of a centimetre) through `formatDim`.
 *
 * Pure (CLAUDE.md Rule 1): geometry only, no React, browser or database.
 */

import type { OutlineSpec } from "./board";
import { deriveEffectiveFins } from "./design";
import {
  computeFinPlacement,
  importedFinTailFromOutline,
  type FinMark,
  type FinPlacementSpec,
} from "./fins";
import { buildOutline } from "./outline";
import { inchesToMm, mm, type Mm } from "./units";
import { WING_POSITION_MIN_IN, type FrontFinEdges, type Wing } from "./wings";

/** The fixed point stops once no locked wing moves by this much (1/32"). */
const SETTLED_MM = inchesToMm(1 / 32);
/** And never runs more than three passes. */
const MAX_PASSES = 3;

/** The front fin's two edges, from the tail: the first mark whose role is `"front"`, or `null` for a
 * fin setup with no front fin (a single), which cannot lock a wing. */
export function frontFinEdges(marks: readonly FinMark[]): FrontFinEdges | null {
  const front = marks.find((m) => m.role === "front");
  if (!front) return null;
  return { trailing: front.offTail, leading: front.leadingOffTail };
}

/** Where a locked wing sits: its fin edge plus its offset, kept between 2" and the board's centre.
 * Unsnapped (P3). A wing placed by hand keeps its own station. */
export function lockedWingStation(w: Wing, edges: FrontFinEdges, length: Mm): Mm {
  if (w.lock === null) return w.station;
  const edge = w.lock === "front-leading" ? edges.leading : edges.trailing;
  return mm(Math.max(inchesToMm(WING_POSITION_MIN_IN), Math.min(length / 2, edge + w.finOffset)));
}

function placeFrontFin(outline: OutlineSpec, fins: FinPlacementSpec, finsImportTemplate: boolean): FrontFinEdges | null {
  const geometry = buildOutline(outline);
  const effective = deriveEffectiveFins(fins, finsImportTemplate, outline, geometry);
  const importedTail = finsImportTemplate ? importedFinTailFromOutline(geometry) : null;
  return frontFinEdges(computeFinPlacement(effective, importedTail).marks);
}

/**
 * The outline with every locked wing placed at its fin edge plus offset (P2). Returns the SAME
 * outline object, and 0 passes, when no wing is locked or the fin setup has no front fin (a locked
 * wing then keeps its stored station — the last one it resolved to). Otherwise it places the fins on
 * the outline as it stands, moves every locked wing to its target, and repeats until the largest
 * move is under 1/32", at most three passes. The stored station is the starting guess, so a board
 * saved with its resolved stations settles in one pass; a pass that moves nothing hands back the
 * same object.
 */
export function resolveWingStations(
  outline: OutlineSpec,
  fins: FinPlacementSpec,
  finsImportTemplate: boolean,
): { outline: OutlineSpec; passes: number } {
  const wings = outline.wings;
  if (!wings || !wings.some((w) => w.lock !== null)) return { outline, passes: 0 };

  let current = outline;
  let passes = 0;
  while (passes < MAX_PASSES) {
    const edges = placeFrontFin(current, fins, finsImportTemplate);
    if (!edges) return { outline: current, passes };
    passes += 1;
    let largestMove = 0;
    const currentWings = current.wings ?? [];
    const moved = currentWings.map((w) => {
      const station = lockedWingStation(w, edges, current.length);
      largestMove = Math.max(largestMove, Math.abs(station - w.station));
      return station === w.station ? w : { ...w, station };
    });
    if (largestMove > 0) current = { ...current, wings: moved };
    if (largestMove < SETTLED_MM) break;
  }
  return { outline: current, passes };
}
