/**
 * A wing locked to the fins (quick 261014-wii, 2026-10-14, D8, P2, P3; the slot locks, quick
 * 261015-hz7, 2026-10-15, D1–D4).
 *
 * The founder's rule, 2026-10-14: "When marking your off-rail fin measurements on a board with
 * wings, you always mark from the true, actual rail line directly adjacent to where the fin is
 * sitting, not the hypothetical original continuous rail line. Mark your distance up from the tail
 * first to find your fore/aft positioning; from that exact horizontal line, measure inward from the
 * physical edge of the foam to set your rail gap. Fins listen to the closest piece of physical rail
 * next to them."
 *
 * So the fins are placed on the WINGED outline, exactly as Import Template places them on the drawn
 * outline (`deriveEffectiveFins` plus `importedFinTailFromOutline`). Each wing locks in its own slot
 * only (the founder, 2026-10-15): "Only wing 1 gets lock to front fins option." "Wing 2 can lock to
 * rear if it's a quad setup, otherwise no lock." "Fin edge should always be to trailing edge for the
 * lock, so we can get rid of that selector." Wing 1 follows the front fins' trailing edge, wing 2 a
 * quad's rear fins' trailing edge (the marks whose role is `"rear"` — no other setup has one), each
 * plus the shaper's offset. A lock the fin setup cannot honour (a rear lock left on a thruster, a
 * front lock on a single) is inert: the wing keeps its stored station, exactly as one placed by hand.
 *
 * The loop is real in one corner only: on a narrow tail (a 12" width of 12.5" or less) the McKee
 * front and centre fins move with the 12" width, and a quad's rear spread follows the winged 12"
 * width, so a locked wing whose step crosses the 12" station moves its own target.
 * `resolveWingStations` settles it as a short fixed point — capped at three passes; everywhere else
 * it settles in one. After the locks move, each pass keeps every wing under the top and wing 2 behind
 * wing 1 (`clampWingStations`, D2, D3), so a locked wing 2 is held at the limit when its own target
 * breaks the order rule, and springs back once there is room.
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
import {
  WING_POSITION_MIN_IN,
  clampWingStations,
  outlineWithoutWings,
  wingLockEdge,
  wingLockFitsSlot,
  wingPositionTop,
  type Wing,
  type WingFinEdges,
  type WingPlacementGeometry,
} from "./wings";

/** The fixed point stops once no wing moves by this much (1/32"). */
const SETTLED_MM = inchesToMm(1 / 32);
/** And never runs more than three passes. */
const MAX_PASSES = 3;

/** The trailing edges a wing can lock to, from the tail (D1): the first mark whose role is
 * `"front"`, and the first whose role is `"rear"` (a quad's rear fins), each `null` when the fin
 * setup has none. */
export function wingFinEdges(marks: readonly FinMark[]): WingFinEdges {
  const front = marks.find((m) => m.role === "front");
  const rear = marks.find((m) => m.role === "rear");
  return { front: front ? front.offTail : null, rear: rear ? rear.offTail : null };
}

/** Where a wing sits by its lock: its slot's trailing edge plus its offset, kept between 2" and the
 * top (D3). Unsnapped (P3). A wing placed by hand, a lock its slot may not hold, or a lock with no
 * such fin keeps its own station. */
export function lockedWingStation(w: Wing, index: number, edges: WingFinEdges, g: WingPlacementGeometry): Mm {
  const edge = wingLockEdge(w, index, edges);
  if (edge === null) return w.station;
  return mm(Math.max(inchesToMm(WING_POSITION_MIN_IN), Math.min(wingPositionTop(g), edge + w.finOffset)));
}

function placeFins(outline: OutlineSpec, fins: FinPlacementSpec, finsImportTemplate: boolean): WingFinEdges {
  const geometry = buildOutline(outline);
  const effective = deriveEffectiveFins(fins, finsImportTemplate, outline, geometry);
  const importedTail = finsImportTemplate ? importedFinTailFromOutline(geometry) : null;
  return wingFinEdges(computeFinPlacement(effective, importedTail).marks);
}

/** The outline with its wings set to `wings`, or the same outline when the list did not change. */
function withWings(outline: OutlineSpec, before: readonly Wing[], after: readonly Wing[]): OutlineSpec {
  return after === before ? outline : { ...outline, wings: [...after] };
}

/**
 * The outline with every locked wing placed at its slot's trailing edge plus offset (P2, D1), then
 * every wing kept under the top and wing 2 behind wing 1 (D2, D3). Returns the SAME outline object,
 * and 0 passes, when there are no wings, or no lock the slot and the fins can honour and nothing
 * needs moving; with no honourable lock it only applies the clamp (still 0 passes). Otherwise each
 * pass places the fins on the outline as it stands, moves every locked wing to its target, applies
 * the clamp, and repeats until the largest move is under 1/32", at most three passes. The stored
 * station is the starting guess, so a board saved with its resolved stations settles in one pass; a
 * pass that moves nothing hands back the same object.
 */
export function resolveWingStations(
  outline: OutlineSpec,
  fins: FinPlacementSpec,
  finsImportTemplate: boolean,
): { outline: OutlineSpec; passes: number } {
  const wings = outline.wings;
  if (!wings || wings.length === 0) return { outline, passes: 0 };

  // The top reads the length and the widepoint only, the same with or without wings.
  const g = buildOutline(outlineWithoutWings(outline));
  const clampOnly = (o: OutlineSpec) => {
    const ws = o.wings ?? [];
    return withWings(o, ws, clampWingStations(ws, g));
  };
  if (!wings.some((w, i) => w.lock !== null && wingLockFitsSlot(i, w.lock))) {
    return { outline: clampOnly(outline), passes: 0 };
  }

  let current = outline;
  let passes = 0;
  while (passes < MAX_PASSES) {
    const edges = placeFins(current, fins, finsImportTemplate);
    const currentWings = current.wings ?? [];
    if (!currentWings.some((w, i) => wingLockEdge(w, i, edges) !== null)) {
      // No fin to follow (a front lock on a single, a rear lock on a thruster): placed by hand.
      return { outline: clampOnly(current), passes };
    }
    passes += 1;
    const moved = currentWings.map((w, i) => {
      const station = lockedWingStation(w, i, edges, g);
      return station === w.station ? w : { ...w, station };
    });
    const clamped = clampWingStations(moved, g);
    let largestMove = 0;
    clamped.forEach((w, i) => {
      largestMove = Math.max(largestMove, Math.abs(w.station - currentWings[i].station));
    });
    if (largestMove > 0) current = { ...current, wings: [...clamped] };
    if (largestMove < SETTLED_MM) break;
  }
  return { outline: current, passes };
}
