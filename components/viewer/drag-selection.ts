/**
 * Picking and dragging a control point with a thumb (260909-ktq), shared between the outline and
 * rocker viewers.
 *
 * A shaper's thumb has three things it can do to a control point on the board:
 * - **Tap it** — that picks it. It lights up and stays picked when the thumb lifts.
 * - **Slide it** — either straight off the point itself (a direct drag, exactly as dragging has
 *   always worked), or, once a point is picked, from anywhere else on the drawing at all — the
 *   picked point follows the thumb's own travel, one for one, even from the far edge of the panel.
 * - **Tap empty space** — that lets the picked point go, with the ring switched off. A touch on
 *   empty space with nothing picked does nothing at all, exactly as it always has.
 *
 * This module decides none of that by looking at a board spec — it only tracks what a tap or a
 * lift MEANS for the pick, and works out how far a remotely-dragged point should move. That is
 * interaction state, not shaping math, which is why it lives here and not under `lib/geometry/`
 * (CLAUDE.md's Rule 1 reserves that directory for the formulas that decide the SHAPE of a board;
 * this module never reads a board spec and decides nothing about one). It has no React, DOM, or
 * `lib/geometry/` imports, so both viewers — and their unit tests — can share one definition of
 * "what a tap means" rather than two copies that could quietly drift apart.
 */

/** How far a tap-versus-drag threshold is measured — the finger's own distance travelled, in CSS
 * pixels, from touch-down to lift. Below this a gesture is a tap; at or above it, a drag. */
export const TAP_MAX_TRAVEL_PX = 8;

/**
 * A point in a drawing's own two board axes — millimetres, not screen pixels. `x` is the same axis
 * in both viewers, along the board (station); `y` is the drawing's own second axis — out from the
 * centreline for the outline, up off the baseline for the rocker. Deliberately axis-neutral (never
 * `station`/`halfWidth` or `station`/`height`) so this one type, and `remoteDragPoint` below, serve
 * both drawings without either viewer's own branded `Mm` type leaking in here.
 */
export interface DragPointXY {
  readonly x: number;
  readonly y: number;
}

/**
 * Where a remotely-dragged point should be, given how far the finger has travelled since
 * touch-down.
 *
 * The caller MUST pass `pointStart` as the picked point's position AT TOUCH-DOWN, never its live
 * (already-moved) position. The two board-drag solvers this feeds
 * (`solveOutlineDrag`/`solveSideProfileDrag`) quantise their answer to the target's own slider
 * step, so the point this function returns rarely lands exactly on the value that was asked for —
 * re-reading the point's live position on every move and adding the next small delta to THAT would
 * compound that rounding across the whole gesture, drifting the point away from a true 1:1 follow.
 * Reading the fixed touch-down position every time and adding the FULL travel since then keeps the
 * whole gesture's rounding error bounded to at most one slider step, no matter how long it runs.
 */
export function remoteDragPoint(
  pointStart: DragPointXY,
  fingerStart: DragPointXY,
  fingerNow: DragPointXY,
): DragPointXY {
  return {
    x: pointStart.x + (fingerNow.x - fingerStart.x),
    y: pointStart.y + (fingerNow.y - fingerStart.y),
  };
}

/** Whether a gesture is shaping the picked point directly (thumb on the point itself, today's
 * unchanged behaviour) or remotely (thumb elsewhere on the drawing, moving the picked point by its
 * own travel), or whether nothing is currently being dragged. */
export type DragMode = "idle" | "direct" | "remote";

/** Which point (if any) is picked, and what the current gesture — if one is live — is doing with
 * it. Generic over the target's own name type so one state machine serves every drawing's own set
 * of grabbable points (`OutlineDragTarget`, `SideProfileDragTarget`, …) without a second copy. */
export interface DragSelection<T extends string> {
  readonly selected: T | null;
  readonly mode: DragMode;
}

/** The three things a touch gesture can tell the pick state machine. */
export type DragSelectionEvent<T extends string> =
  | { readonly type: "touchDown"; readonly hit: T | null }
  | { readonly type: "touchUp"; readonly travelPx: number }
  | { readonly type: "cancel" };

/**
 * The pick/drag rules (D-02 through D-05, D-09), as one total transition function: every
 * combination of state and event returns a state, and nothing here ever mutates its arguments.
 *
 * - `touchDown` with a hit: that point is picked immediately, and the gesture starts as a direct
 *   drag — even if a different point was already picked (D-02, D-04: the newly touched point wins).
 * - `touchDown` with no hit (empty canvas): if a point is already picked, the gesture starts as a
 *   remote drag on it (D-03); if nothing is picked, nothing happens (D-05).
 * - `touchUp`: only a REMOTE gesture can be a tap. If its travel is at or under
 *   `TAP_MAX_TRAVEL_PX`, it was a tap on empty space and the pick is released (D-05); above the
 *   threshold, or for a direct gesture at any travel, the point stays picked (D-02's "drag it
 *   directly once, then refine from the edge" rhythm).
 * - `cancel`: a cancelled gesture never changes the pick (D-05) — it simply returns to idle.
 */
export function nextSelection<T extends string>(
  state: DragSelection<T>,
  event: DragSelectionEvent<T>,
): DragSelection<T> {
  switch (event.type) {
    case "touchDown": {
      if (event.hit !== null) {
        return { selected: event.hit, mode: "direct" };
      }
      if (state.selected !== null) {
        return { selected: state.selected, mode: "remote" };
      }
      return { selected: state.selected, mode: "idle" };
    }
    case "touchUp": {
      if (state.mode === "remote" && event.travelPx <= TAP_MAX_TRAVEL_PX) {
        return { selected: null, mode: "idle" };
      }
      return { selected: state.selected, mode: "idle" };
    }
    case "cancel":
      return { selected: state.selected, mode: "idle" };
  }
}
