/**
 * Which order the Board Rack shows when the server hands it a stored order (Phase 15 code review,
 * CR-01).
 *
 * Every save of the rack's order now refreshes the page (`revalidatePath`), so the copy Next keeps
 * for the browser's Back button is never an order from before the move. That means a stored order
 * also arrives while the shaper is still moving boards: the refresh of one save can come back while
 * a later move is waiting to save, or already on its way. Such an order is older than the one on
 * screen, and showing it would snap the later move back. So the rule is:
 *
 * - While the saver has anything waiting or in flight, the rack keeps the order it shows. The
 *   arriving order is only noted as seen, so it is never adopted later by mistake.
 * - With nothing waiting or in flight, the arriving order is adopted: it is what the account holds
 *   (a copy placed beside its original after a Duplicate, another device's arrangement, the stored
 *   order after a Back), and the saver starts again from it.
 *
 * Orders travel as their JSON text (`basisOf`), so "the same order" is plain string equality and a
 * never-arranged rack (`null`, the automatic order) compares like any other.
 *
 * Pure: no React, browser API or database import.
 */

/** An order as JSON text: a list of saved board ids, or `null` (never arranged). */
export function basisOf(order: readonly string[] | null): string {
  return JSON.stringify(order);
}

/** The order back from its JSON text; anything that is not a list reads as `null`. */
export function orderFromBasis(basis: string): readonly string[] | null {
  const parsed: unknown = JSON.parse(basis);
  return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : null;
}

/** What the rack knows about its order. */
export interface RackOrderView {
  /** The last stored order the server handed the rack (JSON). */
  seen: string;
  /** The stored order the saver was started from (JSON): its "last saved" order until a save lands. */
  base: string;
  /** The order the rack shows when it is not simply `seen`: the shaper's own newest move, or the
   * order a failed save put back (`ids: null` is the automatic order). */
  local: { ids: readonly string[] | null } | null;
}

/** A rack that has just arrived with the server's stored order. */
export function rackOrderViewFrom(incoming: string): RackOrderView {
  return { seen: incoming, base: incoming, local: null };
}

/** The order a view shows. */
export function shownOrder(view: RackOrderView): readonly string[] | null {
  return view.local ? view.local.ids : orderFromBasis(view.seen);
}

/**
 * The view after the server hands the rack `incoming`. Unchanged when `incoming` is the order it
 * last saw. Otherwise: with the saver idle (nothing waiting, nothing in flight) the rack adopts it,
 * and the saver starts again from it (`base`); with the saver busy, the rack keeps what it shows and
 * only notes `incoming` as seen.
 */
export function rackOrderViewOnArrival(view: RackOrderView, incoming: string, saverIdle: boolean): RackOrderView {
  if (incoming === view.seen) return view;
  if (saverIdle) return rackOrderViewFrom(incoming);
  return { seen: incoming, base: view.base, local: { ids: shownOrder(view) } };
}

/** The view after the shaper moves a board: `ids` is shown at once. */
export function rackOrderViewAfterMove(view: RackOrderView, ids: readonly string[]): RackOrderView {
  return { ...view, local: { ids: [...ids] } };
}

/** The view after a save fails: the order the saver hands back is shown (`null`: the automatic one). */
export function rackOrderViewAfterFailure(view: RackOrderView, revertTo: readonly string[] | null): RackOrderView {
  return { ...view, local: { ids: revertTo === null ? null : [...revertTo] } };
}
